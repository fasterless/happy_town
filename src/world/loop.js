// 游戏循环
//
// 固定时间步推进模拟，渲染按实际帧率走。
// update(dtMs) 由外部给出，循环本身不碰玩法。

const STEP_MS = 1000 / 30;
const MAX_STEPS = 5;

export function startLoop(update, render) {
  let last = performance.now();
  let acc = 0;
  let running = true;

  function frame(now) {
    if (!running) return;
    acc += Math.min(now - last, 1000);
    last = now;
    let steps = 0;
    while (acc >= STEP_MS && steps < MAX_STEPS) {
      update(STEP_MS);
      acc -= STEP_MS;
      steps += 1;
    }
    render();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
  return () => {
    running = false;
  };
}
