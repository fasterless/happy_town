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
 * 获取今天的日期键（YYYY-MM-DD）
 * @returns {string} 日期字符串
 */
export function todayKey() {
  return new Date().toISOString().slice(0, 10);
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
