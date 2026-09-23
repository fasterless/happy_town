// 第二季后的长期共建路线。每阶段支持多种材料，稀有物和季节纪念物都只是加速选项。
export const townProjects = [
  {
    id: 'plaza', name: '花满广场', icon: '🌼', description: '把广场边的空地整理成四季都能休息的小花园。',
    stages: [
      { label: '铺好花圃步道', target: 80, accepts: [
        { item: 'wood', value: 4 }, { item: 'stone', value: 4 }, { item: 'cloth', value: 5 },
        { item: 'twig', value: 4 }, { item: 'token_spring', value: 20 }, { item: 'token_autumn', value: 20 },
      ], reward: { coin: 300, exp: 20 } },
      { label: '种下广场花木', target: 120, accepts: [
        { item: 'wood', value: 4 }, { item: 'stone', value: 4 }, { item: 'cloth', value: 5 },
        { item: 'twig', value: 4 }, { item: 'resin', value: 8 }, { item: 'token_spring', value: 20 },
      ], reward: { f_3018: 1, diamond: 10, exp: 30 } },
    ],
  },
  {
    id: 'station', name: '车站新钟', icon: '🕰️', description: '修整旧站台，让晚归的人再次听见熟悉的报时声。',
    stages: [
      { label: '修缮旧站台', target: 80, accepts: [
        { item: 'wood', value: 4 }, { item: 'stone', value: 4 }, { item: 'cloth', value: 5 },
        { item: 'ticket', value: 10 }, { item: 'token_winter', value: 20 }, { item: 'token_newyear', value: 20 },
      ], reward: { coin: 300, exp: 20 } },
      { label: '挂起迎归新钟', target: 120, accepts: [
        { item: 'wood', value: 4 }, { item: 'stone', value: 4 }, { item: 'cloth', value: 5 },
        { item: 'ticket', value: 10 }, { item: 'bell', value: 15 }, { item: 'token_newyear', value: 20 },
      ], reward: { f_3019: 1, diamond: 10, exp: 30 } },
    ],
  },
  {
    id: 'shore', name: '湖岸长椅', icon: '🌊', description: '沿浅滩铺一段平整小路，留出看湖和聊天的位置。',
    stages: [
      { label: '整理湖岸小路', target: 80, accepts: [
        { item: 'wood', value: 4 }, { item: 'stone', value: 4 }, { item: 'cloth', value: 5 },
        { item: 'pebble', value: 4 }, { item: 'shell', value: 8 }, { item: 'token_summer', value: 20 },
      ], reward: { coin: 300, exp: 20 } },
      { label: '安放湖边长椅', target: 120, accepts: [
        { item: 'wood', value: 4 }, { item: 'stone', value: 4 }, { item: 'cloth', value: 5 },
        { item: 'pebble', value: 4 }, { item: 'shell', value: 8 }, { item: 'resin', value: 8 }, { item: 'token_summer', value: 20 },
      ], reward: { f_3020: 1, diamond: 10, exp: 30 } },
    ],
  },
];

export function getTownProject(id) {
  return townProjects.find((project) => project.id === id) || null;
}
