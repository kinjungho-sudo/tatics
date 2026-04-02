// ============================================================
//  TitleScene — 타이틀 화면
//  scene-agent 담당
// ============================================================

import Phaser from 'phaser';
import { SCENE, GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE.TITLE });
  }

  create() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // 배경
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x0d0d1a);

    // 게임 타이틀
    this.add.text(cx, cy - 100, 'TACTICS', {
      fontSize: '64px', fontFamily: 'Arial', fontStyle: 'bold', fill: '#f1c40f',
    }).setOrigin(0.5);

    this.add.text(cx, cy - 30, '오리지널 전술 RPG', {
      fontSize: '20px', fontFamily: 'Arial', fill: '#aaaaaa',
    }).setOrigin(0.5);

    // 게임 시작 버튼
    const startBtn = this.add.text(cx, cy + 60, '[ 게임 시작 ]', {
      fontSize: '28px', fontFamily: 'Arial', fontStyle: 'bold', fill: '#3498db',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerover',  () => startBtn.setStyle({ fill: '#5dade2' }));
    startBtn.on('pointerout',   () => startBtn.setStyle({ fill: '#3498db' }));
    startBtn.on('pointerdown',  () => this.scene.start(SCENE.MAP));

    // 깜빡임 애니메이션
    this.tweens.add({
      targets: startBtn, alpha: 0.4, duration: 800, yoyo: true, repeat: -1,
    });

    // 저작권
    this.add.text(cx, GAME_HEIGHT - 24, '© 2026 Co-Mind Works', {
      fontSize: '12px', fontFamily: 'Arial', fill: '#444466',
    }).setOrigin(0.5);
  }
}
