// POST /api/login —— 邮箱登录
//
// body: { email, password }
// 校验通过后返回 HMAC token。只读 KV 不写，避免登录次数吃掉每天 1000 次的写入额度。
import { jsonResponse } from './_utils.js';
import { isValidEmail, normalizeEmail, signToken, verifyPassword } from './_auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.AUTH_SECRET) {
    return jsonResponse({ success: false, error: 'auth not configured' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'bad body' }, 400);
  }

  const email = normalizeEmail(body.email);
  const { password } = body;

  if (!isValidEmail(email) || typeof password !== 'string' || !password || password.length > 64) {
    return jsonResponse({ success: false, error: '邮箱或密码不对' }, 401);
  }

  const raw = await env.SAVE_KV.get(`account:${email}`);
  if (!raw) {
    return jsonResponse({ success: false, error: '邮箱或密码不对' }, 401);
  }

  let account;
  try {
    account = JSON.parse(raw);
  } catch {
    return jsonResponse({ success: false, error: '邮箱或密码不对' }, 401);
  }

  if (!(await verifyPassword(password, account.hash))) {
    return jsonResponse({ success: false, error: '邮箱或密码不对' }, 401);
  }

  const token = await signToken(env.AUTH_SECRET, account.uid);
  return jsonResponse({ success: true, token, uid: account.uid }, 200);
}
