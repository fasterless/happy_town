// 主入口文件 - 模块化版本
//
// 这里只负责三件事：状态生命周期、DOM 写入、把用户操作转发给对应系统模块。
// 所有 HTML 生成都在 ui/renderer.js，所有规则都在 systems/*，本文件不含游戏逻辑。
import { loadState, saveState, debouncedSave, clearStorage, exportSave, importSave, lastWishResult } from './core/storage.js';
import { addRewards } from './core/inventory.js';
import {
  fetchCloudState,
  forceSyncNow,
  getWorkerUrl,
  setWorkerUrl,
  isCloudEnabled,
  getMigrationCode,
  adoptMigrationCode,
} from './core/sync.js';

// 导入配置
import { crops, getCrop } from './config/crops.js';
import { levels } from './config/levels.js';
import { avatars } from './config/constants.js';

// 导入系统模块
import * as FarmSystem from './systems/farm.js';
import * as OrdersSystem from './systems/orders.js';
import * as HomeSystem from './systems/home.js';
import * as FriendsSystem from './systems/friends.js';
import * as CommunitySystem from './systems/community.js';
import * as ShopSystem from './systems/shop.js';
import * as TasksSystem from './systems/tasks.js';
import * as AchievementsSystem from './systems/achievements.js';
import * as WeatherSystem from './systems/weather.js';
import * as PetsSystem from './systems/pets.js';
import * as CraftingSystem from './systems/crafting.js';
import * as FishingSystem from './systems/fishing.js';
import * as MineSystem from './systems/mine.js';
import * as LotterySystem from './systems/lottery.js';
import * as SeasonsSystem from './systems/seasons.js';
import * as RanchSystem from './systems/ranch.js';
import * as CodexSystem from './systems/codex.js';
import * as MarketSystem from './systems/market.js';
import * as HybridSystem from './systems/hybrid.js';
import * as DishSystem from './systems/dishes.js';
import * as CommissionSystem from './systems/commissions.js';
import * as WishSystem from './systems/wishes.js';
import * as HelpSystem from './systems/helpBoard.js';
import * as RelationshipSystem from './systems/relationships.js';
import * as CharmSystem from './systems/charms.js';
import * as TalentSystem from './systems/talents.js';
import * as GreenhouseSystem from './systems/greenhouse.js';
import * as CafeSystem from './systems/cafe.js';
import * as StorySystem from './systems/story.js';
import * as ExploreSystem from './systems/explore.js';
import * as CosmeticSystem from './systems/cosmetics.js';
import * as TownProjectsSystem from './systems/townProjects.js';

// 导入 UI 层
import * as Renderer from './ui/renderer.js';
import { showToast } from './ui/toast.js';
import { createModal, confirm } from './ui/components.js';
import { initAudio, playSound, audioManager, toggleMusic } from './ui/audio.js';
import { startTutorial, shouldStartTutorial } from './ui/tutorial.js';

// 全局状态
let state;
let selectedCropId = crops[0].id;
let selectedFurnitureId = null;
let selectedAvatar = avatars[0];
let clockTimer = null;

// DOM 选择器简写
const $ = (id) => document.getElementById(id);

/** 把 HTML 写进指定容器（容器不存在时静默跳过） */
function setHtml(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html;
}

// ---------------------------------------------------------------------------
// 打磨反馈：收获粒子 / 金币飘字（纯 DOM 覆盖层，动画结束自动清理）
// ---------------------------------------------------------------------------

/** 在目标元素上方炸出几个粒子（emoji）向上飘散 */
function burstParticles(anchorEl, emojis = ['✨']) {
  if (!anchorEl) return;
  const rect = anchorEl.getBoundingClientRect();
  emojis.forEach((emoji, i) => {
    const dot = document.createElement('span');
    dot.className = 'harvest-particle';
    dot.textContent = emoji;
    dot.style.left = `${rect.left + rect.width / 2 + (i - 1) * 14}px`;
    dot.style.top = `${rect.top + rect.height / 3}px`;
    dot.style.position = 'fixed';
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 900);
  });
}

/** 在目标元素旁冒一个金币飘字 */
function floatCoinText(anchorEl, text = '') {
  if (!anchorEl || !text) return;
  const rect = anchorEl.getBoundingClientRect();
  const label = document.createElement('span');
  label.className = 'coin-float';
  label.textContent = text;
  label.style.left = `${rect.left + rect.width / 2 - 24}px`;
  label.style.top = `${rect.top - 8}px`;
  label.style.position = 'fixed';
  document.body.appendChild(label);
  setTimeout(() => label.remove(), 1100);
}

/**
 * 初始化游戏
 */
function init() {
  console.log('🎮 邻里小镇 v2.0 - 模块化版本');

  state = loadState();

  // 云端有更新（比如在另一台设备玩过）就取云端存档，之后照常启动
  if (isCloudEnabled() && state.user.created) {
    fetchCloudState().then(({ cloudState, usedCloud, reason }) => {
      if (usedCloud && cloudState) {
        state = importSave(JSON.stringify(cloudState)) || state;
        showToast('☁️ 已从云端恢复最新进度', 'success');
        renderAll();
        saveState(state);
      } else if (reason === 'device-conflict') {
        showToast('此用户ID已绑定其他设备，请到设置里输入迁移码接管', 'warning', 5000);
      }
    });
  }

  WeatherSystem.updateDailyWeather(state);
  initAudio(state.settings);

  if (!state.user.created) {
    showRoleModal();
    // 创建角色前也要绑好弹窗内的事件（进入小镇 / 回车提交），否则按钮点不动
    attachRoleEvents();
  } else {
    hideRoleModal();
    startGame();
  }
}

/**
 * 进入游戏主流程（创建角色后与老存档启动共用）
 */
function startGame() {
  attachEvents();
  renderAll();
  startClock();

  // 昨天在许愿池许的愿，今天上线就播报结算结果
  if (lastWishResult) {
    const { wish, luckLabel, rewardText } = lastWishResult;
    showToast(`⛲ 「${wish.name}」结算：${luckLabel}，获得${rewardText}`, 'success', 5000);
    playSound(luckLabel === '超大吉' ? 'levelup' : 'success');
  }

  // 新手引导完成后要把标记写回存档
  document.addEventListener('tutorialCompleted', () => {
    state.settings.tutorialCompleted = true;
    saveState(state);
  });

  if (shouldStartTutorial(state)) {
    startTutorial(state);
  }
}

/**
 * 绑定事件监听器
 */
function attachEvents() {
  // 导航事件
  document.querySelectorAll('.nav-button').forEach((btn) => {
    btn.addEventListener('click', () => {
      playSound('click');
      showView(btn.dataset.view);
    });
  });

  // 通用操作按钮
  $('collectAllButton')?.addEventListener('click', collectAllMature);
  $('plantAllButton')?.addEventListener('click', plantAllSelected);
  $('clearRoomButton')?.addEventListener('click', clearRoom);
  $('saveRoomButton')?.addEventListener('click', saveRoom);
  $('resetDailyButton')?.addEventListener('click', resetDaily);
  $('testRewardButton')?.addEventListener('click', giveTestRewards);
  $('claimAllCraftButton')?.addEventListener('click', claimAllCraft);
  $('collectAllRanchButton')?.addEventListener('click', collectAllRanch);
  attachRoleEvents();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(clockTimer);
      if (state) saveState(state);
    } else if (state?.user?.created) {
      startClock();
      renderFarmTick();
    }
  });

  window.addEventListener('beforeunload', () => {
    if (state) saveState(state);
  });

  markActiveNav('farmView');
}

/** 绑定创建角色弹窗内的事件（重复调用时用防重复绑定包装） */
function attachRoleEvents() {
  const button = $('createRoleButton');
  const input = $('nicknameInput');
  if (!button || button.dataset.bound === 'true') return;

  button.dataset.bound = 'true';
  button.addEventListener('click', createRole);
  input?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') createRole();
  });
}

/**
 * 切换视图
 */
function showView(viewId) {
  document.querySelectorAll('.view').forEach((view) => {
    view.classList.remove('active-view');
  });

  $(viewId)?.classList.add('active-view');
  markActiveNav(viewId);

  // 切页只画新页；顶栏状态不因切页变化，不需要重画
  renderViews(viewId);
}

/** 高亮底部导航当前项（复用 styles.css 里的 .active-nav） */
function markActiveNav(viewId) {
  document.querySelectorAll('.nav-button').forEach((btn) => {
    btn.classList.toggle('active-nav', btn.dataset.view === viewId);
  });
}

/** 当前是否停留在农场页 */
function isFarmViewActive() {
  return !!$('farmView')?.classList.contains('active-view');
}

// ---------------------------------------------------------------------------
// 创建角色
// ---------------------------------------------------------------------------

function showRoleModal() {
  const modal = $('roleModal');
  if (modal) {
    modal.classList.add('show');
    renderAvatarChoices();
  }
}

function hideRoleModal() {
  $('roleModal')?.classList.remove('show');
}

function renderAvatarChoices() {
  const container = $('avatarChoices');
  if (!container) return;

  container.innerHTML = avatars
    .map(
      (av) =>
        `<span class="avatar-choice ${av === selectedAvatar ? 'selected' : ''}" data-avatar="${av}">${av}</span>`
    )
    .join('');

  container.querySelectorAll('.avatar-choice').forEach((choice) => {
    choice.addEventListener('click', () => {
      selectedAvatar = choice.dataset.avatar;
      renderAvatarChoices();
    });
  });
}

function createRole() {
  const nickname = $('nicknameInput')?.value.trim();

  if (!nickname || nickname.length < 2 || nickname.length > 12) {
    showToast('昵称需要2-12个字符', 'error');
    playSound('error');
    return;
  }

  state.user.nickname = nickname;
  state.user.avatar = selectedAvatar;
  state.user.created = true;

  hideRoleModal();
  startGame();
  saveState(state);

  playSound('success');
  showToast(`欢迎来到邻里小镇，${nickname}！`, 'success');
}

// ---------------------------------------------------------------------------
// 渲染
// ---------------------------------------------------------------------------

/** 每秒只刷新正在生长的地块，避免整表 innerHTML 把按钮焦点冲掉 */
function startClock() {
  clearInterval(clockTimer);
  clockTimer = setInterval(renderFarmTick, 1000);
}

function renderFarmTick() {
  // 料理增益倒计时：只在料理页刷新剩余秒数
  const buffCountdown = $('buffCountdown');
  if (buffCountdown) {
    const remain = DishSystem.getBuffRemainingSeconds(state);
    buffCountdown.textContent = formatTickTime(remain);
    if (remain === 0) renderViews('dishesView', 'chrome');
  }

  // 限时订单到期结算 + 订单页倒计时（不挑页面，开销极小）
  if (state?.orders?.rush) {
    const justExpired = OrdersSystem.settleExpiredRush(state);
    if (justExpired) {
      showToast('⌛ 限时订单超时了…明天再来挑战吧', 'error');
      playSound('error');
      renderViews('ordersView');
    } else {
      const countdown = $('rushCountdown');
      if (countdown) {
        countdown.textContent = formatTickTime(OrdersSystem.getRushRemainingSeconds(state));
      }
    }
  }

  if (!isFarmViewActive()) return;

  const grid = $('farmGrid');
  if (!grid) return;

  let matured = false;
  state.farm.plots.forEach((plot, index) => {
    if (!plot) return;
    const wasMature = plot._wasMature;
    const isMature = FarmSystem.isPlotMature(plot);
    const cell = grid.querySelector(`[data-plot="${index}"]`);
    if (!cell) return;

    if (isMature) {
      if (!wasMature) {
        cell.outerHTML = Renderer.renderPlotCell(state, index, selectedCropId);
        matured = true;
        // 新成熟的格子弹一下 + 撒星屑
        const fresh = grid.querySelector(`[data-plot="${index}"]`);
        if (fresh) {
          fresh.classList.add('pop');
          setTimeout(() => fresh.classList.remove('pop'), 400);
          burstParticles(fresh, ['✨', '✨', '🌟']);
        }
      }
      plot._wasMature = true;
      return;
    }

    plot._wasMature = false;
    const remaining = FarmSystem.getRemainingSeconds(plot);
    const growTime = FarmSystem.getPlotGrowTime(plot);
    const percent = growTime ? ((growTime - remaining) / growTime) * 100 : 100;
    const status = cell.querySelector('.crop-status');
    const fill = cell.querySelector('.progress-fill');
    const icon = cell.querySelector('.crop-icon');
    if (status) status.textContent = formatTickTime(remaining);
    if (fill) fill.style.width = `${percent}%`;
    const stageIcon = FarmSystem.getStageIcon(FarmSystem.getCropGrowthStage(plot));
    if (icon && stageIcon) icon.textContent = stageIcon;
  });

  if (matured) playSound('success');
}

function formatTickTime(seconds) {
  if (seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * 按需渲染层
 *
 * 每个视图一个渲染函数；runAction 之类只重画真正受影响的视图，
 * 避免一次点击触发 14 个视图全量 innerHTML 重建。
 */
function renderChrome() {
  setHtml('topbar', Renderer.renderTopbar(state));
  setHtml('notice', Renderer.renderNotice(state));
  setHtml('miniInventory', Renderer.renderMiniInventory(state));
}

function renderFarmView() {
  const farm = Renderer.renderFarmView(state, selectedCropId);
  setHtml('expansionPanel', farm.expansion);
  setHtml('farmGrid', farm.grid);
  setHtml('seedList', farm.seeds);
  setHtml('sellBarnList', farm.sellBarn);
  setHtml('marketBoard', farm.market);
  setHtml('greenhousePanel', farm.greenhouse);
}

function renderOrdersView() {
  setHtml('ordersList', Renderer.renderOrdersView(state));
}

function renderHomeView() {
  const home = Renderer.renderHomeView(state, selectedFurnitureId);
  setHtml('roomGrid', home.layout);
  setHtml('furnitureList', home.furniture);
  setHtml('roomScore', home.score);
}

function renderFriendsView() {
  setHtml('friendsList', Renderer.renderFriendsView(state));
}

function renderCommunityView() {
  setHtml('communityContent', Renderer.renderCommunityView(state));
}

function renderShopView() {
  setHtml('shopList', Renderer.renderShopView(state));
}

function renderTasksView() {
  const tasks = Renderer.renderTasksView(state);
  setHtml('tasksList', tasks.tasks);
  setHtml('activeBoxes', tasks.boxes);
  const scoreDisplay = $('activeScoreDisplay');
  if (scoreDisplay) scoreDisplay.textContent = tasks.activeScore;
}

function renderAchievementsView() {
  setHtml('achievementsList', Renderer.renderAchievementsView(state));
  const achievementStats = $('achievementStats');
  if (achievementStats) achievementStats.textContent = Renderer.renderAchievementStats(state);
}

function renderPetsView() {
  setHtml('petsList', Renderer.renderPetsView(state));
}

function renderCraftingView() {
  const crafting = Renderer.renderCraftingView(state);
  setHtml('craftQueue', crafting.queue);
  setHtml('recipeList', crafting.recipes);
}

function renderHybridView() {
  setHtml('hybridContent', Renderer.renderHybridView(state));
}

function renderFishingView() {
  const fishing = Renderer.renderFishingView(state);
  setHtml('fishingPond', fishing.pond);
  setHtml('fishCollection', fishing.catches);
  setHtml('fishingActions', fishing.stats);
}

function renderMineView() {
  const mine = Renderer.renderMineView(state);
  setHtml('minePit', mine.pit);
  setHtml('mineTrove', mine.trove);
  setHtml('mineUpgrade', mine.upgrade);
  setHtml('charmPanel', Renderer.renderCharmsPanel(state));
}

function renderLotteryView() {
  const lottery = Renderer.renderLotteryView(state);
  setHtml('lotteryPanel', lottery.wheel);
  setHtml('prizeList', lottery.prizes);
}

function renderSeasonsView() {
  setHtml('seasonsList', Renderer.renderSeasonsView(state));
}

function renderRanchView() {
  setHtml('ranchList', Renderer.renderRanchView(state));
}

function renderCodexView() {
  setHtml('codexContent', Renderer.renderCodexView(state));
}

function renderDishesView() {
  setHtml('dishesContent', Renderer.renderDishesView(state));
}

function renderCommissionView() {
  setHtml('commissionContent', Renderer.renderCommissionView(state));
}

function renderWishView() {
  setHtml('wishContent', Renderer.renderWishView(state));
}

function renderTalentsView() {
  setHtml('talentsContent', Renderer.renderTalentsView(state));
}

function renderExploreView() {
  setHtml("exploreContent", Renderer.renderExploreView(state));
}

function renderStoryView() {
  setHtml('storyContent', Renderer.renderStoryView(state));
}

function renderAdminView() {
  setHtml('statsPanel', Renderer.renderAdminView(state));
}

/** 视表名 → 渲染函数 */
const VIEW_RENDERERS = {
  chrome: renderChrome,
  farmView: renderFarmView,
  ordersView: renderOrdersView,
  homeView: renderHomeView,
  friendsView: renderFriendsView,
  communityView: renderCommunityView,
  shopView: renderShopView,
  tasksView: renderTasksView,
  achievementsView: renderAchievementsView,
  petsView: renderPetsView,
  craftingView: renderCraftingView,
  hybridView: renderHybridView,
  fishingView: renderFishingView,
  mineView: renderMineView,
  lotteryView: renderLotteryView,
  seasonsView: renderSeasonsView,
  ranchView: renderRanchView,
  codexView: renderCodexView,
  dishesView: renderDishesView,
  commissionView: renderCommissionView,
  wishView: renderWishView,
  talentsView: renderTalentsView,
  exploreView: renderExploreView,
  storyView: renderStoryView,
  adminView: renderAdminView,
};

/** 当前激活的视图 id */
function activeViewId() {
  return document.querySelector('.view.active-view')?.id || 'farmView';
}

/** 只渲染指定的若干视图（'chrome' 表示顶栏/公告/背包） */
function renderViews(...viewIds) {
  viewIds.forEach((id) => {
    const render = VIEW_RENDERERS[id];
    if (render) render();
  });
  debouncedSave(state);
}

/** 首次进入 / 存档导入后用：全量渲染一次 */
function renderAll() {
  Object.values(VIEW_RENDERERS).forEach((render) => render());
  debouncedSave(state);
}

// ---------------------------------------------------------------------------
// 操作转发
// ---------------------------------------------------------------------------

/**
 * 执行一次会改变状态的操作，统一处理提示音、成就检查、升级播报和重渲染
 *
 * @param {Function} fn - 返回 { success, message } 的系统函数调用
 * @param {string} sound - 成功时播放的音效名
 * @returns {Object} 系统函数的原始返回值
 */
function runAction(fn, sound = 'success') {
  const levelBefore = state.wallet.level;
  const result = fn();

  if (!result || !result.success) {
    showToast(result?.message || '操作失败', 'error');
    playSound('error');
    return result;
  }

  const messages = [result.message];

  // 成就奖励里可能含经验，所以要先结算成就再判断是否升级
  const unlocked = AchievementsSystem.checkAchievements(state);
  if (unlocked.length) {
    messages.push(`🏆 达成成就「${unlocked.map((a) => a.name).join('、')}」`);
  }

  if (state.wallet.level > levelBefore) {
    const reached = levels.find((lv) => lv.level === state.wallet.level);
    messages.push(`🎉 升级到 Lv.${state.wallet.level}${reached ? `，解锁${reached.unlock}` : ''}`);
    playSound('levelup');
  } else {
    playSound(sound);
  }

  showToast(messages.join(' · '), 'success', messages.length > 1 ? 3600 : 2300);
  renderViews('chrome', activeViewId());
  return result;
}

// 农场
window.selectCropHandler = (cropId) => {
  const crop = getCrop(cropId); // 含季节限定与杂交作物
  if (!crop) return;
  if (state.wallet.level < crop.unlockLevel) {
    showToast(`需要Lv.${crop.unlockLevel}解锁${crop.name}`, 'error');
    playSound('error');
    return;
  }
  selectedCropId = cropId;
  playSound('click');
  renderViews('farmView');
};

window.plantCropHandler = (index) => runAction(() => FarmSystem.plantCrop(state, index, selectedCropId), 'plant');

window.harvestCropHandler = (index) => {
  const cell = document.querySelector(`#farmGrid [data-plot="${index}"]`);
  const crop = cell?.querySelector('.crop-icon')?.textContent;
  const result = runAction(() => FarmSystem.harvestCrop(state, index), 'harvest');
  if (result?.success) {
    burstParticles(cell, [crop && crop !== '✨' ? crop : '🌿', '✨', '🍃']);
  }
};

function collectAllMature() {
  runAction(() => FarmSystem.harvestAllMature(state), 'harvest');
  // 所有成熟格子一起撒星屑
  document.querySelectorAll('#farmGrid .plot.mature').forEach((cell) => {
    burstParticles(cell, ['✨', '🌿']);
  });
}

function plantAllSelected() {
  runAction(() => FarmSystem.plantAll(state, selectedCropId), 'plant');
}

// 温室：种到今天还空着的第一块玻璃地
window.plantGreenhouseHandler = (cropId) => {
  const used = new Set(GreenhouseSystem.getGreenhouseUsedToday(state));
  const index = Array.from({ length: GreenhouseSystem.GREENHOUSE_PLOTS }, (_, offset) => (
    GreenhouseSystem.GREENHOUSE_FIRST_INDEX + offset
  )).find((slot) => state.farm.plots[slot] === null && !used.has(slot));
  if (index === undefined) {
    showToast('温室今天的地都种过了，明天再来', 'error');
    playSound('error');
    return;
  }
  runAction(() => FarmSystem.plantCrop(state, index, cropId), 'plant');
};

// 扩建 / 卖仓 / 加速券
window.buyExpansionHandler = () => runAction(() => FarmSystem.buyExpansion(state), 'levelup');
window.sellCropHandler = (itemKey) => {
  const btn = document.querySelector(`.sell-row[data-key="${itemKey}"] button`);
  const result = runAction(() => FarmSystem.sellCrop(state, itemKey), 'coin');
  if (result?.success && btn) {
    const gained = /获得🪙(\d+)/.exec(result.message);
    floatCoinText(btn, gained ? `+🪙${gained[1]}` : '+🪙');
  }
};
window.sellAllCropsHandler = () => {
  const keys = Object.entries(state.inventory)
    .filter(([key, count]) => count > 0 && /^(crop|gold)_\d+$/.test(key))
    .map(([key]) => key);
  if (!keys.length) {
    showToast('背包里没有可出售的作物', 'error');
    playSound('error');
    return;
  }
  runAction(() => keys.reduce((acc, key) => FarmSystem.sellCrop(state, key), null), 'coin');
};
window.speedUpPlotHandler = (index) => runAction(() => FarmSystem.speedUpPlot(state, index), 'levelup');

// 小镇集市
window.sellOnMarketHandler = (cropId) => {
  const row = document.querySelector(`.market-row button[onclick="window.sellOnMarketHandler(${cropId})"]`);
  const result = runAction(() => MarketSystem.sellOnMarket(state, cropId), 'coin');
  if (result?.success && row) {
    const gained = /共得🪙(\d+)/.exec(result.message);
    floatCoinText(row, gained ? `+🪙${gained[1]}` : '+🪙');
  }
};

// 订单
window.completeOrderHandler = (index) => {
  const card = document.querySelectorAll('.order-card')[index];
  const btn = card?.querySelector('.primary-action');
  const result = runAction(() => OrdersSystem.completeOrder(state, index), 'coin');
  if (result?.success && btn) {
    const gained = /获得(\d+)/.exec(result.message);
    floatCoinText(btn, gained ? `+🪙${gained[1]}` : '+🪙');
    burstParticles(btn, ['🪙', '🪙']);
  }
};
window.refreshOrderHandler = (index) => runAction(() => OrdersSystem.refreshOrder(state, index), 'click');
window.acceptRushHandler = () => runAction(() => OrdersSystem.acceptRushOrder(state), 'levelup');
window.reserveOrderHandler = () => {
  const select = $('reserveOrderSelect');
  const orderId = Number(select?.value);
  if (!orderId) {
    showToast('请选择一个要预购的订单', 'error');
    playSound('error');
    return;
  }
  runAction(() => OrdersSystem.reserveOrder(state, orderId), 'coin');
};

// 家园
window.buyFurnitureHandler = (furnitureId) => runAction(() => HomeSystem.buyFurniture(state, furnitureId), 'buy');

window.selectFurnitureHandler = (furnitureId) => {
  selectedFurnitureId = selectedFurnitureId === furnitureId ? null : furnitureId;
  playSound('click');
  renderViews('homeView');
};

window.placeFurnitureHandler = (layoutIndex) => {
  if (selectedFurnitureId === null) {
    showToast('请先在家具商店选择要摆放的家具', 'error');
    playSound('error');
    return;
  }

  const result = runAction(() => HomeSystem.placeFurniture(state, layoutIndex, selectedFurnitureId), 'plant');

  // 背包里这件家具用完了就自动退出摆放模式
  if (result?.success && HomeSystem.getFurnitureStock(state, selectedFurnitureId) < 1) {
    selectedFurnitureId = null;
    renderViews('homeView');
  }
};

window.rotateFurnitureHandler = (layoutIndex) => runAction(() => HomeSystem.rotateFurniture(state, layoutIndex), 'click');
window.removeFurnitureHandler = (layoutIndex) => runAction(() => HomeSystem.removeFurniture(state, layoutIndex), 'click');

function clearRoom() {
  confirm('确定收回房间里所有家具吗？', () => {
    runAction(() => HomeSystem.clearRoom(state), 'click');
  });
}

function saveRoom() {
  runAction(() => HomeSystem.saveRoom(state));
}

// 好友
window.addFriendHandler = (friendId) => runAction(() => FriendsSystem.addFriend(state, friendId));
window.visitFriendHandler = (friendId) => runAction(() => FriendsSystem.visitFriend(state, friendId));
window.likeFriendHandler = (friendId) => runAction(() => FriendsSystem.likeFriend(state, friendId));
window.waterFriendHandler = (friendId) => runAction(() => FriendsSystem.waterFriendPlot(state, friendId), 'water');
window.recallMemoryHandler = (friendId) => runAction(() => RelationshipSystem.recallNeighborMemory(state, friendId));

// 邻居求助板
window.fulfillHelpHandler = (index) => runAction(() => HelpSystem.fulfillRequest(state, index), 'buy');
window.rerollHelpHandler = () => runAction(() => HelpSystem.rerollRequests(state), 'click');

// 社区
window.joinCommunityHandler = () => runAction(() => CommunitySystem.joinCommunity(state));

window.donateHandler = (itemKey) => {
  const input = $(`donate-${itemKey}`);
  const amount = Math.floor(Number(input?.value));

  if (!Number.isFinite(amount) || amount < 1) {
    showToast('请输入有效的捐献数量', 'error');
    playSound('error');
    return;
  }

  const stageBefore = state.community.stage;
  const result = runAction(() => CommunitySystem.donateToCommunity(state, itemKey, amount), 'coin');

  if (result?.success && state.community.stage > stageBefore) {
    playSound('levelup');
    showToast(`⛲ 第${stageBefore}阶段完工！奖励已发放`, 'success', 3200);
  }
};

window.contributeTownProjectHandler = (projectId, itemKey) => {
  const input = $(`project-${projectId}-${itemKey}`);
  const amount = Math.floor(Number(input?.value));
  runAction(() => TownProjectsSystem.contributeToTownProject(state, projectId, itemKey, amount), 'coin');
};

window.inviteTownProjectNeighborHandler = (projectId) => {
  const friendId = $(`project-invite-${projectId}`)?.value;
  runAction(() => TownProjectsSystem.inviteNeighborToTownProject(state, projectId, friendId));
};

// 商城
window.buyGoodsHandler = (goodsId) => runAction(() => ShopSystem.buyGoods(state, goodsId), 'buy');
window.buyFriendGoodsHandler = (goodsId) => runAction(() => ShopSystem.buyFriendGoods(state, goodsId), 'buy');
window.claimMonthlyCardHandler = () => runAction(() => ShopSystem.claimMonthlyCard(state), 'coin');

// 任务
window.claimTaskHandler = (taskId) => runAction(() => TasksSystem.claimTask(state, taskId), 'coin');
window.claimBoxHandler = (score) => runAction(() => TasksSystem.claimActiveBox(state, score), 'coin');

function resetDaily() {
  runAction(() => TasksSystem.resetDaily(state), 'click');
}

// 宠物
window.buyPetHandler = (petId) => runAction(() => PetsSystem.buyPet(state, petId), 'buy');
window.setActivePetHandler = (petId) => runAction(() => PetsSystem.setActivePet(state, petId), 'click');
window.feedPetHandler = (petId) => runAction(() => PetsSystem.feedPet(state, petId), 'success');
window.claimPetGiftHandler = () => runAction(() => PetsSystem.claimPetDailyGift(state), 'harvest');

// 加工坊
window.startCraftingHandler = (recipeId) => runAction(() => CraftingSystem.startCrafting(state, recipeId), 'plant');
window.claimCraftingHandler = (queueIndex) => runAction(() => CraftingSystem.claimCrafting(state, queueIndex), 'harvest');
window.cancelCraftingHandler = (queueIndex) => runAction(() => CraftingSystem.cancelCrafting(state, queueIndex), 'click');

// 杂交工坊
window.crossbreedHandler = (recipeId) => {
  const result = runAction(() => HybridSystem.crossbreed(state, recipeId), 'levelup');
  // 首次合成点亮图谱，农场种子铺里的持有数也要跟着刷新
  if (result?.success) renderViews('farmView');
};

function claimAllCraft() {
  runAction(() => CraftingSystem.claimAllCrafting(state), 'harvest');
}

// 湖畔钓鱼
window.castRodHandler = () => runAction(() => FishingSystem.castRod(state), 'splash');
window.sellFishHandler = (fishId) => runAction(() => FishingSystem.sellFish(state, fishId), 'coin');
window.sellFishAllHandler = () => runAction(() => FishingSystem.sellAllFish(state), 'coin');

// 后山矿洞
window.mineDigHandler = () => {
  const result = runAction(() => MineSystem.mineDig(state), 'harvest');
  if (result?.success) {
    const btn = document.querySelector('#minePit .primary-action');
    if (btn) burstParticles(btn, [result.drop?.lucky ? '💎' : '🪨', '✨', '⛏️']);
  }
};
window.upgradePickaxeHandler = () => runAction(() => MineSystem.upgradePickaxe(state), 'levelup');
window.sellOreHandler = (key) => {
  const result = runAction(() => MineSystem.sellOre(state, key), 'coin');
  if (result?.success) {
    const btn = document.querySelector(`#mineTrove .mine-card button[onclick="window.sellOreHandler('${key}')"]`);
    const gained = /获得🪙(\d+)/.exec(result.message);
    if (btn) floatCoinText(btn, gained ? `+🪙${gained[1]}` : '+🪙');
  }
};
window.sellOreAllHandler = () => runAction(() => MineSystem.sellAllOre(state), 'coin');

// 宝石护符
window.craftCharmHandler = (charmId) => runAction(() => CharmSystem.craftCharm(state, charmId), 'levelup');
window.equipCharmHandler = (charmId) => runAction(() => CharmSystem.equipCharm(state, charmId), 'success');
window.unequipCharmHandler = () => runAction(() => CharmSystem.unequipCharm(state), 'click');

// 天赋树
window.unlockTalentHandler = (nodeId) => runAction(() => TalentSystem.unlockTalent(state, nodeId), 'levelup');

// 小镇剧情
window.claimChapterHandler = () => runAction(() => StorySystem.claimChapter(state), 'levelup');
window.chooseStoryEndingHandler = (endingId) => runAction(() => StorySystem.chooseStoryEnding(state, endingId));

// 称号与头像框
window.equipTitleHandler = (titleId) => runAction(() => CosmeticSystem.equipTitle(state, titleId), 'success');
window.clearTitleHandler = () => runAction(() => CosmeticSystem.clearTitle(state), 'click');
window.equipFrameHandler = (frameId) => runAction(() => CosmeticSystem.equipFrame(state, frameId), 'success');

// 幸运转盘
window.spinLotteryHandler = () => {
  playSound('spin');
  const result = runAction(() => LotterySystem.spinLottery(state), 'levelup');
  // 抽中大奖时多给一个特效提示
  if (result?.success && result.prize?.id === 'jackpot') {
    showToast('🎊🎊🎊 恭喜抽中超级大奖！', 'success', 4200);
  }
};

// 季节活动
window.claimSeasonalHandler = (eventId) => runAction(() => SeasonsSystem.claimSeasonalReward(state, eventId), 'levelup');
window.claimFestivalTaskHandler = (eventId, taskId) => runAction(() => SeasonsSystem.claimFestivalTask(state, eventId, taskId), 'coin');
window.claimFestivalRewardHandler = (eventId) => runAction(() => SeasonsSystem.claimFestivalReward(state, eventId), 'levelup');
window.explorePlaceHandler = (placeId) => runAction(() => ExploreSystem.explorePlace(state, placeId));

// 养殖栏
window.buyAnimalHandler = (animalId) => runAction(() => RanchSystem.buyAnimal(state, animalId), 'buy');
window.feedAnimalHandler = (animalId) => runAction(() => RanchSystem.feedAnimal(state, animalId), 'plant');
window.collectProduceHandler = (animalId) => runAction(() => RanchSystem.collectProduce(state, animalId), 'harvest');

// 图鉴
window.claimCodexTierHandler = (tierId) => runAction(() => CodexSystem.claimCodexTier(state, tierId), 'levelup');

// 料理铺
window.cookDishHandler = (dishId) => runAction(() => DishSystem.cookDish(state, dishId), 'buy');
window.serveDishHandler = (dishId) => runAction(() => DishSystem.serveDish(state, dishId), 'levelup');
window.serveGuestHandler = (index) => runAction(() => CafeSystem.serveGuest(state, index), 'coin');

// 小镇委托榜
window.completeCommissionHandler = (jobId) => runAction(() => CommissionSystem.completeCommission(state, jobId), 'coin');
window.rerollCommissionHandler = () => runAction(() => CommissionSystem.rerollCommissions(state), 'click');

// 许愿池
window.makeWishHandler = (wishId) => runAction(() => WishSystem.makeWish(state, wishId), 'levelup');
window.rerollWishHandler = () => runAction(() => WishSystem.rerollWishes(state), 'click');

function collectAllRanch() {
  runAction(() => RanchSystem.collectAllProduce(state), 'harvest');
}

// ---------------------------------------------------------------------------
// 后台 / 设置
// ---------------------------------------------------------------------------

function giveTestRewards() {
  addRewards(state, {
    coin: 3000,
    diamond: 300,
    wood: 100,
    stone: 100,
    cloth: 100,
  });
  playSound('coin');
  showToast('已发放测试补偿');
  renderViews('chrome', 'adminView');
}

window.toggleSoundHandler = () => {
  const enabled = audioManager.toggle();
  state.settings.soundEnabled = enabled;
  saveState(state);
  if (enabled) playSound('click');
  showToast(enabled ? '音效已开启' : '音效已关闭');
  renderViews('chrome');
};

window.toggleMusicHandler = () => {
  const enabled = toggleMusic();
  state.settings.musicEnabled = enabled;
  saveState(state);
  showToast(enabled ? '🎵 背景音乐已开启' : '🎵 背景音乐已关闭');
};

window.setVolumeHandler = (value) => {
  const volume = Number(value);
  audioManager.setVolume(volume);
  state.settings.volume = audioManager.volume;
  debouncedSave(state);
  playSound('click');
};

window.exportSaveHandler = () => {
  createModal({
    title: '导出存档',
    content: `
      <p class="muted-text">复制下面的 JSON 保存到别处，之后可以用「导入存档」恢复。</p>
      <textarea id="exportSaveText" class="save-textarea" rows="10" readonly>${exportSave(state)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')}</textarea>
    `,
    showCancel: false,
    confirmText: '复制并关闭',
    onConfirm: () => {
      const textarea = $('exportSaveText');
      if (!textarea) return;
      textarea.select();
      navigator.clipboard
        ?.writeText(textarea.value)
        .then(() => showToast('存档已复制到剪贴板', 'success'))
        .catch(() => showToast('复制失败，请手动选中复制', 'warning'));
    },
  });
};

window.importSaveHandler = () => {
  createModal({
    title: '导入存档',
    content: `
      <p class="muted-text">粘贴之前导出的 JSON，导入后会覆盖当前进度。</p>
      <textarea id="importSaveText" class="save-textarea" rows="10" placeholder="粘贴存档 JSON"></textarea>
    `,
    confirmText: '导入',
    onConfirm: () => {
      const text = $('importSaveText')?.value.trim();
      if (!text) {
        showToast('没有内容可导入', 'error');
        playSound('error');
        return;
      }

      const imported = importSave(text);
      if (!imported) {
        showToast('存档格式不正确', 'error');
        playSound('error');
        return;
      }

      state = imported;
      saveState(state);
      initAudio(state.settings);
      selectedCropId = crops[0].id;
      selectedFurnitureId = null;
      playSound('success');
      showToast('存档已导入', 'success');
      renderAll();
    },
  });
};

window.resetGameHandler = () => {
  confirm('清空后无法恢复，确定要重新开始吗？', () => {
    clearStorage();
    clearInterval(clockTimer);
    window.location.reload();
  });
};

// ---------------------------------------------------------------------------
// 云同步（Cloudflare Worker + KV）
// ---------------------------------------------------------------------------

window.cloudConfigHandler = () => {
  createModal({
    title: '云端同步设置',
    content: `
      <p class="muted-text">站点部署在 Cloudflare Pages 时会<b>自动启用</b>云同步（接口和站点同源）。
      下面的地址仅在特殊情况下需要填写（例如站点和存档接口不在同一个域名）。</p>
      <p class="muted-text">留空 = 使用自动检测的地址；想彻底关闭云同步，请到 Cloudflare 控制台删除该 Pages 项目的
      KV 绑定。本地存档不受任何影响。</p>
      <input id="cloudUrlInput" class="nickname-input" type="url"
        placeholder="（自动）https://你的站点.pages.dev/api"
        value="${getWorkerUrl().replace(/&/g, '&').replace(/</g, '<').replace(/"/g, '"')}">
    `,
    confirmText: '保存',
    onConfirm: () => {
      const url = $('cloudUrlInput')?.value.trim() || '';
      if (url && !/^https:\/\/.+/.test(url)) {
        showToast('地址需要以 https:// 开头', 'error');
        playSound('error');
        return;
      }
      setWorkerUrl(url.replace(/\/+$/, ''));
      showToast('云端同步设置已保存', 'success');
      renderViews('adminView');
    },
  });
};

window.cloudSyncNowHandler = async () => {
  if (!isCloudEnabled()) {
    showToast('请先在「云同步设置」里填入 Worker 地址', 'warning');
    return;
  }
  const result = await forceSyncNow(state);
  showToast(result.message, result.ok ? 'success' : 'error');
  playSound(result.ok ? 'success' : 'error');
  renderViews('adminView');
};

window.cloudMigrationHandler = () => {
  const enabled = isCloudEnabled();
  createModal({
    title: '设备迁移',
    content: enabled
      ? `
        <p class="muted-text">换设备时：在新设备上玩到创建角色这一步，然后把下面的迁移码输入到新设备的此弹窗里。</p>
        <textarea id="migrationCodeText" class="save-textarea" rows="3" readonly>${getMigrationCode()}</textarea>
        <p class="muted-text">在<b>新设备</b>上输入迁移码接管云端存档：</p>
        <input id="migrationCodeInput" class="nickname-input" placeholder="粘贴 48 位迁移码">
      `
      : '<p class="muted-text">先在「云同步设置」里开启云同步，才能使用设备迁移。</p>',
    confirmText: enabled ? '接管' : '关闭',
    onConfirm: () => {
      if (!enabled) return;
      const code = $('migrationCodeInput')?.value.trim();
      if (!code) {
        showToast('请粘贴旧设备的迁移码', 'warning');
        return;
      }
      const result = adoptMigrationCode(code);
      showToast(result.message, result.ok ? 'success' : 'error');
      playSound(result.ok ? 'success' : 'error');
      if (result.ok) setTimeout(() => window.location.reload(), 1200);
    },
  });
};

// 将createRole绑定到全局
window.createRole = createRole;

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// 导出给控制台调试使用
window.gameState = () => state;
window.saveGame = () => saveState(state);
