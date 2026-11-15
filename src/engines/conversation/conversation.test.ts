import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchGazeVoiceCommand } from '../../accessibility/gazeVoiceCommands';
import { REGISTERED_ACTIONS, executeAction } from './ActionRegistry';
import { ConversationEngine } from './ConversationEngine';
import { detectIntent } from './IntentDetector';
import { passwordReceived, emailQuestion } from './ResponseGenerator';
import { redactUserText } from './ContextMemory';
import { keyboardEffects, navigationShortcut } from './keyboardContinue';
import { listenOnce, setAmharicCaptureForTests } from '../accessibilityEngine';
import {
  acquireMicrophone,
  microphoneOwner,
  releaseMicrophone,
  resetMicrophoneOwnerForTests,
} from '../microphoneOwner';

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

function sourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) files.push(...sourceFiles(full));
    else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) files.push(full);
  }
  return files;
}

function pressResume(engine: ConversationEngine) {
  if (!engine.isAwaitingResume()) return null;
  const turn = engine.handleUtterance('continue');
  return turn.intent === 'resume_task' ? turn : null;
}

function registration() {
  const engine = new ConversationEngine('en');
  engine.startTask('registration', 'registration');
  engine.ask('registration', { id: 'email', prompt: emailQuestion('en'), field: 'email' });
  return engine;
}

describe('conversation engine', () => {
  it('asks for an email and keeps that question pending', () => {
    const engine = registration();
    const state = engine.getState();
    assert.equal(state.pendingQuestion?.id, 'email');
    assert.equal(state.pendingQuestion?.prompt, 'Please tell me your email address.');
    assert.equal(state.taskStatus, 'active');
    assert.deepEqual(state.tasks.registration.completedQuestionIds, []);
  });

  it('interrupts the email question without losing it', () => {
    const engine = registration();
    const turn = engine.handleUtterance('Open the header navigation.');
    assert.equal(turn.action?.id, 'open-navigation');
    assert.equal(turn.consumed, true);
    assert.equal(turn.resume, true);
    const state = turn.state;
    assert.equal(state.tasks.registration.status, 'paused');
    assert.equal(state.tasks.registration.pendingQuestion?.id, 'email');
    assert.equal(state.awaitingResume, true);
    assert.deepEqual(state.tasks.registration.completedQuestionIds, []);
  });

  it('reports navigation only when the existing action succeeds', () => {
    const engine = registration();
    engine.handleUtterance('Open the header navigation.');
    const opened = engine.reportAction({ id: 'open-navigation' }, true);
    assert.match(opened.response, /The header navigation is open/);
    assert.match(opened.response, /We were entering your email address\. Would you like to continue/);
    assert.equal(opened.state.lastAction, 'open-navigation:ok');

    const failed = new ConversationEngine('en');
    failed.startTask('registration', 'registration');
    failed.ask('registration', { id: 'email', prompt: emailQuestion('en'), field: 'email' });
    failed.handleUtterance('open the header navigation');
    const missed = failed.reportAction({ id: 'open-navigation' }, false);
    assert.match(missed.response, /could not open the header navigation/i);
    assert.doesNotMatch(missed.response, /The header navigation is open/);
    assert.match(missed.response, /Would you like to continue/);
    assert.equal(missed.state.tasks.registration.pendingQuestion?.id, 'email');
  });

  it('returns to the pending email question', () => {
    const engine = registration();
    engine.handleUtterance('Open the header navigation.');
    engine.reportAction({ id: 'open-navigation' }, true);
    const resumed = engine.handleUtterance('go back');
    assert.equal(resumed.intent, 'resume_task');
    assert.equal(resumed.consumed, true);
    assert.equal(resumed.response, 'Please tell me your email address.');
    assert.equal(resumed.state.tasks.registration.status, 'active');
    assert.equal(resumed.state.tasks.registration.pendingQuestion?.id, 'email');
    assert.equal(resumed.state.awaitingResume, false);
  });

  it('accepts the email answer and passes the original words on', () => {
    const engine = registration();
    engine.handleUtterance('Open the header navigation.');
    engine.reportAction({ id: 'open-navigation' }, true);
    const answer = engine.handleUtterance('Yes, my email is user@example.com.');
    assert.equal(answer.intent, 'answer');
    assert.equal(answer.consumed, false);
    assert.equal(answer.forwardText, 'Yes, my email is user@example.com.');
    assert.equal(answer.action, null);
    assert.equal(answer.state.tasks.registration.status, 'active');
    assert.equal(answer.state.tasks.registration.pendingQuestion?.id, 'email');
    assert.deepEqual(answer.state.tasks.registration.completedQuestionIds, []);
  });

  it('continues registration after the email is accepted', () => {
    const engine = registration();
    engine.handleUtterance('Open the header navigation.');
    engine.reportAction({ id: 'open-navigation' }, true);
    const answer = engine.handleUtterance('Yes, my email is user@example.com.');
    assert.equal(answer.forwardText, 'Yes, my email is user@example.com.');
    engine.completeQuestion('registration', 'email', 'user@example.com');
    engine.ask('registration', { id: 'password', prompt: 'Please tell me your password.', field: 'password' });
    engine.ask('registration', { id: 'email', prompt: emailQuestion('en'), field: 'email' });
    const state = engine.getState();
    assert.equal(state.tasks.registration.status, 'active');
    assert.deepEqual(state.tasks.registration.completedQuestionIds, ['email']);
    assert.equal(state.pendingQuestion?.id, 'password');
    assert.equal(state.collectedAnswers['registration.email'], 'user@example.com');
    assert.equal(state.tasks.registration.answers.password, undefined);
  });

  it('keeps the same email question through several interruptions', () => {
    const engine = registration();
    for (const utterance of ['Open the header navigation.', 'Read this page.', 'Increase the text size.']) {
      const turn = engine.handleUtterance(utterance);
      assert.equal(turn.consumed, true);
      assert.ok(turn.action);
      engine.reportAction(turn.action, true, turn.action.id === 'read-page' ? 'Sign in' : '');
    }
    const state = engine.getState();
    assert.deepEqual(state.interruptedTaskIds, ['registration']);
    assert.equal(state.pendingQuestion?.id, 'email');
    assert.deepEqual(state.tasks.registration.completedQuestionIds, []);
    const answer = engine.handleUtterance('Yes, my email is user@example.com.');
    assert.equal(answer.forwardText, 'Yes, my email is user@example.com.');
    assert.equal(answer.state.tasks.registration.pendingQuestion?.id, 'email');
  });

  it('changes subject without cancelling the unfinished question', () => {
    const engine = registration();
    const changed = engine.handleUtterance('Change the subject.');
    assert.equal(changed.intent, 'change_subject');
    assert.equal(changed.state.tasks.registration.status, 'paused');
    assert.equal(changed.state.tasks.registration.pendingQuestion?.id, 'email');
    assert.equal(changed.state.awaitingResume, false);
    const unrelated = engine.handleUtterance('Tell me about the weather');
    assert.equal(unrelated.consumed, true);
    assert.equal(unrelated.forwardText, null);
    assert.equal(unrelated.state.tasks.registration.status, 'paused');
    const returned = engine.handleUtterance('Go back.');
    assert.equal(returned.response, 'Please tell me your email address.');
    assert.equal(returned.state.tasks.registration.status, 'active');
  });

  it('cancels a task without submitting or keeping the question active', () => {
    const engine = registration();
    const cancelled = engine.handleUtterance('Cancel.');
    assert.equal(cancelled.intent, 'cancel_task');
    assert.equal(cancelled.action, null);
    assert.match(cancelled.response, /will not send anything/i);
    assert.equal(cancelled.state.tasks.registration.status, 'cancelled');
    assert.equal(cancelled.state.pendingQuestion, null);
    const later = engine.handleUtterance('my email is user@example.com');
    assert.equal(later.action, null);
    assert.equal(later.action, null);
    assert.equal(later.state.tasks.registration.status, 'cancelled');
    assert.equal(engine.getState().tasks.registration.pendingQuestion, null);
  });

  it('asks for clarification when a request is not understood', () => {
    const engine = registration();
    const turn = engine.handleUtterance('Please book a flight to Paris.');
    assert.equal(turn.intent, 'clarify');
    assert.equal(turn.consumed, true);
    assert.equal(turn.action, null);
    assert.match(turn.response, /did not understand/i);
    assert.equal(turn.state.pendingQuestion?.id, 'email');
    assert.equal(turn.state.tasks.registration.status, 'active');
  });

  it('switches between English and Amharic without dropping the question', () => {
    const engine = registration();
    const switched = engine.handleUtterance('አማርኛ ተናገር');
    assert.equal(switched.intent, 'set_language');
    assert.equal(switched.action?.language, 'am');
    const spoken = engine.reportAction(switched.action!, true);
    assert.match(spoken.response, /በአማርኛ/);
    assert.match(spoken.response, /ኢሜይል አድራሻዎን ይንገሩኝ/);
    assert.equal(spoken.state.language, 'am');
    assert.equal(spoken.state.pendingQuestion?.id, 'email');

    const navigation = engine.handleUtterance('ዳሰሳውን ክፈት');
    assert.equal(navigation.action?.id, 'open-navigation');
    const amharic = engine.reportAction({ id: 'open-navigation' }, true);
    assert.match(amharic.response, /የራስጌ ዳሰሳው ተከፍቷል/);
    assert.match(amharic.response, /ኢሜይል አድራሻዎን እየሞላን ነበር። መቀጠል ይፈልጋሉ/);

    const back = engine.handleUtterance('እንግሊዝኛ ተናገር');
    assert.equal(back.action?.language, 'en');
    const english = engine.reportAction(back.action!, true);
    assert.match(english.response, /I will continue in English/);
    assert.equal(english.state.pendingQuestion?.id, 'email');
    assert.equal(detectIntent('ገጹን አንብብ').intent, 'read_page');
    assert.equal(detectIntent('ጽሑፉን አበልጥ').intent, 'increase_text');
    assert.equal(detectIntent('ጽሑፉን አሳንስ').intent, 'decrease_text');
    assert.equal(detectIntent('ጥያቄውን ድገም').intent, 'read_question');
  });

  it('leaves ordinary application phrases for the existing guide', () => {
    const idle = new ConversationEngine('en');
    for (const phrase of ['get started', 'continue', 'submit', 'apply']) {
      const turn = idle.handleUtterance(phrase);
      assert.equal(turn.consumed, false, phrase);
      assert.equal(turn.action, null, phrase);
      assert.equal(turn.forwardText, phrase);
    }

    const engine = registration();
    const signIn = engine.handleUtterance('sign in');
    assert.equal(signIn.consumed, false);
    assert.equal(signIn.forwardText, 'sign in');
    const email = engine.handleUtterance('my email is user@example.com');
    assert.equal(email.consumed, false);
    assert.equal(email.forwardText, 'my email is user@example.com');
    assert.equal(email.state.tasks.registration.status, 'active');
    assert.ok(!REGISTERED_ACTIONS.includes('submit' as never));
  });

  it('does not report a text or question action that the host could not perform', () => {
    const outcome = executeAction(
      {
        openHeaderNavigation: () => false,
        readCurrentPage: () => null,
        adjustTextSize: () => false,
        focusField: () => false,
        readFormQuestion: () => null,
        goToNextQuestion: () => false,
        openFindJobs: () => false,
      },
      { id: 'next-question' },
    );
    assert.equal(outcome.ok, false);
    const engine = new ConversationEngine('en');
    const reported = engine.reportAction({ id: 'next-question' }, outcome.ok);
    assert.match(reported.response, /could not move to the next question/i);
    assert.equal(reported.state.lastAction, 'next-question:failed');
  });

  it('does not cancel or navigate on an accidental phrase', () => {
    const engine = registration();
    const cancel = engine.handleUtterance("I don't want to cancel my application");
    assert.notEqual(cancel.intent, 'cancel_task');
    assert.equal(cancel.action, null);
    assert.equal(engine.taskStatus('registration'), 'active');
    assert.equal(engine.pendingQuestion()?.id, 'email');

    const jobs = engine.handleUtterance('I want to know how to find jobs');
    assert.equal(jobs.action, null);
    assert.notEqual(jobs.intent, 'find_jobs');
    assert.equal(engine.taskStatus('registration'), 'active');
    assert.equal(engine.pendingQuestion()?.id, 'email');
  });

  it('cancels only an explicit registration command and keeps the email answer', () => {
    const engine = registration();
    engine.completeQuestion('registration', 'email', 'user@example.com');
    engine.ask('registration', { id: 'password', prompt: 'password', field: 'password' });
    const turn = engine.handleUtterance('Cancel registration');
    assert.equal(turn.intent, 'cancel_task');
    assert.equal(turn.action, null);
    assert.equal(engine.taskStatus('registration'), 'cancelled');
    assert.equal(engine.pendingQuestion(), null);
    assert.equal(engine.getState().collectedAnswers['registration.email'], 'user@example.com');
    assert.ok(!REGISTERED_ACTIONS.includes('submit' as never));
  });

  it('opens Find Jobs only for an explicit request and can return to the email question', () => {
    const engine = registration();
    const jobs = engine.handleUtterance('Find jobs.');
    assert.equal(jobs.action?.id, 'find-jobs');
    assert.equal(engine.taskStatus('registration'), 'paused');
    assert.equal(engine.pendingQuestion()?.id, 'email');

    engine.handleUtterance('Open the header navigation.');
    assert.equal(engine.taskStatus('registration'), 'paused');
    assert.equal(engine.getState().tasks.registration.pendingQuestion?.id, 'email');
    assert.deepEqual(engine.getState().interruptedTaskIds, ['registration']);

    const failed = engine.reportAction({ id: 'find-jobs' }, false);
    assert.match(failed.response, /could not open Find Jobs/i);
    assert.doesNotMatch(failed.response, /Find Jobs is open/i);
    assert.match(failed.response, /email/i);

    const opened = engine.reportAction({ id: 'find-jobs' }, true);
    assert.match(opened.response, /Find Jobs is open/i);
    const back = engine.handleUtterance('Go back to my email question.');
    assert.equal(back.intent, 'resume_task');
    assert.equal(engine.taskStatus('registration'), 'active');
    assert.equal(engine.pendingQuestion()?.id, 'email');
  });

  it('confirms a password without repeating or storing it', () => {
    assert.equal(passwordReceived('en'), 'The password box is filled. I will not read it.');
    assert.equal(passwordReceived('en').includes('secret'), false);
    assert.equal(redactUserText('my password is secret123').includes('secret123'), false);
    const engine = registration();
    engine.completeQuestion('registration', 'email', 'user@example.com');
    engine.ask('registration', { id: 'password', prompt: 'password', field: 'password' });
    const turn = engine.handleUtterance('my password is secret123');
    assert.equal(turn.forwardText, 'my password is secret123');
    assert.equal(turn.state.history.at(-1)?.text, 'password received');
    assert.equal(JSON.stringify(turn.state).includes('secret123'), false);
  });

  it('restarts a cancelled registration without clearing finished answers', () => {
    const engine = registration();
    engine.completeQuestion('registration', 'email', 'user@example.com');
    engine.handleUtterance('Cancel registration');
    assert.equal(engine.taskStatus('registration'), 'cancelled');
    const restart = engine.handleUtterance('Restart registration');
    assert.equal(restart.intent, 'restart_task');
    assert.equal(engine.taskStatus('registration'), 'active');
    assert.deepEqual(engine.getState().tasks.registration.completedQuestionIds, ['email']);
    assert.equal(engine.getState().collectedAnswers['registration.email'], 'user@example.com');
    assert.equal(engine.pendingQuestion(), null);
    engine.ask('registration', { id: 'email', prompt: emailQuestion('en'), field: 'email' });
    assert.equal(engine.pendingQuestion(), null);
    engine.ask('registration', { id: 'password', prompt: 'password', field: 'password' });
    assert.equal(engine.pendingQuestion()?.id, 'password');
    assert.equal(engine.getState().collectedAnswers['registration.email'], 'user@example.com');
  });

  it('resumes the pending email question from the continue utterance once', () => {
    const engine = registration();
    engine.handleUtterance('Open the header navigation.');
    const resumed = engine.handleUtterance('continue');
    assert.equal(resumed.intent, 'resume_task');
    assert.equal(resumed.response, 'Please tell me your email address.');
    assert.equal(engine.taskStatus('registration'), 'active');
    assert.equal(engine.pendingQuestion()?.id, 'email');
    assert.equal(engine.isAwaitingResume(), false);
    assert.deepEqual(engine.getState().tasks.registration.completedQuestionIds, []);
    const again = engine.handleUtterance('continue');
    assert.notEqual(again.intent, 'resume_task');
    assert.equal(engine.pendingQuestion()?.id, 'email');
  });

  it('keeps a completed email when continue resumes the password question', () => {
    const engine = registration();
    engine.completeQuestion('registration', 'email', 'user@example.com');
    engine.ask('registration', { id: 'password', prompt: 'Please tell me your password.', field: 'password' });
    engine.handleUtterance('Open the header navigation.');
    const resumed = engine.handleUtterance('continue');
    assert.equal(resumed.intent, 'resume_task');
    assert.equal(engine.pendingQuestion()?.id, 'password');
    assert.deepEqual(engine.getState().tasks.registration.completedQuestionIds, ['email']);
    assert.equal(engine.getState().collectedAnswers['registration.email'], 'user@example.com');
  });

  it('keeps conversation resume separate from application continuation', () => {
    const engine = registration();
    engine.handleUtterance('Open the header navigation.');
    assert.equal(engine.pendingQuestion()?.id, 'email');

    const enterResume = keyboardEffects({ key: 'Enter', target: 'conversation-resume', awaitingResume: true });
    const spaceResume = keyboardEffects({ key: ' ', target: 'conversation-resume', awaitingResume: true });
    assert.deepEqual(enterResume, { resumeConversation: true, advanceApplication: false });
    assert.deepEqual(spaceResume, { resumeConversation: true, advanceApplication: false });

    const enterNext = keyboardEffects({ key: 'Enter', target: 'application-next', awaitingResume: true });
    const spaceNext = keyboardEffects({ key: ' ', target: 'application-next', awaitingResume: true });
    assert.deepEqual(enterNext, { resumeConversation: false, advanceApplication: true });
    assert.deepEqual(spaceNext, { resumeConversation: false, advanceApplication: true });
    for (const effect of [enterResume, spaceResume, enterNext, spaceNext]) {
      assert.equal(effect.resumeConversation && effect.advanceApplication, false);
    }

    assert.equal(engine.taskStatus('registration'), 'paused');
    assert.equal(engine.pendingQuestion()?.id, 'email');
    const resumed = engine.handleUtterance('continue');
    assert.equal(resumed.intent, 'resume_task');
    assert.equal(engine.pendingQuestion()?.id, 'email');
    assert.equal(engine.taskStatus('registration'), 'active');

    assert.deepEqual(
      keyboardEffects({ key: 'Enter', target: 'text-entry', awaitingResume: true }),
      { resumeConversation: false, advanceApplication: false },
    );
    assert.deepEqual(
      keyboardEffects({ key: ' ', target: 'submit', awaitingResume: true }),
      { resumeConversation: false, advanceApplication: false },
    );
  });

  it('activates the resume control once and ignores a second press', () => {
    const engine = registration();
    engine.handleUtterance('Open the header navigation.');
    const guide = readFileSync(join(sourceRoot, 'components/BlindConversation.tsx'), 'utf8');
    assert.match(guide, /data-voice="resume"/);
    assert.match(guide, /onClick=\{resumeConversation\}/);
    assert.match(guide, /if \(!engine\.isAwaitingResume\(\)\) return;\s*const turn = engine\.handleUtterance\('continue'\)/);

    const first = pressResume(engine);
    assert.equal(first?.intent, 'resume_task');
    assert.equal(first?.response, 'Please tell me your email address.');
    assert.equal(engine.pendingQuestion()?.id, 'email');
    assert.equal(engine.taskStatus('registration'), 'active');
    assert.equal(pressResume(engine), null);
    assert.equal(engine.pendingQuestion()?.id, 'email');
    assert.deepEqual(engine.getState().tasks.registration.completedQuestionIds, []);
  });

  it('lets the application next control advance without resuming the paused question', () => {
    const engine = registration();
    engine.handleUtterance('Open the header navigation.');
    const apply = readFileSync(join(sourceRoot, 'components/ApplicationAssistantView.tsx'), 'utf8');
    assert.match(apply, /data-voice="next"[\s\S]{0,40}onClick=\{goNext\}/);
    assert.equal(apply.includes('handleUtterance'), false);
    assert.equal(apply.includes('ConversationEngine'), false);
    const effect = keyboardEffects({ key: 'Enter', target: 'application-next', awaitingResume: true });
    assert.deepEqual(effect, { resumeConversation: false, advanceApplication: true });
    assert.equal(engine.taskStatus('registration'), 'paused');
    assert.equal(engine.pendingQuestion()?.id, 'email');
  });

  it('does not send a submit control into the conversation', () => {
    const engine = registration();
    engine.handleUtterance('Open the header navigation.');
    const apply = readFileSync(join(sourceRoot, 'components/ApplicationAssistantView.tsx'), 'utf8');
    assert.match(apply, /data-voice="submit"/);
    assert.match(apply, /submitApplication\(/);
    assert.match(apply, /setSubmitted\(true\)/);
    assert.equal(apply.includes('handleUtterance'), false);
    assert.equal(apply.includes('ConversationEngine'), false);
    const effect = keyboardEffects({ key: ' ', target: 'submit', awaitingResume: true });
    assert.deepEqual(effect, { resumeConversation: false, advanceApplication: false });
    let submitted = false;
    const activateSubmit = () => {
      submitted = true;
    };
    activateSubmit();
    assert.equal(submitted, true);
    assert.equal(engine.isAwaitingResume(), true);
    assert.equal(engine.pendingQuestion()?.id, 'email');
    assert.notEqual(engine.handleUtterance('submit').intent, 'resume_task');
  });

  it('keeps gaze device commands separate from the paused conversation', () => {
    const gaze = readFileSync(join(sourceRoot, 'accessibility/gazeVoiceCommands.ts'), 'utf8');
    assert.equal(gaze.includes('ConversationEngine'), false);
    assert.equal(gaze.includes('handleUtterance'), false);
    const phrases = [
      ['pause', 'pause'],
      ['resume', 'resume'],
      ['calibrate', 'calibrate'],
      ['scroll down', 'scroll-down'],
      ['scroll up', 'scroll-up'],
    ] as const;
    for (const [phrase, command] of phrases) {
      assert.equal(matchGazeVoiceCommand(phrase), command);
      const engine = registration();
      engine.handleUtterance('Open the header navigation.');
      const turn = engine.handleUtterance(phrase);
      assert.notEqual(turn.intent, 'resume_task');
      assert.equal(turn.action, null);
      assert.equal(engine.taskStatus('registration'), 'paused');
      assert.equal(engine.pendingQuestion()?.id, 'email');
    }
    assert.equal(matchGazeVoiceCommand('continue'), null);
  });

  it('routes Find Jobs shortcuts without resuming a paused question', () => {
    const signedOut = navigationShortcut('1', false, 'login');
    assert.deepEqual(signedOut, { destination: null, findJobs: true, ok: false, resumeConversation: false });
    const signedIn = navigationShortcut('1', true, 'login');
    assert.deepEqual(signedIn, { destination: 'jobs', findJobs: true, ok: true, resumeConversation: false });
    const alreadyThere = navigationShortcut('1', true, 'jobs');
    assert.deepEqual(alreadyThere, { destination: null, findJobs: true, ok: true, resumeConversation: false });

    const engine = registration();
    const turn = engine.handleUtterance('Find jobs.');
    assert.equal(turn.action?.id, 'find-jobs');
    assert.equal(engine.taskStatus('registration'), 'paused');
    assert.equal(engine.pendingQuestion()?.id, 'email');
    const failed = engine.reportAction({ id: 'find-jobs' }, signedOut?.ok === true);
    assert.match(failed.response, /could not open Find Jobs/i);
    assert.doesNotMatch(failed.response, /Find Jobs is open/i);
    assert.equal(engine.taskStatus('registration'), 'paused');
    assert.equal(engine.isAwaitingResume(), true);
    const opened = engine.reportAction({ id: 'find-jobs' }, signedIn?.ok === true);
    assert.match(opened.response, /Find Jobs is open/i);
    assert.equal(engine.taskStatus('registration'), 'paused');
    assert.equal(engine.pendingQuestion()?.id, 'email');
  });

  it('keeps apply and login shortcuts from resuming a conversation', () => {
    assert.deepEqual(navigationShortcut('2', true, 'login'), {
      destination: 'apply',
      findJobs: false,
      ok: null,
      resumeConversation: false,
    });
    assert.deepEqual(navigationShortcut('2', false, 'landing'), {
      destination: 'login',
      findJobs: false,
      ok: null,
      resumeConversation: false,
    });
    assert.equal(navigationShortcut('2', false, 'login')?.destination, null);
    assert.deepEqual(navigationShortcut('3', false, 'jobs'), {
      destination: 'login',
      findJobs: false,
      ok: null,
      resumeConversation: false,
    });
    assert.equal(navigationShortcut('3', true, 'login')?.destination, null);
    assert.equal(navigationShortcut('4', true, 'landing'), null);

    const engine = registration();
    engine.handleUtterance('Open the header navigation.');
    assert.equal(engine.taskStatus('registration'), 'paused');
    assert.equal(navigationShortcut('3', false, 'jobs')?.resumeConversation, false);
    assert.equal(engine.taskStatus('registration'), 'paused');
    assert.equal(engine.pendingQuestion()?.id, 'email');
  });

  it('keeps the pending email question when an Amharic listen is interrupted', async () => {
    resetMicrophoneOwnerForTests();
    (globalThis as unknown as { window: Record<string, unknown> }).window = {
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
      addEventListener() {},
      removeEventListener() {},
    };
    const engine = registration();
    let started = false;
    setAmharicCaptureForTests({
      record: () => {
        started = true;
        return new Promise(() => undefined);
      },
      transcribe: async () => 'should-not-apply',
    });
    try {
      const pending = listenOnce('am-ET', 800);
      for (let attempt = 0; attempt < 40 && !started; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      assert.equal(started, true);
      assert.equal(acquireMicrophone('dictation'), true);
      assert.equal(await pending, '');
      assert.equal(engine.pendingQuestion()?.id, 'email');
      assert.equal(engine.taskStatus('registration'), 'active');
      assert.equal(engine.isAwaitingResume(), false);
      releaseMicrophone('dictation');
    } finally {
      setAmharicCaptureForTests({ record: null, transcribe: null });
    }
  });

  it('keeps the pending email question when dictation takes the microphone', () => {
    resetMicrophoneOwnerForTests();
    const engine = registration();
    assert.equal(acquireMicrophone('conversation'), true);
    assert.equal(acquireMicrophone('dictation'), true);
    assert.equal(releaseMicrophone('conversation'), false);
    assert.equal(microphoneOwner(), 'dictation');
    assert.equal(releaseMicrophone('dictation'), true);
    assert.equal(engine.taskStatus('registration'), 'active');
    assert.equal(engine.pendingQuestion()?.id, 'email');
    assert.equal(engine.isAwaitingResume(), false);
    assert.equal(acquireMicrophone('conversation'), true);
    releaseMicrophone('conversation');
  });

  it('creates the runtime conversation engine only in App', () => {
    const constructors = sourceFiles(sourceRoot)
      .filter((file) => readFileSync(file, 'utf8').includes('new ConversationEngine'))
      .map((file) => file.slice(sourceRoot.length + 1));
    assert.deepEqual(constructors.sort(), ['App.tsx', 'engines/conversation/conversation.test.ts'].sort());
  });
});
