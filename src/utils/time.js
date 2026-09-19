// 时间格式化工具函数

/**
 * 格式化秒数为 MM:SS 或 HH:MM:SS 格式
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时间字符串
 */
export function formatTime(seconds) {
  if (seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * 获取本地日期键（YYYY-MM-DD）
 * 用本地时区而不是 UTC，避免国内玩家在早上 8 点前被当成“昨天”。
 * @param {Date} [date]
 * @returns {string} 日期字符串
 */
export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 获取本地昨天的日期键
 * @returns {string}
 */
export function yesterdayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return todayKey(date);
}

/**
 * 计算两个时间戳之间的秒数差
 * @param {string|number} startTime - 开始时间
 * @param {string|number} endTime - 结束时间（默认当前时间）
 * @returns {number} 秒数差
 */
export function getSecondsDiff(startTime, endTime = Date.now()) {
  const start = typeof startTime === 'string' ? new Date(startTime).getTime() : startTime;
  const end = typeof endTime === 'string' ? new Date(endTime).getTime() : endTime;
  return Math.floor((end - start) / 1000);
}

/**
 * 格式化时间戳为可读字符串
 * @param {string} timestamp - ISO 时间戳
 * @returns {string} 格式化的日期时间
 */
export function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN');
}

/**
 * 获取本地周一为一周起点的周键（YYYY-Www）
 * 用于每周排行榜之类的按周重置玩法。
 * @param {Date} [date]
 * @returns {string}
 */
export function weekKey(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // 周一=0 ... 周日=6，先回到本周周一
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-W${m}${dd}`;
}
