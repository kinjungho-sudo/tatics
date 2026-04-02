// ============================================================
//  BattleScene — 핵심 전투 씬
//  scene-agent 담당
//  상태 머신: idle → selected → moved → enemy → idle
// ============================================================

import Phaser from 'phaser';
import {
  SCENE, PHASE, TEAM,
  CELL_SIZE, MAP_COLS, MAP_ROWS,
  COLOR,
} from '../config.js';
import { JOB_BASE }     from '../data/units.js';
import { stage01 }      from '../data/stages/stage01.js';
import { stage02 }      from '../data/stages/stage02.js';
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

const STAGE_MAP = { stage01, stage02 };

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
      onAllyTurnStart:  (turn) => this.turnBadge.show('아군 턴', turn),
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
      const base = JOB_BASE[cfg.job];
      const lv   = cfg.lv || 1;
      return {
        id:     cfg.id,
        name:   cfg.name,
        job:    cfg.job,
        team,
        x:      cfg.x,
        y:      cfg.y,
        lv,
        exp:    0,
        hp:     base.hp,
        maxHp:  base.maxHp,
        atk:    base.atk,
        def:    base.def,
        spd:    base.spd,
        move:   base.move,
        range:  base.range,
        acted:  false,
        sprite: null,    // Phaser 오브젝트 (spawnUnitSprites에서 설정)
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
  //  유닛 스프라이트 (색깔 박스, 에셋 없을 때)
  // ──────────────────────────────────────────────────────────
  _spawnUnitSprites() {
    const allUnits = [...this.allies, ...this.enemies];
    for (const unit of allUnits) {
      this._createUnitSprite(unit);
    }
  }

  _createUnitSprite(unit) {
    const { px, py } = gridToPixel(unit.x, unit.y, CELL_SIZE);
    const color = unit.team === TEAM.ALLY ? COLOR.ALLY : COLOR.ENEMY;
    const size  = CELL_SIZE - 12;

    // 박스 + 테두리
    const box = this.add.rectangle(px, py, size, size, color);
    box.setStrokeStyle(2, 0x000000, 0.8);

    // 직업 이니셜 텍스트
    const initial = unit.job[0];
    const label = this.add.text(px, py - 4, initial, {
      fontSize: '18px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      fill: '#ffffff',
    }).setOrigin(0.5);

    // 이름 텍스트
    const nameTxt = this.add.text(px, py + 12, unit.name, {
      fontSize: '9px',
      fontFamily: 'Arial',
      fill: '#ffffff',
    }).setOrigin(0.5);

    // 스프라이트 컨테이너
    const container = this.add.container(0, 0, [box, label, nameTxt]);
    this.unitLayer.add(container);

    unit.sprite    = container;
    unit.spriteBox = box;
  }

  _updateUnitSpritePosition(unit) {
    const { px, py } = gridToPixel(unit.x, unit.y, CELL_SIZE);
    // container 안의 각 child도 절대 위치이므로 box를 기준으로 이동
    const box     = unit.sprite.getAt(0);
    const label   = unit.sprite.getAt(1);
    const nameTxt = unit.sprite.getAt(2);
    const size    = CELL_SIZE - 12;

    box.setPosition(px, py).setSize(size, size);
    label.setPosition(px, py - 4);
    nameTxt.setPosition(px, py + 12);
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
      this._tryAttack(col, row);
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

    // 선택 테두리 강조
    unit.spriteBox.setStrokeStyle(3, COLOR.SELECTED);
  }

  // ── 이동 또는 재선택 ──
  _tryMoveOrReselect(col, row) {
    const unit = this._findAllyAt(col, row);

    if (unit && unit !== this.selectedUnit && !unit.acted) {
      // 다른 아군 유닛 선택 → 재선택
      this._clearOverlay();
      this.selectedUnit.spriteBox.setStrokeStyle(2, 0x000000, 0.8);
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

    // 행동 선택 패널 표시
    const { px, py } = gridToPixel(col, row, CELL_SIZE);
    this.orderPanel.show(px, py, atkTargets.length > 0);
  }

  // ── 공격 ──
  _tryAttack(col, row) {
    const target = this.enemies.find((e) => e.x === col && e.y === row && e.hp > 0);
    if (!target) return;

    const dist = Math.abs(this.selectedUnit.x - col) + Math.abs(this.selectedUnit.y - row);
    if (dist > this.selectedUnit.range) return;

    this._executeAttack(this.selectedUnit, target);
  }

  _executeAttack(attacker, defender) {
    const result = this.attackSystem.executeAttack(attacker, defender);
    this.orderPanel.hide();
    this._clearOverlay();

    // 데미지 팝업 표시
    const { px: dx, py: dy } = gridToPixel(defender.x, defender.y, CELL_SIZE);
    this.damagePopup.show(dx, dy, result.damage, defender.team === TEAM.ALLY);

    if (result.counterDamage > 0) {
      const { px: ax, py: ay } = gridToPixel(attacker.x, attacker.y, CELL_SIZE);
      this.damagePopup.show(ax, ay, result.counterDamage, attacker.team === TEAM.ALLY);
    }

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
    attacker.spriteBox.setStrokeStyle(2, 0x000000, 0.3);
    attacker.spriteBox.setAlpha(0.6);  // 행동 완료된 유닛 어둡게

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
    this.selectedUnit.spriteBox.setStrokeStyle(2, 0x000000, 0.3);
    this.selectedUnit.spriteBox.setAlpha(0.6);

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
    if (this.selectedUnit) {
      this.selectedUnit.spriteBox.setStrokeStyle(2, 0x000000, 0.8);
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
      // 공격 버튼 → 공격 모드 (타일 클릭으로 타겟 선택)
      this._clearOverlay();
      const atkTargets = this.attackSystem.calcAtkRange(
        this.selectedUnit,
        this.enemies.filter(e => e.hp > 0)
      );
      const atkTiles = atkTargets.map((t) => ({ col: t.x, row: t.y }));
      this._drawOverlay(atkTiles, COLOR.ATTACK_RANGE, 0.4);
      // phase는 MOVED 유지 → 다음 클릭에서 _tryAttack
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
    // 행동 완료 표시 초기화 (알파 리셋)
    for (const a of this.allies) {
      if (a.hp > 0) a.spriteBox.setAlpha(1);
    }
    this.turnSystem.endAllyTurn(this.allies, this.enemies.filter(e => e.hp > 0));
  }

  _runEnemyTurn() {
    this.phase = PHASE.ENEMY;
    const liveEnemies = this.enemies.filter(e => e.hp > 0);
    const liveAllies  = this.allies.filter(a => a.hp > 0);

    // 적 AI 실행 (이벤트 기반으로 애니메이션 처리)
    const events = this.aiSystem.runEnemyTurn(
      liveEnemies, liveAllies, this.mapData, MAP_COLS, MAP_ROWS,
      (ev) => this._handleAIEvent(ev)
    );

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
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const overlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6);

    const msg = win ? '승리!' : '패배...';
    const col = win ? '#f1c40f' : '#e74c3c';
    this.add.text(cx, cy - 40, msg, {
      fontSize: '64px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      fill: col,
    }).setOrigin(0.5);

    const btn = this.add.text(cx, cy + 60, '스테이지 선택으로', {
      fontSize: '24px',
      fontFamily: 'Arial',
      fill: '#ffffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => this.scene.start(SCENE.MAP));
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
