import { ConversationLanguage, PendingQuestion } from './types';
import { questionPrompt, resumeOffer } from './ResponseGenerator';

export function resumeQuestion(question: PendingQuestion | null, language: ConversationLanguage): string {
  return resumeOffer(question, language);
}

export function resumedPrompt(question: PendingQuestion | null, language: ConversationLanguage): string {
  return questionPrompt(question, language);
}
