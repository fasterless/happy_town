// 物品合成系统
// 让玩家通过资源组合创造新物品，提升游戏深度

export const craftingRecipes = [
  {
    id: "chair_wood",
    name: "木制椅子",
    icon: "🪑",
    category: "furniture",
    requires: [
      { item: "wood", count: 2 },
      { item: "stone", count: 1 }
    ],
    result: { f_3009: 1 },  // 新家具 ID
    unlockLevel: 3
  },
  {
    id: "seed_pack",
    name: "种子大包",
    icon: "📦",
    category: "item",
    requires: [
      { item: "coin", count: 50 },
      { item: "crop_1001", count: 5 }
    ],
    result: { seed_pack: 1 },
    unlockLevel: 5
  },
  {
    id: "food_bread",
    name: "新鲜面包",
    icon: "🍞",
    category: "food",
    requires: [
      { item: "wheat", count: 3 },
      { item: "stone", count: 1 }
    ],
    result: { food_bread: 3 },
    unlockLevel: 4
  },
  {
    id: "furniture_suit",
    name: "田园套装",
    icon: "🏠",
    category: "furniture",
    requires: [
      { item: "f_3001", count: 1 },
      { item: "f_3002", count: 1 },
      { item: "coin", count: 200 }
    ],
    result: { f_3010: 1 },  // 新家具
    unlockLevel: 7
  }
];

// 辅助函数
export function canCraft(state, recipeId) {
  const recipe = craftingRecipes.find(r => r.id === recipeId);
  if (!recipe) return false;

  return recipe.requires.every(req => {
    if (req.item.startsWith('f_')) {
      return (state.inventory[req.item] || 0) >= req.count;
    }
    return state.wallet[req.item] >= req.count;
  });
}

export function craftItem(state, recipeId) {
  const recipe = craftingRecipes.find(r => r.id === recipeId);
  if (!recipe) return false;

  // 检查解锁
  if (state.wallet.level < recipe.unlockLevel) {
    return false;
  }

  // 检查资源
  if (!canCraft(state, recipeId)) {
    return false;
  }

  // 扣除资源
  recipe.requires.forEach(req => {
    if (req.item.startsWith('f_')) {
      state.inventory[req.item] = (state.inventory[req.item] || 0) - req.count;
    } else {
      state.wallet[req.item] = (state.wallet[req.item] || 0) - req.count;
    }
  });

  // 添加结果
  const resultKey = recipe.result.result.startsWith('f_')
    ? recipe.result.result
    : recipe.result.item || recipe.result.key;

  addItem(state, resultKey, recipe.result.count || 1);

  return true;
}