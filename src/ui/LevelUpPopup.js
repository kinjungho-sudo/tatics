// ============================================================
//  LevelUpPopup — 레벨업 연출 팝업
//  ui-agent 담당
//  화면 중앙 팝업, 2초 후 자동 닫힘
// ============================================================

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export default class LevelUpPopup {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this._queue = [];   // 레벨업 이벤트 큐 (연속 레벨업 대비)
    this._showing = false;
  }

  /**
   * 레벨업 팝업 표시 (큐 방식)
   * @param {Object} unit     - 레벨업한 유닛
   * @param {Object} ev       - { oldLv, newLv, statGains }
   */
  show(unit, ev) {
    this._queue.push({ unit, ev });
    if (!this._showing) this._showNext();
  }

  _showNext() {
    if (this._queue.length === 0) {
      this._showing = false;
      return;
    }
    this._showing = true;
    const { unit, ev } = this._queue.shift();
    this._render(unit, ev);
  }

  _render(unit, ev) {
    const cx = GAME_WIDTH  / 2;
    const cy = GAME_HEIGHT / 2;
    const w  = 300;
    const h  = 180;

    const objs = [];

    // 배경
    const bg = this.scene.add.rectangle(cx, cy, w, h, 0x1a1a2e, 0.95)
      .setStrokeStyle(2, 0xf1c40f)
      .setDepth(50);
    objs.push(bg);

    // "LEVEL UP!" 헤드
    const head = this.scene.add.text(cx, cy - 60, 'LEVEL UP!', {
      fontSize: '28px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      fill: '#f1c40f',
    }).setOrigin(0.5).setDepth(50);
    objs.push(head);

    // 유닛 이름 + 레벨
    const lvTxt = this.scene.add.text(cx, cy - 28, `${unit.name}  Lv.${ev.oldLv} → ${ev.newLv}`, {
      fontSize: '16px',
      fontFamily: 'Arial',
      fill: '#ffffff',
    }).setOrigin(0.5).setDepth(50);
    objs.push(lvTxt);

    // 스탯 증가량
    const gains = ev.statGains;
    const statStr = [
      gains.hp  > 0 ? `HP +${gains.hp}`   : null,
      gains.atk > 0 ? `ATK +${gains.atk}` : null,
      gains.def > 0 ? `DEF +${gains.def}` : null,
      gains.spd > 0 ? `SPD +${gains.spd}` : null,
    ].filter(Boolean).join('   ');

    const statTxt = this.scene.add.text(cx, cy + 10, statStr, {
      fontSize: '15px',
      fontFamily: 'Arial',
      fill: '#2ecc71',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50);
    objs.push(statTxt);

    // 확인 버튼
    const btn = this.scene.add.text(cx, cy + 55, '[ 확인 ]', {
      fontSize: '16px',
      fontFamily: 'Arial',
      fill: '#aaaaaa',
    }).setOrigin(0.5).setDepth(50).setInteractive({ useHandCursor: true });
    objs.push(btn);

    // 클릭 또는 2초 후 자동 닫힘
    const close = () => {
      for (const o of objs) o.destroy();
      this.scene.time.removeAllEvents(); // 타이머 정리
      this._showNext();
    };

    btn.on('pointerdown', close);
    btn.on('pointerover', () => btn.setStyle({ fill: '#ffffff' }));
    btn.on('pointerout',  () => btn.setStyle({ fill: '#aaaaaa' }));

    this.scene.time.delayedCall(2000, close);

    // 등장 애니메이션
    for (const o of objs) {
      o.setAlpha(0);
      this.scene.tweens.add({
        targets:  o,
        alpha:    1,
        duration: 200,
        ease:     'Power2',
      });
    }
  }
}
