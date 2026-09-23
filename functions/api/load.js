// GET /api/load?uid=<userId>&key=<deviceKey> —— 拉取云端存档
// 登录后的请求改用 Authorization: Bearer <token>，不再把凭证放进 URL（URL 会进访问日志）。
// 没带 token 时仍接受旧的 key 参数，老存档不用先注册也能拉取。
import { isValidUid, jsonResponse } from './_utils.js';
import { authorizeSave } from './_auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const params = new URL(request.url).searchParams;
  const uid = params.get('uid') || '';
  const deviceKey = params.get('key') || '';
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!isValidUid(uid)) {
    return jsonResponse({ success: false, error: 'invalid uid' }, 400);
  }

  const denied = await authorizeSave(env, uid, { token, deviceKey });
  if (denied) return denied;

  const saved = await env.SAVE_KV.get(`save:${uid}`);
  if (!saved) {
    return jsonResponse({ success: false, error: 'no save' }, 404);
  }
  return jsonResponse({ success: true, state: JSON.parse(saved) }, 200);
}
