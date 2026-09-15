// 新手引导系统
let currentStep = 0;
let tutorialActive = false;

// 引导步骤配置
const tutorialSteps = [
  {
    id: "welcome",
    title: "欢迎来到邻里小镇！",
    content: "这是一个温馨的农场经营游戏。让我带你熟悉一下基本操作吧！",
    target: null,
    position: "center",
  },
  {
    id: "farm",
    title: "种植你的第一块作物",
    content: "点击农田上的「种植」按钮，选择小麦开始种植。",
    target: "#farmGrid",
    position: "bottom",
    condition: () => document.querySelector("#farmGrid .plot.empty"),
  },
  {
    id: "wait",
    title: "等待作物成熟",
    content: "小麦需要30秒成熟。你可以继续探索其他功能，成熟后会显示「可收获」。",
    target: "#farmGrid",
    position: "bottom",
    skipDelay: 3000,
  },
  {
    id: "harvest",
    title: "收获作物",
    content: "作物成熟了！点击「收获」按钮获得作物和经验。",
    target: "#farmGrid .plot.mature",
    position: "bottom",
    condition: () => document.querySelector("#farmGrid .plot.mature"),
  },
  {
    id: "order",
    title: "完成订单赚取金币",
    content: "切换到「📋 订单」页面，用收获的作物完成订单获得金币和经验。",
    target: "[data-view='ordersView']",
    position: "top",
  },
  {
    id: "explore",
    title: "探索更多功能",
    content: "你已经掌握了基本操作！现在可以自由探索家园装饰、好友互动、社区建设等功能了。",
    target: null,
    position: "center",
  },
];

/**
 * 启动新手引导
 * @param {Object} state - 游戏状态
 */
export function startTutorial(state) {
  if (state.settings.tutorialCompleted) {
    return;
  }

  tutorialActive = true;
  currentStep = 0;
  showTutorialStep(currentStep);
}

/**
 * 显示引导步骤
 * @param {number} stepIndex - 步骤索引
 */
function showTutorialStep(stepIndex) {
  if (stepIndex >= tutorialSteps.length) {
    completeTutorial();
    return;
  }

  const step = tutorialSteps[stepIndex];

  // 检查条件
  if (step.condition && !step.condition()) {
    // 条件不满足，等待一段时间后再检查
    setTimeout(() => showTutorialStep(stepIndex), 1000);
    return;
  }

  // 创建遮罩层
  createTutorialOverlay(step, stepIndex);

  // 高亮目标元素
  if (step.target) {
    highlightElement(step.target);
  }
}

/**
 * 创建引导遮罩层
 * @param {Object} step - 引导步骤
 * @param {number} stepIndex - 当前步骤索引，用于自动跳过时确认没有被手动翻页
 */
function createTutorialOverlay(step, stepIndex) {
  // 移除旧的遮罩
  removeTutorialOverlay();

  // 创建遮罩层
  const overlay = document.createElement("div");
  overlay.id = "tutorialOverlay";
  overlay.className = "tutorial-overlay";

  // 创建提示框
  const tooltip = document.createElement("div");
  tooltip.className = `tutorial-tooltip ${step.position}`;
  tooltip.innerHTML = `
    <div class="tutorial-header">
      <h3>${step.title}</h3>
      <button class="tutorial-skip" onclick="window.skipTutorial()">跳过</button>
    </div>
    <div class="tutorial-content">${step.content}</div>
    <div class="tutorial-footer">
      <span class="tutorial-progress">${currentStep + 1}/${tutorialSteps.length}</span>
      <button class="tutorial-next" onclick="window.nextTutorialStep()">
        ${currentStep === tutorialSteps.length - 1 ? "完成" : "下一步"}
      </button>
    </div>
  `;

  overlay.appendChild(tooltip);
  document.body.appendChild(overlay);

  // 自动跳过（如果设置了延迟）
  if (step.skipDelay) {
    setTimeout(() => {
      if (tutorialActive && currentStep === stepIndex) {
        nextTutorialStep();
      }
    }, step.skipDelay);
  }
}

/**
 * 高亮目标元素
 * @param {string} selector - CSS 选择器
 */
function highlightElement(selector) {
  const element = document.querySelector(selector);
  if (!element) return;

  // 创建聚光灯
  const spotlight = document.createElement("div");
  spotlight.className = "tutorial-spotlight";

  const rect = element.getBoundingClientRect();
  spotlight.style.top = `${rect.top - 10}px`;
  spotlight.style.left = `${rect.left - 10}px`;
  spotlight.style.width = `${rect.width + 20}px`;
  spotlight.style.height = `${rect.height + 20}px`;

  document.body.appendChild(spotlight);
}

/**
 * 移除引导遮罩
 */
function removeTutorialOverlay() {
  const overlay = document.getElementById("tutorialOverlay");
  if (overlay) {
    overlay.remove();
  }

  const spotlight = document.querySelector(".tutorial-spotlight");
  if (spotlight) {
    spotlight.remove();
  }
}

/**
 * 下一步
 */
export function nextTutorialStep() {
  currentStep++;
  showTutorialStep(currentStep);
}

/**
 * 跳过引导
 */
export function skipTutorial() {
  tutorialActive = false;
  removeTutorialOverlay();
  completeTutorial();
}

/**
 * 完成引导
 */
function completeTutorial() {
  tutorialActive = false;
  removeTutorialOverlay();

  // 标记完成（需要在调用处更新 state）
  const event = new CustomEvent("tutorialCompleted");
  document.dispatchEvent(event);
}

/**
 * 检查是否需要启动引导
 * @param {Object} state - 游戏状态
 * @returns {boolean} 是否需要启动
 */
export function shouldStartTutorial(state) {
  return state.user.created && !state.settings.tutorialCompleted;
}

// 导出到全局（供 HTML onclick 使用）
if (typeof window !== "undefined") {
  window.nextTutorialStep = nextTutorialStep;
  window.skipTutorial = skipTutorial;
}
