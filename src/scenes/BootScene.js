// ============================================================
//  BootScene — 에셋 로딩
//  scene-agent 담당
// ============================================================

import Phaser from 'phaser';
import { SCENE, GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE.BOOT });
  }

  preload() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // 배경
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x0d0d1a);

    // 로딩 바 배경
    this.add.rectangle(cx, cy, GAME_WIDTH * 0.6, 16, 0x222233);
    const barFill = this.add.rectangle(cx - GAME_WIDTH * 0.3, cy, 0, 14, 0x3498db).setOrigin(0, 0.5);

    this.add.text(cx, cy - 30, 'LOADING...', {
      fontSize: '16px', fontFamily: 'Arial', fill: '#778899',
    }).setOrigin(0.5);

    this.load.on('progress', (v) => {
      barFill.setDisplaySize(GAME_WIDTH * 0.6 * v, 14);
    });

    // 이미지 로딩 실패 시 텍스처 없이 진행 (폴백: 색상 박스 유지)
    this.load.on('loaderror', (file) => {
      console.warn(`[Boot] 이미지 로딩 실패: ${file.key} (${file.url})`);
    });

    // 아군 캐릭터 (직업별)
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

  // 흰색(근사) 배경 픽셀을 투명하게 처리
  _removeWhiteBg(key, threshold = 230) {
    const texture = this.textures.get(key);
    if (!texture || texture.key === '__MISSING') return;

    const src = texture.getSourceImage();
    const canvas = document.createElement('canvas');
    canvas.width  = src.width;
    canvas.height = src.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(src, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > threshold && d[i+1] > threshold && d[i+2] > threshold) {
        d[i+3] = 0;
      }
    }
    ctx.putImageData(imageData, 0, 0);

    this.textures.remove(key);
    this.textures.addCanvas(key, canvas);
  }

  create() {
    // 적군 이미지 흰 배경 제거
    ['enemy-기사', 'enemy-마법사', 'enemy-궁수', 'enemy-성직자', 'enemy-기병'].forEach(k => {
      this._removeWhiteBg(k);
    });

    this.scene.start(SCENE.TITLE);
  }
}
