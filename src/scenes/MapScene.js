// ============================================================
//  MapScene — 스테이지 선택 화면
//  scene-agent 담당
// ============================================================

import Phaser from 'phaser';
import { SCENE, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { stage01 } from '../data/stages/stage01.js';
import { stage02 } from '../data/stages/stage02.js';
import { stage03 } from '../data/stages/stage03.js';
import { stage04 } from '../data/stages/stage04.js';
import { stage05 } from '../data/stages/stage05.js';

const STAGES = [stage01, stage02, stage03, stage04, stage05];

export default class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE.MAP });
  }

  create() {
    const cx = GAME_WIDTH / 2;

    // 배경
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x111122);

    // 타이틀
    this.add.text(cx, 50, '스테이지 선택', {
      fontSize: '32px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      fill: '#f1c40f',
    }).setOrigin(0.5);

    // 스테이지 버튼 목록
    STAGES.forEach((stage, i) => {
      const y = 160 + i * 100;
      const bg = this.add.rectangle(cx, y, 500, 72, 0x223344)
        .setStrokeStyle(2, 0x3498db)
        .setInteractive({ useHandCursor: true });

      this.add.text(cx - 200, y - 10, `Stage ${i + 1}`, {
        fontSize: '22px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        fill: '#ffffff',
      }).setOrigin(0, 0.5);

      this.add.text(cx - 200, y + 14, stage.description || stage.name, {
        fontSize: '14px',
        fontFamily: 'Arial',
        fill: '#aaaaaa',
      }).setOrigin(0, 0.5);

      bg.on('pointerover',  () => bg.setFillStyle(0x334466));
      bg.on('pointerout',   () => bg.setFillStyle(0x223344));
      bg.on('pointerdown',  () => {
        this.scene.start(SCENE.BATTLE, { stageId: stage.id });
      });
    });

    // 뒤로 가기
    const back = this.add.text(40, GAME_HEIGHT - 40, '← 타이틀', {
      fontSize: '16px',
      fontFamily: 'Arial',
      fill: '#778899',
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

    back.on('pointerover', () => back.setStyle({ fill: '#aabbcc' }));
    back.on('pointerout',  () => back.setStyle({ fill: '#778899' }));
    back.on('pointerdown', () => this.scene.start(SCENE.TITLE));
  }
}
