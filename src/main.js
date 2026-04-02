// ============================================================
//  Phaser.js 게임 진입점 — setup-agent 담당
//  모든 Scene을 등록하고 게임 인스턴스를 생성한다
// ============================================================

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';
import BootScene   from './scenes/BootScene.js';
import TitleScene  from './scenes/TitleScene.js';
import MapScene    from './scenes/MapScene.js';
import BattleScene from './scenes/BattleScene.js';

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1a1a2e',
  parent: 'game-container',
  // 모바일 최적화: 캔버스 자동 리사이즈
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // 물리 엔진 없음 (격자 기반 SRPG이므로 불필요)
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [
    BootScene,
    TitleScene,
    MapScene,
    BattleScene,
  ],
};

// 게임 인스턴스 생성
const game = new Phaser.Game(config);

export default game;