// 共用工具（_ 前缀文件不生成路由）
export const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function isValidUid(uid) {
  return /^[A-Za-z0-9_-]{1,64}$/.test(uid || '');
}

export function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}
