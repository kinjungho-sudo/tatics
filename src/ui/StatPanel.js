// ============================================================
//  StatPanel — 선택된 유닛 스탯 표시 (좌측 하단 박스)
//  ui-agent 담당
// ============================================================

import { GAME_HEIGHT } from '../config.js';

const W = 240;
const H = 148;
const X = 10;
const Y = GAME_HEIGHT - H - 10;

export default class StatPanel {
  constructor(scene) {
    this.scene   = scene;
    this.visible = false;

    // 외곽 패널
    this.bg = scene.add.rectangle(X + W / 2, Y + H / 2, W, H, 0x0a0a1a, 0.92)
      .setStrokeStyle(2, 0x3498db, 1)
      .setDepth(10);

    // 상단 헤더 구분선 영역
    this.header = scene.add.rectangle(X + W / 2, Y + 20, W, 36, 0x1a2a4a, 0.95)
      .setStrokeStyle(0)
      .setDepth(10);

    // 이름
    this.nameTxt = scene.add.text(X + 12, Y + 8, '', {
      fontSize: '15px', fontFamily: 'Arial', fontStyle: 'bold', fill: '#f1c40f',
    }).setDepth(11);

    // 직업 / 레벨
    this.jobTxt = scene.add.text(X + W - 12, Y + 10, '', {
      fontSize: '12px', fontFamily: 'Arial', fill: '#aaaacc',
    }).setOrigin(1, 0).setDepth(11);

    // ── HP 바 ──
    this.hpLabel = scene.add.text(X + 12, Y + 46, 'HP', {
      fontSize: '10px', fontFamily: 'Arial', fontStyle: 'bold', fill: '#2ecc71',
    }).setDepth(11);

    this.hpTxt = scene.add.text(X + W - 12, Y + 46, '', {
      fontSize: '10px', fontFamily: 'Arial', fill: '#aaaaaa',
    }).setOrigin(1, 0).setDepth(11);

    const barX  = X + 30;
    const barW  = W - 42;
    this.hpBarBg = scene.add.rectangle(barX + barW / 2, Y + 62, barW, 8, 0x1a2a1a).setDepth(10);
    this.hpBar   = scene.add.rectangle(barX, Y + 62, barW, 8, 0x2ecc71).setOrigin(0, 0.5).setDepth(11);

    // ── MP 바 ──
    this.mpLabel = scene.add.text(X + 12, Y + 74, 'MP', {
      fontSize: '10px', fontFamily: 'Arial', fontStyle: 'bold', fill: '#3498db',
    }).setDepth(11);

    this.mpTxt = scene.add.text(X + W - 12, Y + 74, '', {
      fontSize: '10px', fontFamily: 'Arial', fill: '#aaaaaa',
    }).setOrigin(1, 0).setDepth(11);

    this.mpBarBg = scene.add.rectangle(barX + barW / 2, Y + 90, barW, 8, 0x0a1a2a).setDepth(10);
    this.mpBar   = scene.add.rectangle(barX, Y + 90, barW, 8, 0x3498db).setOrigin(0, 0.5).setDepth(11);

    // ── 스탯 그리드 ──
    const statY = Y + 106;
    this.atkTxt = this._makeStatLabel(scene, X + 14,       statY, 'ATK', '#e74c3c');
    this.defTxt = this._makeStatLabel(scene, X + 62,       statY, 'DEF', '#f39c12');
    this.spdTxt = this._makeStatLabel(scene, X + 110,      statY, 'SPD', '#1abc9c');
    this.movTxt = this._makeStatLabel(scene, X + 158,      statY, 'MOV', '#9b59b6');
    this.rngTxt = this._makeStatLabel(scene, X + 206,      statY, 'RNG', '#e67e22');

    this.atkVal = this._makeStatVal(scene, X + 14,  statY);
    this.defVal = this._makeStatVal(scene, X + 62,  statY);
    this.spdVal = this._makeStatVal(scene, X + 110, statY);
    this.movVal = this._makeStatVal(scene, X + 158, statY);
    this.rngVal = this._makeStatVal(scene, X + 206, statY);

    this._all = [
      this.bg, this.header,
      this.nameTxt, this.jobTxt,
      this.hpLabel, this.hpTxt, this.hpBarBg, this.hpBar,
      this.mpLabel, this.mpTxt, this.mpBarBg, this.mpBar,
      this.atkTxt, this.defTxt, this.spdTxt, this.movTxt, this.rngTxt,
      this.atkVal, this.defVal, this.spdVal, this.movVal, this.rngVal,
    ];

    this._setVisible(false);
  }

  _makeStatLabel(scene, x, y, text, color) {
    return scene.add.text(x, y, text, {
      fontSize: '9px', fontFamily: 'Arial', fontStyle: 'bold', fill: color,
    }).setOrigin(0, 0).setDepth(11);
  }

  _makeStatVal(scene, x, y) {
    return scene.add.text(x, y + 12, '--', {
      fontSize: '13px', fontFamily: 'Arial', fontStyle: 'bold', fill: '#ffffff',
    }).setOrigin(0, 0).setDepth(11);
  }

  show(unit) {
    this.nameTxt.setText(unit.name);
    this.jobTxt.setText(`${unit.job}  Lv.${unit.lv}`);

    // HP
    this.hpTxt.setText(`${unit.hp} / ${unit.maxHp}`);
    const hpRatio = Math.max(0, unit.hp / unit.maxHp);
    const barW = W - 42;
    this.hpBar.setDisplaySize(barW * hpRatio, 8);
    const hpCol = hpRatio > 0.5 ? 0x2ecc71 : hpRatio > 0.25 ? 0xf39c12 : 0xe74c3c;
    this.hpBar.setFillStyle(hpCol);

    // MP
    const mp    = unit.mp    ?? 30;
    const maxMp = unit.maxMp ?? 30;
    this.mpTxt.setText(`${mp} / ${maxMp}`);
    const mpRatio = Math.max(0, mp / maxMp);
    this.mpBar.setDisplaySize(barW * mpRatio, 8);

    // Stats
    this.atkVal.setText(String(unit.atk));
    this.defVal.setText(String(unit.def));
    this.spdVal.setText(String(unit.spd));
    this.movVal.setText(String(unit.move));
    this.rngVal.setText(String(unit.range));

    this._setVisible(true);
  }

  hide() { this._setVisible(false); }

  _setVisible(v) {
    this.visible = v;
    for (const o of this._all) o.setVisible(v);
  }
}
