// 云存档同步模块
//
// 策略：
//   - 本地 localStorage 永远是主存档（离线也能玩）
//   - 云端 (Cloudflare Pages Functions + KV) 是异步备份：保存时顺带推送，失败不阻塞游戏
//   - 启动时云端优先：云端有更新（savedAt 更新）就取云端，本地兜底
//   - 站点部署在 Cloudflare Pages 时接口同源（/api），自动启用；本地 dev 自动跳过
//
// 鉴权：首次保存时生成 deviceKey 存 localStorage，服务端把它绑定到 userId。
// 换设备场景走「迁移码」：旧设备导出 deviceKey，新设备导入后即可接管云端存档。

const WORKER_URL_KEY = 'neighbor-town-cloud-url';
const DEVICE_KEY_KEY = 'neighbor-town-device-key';
const CLOUD_SAVED_AT = 'cloudSavedAt';

// 云同步节流：两次上传之间至少间隔 60 秒（KV 免费档每天 1000 次写入）
const MIN_UPLOAD_INTERVAL = 60 * 1000;
let lastUploadAt = 0;
let uploadTimer = null;
let pendingState = null;

/**
 * 读取 Worker 地址：手动配置的优先；没配置但站点本身跑在 Cloudflare Pages
 * （同源 /api 可用）时自动启用，本地 dev 模式（localhost）自动跳过
 */
export function getWorkerUrl() {
  try {
    const configured = localStorage.getItem(WORKER_URL_KEY);
    if (configured) return configured;
    const host = location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `${location.origin}/api`;
    }
    return '';
  } catch {
    return '';
  }
}

/** 设置 Worker 地址（空字符串 = 关闭云同步） */
export function setWorkerUrl(url) {
  try {
    if (url) localStorage.setItem(WORKER_URL_KEY, url);
    else localStorage.removeItem(WORKER_URL_KEY);
  } catch {
    /* 隐私模式下 localStorage 不可用时静默失败 */
  }
}

export function isCloudEnabled() {
  return Boolean(getWorkerUrl());
}

/** 取本机设备密钥，没有则生成一个（32 位随机串） */
function getDeviceKey() {
  try {
    let key = localStorage.getItem(DEVICE_KEY_KEY);
    if (!key) {
      key = cryptoRandom();
      localStorage.setItem(DEVICE_KEY_KEY, key);
    }
    return key;
  } catch {
    return '';
  }
}

function cryptoRandom() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** 记录/读取云端存档的时间戳，用于和本地比较新旧 */
function setCloudSavedAt(iso) {
  try {
    localStorage.setItem(CLOUD_SAVED_AT, iso);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// 启动时合并：云端 vs 本地，取新的那个
// ---------------------------------------------------------------------------

/**
 * 从云端拉取存档，和本地比较 savedAt，新者胜
 * @returns {Promise<{cloudState: Object|null, usedCloud: boolean, reason: string}>}
 */
export async function fetchCloudState() {
  const base = localStorage.getItem('neighbor-town-mvp-state-v2');
  const local = safeParse(base);
  const localAt = local?.user?.lastLoginAt || '';
  const workerUrl = getWorkerUrl();
  const uid = local?.user?.userId;

  if (!workerUrl || !uid) {
    return { cloudState: null, usedCloud: false, reason: 'disabled' };
  }

  try {
    const res = await fetch(
      `${workerUrl}/load?uid=${encodeURIComponent(uid)}&key=${encodeURIComponent(getDeviceKey())}`
    );
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      // 404 = 云端还没有存档（本机第一次开云同步，正常流程）
      // 403 = 这个 userId 被别的设备占着，走迁移流程
      return {
        cloudState: null,
        usedCloud: false,
        reason: res.status === 403 ? 'device-conflict' : res.status === 404 ? 'no-cloud-save' : 'error',
      };
    }

    const cloudAt = data.state?.user?.lastLoginAt || '';
    setCloudSavedAt(cloudAt);

    if (!local || cloudAt > localAt) {
      return { cloudState: data.state, usedCloud: true, reason: 'cloud-newer' };
    }
    return { cloudState: data.state, usedCloud: false, reason: 'local-newer' };
  } catch {
    return { cloudState: null, usedCloud: false, reason: 'offline' };
  }
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 上传：节流 + 防抖，失败不打断游戏
// ---------------------------------------------------------------------------

/**
 * 云端备份当前状态（60 秒内多次调用只会上传一次）
 * 由 storage.js 的 debouncedSave 调用，网络失败静默忽略
 */
export function syncToCloud(state) {
  const workerUrl = getWorkerUrl();
  const uid = state?.user?.userId;
  if (!workerUrl || !uid || !state?.user?.created) return;

  pendingState = state;

  const due = Date.now() - lastUploadAt >= MIN_UPLOAD_INTERVAL;
  if (uploadTimer) clearTimeout(uploadTimer);
  // 已到上传窗口就直接 3 秒防抖后传；否则等到窗口到期再传一次
  uploadTimer = setTimeout(() => {
    uploadTimer = null;
    if (Date.now() - lastUploadAt < MIN_UPLOAD_INTERVAL) return;
    uploadNow(workerUrl, uid);
  }, due ? 3000 : MIN_UPLOAD_INTERVAL - (Date.now() - lastUploadAt));
}

async function uploadNow(workerUrl, uid) {
  const state = pendingState;
  pendingState = null;
  if (!state) return;

  lastUploadAt = Date.now();
  try {
    const res = await fetch(`${workerUrl}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, deviceKey: getDeviceKey(), state }),
    });
    if (res.ok) {
      state.user.lastCloudSyncAt = new Date().toISOString();
      setCloudSavedAt(state.user.lastLoginAt);
    }
  } catch {
    /* 离线或接口挂了，本地存档不受影响 */
  }
}

/** 立即上传一次（手动「立即备份」按钮用），返回是否成功 */
export async function forceSyncNow(state) {
  const workerUrl = getWorkerUrl();
  const uid = state?.user?.userId;
  if (!workerUrl || !uid) return { ok: false, message: '未配置云端地址' };

  try {
    const res = await fetch(`${workerUrl}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, deviceKey: getDeviceKey(), state }),
    });

    if (res.ok) {
      state.user.lastCloudSyncAt = new Date().toISOString();
      setCloudSavedAt(state.user.lastLoginAt);
      lastUploadAt = Date.now();
      return { ok: true, message: '已备份到云端' };
    }
    if (res.status === 409) {
      return { ok: false, message: '该用户ID已绑定其他设备，请先用迁移码接管' };
    }
    return { ok: false, message: `云端返回 ${res.status}` };
  } catch {
    return { ok: false, message: '网络失败，稍后会自动重试' };
  }
}

// ---------------------------------------------------------------------------
// 设备迁移
// ---------------------------------------------------------------------------

/** 生成迁移码（deviceKey），换设备时在旧设备上展示，新设备上输入 */
export function getMigrationCode() {
  return getDeviceKey();
}

/** 用旧设备的迁移码接管本机（会覆盖本机 deviceKey） */
export function adoptMigrationCode(code) {
  const trimmed = String(code || '').trim();
  if (!/^[a-f0-9]{48}$/.test(trimmed)) {
    return { ok: false, message: '迁移码格式不对' };
  }
  try {
    localStorage.setItem(DEVICE_KEY_KEY, trimmed);
    return { ok: true, message: '已接管，刷新后将拉取云端存档' };
  } catch {
    return { ok: false, message: '本机无法写入设备信息' };
  }
}

/** 上次云同步时间（用于 UI 展示） */
export function getLastSyncText() {
  const state = safeParse(localStorage.getItem('neighbor-town-mvp-state-v2'));
  const at = state?.user?.lastCloudSyncAt;
  if (!at) return '从未同步';
  const diffMin = Math.floor((Date.now() - new Date(at).getTime()) / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} 小时前`;
  return `${Math.floor(diffHr / 24)} 天前`;
}
