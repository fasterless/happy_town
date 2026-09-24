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

  // ---- 手机方向滑杆 ----
  // 按住底盘拖动，把手跟随；换算成一个离散的四方向，交给 main.js 当作
  // 「持续按住的方向键」使用，人物据此走动并转向。
  const stick = typeof document !== 'undefined' ? document.getElementById('joystick') : null;
  const knob = typeof document !== 'undefined' ? document.getElementById('joyKnob') : null;
  const STICK_MAX = 40; // 把手能偏离中心的最大像素
  const STICK_DEAD = 14; // 死区：偏移太小不算方向
  let stickVec = null; // 当前离散方向 [dx, dy] 或 null
  let stickId = null; // 正在操控滑杆的指针 id

  const setKnob = (px, py) => {
    if (knob) knob.style.transform = `translate(${px}px, ${py}px)`;
  };

  const updateStick = (event) => {
    if (!stick) return;
    const rect = stick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const mag = Math.hypot(dx, dy);
    const clamped = Math.min(STICK_MAX, mag);
    setKnob(mag ? (dx / mag) * clamped : 0, mag ? (dy / mag) * clamped : 0);
    stickVec = mag < STICK_DEAD
      ? null
      : (Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);
  };

  const onStickDown = (event) => {
    stickId = event.pointerId;
    if (stick.setPointerCapture) stick.setPointerCapture(event.pointerId);
    updateStick(event);
    event.preventDefault();
  };
  const onStickMove = (event) => {
    if (event.pointerId !== stickId) return;
    updateStick(event);
    event.preventDefault();
  };
  const onStickUp = (event) => {
    if (event.pointerId !== stickId) return;
    stickId = null;
    stickVec = null;
    setKnob(0, 0);
  };

  if (stick) {
    stick.addEventListener('pointerdown', onStickDown);
    stick.addEventListener('pointermove', onStickMove);
    stick.addEventListener('pointerup', onStickUp);
    stick.addEventListener('pointercancel', onStickUp);
  }

  return {
    /** 当前按住的方向键，多个键同时按时取后按的（仅 PC 键盘） */
    direction() {
      let dir = null;
      for (const key of held) dir = KEY_DIRS[key];
      return dir;
    },
    /** 手机滑杆当前指向的离散方向 [dx, dy]，没在推时为 null */
    stickDir() {
      return stickVec;
    },
    /** 取走累计的点击 */
    consumeTaps() {
      return taps.splice(0, taps.length);
    },
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointerdown', onPointer);
      if (stick) {
        stick.removeEventListener('pointerdown', onStickDown);
        stick.removeEventListener('pointermove', onStickMove);
        stick.removeEventListener('pointerup', onStickUp);
        stick.removeEventListener('pointercancel', onStickUp);
      }
    },
  };
}
