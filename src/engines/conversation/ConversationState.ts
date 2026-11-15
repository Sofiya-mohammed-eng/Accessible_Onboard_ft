import { ConversationLanguage, ConversationState, TaskRecord } from './types';

export function createConversationState(language: ConversationLanguage): ConversationState {
  return {
    intent: null,
    language,
    activeTaskId: null,
    tasks: {},
    interruptedTaskIds: [],
    awaitingResume: false,
    history: [],
    lastAction: null,
    collectedAnswers: {},
    taskStatus: 'idle',
    pendingQuestion: null,
  };
}

export function cloneConversationState(state: ConversationState): ConversationState {
  return structuredClone(state);
}

export function focusedTask(state: ConversationState): TaskRecord | null {
  if (state.activeTaskId && state.tasks[state.activeTaskId]) return state.tasks[state.activeTaskId];
  const pausedId = state.interruptedTaskIds[state.interruptedTaskIds.length - 1];
  if (pausedId && state.tasks[pausedId]) return state.tasks[pausedId];
  return null;
}

export function syncFocus(state: ConversationState): void {
  const focus = focusedTask(state);
  state.taskStatus = focus?.status ?? 'idle';
  state.pendingQuestion = focus?.pendingQuestion ?? null;
}
