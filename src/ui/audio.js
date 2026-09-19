// 音效管理系统
//
// 音效通过 WebAudio 实时合成，不依赖任何音频文件：
// 这类小游戏只需要几个短促的反馈音，合成比打包 mp3 更省事，
// 也避免了资源缺失导致的静默失败。

// 每个音效是一串音符：{ freq: 频率Hz, at: 起始秒, dur: 时长秒, type: 波形, gain: 音量系数 }
const SOUND_RECIPES = {
  // 种植：短促的低音「噗」
  plant: [
    { freq: 220, at: 0, dur: 0.12, type: 'sine', gain: 0.9 },
    { freq: 330, at: 0.05, dur: 0.1, type: 'sine', gain: 0.5 },
  ],
  // 收获：上行三音，清脆
  harvest: [
    { freq: 523, at: 0, dur: 0.09, type: 'triangle', gain: 0.8 },
    { freq: 659, at: 0.07, dur: 0.09, type: 'triangle', gain: 0.8 },
    { freq: 784, at: 0.14, dur: 0.14, type: 'triangle', gain: 0.8 },
  ],
  // 升级：更长的上行琶音
  levelup: [
    { freq: 523, at: 0, dur: 0.11, type: 'square', gain: 0.5 },
    { freq: 659, at: 0.1, dur: 0.11, type: 'square', gain: 0.5 },
    { freq: 784, at: 0.2, dur: 0.11, type: 'square', gain: 0.5 },
    { freq: 1047, at: 0.3, dur: 0.26, type: 'square', gain: 0.55 },
  ],
  // 成功：明亮的两音
  success: [
    { freq: 659, at: 0, dur: 0.1, type: 'sine', gain: 0.8 },
    { freq: 988, at: 0.09, dur: 0.18, type: 'sine', gain: 0.7 },
  ],
  // 金币：高频双击
  coin: [
    { freq: 1319, at: 0, dur: 0.06, type: 'triangle', gain: 0.6 },
    { freq: 1760, at: 0.05, dur: 0.1, type: 'triangle', gain: 0.5 },
  ],
  // 点击：极短的轻响
  click: [{ freq: 880, at: 0, dur: 0.04, type: 'sine', gain: 0.45 }],
  // 失败：下行两音
  error: [
    { freq: 311, at: 0, dur: 0.12, type: 'sawtooth', gain: 0.4 },
    { freq: 233, at: 0.1, dur: 0.18, type: 'sawtooth', gain: 0.4 },
  ],
  // 购买：确认感的落锤两音
  buy: [
    { freq: 392, at: 0, dur: 0.08, type: 'triangle', gain: 0.7 },
    { freq: 523, at: 0.07, dur: 0.12, type: 'triangle', gain: 0.6 },
  ],
  // 浇水：哗啦的滑音（频率从高滑到低）
  water: [
    { freq: 1200, at: 0, dur: 0.3, type: 'sine', gain: 0.35, slideTo: 500 },
  ],
  // 转盘：滚动的连续短音
  spin: [
    { freq: 660, at: 0, dur: 0.05, type: 'square', gain: 0.3 },
    { freq: 660, at: 0.08, dur: 0.05, type: 'square', gain: 0.3 },
    { freq: 660, at: 0.16, dur: 0.05, type: 'square', gain: 0.3 },
    { freq: 660, at: 0.24, dur: 0.05, type: 'square', gain: 0.3 },
    { freq: 880, at: 0.32, dur: 0.1, type: 'square', gain: 0.4 },
  ],
  // 钓鱼：先拨水花再上钩
  splash: [
    { freq: 900, at: 0, dur: 0.15, type: 'sine', gain: 0.5, slideTo: 300 },
    { freq: 523, at: 0.18, dur: 0.08, type: 'triangle', gain: 0.7 },
    { freq: 784, at: 0.26, dur: 0.12, type: 'triangle', gain: 0.6 },
  ],
  // 金穗：稀有的闪烁琶音
  gold: [
    { freq: 1047, at: 0, dur: 0.1, type: 'sine', gain: 0.7 },
    { freq: 1319, at: 0.09, dur: 0.1, type: 'sine', gain: 0.7 },
    { freq: 1568, at: 0.18, dur: 0.22, type: 'sine', gain: 0.7 },
  ],
};

class AudioManager {
  constructor() {
    this.enabled = true;
    this.musicEnabled = true;
    this.volume = 0.7;
    this.ctx = null;
    this.bgmTimer = null;
  }

  /**
   * 惰性创建 AudioContext
   *
   * 浏览器要求音频上下文在用户手势后才能启动，所以不在构造时创建，
   * 而是等到第一次真正要发声时。
   * @returns {AudioContext|null}
   */
  ensureContext() {
    if (this.ctx) {
      // 从自动挂起状态恢复（切后台再回来时会发生）
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) {
      return null;
    }

    try {
      this.ctx = new Ctor();
    } catch (error) {
      console.warn('WebAudio 不可用，音效已关闭', error);
      return null;
    }

    return this.ctx;
  }

  /**
   * 播放音效
   * @param {string} name - 音效名称
   */
  play(name) {
    if (!this.enabled || this.volume <= 0) return;

    const recipe = SOUND_RECIPES[name];
    if (!recipe) {
      console.warn(`Sound not found: ${name}`);
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx) return;

    const startAt = ctx.currentTime;

    recipe.forEach((note) => {
      const osc = ctx.createOscillator();
      const envelope = ctx.createGain();

      osc.type = note.type;
      osc.frequency.value = note.freq;
      if (note.slideTo) {
        // 滑音（浇水/水花用）：频率在音符时长内线性滑到目标值
        osc.frequency.linearRampToValueAtTime(note.slideTo, ctx.currentTime + note.at + note.dur);
      }

      const peak = this.volume * (note.gain ?? 0.6) * 0.3;
      const noteStart = startAt + note.at;
      const noteEnd = noteStart + note.dur;

      // 简单的 attack / decay 包络，避免爆音
      envelope.gain.setValueAtTime(0.0001, noteStart);
      envelope.gain.exponentialRampToValueAtTime(peak, noteStart + 0.01);
      envelope.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

      osc.connect(envelope);
      envelope.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteEnd + 0.02);
    });
  }

  /**
   * 设置音量
   * @param {number} volume - 音量 (0-1)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * 启用音效
   */
  enable() {
    this.enabled = true;
  }

  /**
   * 禁用音效
   */
  disable() {
    this.enabled = false;
  }

  /**
   * 切换音效开关
   * @returns {boolean} 切换后的状态
   */
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  /**
   * 检查音效是否启用
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled;
  }

  // ------------------------------------------------------------------
  // 背景音乐（BGM）：WebAudio 实时合成的舒缓循环，同样不依赖音频文件。
  // 白天（8-18点）大调琶音、夜晚（其余时间）小调低音，按现实时间切换。
  // ------------------------------------------------------------------

  startBgm() {
    this.stopBgm();
    if (!this.musicEnabled || this.volume <= 0) return;

    const ctx = this.ensureContext();
    if (!ctx) return;

    const hour = new Date().getHours();
    const daytime = hour >= 8 && hour < 18;

    // 白天：C 大调五声音阶琶音；夜晚：A 小调下行，音量更低
    const scaleDay = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
    const scaleNight = [220.0, 246.94, 261.63, 220.0, 196.0, 174.61];
    const scale = daytime ? scaleDay : scaleNight;
    const noteEvery = daytime ? 0.9 : 1.4; // 夜晚更慢
    const loopBars = 8;

    // 简易「随机但柔和」的琶音生成器：每 noteEvery 秒挑一个音，
    // 相邻音限制在 ±2 个档位内，听起来像有人随手拨弦
    let step = 0;
    let last = 2;

    const playNote = () => {
      if (!this.musicEnabled) return;
      const move = [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)];
      last = Math.max(0, Math.min(scale.length - 1, last + move));

      const osc = ctx.createOscillator();
      const envelope = ctx.createGain();
      const peak = this.volume * (daytime ? 0.05 : 0.035);

      osc.type = 'sine';
      osc.frequency.value = scale[last];

      const t = ctx.currentTime;
      envelope.gain.setValueAtTime(0.0001, t);
      envelope.gain.exponentialRampToValueAtTime(peak, t + 0.08);
      envelope.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);

      osc.connect(envelope);
      envelope.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.7);

      step++;
      if (step >= loopBars * scale.length) step = 0;
    };

    playNote();
    this.bgmTimer = setInterval(playNote, noteEvery * 1000);
  }

  stopBgm() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (enabled) {
      this.startBgm();
    } else {
      this.stopBgm();
    }
  }
}

// 创建全局音效管理器实例
export const audioManager = new AudioManager();

/**
 * 用存档中的设置初始化音效
 * @param {Object} settings - state.settings
 */
export function initAudio(settings = {}) {
  audioManager.enabled = settings.soundEnabled !== false;
  audioManager.musicEnabled = settings.musicEnabled !== false;
  audioManager.setVolume(typeof settings.volume === 'number' ? settings.volume : 0.7);

  // BGM 需要用户手势后才能出声（浏览器自动播放策略），挂到首次点击
  const startOnce = () => {
    audioManager.startBgm();
    document.removeEventListener('pointerdown', startOnce);
    document.removeEventListener('keydown', startOnce);
  };
  document.addEventListener('pointerdown', startOnce, { once: false });
  document.addEventListener('keydown', startOnce, { once: false });
}

export function toggleMusic() {
  audioManager.setMusicEnabled(!audioManager.musicEnabled);
  return audioManager.musicEnabled;
}

export function isMusicEnabled() {
  return audioManager.musicEnabled;
}

// 便捷方法
export function playSound(name) {
  audioManager.play(name);
}

export function setSoundVolume(volume) {
  audioManager.setVolume(volume);
}

export function toggleSound() {
  return audioManager.toggle();
}

export function isSoundEnabled() {
  return audioManager.isEnabled();
}
