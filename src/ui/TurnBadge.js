// ============================================================
//  TurnBadge — 턴 표시 배지
//  ui-agent 담당
//  위치: 화면 상단 중앙
// ============================================================

import { GAME_WIDTH } from '../config.js';

export default class TurnBadge {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    const cx   = GAME_WIDTH / 2;

    // 배지 배경
    this.bg = scene.add.rectangle(cx, 24, 220, 36, 0x2c3e50, 0.9)
      .setStrokeStyle(2, 0x3498db);

    // 턴 텍스트
    this.txt = scene.add.text(cx - 40, 24, '', {
      fontSize: '16px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      fill: '#ffffff',
    }).setOrigin(0, 0.5);

    // 턴 카운터 텍스트
    this.countTxt = scene.add.text(cx + 60, 24, '', {
      fontSize: '13px',
      fontFamily: 'Arial',
      fill: '#aaaaaa',
    }).setOrigin(0, 0.5);

    this.bg.setDepth(10);
    this.txt.setDepth(10);
    this.countTxt.setDepth(10);
  }

  /**
   * @param {string} teamLabel - '아군 턴' | '적 턴'
   * @param {number} turn
   */
  show(teamLabel, turn) {
    const isAlly  = teamLabel.includes('아군');
    const color   = isAlly ? '#3498db' : '#e74c3c';
    const bgColor = isAlly ? 0x1a3a5c : 0x5c1a1a;

    this.bg.setFillStyle(bgColor, 0.9);
    this.bg.setStrokeStyle(2, isAlly ? 0x3498db : 0xe74c3c);
    this.txt.setText(teamLabel).setStyle({ fill: color });
    this.countTxt.setText(`Turn ${turn}`);

    // 슬라이드 인 애니메이션
    this.bg.setAlpha(0);
    this.txt.setAlpha(0);
    this.countTxt.setAlpha(0);

    this.scene.tweens.add({
      targets: [this.bg, this.txt, this.countTxt],
      alpha: 1,
      duration: 300,
      ease: 'Power2',
    });
  }
}
