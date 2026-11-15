import { IntentName } from './types';

export type InterruptionDecision = 'temporary' | 'subject' | 'cancel' | 'resume' | 'none';

const TEMPORARY: IntentName[] = [
  'open_navigation',
  'read_page',
  'increase_text',
  'decrease_text',
  'focus_input',
  'next_question',
  'find_jobs',
];

export function decideInterruption(intent: IntentName, hasQuestion: boolean): InterruptionDecision {
  if (intent === 'cancel_task') return 'cancel';
  if (intent === 'change_subject') return hasQuestion ? 'subject' : 'none';
  if (intent === 'resume_task') return 'resume';
  if (hasQuestion && TEMPORARY.includes(intent)) return 'temporary';
  return 'none';
}
