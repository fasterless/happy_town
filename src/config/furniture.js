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
  { id: 3009, name: "书架", icon: "📚", category: "装饰", priceType: "coin", price: 200, unlockLevel: 6 },
  { id: 3010, name: "壁炉", icon: "🔥", category: "装饰", priceType: "coin", price: 320, unlockLevel: 8 },
  { id: 3011, name: "鱼缸", icon: "🐠", category: "装饰", priceType: "coin", price: 240, unlockLevel: 9 },
  { id: 3012, name: "烤炉", icon: "🔥", category: "桌子", priceType: "diamond", price: 60, unlockLevel: 10 },
  { id: 3013, name: "钢琴", icon: "🎹", category: "装饰", priceType: "diamond", price: 110, unlockLevel: 12 },
  { id: 3014, name: "秋千椅", icon: "🪁", category: "椅子", priceType: "diamond", price: 95, unlockLevel: 14 },
];

// 家具查询辅助函数
export function getFurniture(id) {
  return furniture.find((f) => f.id === id);
}
