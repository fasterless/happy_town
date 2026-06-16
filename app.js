const STORAGE_KEY = "neighbor-town-mvp-state-v1";

const crops = [
  { id: 1001, name: "小麦", icon: "🌾", unlockLevel: 1, growTime: 30, seedPrice: 2, harvestCount: 2, sellPrice: 2 },
  { id: 1002, name: "番茄", icon: "🍅", unlockLevel: 2, growTime: 120, seedPrice: 5, harvestCount: 2, sellPrice: 6 },
  { id: 1003, name: "草莓", icon: "🍓", unlockLevel: 4, growTime: 300, seedPrice: 10, harvestCount: 2, sellPrice: 12 },
  { id: 1004, name: "玉米", icon: "🌽", unlockLevel: 6, growTime: 600, seedPrice: 18, harvestCount: 2, sellPrice: 22 },
  { id: 1005, name: "南瓜", icon: "🎃", unlockLevel: 8, growTime: 1800, seedPrice: 40, harvestCount: 2, sellPrice: 50 },
];

const orders = [
  { id: 2001, name: "面包店订单", unlockLevel: 1, requires: [{ item: "crop_1001", count: 4 }], coin: 20, exp: 5, type: "普通" },
  { id: 2002, name: "餐厅订单", unlockLevel: 2, requires: [{ item: "crop_1002", count: 3 }], coin: 35, exp: 8, type: "普通" },
  { id: 2003, name: "水果摊订单", unlockLevel: 4, requires: [{ item: "crop_1003", count: 3 }], coin: 60, exp: 12, type: "普通" },
  { id: 2004, name: "农贸市场订单", unlockLevel: 6, requires: [{ item: "crop_1004", count: 4 }], coin: 100, exp: 18, type: "普通" },
  { id: 2005, name: "南瓜派订单", unlockLevel: 8, requires: [{ item: "crop_1005", count: 2 }], coin: 130, exp: 25, type: "特殊" },
  { id: 2006, name: "镇长早餐篮", unlockLevel: 1, requires: [{ item: "crop_1001", count: 2 }], coin: 12, exp: 3, type: "新手" },
];

const levels = [
  { level: 1, needExp: 0, unlock: "小麦、基础农田、基础房间" },
  { level: 2, needExp: 30, unlock: "番茄" },
  { level: 3, needExp: 80, unlock: "木桌、木椅" },
  { level: 4, needExp: 150, unlock: "草莓" },
  { level: 5, needExp: 250, unlock: "好友拜访" },
  { level: 6, needExp: 400, unlock: "玉米" },
  { level: 7, needExp: 600, unlock: "每日任务" },
  { level: 8, needExp: 850, unlock: "南瓜" },
  { level: 9, needExp: 1100, unlock: "基础商城" },
  { level: 10, needExp: 1500, unlock: "社区系统" },
  { level: 12, needExp: 2200, unlock: "社区捐献" },
  { level: 15, needExp: 3500, unlock: "公共建筑建设" },
  { level: 20, needExp: 7000, unlock: "满级奖励" },
];

const furniture = [
  { id: 3001, name: "木椅", icon: "🪑", category: "椅子", priceType: "coin", price: 80, unlockLevel: 1 },
  { id: 3002, name: "木桌", icon: "🪵", category: "桌子", priceType: "coin", price: 120, unlockLevel: 1 },
  { id: 3003, name: "花瓶", icon: "🏺", category: "装饰", priceType: "coin", price: 160, unlockLevel: 2 },
  { id: 3004, name: "软床", icon: "🛏️", category: "床", priceType: "coin", price: 260, unlockLevel: 3 },
  { id: 3005, name: "地毯", icon: "▩", category: "装饰", priceType: "diamond", price: 30, unlockLevel: 3 },
  { id: 3006, name: "咖啡桌", icon: "☕", category: "桌子", priceType: "diamond", price: 45, unlockLevel: 5 },
  { id: 3007, name: "田园沙发", icon: "🛋️", category: "椅子", priceType: "diamond", price: 80, unlockLevel: 7 },
  { id: 3008, name: "欢迎地毯", icon: "🏵️", category: "活动", priceType: "diamond", price: 120, unlockLevel: 1 },
];

const shopGoods = [
  { id: 4001, name: "小镇种子箱", icon: "📦", category: "礼包", priceType: "coin", price: 60, rewards: { crop_1001: 6, crop_1002: 2 } },
  { id: 4002, name: "新手礼包", icon: "🎁", category: "礼包", priceType: "rmb", price: 6, rewards: { diamond: 100, coin: 3000, f_3008: 1, speed_ticket: 5 } },
  { id: 4003, name: "普通月卡", icon: "📅", category: "月卡", priceType: "rmb", price: 18, rewards: { diamond: 300 }, monthlyCard: true },
  { id: 4004, name: "钻石小袋", icon: "💎", category: "充值", priceType: "rmb", price: 12, rewards: { diamond: 180 } },
  { id: 4005, name: "咖啡小屋套装", icon: "☕", category: "家具", priceType: "diamond", price: 180, rewards: { f_3003: 1, f_3005: 1, f_3006: 1 } },
  { id: 4006, name: "田园花园套装", icon: "🌷", category: "家具", priceType: "diamond", price: 160, rewards: { f_3001: 2, f_3003: 2, wood: 40 } },
];

const dailyTasks = [
  { id: "login", name: "登录游戏", type: "login", target: 1, active: 10, rewards: { diamond: 5 } },
  { id: "harvest", name: "收获作物 5 次", type: "harvest", target: 5, active: 20, rewards: { coin: 50, exp: 10 } },
  { id: "order", name: "完成订单 3 次", type: "order", target: 3, active: 20, rewards: { coin: 100, exp: 20 } },
  { id: "visit", name: "拜访好友 3 次", type: "visit", target: 3, active: 15, rewards: { friendPoint: 20 } },
  { id: "like", name: "点赞好友 3 次", type: "like", target: 3, active: 15, rewards: { friendPoint: 20 } },
  { id: "donate", name: "捐献社区资源 1 次", type: "donate", target: 1, active: 10, rewards: { communityContribution: 30 } },
  { id: "buyFurniture", name: "购买家具 1 次", type: "buyFurniture", target: 1, active: 10, rewards: { coin: 50 } },
];

const activeBoxes = [
  { score: 20, rewards: { coin: 100 } },
  { score: 40, rewards: { friendPoint: 30 } },
  { score: 60, rewards: { diamond: 10 } },
  { score: 80, rewards: { wood: 5, cloth: 5 } },
  { score: 100, rewards: { lottery_ticket: 1 } },
];

const fountainStages = [
  { stage: 1, label: "修整广场地基", target: 800, accepts: [{ item: "wood", label: "木材" }, { item: "crop_1001", label: "小麦" }], reward: { coin: 100 } },
  { stage: 2, label: "铺设喷泉石材", target: 600, accepts: [{ item: "stone", label: "石头" }, { item: "crop_1002", label: "番茄" }], reward: { friendPoint: 50 } },
  { stage: 3, label: "布置花坛水景", target: 1000, accepts: [{ item: "crop_1003", label: "草莓" }, { item: "coin", label: "金币" }], reward: { diamond: 20 } },
  { stage: 4, label: "安装社区标识", target: 1200, accepts: [{ item: "crop_1004", label: "玉米" }, { item: "communityContribution", label: "社区贡献" }], reward: { f_3008: 1 } },
  { stage: 5, label: "完成庆典喷泉", target: 1300, accepts: [{ item: "crop_1005", label: "南瓜" }, { item: "coin", label: "金币" }], reward: { diamond: 80, f_3007: 1 } },
];

const defaultFriends = [
  { id: "npc_mayor", name: "林镇长", avatar: "🧓", mood: "正在修喷泉", likes: 18, isFriend: true },
  { id: "npc_baker", name: "麦香面包师", avatar: "👩‍🍳", mood: "想收一篮小麦", likes: 12, isFriend: true },
  { id: "npc_florist", name: "花园阿梨", avatar: "👩‍🌾", mood: "家里有新花瓶", likes: 9, isFriend: false },
  { id: "npc_carpenter", name: "木工阿川", avatar: "👨‍🔧", mood: "做了把新椅子", likes: 7, isFriend: false },
  { id: "npc_barista", name: "咖啡小敏", avatar: "👩‍💼", mood: "欢迎来喝咖啡", likes: 15, isFriend: false },
];

const avatars = ["🙂", "😊", "😄", "🤠", "🌻", "🍀", "⭐", "🐱", "🐶", "🧑"];

let state;
let selectedCropId = 1001;
let selectedAvatar = avatars[0];
let toastTimer = null;
let clockTimer = null;

const $ = (id) => document.getElementById(id);
const itemKey = (id) => `crop_${id}`;
const furnitureKey = (id) => `f_${id}`;
const todayKey = () => new Date().toISOString().slice(0, 10);

function createDefaultState() {
  return {
    version: 1,
    user: {
      created: false,
      userId: `U${Math.floor(100000 + Math.random() * 900000)}`,
      nickname: "小镇居民",
      avatar: avatars[0],
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    },
    wallet: {
      coin: 120,
      diamond: 30,
      friendPoint: 0,
      exp: 0,
      level: 1,
      communityContribution: 0,
    },
    inventory: {
      wood: 80,
      stone: 40,
      cloth: 20,
      [furnitureKey(3001)]: 1,
    },
    farm: {
      plots: Array.from({ length: 6 }, () => null),
    },
    orders: {
      activeIds: [2006, 2001, 2001],
      cursor: 0,
    },
    home: {
      layout: Array.from({ length: 36 }, () => null),
      savedAt: null,
    },
    friends: JSON.parse(JSON.stringify(defaultFriends)),
    community: {
      joined: false,
      name: "暖阳社区",
      role: "成员",
      stage: 1,
      progress: 0,
      members: [
        { name: "林镇长", role: "社长", contribution: 520 },
        { name: "麦香面包师", role: "副社长", contribution: 280 },
        { name: "花园阿梨", role: "成员", contribution: 130 },
      ],
    },
    daily: createDailyState(),
    shop: {
      monthlyCard: false,
      monthlyClaimedDate: "",
      boughtGoods: {},
    },
    analytics: {},
  };
}

function createDailyState() {
  return {
    date: todayKey(),
    progress: { login: 1 },
    claimedTasks: {},
    claimedBoxes: {},
    activeScore: 0,
    friendLikes: {},
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const base = createDefaultState();
    if (!saved) return base;
    const merged = mergeState(base, saved);
    if (merged.daily.date !== todayKey()) {
      merged.daily = createDailyState();
      merged.user.lastLoginAt = new Date().toISOString();
    }
    normalizeState(merged);
    return merged;
  } catch (error) {
    console.warn("Failed to load state", error);
    return createDefaultState();
  }
}

function mergeState(base, saved) {
  return {
    ...base,
    ...saved,
    user: { ...base.user, ...(saved.user || {}) },
    wallet: { ...base.wallet, ...(saved.wallet || {}) },
    inventory: { ...base.inventory, ...(saved.inventory || {}) },
    farm: { ...base.farm, ...(saved.farm || {}) },
    orders: { ...base.orders, ...(saved.orders || {}) },
    home: { ...base.home, ...(saved.home || {}) },
    community: { ...base.community, ...(saved.community || {}) },
    shop: { ...base.shop, ...(saved.shop || {}) },
    daily: { ...base.daily, ...(saved.daily || {}) },
    analytics: { ...base.analytics, ...(saved.analytics || {}) },
  };
}

function normalizeState(target) {
  if (!target.farm.plots || !Array.isArray(target.farm.plots)) {
    target.farm.plots = Array.from({ length: 6 }, () => null);
  } else {
    target.farm.plots = Array.from({ length: 6 }, (_, index) => target.farm.plots[index] || null);
  }
  
  if (!target.home.layout || !Array.isArray(target.home.layout)) {
    target.home.layout = Array.from({ length: 36 }, () => null);
  } else {
    target.home.layout = Array.from({ length: 36 }, (_, index) => target.home.layout[index] || null);
  }
  
  target.friends = defaultFriends.map((friend) => {
    const saved = (target.friends || []).find((item) => item.id === friend.id);
    return saved ? { ...friend, ...saved } : { ...friend };
  });
  
  updateLevel(false);
  ensureOrders();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getCrop(id) {
  return crops.find((crop) => crop.id === Number(id));
}

function getOrder(id) {
  return orders.find((order) => order.id === Number(id));
}

function getFurniture(id) {
  return furniture.find((item) => item.id === Number(id));
}

function getLevelFromExp(exp) {
  return levels.reduce((current, row) => (exp >= row.needExp ? row.level : current), 1);
}

function getNextLevelInfo() {
  const currentIndex = levels.findIndex((row) => row.level === state.wallet.level);
  return levels[currentIndex + 1] || null;
}

function updateLevel(showToast = true) {
  const before = state.wallet.level || 1;
  const after = getLevelFromExp(state.wallet.exp);
  state.wallet.level = after;
  if (showToast && after > before) {
    const unlocked = levels.find((row) => row.level === after)?.unlock || "新内容";
    showToast(`升级到 Lv.${after}，解锁：${unlocked}`);
    logEvent("level_up");
  }
}

function ensureOrders() {
  const active = Array.isArray(state.orders.activeIds) ? state.orders.activeIds.filter((id) => getOrder(id)) : [];
  while (active.length < 3) {
    active.push(pickOrderId());
  }
  state.orders.activeIds = active.slice(0, 3);
}

function pickOrderId() {
  const eligible = orders.filter((order) => order.unlockLevel <= state.wallet.level);
  const index = state.orders.cursor % eligible.length;
  state.orders.cursor += 1;
  return eligible[index].id;
}

function moneyLabel(priceType, price) {
  if (priceType === "coin") return `🪙 ${price}`;
  if (priceType === "diamond") return `💎 ${price}`;
  if (priceType === "rmb") return `¥ ${price}`;
  return String(price);
}

function getItemName(key) {
  if (key === "coin") return "金币";
  if (key === "diamond") return "钻石";
  if (key === "friendPoint") return "友情点";
  if (key === "communityContribution") return "社区贡献";
  if (key === "exp") return "经验";
  if (key === "wood") return "木材";
  if (key === "stone") return "石头";
  if (key === "cloth") return "布料";
  if (key === "speed_ticket") return "加速券";
  if (key === "lottery_ticket") return "抽奖券";
  if (key.startsWith("crop_")) return getCrop(key.replace("crop_", ""))?.name || key;
  if (key.startsWith("f_")) return getFurniture(key.replace("f_", ""))?.name || key;
  return key;
}

function getItemIcon(key) {
  if (key === "coin") return "🪙";
  if (key === "diamond") return "💎";
  if (key === "friendPoint") return "🤝";
  if (key === "communityContribution") return "🏅";
  if (key === "exp") return "✨";
  if (key === "wood") return "🪵";
  if (key === "stone") return "🪨";
  if (key === "cloth") return "🧵";
  if (key === "speed_ticket") return "⏩";
  if (key === "lottery_ticket") return "🎟️";
  if (key.startsWith("crop_")) return getCrop(key.replace("crop_", ""))?.icon || "🌱";
  if (key.startsWith("f_")) return getFurniture(key.replace("f_", ""))?.icon || "🪑";
  return "📦";
}

function formatRewards(rewards) {
  return Object.entries(rewards)
    .map(([key, count]) => `${getItemIcon(key)} ${getItemName(key)} x${count}`)
    .join("、");
}

function getCount(key) {
  if (key in state.wallet) return state.wallet[key] || 0;
  return state.inventory[key] || 0;
}

function addItem(key, count) {
  if (key === "exp") {
    state.wallet.exp += count;
    updateLevel();
    return;
  }
  if (key in state.wallet) {
    state.wallet[key] += count;
    return;
  }
  state.inventory[key] = (state.inventory[key] || 0) + count;
}

function spendItem(key, count) {
  if (getCount(key) < count) return false;
  if (key in state.wallet) {
    state.wallet[key] -= count;
  } else {
    state.inventory[key] -= count;
    if (state.inventory[key] <= 0) delete state.inventory[key];
  }
  return true;
}

function addRewards(rewards) {
  Object.entries(rewards).forEach(([key, count]) => addItem(key, count));
}

function canAfford(priceType, price) {
  if (priceType === "coin") return state.wallet.coin >= price;
  if (priceType === "diamond") return state.wallet.diamond >= price;
  return true;
}

function spendPrice(priceType, price) {
  if (priceType === "coin") return spendItem("coin", price);
  if (priceType === "diamond") return spendItem("diamond", price);
  if (priceType === "rmb") {
    logEvent("purchase_start");
    logEvent("purchase_success");
    return true;
  }
  return false;
}

function logEvent(name) {
  state.analytics[name] = (state.analytics[name] || 0) + 1;
}

function trackDaily(type, amount = 1) {
  const task = dailyTasks.find((item) => item.type === type);
  if (!task) return;
  const current = state.daily.progress[type] || 0;
  state.daily.progress[type] = Math.min(task.target, current + amount);
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}

function renderAll() {
  updateLevel(false);
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
  saveState();
}

function renderTopbar() {
  $("avatarIcon").textContent = state.user.avatar;
  $("playerName").textContent = state.user.nickname;
  $("playerLevel").textContent = `Lv.${state.wallet.level}`;
  $("coinCount").textContent = state.wallet.coin;
  $("diamondCount").textContent = state.wallet.diamond;
  $("friendPointCount").textContent = state.wallet.friendPoint;

  const next = getNextLevelInfo();
  if (!next) {
    $("expBar").style.width = "100%";
    $("expText").textContent = `${state.wallet.exp} / 满级`;
    return;
  }
  const currentLevelInfo = levels.find((row) => row.level === state.wallet.level);
  const base = currentLevelInfo?.needExp || 0;
  const progress = Math.max(0, Math.min(100, ((state.wallet.exp - base) / (next.needExp - base)) * 100));
  $("expBar").style.width = `${progress}%`;
  $("expText").textContent = `${state.wallet.exp} / ${next.needExp}`;
}

function renderNotice() {
  const mature = state.farm.plots.filter((plot) => plot && isPlotMature(plot)).length;
  let message = "欢迎回来。先看看农田，再顺手完成几张订单吧。";
  if (!state.user.created) message = "创建角色后，镇长会送你第一把木椅和六块农田。";
  else if (mature > 0) message = `有 ${mature} 块农田成熟了，可以收获作物。`;
  else if (state.wallet.level < 5) message = "完成订单可以快速升级，5 级后好友拜访会开放完整奖励。";
  else if (state.wallet.level < 10) message = "继续完成订单，10 级后可以加入社区建设喷泉。";
  else if (!state.community.joined) message = "社区已经开放，加入暖阳社区一起建设喷泉。";
  else message = `暖阳社区喷泉正在第 ${state.community.stage} 阶段建设中。`;
  $("townNotice").textContent = message;
}

function renderMiniInventory() {
  const important = Object.entries(state.inventory)
    .filter(([, count]) => count > 0)
    .slice(0, 12);
  $("miniInventory").innerHTML = important.length
    ? important.map(([key, count]) => `<span class="mini-chip">${getItemIcon(key)} ${getItemName(key)} ${count}</span>`).join("")
    : `<span class="mini-chip">背包是空的</span>`;
}

function renderFarm() {
  $("farmGrid").innerHTML = state.farm.plots
    .map((plot, index) => {
      if (!plot) {
        return `
          <article class="plot">
            <div class="plot-content">
              <span class="crop-icon">🟫</span>
              <span class="plot-name">空地 ${index + 1}</span>
              <span class="plot-time">选择种子后点击种植</span>
              <button class="plot-action" type="button" data-action="plant-selected" data-index="${index}">种植</button>
            </div>
          </article>
        `;
      }
      const crop = getCrop(plot.cropId);
      const mature = isPlotMature(plot);
      const remaining = getRemainingSeconds(plot);
      const percent = Math.min(100, Math.floor(((Date.now() - plot.plantedAt) / (crop.growTime * 1000)) * 100));
      return `
        <article class="plot">
          <div class="plot-content">
            <span class="crop-icon">${mature ? crop.icon : percent > 50 ? "🌱" : "🌰"}</span>
            <span class="plot-name">${crop.name}</span>
            <span class="plot-time">${mature ? "成熟可收获" : `剩余 ${formatTime(remaining)}`}</span>
            <button class="plot-action" type="button" data-action="harvest" data-index="${index}" ${mature ? "" : "disabled"}>收获</button>
          </div>
        </article>
      `;
    })
    .join("");

  $("farmGrid").querySelectorAll("button[data-action='plant-selected']").forEach((button) => {
    button.addEventListener("click", () => plantCrop(Number(button.dataset.index), selectedCropId));
  });
  $("farmGrid").querySelectorAll("button[data-action='harvest']").forEach((button) => {
    button.addEventListener("click", () => harvestPlot(Number(button.dataset.index)));
  });

  $("seedList").innerHTML = crops
    .map((crop) => {
      const unlocked = crop.unlockLevel <= state.wallet.level;
      const selected = selectedCropId === crop.id;
      return `
        <article class="list-item">
          <div class="list-topline">
            <span class="item-name">${crop.icon} ${crop.name}</span>
            <span class="item-meta">Lv.${crop.unlockLevel}</span>
          </div>
          <div class="item-meta">成熟 ${formatTime(crop.growTime)}，种子 ${moneyLabel("coin", crop.seedPrice)}，收获 x${crop.harvestCount}</div>
          <div class="item-actions">
            <button class="${selected ? "primary-action" : "ghost-action"}" type="button" data-action="select-seed" data-crop="${crop.id}" ${unlocked ? "" : "disabled"}>${selected ? "已选择" : "选择"}</button>
            <button class="small-action" type="button" data-action="plant-first" data-crop="${crop.id}" ${unlocked ? "" : "disabled"}>种到空地</button>
          </div>
        </article>
      `;
    })
    .join("");

  $("seedList").querySelectorAll("button[data-action='select-seed']").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCropId = Number(button.dataset.crop);
      renderFarm();
    });
  });
  $("seedList").querySelectorAll("button[data-action='plant-first']").forEach((button) => {
    button.addEventListener("click", () => plantFirstEmpty(Number(button.dataset.crop)));
  });
}

function renderOrders() {
  ensureOrders();
  $("orderList").innerHTML = state.orders.activeIds
    .map((orderId, index) => {
      const order = getOrder(orderId);
      const requirement = order.requires.map((item) => `${getItemIcon(item.item)} ${getItemName(item.item)} ${getCount(item.item)} / ${item.count}`).join("、");
      const ready = order.requires.every((item) => getCount(item.item) >= item.count);
      return `
        <article class="list-item">
          <div class="list-topline">
            <span class="item-name">${order.name}</span>
            <span class="item-meta">${order.type}</span>
          </div>
          <div class="item-meta">需求：${requirement}</div>
          <div class="item-meta">奖励：🪙 ${order.coin}、✨ ${order.exp}</div>
          <div class="item-actions">
            <button class="primary-action" type="button" data-action="complete-order" data-index="${index}" ${ready ? "" : "disabled"}>提交</button>
            <button class="ghost-action" type="button" data-action="refresh-order" data-index="${index}">换一张</button>
          </div>
        </article>
      `;
    })
    .join("");

  $("orderList").querySelectorAll("button[data-action='complete-order']").forEach((button) => {
    button.addEventListener("click", () => completeOrder(Number(button.dataset.index)));
  });
  $("orderList").querySelectorAll("button[data-action='refresh-order']").forEach((button) => {
    button.addEventListener("click", () => refreshOrder(Number(button.dataset.index)));
  });
}

function isPlotMature(plot) {
  const crop = getCrop(plot.cropId);
  return Date.now() - plot.plantedAt >= crop.growTime * 1000;
}

function getRemainingSeconds(plot) {
  const crop = getCrop(plot.cropId);
  return Math.max(0, Math.ceil((crop.growTime * 1000 - (Date.now() - plot.plantedAt)) / 1000));
}

function formatTime(seconds) {
  if (seconds < 60) return `${seconds}秒`;
  const minute = Math.floor(seconds / 60);
  const second = seconds % 60;
  return second ? `${minute}分${second}秒` : `${minute}分钟`;
}

function plantFirstEmpty(cropId) {
  const index = state.farm.plots.findIndex((plot) => !plot);
  if (index === -1) {
    showToast("农田已经种满了。");
    return;
  }
  plantCrop(index, cropId);
}

function plantCrop(index, cropId) {
  const crop = getCrop(cropId);
  if (!crop) return;
  if (crop.unlockLevel > state.wallet.level) {
    showToast(`${crop.name} 需要 Lv.${crop.unlockLevel} 解锁。`);
    return;
  }
  if (state.farm.plots[index]) {
    showToast("这块地已经有作物了。");
    return;
  }
  if (!spendItem("coin", crop.seedPrice)) {
    showToast("金币不够买种子。");
    return;
  }
  state.farm.plots[index] = { cropId: crop.id, plantedAt: Date.now() };
  logEvent("buy_seed");
  logEvent("plant_crop");
  showToast(`种下了 ${crop.name}。`);
  renderAll();
}

function harvestPlot(index) {
  const plot = state.farm.plots[index];
  if (!plot || !isPlotMature(plot)) return;
  const crop = getCrop(plot.cropId);
  addItem(itemKey(crop.id), crop.harvestCount);
  addItem("exp", 1);
  state.farm.plots[index] = null;
  trackDaily("harvest", 1);
  logEvent("harvest_crop");
  showToast(`收获 ${crop.name} x${crop.harvestCount}。`);
  renderAll();
}

function collectAllMature() {
  let count = 0;
  state.farm.plots.forEach((plot, index) => {
    if (plot && isPlotMature(plot)) {
      const crop = getCrop(plot.cropId);
      addItem(itemKey(crop.id), crop.harvestCount);
      addItem("exp", 1);
      state.farm.plots[index] = null;
      count += 1;
    }
  });
  if (!count) {
    showToast("现在还没有成熟作物。");
    return;
  }
  trackDaily("harvest", count);
  logEvent("harvest_crop");
  showToast(`收获了 ${count} 块农田。`);
  renderAll();
}

function completeOrder(index) {
  const order = getOrder(state.orders.activeIds[index]);
  if (!order) return;
  const ready = order.requires.every((item) => getCount(item.item) >= item.count);
  if (!ready) {
    showToast("订单需要的作物还不够。");
    return;
  }
  order.requires.forEach((item) => spendItem(item.item, item.count));
  addItem("coin", order.coin);
  addItem("exp", order.exp);
  state.orders.activeIds[index] = pickOrderId();
  trackDaily("order", 1);
  logEvent("order_complete");
  showToast(`完成 ${order.name}，获得金币和经验。`);
  renderAll();
}

function refreshOrder(index) {
  state.orders.activeIds[index] = pickOrderId();
  logEvent("order_refresh");
  showToast("订单板刷新了一张订单。");
  renderAll();
}

function renderHome() {
  $("roomGrid").innerHTML = state.home.layout
    .map((entry, index) => {
      if (!entry) return `<div class="room-cell" data-index="${index}"></div>`;
      const item = getFurniture(entry.id);
      return `
        <div class="room-cell" data-index="${index}">
          <div class="furniture-piece ${entry.rotated ? "is-rotated" : ""}" title="${item.name}">
            <span>${item.icon}</span>
          </div>
          <div style="position: absolute; top: 2px; right: 2px; display: flex; gap: 2px;">
            <button type="button" data-action="rotate-furniture" data-index="${index}" style="width: 20px; height: 20px; border: 0; background: rgba(255,255,255,0.9); border-radius: 3px; font-size: 12px; cursor: pointer;">↻</button>
            <button type="button" data-action="remove-furniture" data-index="${index}" style="width: 20px; height: 20px; border: 0; background: rgba(255,255,255,0.9); border-radius: 3px; font-size: 12px; cursor: pointer;">×</button>
          </div>
        </div>
      `;
    })
    .join("");

  $("roomGrid").querySelectorAll("button[data-action='rotate-furniture']").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      rotateFurniture(Number(button.dataset.index));
    });
  });
  $("roomGrid").querySelectorAll("button[data-action='remove-furniture']").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      removeFurniture(Number(button.dataset.index));
    });
  });

  const bagItems = furniture.filter((item) => (state.inventory[furnitureKey(item.id)] || 0) > 0);
  $("furnitureBag").innerHTML = bagItems.length
    ? bagItems
        .map(
          (item) => `
            <article class="list-item">
              <div class="list-topline">
                <span class="item-name">${item.icon} ${item.name}</span>
                <span class="item-meta">x${state.inventory[furnitureKey(item.id)]}</span>
              </div>
              <button class="small-action" type="button" data-action="place-furniture" data-id="${item.id}">摆放</button>
            </article>
          `,
        )
        .join("")
    : `<div class="item-meta">家具背包是空的，可以去商城购买。</div>`;

  $("furnitureBag").querySelectorAll("button[data-action='place-furniture']").forEach((button) => {
    button.addEventListener("click", () => placeFurniture(Number(button.dataset.id)));
  });

  $("furnitureShop").innerHTML = furniture
    .map((item) => {
      const unlocked = item.unlockLevel <= state.wallet.level;
      return `
        <article class="list-item">
          <div class="list-topline">
            <span class="item-name">${item.icon} ${item.name}</span>
            <span class="item-meta">${moneyLabel(item.priceType, item.price)}</span>
          </div>
          <div class="item-meta">${item.category} · Lv.${item.unlockLevel}</div>
          <button class="small-action" type="button" data-action="buy-furniture" data-id="${item.id}" ${unlocked ? "" : "disabled"}>购买</button>
        </article>
      `;
    })
    .join("");

  $("furnitureShop").querySelectorAll("button[data-action='buy-furniture']").forEach((button) => {
    button.addEventListener("click", () => buyFurniture(Number(button.dataset.id)));
  });
}

function buyFurniture(id) {
  const item = getFurniture(id);
  if (!item) return;
  if (item.unlockLevel > state.wallet.level) {
    showToast(`${item.name} 需要 Lv.${item.unlockLevel} 解锁。`);
    return;
  }
  if (!spendPrice(item.priceType, item.price)) {
    showToast("资源不足，暂时买不了这件家具。");
    return;
  }
  addItem(furnitureKey(item.id), 1);
  trackDaily("buyFurniture", 1);
  logEvent("furniture_buy");
  showToast(`买到了 ${item.name}。`);
  renderAll();
}

function placeFurniture(id) {
  const key = furnitureKey(id);
  if ((state.inventory[key] || 0) <= 0) {
    showToast("这件家具已经没有可摆放数量。");
    return;
  }
  const index = state.home.layout.findIndex((cell) => !cell);
  if (index === -1) {
    showToast("房间已经摆满了。");
    return;
  }
  spendItem(key, 1);
  state.home.layout[index] = { id, rotated: false };
  logEvent("furniture_place");
  showToast("家具已放到房间空位。");
  renderAll();
}

function rotateFurniture(index) {
  if (!state.home.layout[index]) return;
  state.home.layout[index].rotated = !state.home.layout[index].rotated;
  logEvent("furniture_place");
  renderAll();
}

function removeFurniture(index) {
  const entry = state.home.layout[index];
  if (!entry) return;
  addItem(furnitureKey(entry.id), 1);
  state.home.layout[index] = null;
  showToast("家具已收回背包。");
  renderAll();
}

function clearRoom() {
  let count = 0;
  state.home.layout.forEach((entry, index) => {
    if (entry) {
      addItem(furnitureKey(entry.id), 1);
      state.home.layout[index] = null;
      count += 1;
    }
  });
  showToast(count ? "房间已清空，家具回到背包。" : "房间现在是空的。");
  renderAll();
}

function saveRoom() {
  state.home.savedAt = new Date().toISOString();
  logEvent("home_save");
  showToast("家园布局已保存。");
  renderAll();
}

function renderFriends() {
  $("friendList").innerHTML = state.friends
    .map((friend) => {
      const liked = !!state.daily.friendLikes[friend.id];
      const visitLocked = state.wallet.level < 5;
      return `
        <article class="person-card">
          <div class="person-avatar">${friend.avatar}</div>
          <div>
            <h3>${friend.name}</h3>
            <p class="muted-text">${friend.mood}</p>
          </div>
          <div class="item-meta">点赞 ${friend.likes}${friend.isFriend ? " · 已是好友" : ""}</div>
          <div class="item-actions">
            <button class="small-action" type="button" data-action="add-friend" data-id="${friend.id}" ${friend.isFriend ? "disabled" : ""}>添加</button>
            <button class="primary-action" type="button" data-action="visit-friend" data-id="${friend.id}" ${friend.isFriend && !visitLocked ? "" : "disabled"}>拜访</button>
            <button class="ghost-action" type="button" data-action="like-friend" data-id="${friend.id}" ${friend.isFriend && !liked ? "" : "disabled"}>${liked ? "已赞" : "点赞"}</button>
          </div>
        </article>
      `;
    })
    .join("");

  $("friendList").querySelectorAll("button[data-action='add-friend']").forEach((button) => {
    button.addEventListener("click", () => addFriend(button.dataset.id));
  });
  $("friendList").querySelectorAll("button[data-action='visit-friend']").forEach((button) => {
    button.addEventListener("click", () => visitFriend(button.dataset.id));
  });
  $("friendList").querySelectorAll("button[data-action='like-friend']").forEach((button) => {
    button.addEventListener("click", () => likeFriend(button.dataset.id));
  });
}

function addFriend(id) {
  const friend = state.friends.find((item) => item.id === id);
  if (!friend) return;
  friend.isFriend = true;
  logEvent("friend_add");
  showToast(`${friend.name} 已成为好友。`);
  renderAll();
}

function visitFriend(id) {
  const friend = state.friends.find((item) => item.id === id);
  if (!friend) return;
  addItem("friendPoint", 3);
  trackDaily("visit", 1);
  logEvent("friend_visit");
  showToast(`拜访了 ${friend.name} 的家园，获得友情点。`);
  renderAll();
}

function likeFriend(id) {
  const friend = state.friends.find((item) => item.id === id);
  if (!friend || state.daily.friendLikes[id]) return;
  friend.likes += 1;
  state.daily.friendLikes[id] = true;
  addItem("friendPoint", 5);
  trackDaily("like", 1);
  logEvent("home_like");
  showToast(`给 ${friend.name} 的家园点了赞。`);
  renderAll();
}

function recommendFriend() {
  const candidate = state.friends.find((friend) => !friend.isFriend);
  if (candidate) {
    showToast(`镇长推荐你认识：${candidate.name}。`);
  } else {
    showToast("现在的推荐邻居都已经是好友了。");
  }
}

function renderCommunity() {
  const unlocked = state.wallet.level >= 10;
  const stage = fountainStages[Math.min(state.community.stage, fountainStages.length) - 1];
  const complete = state.community.stage > fountainStages.length;
  $("communityJoinButton").disabled = !unlocked || state.community.joined;
  $("communityJoinButton").textContent = state.community.joined ? "已加入社区" : unlocked ? "加入暖阳社区" : "Lv.10 解锁社区";
  $("fountainStage").textContent = complete ? "喷泉已完工" : `喷泉阶段 ${stage.stage}`;
  $("communityStatus").textContent = complete
    ? "喷泉已经成为小镇新的公共空间。"
    : unlocked
      ? `${stage.label} · ${state.community.joined ? "可以捐献资源" : "加入后可以捐献"}`
      : "达到 10 级后开放社区系统。";
  const progress = complete ? 100 : Math.min(100, (state.community.progress / stage.target) * 100);
  $("buildBar").style.width = `${progress}%`;
  $("buildText").textContent = complete ? "建设完成" : `${state.community.progress} / ${stage.target}`;

  if (!unlocked || complete) {
    $("donationList").innerHTML = `<div class="item-meta">${complete ? "喷泉已经完成建设。" : "社区功能还未解锁。"}</div>`;
  } else {
    $("donationList").innerHTML = stage.accepts
      .map((entry) => {
        const count = getCount(entry.item);
        return `
          <article class="list-item">
            <div class="list-topline">
              <span class="item-name">${getItemIcon(entry.item)} ${entry.label}</span>
              <span class="item-meta">拥有 ${count}</span>
            </div>
            <button class="primary-action" type="button" data-action="donate" data-item="${entry.item}" ${state.community.joined && count > 0 ? "" : "disabled"}>捐献 10</button>
          </article>
        `;
      })
      .join("");
  }
  $("donationList").querySelectorAll("button[data-action='donate']").forEach((button) => {
    button.addEventListener("click", () => donateToCommunity(button.dataset.item));
  });

  const members = state.community.joined
    ? [{ name: state.user.nickname, role: state.community.role, contribution: state.wallet.communityContribution }, ...state.community.members]
    : state.community.members;
  $("memberList").innerHTML = members
    .map(
      (member) => `
        <div class="member-row">
          <span>${member.name}</span>
          <span class="item-meta">${member.role} · ${member.contribution}</span>
        </div>
      `,
    )
    .join("");
}

function joinCommunity() {
  if (state.wallet.level < 10) {
    showToast("达到 Lv.10 后可以加入社区。");
    return;
  }
  state.community.joined = true;
  logEvent("community_join");
  showToast("已加入暖阳社区。");
  renderAll();
}

function donateToCommunity(item) {
  if (!state.community.joined) return;
  const amount = Math.min(10, getCount(item));
  if (amount <= 0) {
    showToast("可捐献资源不足。");
    return;
  }
  spendItem(item, amount);
  state.community.progress += item === "coin" ? amount / 2 : amount;
  addItem("communityContribution", amount);
  addItem("exp", 2);
  trackDaily("donate", 1);
  logEvent("community_donate");
  checkCommunityStage();
  showToast(`捐献了 ${getItemName(item)} x${amount}。`);
  renderAll();
}

function checkCommunityStage() {
  const stage = fountainStages[state.community.stage - 1];
  if (!stage || state.community.progress < stage.target) return;
  addRewards(stage.reward);
  state.community.stage += 1;
  state.community.progress = 0;
  logEvent("building_complete");
  showToast(`喷泉阶段完成，奖励：${formatRewards(stage.reward)}`);
}

function renderShop() {
  $("claimCardButton").disabled = !state.shop.monthlyCard || state.shop.monthlyClaimedDate === todayKey();
  $("claimCardButton").textContent = state.shop.monthlyCard
    ? state.shop.monthlyClaimedDate === todayKey()
      ? "今日已领取"
      : "领取月卡"
    : "未开通月卡";

  $("shopList").innerHTML = shopGoods
    .map(
      (goods) => `
        <article class="shop-card">
          <div class="shop-icon">${goods.icon}</div>
          <div>
            <p class="eyebrow">${goods.category}</p>
            <h3>${goods.name}</h3>
            <p class="muted-text">包含：${formatRewards(goods.rewards)}</p>
          </div>
          <div class="list-topline">
            <span class="item-name">${moneyLabel(goods.priceType, goods.price)}</span>
            <button class="primary-action" type="button" data-action="buy-goods" data-id="${goods.id}" ${canAfford(goods.priceType, goods.price) ? "" : "disabled"}>购买</button>
          </div>
        </article>
      `,
    )
    .join("");

  $("shopList").querySelectorAll("button[data-action='buy-goods']").forEach((button) => {
    button.addEventListener("click", () => buyGoods(Number(button.dataset.id)));
  });
}

function buyGoods(id) {
  const goods = shopGoods.find((item) => item.id === id);
  if (!goods) return;
  logEvent("shop_view");
  logEvent("goods_click");
  if (!spendPrice(goods.priceType, goods.price)) {
    showToast("资源不足，暂时买不了这个商品。");
    return;
  }
  addRewards(goods.rewards);
  if (goods.monthlyCard) state.shop.monthlyCard = true;
  state.shop.boughtGoods[id] = (state.shop.boughtGoods[id] || 0) + 1;
  showToast(`购买成功：${goods.name}。`);
  renderAll();
}

function claimMonthlyCard() {
  if (!state.shop.monthlyCard) {
    showToast("还没有开通月卡。");
    return;
  }
  if (state.shop.monthlyClaimedDate === todayKey()) {
    showToast("今日月卡已经领取过了。");
    return;
  }
  state.shop.monthlyClaimedDate = todayKey();
  addRewards({ diamond: 60, coin: 500 });
  showToast("领取月卡：钻石 x60、金币 x500。");
  renderAll();
}

function renderTasks() {
  $("activeScore").textContent = state.daily.activeScore;
  $("dailyTaskList").innerHTML = dailyTasks
    .map((task) => {
      const progress = state.daily.progress[task.type] || 0;
      const done = progress >= task.target;
      const claimed = !!state.daily.claimedTasks[task.id];
      return `
        <article class="list-item">
          <div class="list-topline">
            <span class="item-name">${task.name}</span>
            <span class="item-meta">${progress} / ${task.target}</span>
          </div>
          <div class="item-meta">奖励：${formatRewards(task.rewards)} · 活跃度 +${task.active}</div>
          <button class="primary-action" type="button" data-action="claim-task" data-id="${task.id}" ${done && !claimed ? "" : "disabled"}>${claimed ? "已领取" : "领取"}</button>
        </article>
      `;
    })
    .join("");

  $("dailyTaskList").querySelectorAll("button[data-action='claim-task']").forEach((button) => {
    button.addEventListener("click", () => claimTask(button.dataset.id));
  });

  $("activeBoxList").innerHTML = activeBoxes
    .map((box) => {
      const claimed = !!state.daily.claimedBoxes[box.score];
      const ready = state.daily.activeScore >= box.score;
      return `
        <article class="list-item">
          <div class="list-topline">
            <span class="item-name">活跃 ${box.score}</span>
            <span class="item-meta">${formatRewards(box.rewards)}</span>
          </div>
          <button class="small-action" type="button" data-action="claim-box" data-score="${box.score}" ${ready && !claimed ? "" : "disabled"}>${claimed ? "已领取" : "打开"}</button>
        </article>
      `;
    })
    .join("");

  $("activeBoxList").querySelectorAll("button[data-action='claim-box']").forEach((button) => {
    button.addEventListener("click", () => claimActiveBox(Number(button.dataset.score)));
  });
}

function claimTask(id) {
  const task = dailyTasks.find((item) => item.id === id);
  if (!task) return;
  const progress = state.daily.progress[task.type] || 0;
  if (progress < task.target || state.daily.claimedTasks[id]) return;
  addRewards(task.rewards);
  state.daily.activeScore += task.active;
  state.daily.claimedTasks[id] = true;
  logEvent("task_claim");
  showToast(`领取任务奖励：${task.name}。`);
  renderAll();
}

function claimActiveBox(score) {
  const box = activeBoxes.find((item) => item.score === score);
  if (!box || state.daily.activeScore < score || state.daily.claimedBoxes[score]) return;
  addRewards(box.rewards);
  state.daily.claimedBoxes[score] = true;
  logEvent("task_active_box");
  showToast(`打开活跃宝箱：${formatRewards(box.rewards)}。`);
  renderAll();
}

function resetDaily() {
  state.daily = createDailyState();
  showToast("今日任务已刷新。");
  renderAll();
}

function renderAdmin() {
  $("adminUserInfo").innerHTML = [
    ["用户ID", state.user.userId],
    ["昵称", state.user.nickname],
    ["等级", `Lv.${state.wallet.level}`],
    ["经验", state.wallet.exp],
    ["金币", state.wallet.coin],
    ["钻石", state.wallet.diamond],
    ["社区", state.community.joined ? `${state.community.name} · ${state.community.role}` : "未加入"],
  ]
    .map(([label, value]) => `<div class="data-row"><span>${label}</span><b>${value}</b></div>`)
    .join("");

  const analytics = Object.entries(state.analytics).sort((a, b) => b[1] - a[1]);
  $("analyticsList").innerHTML = analytics.length
    ? analytics.map(([name, count]) => `<div class="data-row"><span>${name}</span><b>${count}</b></div>`).join("")
    : `<div class="item-meta">还没有埋点事件。</div>`;

  $("configSummary").innerHTML = [
    ["作物配置", `${crops.length} 条`],
    ["订单配置", `${orders.length} 条`],
    ["家具配置", `${furniture.length} 条`],
    ["商城配置", `${shopGoods.length} 条`],
    ["任务配置", `${dailyTasks.length} 条`],
    ["等级上限", "Lv.20"],
  ]
    .map(([label, value]) => `<div class="data-row"><span>${label}</span><b>${value}</b></div>`)
    .join("");
}

function grantTestPack() {
  addRewards({
    coin: 3000,
    diamond: 300,
    exp: 1600,
    wood: 600,
    stone: 350,
    cloth: 80,
    crop_1001: 320,
    crop_1002: 320,
    crop_1003: 120,
    crop_1004: 80,
    crop_1005: 40,
    f_3002: 1,
    f_3003: 1,
  });
  logEvent("admin_grant_item");
  showToast("测试补偿已发放，社区和商城可以完整验证了。");
  renderAll();
}

function showView(viewId) {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active-view"));
  document.querySelectorAll(".nav-button").forEach((button) => button.classList.remove("active-nav"));
  $(viewId).classList.add("active-view");
  document.querySelector(`.nav-button[data-view="${viewId}"]`)?.classList.add("active-nav");
  if (viewId === "shopView") logEvent("shop_view");
  renderAll();
}

function renderAvatarChoices() {
  $("avatarChoices").innerHTML = avatars
    .map(
      (avatar) => `
        <button class="avatar-choice ${selectedAvatar === avatar ? "selected" : ""}" type="button" data-avatar="${avatar}">${avatar}</button>
      `,
    )
    .join("");
  $("avatarChoices").querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedAvatar = button.dataset.avatar;
      renderAvatarChoices();
    });
  });
}

function createRole() {
  const nickname = $("nicknameInput").value.trim();
  const banned = ["管理员", "官方", "客服"];
  if (nickname.length < 2 || nickname.length > 12) {
    showToast("昵称需要 2-12 个字符。");
    return;
  }
  if (banned.some((word) => nickname.includes(word))) {
    showToast("昵称包含暂不可用词语。");
    return;
  }
  state.user.created = true;
  state.user.nickname = nickname;
  state.user.avatar = selectedAvatar;
  state.user.createdAt = new Date().toISOString();
  state.user.lastLoginAt = new Date().toISOString();
  logEvent("tutorial_start");
  $("roleModal").classList.remove("show");
  showToast("欢迎来到邻里小镇，先去农场种小麦吧。");
  renderAll();
}

function attachEvents() {
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });
  $("collectAllButton").addEventListener("click", collectAllMature);
  $("clearRoomButton").addEventListener("click", clearRoom);
  $("saveRoomButton").addEventListener("click", saveRoom);
  $("refreshFriendsButton").addEventListener("click", recommendFriend);
  $("communityJoinButton").addEventListener("click", joinCommunity);
  $("claimCardButton").addEventListener("click", claimMonthlyCard);
  $("resetDailyButton").addEventListener("click", resetDaily);
  $("grantPackButton").addEventListener("click", grantTestPack);
  $("createRoleButton").addEventListener("click", createRole);
  $("avatarButton").addEventListener("click", () => {
    $("nicknameInput").value = state.user.nickname;
    selectedAvatar = state.user.avatar;
    renderAvatarChoices();
    $("roleModal").classList.add("show");
  });
}

function startClock() {
  clearInterval(clockTimer);
  clockTimer = setInterval(() => {
    renderFarm();
    renderNotice();
  }, 1000);
}

function init() {
  state = loadState();
  selectedAvatar = state.user.avatar || avatars[0];
  renderAvatarChoices();
  attachEvents();
  if (!state.user.created) {
    $("roleModal").classList.add("show");
  }
  logEvent("login");
  trackDaily("login", 1);
  renderAll();
  startClock();
}

document.addEventListener("DOMContentLoaded", init);
