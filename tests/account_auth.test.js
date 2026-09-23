// 账号登录后端逻辑：密码哈希、token 签发与校验
//
// 这里的函数都只依赖 Web Crypto（Workers、Node 18+ 都有），不碰 KV，
// 所以可以直接在测试里跑，不需要模拟 env。
import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  normalizeEmail,
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  authorizeSave,
} from '../functions/api/_auth.js';

const SECRET = 'test-secret-value';

describe('邮箱校验', () => {
  it('接受常见邮箱', () => {
    expect(isValidEmail('player@example.com')).toBe(true);
    expect(isValidEmail('a.b+c@sub.example.co.uk')).toBe(true);
  });

  it('拒绝空值、缺 @、缺顶级域、含空格或非法字符', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail('no-at-sign.com')).toBe(false);
    expect(isValidEmail('missing@tld')).toBe(false);
    expect(isValidEmail('has space@example.com')).toBe(false);
    expect(isValidEmail('bad<chars>@example.com')).toBe(false);
  });

  it('normalizeEmail 统一小写并去首尾空格', () => {
    expect(normalizeEmail('  Player@Example.COM ')).toBe('player@example.com');
  });
});

describe('密码哈希', () => {
  it('同样的密码每次得到不同哈希（随机盐）', async () => {
    const a = await hashPassword('secret123');
    const b = await hashPassword('secret123');
    expect(a).not.toBe(b);
    expect(a.split('$')).toHaveLength(3);
  });

  it('正确密码校验通过，错误密码不通过', async () => {
    const stored = await hashPassword('secret123');
    expect(await verifyPassword('secret123', stored)).toBe(true);
    expect(await verifyPassword('wrong-password', stored)).toBe(false);
  });

  it('哈希被篡改时校验失败而不抛异常', async () => {
    const stored = await hashPassword('secret123');
    const [rounds, salt] = stored.split('$');
    expect(await verifyPassword('secret123', `${rounds}$${salt}$MDAwMDAw`)).toBe(false);
    expect(await verifyPassword('secret123', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('secret123', '')).toBe(false);
  });
});

describe('token 签发与校验', () => {
  it('同一密钥签发的 token 能通过校验并取回 uid', async () => {
    const token = await signToken(SECRET, 'U123456');
    expect(await verifyToken(SECRET, token, 'U123456')).toBe('U123456');
  });

  it('别的密钥签的 token 直接被拒', async () => {
    const token = await signToken('other-secret', 'U123456');
    expect(await verifyToken(SECRET, token, 'U123456')).toBeNull();
  });

  it('uid 不匹配、格式损坏、空值都判失败', async () => {
    const token = await signToken(SECRET, 'U123456');
    expect(await verifyToken(SECRET, token, 'U999999')).toBeNull();
    expect(await verifyToken(SECRET, '', 'U123456')).toBeNull();
    expect(await verifyToken('', token, 'U123456')).toBeNull();
    expect(await verifyToken(SECRET, 'not.a.token', 'U123456')).toBeNull();
    expect(await verifyToken(SECRET, 'onlyonepart', 'U123456')).toBeNull();
  });

  it('过期 token 不再有效', async () => {
    // 手动签一个 exp 在过去的 token（signToken 只发未来时间，这里改 payload 再签一遍）
    const payload = btoa(JSON.stringify({ uid: 'U123456', exp: 1 }));
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    const encoded = btoa(String.fromCharCode(...new Uint8Array(signature)));
    const expired = `${payload}.${encoded}`;

    expect(await verifyToken(SECRET, expired, 'U123456')).toBeNull();
  });
});

describe('存档接口鉴权', () => {
  function makeEnv(store) {
    return {
      AUTH_SECRET: SECRET,
      SAVE_KV: {
        get: async (key) => store[key] ?? null,
        put: async (key, value) => {
          store[key] = value;
        },
      },
    };
  }

  it('带有效 token 时直接放行，且完全不碰 KV', async () => {
    const store = {
      'auth:U123456': 'existing-device-key',
    };
    let reads = 0;
    const env = {
      AUTH_SECRET: SECRET,
      SAVE_KV: {
        get: async (key) => {
          reads += 1;
          return store[key] ?? null;
        },
        put: async (key, value) => {
          store[key] = value;
        },
      },
    };
    const token = await signToken(SECRET, 'U123456');

    expect(await authorizeSave(env, 'U123456', { token })).toBeNull();
    expect(reads).toBe(0);
  });

  it('token 的 uid 和请求的 uid 不一致时返回 401', async () => {
    const env = makeEnv({});
    const token = await signToken(SECRET, 'U123456');
    const denied = await authorizeSave(env, 'U999999', { token });

    expect(denied?.status).toBe(401);
  });

  it('没有 AUTH_SECRET 时带 token 的请求返回 500', async () => {
    const env = makeEnv({});
    const token = await signToken(SECRET, 'U123456');
    const denied = await authorizeSave({ ...env, AUTH_SECRET: '' }, 'U123456', { token });

    expect(denied?.status).toBe(500);
  });

  it('老存档：首次 deviceKey 会被绑定，之后相同 key 放行', async () => {
    const store = {};
    const env = makeEnv(store);

    expect(await authorizeSave(env, 'U123456', { deviceKey: 'key-a' })).toBeNull();
    expect(store['auth:U123456']).toBe('key-a');
    expect(await authorizeSave(env, 'U123456', { deviceKey: 'key-a' })).toBeNull();
  });

  it('老存档：别的 deviceKey 撞同一 uid 返回 409', async () => {
    const env = makeEnv({ 'auth:U123456': 'key-a' });
    const denied = await authorizeSave(env, 'U123456', { deviceKey: 'key-b' });

    expect(denied?.status).toBe(409);
  });

  it('token 和 deviceKey 都没带时返回 401，且不写入 KV', async () => {
    const store = {};
    let writes = 0;
    const env = {
      AUTH_SECRET: SECRET,
      SAVE_KV: {
        get: async (key) => store[key] ?? null,
        put: async (key, value) => {
          writes += 1;
          store[key] = value;
        },
      },
    };
    const denied = await authorizeSave(env, 'U123456', {});

    expect(denied?.status).toBe(401);
    expect(writes).toBe(0);
  });
});
