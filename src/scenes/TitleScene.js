// ============================================================
//  TitleScene — 타이틀 화면 + 계정 UI (로그인/닉네임)
// ============================================================

import Phaser from 'phaser';
import { SCENE, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { authSystem }    from '../systems/AuthSystem.js';
import { saveSystem }    from '../systems/SaveSystem.js';
import { StageProgress } from '../systems/StageProgress.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE.TITLE });
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

    // 게임 시작 버튼
    const startBtn = this.add.text(cx, cy + 60, '[ 게임 시작 ]', {
      fontSize: '28px', fontFamily: 'Arial', fontStyle: 'bold', fill: '#3498db',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerover',  () => startBtn.setStyle({ fill: '#5dade2' }));
    startBtn.on('pointerout',   () => startBtn.setStyle({ fill: '#3498db' }));
    startBtn.on('pointerdown',  () => this.scene.start(SCENE.MAP));

    this.tweens.add({
      targets: startBtn, alpha: 0.4, duration: 800, yoyo: true, repeat: -1,
    });

    // 저작권
    this.add.text(cx, GAME_HEIGHT - 24, '© 2026 Co-Mind Works', {
      fontSize: '12px', fontFamily: 'Arial', fill: '#444466',
    }).setOrigin(0.5);

    // ── 계정 패널 ─────────────────────────────────────────────
    await authSystem.init();

    if (authSystem.isLoggedIn) {
      // 로그인 상태: 클라우드 세이브 동기화 (스테이지 진행 + 유닛 레벨 복원)
      await authSystem.loadCloudSave(saveSystem, StageProgress);
      this._buildLoggedInUI();
    } else {
      this._buildLoginUI();
    }

    // OAuth 리다이렉트 후 상태 변경 감지
    this._unsub = authSystem.onChange(async (user) => {
      if (user) await authSystem.loadCloudSave(saveSystem, StageProgress);
      this.scene.restart();
    });
  }

  // ── 비로그인 UI ──────────────────────────────────────────
  _buildLoginUI() {
    const x = GAME_WIDTH - 16, y = 16;

    const loginBtn = this.add.text(x, y, '🔑 로그인', {
      fontSize: '14px', fontFamily: 'Arial', fill: '#3498db',
      backgroundColor: '#0d1a2e', padding: { x: 12, y: 6 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(10);

    loginBtn.on('pointerover', () => loginBtn.setStyle({ fill: '#5dade2' }));
    loginBtn.on('pointerout',  () => loginBtn.setStyle({ fill: '#3498db' }));
    loginBtn.on('pointerdown', () => window.openAuthModal?.());

    this.add.text(x, y + 36, '게스트 모드', {
      fontSize: '11px', fontFamily: 'Arial', fill: '#334455',
    }).setOrigin(1, 0).setDepth(10);
  }

  // ── 로그인 상태 UI ────────────────────────────────────────
  _buildLoggedInUI() {
    const x = GAME_WIDTH - 16, topY = 14;

    // 닉네임 표시
    this._nameLbl = this.add.text(x, topY, `👤 ${authSystem.displayName}`, {
      fontSize: '14px', fontFamily: 'Arial', fill: '#f1c40f',
      backgroundColor: '#1a1a0a', padding: { x: 10, y: 5 },
    }).setOrigin(1, 0).setDepth(10);

    // 닉네임 변경 버튼
    const editBtn = this.add.text(x, topY + 34, '✏ 닉네임 변경', {
      fontSize: '12px', fontFamily: 'Arial', fill: '#aaaaaa',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(10);

    editBtn.on('pointerover', () => editBtn.setStyle({ fill: '#ffffff' }));
    editBtn.on('pointerout',  () => editBtn.setStyle({ fill: '#aaaaaa' }));
    editBtn.on('pointerdown', () => this._openNicknameDialog());

    // 로그아웃 버튼
    const logoutBtn = this.add.text(x, topY + 58, '🚪 로그아웃', {
      fontSize: '12px', fontFamily: 'Arial', fill: '#e74c3c',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(10);

    logoutBtn.on('pointerover', () => logoutBtn.setStyle({ fill: '#ff6b6b' }));
    logoutBtn.on('pointerout',  () => logoutBtn.setStyle({ fill: '#e74c3c' }));
    logoutBtn.on('pointerdown', async () => {
      await authSystem.signOut();
      StageProgress.reset();
      this.scene.restart();
    });
  }

  // ── 닉네임 변경 다이얼로그 ───────────────────────────────
  _openNicknameDialog() {
    if (this._nickDialog) return; // 중복 방지

    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;

    const overlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65)
      .setDepth(20).setInteractive();

    this.add.rectangle(cx, cy, 380, 200, 0x1a1a2e)
      .setStrokeStyle(2, 0x3498db).setDepth(21);

    this.add.text(cx, cy - 70, '닉네임 변경', {
      fontSize: '18px', fontFamily: 'Arial', fontStyle: 'bold', fill: '#ffffff',
    }).setOrigin(0.5).setDepth(22);

    // HTML input (한글 입력 지원)
    const input = document.createElement('input');
    input.type        = 'text';
    input.maxLength   = 16;
    input.value       = authSystem.displayName;
    input.placeholder = '2~16자';
    input.style.cssText = [
      'position:fixed', 'left:50%', 'top:50%',
      'transform:translate(-50%, -62%)',
      'width:240px', 'padding:9px 14px', 'font-size:15px',
      'background:#0d1a2e', 'color:#fff',
      'border:1.5px solid #3498db', 'border-radius:6px',
      'outline:none', 'text-align:center', 'z-index:9999',
    ].join(';');
    document.body.appendChild(input);
    input.focus(); input.select();

    const statusTxt = this.add.text(cx, cy + 12, '', {
      fontSize: '12px', fontFamily: 'Arial', fill: '#e74c3c',
    }).setOrigin(0.5).setDepth(22);

    const confirmBtn = this.add.text(cx - 55, cy + 60, '확인', {
      fontSize: '15px', fontFamily: 'Arial', fontStyle: 'bold',
      fill: '#2ecc71', backgroundColor: '#0d2010', padding: { x: 22, y: 9 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(22);

    const cancelBtn = this.add.text(cx + 55, cy + 60, '취소', {
      fontSize: '15px', fontFamily: 'Arial',
      fill: '#e74c3c', backgroundColor: '#200d0d', padding: { x: 22, y: 9 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(22);

    const cleanup = () => {
      input.remove();
      // depth 20~22 오브젝트 정리
      [...this.children.list]
        .filter(o => o.depth >= 20)
        .forEach(o => o.destroy());
      this._nickDialog = null;
    };

    const doConfirm = async () => {
      const newName = input.value.trim();
      if (newName.length < 2) { statusTxt.setText('2자 이상 입력하세요'); return; }
      statusTxt.setText('저장 중...');
      const result = await authSystem.updateNickname(newName);
      if (result.ok) {
        this._nameLbl?.setText(`👤 ${newName}`);
        cleanup();
      } else {
        statusTxt.setText(result.error || '저장 실패');
      }
    };

    confirmBtn.on('pointerdown', doConfirm);
    cancelBtn.on('pointerdown',  cleanup);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter')  doConfirm();
      if (e.key === 'Escape') cleanup();
    });

    this._nickDialog = { overlay, input };
  }

  shutdown() {
    this._unsub?.();
    this._nickDialog?.input?.remove();
    this._nickDialog = null;
  }
}
