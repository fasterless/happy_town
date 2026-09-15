// UI 组件库

/**
 * 创建模态框
 * @param {Object} options - 配置选项
 * @returns {HTMLElement} 模态框元素
 */
function escapeText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function createModal(options) {
  const {
    title = "提示",
    content = "",
    showCancel = true,
    confirmText = "确定",
    cancelText = "取消",
    onConfirm = () => {},
    onCancel = () => {},
  } = options;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop show";

  const modal = document.createElement("div");
  modal.className = "modal-card";
  modal.innerHTML = `
    <div class="modal-header">
      <h3>${escapeText(title)}</h3>
    </div>
    <div class="modal-body">${content}</div>
    <div class="modal-footer">
      ${showCancel ? `<button class="btn-cancel">${cancelText}</button>` : ""}
      <button class="btn-confirm">${confirmText}</button>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  // 绑定事件
  const confirmBtn = modal.querySelector(".btn-confirm");
  const cancelBtn = modal.querySelector(".btn-cancel");

  confirmBtn?.addEventListener("click", () => {
    onConfirm();
    closeModal(backdrop);
  });

  cancelBtn?.addEventListener("click", () => {
    onCancel();
    closeModal(backdrop);
  });

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) {
      onCancel();
      closeModal(backdrop);
    }
  });

  return backdrop;
}

/**
 * 关闭模态框
 * @param {HTMLElement} backdrop - 模态框背景元素
 */
export function closeModal(backdrop) {
  backdrop.classList.remove("show");
  setTimeout(() => backdrop.remove(), 300);
}

/**
 * 创建确认对话框
 * @param {string} message - 提示消息
 * @param {Function} onConfirm - 确认回调
 */
export function confirm(message, onConfirm) {
  createModal({
    title: "确认",
    content: message,
    showCancel: true,
    onConfirm,
  });
}

/**
 * 创建进度条
 * @param {number} percent - 进度百分比 (0-100)
 * @param {string} label - 标签
 * @returns {string} HTML 字符串
 */
export function createProgressBar(percent, label = "") {
  const clampedPercent = Math.min(100, Math.max(0, percent));
  return `
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${clampedPercent}%"></div>
      ${label ? `<span class="progress-label">${label}</span>` : ""}
    </div>
  `;
}

/**
 * 创建列表项
 * @param {Object} options - 配置选项
 * @returns {string} HTML 字符串
 */
export function createListItem(options) {
  const {
    icon = "",
    title = "",
    subtitle = "",
    meta = "",
    actions = [],
    className = "",
  } = options;

  const actionsHtml = actions
    .map(
      (action) =>
        `<button class="${action.className || ""}" onclick="${action.onClick}">${action.text}</button>`
    )
    .join("");

  return `
    <div class="list-item ${className}">
      ${icon ? `<span class="item-icon">${icon}</span>` : ""}
      <div class="item-content">
        <div class="list-topline">
          <span class="item-title">${title}</span>
          ${meta ? `<span class="item-meta">${meta}</span>` : ""}
        </div>
        ${subtitle ? `<div class="item-subtitle">${subtitle}</div>` : ""}
      </div>
      ${actions.length ? `<div class="item-actions">${actionsHtml}</div>` : ""}
    </div>
  `;
}

/**
 * 创建卡片
 * @param {Object} options - 配置选项
 * @returns {string} HTML 字符串
 */
export function createCard(options) {
  const {
    title = "",
    content = "",
    footer = "",
    className = "",
  } = options;

  return `
    <div class="card ${className}">
      ${title ? `<div class="card-header"><h3>${title}</h3></div>` : ""}
      <div class="card-body">${content}</div>
      ${footer ? `<div class="card-footer">${footer}</div>` : ""}
    </div>
  `;
}

/**
 * 创建按钮
 * @param {Object} options - 配置选项
 * @returns {string} HTML 字符串
 */
export function createButton(options) {
  const {
    text = "",
    icon = "",
    variant = "primary",
    disabled = false,
    onClick = "",
    className = "",
  } = options;

  return `
    <button
      class="btn btn-${variant} ${className}"
      ${disabled ? "disabled" : ""}
      ${onClick ? `onclick="${onClick}"` : ""}
    >
      ${icon ? `<span class="btn-icon">${icon}</span>` : ""}
      <span class="btn-text">${text}</span>
    </button>
  `;
}

/**
 * 创建徽章
 * @param {string} text - 文本
 * @param {string} type - 类型 (success/error/warning/info)
 * @returns {string} HTML 字符串
 */
export function createBadge(text, type = "info") {
  return `<span class="badge badge-${type}">${text}</span>`;
}

/**
 * 创建加载动画
 * @param {string} message - 加载消息
 * @returns {HTMLElement} 加载元素
 */
export function createLoader(message = "加载中...") {
  const loader = document.createElement("div");
  loader.className = "loader-overlay";
  loader.innerHTML = `
    <div class="loader">
      <div class="spinner"></div>
      <p>${message}</p>
    </div>
  `;
  return loader;
}

/**
 * 显示加载动画
 * @param {string} message - 加载消息
 * @returns {HTMLElement} 加载元素
 */
export function showLoader(message) {
  const loader = createLoader(message);
  document.body.appendChild(loader);
  return loader;
}

/**
 * 隐藏加载动画
 * @param {HTMLElement} loader - 加载元素
 */
export function hideLoader(loader) {
  if (loader && loader.parentNode) {
    loader.remove();
  }
}
