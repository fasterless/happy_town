// POST /api/register —— 邮箱注册
//
// body: { email, password, uid?, deviceKey? }
// 新账号默认由服务端生成不可猜测的 userId。
// 只有请求同时带上与该 uid 已绑定的 deviceKey，才允许沿用旧存档 uid。
import { isValidUid, jsonResponse } from './_utils.js';
import { hashPassword, isValidEmail, normalizeEmail, signToken } from './_auth.js';

function createUid() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  const id = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `U${id}`;
}

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
  const { password, uid, deviceKey } = body;

  if (!isValidEmail(email)) {
    return jsonResponse({ success: false, error: '邮箱格式不对' }, 400);
  }
  if (typeof password !== 'string' || password.length < 6 || password.length > 64) {
    return jsonResponse({ success: false, error: '密码需要 6-64 位' }, 400);
  }
  if (uid && !isValidUid(uid)) {
    return jsonResponse({ success: false, error: 'bad body' }, 400);
  }

  const existing = await env.SAVE_KV.get(`account:${email}`);
  if (existing) {
    return jsonResponse({ success: false, error: '这个邮箱已经注册过了' }, 409);
  }

  let accountUid = createUid();
  if (uid && deviceKey) {
    const boundKey = await env.SAVE_KV.get(`auth:${uid}`);
    if (boundKey && boundKey === deviceKey) accountUid = uid;
  }

  await env.SAVE_KV.put(`account:${email}`, JSON.stringify({
    hash: await hashPassword(password),
    uid: accountUid,
    createdAt: new Date().toISOString(),
  }));

  const token = await signToken(env.AUTH_SECRET, accountUid);
  return jsonResponse({ success: true, token, uid: accountUid }, 200);
}
