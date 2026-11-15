import { ConversationState, HistoryEntry } from './types';

const HISTORY_LIMIT = 40;

export function rememberTurn(state: ConversationState, entry: HistoryEntry): void {
  state.history.push(entry);
  if (state.history.length > HISTORY_LIMIT) {
    state.history.splice(0, state.history.length - HISTORY_LIMIT);
  }
}

export function rememberAnswer(state: ConversationState, key: string, value: string): void {
  if (!key) return;
  state.collectedAnswers[key] = value;
}

export function redactUserText(text: string, pendingQuestionId?: string): string {
  if (pendingQuestionId === 'password') return 'password received';
  return text
    .replace(/\b((?:my |the )?password is)\s+\S+/gi, '$1 [hidden]')
    .replace(/(የይለፍ\s?ቃል(?:ዬ|ዎን|ዎ|ሁ)?)\s+\S+/g, '$1 [hidden]');
}
