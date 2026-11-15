import { rememberAnswer } from './ContextMemory';
import { syncFocus } from './ConversationState';
import { ConversationState, PendingQuestion, TaskRecord } from './types';

function emptyTask(id: string, name: string): TaskRecord {
  return {
    id,
    name,
    status: 'active',
    pendingQuestion: null,
    completedQuestionIds: [],
    answers: {},
  };
}

export function startTask(state: ConversationState, id: string, name: string): TaskRecord {
  const existing = state.tasks[id];
  if (!existing) {
    state.tasks[id] = emptyTask(id, name);
  } else if (existing.status === 'cancelled' || existing.status === 'completed') {
    const completed = existing.completedQuestionIds;
    const answers = existing.answers;
    state.tasks[id] = { ...emptyTask(id, name), completedQuestionIds: [...completed], answers: { ...answers } };
  } else {
    existing.status = 'active';
    existing.name = name;
  }
  state.interruptedTaskIds = state.interruptedTaskIds.filter((taskId) => taskId !== id);
  state.activeTaskId = id;
  state.awaitingResume = false;
  syncFocus(state);
  return state.tasks[id];
}

export function ensureTask(state: ConversationState, id: string, name: string): TaskRecord {
  const existing = state.tasks[id];
  if (!existing) return startTask(state, id, name);
  if (!state.activeTaskId && existing.status === 'active') state.activeTaskId = id;
  syncFocus(state);
  return existing;
}

export function pauseTask(state: ConversationState, id: string): void {
  const task = state.tasks[id];
  if (!task || task.status !== 'active') return;
  task.status = 'paused';
  if (!state.interruptedTaskIds.includes(id)) state.interruptedTaskIds.push(id);
  if (state.activeTaskId === id) state.activeTaskId = null;
  syncFocus(state);
}

export function resumeTask(state: ConversationState, id: string): void {
  const task = state.tasks[id];
  if (!task || task.status === 'cancelled' || task.status === 'completed') return;
  task.status = 'active';
  state.interruptedTaskIds = state.interruptedTaskIds.filter((taskId) => taskId !== id);
  state.activeTaskId = id;
  state.awaitingResume = false;
  syncFocus(state);
}

export function completeTask(state: ConversationState, id: string): void {
  const task = state.tasks[id];
  if (!task || task.status === 'cancelled') return;
  task.status = 'completed';
  task.pendingQuestion = null;
  state.interruptedTaskIds = state.interruptedTaskIds.filter((taskId) => taskId !== id);
  if (state.activeTaskId === id) state.activeTaskId = null;
  state.awaitingResume = false;
  syncFocus(state);
}

export function cancelTask(state: ConversationState, id: string): void {
  const task = state.tasks[id];
  if (!task || task.status === 'completed') return;
  task.status = 'cancelled';
  task.pendingQuestion = null;
  state.interruptedTaskIds = state.interruptedTaskIds.filter((taskId) => taskId !== id);
  if (state.activeTaskId === id) state.activeTaskId = null;
  state.awaitingResume = false;
  syncFocus(state);
}

export function askQuestion(state: ConversationState, taskId: string, question: PendingQuestion): void {
  const task = state.tasks[taskId];
  if (!task || task.status !== 'active') return;
  if (task.completedQuestionIds.includes(question.id)) return;
  if (task.pendingQuestion?.id === question.id) {
    task.pendingQuestion.prompt = question.prompt;
    if (question.field) task.pendingQuestion.field = question.field;
    syncFocus(state);
    return;
  }
  task.pendingQuestion = { ...question };
  syncFocus(state);
}

export function completeQuestion(state: ConversationState, taskId: string, questionId: string, answer: string): void {
  const task = state.tasks[taskId];
  if (!task) return;
  if (!task.completedQuestionIds.includes(questionId)) task.completedQuestionIds.push(questionId);
  const stored = questionId === 'password' ? '' : answer;
  task.answers[questionId] = stored;
  if (stored) rememberAnswer(state, `${taskId}.${questionId}`, stored);
  if (task.pendingQuestion?.id === questionId) task.pendingQuestion = null;
  syncFocus(state);
}

export function isQuestionCompleted(state: ConversationState, taskId: string, questionId: string): boolean {
  return Boolean(state.tasks[taskId]?.completedQuestionIds.includes(questionId));
}
