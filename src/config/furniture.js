// 家具配置
export const furniture = [
  { id: 3001, name: "木椅", icon: "🪑", category: "椅子", priceType: "coin", price: 80, unlockLevel: 1 },
  { id: 3002, name: "木桌", icon: "🪵", category: "桌子", priceType: "coin", price: 120, unlockLevel: 1 },
  { id: 3003, name: "花瓶", icon: "🏺", category: "装饰", priceType: "coin", price: 160, unlockLevel: 2 },
  { id: 3004, name: "软床", icon: "🛏️", category: "床", priceType: "coin", price: 260, unlockLevel: 3 },
  { id: 3005, name: "地毯", icon: "▩", category: "装饰", priceType: "diamond", price: 30, unlockLevel: 3 },
  { id: 3006, name: "咖啡桌", icon: "☕", category: "桌子", priceType: "diamond", price: 45, unlockLevel: 5 },
  { id: 3007, name: "田园沙发", icon: "🛋️", category: "椅子", priceType: "diamond", price: 80, unlockLevel: 7 },
  { id: 3008, name: "欢迎地毯", icon: "🏵️", category: "活动", priceType: "diamond", price: 120, unlockLevel: 1 },
];

// 家具查询辅助函数
export function getFurniture(id) {
  return furniture.find((f) => f.id === id);
}
