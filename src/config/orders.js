// 订单配置
// 订单配置
export const orders = [
  { id: 2001, name: "面包店订单", unlockLevel: 1, requires: [{ item: "crop_1001", count: 4 }], coin: 20, exp: 5, type: "普通" },
  { id: 2002, name: "餐厅订单", unlockLevel: 2, requires: [{ item: "crop_1002", count: 3 }], coin: 35, exp: 8, type: "普通" },
  { id: 2003, name: "水果摊订单", unlockLevel: 4, requires: [{ item: "crop_1003", count: 3 }], coin: 60, exp: 12, type: "普通" },
  { id: 2004, name: "农贸市场订单", unlockLevel: 6, requires: [{ item: "crop_1004", count: 4 }], coin: 100, exp: 18, type: "普通" },
  { id: 2005, name: "南瓜派订单", unlockLevel: 8, requires: [{ item: "crop_1005", count: 2 }], coin: 130, exp: 25, type: "特殊" },
  { id: 2006, name: "镇长早餐篮", unlockLevel: 1, requires: [{ item: "crop_1001", count: 2 }], coin: 12, exp: 3, type: "新手" },
  { id: 2007, name: "牧场订单", unlockLevel: 3, requires: [{ item: "crop_1006", count: 5 }], coin: 45, exp: 10, type: "普通" },
  { id: 2008, name: "家庭晚餐", unlockLevel: 5, requires: [{ item: "crop_1007", count: 3 }, { item: "crop_1001", count: 3 }], coin: 80, exp: 15, type: "普通" },
  { id: 2009, name: "节日花束", unlockLevel: 7, requires: [{ item: "crop_1008", count: 4 }], coin: 110, exp: 20, type: "特殊" },
  { id: 2010, name: "面包店特制", unlockLevel: 10, requires: [{ item: "crop_1009", count: 3 }], coin: 180, exp: 30, type: "特殊" },
];

// 订单查询辅助函数
export function getOrder(id) {
  return orders.find((o) => o.id === id);
}
