// ============================================================
//  TitleScene — 타이틀 화면 + Auth 통합
//  scene-agent 담당
// ============================================================

import Phaser from 'phaser';
import { SCENE, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { authSystem } from '../systems/AuthSystem.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE.TITLE });
    this._unsubAuth = null;
    this._userLabel = null;
    this._startBtn  = null;
  }

  async create() {
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

    // 유저 이름 레이블
    this._userLabel = this.add.text(cx, cy + 18, '', {
      fontSize: '14px', fontFamily: 'Arial', fill: '#7fb3d3',
    }).setOrigin(0.5);

    // 게임 시작 버튼
    this._startBtn = this.add.text(cx, cy + 60, '[ 게임 시작 ]', {
      fontSize: '28px', fontFamily: 'Arial', fontStyle: 'bold', fill: '#3498db',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this._startBtn.on('pointerover',  () => this._startBtn.setStyle({ fill: '#5dade2' }));
    this._startBtn.on('pointerout',   () => this._startBtn.setStyle({ fill: '#3498db' }));
    this._startBtn.on('pointerdown',  () => this.scene.start(SCENE.MAP));

    this.tweens.add({
      targets: this._startBtn, alpha: 0.4, duration: 800, yoyo: true, repeat: -1,
    });

    // 저작권
    this.add.text(cx, GAME_HEIGHT - 24, '© 2026 Co-Mind Works', {
      fontSize: '12px', fontFamily: 'Arial', fill: '#444466',
    }).setOrigin(0.5);

    // Auth 초기화
    await this._initAuth();
  }

  async _initAuth() {
    const user = await authSystem.init();
    this._syncUI(user);

    // 상태 변경 감지
    this._unsubAuth = authSystem.onChange(u => this._syncUI(u));

    // DOM 버튼 바인딩
    document.getElementById('btn-google')?.addEventListener('click', () => authSystem.signIn('google'));
    document.getElementById('btn-github')?.addEventListener('click', () => authSystem.signIn('github'));
    document.getElementById('btn-skip')?.addEventListener('click',
      () => document.getElementById('auth-overlay')?.classList.remove('visible'));
    document.getElementById('btn-logout')?.addEventListener('click', () => authSystem.signOut());
  }

  _syncUI(user) {
    const overlay = document.getElementById('auth-overlay');
    const userBar = document.getElementById('user-bar');
    const nameEl  = document.getElementById('user-name');

    if (user) {
      overlay?.classList.remove('visible');
      userBar?.classList.add('visible');
      if (nameEl) nameEl.textContent = authSystem.displayName;
      this._userLabel?.setText(`${authSystem.displayName} 님 환영합니다`);
    } else {
      overlay?.classList.add('visible');
      userBar?.classList.remove('visible');
      this._userLabel?.setText('');
    }
  }

  shutdown() {
    this._unsubAuth?.();
    this._unsubAuth = null;
  }
}