// 小镇共建计划：主线通关后开放的永久、多路线建设目标。
import { getTownProject, townProjects } from '../config/townProjects.js';
import { addRewards, hasEnough, spendItem } from '../core/inventory.js';
import { recordFurniture } from './codex.js';
import { isStoryComplete } from './story.js';
import { logEvent } from '../utils/analytics.js';

function ensureProjectState(state) {
  if (!state.community.projects || typeof state.community.projects !== 'object') {
    state.community.projects = { completed: [], progress: {} };
  }
  if (!Array.isArray(state.community.projects.completed)) state.community.projects.completed = [];
  if (!state.community.projects.progress || typeof state.community.projects.progress !== 'object') {
    state.community.projects.progress = {};
  }
}

function getProgressRecord(state, project) {
  const saved = state.community?.projects?.progress?.[project.id] || {};
  const stage = Number.isInteger(saved.stage) ? Math.max(0, Math.min(saved.stage, project.stages.length)) : 0;
  const stageConfig = project.stages[stage];
  const points = stageConfig && Number.isFinite(saved.points)
    ? Math.max(0, Math.min(saved.points, stageConfig.target))
    : 0;
  return { stage, points };
}

/** 共建路线在第二季主线完成后开放。 */
export function areTownProjectsUnlocked(state) {
  return isStoryComplete(state);
}

/** 获取一路线的永久进度与当前阶段。 */
export function getTownProjectProgress(state, projectId) {
  const project = getTownProject(projectId);
  if (!project) return null;

  const savedCompleted = Array.isArray(state.community?.projects?.completed) ? state.community.projects.completed : [];
  const record = getProgressRecord(state, project);
  const completed = savedCompleted.includes(project.id) || record.stage >= project.stages.length;
  const currentStage = completed ? null : project.stages[record.stage];
  return {
    project,
    completed,
    stage: record.stage,
    points: record.points,
    totalStages: project.stages.length,
    currentStage,
    percent: currentStage ? Math.min(100, Math.floor((record.points / currentStage.target) * 100)) : 100,
  };
}

/** 捐献当前阶段接受的材料；多余数量不扣除，路线之间互不排斥。 */
export function contributeToTownProject(state, projectId, itemKey, amount) {
  const project = getTownProject(projectId);
  if (!project) return { success: false, message: '没有这项共建计划' };
  if (!areTownProjectsUnlocked(state)) return { success: false, message: '完成第二季剧情后即可参与小镇共建' };
  if (!Number.isInteger(amount) || amount < 1) return { success: false, message: '请输入有效的捐献数量' };

  ensureProjectState(state);
  const status = getTownProjectProgress(state, projectId);
  if (status.completed) return { success: false, message: '这条共建路线已经完工' };

  const material = status.currentStage.accepts.find((entry) => entry.item === itemKey);
  if (!material) return { success: false, message: '当前阶段不需要这种材料' };

  const needed = Math.ceil((status.currentStage.target - status.points) / material.value);
  const donated = Math.min(amount, needed);
  if (!hasEnough(state, itemKey, donated)) return { success: false, message: '材料数量不足' };

  spendItem(state, itemKey, donated);
  const record = state.community.projects.progress[projectId] || { stage: 0, points: 0 };
  record.points = Math.min(status.currentStage.target, status.points + donated * material.value);
  state.community.projects.progress[projectId] = record;
  logEvent(state, 'town_project_donate');

  let completedStage = false;
  if (record.points >= status.currentStage.target) {
    completedStage = true;
    addRewards(state, status.currentStage.reward);
    Object.keys(status.currentStage.reward).forEach((key) => {
      if (key.startsWith('f_')) recordFurniture(state, Number(key.slice(2)));
    });
    record.stage += 1;
    record.points = 0;

    if (record.stage >= project.stages.length) {
      state.community.projects.completed.push(project.id);
      logEvent(state, 'town_project_complete');
    }
  }

  const updated = getTownProjectProgress(state, projectId);
  const message = updated.completed
    ? `${project.name}完工！纪念摆件已送到家园背包`
    : completedStage
      ? `${project.name}「${status.currentStage.label}」完成，下一阶段已开启`
      : `为${project.name}提交了${donated}份材料，阶段进度 ${record.points}/${updated.currentStage.target}`;

  return { success: true, message, state, donated, completedStage, completedProject: updated.completed };
}

/** 全部永久共建路线是否完成。 */
export function haveCompletedAllTownProjects(state) {
  const savedCompleted = Array.isArray(state.community?.projects?.completed) ? state.community.projects.completed : [];
  return townProjects.every((project) => savedCompleted.includes(project.id));
}
