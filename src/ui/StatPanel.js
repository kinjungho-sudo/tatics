// ============================================================
//  StatPanel — 선택된 유닛 스탯 표시
//  ui-agent 담당
//  위치: 화면 하단 좌측
//  EventBus 없이 BattleScene에서 직접 호출
// ============================================================

import { GAME_HEIGHT } from '../config.js';

export default class StatPanel {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene   = scene;
    this.visible = false;

    const x = 10;
    const y = GAME_HEIGHT - 110;
    const w = 220;
    const h = 100;

    // 패널 배경
    this.bg = scene.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0.75)
      .setStrokeStyle(1.5, 0x3498db, 0.8);

    // 이름 텍스트
    this.nameTxt = scene.add.text(x + 10, y + 8, '', {
      fontSize: '15px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      fill: '#f1c40f',
    });

    // 직업/레벨
    this.jobTxt = scene.add.text(x + 10, y + 28, '', {
      fontSize: '12px',
      fontFamily: 'Arial',
      fill: '#aaaaaa',
    });

    // HP 바 배경
    this.hpBarBg = scene.add.rectangle(x + 10 + 100, y + 50, 100, 8, 0x333333)
      .setOrigin(0, 0.5);

    // HP 바 (fill)
    this.hpBar = scene.add.rectangle(x + 10 + 100, y + 50, 100, 8, 0x2ecc71)
      .setOrigin(0, 0.5);

    // HP 텍스트
    this.hpTxt = scene.add.text(x + 10, y + 46, '', {
      fontSize: '12px',
      fontFamily: 'Arial',
      fill: '#ffffff',
    });

    // 스탯 텍스트
    this.statTxt = scene.add.text(x + 10, y + 66, '', {
      fontSize: '11px',
      fontFamily: 'Arial',
      fill: '#cccccc',
    });

    this._setVisible(false);
  }

  /**
   * 유닛 정보 표시
   * @param {Object} unit
   */
  show(unit) {
    this.nameTxt.setText(unit.name);
    this.jobTxt.setText(`${unit.job}  Lv.${unit.lv}`);
    this.hpTxt.setText(`HP ${unit.hp}/${unit.maxHp}`);
    this.statTxt.setText(`ATK ${unit.atk}  DEF ${unit.def}  SPD ${unit.spd}  MOV ${unit.move}  RNG ${unit.range}`);

    // HP 바 비율 + 색상
    const ratio = unit.hp / unit.maxHp;
    this.hpBar.setDisplaySize(100 * ratio, 8);
    const hpColor = ratio > 0.7 ? 0x2ecc71 : ratio > 0.3 ? 0xf39c12 : 0xe74c3c;
    this.hpBar.setFillStyle(hpColor);

    this._setVisible(true);
  }

  hide() {
    this._setVisible(false);
  }

  _setVisible(v) {
    this.visible = v;
    this.bg.setVisible(v);
    this.nameTxt.setVisible(v);
    this.jobTxt.setVisible(v);
    this.hpBarBg.setVisible(v);
    this.hpBar.setVisible(v);
    this.hpTxt.setVisible(v);
    this.statTxt.setVisible(v);
  }
}
