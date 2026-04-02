// ============================================================
//  SoundSystem — Web Audio API 프로시저럴 사운드
//  외부 파일 없이 실시간 음원 합성
//  싱글톤: import { soundSystem } from './SoundSystem.js';
// ============================================================

class SoundSystem {
  constructor() {
    this._ctx    = null;   // AudioContext (첫 사용자 제스처 후 생성)
    this._master = null;   // MasterGainNode
    this._bgmSrc = null;   // 현재 재생 중인 BGM 소스
    this._bgmGain = null;
    this._muted  = false;
    this._vol    = 0.7;    // 마스터 볼륨 (0~1)
    this._bgmVol = 0.25;   // BGM 볼륨
  }

  // ── 첫 클릭/터치 후 AudioContext 초기화 ──────────────────
  _ensureCtx() {
    if (this._ctx) return true;
    try {
      this._ctx    = new (window.AudioContext || window.webkitAudioContext)();
      this._master = this._ctx.createGain();
      this._master.gain.value = this._vol;
      this._master.connect(this._ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  // ── 볼륨 / 뮤트 ──────────────────────────────────────────
  setVolume(v) {
    this._vol = Math.max(0, Math.min(1, v));
    if (this._master) this._master.gain.value = this._muted ? 0 : this._vol;
  }

  toggleMute() {
    this._muted = !this._muted;
    if (this._master) this._master.gain.value = this._muted ? 0 : this._vol;
    return this._muted;
  }

  get isMuted() { return this._muted; }

  // ═══════════════════════════════════════════════════════
  //  효과음 — 내부 헬퍼
  // ═══════════════════════════════════════════════════════

  /** 단순 오실레이터 재생 */
  _osc(type, freq, startTime, duration, gainVal = 0.3, endFreq = null) {
    if (!this._ctx) return;
    const osc  = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (endFreq !== null) {
      osc.frequency.linearRampToValueAtTime(endFreq, startTime + duration);
    }
    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(this._master);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  /** 노이즈 버스트 (타격감) */
  _noise(startTime, duration, gainVal = 0.15, lpFreq = 2000) {
    if (!this._ctx) return;
    const bufSize   = Math.floor(this._ctx.sampleRate * duration);
    const buffer    = this._ctx.createBuffer(1, bufSize, this._ctx.sampleRate);
    const data      = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src    = this._ctx.createBufferSource();
    src.buffer   = buffer;

    const filter = this._ctx.createBiquadFilter();
    filter.type  = 'lowpass';
    filter.frequency.value = lpFreq;

    const gain   = this._ctx.createGain();
    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this._master);
    src.start(startTime);
    src.stop(startTime + duration + 0.01);
  }

  // ═══════════════════════════════════════════════════════
  //  공개 효과음 API
  // ═══════════════════════════════════════════════════════

  /** 버튼 클릭 — 짧고 가벼운 틱 */
  playClick() {
    if (!this._ensureCtx()) return;
    const t = this._ctx.currentTime;
    this._osc('sine', 880, t, 0.06, 0.12);
    this._osc('sine', 1100, t + 0.03, 0.05, 0.08);
  }

  /** 이동 — 발걸음 느낌 */
  playMove() {
    if (!this._ensureCtx()) return;
    const t = this._ctx.currentTime;
    this._noise(t, 0.06, 0.08, 800);
    this._osc('square', 220, t, 0.07, 0.06, 180);
  }

  /** 근거리 공격 — 검 휘두르기 */
  playSwordSlash() {
    if (!this._ensureCtx()) return;
    const t = this._ctx.currentTime;
    this._noise(t,        0.04, 0.22, 4000);
    this._noise(t + 0.03, 0.07, 0.18, 1800);
    this._osc('sawtooth', 320, t, 0.08, 0.1, 180);
  }

  /** 원거리 공격 — 화살/마법 발사 */
  playRangedShot() {
    if (!this._ensureCtx()) return;
    const t = this._ctx.currentTime;
    this._osc('square',   600, t, 0.05, 0.12, 900);
    this._osc('triangle', 400, t + 0.02, 0.08, 0.08, 200);
    this._noise(t, 0.04, 0.06, 3000);
  }

  /** 마법 공격 — 신비로운 차징 */
  playMagic() {
    if (!this._ensureCtx()) return;
    const t = this._ctx.currentTime;
    this._osc('sine',  523, t,        0.15, 0.15, 1047);
    this._osc('sine',  659, t + 0.05, 0.12, 0.12, 1319);
    this._osc('sine',  784, t + 0.10, 0.15, 0.18, 1568);
    this._osc('triangle', 300, t + 0.15, 0.10, 0.12, 100);
    this._noise(t + 0.10, 0.12, 0.06, 5000);
  }

  /** 피격 — 적/아군 맞는 소리 */
  playHit() {
    if (!this._ensureCtx()) return;
    const t = this._ctx.currentTime;
    this._noise(t,        0.05, 0.25, 1200);
    this._osc('square', 150, t, 0.08, 0.18, 80);
    this._noise(t + 0.02, 0.06, 0.12, 600);
  }

  /** 강타 — 크리티컬 / 강한 데미지 */
  playHeavyHit() {
    if (!this._ensureCtx()) return;
    const t = this._ctx.currentTime;
    this._noise(t,        0.08, 0.35, 800);
    this._osc('sawtooth', 120, t, 0.10, 0.22, 50);
    this._noise(t + 0.04, 0.10, 0.20, 400);
    this._osc('sine', 200, t + 0.06, 0.06, 0.10, 60);
  }

  /** 유닛 사망 */
  playDeath() {
    if (!this._ensureCtx()) return;
    const t = this._ctx.currentTime;
    this._osc('sawtooth', 300, t,        0.20, 0.18, 80);
    this._osc('square',   150, t + 0.10, 0.20, 0.14, 60);
    this._noise(t,        0.30, 0.12, 600);
  }

  /** 회복 */
  playHeal() {
    if (!this._ensureCtx()) return;
    const t = this._ctx.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) => {
      this._osc('sine', freq, t + i * 0.07, 0.14, 0.12);
    });
  }

  /** 턴 시작 — 아군 */
  playAllyTurnStart() {
    if (!this._ensureCtx()) return;
    const t = this._ctx.currentTime;
    this._osc('sine', 440, t,        0.12, 0.15);
    this._osc('sine', 550, t + 0.10, 0.12, 0.15);
    this._osc('sine', 660, t + 0.20, 0.18, 0.20);
  }

  /** 턴 시작 — 적 */
  playEnemyTurnStart() {
    if (!this._ensureCtx()) return;
    const t = this._ctx.currentTime;
    this._osc('sawtooth', 330, t,        0.12, 0.12, 280);
    this._osc('sawtooth', 280, t + 0.10, 0.12, 0.12, 220);
  }

  /** 레벨업 — 상승감 있는 팡파르 */
  playLevelUp() {
    if (!this._ensureCtx()) return;
    const t = this._ctx.currentTime;
    const melody = [
      [523, 0.00], [659, 0.10], [784, 0.20],
      [1047,0.30], [1319,0.42], [1568,0.56],
    ];
    melody.forEach(([freq, offset]) => {
      this._osc('sine',     freq,       t + offset, 0.18, 0.18);
      this._osc('triangle', freq * 1.5, t + offset, 0.14, 0.06);
    });
    this._osc('sine', 1568, t + 0.72, 0.40, 0.22);
  }

  /** 승리 — 밝고 짧은 팡파르 */
  playVictory() {
    if (!this._ensureCtx()) return;
    const t = this._ctx.currentTime;
    const notes = [
      [523, 0.00, 0.12], [523, 0.14, 0.12], [523, 0.28, 0.12],
      [415, 0.44, 0.18], [622, 0.66, 0.35],
      [587, 1.06, 0.12], [587, 1.20, 0.12], [587, 1.34, 0.12],
      [494, 1.50, 0.18], [740, 1.72, 0.50],
    ];
    notes.forEach(([freq, offset, dur]) => {
      this._osc('square', freq,     t + offset, dur, 0.14);
      this._osc('sine',   freq * 2, t + offset, dur, 0.06);
    });
  }

  /** 패배 — 묵직하게 가라앉는 소리 */
  playDefeat() {
    if (!this._ensureCtx()) return;
    const t = this._ctx.currentTime;
    const notes = [
      [294, 0.00, 0.30], [262, 0.35, 0.30],
      [247, 0.70, 0.30], [220, 1.05, 0.60],
    ];
    notes.forEach(([freq, offset, dur]) => {
      this._osc('sawtooth', freq, t + offset, dur, 0.14, freq * 0.85);
    });
    this._noise(t + 1.00, 0.50, 0.08, 400);
  }

  /** 유닛 선택 — 짧은 확인음 */
  playSelect() {
    if (!this._ensureCtx()) return;
    const t = this._ctx.currentTime;
    this._osc('sine', 660, t,        0.06, 0.12);
    this._osc('sine', 880, t + 0.05, 0.08, 0.10);
  }

  /** 행동 취소 — 낮은 음 */
  playCancel() {
    if (!this._ensureCtx()) return;
    const t = this._ctx.currentTime;
    this._osc('sine', 440, t,        0.06, 0.10, 330);
    this._osc('sine', 330, t + 0.05, 0.08, 0.10, 250);
  }

  // ═══════════════════════════════════════════════════════
  //  BGM — 프로시저럴 루프 (타이틀 / 전투 2종)
  // ═══════════════════════════════════════════════════════

  stopBgm() {
    if (this._bgmSrc) {
      try { this._bgmSrc.stop(); } catch {}
      this._bgmSrc = null;
    }
  }

  /** 타이틀 BGM — 잔잔한 어드벤처 테마 */
  playTitleBgm() {
    if (!this._ensureCtx()) return;
    this.stopBgm();

    const bpm      = 90;
    const beat     = 60 / bpm;
    const ctx      = this._ctx;
    const t        = ctx.currentTime + 0.1;

    const gainNode = ctx.createGain();
    gainNode.gain.value = this._bgmVol;
    gainNode.connect(this._master);
    this._bgmGain = gainNode;

    // 8마디 멜로디 (C장조 펜타토닉)
    const melody = [
      [523, 1], [659, 1], [784, 1], [880, 2],
      [784, 1], [659, 1], [523, 2],
      [392, 1], [523, 1], [659, 1], [784, 2],
      [659, 1], [523, 1], [392, 4],
    ];

    const bassLine = [
      [130, 2], [165, 2], [196, 2], [220, 2],
      [196, 2], [165, 2], [130, 4],
      [110, 2], [130, 2], [146, 2], [165, 2],
      [130, 2], [110, 2], [98, 4],
    ];

    const totalBeats = melody.reduce((s, [, d]) => s + d, 0);

    const playLoop = (startT) => {
      let cursor = startT;
      melody.forEach(([freq, dur]) => {
        const osc  = ctx.createOscillator();
        const env  = ctx.createGain();
        osc.type   = 'triangle';
        osc.frequency.value = freq;
        env.gain.setValueAtTime(0, cursor);
        env.gain.linearRampToValueAtTime(0.35, cursor + 0.02);
        env.gain.exponentialRampToValueAtTime(0.001, cursor + dur * beat - 0.01);
        osc.connect(env); env.connect(gainNode);
        osc.start(cursor); osc.stop(cursor + dur * beat);
        cursor += dur * beat;
      });

      let bassCursor = startT;
      bassLine.forEach(([freq, dur]) => {
        const osc  = ctx.createOscillator();
        const env  = ctx.createGain();
        osc.type   = 'sine';
        osc.frequency.value = freq;
        env.gain.setValueAtTime(0.18, bassCursor);
        env.gain.exponentialRampToValueAtTime(0.001, bassCursor + dur * beat - 0.02);
        osc.connect(env); env.connect(gainNode);
        osc.start(bassCursor); osc.stop(bassCursor + dur * beat);
        bassCursor += dur * beat;
      });

      // 루프 예약
      const loopDuration = totalBeats * beat;
      const timer = ctx.createOscillator();
      timer.frequency.value = 0;
      timer.start(startT + loopDuration - 0.05);
      timer.stop(startT + loopDuration);
      timer.onended = () => {
        if (this._bgmSrc === timer) playLoop(startT + loopDuration);
      };
      this._bgmSrc = timer;
      timer.connect(ctx.destination);
    };

    playLoop(t);
  }

  /** 전투 BGM — 긴장감 있는 루프 */
  playBattleBgm() {
    if (!this._ensureCtx()) return;
    this.stopBgm();

    const bpm   = 128;
    const beat  = 60 / bpm;
    const ctx   = this._ctx;
    const t     = ctx.currentTime + 0.1;

    const gainNode = ctx.createGain();
    gainNode.gain.value = this._bgmVol;
    gainNode.connect(this._master);
    this._bgmGain = gainNode;

    // 전투 멜로디 (단조, 긴장감)
    const melody = [
      [220, 0.5], [261, 0.5], [293, 0.5], [329, 0.5],
      [311, 0.5], [261, 0.5], [220, 1.0],
      [196, 0.5], [220, 0.5], [261, 0.5], [293, 0.5],
      [277, 0.5], [220, 0.5], [196, 1.0],
    ];

    // 드럼 패턴 (킥 + 스네어)
    const kick   = [0, 2, 4, 6];
    const snare  = [1, 3, 5, 7];
    const beats  = 8;

    const totalBeats = melody.reduce((s, [, d]) => s + d, 0);

    const playLoop = (startT) => {
      // 멜로디
      let cursor = startT;
      melody.forEach(([freq, dur]) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type  = 'sawtooth';
        osc.frequency.value = freq;
        env.gain.setValueAtTime(0.22, cursor);
        env.gain.exponentialRampToValueAtTime(0.001, cursor + dur * beat - 0.02);
        osc.connect(env); env.connect(gainNode);
        osc.start(cursor); osc.stop(cursor + dur * beat);
        cursor += dur * beat;
      });

      // 드럼
      for (let b = 0; b < beats; b++) {
        const bt = startT + b * beat;
        if (kick.includes(b)) {
          // 킥: 저음 사인파 빠른 피치 다운
          const o = ctx.createOscillator();
          const e = ctx.createGain();
          o.type  = 'sine';
          o.frequency.setValueAtTime(180, bt);
          o.frequency.exponentialRampToValueAtTime(50, bt + 0.12);
          e.gain.setValueAtTime(0.5, bt);
          e.gain.exponentialRampToValueAtTime(0.001, bt + 0.18);
          o.connect(e); e.connect(gainNode);
          o.start(bt); o.stop(bt + 0.20);
        }
        if (snare.includes(b)) {
          // 스네어: 화이트 노이즈
          const bufSize = Math.floor(ctx.sampleRate * 0.12);
          const buf     = ctx.createBuffer(1, bufSize, ctx.sampleRate);
          const ch      = buf.getChannelData(0);
          for (let i = 0; i < bufSize; i++) ch[i] = Math.random() * 2 - 1;
          const src = ctx.createBufferSource();
          src.buffer = buf;
          const hp  = ctx.createBiquadFilter();
          hp.type   = 'highpass';
          hp.frequency.value = 1200;
          const e   = ctx.createGain();
          e.gain.setValueAtTime(0.28, bt);
          e.gain.exponentialRampToValueAtTime(0.001, bt + 0.12);
          src.connect(hp); hp.connect(e); e.connect(gainNode);
          src.start(bt); src.stop(bt + 0.14);
        }
      }

      // 루프
      const loopDuration = totalBeats * beat;
      const timer = ctx.createOscillator();
      timer.frequency.value = 0;
      timer.start(startT + loopDuration - 0.05);
      timer.stop(startT + loopDuration);
      timer.onended = () => {
        if (this._bgmSrc === timer) playLoop(startT + loopDuration);
      };
      this._bgmSrc = timer;
      timer.connect(ctx.destination);
    };

    playLoop(t);
  }
}

export const soundSystem = new SoundSystem();