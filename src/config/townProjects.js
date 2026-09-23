// 第二季后的长期共建路线。每阶段支持多种材料，稀有物和季节纪念物都只是加速选项。
export const townProjects = [
  {
    id: 'plaza', name: '花满广场', icon: '🌼', hostNpc: 'npc_florist', description: '把广场边的空地整理成四季都能休息的小花园。',
    tales: {
      invite: {
        base: '你邀请{name}一起照看广场，邻居很高兴能为小镇出一份力。',
        acquainted: '你向{name}发出共建邀请，邻居带来一包花种，答应下次一起种进广场。',
        familiar: '你和{name}商量好广场的布置，熟悉的默契让这张图纸很快有了模样。',
        close: '{name}笑着接受邀请：能和你一起把喜欢的花园留给小镇，真好。',
      },
      stages: [
        { base: '步道铺好了，广场边多了一条可以慢慢散步的小路。', acquainted: '{name}把花种沿着新路排好：下一步，就让颜色从路边长出来。', familiar: '{name}和你一起试走步道：等花长高，这里一定很热闹。', close: '{name}轻轻拍去你肩上的土：这条路以后也留给我们散步。' },
        { base: '花木种好了，广场终于有了四季都能歇脚的角落。', acquainted: '{name}看着新花圃说：以后每个季节，我们都能在这里碰面。', familiar: '{name}挑出一朵刚开的花：这片花圃，已经有我们一起照看的记号。', close: '{name}把第一朵花夹进纪念册：这是我们一起种下的小镇春天。' },
      ],
    },
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
    id: 'station', name: '车站新钟', icon: '🕰️', hostNpc: 'npc_mayor', description: '修整旧站台，让晚归的人再次听见熟悉的报时声。',
    tales: {
      invite: {
        base: '你邀请{name}一起修整车站，邻居爽快答应帮忙查看旧档案。',
        acquainted: '你请{name}来看看旧车站，邻居带来一张珍藏的旧车票。',
        familiar: '你和{name}一起翻阅站台记录，熟悉的故事让维修计划越来越清晰。',
        close: '{name}认真地点头：能陪你把这座车站重新点亮，我很期待。',
      },
      stages: [
        { base: '站台修缮完成，旧车站重新有了迎接旅客的模样。', acquainted: '{name}拂去站牌上的灰：下一步给它装上钟，让归来的人知道时间。', familiar: '{name}和你校准了站台边缘：钟声响起时，旅客就能安心下车。', close: '{name}把旧站台的钥匙交给你：这里以后也会为你们留一盏灯。' },
        { base: '新钟挂上了车站，熟悉的钟声再次陪伴晚归的人。', acquainted: '{name}听着钟声点头：每一次报时，都是小镇说欢迎回来的方式。', familiar: '{name}笑着说：以后听见钟声，就知道老朋友又回到镇上了。', close: '{name}记下你们的名字：这座新钟，也会替小镇记住这段情谊。' },
      ],
    },
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
    id: 'shore', name: '湖岸长椅', icon: '🌊', hostNpc: 'npc_barista', description: '沿浅滩铺一段平整小路，留出看湖和聊天的位置。',
    tales: {
      invite: {
        base: '你邀请{name}一起整理湖岸，邻居带来随手收集的小石子来帮忙。',
        acquainted: '你邀{name}来湖边看看，邻居答应等步道修好后一起散散步。',
        familiar: '你和{name}一起挑选临湖位置，已经想好完工后要在这儿喝杯热饮。',
        close: '{name}靠近你悄声说：这处湖岸风景很好，能和你一起留给小镇更好了。',
      },
      stages: [
        { base: '湖岸小路整理好了，浅滩边终于有了安全平整的步道。', acquainted: '{name}把贝壳放在路边：再安一张长椅，大家就能留下来多坐一会儿。', familiar: '{name}沿着新路走了一遍：等长椅送到，我们就能边喝热饮边看湖。', close: '{name}说这条路让湖岸更亲近了：以后你想散心，随时都能来找我。' },
        { base: '长椅安放在湖边，散步的人终于有地方看水、歇脚。', acquainted: '{name}在长椅旁放好杯垫：湖风刚好，欢迎大家随时来坐坐。', familiar: '{name}把热饮递给你：这是我们一起整理出来的好风景。', close: '{name}在长椅边留了你们的名字：以后每次看湖，都能想起今天。' },
      ],
    },
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
