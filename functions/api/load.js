// GET /api/load?uid=<userId>&key=<deviceKey> —— 拉取云端存档
import { isValidUid, jsonResponse } from './_utils.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const params = new URL(request.url).searchParams;
  const uid = params.get('uid') || '';
  const deviceKey = params.get('key') || '';

  if (!isValidUid(uid)) {
    return jsonResponse({ success: false, error: 'invalid uid' }, 400);
  }

  const boundKey = await env.SAVE_KV.get(`auth:${uid}`);
  if (!boundKey) {
    return jsonResponse({ success: false, error: 'no save' }, 404);
  }
  if (boundKey !== deviceKey) {
    return jsonResponse({ success: false, error: 'wrong device key' }, 403);
  }

  const saved = await env.SAVE_KV.get(`save:${uid}`);
  if (!saved) {
    return jsonResponse({ success: false, error: 'no save' }, 404);
  }
  return jsonResponse({ success: true, state: JSON.parse(saved) }, 200);
}
