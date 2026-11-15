export type ConversationLanguage = 'en' | 'am';

export type IntentName =
  | 'answer'
  | 'interrupt'
  | 'change_subject'
  | 'resume_task'
  | 'cancel_task'
  | 'clarify'
  | 'open_navigation'
  | 'read_page'
  | 'increase_text'
  | 'decrease_text'
  | 'focus_input'
  | 'read_question'
  | 'next_question'
  | 'find_jobs'
  | 'restart_task'
  | 'set_language'
  | 'unknown';

export type TaskStatus = 'idle' | 'active' | 'paused' | 'completed' | 'cancelled';

export type ActionId =
  | 'open-navigation'
  | 'read-page'
  | 'increase-text'
  | 'decrease-text'
  | 'focus-input'
  | 'read-question'
  | 'next-question'
  | 'find-jobs'
  | 'set-language';

export interface PendingQuestion {
  id: string;
  prompt: string;
  field?: string;
}

export interface TaskRecord {
  id: string;
  name: string;
  status: TaskStatus;
  pendingQuestion: PendingQuestion | null;
  completedQuestionIds: string[];
  answers: Record<string, string>;
}

export interface HistoryEntry {
  role: 'user' | 'assistant';
  text: string;
  intent?: IntentName;
}

export interface ConversationState {
  intent: IntentName | null;
  language: ConversationLanguage;
  activeTaskId: string | null;
  tasks: Record<string, TaskRecord>;
  interruptedTaskIds: string[];
  awaitingResume: boolean;
  history: HistoryEntry[];
  lastAction: string | null;
  collectedAnswers: Record<string, string>;
  taskStatus: TaskStatus;
  pendingQuestion: PendingQuestion | null;
}

export interface ActionRequest {
  id: ActionId;
  target?: string;
  language?: ConversationLanguage;
}

export interface ConversationTurn {
  response: string;
  intent: IntentName;
  action: ActionRequest | null;
  state: ConversationState;
  resume: boolean;
  consumed: boolean;
  forwardText: string | null;
}

export interface DetectedIntent {
  intent: IntentName;
  action: ActionRequest | null;
  confidence: 'match' | 'request' | 'none';
}
