// 小镇风貌收藏：路线完工解锁，选择只改变展示并永久记录已采用的风貌。
import { getTownStyle, townStyles } from '../config/townStyles.js';
import { getTownProjectProgress } from './townProjects.js';
import { logEvent } from '../utils/analytics.js';

export function getUnlockedTownStyles(state) {
  return townStyles.filter((style) => getTownProjectProgress(state, style.projectId)?.completed);
}

export function getActiveTownStyle(state) {
  const style = getTownStyle(state.community?.projects?.activeStyle);
  return style && getUnlockedTownStyles(state).some((entry) => entry.id === style.id) ? style : null;
}

export function getSeenTownStyles(state) {
  const seen = Array.isArray(state.community?.projects?.seenStyles) ? state.community.projects.seenStyles : [];
  return townStyles.filter((style) => seen.includes(style.id));
}

export function previewTownStyle(state, styleId) {
  const style = getTownStyle(styleId);
  if (!style) return { success: false, message: '没有这种小镇风貌' };
  if (!getUnlockedTownStyles(state).some((entry) => entry.id === styleId)) {
    return { success: false, message: '完成对应的共建路线后即可预览这款风貌' };
  }
  return { success: true, message: `正在预览「${style.name}」`, style };
}

export function chooseTownStyle(state, styleId) {
  const preview = previewTownStyle(state, styleId);
  if (!preview.success) return preview;

  const projects = state.community.projects;
  if (projects.activeStyle === styleId) return { success: false, message: '这款风貌已经在使用中' };

  projects.activeStyle = styleId;
  if (!Array.isArray(projects.seenStyles)) projects.seenStyles = [];
  if (!projects.seenStyles.includes(styleId)) projects.seenStyles.push(styleId);
  logEvent(state, 'town_style_choose');
  return { success: true, message: `小镇换上了「${preview.style.name}」`, state, style: preview.style };
}

export function clearTownStyle(state) {
  if (!state.community.projects.activeStyle) return { success: false, message: '当前使用的是默认风貌' };
  state.community.projects.activeStyle = null;
  return { success: true, message: '已恢复小镇默认风貌', state };
}

export function haveSeenAllTownStyles(state) {
  return townStyles.every((style) => getSeenTownStyles(state).some((entry) => entry.id === style.id));
}

export { townStyles };
