// 订单配置
export const orders = [
  { id: 2001, name: "面包店订单", unlockLevel: 1, requires: [{ item: "crop_1001", count: 4 }], coin: 20, exp: 5, type: "普通" },
  { id: 2002, name: "餐厅订单", unlockLevel: 2, requires: [{ item: "crop_1002", count: 3 }], coin: 35, exp: 8, type: "普通" },
  { id: 2003, name: "水果摊订单", unlockLevel: 4, requires: [{ item: "crop_1003", count: 3 }], coin: 60, exp: 12, type: "普通" },
  { id: 2004, name: "农贸市场订单", unlockLevel: 6, requires: [{ item: "crop_1004", count: 4 }], coin: 100, exp: 18, type: "普通" },
  { id: 2005, name: "南瓜派订单", unlockLevel: 8, requires: [{ item: "crop_1005", count: 2 }], coin: 130, exp: 25, type: "特殊" },
  { id: 2006, name: "镇长早餐篮", unlockLevel: 1, requires: [{ item: "crop_1001", count: 2 }], coin: 12, exp: 3, type: "新手" },
];

// 订单查询辅助函数
export function getOrder(id) {
  return orders.find((o) => o.id === id);
}
