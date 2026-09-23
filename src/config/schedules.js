// 邻居每日日程配置
//
// 每位邻居每天有一个固定状态（在家 / 出门 / 有心事），
// 拜访时按状态给不同的回礼。状态由日期键哈希决定，
// 同一天内不变，第二天重新排班。

// 三种状态：在家最常见，出门次之，有心事最少
export const scheduleStates = [
  { id: "home", label: "在家", icon: "🏠", weight: 5 },
  { id: "out", label: "出门了", icon: "🚶", weight: 3 },
  { id: "troubled", label: "有心事", icon: "💭", weight: 2 },
];

// 每位邻居在三种状态下的台词与回礼
// rewards 是权重池，拜访时按权重抽一个
export const neighborSchedules = [
  {
    npc: "npc_mayor",
    states: {
      home: {
        lines: ["镇长在书房泡了壶茶，拍拍椅子让你坐。"],
        rewards: [{ key: "coin", count: 40, weight: 1 }],
      },
      out: {
        lines: ["管家说镇长去广场巡视了，桌上留了张便条和一点零花。"],
        rewards: [{ key: "coin", count: 15, weight: 1 }],
      },
      troubled: {
        lines: ["镇长愁着喷泉的预算，见你来了反而松了口气，塞给你一袋备用金。"],
        rewards: [{ key: "coin", count: 80, weight: 1 }],
      },
    },
  },
  {
    npc: "npc_baker",
    states: {
      home: {
        lines: ["面包师正守着烤箱，顺手塞给你一块刚出炉的面包。"],
        rewards: [{ key: "goods_5001", count: 1, weight: 1 }],
      },
      out: {
        lines: ["店门挂着「送货中」，门缝里只留了半块面包。"],
        rewards: [{ key: "goods_5001", count: 1, weight: 1 }],
      },
      troubled: {
        lines: ["面包师为明天的订单发愁，见你来了把试吃的那批都推给你。"],
        rewards: [{ key: "goods_5001", count: 2, weight: 1 }],
      },
    },
  },
  {
    npc: "npc_florist",
    states: {
      home: {
        lines: ["阿梨在花圃里剪枝，递给你两颗刚摘的草莓。"],
        rewards: [{ key: "crop_1003", count: 2, weight: 1 }],
      },
      out: {
        lines: ["花圃没人，篱笆上挂着一颗草莓当见面礼。"],
        rewards: [{ key: "crop_1003", count: 1, weight: 1 }],
      },
      troubled: {
        lines: ["阿梨担心新花瓶配不上花，见你来了心情好了，剪了一大把草莓。"],
        rewards: [{ key: "crop_1003", count: 4, weight: 1 }],
      },
    },
  },
  {
    npc: "npc_carpenter",
    states: {
      home: {
        lines: ["阿川在刨木头，把一捆边角料塞进你的口袋。"],
        rewards: [{ key: "wood", count: 8, weight: 1 }],
      },
      out: {
        lines: ["工棚锁着，门口只堆着几块剩料。"],
        rewards: [{ key: "wood", count: 3, weight: 1 }],
      },
      troubled: {
        lines: ["阿川为新椅子的尺寸犯难，见你来了把整捆好料都让给你。"],
        rewards: [{ key: "wood", count: 16, weight: 1 }],
      },
    },
  },
  {
    npc: "npc_barista",
    states: {
      home: {
        lines: ["小敏隔着柜台晃了晃瓶子：这瓶能让作物快点长大。"],
        rewards: [{ key: "speed_ticket", count: 1, weight: 1 }],
      },
      out: {
        lines: ["咖啡馆打烊了，吧台上留着一张写了配方的纸条，算是一点心意。"],
        rewards: [{ key: "coin", count: 20, weight: 1 }],
      },
      troubled: {
        lines: ["小敏为新豆子的味道发愁，见你来了把私藏的加速药剂也拿出来。"],
        rewards: [{ key: "speed_ticket", count: 2, weight: 1 }],
      },
    },
  },
];
