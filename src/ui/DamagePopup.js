// ============================================================
//  DamagePopup — 데미지 숫자 팝업
//  ui-agent 담당
//  데미지 발생 위치에 숫자가 위로 떠오르며 페이드아웃 (0.8초)
// ============================================================

export default class DamagePopup {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
  }

  /**
   * 데미지 팝업 표시
   * @param {number}  x       - 픽셀 x
   * @param {number}  y       - 픽셀 y
   * @param {number}  damage  - 데미지 수치
   * @param {boolean} isAlly  - 아군 피격이면 true (빨간), 적 피격이면 false (흰색)
   */
  show(x, y, damage, isAlly) {
    const color = isAlly ? '#e74c3c' : '#ffffff';
    const txt = this.scene.add.text(x, y, `-${damage}`, {
      fontSize: '22px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      fill: color,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);

    // 위로 떠오르며 페이드아웃
    this.scene.tweens.add({
      targets:  txt,
      y:        y - 50,
      alpha:    0,
      duration: 800,
      ease:     'Power2',
      onComplete: () => txt.destroy(),
    });
  }
}
