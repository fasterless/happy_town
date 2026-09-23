// 账号鉴权（注册 / 登录 / token）
//
// 密码用 PBKDF2 哈希后存 KV，登录成功签发 HMAC token。
// token 自带过期时间，校验只做签名运算，不读不写 KV ——
// KV 免费档每天只有 1000 次写入，登录不能每次都落库。
import { jsonResponse } from './_utils.js';

const PBKDF2_ITERATIONS = 100000;
const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

export function isValidEmail(email) {
  return /^[a-z0-9._%+-]{1,64}@[a-z0-9.-]{1,128}\.[a-z]{2,24}$/.test(email || '');
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function bytesToB64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function b64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function pbkdf2(password, saltBytes) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: PBKDF2_ITERATIONS },
    key,
    256
  );
  return new Uint8Array(bits);
}

/** 生成 `迭代次数$盐$哈希`，三部分都是 base64 */
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt);
  return `${PBKDF2_ITERATIONS}$${bytesToB64(salt)}$${bytesToB64(hash)}`;
}

/** 校验密码。存的哈希格式不对时直接判失败，不抛异常 */
export async function verifyPassword(password, stored) {
  const [iterations, saltB64, hashB64] = String(stored || '').split('$');
  const rounds = Number(iterations);
  if (!rounds || !saltB64 || !hashB64) return false;

  const salt = b64ToBytes(saltB64);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: rounds },
    key,
    256
  );
  const actual = bytesToB64(new Uint8Array(bits));

  // 定长比较，避免提前返回暴露匹配了几个字符
  if (actual.length !== hashB64.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i += 1) diff |= actual.charCodeAt(i) ^ hashB64.charCodeAt(i);
  return diff === 0;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/** 签发 token：`base64(payload).base64(签名)`，payload 里带 uid 和过期时间 */
export async function signToken(secret, uid) {
  const payload = bytesToB64(
    new TextEncoder().encode(JSON.stringify({
      uid,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    }))
  );
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), new TextEncoder().encode(payload));
  return `${payload}.${bytesToB64(new Uint8Array(signature))}`;
}

/**
 * 校验 token 并取出 uid。
 * 签名不对、过期、或 uid 对不上都返回 null。
 */
export async function verifyToken(secret, token, expectedUid) {
  if (!secret || !token) return null;
  const [payload, signatureB64] = String(token).split('.');
  if (!payload || !signatureB64) return null;

  let signatureOk = false;
  try {
    signatureOk = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      b64ToBytes(signatureB64),
      new TextEncoder().encode(payload)
    );
  } catch {
    return null;
  }
  if (!signatureOk) return null;

  let data;
  try {
    data = JSON.parse(new TextDecoder().decode(b64ToBytes(payload)));
  } catch {
    return null;
  }
  if (!data || data.uid !== expectedUid) return null;
  if (typeof data.exp !== 'number' || data.exp < Math.floor(Date.now() / 1000)) return null;
  return data.uid;
}

/**
 * 存档接口的鉴权：带了 token 走账号登录，没带则退回旧的 deviceKey 绑定。
 * 旧存档在玩家登录绑定之前继续用 deviceKey，两种方式同时有效。
 * @returns {Promise<Response|null>} 鉴权失败时返回响应，通过时返回 null
 */
export async function authorizeSave(env, uid, { token, deviceKey }) {
  if (token) {
    if (!env.AUTH_SECRET) {
      return jsonResponse({ success: false, error: 'auth not configured' }, 500);
    }
    const authedUid = await verifyToken(env.AUTH_SECRET, token, uid);
    if (!authedUid) return jsonResponse({ success: false, error: 'unauthorized' }, 401);
    return null;
  }

  const boundKey = await env.SAVE_KV.get(`auth:${uid}`);
  if (boundKey && boundKey !== deviceKey) {
    return jsonResponse({ success: false, error: 'device conflict' }, 409);
  }
  if (!boundKey) {
    if (!deviceKey) return jsonResponse({ success: false, error: 'unauthorized' }, 401);
    await env.SAVE_KV.put(`auth:${uid}`, deviceKey);
  }
  return null;
}
