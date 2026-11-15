import { ConversationLanguage, ConversationState } from './types';
import { syncFocus } from './ConversationState';
import { emailQuestion, nameQuestion, passwordQuestion } from './ResponseGenerator';

export const LANGUAGE_PHRASES: Record<ConversationLanguage, string[]> = {
  am: ['speak amharic', 'switch to amharic', 'in amharic', 'amharic please', 'አማርኛ ተናገር', 'በአማርኛ ተናገር', 'በአማርኛ'],
  en: ['speak english', 'switch to english', 'in english', 'english please', 'እንግሊዝኛ ተናገር', 'በእንግሊዝኛ ተናገር', 'በእንግሊዝኛ'],
};

export function detectLanguageSwitch(text: string): ConversationLanguage | null {
  const lower = text.toLowerCase();
  const am = LANGUAGE_PHRASES.am.find((phrase) => lower.includes(phrase.toLowerCase()));
  const en = LANGUAGE_PHRASES.en.find((phrase) => lower.includes(phrase.toLowerCase()));
  if (am && en) return am.length >= en.length ? 'am' : 'en';
  if (am) return 'am';
  if (en) return 'en';
  return null;
}

export function applyLanguage(state: ConversationState, language: ConversationLanguage): void {
  state.language = language;
  for (const task of Object.values(state.tasks)) {
    if (!task.pendingQuestion) continue;
    if (task.pendingQuestion.id === 'email') task.pendingQuestion.prompt = emailQuestion(language);
    if (task.pendingQuestion.id === 'password') task.pendingQuestion.prompt = passwordQuestion(language);
    if (task.pendingQuestion.id === 'name') task.pendingQuestion.prompt = nameQuestion(language);
  }
  syncFocus(state);
}
