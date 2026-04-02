// ============================================================
//  BattleScene — 핵심 전투 씬
//  scene-agent 담당
//  상태 머신: idle → selected → moved → enemy → idle
// ============================================================

import Phaser from 'phaser';
import {
  SCENE, PHASE, TEAM,
  CELL_SIZE, MAP_COLS, MAP_ROWS,
  GAME_WIDTH, GAME_HEIGHT,
  COLOR,
} from '../config.js';
import { JOB_BASE }     from '../data/units.js';
import { growthTable }  from '../data/growthTable.js';
import { TERRAIN }      from '../data/terrain.js';
import { randomInt }    from '../utils/Random.js';
import { StageProgress } from '../systems/StageProgress.js';
import { stage01 }      from '../data/stages/stage01.js';
import { stage02 }      from '../data/stages/stage02.js';
import { stage03 }      from '../data/stages/stage03.js';
import { stage04 }      from '../data/stages/stage04.js';
import { stage05 }      from '../data/stages/stage05.js';
import MoveSystem       from '../systems/MoveSystem.js';
import AttackSystem     from '../systems/AttackSystem.js';
import TurnSystem       from '../systems/TurnSystem.js';
import AISystem         from '../systems/AISystem.js';
import ExpSystem        from '../systems/ExpSystem.js';
import StatPanel        from '../ui/StatPanel.js';
import TurnBadge        from '../ui/TurnBadge.js';
import OrderPanel       from '../ui/OrderPanel.js';
import DamagePopup      from '../ui/DamagePopup.js';
import LevelUpPopup     from '../ui/LevelUpPopup.js';
import { gridToPixel }  from '../utils/GridUtils.js';

const STAGE_MAP = { stage01, stage02, stage03, stage04, stage05 };

export default class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE.BATTLE });
  }

  // ──────────────────────────────────────────────────────────
  //  초기화
  // ──────────────────────────────────────────────────────────
  init(data) {
    // MapScene에서 전달된 stageId, 없으면 stage01
    this.stageId = data?.stageId || 'stage01';
    this.stageData = STAGE_MAP[this.stageId] || stage01;
  }

  create() {
    // 시스템 인스턴스
    this.moveSystem   = new MoveSystem();
    this.attackSystem = new AttackSystem();
    this.expSystem    = new ExpSystem();
    this.aiSystem     = new AISystem();

    // 상태
    this.phase        = PHASE.IDLE;
    this.selectedUnit = null;
    this.moveRange    = [];
    this._healMode    = false;

    // 맵, 유닛 생성
    this.mapData  = this.stageData.map;
    this.allies   = this._createUnits(this.stageData.allies,  TEAM.ALLY);
    this.enemies  = this._createUnits(this.stageData.enemies, TEAM.ENEMY);

    // 렌더링 레이어 (z-order)
    this.mapLayer       = this.add.container(0, 0);
    this.overlayLayer   = this.add.container(0, 0);
    this.unitLayer      = this.add.container(0, 0);
    this.uiLayer        = this.add.container(0, 0);

    // 맵 그리기
    this._drawMap();

    // 유닛 스프라이트 생성
    this._spawnUnitSprites();

    // 입력 이벤트
    this._setupInput();

    // UI 컴포넌트 초기화
    this.statPanel    = new StatPanel(this);
    this.turnBadge    = new TurnBadge(this);
    this.orderPanel   = new OrderPanel(this, this._onOrderAction.bind(this));
    this.damagePopup  = new DamagePopup(this);
    this.levelUpPopup = new LevelUpPopup(this);

    // 턴 시스템 초기화
    this.turnSystem = new TurnSystem({
      onAllyTurnStart:  (turn) => {
        this.turnBadge.show('아군 턴', turn);
        // acted=false 초기화 후 이미지 alpha 복원
        for (const a of this.allies) {
          if (a.hp > 0) this._refreshUnitActed(a);
        }
      },
      onEnemyTurnStart: (turn) => this.turnBadge.show('적 턴', turn),
      onTurnChanged:    (team, turn) => {
        if (team === TEAM.ENEMY) this._runEnemyTurn();
      },
    });

    // 아군 턴으로 시작
    this.turnSystem.startAllyTurn(this.allies);

    // "턴 종료" 버튼
    this._createEndTurnButton();
  }

  // ──────────────────────────────────────────────────────────
  //  유닛 생성
  // ──────────────────────────────────────────────────────────
  _createUnits(unitConfigs, team) {
    return unitConfigs.map((cfg) => {
      const base   = JOB_BASE[cfg.job];
      const lv     = cfg.lv || 1;

      // lv>1 레벨 스케일링 (growthTable 기본값 × (lv-1))
      let hp = base.hp, maxHp = base.maxHp;
      let atk = base.atk, def = base.def, spd = base.spd;
      if (lv > 1) {
        const g = growthTable[cfg.job];
        if (g) {
          const n  = lv - 1;
          hp   += g.hp  * n;  maxHp += g.hp  * n;
          atk  += g.atk * n;  def   += g.def * n;
          spd  += g.spd * n;
        }
      }

      return {
        id: cfg.id, name: cfg.name, job: cfg.job, team,
        x: cfg.x, y: cfg.y,
        lv, exp: 0,
        hp, maxHp, atk, def, spd,
        move:  base.move,
        range: base.range,
        acted: false,
        sprite: null,
      };
    });
  }

  // ──────────────────────────────────────────────────────────
  //  맵 렌더링
  // ──────────────────────────────────────────────────────────
  _drawMap() {
    const terrainColors = {
      0: COLOR.TERRAIN_PLAIN,
      1: COLOR.TERRAIN_OBSTACLE,
      2: COLOR.TERRAIN_FOREST,
      3: COLOR.TERRAIN_RIVER,
      4: COLOR.TERRAIN_MOUNTAIN,
    };

    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const type  = this.mapData[row][col];
        const color = terrainColors[type] ?? 0x8BC34A;
        const x     = col * CELL_SIZE;
        const y     = row * CELL_SIZE;

        const cell = this.add.rectangle(
          x + CELL_SIZE / 2,
          y + CELL_SIZE / 2,
          CELL_SIZE - 1,
          CELL_SIZE - 1,
          color
        );
        cell.setStrokeStyle(1, 0x000000, 0.3);
        this.mapLayer.add(cell);
      }
    }
  }

  // ──────────────────────────────────────────────────────────
  //  유닛 스프라이트 (이미지 기반)
  // ──────────────────────────────────────────────────────────

  // 유닛 배치 전 이미지 키 사전 할당
  // 같은 직업 아군이 여러 명일 때 다른 이미지 순환 배정
  _assignCharKeys() {
    const allyJobAlts = {
      '기사':   ['char-기사', 'char-랄프'],     // 레온, 랄프
      '마법사': ['char-마법사', 'char-티티'],    // 카린, 티티
    };
    const jobCount = {};
    for (const unit of this.allies) {
      const alts = allyJobAlts[unit.job];
      if (alts) {
        const idx = jobCount[unit.job] || 0;
        unit.charKey = alts[idx % alts.length];
        jobCount[unit.job] = idx + 1;
      } else {
        unit.charKey = `char-${unit.job}`;
      }
    }
    for (const unit of this.enemies) {
      unit.charKey = `enemy-${unit.job}`;
    }
  }

  _spawnUnitSprites() {
    this._assignCharKeys();
    const allUnits = [...this.allies, ...this.enemies];
    for (const unit of allUnits) {
      this._createUnitSprite(unit);
    }
  }

  _createUnitSprite(unit) {
    const { px, py } = gridToPixel(unit.x, unit.y, CELL_SIZE);
    const barW    = CELL_SIZE - 14;
    const imgSize = CELL_SIZE - 8;
    const isAlly  = unit.team === TEAM.ALLY;

    // 캐릭터 이미지 (아군=우향, 적군=좌향)
    const charImg = this.add.image(px, py - 2, unit.charKey)
      .setDisplaySize(imgSize, imgSize)
      .setFlipX(isAlly);  // 원본이 좌향 → 아군은 반전(우향), 적군은 그대로(좌향)

    // 레벨 텍스트 (좌상단)
    const lvTxt = this.add.text(
      px - CELL_SIZE / 2 + 3,
      py - CELL_SIZE / 2 + 2,
      `L${unit.lv}`,
      { fontSize: '8px', fontFamily: 'Arial', fontStyle: 'bold', fill: '#ffdd88', stroke: '#000000', strokeThickness: 1 }
    );

    // HP 바 배경
    const hpBarBg = this.add.rectangle(px, py + CELL_SIZE / 2 - 6, barW, 5, 0x333333).setOrigin(0.5);
    // HP 바 fill
    const hpBar   = this.add.rectangle(px - barW / 2, py + CELL_SIZE / 2 - 6, barW, 5, 0x2ecc71).setOrigin(0, 0.5);

    // 컨테이너 (순서: charImg, lvTxt, hpBarBg, hpBar)
    const container = this.add.container(0, 0, [charImg, lvTxt, hpBarBg, hpBar]);
    this.unitLayer.add(container);

    unit.sprite   = container;
    unit.charImg  = charImg;
    unit.hpBar    = hpBar;
    unit.hpBarBg  = hpBarBg;
    unit.lvTxt    = lvTxt;
  }

  _updateUnitSpritePosition(unit) {
    const { px, py } = gridToPixel(unit.x, unit.y, CELL_SIZE);
    const barW = CELL_SIZE - 14;

    unit.charImg.setPosition(px, py - 2);
    unit.lvTxt.setPosition(px - CELL_SIZE / 2 + 3, py - CELL_SIZE / 2 + 2);
    unit.sprite.getAt(2).setPosition(px, py + CELL_SIZE / 2 - 6);            // hpBarBg
    unit.sprite.getAt(3).setPosition(px - barW / 2, py + CELL_SIZE / 2 - 6); // hpBar
  }

  // 행동 완료 시 이미지 어둡게, 해제 시 복원
  _refreshUnitActed(unit) {
    if (!unit.charImg) return;
    unit.charImg.setAlpha(unit.acted ? 0.45 : 1.0);
  }

  // 선택 강조 — 테두리 Graphics (선택 시 그리고, 해제 시 destroy)
  _drawSelectGlow(unit) {
    if (unit._selectGlow) unit._selectGlow.destroy();
    const { px, py } = gridToPixel(unit.x, unit.y, CELL_SIZE);
    const glow = this.add.graphics();
    glow.lineStyle(3, COLOR.SELECTED, 1);
    glow.strokeRect(px - CELL_SIZE / 2 + 2, py - CELL_SIZE / 2 + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    this.unitLayer.add(glow);
    unit._selectGlow = glow;
  }

  _clearSelectGlow(unit) {
    if (unit && unit._selectGlow) {
      unit._selectGlow.destroy();
      unit._selectGlow = null;
    }
  }

  _updateUnitHpBar(unit) {
    if (!unit.hpBar) return;
    const barW  = CELL_SIZE - 14;
    const ratio = Math.max(0, unit.hp / unit.maxHp);
    unit.hpBar.setDisplaySize(barW * ratio, 5);
    const col = ratio > 0.5 ? 0x2ecc71 : ratio > 0.25 ? 0xf39c12 : 0xe74c3c;
    unit.hpBar.setFillStyle(col);
  }

  // ──────────────────────────────────────────────────────────
  //  입력 처리
  // ──────────────────────────────────────────────────────────
  _setupInput() {
    // 클릭/터치 이벤트 → 타일 좌표 변환
    this.input.on('pointerdown', (pointer) => {
      const col = Math.floor(pointer.x / CELL_SIZE);
      const row = Math.floor(pointer.y / CELL_SIZE);
      if (col >= 0 && col < MAP_COLS && row >= 0 && row < MAP_ROWS) {
        this._onTileClick(col, row);
      }
    });
  }

  _onTileClick(col, row) {
    if (this.phase === PHASE.ENEMY || this.phase === PHASE.RESULT) return;

    if (this.phase === PHASE.IDLE) {
      this._trySelectUnit(col, row);
    } else if (this.phase === PHASE.SELECTED) {
      this._tryMoveOrReselect(col, row);
    } else if (this.phase === PHASE.MOVED) {
      if (this._healMode) {
        this._tryHeal(col, row);
      } else {
        this._tryAttack(col, row);
      }
    }
  }

  // ── 유닛 선택 ──
  _trySelectUnit(col, row) {
    const unit = this._findAllyAt(col, row);
    if (!unit || unit.acted) return;

    this.selectedUnit = unit;
    this.phase        = PHASE.SELECTED;

    // 이동 범위 계산 + 표시
    const allUnits = [...this.allies, ...this.enemies];
    this.moveRange = this.moveSystem.calcMoveRange(
      unit, this.mapData, allUnits, MAP_COLS, MAP_ROWS
    );
    this._drawOverlay(this.moveRange, COLOR.MOVE_RANGE, 0.4);

    // StatPanel 업데이트
    this.statPanel.show(unit);

    // 선택 강조 오버레이
    this._drawSelectGlow(unit);
  }

  // ── 이동 또는 재선택 ──
  _tryMoveOrReselect(col, row) {
    const unit = this._findAllyAt(col, row);

    if (unit && unit !== this.selectedUnit && !unit.acted) {
      // 다른 아군 유닛 선택 → 재선택
      this._clearOverlay();
      this._clearSelectGlow(this.selectedUnit);
      this._refreshUnitActed(this.selectedUnit);
      this.phase = PHASE.IDLE;
      this._trySelectUnit(col, row);
      return;
    }

    // 이동 가능한 타일인지 확인
    const isReachable = this.moveRange.some((t) => t.col === col && t.row === row);
    if (!isReachable) {
      // 이동 불가 → 취소
      this._cancelSelection();
      return;
    }

    // 이동 실행
    this._moveUnit(this.selectedUnit, col, row);
  }

  _moveUnit(unit, col, row) {
    unit.x = col;
    unit.y = row;
    this._updateUnitSpritePosition(unit);
    this._clearOverlay();

    this.phase = PHASE.MOVED;

    // 공격 범위 계산 + 표시
    const atkTargets = this.attackSystem.calcAtkRange(unit, this.enemies.filter(e => e.hp > 0));
    if (atkTargets.length > 0) {
      const atkTiles = atkTargets.map((t) => ({ col: t.x, row: t.y }));
      this._drawOverlay(atkTiles, COLOR.ATTACK_RANGE, 0.3);
    }

    // 치료 가능 여부 (성직자 전용)
    const canHeal = unit.job === '성직자' && this.allies.some(
      (a) => a.hp > 0 && a.hp < a.maxHp && a !== unit &&
             Math.abs(a.x - col) + Math.abs(a.y - row) <= unit.range
    );

    // 행동 선택 패널 표시
    const { px, py } = gridToPixel(col, row, CELL_SIZE);
    this.orderPanel.show(px, py, atkTargets.length > 0, canHeal);
  }

  // ── 공격 ──
  _tryAttack(col, row) {
    const target = this.enemies.find((e) => e.x === col && e.y === row && e.hp > 0);
    if (!target) return;

    const dist = Math.abs(this.selectedUnit.x - col) + Math.abs(this.selectedUnit.y - row);
    if (dist > this.selectedUnit.range) return;

    this._executeAttack(this.selectedUnit, target);
  }

  // ── 치료 ──
  _tryHeal(col, row) {
    const target = this.allies.find(
      (a) => a.x === col && a.y === row && a.hp > 0 && a.hp < a.maxHp
    );
    if (!target) return;
    const dist = Math.abs(this.selectedUnit.x - col) + Math.abs(this.selectedUnit.y - row);
    if (dist > this.selectedUnit.range) return;
    this._executeHeal(this.selectedUnit, target);
  }

  _executeHeal(healer, target) {
    const healAmt = Math.max(1, healer.atk + randomInt(0, 5));
    target.hp = Math.min(target.maxHp, target.hp + healAmt);

    this._healMode = false;
    this._clearOverlay();
    this.orderPanel.hide();

    // 힐 팝업
    const { px, py } = gridToPixel(target.x, target.y, CELL_SIZE);
    this.damagePopup.showHeal(px, py, healAmt);
    this._updateUnitHpBar(target);

    // 치료 경험치 +5
    const lvUps = this.expSystem.gainExp(healer, 5);
    for (const ev of lvUps) this.levelUpPopup.show(healer, ev);

    healer.acted = true;
    this._refreshUnitActed(healer);

    this.selectedUnit = null;
    this.phase        = PHASE.IDLE;
    this.statPanel.hide();

    if (this.turnSystem.isAllyTurnComplete(this.allies.filter((a) => a.hp > 0))) {
      this.time.delayedCall(500, () => this._endAllyTurn());
    }
  }

  // ── 지형 방어 보너스 ──
  _getTerrainDefBonus(unit) {
    const tType   = this.mapData[unit.y]?.[unit.x] ?? 0;
    const terrain = TERRAIN[tType];
    return terrain ? Math.floor(unit.def * terrain.defBonus / 100) : 0;
  }

  _executeAttack(attacker, defender) {
    // 지형 방어 보너스 임시 적용
    const bonus = this._getTerrainDefBonus(defender);
    defender.def += bonus;
    const result = this.attackSystem.executeAttack(attacker, defender);
    defender.def -= bonus;
    this.orderPanel.hide();
    this._clearOverlay();

    // 데미지 팝업 표시
    const { px: dx, py: dy } = gridToPixel(defender.x, defender.y, CELL_SIZE);
    this.damagePopup.show(dx, dy, result.damage, defender.team === TEAM.ALLY);

    if (result.counterDamage > 0) {
      const { px: ax, py: ay } = gridToPixel(attacker.x, attacker.y, CELL_SIZE);
      this.damagePopup.show(ax, ay, result.counterDamage, attacker.team === TEAM.ALLY);
    }

    // HP 바 업데이트
    this._updateUnitHpBar(defender);
    this._updateUnitHpBar(attacker);

    // 처치 처리
    if (result.killed) this._removeUnit(defender);
    if (result.counterKilled) this._removeUnit(attacker);

    // 경험치 획득
    const levelUps = this.expSystem.onAttackSuccess(attacker, result.killed);
    for (const ev of levelUps) {
      this.levelUpPopup.show(attacker, ev);
    }

    // 행동 완료
    attacker.acted = true;
    this._refreshUnitActed(attacker);

    this.selectedUnit = null;
    this.phase        = PHASE.IDLE;
    this.statPanel.hide();

    // 승패 판정
    this._checkWinLose();

    // 전원 행동 완료 시 자동으로 턴 종료
    if (this.turnSystem.isAllyTurnComplete(this.allies.filter(a => a.hp > 0))) {
      this.time.delayedCall(500, () => this._endAllyTurn());
    }
  }

  // ── 대기 ──
  _waitUnit() {
    if (!this.selectedUnit) return;
    this.orderPanel.hide();
    this._clearOverlay();

    this.selectedUnit.acted = true;
    this._refreshUnitActed(this.selectedUnit);

    this.selectedUnit = null;
    this.phase        = PHASE.IDLE;
    this.statPanel.hide();

    // 전원 행동 완료 시 자동으로 턴 종료
    const liveAllies = this.allies.filter(a => a.hp > 0);
    if (this.turnSystem.isAllyTurnComplete(liveAllies)) {
      this.time.delayedCall(500, () => this._endAllyTurn());
    }
  }

  // ── 행동 취소 ──
  _cancelSelection() {
    this._healMode = false;
    if (this.selectedUnit) {
      this._clearSelectGlow(this.selectedUnit);
      this._refreshUnitActed(this.selectedUnit);
    }
    this.selectedUnit = null;
    this.phase        = PHASE.IDLE;
    this._clearOverlay();
    this.orderPanel.hide();
    this.statPanel.hide();
  }

  // ──────────────────────────────────────────────────────────
  //  OrderPanel 콜백
  // ──────────────────────────────────────────────────────────
  _onOrderAction(action) {
    if (action === 'attack') {
      this._healMode = false;
      this._clearOverlay();
      const atkTargets = this.attackSystem.calcAtkRange(
        this.selectedUnit,
        this.enemies.filter(e => e.hp > 0)
      );
      const atkTiles = atkTargets.map((t) => ({ col: t.x, row: t.y }));
      this._drawOverlay(atkTiles, COLOR.ATTACK_RANGE, 0.4);
    } else if (action === 'heal') {
      this._healMode = true;
      this._clearOverlay();
      const healTiles = this.allies
        .filter((a) => a.hp > 0 && a.hp < a.maxHp && a !== this.selectedUnit &&
          Math.abs(a.x - this.selectedUnit.x) + Math.abs(a.y - this.selectedUnit.y) <= this.selectedUnit.range)
        .map((a) => ({ col: a.x, row: a.y }));
      this._drawOverlay(healTiles, 0x1abc9c, 0.5);
    } else if (action === 'wait') {
      this._waitUnit();
    } else if (action === 'cancel') {
      // 이동 취소 → 원위치로 되돌리기는 복잡하므로 현 위치에서 대기
      this._waitUnit();
    }
  }

  // ──────────────────────────────────────────────────────────
  //  턴 종료
  // ──────────────────────────────────────────────────────────
  _endAllyTurn() {
    this._cancelSelection();
    this.turnSystem.endAllyTurn(this.allies, this.enemies.filter(e => e.hp > 0));
  }

  _runEnemyTurn() {
    this.phase = PHASE.ENEMY;
    const liveEnemies = this.enemies.filter(e => e.hp > 0);
    const liveAllies  = this.allies.filter(a => a.hp > 0);

    // 아군 지형 방어 보너스 임시 적용
    for (const a of liveAllies) {
      a._tb = this._getTerrainDefBonus(a);
      a.def += a._tb;
    }

    // 적 AI 실행
    const events = this.aiSystem.runEnemyTurn(
      liveEnemies, liveAllies, this.mapData, MAP_COLS, MAP_ROWS,
      (ev) => this._handleAIEvent(ev)
    );

    // 지형 방어 보너스 원복
    for (const a of this.allies) {
      if (a._tb) { a.def -= a._tb; a._tb = 0; }
    }

    // AI 행동 후 위치/상태 업데이트
    for (const e of liveEnemies) {
      if (e.sprite) this._updateUnitSpritePosition(e);
    }

    // 사망 유닛 제거
    for (const a of liveAllies) {
      if (a.hp <= 0) this._removeUnit(a);
    }

    // 승패 판정
    if (this._checkWinLose()) return;

    // 아군 턴으로 복귀
    this.time.delayedCall(800, () => {
      this.turnSystem.endEnemyTurn(this.allies.filter(a => a.hp > 0));
      this.phase = PHASE.IDLE;
    });
  }

  _handleAIEvent(ev) {
    if (ev.type === 'attack' && ev.result) {
      const { px, py } = gridToPixel(ev.target.x, ev.target.y, CELL_SIZE);
      this.damagePopup.show(px, py, ev.result.damage, ev.target.team === TEAM.ALLY);
      this._updateUnitHpBar(ev.target);
      this._updateUnitHpBar(ev.unit);
    }
  }

  // ──────────────────────────────────────────────────────────
  //  오버레이 (이동/공격 범위 표시)
  // ──────────────────────────────────────────────────────────
  _drawOverlay(tiles, color, alpha) {
    this._clearOverlay();
    this._overlayGraphics = [];

    for (const tile of tiles) {
      const x = tile.col * CELL_SIZE;
      const y = tile.row * CELL_SIZE;
      const g = this.add.rectangle(
        x + CELL_SIZE / 2,
        y + CELL_SIZE / 2,
        CELL_SIZE,
        CELL_SIZE,
        color,
        alpha
      );
      this.overlayLayer.add(g);
      this._overlayGraphics.push(g);
    }
  }

  _clearOverlay() {
    if (this._overlayGraphics) {
      for (const g of this._overlayGraphics) g.destroy();
      this._overlayGraphics = [];
    }
  }

  // ──────────────────────────────────────────────────────────
  //  유닛 제거
  // ──────────────────────────────────────────────────────────
  _removeUnit(unit) {
    unit.hp = 0;
    if (unit.sprite) {
      unit.sprite.setAlpha(0);
      this.time.delayedCall(300, () => unit.sprite.destroy());
    }
  }

  // ──────────────────────────────────────────────────────────
  //  승패 판정
  // ──────────────────────────────────────────────────────────
  _checkWinLose() {
    const liveEnemies = this.enemies.filter(e => e.hp > 0);
    const liveAllies  = this.allies.filter(a => a.hp > 0);

    if (liveEnemies.length === 0) {
      this._showResult(true);
      return true;
    }
    if (liveAllies.length === 0) {
      this._showResult(false);
      return true;
    }
    return false;
  }

  _showResult(win) {
    this.phase = PHASE.RESULT;
    if (win) StageProgress.clearStage(this.stageId);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65).setDepth(40);

    const msg = win ? '승리!' : '패배...';
    const col = win ? '#f1c40f' : '#e74c3c';
    this.add.text(cx, cy - 60, msg, {
      fontSize: '64px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      fill: col,
    }).setOrigin(0.5).setDepth(41);

    if (win) {
      // 다음 스테이지 번호 계산
      const STAGE_IDS = ['stage01', 'stage02', 'stage03', 'stage04', 'stage05'];
      const curIdx  = STAGE_IDS.indexOf(this.stageId);
      const nextId  = curIdx >= 0 && curIdx < STAGE_IDS.length - 1 ? STAGE_IDS[curIdx + 1] : null;

      if (nextId) {
        const nextBtn = this.add.text(cx, cy + 20, `▶ 다음 스테이지`, {
          fontSize: '26px',
          fontFamily: 'Arial',
          fontStyle: 'bold',
          fill: '#2ecc71',
        }).setOrigin(0.5).setDepth(41).setInteractive({ useHandCursor: true });

        nextBtn.on('pointerover', () => nextBtn.setStyle({ fill: '#58d68d' }));
        nextBtn.on('pointerout',  () => nextBtn.setStyle({ fill: '#2ecc71' }));
        nextBtn.on('pointerdown', () => this.scene.start(SCENE.BATTLE, { stageId: nextId }));
      }
    }

    const mapBtn = this.add.text(cx, cy + (win ? 80 : 20), '스테이지 선택으로', {
      fontSize: '18px',
      fontFamily: 'Arial',
      fill: '#aaaaaa',
    }).setOrigin(0.5).setDepth(41).setInteractive({ useHandCursor: true });

    mapBtn.on('pointerover', () => mapBtn.setStyle({ fill: '#cccccc' }));
    mapBtn.on('pointerout',  () => mapBtn.setStyle({ fill: '#aaaaaa' }));
    mapBtn.on('pointerdown', () => this.scene.start(SCENE.MAP));
  }

  // ──────────────────────────────────────────────────────────
  //  턴 종료 버튼
  // ──────────────────────────────────────────────────────────
  _createEndTurnButton() {
    const btnX = GAME_WIDTH - 90;
    const btnY = GAME_HEIGHT - 30;

    const bg = this.add.rectangle(btnX, btnY, 160, 40, 0x2c3e50)
      .setStrokeStyle(2, 0x3498db)
      .setInteractive({ useHandCursor: true });

    const txt = this.add.text(btnX, btnY, '턴 종료', {
      fontSize: '16px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      fill: '#ffffff',
    }).setOrigin(0.5);

    bg.on('pointerover',  () => bg.setFillStyle(0x3d5166));
    bg.on('pointerout',   () => bg.setFillStyle(0x2c3e50));
    bg.on('pointerdown',  () => {
      if (this.phase !== PHASE.ENEMY && this.phase !== PHASE.RESULT) {
        this._endAllyTurn();
      }
    });

    this.uiLayer.add([bg, txt]);
  }

  // ──────────────────────────────────────────────────────────
  //  유틸
  // ──────────────────────────────────────────────────────────
  _findAllyAt(col, row) {
    return this.allies.find((u) => u.x === col && u.y === row && u.hp > 0) || null;
  }

  _findEnemyAt(col, row) {
    return this.enemies.find((u) => u.x === col && u.y === row && u.hp > 0) || null;
  }

  getAllUnits() {
    return [...this.allies, ...this.enemies];
  }
}
