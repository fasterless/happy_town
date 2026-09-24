// 音效
//
// 四个短音，用 WebAudio 现合成，不加载音频文件。
// 浏览器要求用户有过一次操作才允许出声，所以首次调用前是静音的。

const RECIPES = {
  plant: [220, 330],
  harvest: [523, 784],
  coin: [1319, 1760],
  click: [880],
};

let context = null;

function ctx() {
  if (context) return context;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  context = new AudioCtx();
  return context;
}

export function playTone(name) {
  const notes = RECIPES[name];
  const audio = ctx();
  if (!notes || !audio) return;
  notes.forEach((freq, i) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = freq;
    osc.type = 'triangle';
    gain.gain.setValueAtTime(0.15, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(audio.currentTime + i * 0.07);
    osc.stop(audio.currentTime + 0.2 + i * 0.07);
  });
}
