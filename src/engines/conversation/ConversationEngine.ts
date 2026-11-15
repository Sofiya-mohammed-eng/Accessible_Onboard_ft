import { redactUserText, rememberTurn } from './ContextMemory';
import { cloneConversationState, createConversationState, focusedTask } from './ConversationState';
import { containsAnswer, detectIntent, isBareNo, isBareYes } from './IntentDetector';
import { decideInterruption } from './InterruptionManager';
import { applyLanguage } from './LanguageManager';
import {
  actionResult,
  cancelTaskResponse,
  clarificationResponse,
  declineResume,
  questionPrompt,
  registrationRestarted,
  resumeOffer,
  subjectChangeResponse,
} from './ResponseGenerator';
import { resumedPrompt } from './TaskResumption';
import {
  askQuestion,
  cancelTask,
  completeQuestion,
  completeTask,
  ensureTask,
  isQuestionCompleted,
  pauseTask,
  resumeTask,
  startTask,
} from './TaskManager';
import { ActionRequest, ConversationLanguage, ConversationState, ConversationTurn, PendingQuestion } from './types';

export class ConversationEngine {
  private state: ConversationState;
  private repeatedPrompt = false;

  constructor(language: ConversationLanguage = 'en') {
    this.state = createConversationState(language);
  }

  getState(): ConversationState {
    return cloneConversationState(this.state);
  }

  setLanguage(language: ConversationLanguage): void {
    applyLanguage(this.state, language);
  }

  taskStatus(id: string) {
    return this.state.tasks[id]?.status ?? 'idle';
  }

  hasTask(id: string): boolean {
    const status = this.taskStatus(id);
    return status === 'active' || status === 'paused';
  }

  pendingQuestion(): PendingQuestion | null {
    return this.state.pendingQuestion ? { ...this.state.pendingQuestion } : null;
  }

  pendingPrompt(): string | null {
    const question = this.state.pendingQuestion;
    if (!question) return null;
    return questionPrompt(question, this.state.language);
  }

  isAwaitingResume(): boolean {
    return this.state.awaitingResume;
  }

  takeRepeatedPrompt(): boolean {
    const value = this.repeatedPrompt;
    this.repeatedPrompt = false;
    return value;
  }

  isCompleted(taskId: string, questionId: string): boolean {
    return isQuestionCompleted(this.state, taskId, questionId);
  }

  savedAnswer(taskId: string, questionId: string): string {
    return this.state.tasks[taskId]?.answers[questionId] ?? '';
  }

  startTask(id: string, name = id): void {
    startTask(this.state, id, name);
  }

  ensureTask(id: string, name = id): void {
    ensureTask(this.state, id, name);
  }

  pauseTask(id: string): void {
    pauseTask(this.state, id);
  }

  resumeTask(id: string): void {
    resumeTask(this.state, id);
  }

  completeTask(id: string): void {
    completeTask(this.state, id);
  }

  cancelTask(id: string): void {
    cancelTask(this.state, id);
  }

  ask(taskId: string, question: PendingQuestion): void {
    askQuestion(this.state, taskId, question);
  }

  completeQuestion(taskId: string, questionId: string, answer: string): void {
    completeQuestion(this.state, taskId, questionId, answer);
  }

  handleUtterance(text: string): ConversationTurn {
    const clean = text.replace(/\s+/g, ' ').trim();
    const detected = detectIntent(clean);
    const command = detected.confidence === 'match';
    const task = focusedTask(this.state);
    const hasQuestion = Boolean(this.state.pendingQuestion);

    if (!command && this.state.awaitingResume && isBareNo(clean)) {
      this.state.awaitingResume = false;
      return this.finish('unknown', null, declineResume(this.state.language), true, null, false, clean);
    }

    if (!command && this.state.awaitingResume && isBareYes(clean) && !containsAnswer(clean)) {
      if (task && task.status !== 'cancelled' && task.status !== 'completed') resumeTask(this.state, task.id);
      this.repeatedPrompt = true;
      return this.finish('resume_task', null, resumedPrompt(this.state.pendingQuestion, this.state.language), true, null, false, clean);
    }

    if (command && detected.intent === 'resume_task') {
      if (!task?.pendingQuestion || task.status === 'cancelled' || task.status === 'completed') {
        return this.finish('unknown', null, '', false, clean, false, clean);
      }
      resumeTask(this.state, task.id);
      this.repeatedPrompt = true;
      return this.finish('resume_task', null, resumedPrompt(this.state.pendingQuestion, this.state.language), true, null, false, clean);
    }

    if (command && detected.intent === 'set_language' && detected.action?.language) {
      applyLanguage(this.state, detected.action.language);
      const pending = this.state.pendingQuestion;
      return this.finish('set_language', { ...detected.action, target: pending?.field }, '', true, null, this.state.awaitingResume, clean);
    }

    if (command && detected.intent === 'restart_task') {
      const cancelled = Object.values(this.state.tasks).find((item) => item.status === 'cancelled');
      if (!cancelled) return this.finish('unknown', null, '', false, clean, false, clean);
      startTask(this.state, cancelled.id, cancelled.name);
      this.repeatedPrompt = true;
      return this.finish('restart_task', null, registrationRestarted(this.state.language), true, null, false, clean);
    }

    if (command && detected.intent === 'cancel_task') {
      if (task) cancelTask(this.state, task.id);
      return this.finish('cancel_task', null, cancelTaskResponse(this.state.language), true, null, false, clean);
    }

    if (command && detected.intent === 'clarify') {
      return this.finish('clarify', null, clarificationResponse(this.state.language, hasQuestion), true, null, false, clean);
    }

    if (command && detected.action) {
      const pending = this.state.pendingQuestion;
      const decision = decideInterruption(detected.intent, Boolean(pending));
      const action = { ...detected.action, target: pending?.field || detected.action.target };
      if (decision === 'temporary' && task) {
        pauseTask(this.state, task.id);
        this.state.awaitingResume = true;
        return this.finish('interrupt', action, '', true, null, true, clean);
      }
      return this.finish(detected.intent, action, '', true, null, false, clean);
    }

    if (command && detected.intent === 'change_subject') {
      if (decideInterruption('change_subject', hasQuestion) === 'subject' && task) {
        pauseTask(this.state, task.id);
        this.state.awaitingResume = false;
        return this.finish('change_subject', null, subjectChangeResponse(this.state.language), true, null, false, clean);
      }
      return this.finish('unknown', null, '', false, clean, false, clean);
    }

    if (detected.confidence === 'request' && !containsAnswer(clean)) {
      return this.finish('clarify', null, clarificationResponse(this.state.language, Boolean(this.state.pendingQuestion)), true, null, false, clean);
    }

    const current = focusedTask(this.state);
    if ((this.state.awaitingResume || current?.status === 'paused') && containsAnswer(clean) && current && current.status !== 'cancelled') {
      resumeTask(this.state, current.id);
      return this.finish('answer', null, '', false, clean, false, clean);
    }

    if (current?.status === 'paused' && !this.state.awaitingResume) {
      return this.finish('change_subject', null, subjectChangeResponse(this.state.language), true, null, false, clean);
    }

    if (current?.status === 'active' && this.state.pendingQuestion) {
      return this.finish('answer', null, '', false, clean, false, clean);
    }

    return this.finish('unknown', null, '', false, clean, false, clean);
  }

  reportAction(action: ActionRequest, ok: boolean, detail = ''): ConversationTurn {
    this.state.lastAction = `${action.id}:${ok ? 'ok' : 'failed'}`;
    const spokenDetail = action.id === 'read-question' ? this.pendingPrompt() || detail : detail;
    let response = actionResult(action.id, action.id === 'read-question' ? Boolean(spokenDetail) : ok, spokenDetail, this.state.language);
    if (action.id === 'set-language' && this.state.pendingQuestion && !this.state.awaitingResume) {
      response = `${response} ${questionPrompt(this.state.pendingQuestion, this.state.language)}`.trim();
      this.repeatedPrompt = true;
    }
    if (this.state.awaitingResume && this.state.pendingQuestion) {
      response = `${response} ${resumeOffer(this.state.pendingQuestion, this.state.language)}`.trim();
    }
    this.state.intent = 'interrupt';
    rememberTurn(this.state, { role: 'assistant', text: response, intent: 'interrupt' });
    return {
      response,
      intent: 'interrupt',
      action,
      state: cloneConversationState(this.state),
      resume: this.state.awaitingResume,
      consumed: true,
      forwardText: null,
    };
  }

  private finish(
    intent: ConversationTurn['intent'],
    action: ActionRequest | null,
    response: string,
    consumed: boolean,
    forwardText: string | null,
    resume: boolean,
    userText: string,
  ): ConversationTurn {
    this.state.intent = intent;
    rememberTurn(this.state, {
      role: 'user',
      text: redactUserText(userText, this.state.pendingQuestion?.id),
      intent,
    });
    if (response) rememberTurn(this.state, { role: 'assistant', text: response, intent });
    return {
      response,
      intent,
      action,
      state: cloneConversationState(this.state),
      resume,
      consumed,
      forwardText,
    };
  }
}
