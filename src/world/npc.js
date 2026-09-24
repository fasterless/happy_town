// 邻居
//
// 五位邻居在店铺、主路和广场之间来回走，靠近时可以说话。
// 台词只读 config，不记录好感度，也不写回主游戏。

import { defaultFriends } from '../config/npcs.js';
import { neighborSchedules, scheduleStates } from '../config/schedules.js';
import { storyChapters } from '../config/story.js';
import { dayKey } from './sim.js';

const ROUTES = {
  npc_baker: [{ tx: 6, ty: 8 }, { tx: 9, ty: 8 }, { tx: 10, ty: 12 }, { tx: 13, ty: 13 }],
  npc_florist: [{ tx: 6, ty: 12 }, { tx: 9, ty: 12 }, { tx: 11, ty: 15 }, { tx: 13, ty: 17 }],
  npc_carpenter: [{ tx: 6, ty: 16 }, { tx: 9, ty: 16 }, { tx: 11, ty: 18 }, { tx: 13, ty: 18 }],
  npc_barista: [{ tx: 13, ty: 10 }, { tx: 13, ty: 12 }, { tx: 16, ty: 12 }, { tx: 17, ty: 13 }],
  npc_mayor: [{ tx: 14, ty: 13 }, { tx: 14, ty: 18 }, { tx: 18, ty: 18 }, { tx: 18, ty: 13 }],
};

function hash(text) {
  let value = 0;
  for (const ch of text) value = (value * 31 + ch.charCodeAt(0)) % 1000;
  return value;
}

/** 今天这位邻居的状态：在家 / 出门 / 有心事 */
export function scheduleOf(npcId, now) {
  const total = scheduleStates.reduce((sum, state) => sum + state.weight, 0);
  let roll = hash(`${npcId}:${dayKey(now)}`) % total;
  for (const state of scheduleStates) {
    roll -= state.weight;
    if (roll < 0) return state.id;
  }
  return scheduleStates[0].id;
}

/** 靠近时说的话：日程台词优先，后面附上他在剧情里的开场白 */
export function dialogueOf(npcId, now) {
  const schedule = neighborSchedules.find((entry) => entry.npc === npcId);
  const state = scheduleOf(npcId, now);
  const line = schedule?.states[state]?.lines[0] || '……';
  const chapter = storyChapters.find((entry) => entry.npc === friendName(npcId));
  return chapter ? `${line}\n${chapter.intro}` : line;
}

function friendName(npcId) {
  return defaultFriends.find((friend) => friend.id === npcId)?.name || '';
}

export function createNpcs() {
  return defaultFriends.map((friend) => {
    const route = ROUTES[friend.id] || [{ tx: 14, ty: 14 }];
    return {
      id: friend.id,
      name: friend.name,
      avatar: friend.avatar,
      route,
      waypoint: 0,
      tx: route[0].tx,
      ty: route[0].ty,
      rx: route[0].tx,
      ry: route[0].ty,
      progress: 0,
    };
  });
}

/** 推进邻居沿路径行走；返回新数组，不改入参。 */
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
