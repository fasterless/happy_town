// 输入
//
// 两路输入汇成同一个意图：
//   held —— PC 上持续按住的方向键；
//   taps —— 点/触到达的屏幕坐标（手机点击到达、PC 鼠标点地都走这里）。
// 寻路与移动由 main.js 消费，这里只记录。

const KEY_DIRS = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
  W: [0, -1],
  S: [0, 1],
  A: [-1, 0],
  D: [1, 0],
};

export function createInput(canvas) {
  const held = new Set();
  const taps = [];

  const onKeyDown = (event) => {
    if (KEY_DIRS[event.key]) {
      held.add(event.key);
      event.preventDefault();
    }
  };
  const onKeyUp = (event) => held.delete(event.key);

  const onPointer = (event) => {
    if (event.target !== canvas) return;
    const rect = canvas.getBoundingClientRect();
    // 画布用 devicePixelRatio 放大，但绘制坐标是 CSS 像素，点击也用 CSS 像素。
    taps.push({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointerdown', onPointer);

  return {
    /** 当前按住的方向键，多个键同时按时取后按的（仅 PC 键盘） */
    direction() {
      let dir = null;
      for (const key of held) dir = KEY_DIRS[key];
      return dir;
    },
    /** 取走累计的点击 */
    consumeTaps() {
      return taps.splice(0, taps.length);
    },
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointerdown', onPointer);
    },
  };
}
