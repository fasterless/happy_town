// 音效管理系统

class AudioManager {
  constructor() {
    this.sounds = {};
    this.enabled = true;
    this.volume = 0.7;
    this.loadSounds();
  }

  /**
   * 加载音效文件
   */
  loadSounds() {
    const soundFiles = {
      plant: 'assets/sounds/pop.mp3',
      harvest: 'assets/sounds/collect.mp3',
      levelup: 'assets/sounds/levelup.mp3',
      success: 'assets/sounds/success.mp3',
      coin: 'assets/sounds/coin.mp3',
      click: 'assets/sounds/click.mp3',
    };

    for (const [name, path] of Object.entries(soundFiles)) {
      const audio = new Audio();
      audio.src = path;
      audio.volume = this.volume;
      audio.preload = 'auto';

      // 监听加载错误（音效文件可能不存在）
      audio.addEventListener('error', () => {
        console.warn(`Failed to load sound: ${path}`);
      });

      this.sounds[name] = audio;
    }
  }

  /**
   * 播放音效
   * @param {string} name - 音效名称
   */
  play(name) {
    if (!this.enabled) return;

    const sound = this.sounds[name];
    if (!sound) {
      console.warn(`Sound not found: ${name}`);
      return;
    }

    // 克隆音频以支持快速连续播放
    const clone = sound.cloneNode();
    clone.volume = this.volume;
    clone.play().catch(err => {
      console.warn('Failed to play sound:', err);
    });
  }

  /**
   * 设置音量
   * @param {number} volume - 音量 (0-1)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    Object.values(this.sounds).forEach(sound => {
      sound.volume = this.volume;
    });
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
