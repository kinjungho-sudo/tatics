// ============================================================
//  OrderPanel — 행동 선택 패널 ([공격] [대기] [취소])
//  ui-agent 담당
//  유닛 이동 후 표시
// ============================================================

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

const BTN_W = 70;
const BTN_H = 36;
const GAP   = 8;

export default class OrderPanel {
  /**
   * @param {Phaser.Scene} scene
   * @param {Function}     onAction - 'attack' | 'wait' | 'cancel'
   */
  constructor(scene, onAction) {
    this.scene    = scene;
    this.onAction = onAction;
    this.buttons  = [];
    this.visible  = false;
  }

  /**
   * 패널 표시
   * @param {number}  anchorX     - 유닛 픽셀 x
   * @param {number}  anchorY     - 유닛 픽셀 y
   * @param {boolean} hasTarget   - 공격 가능한 적이 있는지
   */
  show(anchorX, anchorY, hasTarget) {
    this.hide();

    const actions = [];
    if (hasTarget) actions.push({ label: '공격', key: 'attack', color: 0xe74c3c });
    actions.push({ label: '대기', key: 'wait',   color: 0x27ae60 });
    actions.push({ label: '취소', key: 'cancel', color: 0x7f8c8d });

    const totalW = actions.length * BTN_W + (actions.length - 1) * GAP;

    // 화면 밖으로 나가지 않도록 위치 조정
    let startX = anchorX - totalW / 2;
    startX = Math.max(BTN_W / 2 + 4, Math.min(GAME_WIDTH - totalW - 4, startX));
    let btnY = anchorY - 50;
    btnY = Math.max(BTN_H / 2 + 4, Math.min(GAME_HEIGHT - BTN_H / 2 - 4, btnY));

    actions.forEach((action, i) => {
      const bx = startX + i * (BTN_W + GAP) + BTN_W / 2;

      const bg = this.scene.add.rectangle(bx, btnY, BTN_W, BTN_H, action.color)
        .setStrokeStyle(1.5, 0xffffff, 0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(20);

      const txt = this.scene.add.text(bx, btnY, action.label, {
        fontSize: '14px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        fill: '#ffffff',
      }).setOrigin(0.5).setDepth(20);

      bg.on('pointerover',  () => bg.setAlpha(0.8));
      bg.on('pointerout',   () => bg.setAlpha(1));
      bg.on('pointerdown',  () => {
        this.hide();
        this.onAction(action.key);
      });

      this.buttons.push(bg, txt);
    });

    this.visible = true;
  }

  hide() {
    for (const btn of this.buttons) btn.destroy();
    this.buttons = [];
    this.visible = false;
  }
}
