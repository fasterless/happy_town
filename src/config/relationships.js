// 邻居关系配置
//
// 关系进度是每位邻居独立累计的熟悉度。拜访、回应求助和帮浇都能推进，
// 达到阶段后奖励只发一次，不会因为重复互动回退或重复领取。
export const relationshipTiers = [
  { id: "acquainted", name: "相识", points: 3, rewards: { coin: 80 } },
  { id: "familiar", name: "熟识", points: 8, rewards: { friendPoint: 30, diamond: 5 } },
  { id: "close", name: "知心", points: 16, rewards: { diamond: 15, coin: 300 } },
];

export const relationshipActions = {
  visit: 1,
  help: 2,
  water: 1,
};

// 每位邻居在三个关系阶段的专属回忆。
// lines 按邻居当天的日程状态取一句，回忆奖励只领一次。
export const neighborMemories = [
  { npc: "npc_mayor", events: {
    acquainted: { title: "喷泉边的约定", lines: { home: "镇长翻开旧账本：喷泉第一次喷水那天，全镇的人都来了。", out: "管家转述镇长的话：他年轻时也常在喷泉边等朋友。", troubled: "镇长叹了口气：预算不够时，是邻居们凑齐了第一桶石料。" }, rewards: { coin: 120 } },
    familiar: { title: "镇长的备用钥匙", lines: { home: "镇长递来一把旧钥匙：广场仓库的门，你也可以开。", out: "桌上留着钥匙和字条：我去巡街了，仓库里的木料你先用。", troubled: "镇长说：今天的难题先放下，这把钥匙代表我信任你。" }, rewards: { wood: 12, coin: 150 } },
    close: { title: "暖阳镇的来历", lines: { home: "镇长泡了壶茶，讲起小镇名字来自第一场冬日暖阳。", out: "镇长巡完街回来，把没讲完的小镇故事郑重讲给你听。", troubled: "镇长终于笑了：只要邻居还互相记挂，暖阳就不会灭。" }, rewards: { diamond: 20, coin: 300 } },
  } },
  { npc: "npc_baker", events: {
    acquainted: { title: "第一炉面包", lines: { home: "面包师揭开烤盘：这是我第一次烤到不糊的面包。", out: "送货篮里夹着字条：第一炉面包，我分给了整条街。", troubled: "面包师看着订单：人多的时候，我反而不敢浪费一口面团。" }, rewards: { goods_5001: 1 } },
    familiar: { title: "午夜的烤箱", lines: { home: "面包师把配方折好递给你：午夜那炉，是为赶路的人留的。", out: "店门上写着：配方在柜台下，别让烤箱空着。", troubled: "面包师轻声说：有些人赶夜路，就为了吃一口热的。" }, rewards: { goods_5001: 2, coin: 100 } },
    close: { title: "留给朋友的那一块", lines: { home: "面包师切开最中间的一块：这块从来不卖，只留给朋友。", out: "纸袋里放着热面包：我出门了，但这块给你留着。", troubled: "面包师把忧虑放下：卖不完也没关系，朋友来了就值得。" }, rewards: { diamond: 15, goods_5001: 2 } },
  } },
  { npc: "npc_florist", events: {
    acquainted: { title: "篱笆上的花", lines: { home: "阿梨指着篱笆：第一朵花开时，我把它送给了过路的孩子。", out: "花圃留着一枝花：阿梨说，它本来就会找到喜欢的人。", troubled: "阿梨担心花期太短，却仍把第一枝花递到你手里。" }, rewards: { crop_1003: 3 } },
    familiar: { title: "花瓶的缺口", lines: { home: "阿梨转过花瓶：这个缺口，是我搬来小镇时碰的。", out: "窗台上压着字条：缺口朝墙，花就会把房间补满。", troubled: "阿梨说：不完美的花瓶，也装得下完整的春天。" }, rewards: { crop_1003: 5, coin: 120 } },
    close: { title: "一整季的花", lines: { home: "阿梨拉你看花圃：这一季的花，都记得你来过。", out: "花剪和花束放在一起：你来时，季节就会继续。", troubled: "阿梨把心事说完，决定把最喜欢的花种分给你。" }, rewards: { diamond: 15, crop_1003: 6 } },
  } },
  { npc: "npc_carpenter", events: {
    acquainted: { title: "第一把椅子", lines: { home: "阿川拍拍椅子：第一条椅腿，我改了整整三天。", out: "工棚门口挂着木屑袋：第一把椅子的故事，回来再讲。", troubled: "阿川皱眉：尺寸差一点，坐着的人就会记住一辈子。" }, rewards: { wood: 10 } },
    familiar: { title: "木纹里的方向", lines: { home: "阿川顺着木纹比划：每块木头，都有它想去的方向。", out: "工作台上留着铅笔印：顺着这个方向锯，就不会裂。", troubled: "阿川停下尺子：做不好就重来，木头不会怪我。" }, rewards: { wood: 18, coin: 120 } },
    close: { title: "给朋友的凳子", lines: { home: "阿川推出一张小凳：这张没卖，它等的是会再来的人。", out: "凳子上放着纸条：坐下歇会儿，我很快回来。", troubled: "阿川把担心收进工具箱：朋友来了，屋子就完工了。" }, rewards: { diamond: 15, wood: 20 } },
  } },
  { npc: "npc_barista", events: {
    acquainted: { title: "第一杯热饮", lines: { home: "小敏推来一杯热饮：第一位客人喝完，笑着说明天还来。", out: "吧台留着温热的杯子：第一杯，是为晚归的人准备的。", troubled: "小敏看着新豆子：味道不准时，我会记得客人的笑容。" }, rewards: { coin: 100 } },
    familiar: { title: "杯子上的名字", lines: { home: "小敏转过杯底：常来的人，杯子上会有一个小小记号。", out: "柜台上放着做记号的笔：你的杯子，我已经留好了。", troubled: "小敏说：就算今天的味道不完美，你的位子也不会变。" }, rewards: { speed_ticket: 1, coin: 120 } },
    close: { title: "打烊后的灯", lines: { home: "小敏关上店门，却留下一盏灯：这是给朋友的打烊时间。", out: "门上挂着暖光：我出去买豆子，灯为你留着。", troubled: "小敏把新豆子的烦恼放下：有人等一杯热饮，就够了。" }, rewards: { diamond: 15, speed_ticket: 2 } },
  } },
];

export function getNeighborMemory(friendId, tierId) {
  return neighborMemories.find((entry) => entry.npc === friendId)?.events[tierId] || null;
}
