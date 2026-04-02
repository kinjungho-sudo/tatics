// ============================================================
//  MapScene — 스테이지 선택 화면 + 세이브/로드
//  scene-agent 담당
// ============================================================

import Phaser from 'phaser';
import { SCENE, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { stage01 } from '../data/stages/stage01.js';
import { stage02 } from '../data/stages/stage02.js';
import { stage03 } from '../data/stages/stage03.js';
import { stage04 } from '../data/stages/stage04.js';
import { stage05 } from '../data/stages/stage05.js';
import { saveSystem } from '../systems/SaveSystem.js';
import { authSystem } from '../systems/AuthSystem.js';

const STAGES = [stage01, stage02, stage03, stage04, stage05];

export default class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE.MAP });
    this._saveData  = null;
    this._saveLabel = null;
    this._badges    = {};   // stageId → Text 객체
  }

  async create() {
    const cx = GAME_WIDTH / 2;

    // 배경
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x111122);

    // 타이틀
    this.add.text(cx, 36, '스테이지 선택', {
      fontSize: '32px', fontFamily: 'Arial', fontStyle: 'bold', fill: '#f1c40f',
    }).setOrigin(0.5);

    // 세이브 상태 레이블
    this._saveLabel = this.add.text(cx, 72, '', {
      fontSize: '13px', fontFamily: 'Arial', fill: '#7fb3d3',
    }).setOrigin(0.5);

    // 스테이지 버튼 목록
    STAGES.forEach((stage, i) => {
      const y  = 130 + i * 80;
      const bg = this.add.rectangle(cx, y, 520, 64, 0x223344)
        .setStrokeStyle(2, 0x3498db)
        .setInteractive({ useHandCursor: true });

      this.add.text(cx - 210, y - 10, `Stage ${i + 1}`, {
        fontSize: '20px', fontFamily: 'Arial', fontStyle: 'bold', fill: '#ffffff',
      }).setOrigin(0, 0.5);

      this.add.text(cx - 210, y + 12, stage.description || stage.name, {
        fontSize: '13px', fontFamily: 'Arial', fill: '#aaaaaa',
      }).setOrigin(0, 0.5);

      // 클리어 뱃지
      const badge = this.add.text(cx + 200, y, '', {
        fontSize: '16px', fontFamily: 'Arial',
      }).setOrigin(0.5);
      this._badges[stage.id] = badge;

      bg.on('pointerover',  () => bg.setFillStyle(0x334466));
      bg.on('pointerout',   () => bg.setFillStyle(0x223344));
      bg.on('pointerdown',  () => this.scene.start(SCENE.BATTLE, { stageId: stage.id }));
    });

    // 저장 버튼
    const saveBtn = this.add.text(GAME_WIDTH - 36, GAME_HEIGHT - 36, '💾 저장', {
      fontSize: '16px', fontFamily: 'Arial', fill: '#2ecc71',
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });

    saveBtn.on('pointerover',  () => saveBtn.setStyle({ fill: '#58d68d' }));
    saveBtn.on('pointerout',   () => saveBtn.setStyle({ fill: '#2ecc71' }));
    saveBtn.on('pointerdown',  () => this._onSave(saveBtn));

    // 뒤로 가기
    const back = this.add.text(36, GAME_HEIGHT - 36, '← 타이틀', {
      fontSize: '16px', fontFamily: 'Arial', fill: '#778899',
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

    back.on('pointerover', () => back.setStyle({ fill: '#aabbcc' }));
    back.on('pointerout',  () => back.setStyle({ fill: '#778899' }));
    back.on('pointerdown', () => this.scene.start(SCENE.TITLE));

    // 세이브 데이터 로드
    await this._loadSave();
  }

  async _loadSave() {
    const data = await saveSystem.load(1);
    this._saveData = data;

    if (!data) {
      this._saveLabel.setText(
        authSystem.isLoggedIn ? '저장 데이터 없음' : '오프라인 모드 — 로그인 시 저장 가능'
      );
      return;
    }

    const cleared = saveSystem.clearedCount(data.stageProgress ?? {});
    const time    = saveSystem.formatPlayTime(data.playTimeSec ?? 0);
    this._saveLabel.setText(`클리어 ${cleared}스테이지 · 플레이 ${time}`);

    // 클리어 뱃지 갱신
    for (const [sid, badge] of Object.entries(this._badges)) {
      badge.setText(data.stageProgress?.[sid]?.cleared ? '✅' : '');
    }
  }

  async _onSave(btn) {
    btn.setText('💾 저장 중...').disableInteractive();

    const result = await saveSystem.save(1, {
      stageProgress: this._saveData?.stageProgress ?? {},
      unitData:      this._saveData?.unitData      ?? [],
      playTimeSec:   this._saveData?.playTimeSec   ?? 0,
    });

    btn.setText(result.ok
      ? (result.offline ? '💾 저장됨 (로컬)' : '💾 저장됨')
      : '❌ 저장 실패'
    );
    if (result.ok) this._saveLabel.setText('저장 완료!');

    this.time.delayedCall(2000, () => {
      btn.setText('💾 저장').setInteractive({ useHandCursor: true });
    });
  }
}