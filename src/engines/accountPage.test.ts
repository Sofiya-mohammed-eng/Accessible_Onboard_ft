import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  ACCOUNT_OPEN_EVENT,
  accountFormSpeech,
  passwordBoxFilled,
  requestAccountForm,
  showAccountForm,
  speechMatchesVisibleForm,
  visibleAccountMode,
  visibleHeading,
} from './accountPage';
import { accountChoice } from './accountIntent';
import { clearStoredPasswords, loadAccountDraft, loadAccountSecret, saveAccountDraft, saveAccountSecret } from './formDraft';
import { microphoneOwner, resetMicrophoneOwnerForTests } from './microphoneOwner';

class FakeNode {
  attrs: Record<string, string>;
  children: FakeNode[];
  tag: string;
  textContent: string;

  constructor(tag: string, attrs: Record<string, string> = {}, text = '') {
    this.tag = tag;
    this.attrs = attrs;
    this.children = [];
    this.textContent = text;
  }

  hasAttribute(name: string) {
    return Object.prototype.hasOwnProperty.call(this.attrs, name);
  }

  getAttribute(name: string) {
    return this.attrs[name] ?? null;
  }

  setAttribute(name: string, value: string) {
    this.attrs[name] = value;
  }

  querySelector(selector: string): FakeNode | null {
    if (selector === '[data-account-stage]' && this.hasAttribute('data-account-stage')) return this;
    if (selector === this.tag) return this;
    for (const child of this.children) {
      const found = child.querySelector(selector);
      if (found) return found;
    }
    return null;
  }
}

function accountPage(mode: 'login' | 'register' | '') {
  const page = new FakeNode('main');
  const form = new FakeNode('form', {
    'data-account-stage': mode ? 'form' : 'choose',
    'data-account-mode': mode || 'login',
  });
  page.children.push(form);
  return page;
}

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    setItem: (key: string, value: string) => {
      data.set(key, String(value));
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

test('saying I want to register changes the visible form to Register', () => {
  const page = accountPage('login');
  const target = globalThis as { window?: { dispatchEvent: (event: Event) => boolean } };
  const previous = target.window;
  target.window = {
    dispatchEvent(event: Event) {
      const detail = (event as CustomEvent<'login' | 'register'>).detail;
      showAccountForm(page as unknown as ParentNode, detail);
      return true;
    },
  };
  try {
    assert.equal(accountChoice('I want to register'), 'register');
    requestAccountForm('register');
    assert.equal(visibleAccountMode(page as unknown as ParentNode), 'register');
    const speech = accountFormSpeech('register', 'en');
    assert.equal(speechMatchesVisibleForm('register', speech), true);
    assert.equal(speechMatchesVisibleForm('login', speech), false);
  } finally {
    target.window = previous;
  }
});

test('saying I want to log in changes the visible form to Login', () => {
  const page = accountPage('register');
  assert.equal(accountChoice('I want to log in'), 'login');
  assert.equal(showAccountForm(page as unknown as ParentNode, 'login'), true);
  assert.equal(visibleAccountMode(page as unknown as ParentNode), 'login');
  const speech = accountFormSpeech('login', 'en');
  assert.equal(speechMatchesVisibleForm('login', speech), true);
  assert.equal(speech.includes('Full name'), false);
});

test('Amharic speech matches the form that is actually open', () => {
  const registerSpeech = accountFormSpeech('register', 'am');
  const loginSpeech = accountFormSpeech('login', 'am');
  assert.equal(speechMatchesVisibleForm('register', registerSpeech), true);
  assert.equal(speechMatchesVisibleForm('login', loginSpeech), true);
  assert.equal(speechMatchesVisibleForm('register', loginSpeech), false);
  assert.equal(speechMatchesVisibleForm('login', registerSpeech), false);
});

test('the saved account mode returns after a restart and the password does not', () => {
  const target = globalThis as { localStorage?: Storage; sessionStorage?: Storage };
  const previousLocal = target.localStorage;
  const previousSession = target.sessionStorage;
  target.localStorage = memoryStorage() as Storage;
  target.sessionStorage = memoryStorage() as Storage;
  try {
    saveAccountDraft({ mode: 'register', stage: 'form', name: 'Sara Bekele', email: 'sara@example.com' });
    saveAccountSecret({ password: 'secret-pass', confirmPassword: 'secret-pass' });
    const loaded = loadAccountDraft();
    assert.equal(loaded?.mode, 'register');
    assert.equal(loaded?.stage, 'form');
    assert.equal(loaded?.name, 'Sara Bekele');
    assert.equal(JSON.stringify(loaded).includes('secret-pass'), false);
    assert.equal(target.sessionStorage.getItem('allways-account-secret'), null);
    assert.deepEqual(loadAccountSecret(), { password: '', confirmPassword: '' });
    clearStoredPasswords();
    assert.equal(target.sessionStorage.getItem('allways-account-secret'), null);
  } finally {
    target.localStorage = previousLocal;
    target.sessionStorage = previousSession;
  }
});

test('password text is not spoken', () => {
  const secret = 'secret-pass';
  const speech = `${passwordBoxFilled('en')} ${passwordBoxFilled('am')} ${accountFormSpeech('login', 'en')} ${accountFormSpeech('register', 'am')}`;
  assert.equal(speech.includes(secret), false);
  assert.match(speech, /I will not read it/);
  assert.match(speech, /አላነባውም/);
});

test('opening an account form does not take the microphone', () => {
  resetMicrophoneOwnerForTests();
  const target = globalThis as { window?: { dispatchEvent: (event: Event) => boolean } };
  const previous = target.window;
  target.window = { dispatchEvent: () => true };
  try {
    requestAccountForm(accountChoice('I want to register') === 'register' ? 'register' : 'login');
    assert.equal(microphoneOwner(), null);
    assert.equal(ACCOUNT_OPEN_EVENT, 'allways-open-account');
  } finally {
    target.window = previous;
    resetMicrophoneOwnerForTests();
  }
});

test('other pages are described from their visible heading', () => {
  const page = new FakeNode('main');
  const heading = new FakeNode('h1', {}, 'Find jobs');
  const detail = new FakeNode('p', {}, 'Three jobs are open.');
  page.children.push(heading, detail);
  assert.equal(visibleHeading(page as unknown as ParentNode), 'Find jobs. Three jobs are open.');
});

test('the guide waits for the visible form before describing it', () => {
  const guide = readFileSync(new URL('../components/BlindConversation.tsx', import.meta.url), 'utf8');
  const form = readFileSync(new URL('../components/LoginToApply.tsx', import.meta.url), 'utf8');
  assert.match(guide, /shownMode\(\) !== which/);
  assert.match(guide, /accountFormSpeech\(visible, currentLanguage\(\)\)/);
  assert.match(guide, /requestAccountForm\(which\)/);
  assert.doesNotMatch(guide, /data-voice-choice/);
  assert.match(form, /ACCOUNT_OPEN_EVENT/);
  assert.match(form, /setMode\(detail\)/);
  assert.doesNotMatch(form, /saveAccountSecret/);
});
