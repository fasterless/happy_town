// Toast 提示组件
let toastTimer = null;

/**
 * 显示 Toast 提示
 * @param {string} message - 提示消息
 * @param {string} type - 类型 (success/error/warning/info)
 * @param {number} duration - 显示时长（毫秒）
 */
export function showToast(message, type = "info", duration = 2300) {
  const toast = document.getElementById("toast");
  if (!toast) {
    console.warn("Toast element not found");
    return;
  }

  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

/**
 * 隐藏 Toast
 */
export function hideToast() {
  const toast = document.getElementById("toast");
  if (toast) {
    toast.classList.remove("show");
  }
  clearTimeout(toastTimer);
}

/**
 * 显示成功提示
 * @param {string} message - 提示消息
 */
export function showSuccess(message) {
  showToast(message, "success");
}

/**
 * 显示错误提示
 * @param {string} message - 提示消息
 */
export function showError(message) {
  showToast(message, "error");
}

/**
 * 显示警告提示
 * @param {string} message - 提示消息
 */
export function showWarning(message) {
  showToast(message, "warning");
}
