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
import { StageProgress } from '../systems/StageProgress.js';

const STAGES = [
  { data: stage01, difficulty: '★☆☆', diffLabel: '입문' },
  { data: stage02, difficulty: '★★☆', diffLabel: '보통' },
  { data: stage03, difficulty: '★★☆', diffLabel: '보통' },
  { data: stage04, difficulty: '★★★', diffLabel: '어려움' },
  { data: stage05, difficulty: '★★★', diffLabel: '어려움' },
];

const CARD_W = 520;
const CARD_H = 78;
const START_Y = 140;
const GAP     = 94;

export default class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE.MAP });
  }

  create() {
    const cx = GAME_WIDTH / 2;

    // 배경
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x111122);

    // 타이틀
    this.add.text(cx, 38, '스테이지 선택', {
      fontSize: '30px', fontFamily: 'Arial', fontStyle: 'bold', fill: '#f1c40f',
    }).setOrigin(0.5);

    // 진행률
    const clearedCnt = StageProgress.clearedCount();
    this.add.text(cx, 76, `진행  ${clearedCnt} / ${STAGES.length}  클리어`, {
      fontSize: '14px', fontFamily: 'Arial', fill: '#778899',
    }).setOrigin(0.5);

    // 스테이지 카드 목록
    STAGES.forEach(({ data: stage, difficulty, diffLabel }, i) => {
      const y        = START_Y + i * GAP;
      const unlocked = StageProgress.isUnlocked(stage.id);
      const cleared  = StageProgress.isCleared(stage.id);

      // 카드 배경
      const cardColor = unlocked ? 0x1e3a5f : 0x1a1a2a;
      const borderCol = cleared ? 0x2ecc71 : unlocked ? 0x3498db : 0x333344;
      const card = this.add.rectangle(cx, y, CARD_W, CARD_H, cardColor)
        .setStrokeStyle(2, borderCol);

      if (unlocked) {
        card.setInteractive({ useHandCursor: true });
        card.on('pointerover',  () => card.setFillStyle(0x254a72));
        card.on('pointerout',   () => card.setFillStyle(cardColor));
        card.on('pointerdown',  () => this.scene.start(SCENE.BATTLE, { stageId: stage.id }));
      }

      // 스테이지 번호 + 이름
      this.add.text(cx - 230, y - 16, `Stage ${i + 1}  ${stage.name}`, {
        fontSize: '17px', fontFamily: 'Arial', fontStyle: 'bold',
        fill: unlocked ? '#ffffff' : '#555566',
      }).setOrigin(0, 0.5);

      // 설명
      this.add.text(cx - 230, y + 10, stage.description || '', {
        fontSize: '11px', fontFamily: 'Arial',
        fill: unlocked ? '#8899aa' : '#444455',
      }).setOrigin(0, 0.5);

      // 난이도 별
      this.add.text(cx + 100, y - 14, difficulty, {
        fontSize: '13px', fontFamily: 'Arial',
        fill: unlocked ? '#f1c40f' : '#333344',
      }).setOrigin(0, 0.5);

      // 난이도 텍스트
      this.add.text(cx + 100, y + 10, diffLabel, {
        fontSize: '11px', fontFamily: 'Arial',
        fill: unlocked ? '#778899' : '#333344',
      }).setOrigin(0, 0.5);

      // 상태 배지
      if (cleared) {
        this.add.rectangle(cx + 218, y, 56, 26, 0x1a5c35)
          .setStrokeStyle(1.5, 0x2ecc71);
        this.add.text(cx + 218, y, 'CLEAR', {
          fontSize: '13px', fontFamily: 'Arial', fontStyle: 'bold', fill: '#2ecc71',
        }).setOrigin(0.5);
      } else if (!unlocked) {
        this.add.text(cx + 218, y, '🔒', {
          fontSize: '20px', fontFamily: 'Arial',
        }).setOrigin(0.5);
      }
    });

    // 뒤로 가기
    const back = this.add.text(36, GAME_HEIGHT - 36, '← 타이틀', {
      fontSize: '16px', fontFamily: 'Arial', fill: '#778899',
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

    back.on('pointerover', () => back.setStyle({ fill: '#aabbcc' }));
    back.on('pointerout',  () => back.setStyle({ fill: '#778899' }));
    back.on('pointerdown', () => this.scene.start(SCENE.TITLE));

    // 진행 초기화 버튼 (디버그)
    const resetBtn = this.add.text(GAME_WIDTH - 20, GAME_HEIGHT - 36, '진행 초기화', {
      fontSize: '12px', fontFamily: 'Arial', fill: '#334455',
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });

    resetBtn.on('pointerover', () => resetBtn.setStyle({ fill: '#e74c3c' }));
    resetBtn.on('pointerout',  () => resetBtn.setStyle({ fill: '#334455' }));
    resetBtn.on('pointerdown', () => { StageProgress.reset(); this.scene.restart(); });
  }
}
