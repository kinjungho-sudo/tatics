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

    // 아군 캐릭터 (직업별 대표 이미지)
    this.load.image('char-기사',   'sprites/characters/leon.png');
    this.load.image('char-마법사', 'sprites/characters/karin.png');
    this.load.image('char-궁수',   'sprites/characters/ophilia.png');
    this.load.image('char-성직자', 'sprites/characters/pam.png');
    this.load.image('char-기병',   'sprites/characters/brian.png');

    // 추가 캐릭터 (향후 스테이지용)
    this.load.image('char-랄프',   'sprites/characters/ralph.png');
    this.load.image('char-리안',   'sprites/characters/rian.png');
    this.load.image('char-마시아', 'sprites/characters/masia.png');
    this.load.image('char-티티',   'sprites/characters/titi.png');

    // 적군 (직업별)
    this.load.image('enemy-기사',   'sprites/enemies/enemy-knight.png');
    this.load.image('enemy-마법사', 'sprites/enemies/enemy-mage.png');
    this.load.image('enemy-궁수',   'sprites/enemies/enemy-archer.png');
    this.load.image('enemy-성직자', 'sprites/enemies/enemy-paladin.png');
    this.load.image('enemy-기병',   'sprites/enemies/enemy-spear.png');
  }

  create() {
    // 에셋 로딩 완료 → 타이틀 씬으로 이동
    this.scene.start(SCENE.TITLE);
  }
}
