// 成就系统模块
import { addRewards } from '../core/inventory.js';
import { emit, Events } from '../core/events.js';
import { calculateRoomScore } from './home.js';
import { talentNodes } from '../config/talents.js';
import { titles, frames } from '../config/cosmetics.js';
import { storyChapters } from '../config/story.js';
import { getUnlockedCosmeticCount } from './cosmetics.js';
import { townProjects } from '../config/townProjects.js';
import { townStyles } from '../config/townStyles.js';

// 成就配置
//
// category 决定成就页的分组；rewards 支持任意物品键（coin/diamond/friendPoint/家具/作物…）。
// trackKey 对应 analytics 里的事件名（logEvent 的键），或 getAchievementProgress 里的特殊分支。
export const achievements = [
  // ============ 🌾 农场 ============
  { id: "harvest_50",  name: "初收喜悦",   desc: "收获作物50次",     icon: "🌱", category: "农场", target: 50,  trackKey: "harvest_crop", rewards: { coin: 300 } },
  { id: "harvest_100", name: "种植大师",   desc: "收获作物100次",    icon: "🌾", category: "农场", target: 100, trackKey: "harvest_crop", rewards: { diamond: 50, coin: 1000 } },
  { id: "harvest_500", name: "金色麦浪",   desc: "收获作物500次",    icon: "🌾", category: "农场", target: 500, trackKey: "harvest_crop", rewards: { diamond: 150, coin: 3000 } },
  { id: "plant_100",   name: "播种狂人",   desc: "累计种植100次",    icon: "🌰", category: "农场", target: 100, trackKey: "plant_crop", rewards: { coin: 500 } },
  { id: "plant_300",   name: "大地园丁",   desc: "累计种植300次",    icon: "🌿", category: "农场", target: 300, trackKey: "plant_crop", rewards: { diamond: 80, coin: 1200 } },
  { id: "plant_all_crops", name: "农场大亨", desc: "种植过所有类型的作物", icon: "🎃", category: "农场", target: 10, trackKey: "crop_types", rewards: { diamond: 40, coin: 800 } },
  { id: "gold_crop_1", name: "第一株金穗", desc: "收获1株金穗作物",  icon: "✨", category: "农场", target: 1,   trackKey: "gold_crop", rewards: { diamond: 20, coin: 200 } },
  { id: "gold_crop_10", name: "点金之手", desc: "累计收获10株金穗作物", icon: "✨", category: "农场", target: 10,  trackKey: "gold_crop", rewards: { diamond: 100, speed_ticket: 3 } },
  { id: "farm_expand", name: "开疆拓土",   desc: "扩建一次田地",     icon: "🚜", category: "农场", target: 1,   trackKey: "farm_expand", rewards: { coin: 400 } },
  { id: "farm_expand_max", name: "小镇地主", desc: "田地扩到最大（21块）", icon: "🗺️", category: "农场", target: 3, trackKey: "farm_expand", rewards: { diamond: 200, coin: 5000 } },
  { id: "speed_up_10", name: "和时间赛跑", desc: "使用10次加速券",    icon: "⏩", category: "农场", target: 10,  trackKey: "speed_up_plot", rewards: { diamond: 30 } },
  { id: "sell_crop_100", name: "集市小贩", desc: "卖出100次作物",    icon: "🪙", category: "农场", target: 100, trackKey: "sell_crop", rewards: { coin: 1500 } },

  // ============ 📋 订单 ============
  { id: "order_10",  name: "接单新手",   desc: "完成10个订单",      icon: "📝", category: "订单", target: 10,  trackKey: "order_complete", rewards: { coin: 300 } },
  { id: "order_50",  name: "订单达人",   desc: "完成50个订单",      icon: "📋", category: "订单", target: 50,  trackKey: "order_complete", rewards: { diamond: 30, coin: 500 } },
  { id: "order_200", name: "供货大户",   desc: "完成200个订单",     icon: "🚚", category: "订单", target: 200, trackKey: "order_complete", rewards: { diamond: 120, coin: 4000 } },
  { id: "order_10_daily", name: "速度狂人", desc: "单日完成10个订单", icon: "🚀", category: "订单", target: 10, trackKey: "order_daily", rewards: { diamond: 30, coin: 500 } },
  { id: "rush_1",    name: "与时间竞速", desc: "完成1次限时订单",    icon: "⚡", category: "订单", target: 1,   trackKey: "rush_complete", rewards: { diamond: 20 } },
  { id: "rush_10",   name: "极速快递",   desc: "完成10次限时订单",   icon: "⚡", category: "订单", target: 10,  trackKey: "rush_complete", rewards: { diamond: 80, speed_ticket: 5 } },
  { id: "reserve_1", name: "早起的鸟儿", desc: "预购1次明日订单",    icon: "📅", category: "订单", target: 1,   trackKey: "order_reserve", rewards: { coin: 200 } },

  // ============ 🏠 家园 ============
  { id: "furniture_10", name: "安家落户",  desc: "购买10件家具",     icon: "🛋️", category: "家园", target: 10, trackKey: "furniture_buy", rewards: { coin: 400 } },
  { id: "furniture_all", name: "装饰专家", desc: "购买所有类型的家具", icon: "🏠", category: "家园", target: 8,  trackKey: "furniture_types", rewards: { diamond: 100 } },
  { id: "place_30",     name: "布局巧手",  desc: "摆放家具30次",     icon: "📐", category: "家园", target: 30, trackKey: "furniture_place", rewards: { coin: 600 } },
  { id: "room_score_s", name: "完美家园",  desc: "房间装饰评分达到S级", icon: "🏅", category: "家园", target: 500, trackKey: "room_score", rewards: { diamond: 100, coin: 2000 } },

  // ============ 👥 社交 ============
  { id: "friend_5",  name: "广交善缘",   desc: "添加5位好友",       icon: "🤝", category: "社交", target: 5,   trackKey: "friend_add", rewards: { friendPoint: 50 } },
  { id: "friend_all", name: "满座宾朋",  desc: "添加所有邻居为好友", icon: "🏘️", category: "社交", target: 5,   trackKey: "friend_all", rewards: { diamond: 60 } },
  { id: "visit_30",  name: "社交之星",   desc: "拜访好友30次",      icon: "👥", category: "社交", target: 30,  trackKey: "friend_visit", rewards: { friendPoint: 100, diamond: 20 } },
  { id: "visit_100", name: "串门专业户", desc: "拜访好友100次",     icon: "🚪", category: "社交", target: 100, trackKey: "friend_visit", rewards: { friendPoint: 300, diamond: 60 } },
  { id: "like_20",   name: "暖心点赞",   desc: "点赞好友20次",      icon: "👍", category: "社交", target: 20,  trackKey: "home_like", rewards: { friendPoint: 60 } },
  { id: "water_10",  name: "及时雨",     desc: "帮好友浇田10次",    icon: "💧", category: "社交", target: 10,  trackKey: "friend_water", rewards: { friendPoint: 80, diamond: 20 } },
  { id: "neighbor_15", name: "人缘之星", desc: "收到15次邻居回礼",  icon: "🎁", category: "社交", target: 15,  trackKey: "neighbor_gift", rewards: { friendPoint: 80, diamond: 30 } },
  { id: "help_20", name: "热心肠",      desc: "回应邻居求助20次",  icon: "🧺", category: "社交", target: 20,  trackKey: "help_fulfill", rewards: { friendPoint: 150, diamond: 40 } },
  { id: "help_all_day", name: "全员搞定", desc: "一天内回应全部求助", icon: "📬", category: "社交", target: 3,  trackKey: "help_daily", rewards: { diamond: 60, coin: 1000 } },
  { id: "favor_10", name: "自己人",     desc: "单日让 1 位邻居人情满格", icon: "🤝", category: "社交", target: 1, trackKey: "favor_full", rewards: { friendPoint: 120, diamond: 30 } },
  { id: "schedule_15", name: "知己知彼", desc: "赶上邻居的日程回礼15次", icon: "📅", category: "社交", target: 15, trackKey: "schedule_visit", rewards: { friendPoint: 100, diamond: 30 } },
  { id: "relationship_first", name: "初次熟识", desc: "和一位邻居的关系达到「相识」", icon: "🌱", category: "社交", target: 1, trackKey: "relationship_tier", rewards: { friendPoint: 40, coin: 200 } },
  { id: "relationship_close", name: "知心邻居", desc: "和一位邻居的关系达到「知心」", icon: "💛", category: "社交", target: 1, trackKey: "relationship_close", rewards: { diamond: 40, friendPoint: 100 } },
  { id: "memory_first", name: "第一段回忆", desc: "听完一位邻居的回忆", icon: "📖", category: "社交", target: 1, trackKey: "relationship_memory", rewards: { coin: 200, diamond: 5 } },
  { id: "explore_3", name: "出门看看", desc: "探索周边 3 次", icon: "🧭", category: "里程碑", target: 3, trackKey: "explore_visit", rewards: { coin: 300 } },
  { id: "explore_all", name: "小镇足迹", desc: "发现全部 6 种探索物", icon: "🗺️", category: "里程碑", target: 6, trackKey: "explore_found", rewards: { diamond: 30, coin: 500 } },
  { id: "explore_walk_1", name: "散步有伴", desc: "第一次邀请邻居同行散步", icon: "👣", category: "社交", target: 1, trackKey: "explore_walk", rewards: { friendPoint: 20, coin: 150 } },
  { id: "explore_walk_all", name: "并肩看遍小镇", desc: "收录 5 位邻居的同行散步回忆", icon: "🚶", category: "社交", target: 5, trackKey: "explore_walk_friends", rewards: { diamond: 30, friendPoint: 80 } },
  { id: "explore_souvenir_1", name: "第一枚足迹", desc: "收藏 1 枚散步足迹纪念", icon: "🍃", category: "收藏", target: 1, trackKey: "explore_souvenir", rewards: { coin: 300, friendPoint: 20 } },
  { id: "explore_souvenir_all", name: "足迹满载", desc: "收藏全部 3 枚散步足迹纪念", icon: "🏅", category: "收藏", target: 3, trackKey: "explore_souvenir_all", rewards: { diamond: 40, friendPoint: 100 } },
  { id: "festival_reward_1", name: "第一份纪念", desc: "兑换 1 份庆典收藏", icon: "🎁", category: "里程碑", target: 1, trackKey: "festival_reward", rewards: { diamond: 20, coin: 300 } },
  { id: "festival_3", name: "庆典常客", desc: "领取 3 次庆典任务奖励", icon: "🎊", category: "里程碑", target: 3, trackKey: "festival_task", rewards: { coin: 300, diamond: 10 } },
  { id: "memory_15", name: "小镇故事集", desc: "听完全部 15 段邻居回忆", icon: "📚", category: "社交", target: 15, trackKey: "relationship_memory", rewards: { diamond: 80, coin: 2000 } },

  // ============ 🐮 养殖 ============
  { id: "ranch_first", name: "第一位房客", desc: "买下第一只动物",    icon: "🐣", category: "养殖", target: 1,   trackKey: "ranch_buy", rewards: { coin: 300 } },
  { id: "ranch_all",   name: "牧场之家",   desc: "集齐鸡、羊、牛",    icon: "🐄", category: "养殖", target: 3,   trackKey: "ranch_all", rewards: { diamond: 100, coin: 2000 } },
  { id: "ranch_feed_20", name: "投喂小能手", desc: "喂食动物20次",    icon: "🌾", category: "养殖", target: 20,  trackKey: "ranch_feed", rewards: { coin: 800 } },
  { id: "ranch_collect_30", name: "收获满满", desc: "收取产出30次",  icon: "🥚", category: "养殖", target: 30,  trackKey: "ranch_collect", rewards: { diamond: 50, coin: 1500 } },

  // ============ ⛲ 社区 ============
  { id: "community_join", name: "新社员",   desc: "加入社区",        icon: "🏘️", category: "社区", target: 1,   trackKey: "community_join", rewards: { coin: 200, friendPoint: 30 } },
  { id: "community_donate_10", name: "热心捐助", desc: "捐献10次",   icon: "🫱", category: "社区", target: 10,  trackKey: "community_donate", rewards: { friendPoint: 60 } },
  { id: "community_stage5", name: "社区领袖", desc: "完成喷泉第5阶段", icon: "⛲", category: "社区", target: 5,   trackKey: "community_stage", rewards: { diamond: 150, f_3007: 1 } },

  // ============ 🎣 湖畔 & 🥖 加工坊 & 🎡 转盘 ============
  { id: "fish_10", name: "初试身手",   desc: "累计钓鱼10次",     icon: "🎣", category: "湖畔", target: 10,  trackKey: "fishing_cast", rewards: { coin: 200 } },
  { id: "fish_50",  name: "垂钓高手",   desc: "累计钓鱼50次",     icon: "🎣", category: "湖畔", target: 50,  trackKey: "fishing_cast", rewards: { diamond: 40, fish_5: 1 } },
  { id: "fish_200", name: "湖畔传说",   desc: "累计钓鱼200次",    icon: "🐋", category: "湖畔", target: 200, trackKey: "fishing_cast", rewards: { diamond: 150, coin: 3000 } },
  { id: "fish_sell_20", name: "鱼贩子", desc: "卖出鱼获20次",     icon: "🐠", category: "湖畔", target: 20,  trackKey: "fishing_sell", rewards: { coin: 600 } },
  { id: "craft_20", name: "工坊巧匠",   desc: "完成20次加工",     icon: "🍞", category: "加工坊", target: 20,  trackKey: "craft_finish", rewards: { diamond: 40, goods_5001: 3 } },
  { id: "craft_100", name: "流水线主厨", desc: "完成100次加工",    icon: "🥖", category: "加工坊", target: 100, trackKey: "craft_finish", rewards: { diamond: 120, coin: 2500 } },
  { id: "lottery_30", name: "小镇锦鲤",  desc: "转盘累计抽奖30次", icon: "🎡", category: "转盘", target: 30,  trackKey: "lottery_spin", rewards: { diamond: 60, lottery_ticket: 3 } },
  { id: "lottery_100", name: "转盘常客",  desc: "转盘累计抽奖100次", icon: "🎰", category: "转盘", target: 100, trackKey: "lottery_spin", rewards: { diamond: 200, lottery_ticket: 10 } },

  // ============ ⛏️ 矿洞 ============
  { id: "mine_10",  name: "初探矿洞",   desc: "累计下矿10次",     icon: "⛏️", category: "矿洞", target: 10,  trackKey: "mine_dig", rewards: { coin: 300 } },
  { id: "mine_60",  name: "矿洞常客",   desc: "累计下矿60次",     icon: "🪨", category: "矿洞", target: 60,  trackKey: "mine_dig", rewards: { diamond: 40, coin: 800 } },
  { id: "mine_250", name: "深井矿工",   desc: "累计下矿250次",    icon: "⚒️", category: "矿洞", target: 250, trackKey: "mine_dig", rewards: { diamond: 150, coin: 3000 } },
  { id: "ore_sell_20", name: "矿石商人", desc: "在矿洞卖出20次矿藏", icon: "💰", category: "矿洞", target: 20, trackKey: "ore_sell", rewards: { coin: 1200 } },
  { id: "pick_max", name: "神装矿镐",   desc: "把镐子升到满级（银镐）", icon: "⛏️", category: "矿洞", target: 4, trackKey: "pickaxe_upgrade", rewards: { diamond: 120, coin: 2500 } },
  { id: "trove_all", name: "矿藏收藏家", desc: "集齐全部7种矿石与宝石", icon: "💠", category: "矿洞", target: 7, trackKey: "mine_trove", rewards: { diamond: 200, coin: 5000 } },
  { id: "ingot_10", name: "熔炉新火", desc: "熔炼出10块矿锭", icon: "🔥", category: "矿洞", target: 10, trackKey: "ingot_smelt", rewards: { coin: 800, diamond: 20 } },
  { id: "charm_first", name: "第一枚护符", desc: "做成第一枚宝石护符", icon: "🔶", category: "矿洞", target: 1, trackKey: "charm_craft", rewards: { diamond: 40, coin: 600 } },
  { id: "charm_all", name: "护符大师", desc: "集齐全部4枚宝石护符", icon: "💠", category: "矿洞", target: 4, trackKey: "charm_all", rewards: { diamond: 200, coin: 4000 } },

  // ============ 🌟 天赋 ============
  { id: "talent_first", name: "初窥门径", desc: "点亮第一个天赋", icon: "🌟", category: "天赋", target: 1, trackKey: "talent_unlock", rewards: { coin: 300, diamond: 10 } },
  { id: "talent_branch", name: "一门精通", desc: "点满一条天赋分支", icon: "🌳", category: "天赋", target: 1, trackKey: "talent_branch_full", rewards: { diamond: 60, coin: 1500 } },
  { id: "talent_all", name: "全知全能", desc: "点亮全部20个天赋", icon: "✨", category: "天赋", target: 20, trackKey: "talent_all", rewards: { diamond: 300, coin: 8000 } },

  // ============ 🪟 温室 ============
  { id: "greenhouse_first", name: "第一株温室苗", desc: "在温室种下第一株作物", icon: "🪟", category: "温室", target: 1, trackKey: "greenhouse_plant", rewards: { coin: 400, diamond: 15 } },
  { id: "greenhouse_30", name: "四季常青", desc: "在温室累计种植30次", icon: "🌿", category: "温室", target: 30, trackKey: "greenhouse_plant", rewards: { diamond: 80, coin: 2000 } },

  // ============ ☕ 咖啡馆 ============
  { id: "cafe_first", name: "第一位客人", desc: "在咖啡馆招待第一位客人", icon: "☕", category: "咖啡馆", target: 1, trackKey: "cafe_serve", rewards: { coin: 300, diamond: 10 } },
  { id: "cafe_30", name: "回头客", desc: "累计招待30位客人", icon: "🍽️", category: "咖啡馆", target: 30, trackKey: "cafe_serve", rewards: { diamond: 60, coin: 1500 } },
  { id: "cafe_tip_10", name: "小费满满", desc: "累计收到10次小费", icon: "💝", category: "咖啡馆", target: 10, trackKey: "cafe_tip", rewards: { diamond: 40, coin: 800 } },

  // ============ 📖 剧情 ============
  { id: "story_first", name: "故事开场", desc: "完成第一章剧情", icon: "📖", category: "剧情", target: 1, trackKey: "story_chapter", rewards: { coin: 200, diamond: 5 } },
  { id: "story_endings", name: "三种风景", desc: "看过全部 3 种剧情装饰结局", icon: "🏞️", category: "剧情", target: 3, trackKey: "story_seen_endings", rewards: { diamond: 30, coin: 600 } },
  { id: "story_all", name: "小镇传说", desc: "完成全部剧情章节", icon: "📚", category: "剧情", target: storyChapters.length, trackKey: "story_chapter", rewards: { diamond: 100, coin: 3000 } },
  { id: "town_project_first", name: "第一份共建", desc: "完成一条小镇共建路线", icon: "🧱", category: "社区", target: 1, trackKey: "town_project_complete", rewards: { coin: 500, diamond: 10 } },
  { id: "town_projects_all", name: "小镇新风貌", desc: "完成全部小镇共建路线", icon: "🏘️", category: "社区", target: townProjects.length, trackKey: "town_project_complete", rewards: { diamond: 60, coin: 1500 } },
  { id: "town_styles_all", name: "风貌收藏家", desc: "采用过全部小镇共建风貌", icon: "🎨", category: "收藏", target: townStyles.length, trackKey: "town_style_seen", rewards: { diamond: 40, coin: 1000 } },

  // ============ 🎖️ 收藏 ============
  { id: "cosmetic_first", name: "有点面子", desc: "装备一个称号或头像框", icon: "🎖️", category: "收藏", target: 1, trackKey: "cosmetic_equip", rewards: { coin: 200 } },
  { id: "cosmetic_all", name: "收藏家", desc: "解锁全部称号和头像框", icon: "🖼️", category: "收藏", target: titles.length + frames.length, trackKey: "cosmetic_all", rewards: { diamond: 80, coin: 2000 } },

  // ============ 🧬 杂交工坊 ============
  { id: "hybrid_first", name: "初次杂交",  desc: "首次合成杂交种子",  icon: "🧬", category: "杂交", target: 1,   trackKey: "hybrid_discover", rewards: { coin: 200 } },
  { id: "hybrid_all", name: "基因大师",   desc: "点亮全部杂交图谱",  icon: "🧪", category: "杂交", target: 4,   trackKey: "hybrid_all", rewards: { diamond: 150, coin: 3000 } },
  { id: "hybrid_harvest_10", name: "新芽收藏家", desc: "收获10次杂交作物", icon: "🌱", category: "杂交", target: 10, trackKey: "hybrid_harvest", rewards: { diamond: 60, speed_ticket: 2 } },

  // ============ 📜 委托榜 & 🍳 料理铺 & ⛲ 许愿池 ============
  { id: "commission_10", name: "委托常客", desc: "完成10个小镇委托",  icon: "📜", category: "委托", target: 10,  trackKey: "commission_complete", rewards: { coin: 600, diamond: 20 } },
  { id: "commission_50", name: "小镇红人", desc: "完成50个小镇委托",  icon: "🤝", category: "委托", target: 50,  trackKey: "commission_complete", rewards: { diamond: 100, coin: 3000 } },
  { id: "commission_all", name: "有求必应", desc: "一天内交完全部委托", icon: "🏆", category: "委托", target: 4,  trackKey: "commission_daily", rewards: { diamond: 80, coin: 1500 } },
  { id: "dish_cook_10", name: "小试牛刀", desc: "做出10道料理",      icon: "🍳", category: "料理", target: 10,  trackKey: "dish_cook", rewards: { coin: 500 } },
  { id: "dish_serve_20", name: "上菜高手", desc: "上菜20次",         icon: "🍽️", category: "料理", target: 20,  trackKey: "dish_serve", rewards: { diamond: 60, coin: 1200 } },
  { id: "dish_all", name: "料理大师",   desc: "做出过全部 10 道料理", icon: "👨‍🍳", category: "料理", target: 10,  trackKey: "dish_types", rewards: { diamond: 150, coin: 3000 } },
  { id: "wish_7", name: "心诚则灵",   desc: "累计许愿7次",         icon: "⛲", category: "许愿池", target: 7,  trackKey: "wish_make", rewards: { coin: 700, diamond: 15 } },
  { id: "wish_30", name: "池边常客",   desc: "累计许愿30次",        icon: "✨", category: "许愿池", target: 30, trackKey: "wish_make", rewards: { diamond: 80, coin: 2000 } },
  { id: "wish_high", name: "大吉大利", desc: "许愿结算出 1 次「超大吉」", icon: "🎋", category: "许愿池", target: 1, trackKey: "wish_high", rewards: { diamond: 50, lottery_ticket: 2 } },
  { id: "wish_streak_max", name: "十全十美", desc: "心愿热度攒满 10 天", icon: "🌟", category: "许愿池", target: 10, trackKey: "wish_heat", rewards: { diamond: 200, coin: 5000 } },

  // ============ 🐾 宠物 ============
  { id: "pet_first", name: "第一只宠物", desc: "买下第一只宠物",    icon: "🐾", category: "宠物", target: 1,   trackKey: "pet_own", rewards: { diamond: 30 } },
  { id: "pet_all",   name: "动物园园长", desc: "集齐全部7种宠物",    icon: "🦊", category: "宠物", target: 7,   trackKey: "pet_all", rewards: { diamond: 300 } },
  { id: "feed_pet_14", name: "铲屎官",   desc: "累计喂养宠物14次",  icon: "🐾", category: "宠物", target: 14,  trackKey: "pet_feed", rewards: { diamond: 50, coin: 800 } },

  // ============ 📈 里程碑 ============
  { id: "level_20", name: "满级玩家",   desc: "达到Lv.20",       icon: "⭐", category: "里程碑", target: 20,  trackKey: "level", rewards: { diamond: 200, coin: 5000 } },
  { id: "coin_10000", name: "土豪",    desc: "拥有10000金币",   icon: "💰", category: "里程碑", target: 10000, trackKey: "coin", rewards: { diamond: 50 } },
  { id: "diamond_1000", name: "钻石收藏家", desc: "拥有1000钻石", icon: "💎", category: "里程碑", target: 1000, trackKey: "diamond", rewards: { coin: 5000 } },
  { id: "login_7",  name: "忠实玩家",   desc: "连续登录7天",     icon: "📅", category: "里程碑", target: 7,   trackKey: "login_streak", rewards: { diamond: 70, coin: 1500 } },
  { id: "login_30", name: "小镇常驻民", desc: "累计登录30天",     icon: "🗓️", category: "里程碑", target: 30,  trackKey: "login_total", rewards: { diamond: 250, coin: 6000 } },
  { id: "shop_5",   name: "剁手一族",   desc: "商城购物5次",     icon: "🛍️", category: "里程碑", target: 5,   trackKey: "shop_buy", rewards: { coin: 400 } },
  { id: "task_20",  name: "任务达成者", desc: "领取20次任务奖励",  icon: "✅", category: "里程碑", target: 20,  trackKey: "task_claim", rewards: { diamond: 40 } },
  { id: "box_10",   name: "宝箱猎人",   desc: "开启10次活跃宝箱",  icon: "🎁", category: "里程碑", target: 10,  trackKey: "box_claim", rewards: { diamond: 40 } },
];

/**
 * 检查并解锁成就
 * @param {Object} state - 游戏状态
 * @returns {Array} 新解锁的成就列表
 */
export function checkAchievements(state) {
  const newUnlocked = [];

  achievements.forEach(achievement => {
    // 跳过已解锁的
    if (state.achievements.unlocked.includes(achievement.id)) {
      return;
    }

    // 获取当前进度
    const progress = getAchievementProgress(state, achievement);

    // 更新进度
    state.achievements.progress[achievement.id] = progress;

    // 检查是否达成
    if (progress >= achievement.target) {
      unlockAchievement(state, achievement.id);
      newUnlocked.push(achievement);
    }
  });

  return newUnlocked;
}

/**
 * 解锁成就
 * @param {Object} state - 游戏状态
 * @param {string} achievementId - 成就ID
 * @returns {Object} 更新后的状态
 */
export function unlockAchievement(state, achievementId) {
  const achievement = achievements.find(a => a.id === achievementId);
  if (!achievement) return state;

  // 添加到已解锁列表
  if (!state.achievements.unlocked.includes(achievementId)) {
    state.achievements.unlocked.push(achievementId);

    // 发放奖励
    addRewards(state, achievement.rewards);

    // 触发事件
    emit(Events.ACHIEVEMENT_UNLOCKED, { achievement });
  }

  return state;
}

/**
 * 统计一个整数的二进制里有多少个 1（料理种类位图用）
 */
function popcount(value) {
  let n = Number(value) || 0;
  let count = 0;
  while (n) {
    n &= n - 1;
    count++;
  }
  return count;
}

/**
 * 获取成就当前进度
 * @param {Object} state - 游戏状态
 * @param {Object} achievement - 成就对象
 * @returns {number} 当前进度值
 */
function getAchievementProgress(state, achievement) {
  // 通用：绝大多数成就直接读 analytics 里累计的事件数，
  // 不再逐个列 case，新增事件键的成就零配置接入。
  if (achievement.trackKey === "story_seen_endings") return state.story?.seenEndings?.length || 0;
  if (achievement.trackKey === "explore_walk_friends") {
    const walks = Array.isArray(state.explore?.walks) ? state.explore.walks : [];
    return new Set(walks.map((walk) => walk.friendId)).size;
  }
  if (achievement.trackKey === "explore_souvenir_all") return Array.isArray(state.explore?.souvenirs) ? state.explore.souvenirs.length : 0;
  if (achievement.trackKey === "town_project_complete") return Array.isArray(state.community?.projects?.completed) ? state.community.projects.completed.length : 0;
  if (achievement.trackKey === "town_style_seen") return Array.isArray(state.community?.projects?.seenStyles) ? state.community.projects.seenStyles.length : 0;
  if (achievement.trackKey === "explore_found") return state.explore?.found?.length || 0;
  if (achievement.trackKey === "relationship_close") {
    const claimed = state.relationships?.claimed || {};
    return Object.values(claimed).some((tiers) => Array.isArray(tiers) && tiers.includes("close")) ? 1 : 0;
  }

  if (achievement.trackKey in state.analytics) {
    return state.analytics[achievement.trackKey] || 0;
  }

  switch (achievement.trackKey) {
    case "level":
      return state.wallet.level;

    case "coin":
      return state.wallet.coin;

    case "diamond":
      return state.wallet.diamond;

    case "community_stage":
      return state.community.stage - 1; // 当前完成的阶段数

    case "order_daily":
      return state.daily.progress.order || 0;

    case "commission_daily":
      return state.daily.progress.commission || 0;

    case "help_daily":
      return state.daily.progress.help || 0;

    case "favor_full":
      return state.analytics.favor_full || 0;

    case "dish_types":
      // 做过的料理种类：用位图记（料理会消耗，不能只数背包）
      return popcount(state.analytics.dish_types || 0);

    case "wish_heat":
      return state.wish.heat || 0;

    case "wish_high":
      return state.analytics.wish_high || 0;

    case "room_score":
      return calculateRoomScore(state).score;

    case "furniture_types": {
      const ids = new Set();
      Object.entries(state.inventory || {}).forEach(([key, count]) => {
        if (key.startsWith("f_") && count > 0) ids.add(key);
      });
      (state.home.layout || []).forEach((item) => {
        if (item) ids.add(`f_${item.id}`);
      });
      return ids.size;
    }

    case "crop_types":
      return (state.farm.plantedTypes || []).length;

    case "login_streak":
      // 连续登录天数（需要额外追踪）
      return state.achievements.loginStreak || 1;

    case "login_total": {
      // 累计登录天数：从 analytics.login_count 里读（rollDailyState 每天首次登录 +1）
      return state.analytics.login_count || 0;
    }

    case "friend_all":
      return state.friends.filter((f) => f.isFriend).length;

    case "pet_own":
      return state.pets.owned.length;

    case "pet_all":
      return state.pets.owned.length;

    case "ranch_all":
      return state.ranch.owned.length;

    case "gold_crop":
      return state.farm.goldStats?.totalGold || 0;

    case "hybrid_all":
      return (state.hybrid?.discovered || []).length;

    case "mine_trove":
      return (state.mine?.found || []).length;

    case "ingot_smelt":
      // 熔炼次数只统计锭配方（5009-5011），普通加工不算
      return state.analytics.ingot_smelt || 0;

    case "charm_all":
      return (state.charms?.owned || []).length;

    case "talent_branch_full": {
      // 点满的分支数：一条分支的全部节点都在已点亮列表里才算
      const unlocked = new Set(state.talents?.unlocked || []);
      const byBranch = new Map();
      talentNodes.forEach((node) => {
        const entry = byBranch.get(node.branch) || { total: 0, done: 0 };
        entry.total += 1;
        if (unlocked.has(node.id)) entry.done += 1;
        byBranch.set(node.branch, entry);
      });
      return [...byBranch.values()].filter((entry) => entry.done === entry.total).length;
    }

    case "talent_all":
      return (state.talents?.unlocked || []).length;

    case "cosmetic_all":
      return getUnlockedCosmeticCount(state);

    default:
      return 0;
  }
}

/**
 * 获取成就完成进度百分比
 * @param {Object} state - 游戏状态
 * @param {string} achievementId - 成就ID
 * @returns {number} 进度百分比 (0-100)
 */
export function getAchievementProgressPercent(state, achievementId) {
  const achievement = achievements.find(a => a.id === achievementId);
  if (!achievement) return 0;

  const progress = state.achievements.progress[achievementId] || getAchievementProgress(state, achievement);
  return Math.min(100, Math.floor((progress / achievement.target) * 100));
}

/**
 * 获取已解锁的成就
 * @param {Object} state - 游戏状态
 * @returns {Array} 已解锁的成就列表
 */
export function getUnlockedAchievements(state) {
  return achievements.filter(a => state.achievements.unlocked.includes(a.id));
}

/**
 * 获取未解锁的成就
 * @param {Object} state - 游戏状态
 * @returns {Array} 未解锁的成就列表
 */
export function getLockedAchievements(state) {
  return achievements.filter(a => !state.achievements.unlocked.includes(a.id));
}

/**
 * 获取成就完成统计
 * @param {Object} state - 游戏状态
 * @returns {Object} { total, unlocked, percent }
 */
export function getAchievementStats(state) {
  const total = achievements.length;
  const unlocked = state.achievements.unlocked.length;
  const percent = Math.floor((unlocked / total) * 100);

  return { total, unlocked, percent };
}
