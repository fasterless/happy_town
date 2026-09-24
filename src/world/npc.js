// 邻居
//
// 五位邻居在自己的店铺门口和广场之间来回走，靠近时可以说话。
// 台词只读 config：当天的日程台词，加上剧情章节里属于他的开场白。
// 不记录好感度，也不写回主游戏。

import { defaultFriends } from '../config/npcs.js';
import { neighborSchedules, scheduleStates } from '../config/schedules.js';
import { storyChapters } from '../config/story.js';
import { dayKey } from './sim.js';

// 每位邻居的巡逻路线（店铺门口 ↔ 广场）
const ROUTES = {
  npc_baker: [{ tx: 5, ty: 8 }, { tx: 10, ty: 8 }, { tx: 13, ty: 10 }],
  npc_florist: [{ tx: 5, ty: 11 }, { tx: 10, ty: 11 }, { tx: 13, ty: 12 }],
  npc_carpenter: [{ tx: 5, ty: 14 }, { tx: 10, ty: 14 }, { tx: 13, ty: 14 }],
  npc_barista: [{ tx: 16, ty: 9 }, { tx: 16, ty: 12 }, { tx: 14, ty: 12 }],
  npc_mayor: [{ tx: 14, ty: 8 }, { tx: 14, ty: 12 }, { tx: 18, ty: 12 }],
};

function hash(text) {
  let value = 0;
  for (const ch of text) value = (value * 31 + ch.charCodeAt(0)) % 1000;
  return value;
}

/** 今天这位邻居的状态：在家 / 出门 / 有心事 */
export function scheduleOf(npcId, now) {
  const total = scheduleStates.reduce((sum, s) => sum + s.weight, 0);
  let roll = hash(`${npcId}:${dayKey(now)}`) % total;
  for (const s of scheduleStates) {
    roll -= s.weight;
    if (roll < 0) return s.id;
  }
  return scheduleStates[0].id;
}

/** 靠近时说的话：日程台词优先，后面附上他在剧情里的开场白 */
export function dialogueOf(npcId, now) {
  const schedule = neighborSchedules.find((n) => n.npc === npcId);
  const state = scheduleOf(npcId, now);
  const line = schedule?.states[state]?.lines[0] || '……';
  const chapter = storyChapters.find((c) => c.npc === friendName(npcId));
  return chapter ? `${line}\n${chapter.intro}` : line;
}

function friendName(npcId) {
  return defaultFriends.find((f) => f.id === npcId)?.name || '';
}

export function createNpcs() {
  return defaultFriends.map((friend) => ({
    id: friend.id,
    name: friend.name,
    avatar: friend.avatar,
    route: ROUTES[friend.id] || [{ tx: 14, ty: 12 }],
    waypoint: 0,
    tx: (ROUTES[friend.id] || [{ tx: 14, ty: 12 }])[0].tx,
    ty: (ROUTES[friend.id] || [{ tx: 14, ty: 12 }])[0].ty,
    progress: 0,
  }));
}

/**
 * 推进邻居沿路线移动。stepMs 是累计的毫秒，走完一格换下一格。
 * 返回新数组，不改入参。
 */
export function stepNpcs(npcs, stepMs, msPerTile = 900) {
  return npcs.map((npc) => {
    const next = { ...npc };
    next.progress += stepMs;
    while (next.progress >= msPerTile) {
      next.progress -= msPerTile;
      const target = next.route[next.waypoint];
      if (next.tx === target.tx && next.ty === target.ty) {
        next.waypoint = (next.waypoint + 1) % next.route.length;
      } else {
        next.tx += Math.sign(target.tx - next.tx);
        next.ty += Math.sign(target.ty - next.ty);
      }
    }
    return next;
  });
}

/** 离玩家一格以内的邻居 */
export function nearbyNpc(npcs, tx, ty) {
  return npcs.find((npc) => Math.abs(npc.tx - tx) + Math.abs(npc.ty - ty) <= 1) || null;
}
