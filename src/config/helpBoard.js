// 邻居求助板配置
//
// 邻居们每天会张榜求购一两样东西（"我想收一篮小麦"），玩家送过去
// 能拿友情点和人情。这是「拜访/点赞/帮浇」之外的第四条社交线，
// 让好友从一个头像变成有需求的角色。
//
// 和好友商店的分工：友情点是社交货币，求助板是它的主要产出口之一
// （另两个是拜访和点赞），商店是消耗口。
import { crops } from './crops.js';
import { craftingRecipes } from './crafting.js';

// 每天上榜的求助条数
export const HELP_SLOTS = 3;

// 换一批求助的价钱
export const HELP_REROLL_COST = 20;

// 求助可索取的物品池（按玩家等级/持有情况过滤）
// 作物类只取已解锁的，成品类只取配方已解锁的，基础产物看养殖栏有没有
export function getRequestableItems(state) {
  const pool = crops
    .filter((c) => state.wallet.level >= c.unlockLevel)
    .map((c) => ({ item: `crop_${c.id}`, name: c.name, icon: c.icon, weight: 3 }));

  const goods = craftingRecipes
    .filter((r) => state.wallet.level >= r.unlockLevel)
    .map((r) => ({ item: r.result.key, name: r.name, icon: r.icon, weight: 2 }));

  const ranchItems = [];
  if (state.ranch?.owned?.includes('chicken')) {
    ranchItems.push({ item: 'egg', name: '鸡蛋', icon: '🥚', weight: 2 });
  }
  if (state.ranch?.owned?.includes('sheep')) {
    ranchItems.push({ item: 'wool', name: '羊毛', icon: '🧶', weight: 2 });
  }
  if (state.ranch?.owned?.includes('cow')) {
    ranchItems.push({ item: 'milk', name: '牛奶', icon: '🥛', weight: 2 });
  }

  return [...pool, ...goods, ...ranchItems];
}

/**
 * 一份求助的友情点报酬：按物品稀缺度给，成品比原料值钱
 * @param {Object} state
 * @param {{item: string}} entry - 物品池里的条目
 * @param {number} count - 索取数量
 */
export function getHelpReward(state, entry, count) {
  const base = entry.weight >= 3 ? 6 : 10; // 作物 6，成品/畜产 10
  return base + Math.min(10, count);
}

/**
 * 人情值阈值：一位邻居帮到这么多次后，他的回礼会升级
 */
export const FAVOR_FOR_BONUS = 3;
