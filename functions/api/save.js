// POST /api/save —— 云端备份存档
//
// body: { uid, state, token?, deviceKey? }
// 登录过的玩家带 token（HMAC 签名，不占 KV 写入）；
// 还没注册的老存档继续用 deviceKey，首次保存时绑定到该 uid。
import { isValidUid, jsonResponse } from './_utils.js';
import { authorizeSave } from './_auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'bad body' }, 400);
  }

  const { uid, deviceKey, token, state } = body;
  if (!isValidUid(uid) || !state || typeof state !== 'object') {
    return jsonResponse({ success: false, error: "bad body" }, 400);
  }
  if (!token && !deviceKey) {
    return jsonResponse({ success: false, error: "bad body" }, 400);
  }

  // 存档上限 512KB 防滥用（KV 单值上限 25MB，游戏存档实际只有几十 KB）
  const payload = JSON.stringify(state);
  if (payload.length > 512 * 1024) {
    return jsonResponse({ success: false, error: "state too large" }, 413);
  }

  const denied = await authorizeSave(env, uid, { token, deviceKey });
  if (denied) return denied;

  await env.SAVE_KV.put(`save:${uid}`, payload);
  return jsonResponse({ success: true }, 200);
}
