import { ActionId, ActionRequest, IntentName } from './types';

export const REGISTERED_ACTIONS: ActionId[] = [
  'open-navigation',
  'read-page',
  'increase-text',
  'decrease-text',
  'focus-input',
  'read-question',
  'next-question',
  'find-jobs',
  'set-language',
];

const INTENT_ACTION: Partial<Record<IntentName, ActionId>> = {
  open_navigation: 'open-navigation',
  read_page: 'read-page',
  increase_text: 'increase-text',
  decrease_text: 'decrease-text',
  focus_input: 'focus-input',
  read_question: 'read-question',
  next_question: 'next-question',
  find_jobs: 'find-jobs',
  set_language: 'set-language',
};

export function actionIdForIntent(intent: IntentName): ActionId | null {
  return INTENT_ACTION[intent] ?? null;
}

export function isRegisteredAction(action: ActionRequest | null): action is ActionRequest {
  return Boolean(action && REGISTERED_ACTIONS.includes(action.id));
}

export interface ActionHost {
  openHeaderNavigation: () => boolean;
  readCurrentPage: () => string | null;
  adjustTextSize: (direction: 'increase' | 'decrease') => boolean;
  focusField: (target: string) => boolean;
  readFormQuestion: () => string | null;
  goToNextQuestion: () => boolean;
  openFindJobs: () => boolean;
}

export interface ActionOutcome {
  ok: boolean;
  detail: string;
}

export function executeAction(host: ActionHost, action: ActionRequest): ActionOutcome {
  if (!isRegisteredAction(action)) return { ok: false, detail: '' };
  if (action.id === 'open-navigation') return { ok: host.openHeaderNavigation(), detail: '' };
  if (action.id === 'read-page') {
    const detail = host.readCurrentPage()?.trim() || '';
    return { ok: Boolean(detail), detail };
  }
  if (action.id === 'increase-text') return { ok: host.adjustTextSize('increase'), detail: '' };
  if (action.id === 'decrease-text') return { ok: host.adjustTextSize('decrease'), detail: '' };
  if (action.id === 'focus-input') return { ok: host.focusField(action.target || 'current'), detail: '' };
  if (action.id === 'read-question') {
    const detail = host.readFormQuestion()?.trim() || '';
    return { ok: Boolean(detail), detail };
  }
  if (action.id === 'next-question') return { ok: host.goToNextQuestion(), detail: '' };
  if (action.id === 'find-jobs') return { ok: host.openFindJobs(), detail: '' };
  if (action.id === 'set-language') return { ok: Boolean(action.language), detail: '' };
  return { ok: false, detail: '' };
}
