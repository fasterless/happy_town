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
};

class AudioManager {
  constructor() {
    this.enabled = true;
    this.volume = 0.7;
    this.ctx = null;
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
}

// 创建全局音效管理器实例
export const audioManager = new AudioManager();

/**
 * 用存档中的设置初始化音效
 * @param {Object} settings - state.settings
 */
export function initAudio(settings = {}) {
  audioManager.enabled = settings.soundEnabled !== false;
  audioManager.setVolume(typeof settings.volume === 'number' ? settings.volume : 0.7);
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
