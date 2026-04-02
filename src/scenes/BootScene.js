// ============================================================
//  BootScene — 에셋 로딩
//  scene-agent 담당
// ============================================================

import { SCENE } from '../config.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE.BOOT });
  }

  preload() {
    // 로딩 진행률 표시
    const { width, height } = this.scale;
    const bar = this.add.graphics();

    this.load.on('progress', (value) => {
      bar.clear();
      bar.fillStyle(0xffffff, 1);
      bar.fillRect(width * 0.1, height / 2 - 8, (width * 0.8) * value, 16);
    });

    // 향후 스프라이트/타일셋 로딩은 여기에 추가
    // this.load.image('knight', 'assets/sprites/knight.png');
    // this.load.image('tileset', 'assets/tilesets/field.png');
  }

  create() {
    // 에셋 로딩 완료 → 타이틀 씬으로 이동
    this.scene.start(SCENE.TITLE);
  }
}
