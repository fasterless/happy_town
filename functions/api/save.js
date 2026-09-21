// POST /api/save —— 云端备份存档
//
// body: { uid, deviceKey, state }
// 首次保存时服务端把 deviceKey 绑定到该 uid；之后必须带同一个 key（防陌生人瞎猜 uid 破坏存档）
import { isValidUid, jsonResponse } from './_utils.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'bad body' }, 400);
  }

  const { uid, deviceKey, state } = body;
  if (!isValidUid(uid) || !deviceKey || !state || typeof state !== 'object') {
    return jsonResponse({ success: false, error: 'bad body' }, 400);
  }

  // 存档上限 512KB 防滥用（KV 单值上限 25MB，游戏存档实际只有几十 KB）
  const payload = JSON.stringify(state);
  if (payload.length > 512 * 1024) {
    return jsonResponse({ success: false, error: 'state too large' }, 413);
  }

  const boundKey = await env.SAVE_KV.get(`auth:${uid}`);
  if (boundKey && boundKey !== deviceKey) {
    return jsonResponse({ success: false, error: 'device conflict' }, 409);
  }
  if (!boundKey) {
    await env.SAVE_KV.put(`auth:${uid}`, deviceKey);
  }

  await env.SAVE_KV.put(`save:${uid}`, payload);
  return jsonResponse({ success: true }, 200);
}
