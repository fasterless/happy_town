// 统一渲染器模块
import { crops, getCrop } from '../config/crops.js';
import { orders, getOrder } from '../config/orders.js';
import { furniture, getFurniture } from '../config/furniture.js';
import { dailyTasks, activeBoxes } from '../config/tasks.js';
import { shopGoods } from '../config/shop.js';
import { achievements, getAchievementProgressPercent } from '../systems/achievements.js';
import { formatTime } from '../utils/time.js';
import { formatRewards, moneyLabel, itemKey, furnitureKey, getItemName, getItemIcon } from '../utils/format.js';
import { getTaskProgress, isTaskComplete, getAnalytics } from '../utils/analytics.js';
import { getLevelFromExp, getNextLevelInfo } from '../config/levels.js';
import * as FarmSystem from '../systems/farm.js';
import * as OrdersSystem from '../systems/orders.js';
import * as HomeSystem from '../systems/home.js';
import * as WeatherSystem from '../systems/weather.js';
import { createProgressBar, createListItem, createBadge } from './components.js';

/**
 * 渲染顶部栏
 * @param {Object} state - 游戏状态
 * @returns {string} HTML字符串
 */
export function renderTopbar(state) {
  const { user, wallet } = state;
  const nextLevel = getNextLevelInfo(wallet.level);
  const expProgress = nextLevel
    ? ((wallet.exp / nextLevel.needExp) * 100).toFixed(1)
    : 100;

  return `
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
      <small>${wallet.exp}/${nextLevel ? nextLevel.needExp : wallet.exp}</small>
    </div>
  `;
}

/**
 * 渲染提示信息
 * @param {Object} state - 游戏状态
 * @returns {string} HTML字符串
 */
export function renderNotice(state) {
  const level = state.wallet.level;
  let text = "🌾 欢迎来到邻里小镇";

  if (level < 5) {
    text = "💡 Lv.5解锁好友拜访完整功能";
  } else if (level < 7) {
    text = "💡 Lv.7解锁每日任务系统";
  } else if (level < 10) {
    text = "💡 Lv.10解锁社区系统";
  } else if (level < 11) {
    text = "💡 Lv.11解锁成就系统";
  } else if (level < 13) {
    text = "💡 Lv.13解锁宠物系统";
  }

  // 显示天气
  const weather = WeatherSystem.getCurrentWeather(state);
  text += ` | 今日天气：${weather.icon}${weather.name}`;

  return text;
}

/**
 * 渲染农场视图
 * @param {Object} state - 游戏状态
 * @param {number} selectedCropId - 选中的作物ID
 * @returns {Object} { grid, seeds }
 */
export function renderFarmView(state, selectedCropId) {
  // 渲染农田
  const grid = state.farm.plots
    .map((plot, index) => {
      if (!plot) {
        return `<div class="plot empty">
          <button onclick="window.plantCropHandler(${index})">种植</button>
        </div>`;
      }

      const crop = getCrop(plot.cropId);
      const isMature = FarmSystem.isPlotMature(plot);
      const remaining = FarmSystem.getRemainingSeconds(plot);
      const stage = FarmSystem.getCropGrowthStage(plot);
      const stageIcon = FarmSystem.getStageIcon(stage);

      return `<div class="plot ${isMature ? 'mature' : 'growing'}">
        <div class="crop-icon">${crop ? crop.icon : stageIcon}</div>
        <div class="crop-status">${isMature ? "✨可收获" : formatTime(remaining)}</div>
        ${isMature ? `<button onclick="window.harvestCropHandler(${index})">收获</button>` : ""}
      </div>`;
    })
    .join("");

  // 渲染种子列表
  const seeds = crops
    .map(crop => {
      const unlocked = state.wallet.level >= crop.unlockLevel;
      const selected = crop.id === selectedCropId;

      return `<div class="seed-item ${selected ? 'selected' : ''} ${!unlocked ? 'locked' : ''}"
        onclick="${unlocked ? `window.selectCropHandler(${crop.id})` : ''}">
        <span class="seed-icon">${crop.icon}</span>
        <span class="seed-name">${crop.name}</span>
        <span class="seed-price">🪙${crop.seedPrice}</span>
        ${!unlocked ? `<span class="seed-lock">Lv.${crop.unlockLevel}</span>` : ''}
      </div>`;
    })
    .join("");

  return { grid, seeds };
}

/**
 * 渲染订单视图
 * @param {Object} state - 游戏状态
 * @returns {string} HTML字符串
 */
export function renderOrdersView(state) {
  return state.orders.activeIds
    .map((orderId, index) => {
      const order = getOrder(orderId);
      if (!order) return "";

      const canComplete = OrdersSystem.canCompleteOrder(state, orderId);
      const requiresHtml = order.requires
        .map(req => {
          const has = state.inventory[req.item] || 0;
          const need = req.count;
          const cropId = Number(req.item.replace("crop_", ""));
          const crop = getCrop(cropId);
          const enough = has >= need;

          return `<span class="${enough ? 'enough' : 'not-enough'}">
            ${crop ? crop.icon : "📦"} ${has}/${need}
          </span>`;
        })
        .join(" ");

      return `<div class="order-card">
        <div class="order-header">
          <h4>${order.name}</h4>
          <span class="order-type ${order.type}">${order.type}</span>
        </div>
        <div class="order-requires">${requiresHtml}</div>
        <div class="order-rewards">
          奖励：🪙${order.coin} 经验+${order.exp}
        </div>
        <div class="order-actions">
          <button onclick="window.completeOrderHandler(${index})" ${!canComplete ? 'disabled' : ''}>
            提交
          </button>
          <button class="ghost-action" onclick="window.refreshOrderHandler(${index})">
            刷新
          </button>
        </div>
      </div>`;
    })
    .join("");
}

/**
 * 渲染家园视图
 * @param {Object} state - 游戏状态
 * @returns {Object} { layout, furniture, score }
 */
export function renderHomeView(state) {
  // 渲染房间布局
  const layout = state.home.layout
    .map((item, index) => {
      if (!item) {
        return `<div class="room-cell empty" data-index="${index}"></div>`;
      }

      const fur = getFurniture(item.id);
      return `<div class="room-cell occupied" data-index="${index}">
        <span class="furniture-icon ${item.rotated ? 'rotated' : ''}">${fur ? fur.icon : "📦"}</span>
        <div class="furniture-actions">
          <button onclick="window.rotateFurnitureHandler(${index})">↻</button>
          <button onclick="window.removeFurnitureHandler(${index})">✕</button>
        </div>
      </div>`;
    })
    .join("");

  // 渲染家具列表
  const furnitureList = furniture
    .map(fur => {
      const unlocked = state.wallet.level >= fur.unlockLevel;
      const inBag = state.inventory[furnitureKey(fur.id)] || 0;

      return `<div class="furniture-item ${!unlocked ? 'locked' : ''}">
        <span class="furniture-icon">${fur.icon}</span>
        <div class="furniture-info">
          <h5>${fur.name}</h5>
          <p>${moneyLabel(fur.priceType, fur.price)}</p>
        </div>
        <div class="furniture-count">拥有: ${inBag}</div>
        <button onclick="window.buyFurnitureHandler(${fur.id})" ${!unlocked ? 'disabled' : ''}>
          ${unlocked ? '购买' : `Lv.${fur.unlockLevel}`}
        </button>
      </div>`;
    })
    .join("");

  // 计算装饰评分
  const scoreData = HomeSystem.calculateRoomScore(state);
  const score = `
    <div class="room-score">
      <h3>装饰评分: ${scoreData.grade} 级</h3>
      <p>总分: ${scoreData.score}</p>
      <div class="score-details">
        ${scoreData.details.map(d => `<p class="score-detail">• ${d}</p>`).join('')}
      </div>
    </div>
  `;

  return { layout, furniture: furnitureList, score };
}

/**
 * 渲染任务视图
 * @param {Object} state - 游戏状态
 * @returns {Object} { tasks, boxes, activeScore }
 */
export function renderTasksView(state) {
  // 渲染任务列表
  const tasks = dailyTasks
    .map(task => {
      const progress = state.daily.progress[task.type] || 0;
      const complete = isTaskComplete(state, task);
      const claimed = state.daily.claimedTasks[task.id];
      const progressPercent = getTaskProgress(state, task);

      return `<div class="task-item ${complete ? 'complete' : ''} ${claimed ? 'claimed' : ''}">
        <div class="task-info">
          <h4>${task.name}</h4>
          <p>${progress}/${task.target}</p>
        </div>
        ${createProgressBar(progressPercent)}
        <div class="task-reward">${formatRewards(task.rewards)}</div>
        <button onclick="window.claimTaskHandler('${task.id}')"
          ${!complete || claimed ? 'disabled' : ''}>
          ${claimed ? '已领取' : '领取'}
        </button>
      </div>`;
    })
    .join("");

  // 渲染宝箱
  const boxes = activeBoxes
    .map(box => {
      const canClaim = state.daily.activeScore >= box.score;
      const claimed = state.daily.claimedBoxes[box.score];

      return `<div class="active-box ${canClaim ? 'can-claim' : ''} ${claimed ? 'claimed' : ''}">
        <div class="box-icon">📦</div>
        <div class="box-score">${box.score}分</div>
        <div class="box-reward">${formatRewards(box.rewards)}</div>
        <button onclick="window.claimBoxHandler(${box.score})"
          ${!canClaim || claimed ? 'disabled' : ''}>
          ${claimed ? '已领取' : '领取'}
        </button>
      </div>`;
    })
    .join("");

  return {
    tasks,
    boxes,
    activeScore: state.daily.activeScore,
  };
}

/**
 * 渲染成就视图
 * @param {Object} state - 游戏状态
 * @returns {string} HTML字符串
 */
export function renderAchievementsView(state) {
  return achievements
    .map(achievement => {
      const unlocked = state.achievements.unlocked.includes(achievement.id);
      const progress = state.achievements.progress[achievement.id] || 0;
      const progressPercent = getAchievementProgressPercent(state, achievement.id);

      return `<div class="achievement-item ${unlocked ? 'unlocked' : ''}">
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-info">
          <h4>${achievement.name}</h4>
          <p>${achievement.desc}</p>
          ${!unlocked ? `<div class="achievement-progress">${progress}/${achievement.target}</div>` : ''}
          ${!unlocked ? createProgressBar(progressPercent) : '<span class="achievement-badge">✅ 已完成</span>'}
        </div>
        <div class="achievement-reward">
          ${formatRewards(achievement.rewards)}
        </div>
      </div>`;
    })
    .join("");
}
