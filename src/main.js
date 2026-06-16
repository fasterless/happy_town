// 主入口文件 - 模块化版本
import { loadState, saveState, debouncedSave } from './core/storage.js';
import { createDefaultState } from './core/state.js';
import { emit, on, Events } from './core/events.js';

// 导入配置
import { crops } from './config/crops.js';
import { orders } from './config/orders.js';
import { furniture } from './config/furniture.js';
import { levels } from './config/levels.js';
import { shopGoods } from './config/shop.js';
import { dailyTasks, activeBoxes } from './config/tasks.js';
import { defaultFriends, fountainStages } from './config/npcs.js';
import { avatars, STORAGE_KEY } from './config/constants.js';

// 导入系统模块
import * as FarmSystem from './systems/farm.js';
import * as OrdersSystem from './systems/orders.js';
import * as HomeSystem from './systems/home.js';
import * as FriendsSystem from './systems/friends.js';
import * as CommunitySystem from './systems/community.js';
import * as ShopSystem from './systems/shop.js';
import * as TasksSystem from './systems/tasks.js';
import * as AchievementsSystem from './systems/achievements.js';
import * as PetsSystem from './systems/pets.js';
import * as WeatherSystem from './systems/weather.js';

// 导入工具函数
import { formatTime, todayKey } from './utils/time.js';
import { formatRewards, moneyLabel, itemKey, furnitureKey, getItemName, getItemIcon } from './utils/format.js';
import { logEvent, trackDaily, isTaskComplete, getTaskProgress } from './utils/analytics.js';

// 全局状态
let state;
let selectedCropId = 1001;
let selectedAvatar = avatars[0];
let toastTimer = null;
let clockTimer = null;

// DOM 选择器简写
const $ = (id) => document.getElementById(id);

/**
 * 初始化游戏
 */
function init() {
  console.log("🎮 邻里小镇 v2.0 - 模块化版本");
  console.log("📦 加载游戏状态...");

  // 加载状态
  state = loadState();

  // 更新天气
  WeatherSystem.updateDailyWeather(state);

  // 显示创建角色界面或游戏界面
  if (!state.user.created) {
    showRoleModal();
  } else {
    hideRoleModal();
    attachEvents();
    renderAll();
    startClock();
  }

  console.log("✅ 游戏初始化完成");
}

/**
 * 绑定事件监听器
 */
function attachEvents() {
  // 导航事件
  document.querySelectorAll(".nav-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const viewId = btn.dataset.view;
      showView(viewId);
    });
  });

  // 通用操作按钮
  $("collectAllButton")?.addEventListener("click", collectAllMature);
  $("clearRoomButton")?.addEventListener("click", clearRoom);
  $("saveRoomButton")?.addEventListener("click", saveRoom);
  $("resetDailyButton")?.addEventListener("click", resetDaily);
  $("testRewardButton")?.addEventListener("click", giveTestRewards);
}

/**
 * 切换视图
 */
function showView(viewId) {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.remove("active-view");
  });

  const targetView = $(viewId);
  if (targetView) {
    targetView.classList.add("active-view");
  }

  // 渲染当前视图
  renderAll();
}

/**
 * 显示创建角色模态框
 */
function showRoleModal() {
  const modal = $("roleModal");
  if (modal) {
    modal.classList.add("show");
    renderAvatarChoices();
  }
}

/**
 * 隐藏创建角色模态框
 */
function hideRoleModal() {
  const modal = $("roleModal");
  if (modal) {
    modal.classList.remove("show");
  }
}

/**
 * 渲染头像选择
 */
function renderAvatarChoices() {
  const container = $("avatarChoices");
  if (!container) return;

  container.innerHTML = avatars
    .map(
      (av) =>
        `<span class="avatar-choice ${av === selectedAvatar ? "selected" : ""}" data-avatar="${av}">${av}</span>`
    )
    .join("");

  container.querySelectorAll(".avatar-choice").forEach((choice) => {
    choice.addEventListener("click", () => {
      selectedAvatar = choice.dataset.avatar;
      renderAvatarChoices();
    });
  });
}

/**
 * 创建角色
 */
function createRole() {
  const nicknameInput = $("nicknameInput");
  const nickname = nicknameInput?.value.trim();

  if (!nickname || nickname.length < 2 || nickname.length > 12) {
    showToast("昵称需要2-12个字符");
    return;
  }

  state.user.nickname = nickname;
  state.user.avatar = selectedAvatar;
  state.user.created = true;

  hideRoleModal();
  attachEvents();
  renderAll();
  startClock();
  saveState(state);

  showToast(`欢迎来到邻里小镇，${nickname}！`);
}

// 将createRole绑定到全局
window.createRole = createRole;

/**
 * 显示提示消息
 */
function showToast(message, type = "info") {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2300);
}

/**
 * 启动定时器
 */
function startClock() {
  clockTimer = setInterval(() => {
    renderFarm();
    renderNotice();
  }, 1000);
}

/**
 * 渲染所有界面
 */
function renderAll() {
  renderTopbar();
  renderNotice();
  renderMiniInventory();
  renderFarm();
  renderOrders();
  renderHome();
  renderFriends();
  renderCommunity();
  renderShop();
  renderTasks();
  renderAdmin();

  // 防抖保存
  debouncedSave(state);
}

/**
 * 渲染顶部栏
 */
function renderTopbar() {
  const topbar = $("topbar");
  if (!topbar) return;

  const { user, wallet } = state;
  const expProgress = ((wallet.exp / (wallet.exp + 100)) * 100).toFixed(1);

  topbar.innerHTML = `
    <div class="player-info">
      <span class="player-avatar">${user.avatar}</span>
      <span class="player-name">${user.nickname}</span>
      <span class="player-level">Lv.${wallet.level}</span>
    </div>
    <div class="wallet">
      <span class="wallet-item">🪙 ${wallet.coin}</span>
      <span class="wallet-item">💎 ${wallet.diamond}</span>
      <span class="wallet-item">🤝 ${wallet.friendPoint}</span>
    </div>
    <div class="exp-track">
      <span style="width: ${expProgress}%"></span>
    </div>
  `;
}

/**
 * 渲染提示信息
 */
function renderNotice() {
  const notice = $("notice");
  if (!notice) return;

  const level = state.wallet.level;
  let text = "🌾 欢迎来到邻里小镇";

  if (level < 5) {
    text = "💡 Lv.5解锁好友拜访完整功能";
  } else if (level < 7) {
    text = "💡 Lv.7解锁每日任务系统";
  } else if (level < 10) {
    text = "💡 Lv.10解锁社区系统";
  } else if (level < 13) {
    text = "💡 Lv.13解锁宠物系统";
  }

  // 显示天气
  const weather = WeatherSystem.getCurrentWeather(state);
  text += ` | 今日天气：${weather.icon}${weather.name}`;

  notice.textContent = text;
}

/**
 * 渲染小背包
 */
function renderMiniInventory() {
  // 简化版本，后续完善
}

/**
 * 渲染农场
 */
function renderFarm() {
  // 使用 FarmSystem 模块
  const farmGrid = $("farmGrid");
  if (!farmGrid) return;

  farmGrid.innerHTML = state.farm.plots
    .map((plot, index) => {
      if (!plot) {
        return `<div class="plot empty">
          <button onclick="window.plantCropHandler(${index})">种植</button>
        </div>`;
      }

      const isMature = FarmSystem.isPlotMature(plot);
      const remaining = FarmSystem.getRemainingSeconds(plot);
      const stage = FarmSystem.getCropGrowthStage(plot);
      const stageIcon = FarmSystem.getStageIcon(stage);

      return `<div class="plot ${isMature ? 'mature' : 'growing'}">
        <div class="crop-icon">${stageIcon}</div>
        <div class="crop-status">${isMature ? "可收获" : formatTime(remaining)}</div>
        ${isMature ? `<button onclick="window.harvestCropHandler(${index})">收获</button>` : ""}
      </div>`;
    })
    .join("");
}

// 导出操作函数到全局（供 HTML onclick 使用）
window.plantCropHandler = (index) => {
  const result = FarmSystem.plantCrop(state, index, selectedCropId);
  showToast(result.message, result.success ? "success" : "error");
  if (result.success) renderAll();
};

window.harvestCropHandler = (index) => {
  const result = FarmSystem.harvestCrop(state, index);
  showToast(result.message, result.success ? "success" : "error");
  if (result.success) {
    AchievementsSystem.checkAchievements(state);
    renderAll();
  }
};

function collectAllMature() {
  const result = FarmSystem.harvestAllMature(state);
  showToast(result.message, result.success ? "success" : "error");
  if (result.success) {
    AchievementsSystem.checkAchievements(state);
    renderAll();
  }
}

/**
 * 渲染订单
 */
function renderOrders() {
  // 简化版本，后续完善
}

/**
 * 渲染家园
 */
function renderHome() {
  // 简化版本，后续完善
}

/**
 * 渲染好友
 */
function renderFriends() {
  // 简化版本，后续完善
}

/**
 * 渲染社区
 */
function renderCommunity() {
  // 简化版本，后续完善
}

/**
 * 渲染商城
 */
function renderShop() {
  // 简化版本，后续完善
}

/**
 * 渲染任务
 */
function renderTasks() {
  // 简化版本，后续完善
}

/**
 * 渲染后台
 */
function renderAdmin() {
  // 简化版本，后续完善
}

/**
 * 清空房间
 */
function clearRoom() {
  const result = HomeSystem.clearRoom(state);
  showToast(result.message, result.success ? "success" : "error");
  if (result.success) renderAll();
}

/**
 * 保存房间
 */
function saveRoom() {
  const result = HomeSystem.saveRoom(state);
  showToast(result.message, result.success ? "success" : "error");
  if (result.success) renderAll();
}

/**
 * 重置每日任务
 */
function resetDaily() {
  const result = TasksSystem.resetDaily(state);
  showToast(result.message);
  renderAll();
}

/**
 * 发放测试奖励
 */
function giveTestRewards() {
  const { addRewards } = require('./core/inventory.js');
  addRewards(state, {
    coin: 3000,
    diamond: 300,
    wood: 100,
    stone: 100,
    cloth: 100,
  });
  showToast("已发放测试补偿");
  renderAll();
}

// 页面加载完成后初始化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// 导出给控制台调试使用
window.gameState = () => state;
window.saveGame = () => saveState(state);
