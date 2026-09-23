// 小镇共建计划：主线通关后开放的永久、多路线建设目标。
import { getTownProject, townProjects } from '../config/townProjects.js';
import { addRewards, hasEnough, spendItem } from '../core/inventory.js';
import { recordFurniture } from './codex.js';
import { getRelationshipProgress } from './relationships.js';
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
  if (!state.community.projects.invitations || typeof state.community.projects.invitations !== 'object') {
    state.community.projects.invitations = {};
  }
  if (!Array.isArray(state.community.projects.journal)) state.community.projects.journal = [];
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

function getStoryLine(project, type, stageIndex, tier, name = '') {
  const entry = type === 'invite'
    ? project.tales.invite
    : project.tales.stages[stageIndex];
  const line = entry?.[tier] || entry?.base || '';
  return line.replaceAll('{name}', name);
}

function recordJournal(state, entry) {
  state.community.projects.journal.push({
    id: `${entry.projectId}:${entry.type}:${entry.stage ?? 'invite'}:${Date.now()}:${state.community.projects.journal.length}`,
    at: new Date().toISOString(),
    ...entry,
  });
}

function getInviteContext(state, project) {
  const npcId = state.community.projects.invitations?.[project.id];
  if (!npcId) return { npcId: null, name: '', tier: 'base' };
  const friend = (state.friends || []).find((entry) => entry.id === npcId);
  const relationship = getRelationshipProgress(state, npcId).current;
  return { npcId, name: friend?.name || '', tier: relationship?.id || 'base' };
}

export function inviteNeighborToTownProject(state, projectId, friendId) {
  const project = getTownProject(projectId);
  if (!project) return { success: false, message: '没有这项共建计划' };
  if (!areTownProjectsUnlocked(state)) return { success: false, message: '完成第二季剧情后即可邀请邻居' };

  ensureProjectState(state);
  if (state.community.projects.invitations[projectId]) return { success: false, message: '这条路线已经邀请过邻居' };
  const friend = (state.friends || []).find((entry) => entry.id === friendId && entry.isFriend);
  if (!friend) return { success: false, message: '先和这位邻居成为好友，再邀请他参与共建' };

  state.community.projects.invitations[projectId] = friendId;
  const relationship = getRelationshipProgress(state, friendId).current;
  const tier = relationship?.id || 'base';
  const inviteLine = getStoryLine(project, 'invite', 0, tier, friend.name);
  recordJournal(state, { projectId, projectName: project.name, type: 'invite', npcId: friendId, npcName: friend.name, tier, line: inviteLine });
  logEvent(state, 'town_project_invite');
  return { success: true, message: inviteLine, state };
}

/** 获取某路线的永久建设回顾记录。 */
export function getTownProjectJournal(state, projectId) {
  return (Array.isArray(state.community?.projects?.journal) ? state.community.projects.journal : [])
    .filter((entry) => entry.projectId === projectId);
}

/** 获取全部路线的永久建设回顾记录。 */
export function getTownProjectJournalAll(state) {
  const journal = Array.isArray(state.community?.projects?.journal) ? state.community.projects.journal : [];
  return [...journal].sort((a, b) => String(a.at).localeCompare(String(b.at)));
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
  const invitedNpc = state.community?.projects?.invitations?.[project.id] || null;
  const inviteContext = getInviteContext(state, project);
  const invitedName = inviteContext.name;
  const tier = inviteContext.tier;
  const tale = completed
    ? project.tales.stages[project.stages.length - 1][tier] || project.tales.stages[project.stages.length - 1].base
    : project.tales.stages[record.stage][tier] || project.tales.stages[record.stage].base;
  return {
    project,
    completed,
    stage: record.stage,
    points: record.points,
    totalStages: project.stages.length,
    currentStage,
    percent: currentStage ? Math.min(100, Math.floor((record.points / currentStage.target) * 100)) : 100,
    invitedNpc,
    invitedName: invitedNpc ? invitedName : null,
    relationshipTier: invitedNpc ? tier : null,
    tale: invitedNpc ? tale.replaceAll('{name}', invitedName) : null,
    journal: getTownProjectJournal(state, projectId),
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

    const invite = getInviteContext(state, project);
    const line = getStoryLine(project, 'stage', status.stage, invite.tier, invite.name);
    recordJournal(state, {
      projectId,
      projectName: project.name,
      type: 'stage',
      stage: status.stage + 1,
      stageName: status.currentStage.label,
      npcId: invite.npcId,
      npcName: invite.name || null,
      tier: invite.tier,
      line,
    });
  }

  const updated = getTownProjectProgress(state, projectId);
  const message = completedStage
    ? updated.completed
      ? `${project.name}完工！${updated.journal.at(-1)?.line || '感谢你和邻居一起留下这段建设回忆。'}纪念摆件已送到家园背包`
      : `${project.name}「${status.currentStage.label}」完成。${updated.journal.at(-1)?.line || '下一阶段已开启'}`
    : `为${project.name}提交了${donated}份材料，阶段进度 ${record.points}/${updated.currentStage.target}`;

  return {
    success: true,
    message,
    state,
    donated,
    completedStage,
    completedProject: updated.completed,
    storyLine: completedStage ? updated.journal.at(-1)?.line || '' : '',
  };
}

/** 全部永久共建路线是否完成。 */
export function haveCompletedAllTownProjects(state) {
  const savedCompleted = Array.isArray(state.community?.projects?.completed) ? state.community.projects.completed : [];
  return townProjects.every((project) => savedCompleted.includes(project.id));
}
