// 统一渲染器模块
//
// 这里的函数都是纯函数：接收 state，返回 HTML 字符串（或字符串组成的对象），
// 由 main.js 负责写入 DOM。这样渲染逻辑可以脱离浏览器单独测试。
import { crops, getCrop } from '../config/crops.js';
import { orders, getOrder } from '../config/orders.js';
import { furniture, getFurniture } from '../config/furniture.js';
import { dailyTasks, activeBoxes } from '../config/tasks.js';
import { shopGoods } from '../config/shop.js';
import { fountainStages } from '../config/npcs.js';
import { getNextLevelInfo, levels } from '../config/levels.js';
import { getSeasonalCrops, getSeasonalFurniture } from '../config/seasons.js';
import { achievements, getAchievementProgressPercent, getAchievementStats } from '../systems/achievements.js';
import { pets } from '../config/pets.js';
import { getActivePetBuff, hasFedToday } from '../systems/pets.js';
import { formatTime, todayKey } from '../utils/time.js';
import { GAME_CONFIG } from '../config/constants.js';
import {
  formatRewards,
  moneyLabel,
  furnitureKey,
  getItemName,
  getItemIcon,
  formatNumber,
  escapeHtml,
} from '../utils/format.js';
import { getTaskProgress, isTaskComplete, getAnalytics } from '../utils/analytics.js';
import { getCount, getInventoryItems } from '../core/inventory.js';
import * as FarmSystem from '../systems/farm.js';
import * as OrdersSystem from '../systems/orders.js';
import * as HomeSystem from '../systems/home.js';
import * as FriendsSystem from '../systems/friends.js';
import * as CommunitySystem from '../systems/community.js';
import * as ShopSystem from '../systems/shop.js';
import * as WeatherSystem from '../systems/weather.js';
import * as CraftingSystem from '../systems/crafting.js';
import * as FishingSystem from '../systems/fishing.js';
import * as LotterySystem from '../systems/lottery.js';
import * as SeasonsSystem from '../systems/seasons.js';
import * as RanchSystem from '../systems/ranch.js';
import * as CodexSystem from '../systems/codex.js';
import { craftingRecipes } from '../config/crafting.js';
import { createProgressBar } from './components.js';

/**
 * 渲染顶部栏
 * @param {Object} state - 游戏状态
 * @returns {string} HTML字符串
 */
export function renderTopbar(state) {
  const { user, wallet } = state;
  const nextLevel = getNextLevelInfo(wallet.level);
  const currentLevel = levels.find(lv => lv.level === wallet.level);

  // 经验条画的是「本级已走完多少」，而不是总经验占下一级门槛的比例
  const base = currentLevel ? currentLevel.needExp : 0;
  const span = nextLevel ? nextLevel.needExp - base : 0;
  const expProgress = span > 0 ? Math.min(100, ((wallet.exp - base) / span) * 100).toFixed(1) : 100;

  return `
    <div class="player-info">
      <span class="player-avatar">${escapeHtml(user.avatar)}</span>
      <span class="player-name">${escapeHtml(user.nickname)}</span>
      <span class="player-level">Lv.${wallet.level}</span>
    </div>
    <div class="wallet">
      <span class="wallet-item">🪙 ${wallet.coin}</span>
      <span class="wallet-item">💎 ${wallet.diamond}</span>
      <span class="wallet-item">🤝 ${wallet.friendPoint}</span>
    </div>
    <div class="exp-block">
      <div class="exp-track">
        <span style="width: ${expProgress}%"></span>
      </div>
      <small>${wallet.exp}${nextLevel ? ` / ${nextLevel.needExp}` : " (满级)"}</small>
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
  } else if (level < 13) {
    text = "💡 Lv.13解锁宠物系统";
  }

  const weather = WeatherSystem.getCurrentWeather(state);
  const growthRate = WeatherSystem.getWeatherGrowthRate(state);
  const orderBonus = WeatherSystem.getWeatherOrderBonus(state);

  const effects = [];
  if (growthRate !== 1) effects.push(`生长×${growthRate}`);
  if (orderBonus !== 1) effects.push(`订单×${orderBonus}`);

  const buff = getActivePetBuff(state);
  const petPart = buff
    ? ` | 🐾 ${escapeHtml(pets.find(p => p.id === state.pets.active)?.name || "")}`
    : "";

  return `
    <p>${text}</p>
    <p class="notice-weather">
      今日天气：${weather.icon}${weather.name}
      ${effects.length ? `<span class="notice-effect">${effects.join(" ")}</span>` : ""}
      ${petPart}
    </p>
  `;
}

/**
 * 渲染小背包
 * @param {Object} state - 游戏状态
 * @returns {string} HTML字符串
 */
export function renderMiniInventory(state) {
  const items = getInventoryItems(state, 12).filter(item => item.count > 0);

  if (!items.length) {
    return `<p class="muted-text">背包空空的，去收获点作物吧</p>`;
  }

  return items
    .map(
      item => `<span class="mini-chip" title="${escapeHtml(getItemName(item.key))}">
        ${getItemIcon(item.key)} ${item.count}
      </span>`
    )
    .join("");
}

/**
 * 渲染农场视图
 * @param {Object} state - 游戏状态
 * @param {number} selectedCropId - 选中的作物ID
 * @returns {Object} { grid, seeds }
 */
export function renderFarmView(state, selectedCropId) {
  const grid = state.farm.plots
    .map((_, index) => renderPlotCell(state, index, selectedCropId))
    .join("");

  // 渲染种子列表
  const seeds = crops
    .map(crop => {
      const unlocked = state.wallet.level >= crop.unlockLevel;
      const selected = crop.id === selectedCropId;
      const price = FarmSystem.getSeedPrice(state, crop);
      const discounted = price < crop.seedPrice;
      const growTime = FarmSystem.getGrowTime(state, crop);
      const faster = growTime < crop.growTime;

      return `<div class="seed-item ${selected ? 'selected' : ''} ${!unlocked ? 'locked' : ''}"
        ${unlocked ? `onclick="window.selectCropHandler(${crop.id})"` : ''}>
        <span class="seed-icon">${crop.icon}</span>
        <span class="seed-name">${escapeHtml(crop.name)}</span>
        <span class="seed-meta">
          <span class="${discounted ? 'buffed' : ''}">🪙${price}</span>
          <span class="${faster ? 'buffed' : ''}">⏱${formatTime(growTime)}</span>
        </span>
        ${!unlocked ? `<span class="seed-lock">Lv.${crop.unlockLevel}</span>` : ''}
      </div>`;
    })
    .join("");

  // 当前季节的限定作物，附季节徽章
  const seasonalSeeds = getSeasonalCrops()
    .map(crop => {
      const unlocked = state.wallet.level >= crop.unlockLevel;
      const selected = crop.id === selectedCropId;
      const price = FarmSystem.getSeedPrice(state, crop);
      const growTime = FarmSystem.getGrowTime(state, crop);

      return `<div class="seed-item seasonal ${selected ? 'selected' : ''} ${!unlocked ? 'locked' : ''}"
        ${unlocked ? `onclick="window.selectCropHandler(${crop.id})"` : ''}>
        <span class="seed-icon">${crop.icon}</span>
        <span class="seed-name">${escapeHtml(crop.name)} <small class="season-badge">限定</small></span>
        <span class="seed-meta">
          <span>🪙${price}</span>
          <span>⏱${formatTime(growTime)}</span>
        </span>
        ${!unlocked ? `<span class="seed-lock">Lv.${crop.unlockLevel}</span>` : ''}
      </div>`;
    })
    .join("");

  const expansion = renderExpansionPanel(state);
  const sellBarn = renderSellBarn(state);

  return { grid, seeds: seeds + seasonalSeeds, expansion, sellBarn };
}

/**
 * 土地扩建面板：显示下一档价格与购买按钮
 */
function renderExpansionPanel(state) {
  const owned = FarmSystem.getPurchasedPlotCount(state);
  const next = FarmSystem.getNextExpansion(state);

  if (!next) {
    return `<p class="muted-text">田地已扩到最大（${owned} 块），小镇里再也腾不出更多地啦。</p>`;
  }

  const affordable = state.wallet.coin >= next.coin && state.wallet.diamond >= next.diamond;
  return `<div class="expansion-offer">
    <span>现有 ${owned} 块田 → 扩建到 <b>${next.plots}</b> 块</span>
    <span class="expansion-cost ${affordable ? '' : 'locked'}">🪙${formatNumber(next.coin)} + 💎${next.diamond}</span>
    <button type="button" class="${affordable ? 'primary-action' : 'ghost-action'}"
      onclick="window.buyExpansionHandler()">扩 建</button>
  </div>`;
}

/**
 * 卖仓：背包里的作物 / 金穗作物逐项列出，单个或一键全卖
 */
function renderSellBarn(state) {
  const rows = Object.entries(state.inventory)
    .filter(([key, count]) => count > 0 && /^(crop|gold)_\d+$/.test(key))
    .map(([key, count]) => {
      const unit = FarmSystem.getCropSellPrice(key);
      return { key, count, unit };
    })
    .sort((a, b) => b.unit * b.count - a.unit * a.count);

  if (!rows.length) {
    return `<p class="muted-text">卖仓空空的，收获的作物可以在这里换成金币。</p>`;
  }

  const total = rows.reduce((sum, r) => sum + r.unit * r.count, 0);

  return `${rows.map(({ key, count, unit }) => `
    <div class="sell-row" data-key="${key}">
      <span>${getItemIcon(key)} ${escapeHtml(getItemName(key))} ×${count}</span>
      <span class="muted-text">🪙${formatNumber(unit * count)}</span>
      <button type="button" class="small-action" onclick="window.sellCropHandler('${key}')">卖出</button>
    </div>`).join("")}
    <div class="sell-row sell-all">
      <b>全部作物估值 🪙${formatNumber(total)}</b>
      <button type="button" class="primary-action" onclick="window.sellAllCropsHandler()">一键全卖</button>
    </div>`;
}

/**
 * 渲染单块农田，时钟刷新成熟态时只替换这一格
 * @param {Object} state
 * @param {number} index
 * @param {number} selectedCropId
 * @returns {string}
 */
export function renderPlotCell(state, index, selectedCropId) {
  if (!FarmSystem.isPlotUnlocked(state, index)) {
    return `<div class="plot locked" data-plot="${index}">
      <div class="crop-icon">🔒</div>
      <div class="crop-status">Lv.${FarmSystem.getPlotUnlockLevel(index)} 解锁</div>
    </div>`;
  }

  const plot = state.farm.plots[index];
  if (!plot) {
    const crop = getCrop(selectedCropId);
    const price = crop ? FarmSystem.getSeedPrice(state, crop) : 0;
    return `<div class="plot empty" data-plot="${index}">
      <div class="crop-icon">🕳️</div>
      <div class="crop-status">空地</div>
      <button type="button" onclick="window.plantCropHandler(${index})">
        种 ${crop ? crop.icon : ""} 🪙${price}
      </button>
    </div>`;
  }

  const crop = getCrop(plot.cropId);
  const isMature = FarmSystem.isPlotMature(plot);
  const remaining = FarmSystem.getRemainingSeconds(plot);
  const stage = FarmSystem.getCropGrowthStage(plot);
  const stageIcon = FarmSystem.getStageIcon(stage);
  const growTime = FarmSystem.getPlotGrowTime(plot);
  const percent = growTime ? ((growTime - remaining) / growTime) * 100 : 100;

  return `<div class="plot ${isMature ? "mature" : "growing"}" data-plot="${index}">
    <div class="crop-icon">${isMature ? (crop ? crop.icon : "✨") : stageIcon}</div>
    <div class="crop-name">${crop ? escapeHtml(crop.name) : "未知作物"}</div>
    <div class="crop-status">${isMature ? "✨可收获" : formatTime(remaining)}</div>
    ${isMature ? "" : createProgressBar(percent)}
    ${isMature
      ? `<button type="button" onclick="window.harvestCropHandler(${index})">收获</button>`
      : `<button type="button" class="small-action" onclick="window.speedUpPlotHandler(${index})">⏩加速</button>`}
  </div>`;
}

/**
 * 渲染订单视图
 * @param {Object} state - 游戏状态
 * @returns {string} HTML字符串
 */
export function renderOrdersView(state) {
  const chrome = renderOrdersChrome(state);
  return chrome + state.orders.activeIds
    .map((orderId, index) => {
      const order = getOrder(orderId);
      if (!order) return "";

      const canComplete = OrdersSystem.canCompleteOrder(state, orderId);
      const coin = OrdersSystem.getOrderCoinReward(state, order);
      const buffed = coin > order.coin;

      const requiresHtml = order.requires
        .map(req => {
          const has = getCount(state, req.item);
          const need = req.count;
          const enough = has >= need;

          return `<span class="req-chip ${enough ? 'enough' : 'not-enough'}">
            ${getItemIcon(req.item)} ${escapeHtml(getItemName(req.item))} ${has}/${need}
          </span>`;
        })
        .join(" ");

      const isRush = !!state.orders.rush && state.orders.rush.id === orderId;
      const chainLevel = state.orders.chainType === order.type
        ? Math.min(state.orders.chainCount, GAME_CONFIG.orders.chainBonusMax) : 0;

      return `<div class="order-card ${isRush ? 'rush' : ''}">
        <div class="order-header">
          <h4>${escapeHtml(order.name)}</h4>
          <span class="order-type">${escapeHtml(order.type)}</span>
          ${isRush ? '<span class="rush-tag">⚡限时</span>' : ''}
          ${chainLevel >= 2 ? `<span class="chain-tag">🔥连击x${chainLevel}</span>` : ''}
        </div>
        <div class="order-requires">${requiresHtml}</div>
        <div class="order-rewards">
          奖励：<span class="${buffed ? 'buffed' : ''}">🪙${coin}</span> ⭐${order.exp}
          ${buffed ? `<small class="muted-text">（原 ${order.coin}，含天气/宠物加成）</small>` : ""}
        </div>
        <div class="order-actions">
          <button class="primary-action" onclick="window.completeOrderHandler(${index})" ${!canComplete ? 'disabled' : ''}>
            提交
          </button>
          <button class="ghost-action" onclick="window.refreshOrderHandler(${index})">
            换一单
          </button>
        </div>
      </div>`;
    })
    .join("");
}

/**
 * 订单页顶部：限时订单面板 + 连击进度 + 预购入口
 */
function renderOrdersChrome(state) {
  const cfg = GAME_CONFIG.orders;
  const parts = [];

  // 连击状态
  if (state.orders.chainCount >= 2) {
    parts.push(`<div class="chain-banner">
      🔥 ${escapeHtml(state.orders.chainType)}订单连击 x${state.orders.chainCount}
      （金币 +${Math.min(state.orders.chainCount, cfg.chainBonusMax) * 10}%）
    </div>`);
  }

  // 限时订单面板
  if (state.wallet.level >= cfg.rushMinLevel) {
    const rushing = state.orders.rush && OrdersSystem.getRushRemainingSeconds(state) > 0;
    if (rushing) {
      const rushOrder = getOrder(state.orders.rush.id);
      parts.push(`<div class="rush-banner active">
        ⚡ 限时订单「${escapeHtml(rushOrder ? rushOrder.name : '')}」进行中，
        剩余 <b id="rushCountdown">${formatTime(OrdersSystem.getRushRemainingSeconds(state))}</b>，交付奖励翻倍！
      </div>`);
    } else {
      const done = OrdersSystem.hasRushedToday(state);
      parts.push(`<div class="rush-banner">
        ${done ? '今天的限时订单已完成，明天再来挑战' : '⚡ 每日限时订单：10 分钟内交付，奖励翻倍'}
        ${done ? '' : '<button type="button" class="primary-action" onclick="window.acceptRushHandler()">接 单</button>'}
      </div>`);
    }
  }

  // 预购入口
  if (state.orders.reservedId) {
    const reserved = getOrder(state.orders.reservedId);
    parts.push(`<div class="reserve-panel done">📝 已预购「${escapeHtml(reserved ? reserved.name : '')}」，明天上线自动入列</div>`);
  } else if (state.wallet.level >= 3) {
    const pool = orders
      .filter((o) => o.unlockLevel <= state.wallet.level)
      .slice(0, 8)
      .map((o) => `<option value="${o.id}">${escapeHtml(o.name)}（${escapeHtml(o.type)}）</option>`)
      .join("");
    parts.push(`<div class="reserve-panel">
      <span>📝 预购明日订单（🪙${cfg.reserveCost}）</span>
      <select id="reserveOrderSelect">${pool}</select>
      <button type="button" class="small-action" onclick="window.reserveOrderHandler()">预 购</button>
    </div>`);
  }

  return parts.map((p) => `<div class="orders-chrome">${p}</div>`).join("");
}

/**
 * 渲染家园视图
 * @param {Object} state - 游戏状态
 * @param {number|null} selectedFurnitureId - 当前选中待摆放的家具ID
 * @returns {Object} { layout, furniture, score }
 */
export function renderHomeView(state, selectedFurnitureId = null) {
  // 渲染房间布局
  const layout = state.home.layout
    .map((item, index) => {
      if (!item) {
        const placeable = selectedFurnitureId !== null;
        return `<div class="room-cell empty ${placeable ? 'placeable' : ''}" data-index="${index}"
          ${placeable ? `onclick="window.placeFurnitureHandler(${index})"` : ''}></div>`;
      }

      const fur = getFurniture(item.id);
      return `<div class="room-cell occupied" data-index="${index}">
        <span class="furniture-icon ${item.rotated ? 'rotated' : ''}">${fur ? fur.icon : "📦"}</span>
        <div class="furniture-actions">
          <button title="旋转" onclick="window.rotateFurnitureHandler(${index})">↻</button>
          <button title="收回" onclick="window.removeFurnitureHandler(${index})">✕</button>
        </div>
      </div>`;
    })
    .join("");

  // 渲染家具列表（普通 + 当前季节限定）
  const renderFurnitureCard = (fur, isSeasonal) => {
    const unlocked = state.wallet.level >= fur.unlockLevel;
    const inBag = state.inventory[furnitureKey(fur.id)] || 0;
    const selected = fur.id === selectedFurnitureId;

    return `<div class="furniture-item ${!unlocked ? 'locked' : ''} ${selected ? 'selected' : ''} ${isSeasonal ? 'seasonal' : ''}">
      <span class="furniture-icon">${fur.icon}</span>
      <div class="furniture-info">
        <h5>${escapeHtml(fur.name)} ${isSeasonal ? '<small class="season-badge">限定</small>' : ''}</h5>
        <p class="muted-text">${escapeHtml(fur.category)} · ${moneyLabel(fur.priceType, fur.price)}</p>
      </div>
      <div class="furniture-count">背包 ${inBag}</div>
      <div class="furniture-buttons">
        <button class="small-action" onclick="window.buyFurnitureHandler(${fur.id})" ${!unlocked ? 'disabled' : ''}>
          ${unlocked ? '购买' : `Lv.${fur.unlockLevel}`}
        </button>
        <button class="small-action" onclick="window.selectFurnitureHandler(${fur.id})" ${inBag < 1 ? 'disabled' : ''}>
          ${selected ? '已选中' : '摆放'}
        </button>
      </div>
    </div>`;
  };

  const furnitureList = furniture
    .map(fur => renderFurnitureCard(fur, false))
    .concat(getSeasonalFurniture().map(fur => renderFurnitureCard(fur, true)))
    .join("");

  // 计算装饰评分
  const scoreData = HomeSystem.calculateRoomScore(state);
  const hint = selectedFurnitureId
    ? `<p class="place-hint">已选中 ${escapeHtml(getFurniture(selectedFurnitureId)?.name || "")}，点击房间空格摆放
        <button class="small-action" onclick="window.selectFurnitureHandler(null)">取消</button></p>`
    : `<p class="muted-text">在下方家具商店点「摆放」，再点房间空格</p>`;

  const score = `
    <div class="room-score">
      <h3>装饰评分 <span class="score-grade grade-${scoreData.grade}">${scoreData.grade}</span> 级</h3>
      <p>总分：${scoreData.score}</p>
      <div class="score-details">
        ${scoreData.details.map(d => `<p class="score-detail">• ${escapeHtml(d)}</p>`).join('')}
      </div>
      ${hint}
    </div>
  `;

  return { layout, furniture: furnitureList, score };
}

/**
 * 渲染好友视图
 * @param {Object} state - 游戏状态
 * @returns {string} HTML字符串
 */
export function renderFriendsView(state) {
  const unlocked = state.wallet.level >= 5;
  const myFriends = FriendsSystem.getMyFriends(state);
  const recommended = FriendsSystem.getRecommendedFriends(state);

  const waterLeft = FriendsSystem.getWaterChancesLeft(state);
  const streak = state.social.visitStreak || 0;

  const card = (friend, isFriend) => {
    const liked = FriendsSystem.hasLikedToday(state, friend.id);
    const watered = FriendsSystem.hasWateredToday(state, friend.id);

    const actions = isFriend
      ? `<button class="small-action" onclick="window.visitFriendHandler('${friend.id}')" ${!unlocked ? 'disabled' : ''}>
          ${unlocked ? '拜访' : 'Lv.5'}
         </button>
         <button class="small-action" onclick="window.likeFriendHandler('${friend.id}')" ${liked ? 'disabled' : ''}>
          ${liked ? '已点赞' : '点赞'}
         </button>
         ${unlocked ? `<button class="small-action" onclick="window.waterFriendHandler('${friend.id}')"
            ${watered || waterLeft < 1 ? 'disabled' : ''}>
            ${watered ? '已浇过' : '💧帮浇'}
           </button>` : ''}`
      : `<button class="small-action" onclick="window.addFriendHandler('${friend.id}')">加好友</button>`;

    return `<div class="person-card">
      <span class="person-avatar">${escapeHtml(friend.avatar)}</span>
      <h4>${escapeHtml(friend.name)}</h4>
      <p class="muted-text">${escapeHtml(friend.mood)}</p>
      <p class="person-likes">👍 ${friend.likes || 0}</p>
      <div class="item-actions">${actions}</div>
    </div>`;
  };

  const sections = [];

  sections.push(`
    <div class="social-banner">
      ${unlocked
        ? `💧 今日帮浇次数：${waterLeft}/${GAME_CONFIG.social.waterPerDay}
           ${streak >= 2 ? ` · 🔥 连续拜访 ${streak} 天（每日 +${Math.min(streak - 1, GAME_CONFIG.social.visitStreakBonusMax)} 友情点）` : ''}`
        : '💧 Lv.5 解锁拜访与帮浇'}
    </div>
  `);

  sections.push(`
    <div class="friends-section">
      <h3>我的好友（${myFriends.length}）</h3>
      <div class="people-grid">
        ${myFriends.length ? myFriends.map(f => card(f, true)).join("") : '<p class="muted-text">还没有好友</p>'}
      </div>
    </div>
  `);

  if (recommended.length) {
    sections.push(`
      <div class="friends-section">
        <h3>推荐邻居（${recommended.length}）</h3>
        <div class="people-grid">
          ${recommended.map(f => card(f, false)).join("")}
        </div>
      </div>
    `);
  }

  if (!unlocked) {
    sections.unshift('<p class="lock-banner">🔒 Lv.5 解锁拜访功能，点赞现在就可以</p>');
  }

  return sections.join("");
}

/**
 * 渲染社区视图
 * @param {Object} state - 游戏状态
 * @returns {string} HTML字符串
 */
export function renderCommunityView(state) {
  if (state.wallet.level < 10) {
    return '<p class="lock-banner">🔒 需要 Lv.10 解锁社区系统</p>';
  }

  if (!state.community.joined) {
    return `
      <div class="fountain-card">
        <h3>⛲ ${escapeHtml(state.community.name)}</h3>
        <p>和邻居一起把广场的喷泉修起来吧。</p>
        <button class="primary-action" onclick="window.joinCommunityHandler()">加入社区</button>
      </div>
    `;
  }

  const stage = CommunitySystem.getCurrentStage(state);
  const allDone = CommunitySystem.isAllStagesComplete(state);
  const percent = CommunitySystem.getStageProgress(state);

  const stagePanel = allDone
    ? `<div class="fountain-card">
        <div class="fountain-visual">⛲✨</div>
        <h3>喷泉已完工！</h3>
        <p>全部 ${fountainStages.length} 个阶段都完成了，感谢你的贡献。</p>
       </div>`
    : `<div class="fountain-card">
        <div class="fountain-visual">🚧</div>
        <h3>第 ${stage.stage}/${fountainStages.length} 阶段：${escapeHtml(stage.label)}</h3>
        <div class="build-track"><span style="width:${percent}%"></span></div>
        <p>${state.community.progress} / ${stage.target}（${percent}%）</p>
        <p class="muted-text">阶段奖励：${formatRewards(stage.reward)}</p>
        <div class="donate-list">
          ${stage.accepts
            .map(accept => {
              const owned = getCount(state, accept.item);
              return `<div class="donate-row">
                <span class="donate-label">
                  ${getItemIcon(accept.item)} ${escapeHtml(accept.label)}
                  <small class="muted-text">持有 ${owned}</small>
                </span>
                <input type="number" min="1" value="${Math.min(owned, 10) || 1}"
                  id="donate-${accept.item}" class="donate-input">
                <button class="small-action" onclick="window.donateHandler('${accept.item}')"
                  ${owned < 1 ? 'disabled' : ''}>捐献</button>
              </div>`;
            })
            .join("")}
        </div>
        ${stage.accepts.some(a => a.item === "coin")
          ? '<p class="muted-text">提示：金币捐献的贡献值按一半计算</p>'
          : ""}
       </div>`;

  const members = [...state.community.members]
    .sort((a, b) => b.contribution - a.contribution)
    .map(
      (m, i) => `<div class="member-row">
        <span>${i + 1}. ${escapeHtml(m.name)}</span>
        <span class="muted-text">${escapeHtml(m.role)}</span>
        <b>${m.contribution}</b>
      </div>`
    )
    .join("");

  const weekly = CommunitySystem.getWeeklyLeaderboard(state);
  const myWeekly = weekly.find((r) => r.isMe);
  const weeklyPanel = `
    <div class="weekly-board">
      <h3>🏅 本周贡献榜</h3>
      ${weekly.map((r) => `
        <div class="member-row ${r.isMe ? 'me' : ''}">
          <span>${r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : `${r.rank}.`} ${escapeHtml(r.name)}${r.isMe ? '（我）' : ''}</span>
          <b>${r.contribution}</b>
        </div>`).join("")}
      <p class="muted-text">每周一刷新。我的本周贡献：${myWeekly ? myWeekly.contribution : 0}</p>
    </div>
  `;

  return `
    <div class="community-layout">
      ${stagePanel}
      <div class="member-list">
        <h3>成员贡献榜</h3>
        ${members}
        <p class="muted-text">我的总贡献：${state.wallet.communityContribution}</p>
      </div>
      ${weeklyPanel}
    </div>
  `;
}

/**
 * 渲染商城视图
 * @param {Object} state - 游戏状态
 * @returns {string} HTML字符串
 */
export function renderShopView(state) {
  const canClaim = ShopSystem.canClaimMonthlyCard(state);
  const expired = state.shop.monthlyCard && ShopSystem.isMonthlyCardExpired(state);

  let monthlyPanel = "";
  if (state.shop.monthlyCard) {
    monthlyPanel = `
      <div class="monthly-panel ${expired ? 'expired' : ''}">
        <h3>📅 月卡${expired ? "（已过期）" : "已激活"}</h3>
        <p class="muted-text">每日可领 60 钻石 + 500 金币</p>
        <button class="primary-action" onclick="window.claimMonthlyCardHandler()" ${!canClaim ? 'disabled' : ''}>
          ${expired ? '已过期' : canClaim ? '领取今日奖励' : '今日已领取'}
        </button>
      </div>
    `;
  }

  const goods = shopGoods
    .map(item => {
      const bought = state.shop.boughtGoods[item.id] || 0;

      return `<div class="shop-card">
        <span class="shop-icon">${item.icon}</span>
        <h4>${escapeHtml(item.name)}</h4>
        <p class="muted-text">${escapeHtml(item.category)}</p>
        <p class="shop-rewards">${escapeHtml(formatRewards(item.rewards))}</p>
        <p class="shop-price">${moneyLabel(item.priceType, item.price)}</p>
        ${bought ? `<p class="muted-text">已购 ${bought} 次</p>` : ""}
        <button class="primary-action" onclick="window.buyGoodsHandler(${item.id})">购买</button>
      </div>`;
    })
    .join("");

  return `
    ${monthlyPanel}
    <div class="shop-grid">${goods}</div>
    <p class="muted-text">￥价商品为演示用途，不会真实扣款。</p>
  `;
}

/**
 * 渲染任务视图
 * @param {Object} state - 游戏状态
 * @returns {Object} { tasks, boxes, activeScore }
 */
export function renderTasksView(state) {
  const locked = state.wallet.level < 7;

  const tasks = dailyTasks
    .map(task => {
      const progress = state.daily.progress[task.type] || 0;
      const complete = isTaskComplete(state, task);
      const claimed = state.daily.claimedTasks[task.id];
      const progressPercent = getTaskProgress(state, task);

      return `<div class="task-item ${complete ? 'complete' : ''} ${claimed ? 'claimed' : ''}">
        <div class="task-info">
          <h4>${escapeHtml(task.name)}</h4>
          <p class="muted-text">${Math.min(progress, task.target)}/${task.target} · 活跃度+${task.active}</p>
        </div>
        ${createProgressBar(progressPercent)}
        <div class="task-reward">${escapeHtml(formatRewards(task.rewards))}</div>
        <button class="small-action" onclick="window.claimTaskHandler('${task.id}')"
          ${!complete || claimed || locked ? 'disabled' : ''}>
          ${claimed ? '已领取' : locked ? 'Lv.7' : '领取'}
        </button>
      </div>`;
    })
    .join("");

  const boxes = activeBoxes
    .map(box => {
      const canClaim = state.daily.activeScore >= box.score;
      const claimed = state.daily.claimedBoxes[box.score];

      return `<div class="active-box ${canClaim ? 'can-claim' : ''} ${claimed ? 'claimed' : ''}">
        <div class="box-icon">${claimed ? "📭" : canClaim ? "🎁" : "📦"}</div>
        <div class="box-score">${box.score}分</div>
        <div class="box-reward">${escapeHtml(formatRewards(box.rewards))}</div>
        <button class="small-action" onclick="window.claimBoxHandler(${box.score})"
          ${!canClaim || claimed ? 'disabled' : ''}>
          ${claimed ? '已领取' : '领取'}
        </button>
      </div>`;
    })
    .join("");

  return {
    tasks: locked ? '<p class="lock-banner">🔒 Lv.7 解锁每日任务领奖</p>' + tasks : tasks,
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
  const unlockedIds = new Set(state.achievements.unlocked);

  // 按 category 分组，已完成的排到组尾
  const groups = new Map();
  achievements.forEach((achievement) => {
    const cat = achievement.category || "其他";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(achievement);
  });

  const section = (cat, list) => {
    const sorted = [...list].sort((a, b) => {
      const au = unlockedIds.has(a.id) ? 1 : 0;
      const bu = unlockedIds.has(b.id) ? 1 : 0;
      return au - bu;
    });
    const done = list.filter((a) => unlockedIds.has(a.id)).length;

    return `<div class="achievement-group">
      <h3>${escapeHtml(cat)} <small>${done}/${list.length}</small></h3>
      ${sorted.map((achievement) => {
        const unlocked = unlockedIds.has(achievement.id);
        const progress = state.achievements.progress[achievement.id] || 0;
        const progressPercent = getAchievementProgressPercent(state, achievement.id);

        return `<div class="achievement-item ${unlocked ? 'unlocked' : ''}">
          <div class="achievement-icon">${achievement.icon}</div>
          <div class="achievement-info">
            <h4>${escapeHtml(achievement.name)}</h4>
            <p class="muted-text">${escapeHtml(achievement.desc)}</p>
            ${unlocked
              ? '<span class="achievement-badge">✅ 已完成</span>'
              : `<div class="achievement-progress">${Math.min(progress, achievement.target)}/${achievement.target}</div>
                 ${createProgressBar(progressPercent)}`}
          </div>
          <div class="achievement-reward">${escapeHtml(formatRewards(achievement.rewards))}</div>
        </div>`;
      }).join("")}
    </div>`;
  };

  return [...groups.entries()].map(([cat, list]) => section(cat, list)).join("");
}

/**
 * 渲染成就统计文字
 * @param {Object} state - 游戏状态
 * @returns {string} 文本
 */
export function renderAchievementStats(state) {
  const stats = getAchievementStats(state);
  return `已完成 ${stats.unlocked}/${stats.total}（${stats.percent}%）`;
}

/**
 * 渲染宠物视图
 * @param {Object} state - 游戏状态
 * @returns {string} HTML字符串
 */
export function renderPetsView(state) {
  if (state.wallet.level < 13) {
    return '<p class="lock-banner">🔒 需要 Lv.13 解锁宠物系统</p>';
  }

  const buff = getActivePetBuff(state);
  const activePet = pets.find(p => p.id === state.pets.active);
  const giftClaimed = state.pets.lastGiftDate === todayKey();

  const activePanel = activePet
    ? `<div class="pet-active-panel">
        <span class="pet-icon-large">${activePet.icon}</span>
        <div>
          <h3>出战中：${escapeHtml(activePet.name)}</h3>
          <p class="muted-text">${escapeHtml(activePet.desc)}</p>
          <p>亲密度 ${state.pets.intimacy[activePet.id] || 0}
            ${buff ? `· 实际效果 ${buff.enhancedValue.toFixed(2)}` : ""}</p>
          ${buff && buff.type === "dailyGift"
            ? `<button class="primary-action" onclick="window.claimPetGiftHandler()" ${giftClaimed ? 'disabled' : ''}>
                ${giftClaimed ? '今日已领取' : '领取每日礼物'}
               </button>`
            : ""}
          <button class="ghost-action" onclick="window.setActivePetHandler(null)">让它休息</button>
        </div>
       </div>`
    : '<p class="muted-text">还没有出战宠物，选一只带上吧（亲密度会增强效果）</p>';

  const list = pets
    .map(pet => {
      const owned = state.pets.owned.includes(pet.id);
      const isActive = state.pets.active === pet.id;
      const intimacy = state.pets.intimacy[pet.id] || 0;
      const fedToday = hasFedToday(state, pet.id);
      const foodText = Object.entries(pet.foodCost)
        .map(([key, count]) => `${getItemIcon(key)}${escapeHtml(getItemName(key))}×${count}`)
        .join("、");

      return `<div class="pet-card ${owned ? 'owned' : ''} ${isActive ? 'active' : ''}">
        <span class="pet-icon">${pet.icon}</span>
        <h4>${escapeHtml(pet.name)}</h4>
        <p class="muted-text">${escapeHtml(pet.desc)}</p>
        ${owned
          ? `<p>亲密度 ${intimacy}</p>
             ${createProgressBar(Math.min(100, (intimacy / 200) * 100))}
             <p class="muted-text">口粮：${foodText}</p>
             <div class="item-actions">
               <button class="small-action" onclick="window.feedPetHandler('${pet.id}')" ${fedToday ? 'disabled' : ''}>
                 ${fedToday ? '今日已喂' : '喂养'}
               </button>
               <button class="small-action" onclick="window.setActivePetHandler('${pet.id}')" ${isActive ? 'disabled' : ''}>
                 ${isActive ? '出战中' : '出战'}
               </button>
             </div>`
          : `<p class="shop-price">${moneyLabel(pet.priceType, pet.price)}</p>
             <button class="primary-action" onclick="window.buyPetHandler('${pet.id}')">领养</button>`}
      </div>`;
    })
    .join("");

  return `${activePanel}<div class="pet-grid">${list}</div>`;
}

/**
 * 渲染图鉴视图
 * @param {Object} state - 游戏状态
 * @returns {string} HTML字符串
 */
export function renderCodexView(state) {
  const progress = CodexSystem.getCodexProgress(state);
  const percent = Math.floor(progress.ratio * 100);

  const tiers = CodexSystem.CODEX_TIERS.map((tier) => {
    const claimable = CodexSystem.canClaimCodexTier(state, tier.id);
    return `<button type="button" class="${claimable ? 'primary-action' : 'ghost-action'}"
      onclick="window.claimCodexTierHandler('${tier.id}')" ${claimable ? '' : 'disabled'}>
      ${Math.round(tier.ratio * 100)}%：${escapeHtml(formatRewards(tier.rewards))}${claimable ? ' 可领取' : ''}
    </button>`;
  }).join("");

  const section = (title, entries) => {
    const collected = entries.filter((e) => e.owned).length;
    return `<div class="codex-section">
      <h3>${title} <small>${collected}/${entries.length}</small></h3>
      <div class="codex-grid">
        ${entries.map((e) => `
          <div class="codex-card ${e.owned ? 'owned' : 'unknown'}" title="${escapeHtml(e.name)}">
            <span class="codex-icon">${e.owned ? e.icon : '❓'}</span>
            <span class="codex-name">${e.owned ? escapeHtml(e.name) : '未收录'}</span>
          </div>`).join("")}
      </div>
    </div>`;
  };

  const cropEntries = crops.map((c) => ({
    icon: c.icon, name: c.name,
    owned: state.codex.crops.includes(c.id),
  }));
  const furnitureEntries = furniture.map((f) => ({
    icon: f.icon, name: f.name,
    owned: state.codex.furniture.includes(f.id),
  }));
  const fishEntries = FishingSystem.fishes.map((f) => ({
    icon: f.icon, name: f.name,
    owned: state.codex.fishes.includes(f.id),
  }));

  return `
    <div class="codex-summary">
      <h3>📚 小镇图鉴</h3>
      <p>收录过（收获/拥有/钓到）的条目会永久保留，卖出也不会消失。</p>
      ${createProgressBar(percent)}
      <p class="muted-text">总收录 ${progress.collected}/${progress.total}（${percent}%）</p>
      <div class="button-row">${tiers}</div>
    </div>
    ${section("🌾 作物图鉴", cropEntries)}
    ${section("🪑 家具图鉴", furnitureEntries)}
    ${section("🐟 鱼类图鉴", fishEntries)}
  `;
}

/**
 * 渲染后台视图
 * @param {Object} state - 游戏状态
 * @returns {string} HTML字符串
 */
export function renderAdminView(state) {
  const stats = getAnalytics(state).sort((a, b) => b.count - a.count);
  const achievementStats = getAchievementStats(state);

  const overview = [
    { label: "昵称", value: escapeHtml(state.user.nickname) },
    { label: "用户ID", value: escapeHtml(state.user.userId) },
    { label: "等级 / 经验", value: `Lv.${state.wallet.level} / ${state.wallet.exp}` },
    { label: "金币 / 钻石", value: `${state.wallet.coin} / ${state.wallet.diamond}` },
    { label: "友情点", value: state.wallet.friendPoint },
    { label: "社区贡献", value: state.wallet.communityContribution },
    { label: "今日活跃度", value: state.daily.activeScore },
    { label: "成就", value: `${achievementStats.unlocked}/${achievementStats.total}` },
    { label: "已拥有宠物", value: state.pets.owned.length },
    { label: "创建时间", value: escapeHtml(String(state.user.createdAt).slice(0, 10)) },
  ]
    .map(
      row => `<div class="data-row"><span>${row.label}</span><b>${row.value}</b></div>`
    )
    .join("");

  const statRows = stats.length
    ? stats
        .map(s => `<div class="data-row"><span>${escapeHtml(s.name)}</span><b>${s.count}</b></div>`)
        .join("")
    : '<p class="muted-text">还没有埋点数据</p>';

  const soundOn = state.settings.soundEnabled !== false;
  const volume = typeof state.settings.volume === 'number' ? state.settings.volume : 0.7;

  return `
    <div class="admin-grid">
      <div class="data-card">
        <h3>账号概览</h3>
        <div class="data-list">${overview}</div>
      </div>
      <div class="data-card">
        <h3>行为统计</h3>
        <div class="data-list">${statRows}</div>
      </div>
      <div class="data-card">
        <h3>设置</h3>
        <div class="data-row">
          <span>音效</span>
          <button class="small-action" onclick="window.toggleSoundHandler()">
            ${soundOn ? '🔊 已开启' : '🔇 已关闭'}
          </button>
        </div>
        <div class="data-row">
          <span>音量</span>
          <input type="range" min="0" max="1" step="0.1" value="${volume}"
            oninput="window.setVolumeHandler(this.value)">
        </div>
        <p class="muted-text">音效由 WebAudio 实时合成，不需要音频文件。</p>
      </div>
      <div class="data-card">
        <h3>存档管理</h3>
        <div class="button-row">
          <button class="small-action" onclick="window.exportSaveHandler()">导出存档</button>
          <button class="small-action" onclick="window.importSaveHandler()">导入存档</button>
        </div>
        <p class="muted-text">导出的 JSON 可以直接粘回来恢复进度。</p>
        <div class="button-row">
          <button class="danger-action" onclick="window.resetGameHandler()">清空进度</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * 渲染养殖栏视图
 * @param {Object} state - 游戏状态
 * @returns {string} HTML字符串
 */
export function renderRanchView(state) {
  if (!RanchSystem.isRanchUnlocked(state)) {
    return `<p class="lock-banner">🔒 Lv.${GAME_CONFIG.ranch.minLevel} 解锁养殖栏</p>`;
  }

  const cfg = GAME_CONFIG.ranch;
  const rows = cfg.animals.map((animal) => {
    if (!state.ranch.owned.includes(animal.id)) {
      const priceLabel = animal.priceType === 'coin' ? `🪙${animal.price}` : `💎${animal.price}`;
      const affordable = state.wallet[animal.priceType] >= animal.price;
      return `<div class="animal-card locked">
        <span class="animal-icon">${animal.icon}</span>
        <h4>${escapeHtml(animal.name)}</h4>
        <p class="muted-text">每${Math.floor(animal.produce.intervalSec / 3600)}小时产出${getItemIcon(animal.produce.item)}×${animal.produce.count}</p>
        <p class="muted-text">饲料：${getItemIcon(animal.feed.item)}${escapeHtml(getItemName(animal.feed.item))}×${animal.feed.count}</p>
        <button class="small-action" onclick="window.buyAnimalHandler('${animal.id}')"
          ${affordable ? '' : 'disabled'}>${priceLabel} 购买</button>
      </div>`;
    }

    const fed = RanchSystem.isAnimalFed(state, animal.id);
    const pending = RanchSystem.getPendingProduce(state, animal.id);

    return `<div class="animal-card owned ${fed ? 'fed' : 'hungry'}">
      <span class="animal-icon">${animal.icon}</span>
      <h4>${escapeHtml(animal.name)}</h4>
      <p>${fed ? '😊 吃饱了' : '🍽️ 饿了，产出暂停中'}</p>
      <p>攒了 ${getItemIcon(animal.produce.item)} ×${pending}
        ${pending > 0 ? '<b class="buffed">可收取</b>' : ''}</p>
      <div class="item-actions">
        <button class="small-action" onclick="window.feedAnimalHandler('${animal.id}')" ${fed ? 'disabled' : ''}>
          ${fed ? '饱着呢' : `喂 ${getItemIcon(animal.feed.item)}×${animal.feed.count}`}
        </button>
        <button class="primary-action" onclick="window.collectProduceHandler('${animal.id}')" ${pending < 1 ? 'disabled' : ''}>
          收取
        </button>
      </div>
    </div>`;
  });

  return `<div class="ranch-grid">${rows.join("")}</div>`;
}

/**
 * 渲染加工坊视图
 * @param {Object} state - 游戏状态
 * @returns {Object} { queue, recipes }
 */
export function renderCraftingView(state) {
  if (!CraftingSystem.isCraftingUnlocked(state)) {
    return {
      queue: '',
      recipes: '<p class="lock-banner">🔒 需要 Lv.10 解锁加工坊</p>',
    };
  }

  // 加工台：正在进行的批次
  const queue = state.crafting.queue
    .map((batch, index) => {
      const recipe = craftingRecipes.find(r => r.id === batch.recipeId);
      if (!recipe) return '';

      const elapsed = Math.floor((Date.now() - new Date(batch.startedAt).getTime()) / 1000);
      const remaining = Math.max(0, batch.time - elapsed);
      const percent = Math.min(100, (elapsed / batch.time) * 100);
      const done = remaining <= 0;

      return `<div class="craft-batch ${done ? 'done' : ''}" data-batch="${index}">
        <span class="craft-batch-icon">${recipe.icon}</span>
        <div class="craft-batch-info">
          <h4>${escapeHtml(recipe.name)}</h4>
          <p class="muted-text">${done ? '✅ 加工完成' : formatTime(remaining)}</p>
        </div>
        ${done ? '' : createProgressBar(percent)}
        <div class="craft-batch-actions">
          ${done
            ? `<button class="small-action" onclick="window.claimCraftingHandler(${index})">领取</button>`
            : `<button class="ghost-action" onclick="window.cancelCraftingHandler(${index})">取消</button>`}
        </div>
      </div>`;
    })
    .join("");

  const queuePanel = state.crafting.queue.length
    ? queue
    : '<p class="muted-text">加工台空着，选一个配方开工吧</p>';

  // 配方列表
  const recipes = craftingRecipes
    .map(recipe => {
      const unlocked = state.wallet.level >= recipe.unlockLevel;
      const affordable = CraftingSystem.getRecipeAffordableCount(state, recipe);
      const canStart = unlocked && affordable > 0 && state.crafting.queue.length < 2;

      const requiresHtml = recipe.requires
        .map(req => {
          const has = getCount(state, req.item);
          return `<span class="req-chip ${has >= req.count ? 'enough' : 'not-enough'}">
            ${getItemIcon(req.item)} ${escapeHtml(getItemName(req.item))} ${has}/${req.count}
          </span>`;
        })
        .join(" ");

      return `<div class="recipe-item ${!unlocked ? 'locked' : ''}">
        <span class="recipe-icon">${recipe.icon}</span>
        <div class="recipe-info">
          <h4>${escapeHtml(recipe.name)}</h4>
          <div class="order-requires">${requiresHtml}</div>
          <p class="muted-text">⏱ ${formatTime(recipe.time)} → 产出 ${escapeHtml(getItemName(recipe.result.key))}×${recipe.result.count}</p>
        </div>
        <div class="recipe-actions">
          ${unlocked
            ? `<button class="small-action" onclick="window.startCraftingHandler(${recipe.id})" ${!canStart ? 'disabled' : ''}>
                ${affordable > 0 ? '开工' : '缺料'}
              </button>`
            : `<span class="seed-lock">Lv.${recipe.unlockLevel}</span>`}
        </div>
      </div>`;
    })
    .join("");

  return { queue: queuePanel, recipes };
}

/**
 * 渲染钓鱼视图
 * @param {Object} state - 游戏状态
 * @returns {Object} { pond, catches, stats }
 */
export function renderFishingView(state) {
  if (!FishingSystem.isFishingUnlocked(state)) {
    return {
      pond: '<p class="lock-banner">🔒 需要 Lv.6 解锁湖畔钓鱼</p>',
      catches: '',
      stats: '',
    };
  }

  const freeLeft = FishingSystem.getFreeCastsLeft(state);
  const canCast = FishingSystem.canCast(state);

  const pond = `
    <div class="fishing-pond">
      <div class="pond-water">🎣</div>
      <div class="pond-info">
        <h3>宁静小湖</h3>
        <p class="muted-text">今天还有 <b>${freeLeft}</b> 次免费垂钓，之后每次消耗 5 金币买鱼饵</p>
        <p class="muted-text">累计垂钓 <b>${FishingSystem.getTotalCasts(state)}</b> 次 · 有概率钓到黄金锦鲤！</p>
        <button class="primary-action" onclick="window.castRodHandler()" ${!canCast ? 'disabled' : ''}>
          🎣 甩竿${freeLeft > 0 ? '（免费）' : '（5金币）'}
        </button>
      </div>
    </div>
  `;

  const catches = FishingSystem.fishes
    .map(fish => {
      const count = getCount(state, `fish_${fish.id}`);
      return `<div class="fish-card ${count > 0 ? 'owned' : ''}">
        <span class="fish-icon">${fish.icon}</span>
        <h4>${escapeHtml(fish.name)}</h4>
        <p class="muted-text">🪙${fish.sellPrice}</p>
        <div class="item-actions">
          <span class="fish-count">持有 ${count}</span>
          <button class="small-action" onclick="window.sellFishHandler(${fish.id})" ${count < 1 ? 'disabled' : ''}>卖出</button>
        </div>
      </div>`;
    })
    .join("");

  const stats = `
    <div class="button-row">
      <button class="ghost-action" onclick="window.sellFishAllHandler()">一键卖出全部鱼获</button>
    </div>
  `;

  return { pond, catches, stats };
}

/**
 * 渲染幸运转盘视图
 * @param {Object} state - 游戏状态
 * @returns {Object} { wheel, prizes, ticketCount, pityText }
 */
export function renderLotteryView(state) {
  if (!LotterySystem.isLotteryUnlocked(state)) {
    return {
      wheel: '<p class="lock-banner">🔒 需要 Lv.7 解锁幸运转盘</p>',
      prizes: '',
      ticketCount: 0,
      pityText: '',
    };
  }

  const ticketCount = getCount(state, "lottery_ticket");
  const pityLeft = LotterySystem.getSpinsToJackpot(state);

  const wheel = `
    <div class="lottery-panel">
      <div class="lottery-wheel">🎡</div>
      <div class="lottery-info">
        <h3>幸运转盘</h3>
        <p class="muted-text">持有抽奖券：<b>🎟️ ${ticketCount}</b> 张</p>
        <p class="muted-text">再抽 <b>${pityLeft}</b> 次必出「超级大奖」🏆</p>
        <p class="muted-text">累计已抽 ${state.lottery.spins} 次</p>
        <button class="primary-action" onclick="window.spinLotteryHandler()" ${ticketCount < 1 ? 'disabled' : ''}>
          🎟️ 抽！
        </button>
      </div>
    </div>
  `;

  const prizes = LotterySystem.lotteryPrizes
    .map(prize => `
      <div class="prize-item ${prize.id === 'jackpot' ? 'jackpot' : ''}">
        <span class="prize-icon">${prize.icon}</span>
        <h4>${escapeHtml(prize.name)}</h4>
        <p class="muted-text">${escapeHtml(formatRewards(prize.rewards))}</p>
      </div>
    `)
    .join("");

  return { wheel, prizes, ticketCount, pityText: '' };
}

/**
 * 渲染季节活动视图
 * @param {Object} state - 游戏状态
 * @returns {string} HTML字符串
 */
export function renderSeasonsView(state) {
  const events = SeasonsSystem.getSeasonalEvents(state);

  return events
    .map(event => {
      const statusText = {
        active: '<span class="season-tag active">进行中</span>',
        claimed: '<span class="season-tag claimed">已领取</span>',
        inactive: '<span class="season-tag inactive">未开放</span>',
      }[event.status];

      const canClaim = event.status === "active";

      const limited = event.seasonal
        ? `<p class="muted-text">限定内容：${[
            ...(event.seasonal.crops || []).map((c) => `${c.icon}${escapeHtml(c.name)}`),
            ...(event.seasonal.furniture || []).map((f) => `${f.icon}${escapeHtml(f.name)}`),
            ...(event.seasonal.orders || []).map((o) => `📋${escapeHtml(o.name)}`),
          ].join("、")}</p>`
        : "";

      return `<div class="season-card ${event.status}">
        <span class="season-icon">${event.icon}</span>
        <div class="season-info">
          <h4>${escapeHtml(event.name)} ${statusText}</h4>
          <p class="muted-text">${escapeHtml(event.description)}</p>
          <p class="muted-text">开放时间：${event.startMonth}月 - ${event.endMonth}月 · 礼物：${escapeHtml(formatRewards(event.rewards))}</p>
          ${limited}
        </div>
        <button class="primary-action" onclick="window.claimSeasonalHandler('${event.id}')" ${!canClaim ? 'disabled' : ''}>
          ${event.status === 'claimed' ? '已领取' : '领取礼物'}
        </button>
      </div>`;
    })
    .join("");
}

