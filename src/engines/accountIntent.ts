import { emailLooksValid, looksLikeEmailAttempt, normalizeSpokenEmail } from './spokenEmail';

const PASSWORD_CUES = [
  'my password is',
  'the password is',
  'password is',
  'የይለፍ ቃሌ',
  'የይለፍ ቃሉ',
  'የይለፍ ቃልዬ',
  'የይለፍ ቃል',
  'የይለፍቃሌ',
  'የይለፍቃሉ',
  'የይለፍቃል',
  'ፓስወርዴ',
  'ፓስወርድ',
  'ፓስዎርድ',
  'password',
];

const EMAIL_CUES = [
  'my email address is',
  'my email is',
  'the email is',
  'email address is',
  'email is',
  'ኢሜይል አድራሻዬ',
  'ኢሜይልዬ',
  'ኢሜይሌ',
  'ኢሜልዬ',
  'ኢሜሌ',
  'ኢሜይሉ',
  'ኢሜሉ',
  'ኢሜይል',
  'ኢሜል',
  'email',
];

const NAME_CUES = [
  'my full name is',
  'my name is actually',
  'my name is',
  'full name is',
  'name is',
  'ሙሉ ስሜ',
  'ሙሉ ስም',
  'ስምዬ',
  'ስሜ',
];

const NAME_REJECT = new Set([
  'the', 'a', 'an', 'my', 'your', 'email', 'address', 'password', 'is', 'am',
  'and', 'or', 'to', 'for', 'of', 'please', 'sign', 'register', 'yes', 'no',
  'not', 'correct', 'here', 'ready', 'listening', 'going', 'this', 'that',
  'it', 'me', 'you', 'at', 'dot', 'com', 'actually', 'hello', 'use', 'another', 'name',
]);

const CORRECTION_WORDS = [
  'not correct',
  'incorrect',
  'not right',
  'wrong',
  'fix it',
  'try again',
  'አይደለም',
  'አይደለ',
  'ስህተት',
  'የተሳሳተ',
  'ተሳስቷል',
  'አስተካክል',
  'አስተካክይ',
  'እንደገና',
  'ድጋሚ',
  'እሞክራለሁ',
  'ልሞክር',
  'ቀይር',
];

export interface AccountIntent {
  original: string;
  email: string;
  password: string;
  name: string;
  emailUnclear: boolean;
  clearEmail: boolean;
  clearPassword: boolean;
  clearName: boolean;
  signIn: boolean;
  register: boolean;
  yes: boolean;
  correction: boolean;
}

export interface HeldAccount {
  email: string;
  name: string;
  password: string;
}

export function emptyHeldAccount(): HeldAccount {
  return { email: '', name: '', password: '' };
}

const LOGIN_PATTERN = /\b(?:sign in|signin|signing in|signed in|log in|login|already have an account|i have an account|i already have an account)\b/gi;
const REGISTER_PATTERN = /\b(?:register|registration|sign up|signup|create an account|create account|new account)\b/gi;
const LOGIN_AMHARIC = ['አካውንት አለኝ', 'አካውንቴ አለ', 'መግባት እፈልጋለሁ', 'ልግባ', 'መግቢያ', 'ግባ'];
const REGISTER_AMHARIC = ['አዲስ አካውንት', 'አካውንት መክፈት', 'መመዝገብ እፈልጋለሁ', 'ልመዝገብ', 'መመዝገብ', 'ተመዝገብ', 'ምዝገባ'];

function lastPattern(pattern: RegExp, text: string): number {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const expression = new RegExp(pattern.source, flags);
  let at = -1;
  for (const match of text.matchAll(expression)) {
    if (match.index !== undefined) at = match.index;
  }
  return at;
}

function lastPhrase(text: string, phrases: string[]): number {
  return phrases.reduce((at, phrase) => Math.max(at, text.lastIndexOf(phrase)), -1);
}

export function accountChoice(text: string): 'login' | 'register' | null {
  const spaced = text.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/\b(?:do not|don't|dont) have an account\b/g, '');
  const loginAt = Math.max(lastPattern(LOGIN_PATTERN, spaced), lastPhrase(text, LOGIN_AMHARIC));
  const registerAt = Math.max(lastPattern(REGISTER_PATTERN, spaced), lastPhrase(text, REGISTER_AMHARIC));
  if (loginAt < 0 && registerAt < 0) return null;
  if (loginAt > registerAt) return 'login';
  if (registerAt > loginAt) return 'register';
  return null;
}

export function retainAccountFields(held: HeldAccount, intent: Pick<AccountIntent, 'email' | 'name' | 'password'>): HeldAccount {
  return {
    email: intent.email || held.email,
    name: intent.name || held.name,
    password: intent.password || held.password,
  };
}

export function releaseHeldField(held: HeldAccount, kind: 'email' | 'name' | 'password'): HeldAccount {
  return { ...held, [kind]: '' };
}

export function acceptHeldConfirmation(held: HeldAccount, kind: '' | 'email' | 'name' | 'password'): HeldAccount {
  if (!kind || !held[kind]) return { ...held };
  return releaseHeldField(held, kind);
}

export function firstHeldField(held: HeldAccount): '' | 'email' | 'name' | 'password' {
  if (held.email) return 'email';
  if (held.name) return 'name';
  if (held.password) return 'password';
  return '';
}

export function cleanSpokenName(value: string): string {
  let next = value.replace(/\s+/g, ' ').trim();
  const clause = next.search(/\.\s+(?:my|email|password|and|i)\b/i);
  if (clause >= 0) next = next.slice(0, clause);
  next = stripTail(next).replace(/[.!?።,;:]+$/g, '').trim();
  if (!next || /[@\d]/.test(next)) return '';
  const words = next.split(' ').filter(Boolean);
  if (!words.length || words.length > 4) return '';
  if (words.some((word) => NAME_REJECT.has(word.toLowerCase()))) return '';
  if (words.some((word) => !/^[\p{L}][\p{L}'’-]*$/u.test(word))) return '';
  return words.join(' ');
}

function nameAfterIAm(text: string): string {
  const amharic = text.match(/እኔ\s+([^።]+?)\s+ነኝ/);
  const english = text.match(/(?:^|[\s,.:;።])(?:I am|I'm)\s+([^።]+)/i);
  const segment = (amharic?.[1] || english?.[1] || '').split(/\b(?:my email|email address|email|password)\b/i)[0] || '';
  return cleanSpokenName(segment);
}

function pleaseUsePiece(text: string): string {
  const english = text.match(/\bplease use\s+(.+)/i);
  if (english?.[1]) return stripTail(english[1].split(/\b(?:my email|email address|email|password)\b/i)[0] || '');
  const amharic = text.match(/(?:እባክህ|እባክሽ|እባክዎ)\s+(.+?)\s+ተጠቀም/);
  return amharic?.[1] ? stripTail(amharic[1]) : '';
}

function findCue(text: string, cues: string[]) {
  const lower = text.toLowerCase();
  let found: { index: number; length: number } | null = null;
  for (const cue of cues) {
    const index = lower.indexOf(cue.toLowerCase());
    if (index < 0) continue;
    if (!found || index < found.index || (index === found.index && cue.length > found.length)) {
      found = { index, length: cue.length };
    }
  }
  return found;
}

function stripTail(value: string) {
  let next = value.replace(/[።.!?]+$/g, '').trim();
  const tails = ['ነው', 'ናት', 'ናቸው', 'ግባ', 'ተመዝገብ', 'አዎ', 'አዎን', 'እሺ', 'and', 'እና', 'sign in', 'register', 'please', 'እባክህ', 'እባክሽ'];
  let changed = true;
  while (changed) {
    changed = false;
    for (const tail of tails) {
      const pattern = new RegExp(`(?:^|\\s)${tail}$`, 'i');
      if (pattern.test(next)) {
        next = next.replace(pattern, '').trim();
        changed = true;
      }
    }
  }
  return next;
}

function onlyCorrection(value: string) {
  const left = [...CORRECTION_WORDS, 'ትክክል', 'ነው', 'ናት'].reduce(
    (current, word) => current.replace(new RegExp(word, 'ig'), ' '),
    value,
  );
  return !left.replace(/[።.!\s]+/g, '').trim();
}

function pieceValue(text: string, cue: { index: number; length: number } | null, later: number[]) {
  if (!cue) return '';
  const start = cue.index + cue.length;
  const end = later.filter((index) => index > cue.index).sort((a, b) => a - b)[0] ?? text.length;
  return stripTail(text.slice(start, end).replace(/^[\s:፡-]+/, ''));
}

export function interpretAccount(text: string, phrases: {
  yes: string[];
  signIn: string[];
  register: string[];
}): AccountIntent {
  const original = text;
  const raw = text.replace(/\s+/g, ' ').trim();
  const lower = raw.toLowerCase();
  const includes = (list: string[]) => list.some((item) => lower.includes(item.toLowerCase()));
  const emailCue = findCue(raw, EMAIL_CUES);
  const passwordCue = findCue(raw, PASSWORD_CUES);
  const nameCue = findCue(raw, NAME_CUES);
  const bareNo = /^(no|nope)\b/i.test(lower) || lower === 'አይ';
  const correction = includes(CORRECTION_WORDS) || bareNo;
  const chosen = accountChoice(raw);
  const later = [emailCue?.index, passwordCue?.index, nameCue?.index].filter((index): index is number => index !== undefined);
  const emailValue = pieceValue(raw, emailCue, later);
  const passwordValue = pieceValue(raw, passwordCue, later);
  const nameValue = pieceValue(raw, nameCue, later);
  const spokenName = nameCue && !onlyCorrection(nameValue) ? cleanSpokenName(nameValue) : '';
  const introducedName = spokenName || (!nameCue && !passwordCue ? nameAfterIAm(raw) : '');
  const offered = !introducedName ? pleaseUsePiece(raw) : '';
  const offeredEmail = offered ? normalizeSpokenEmail(offered) : '';
  const offeredName = offered && !emailLooksValid(offeredEmail) && !looksLikeEmailAttempt(offered)
    ? cleanSpokenName(offered)
    : '';
  const name = introducedName || offeredName;
  const emailCandidate = emailCue
    ? normalizeSpokenEmail(emailValue)
    : offered && (emailLooksValid(offeredEmail) || looksLikeEmailAttempt(offered))
      ? offeredEmail
      : (!passwordCue && !name ? normalizeSpokenEmail(raw) : '');
  const intent: AccountIntent = {
    original,
    email: '',
    password: '',
    name: '',
    emailUnclear: false,
    clearEmail: false,
    clearPassword: false,
    clearName: false,
    signIn: chosen === 'login' || (chosen !== 'register' && includes(phrases.signIn)),
    register: chosen === 'register' || (chosen !== 'login' && includes(phrases.register)),
    yes: (includes(phrases.yes) || (/ትክክል/.test(raw) && !raw.includes('አይ')) || (/\bcorrect\b/i.test(lower) && !/\bnot\b/i.test(lower))) && !correction,
    correction,
  };

  if (emailCue && onlyCorrection(emailValue)) {
    intent.clearEmail = true;
  } else if (emailCue && emailLooksValid(emailCandidate)) {
    intent.email = emailCandidate;
  } else if (emailCue) {
    intent.emailUnclear = true;
  } else if (!passwordCue && !name && emailLooksValid(emailCandidate)) {
    intent.email = emailCandidate;
  } else if (!passwordCue && !name && looksLikeEmailAttempt(raw) && !onlyCorrection(raw)) {
    intent.emailUnclear = true;
  } else if (correction && (emailCue || lower.includes('email') || raw.includes('ኢሜይል') || raw.includes('ኢሜል'))) {
    intent.clearEmail = true;
  }

  if (passwordCue && passwordValue && !onlyCorrection(passwordValue)) {
    intent.password = passwordValue;
  } else if (correction && passwordCue) {
    intent.clearPassword = true;
  }

  if (name) intent.name = name;
  else if (correction && nameCue) intent.clearName = true;

  const wantsNewEmail = /\b(?:use another email|another email|different email|change the email|change my email)\b/i.test(lower)
    || raw.includes('ሌላ ኢሜይል')
    || raw.includes('ኢሜይሉን ቀይር');
  const wantsNewName = /\b(?:change my name|change the name|another name)\b/i.test(lower)
    || raw.includes('ስሙን ቀይር')
    || raw.includes('ሌላ ስም');
  if (wantsNewEmail && !intent.email) intent.clearEmail = true;
  if (wantsNewName && !intent.name) intent.clearName = true;

  if (correction && !intent.clearEmail && !intent.clearPassword && !intent.clearName && !intent.email && !intent.password && !intent.name) {
    intent.correction = true;
  }
  return intent;
}

export function applyAccountFields(
  current: { name: string; email: string },
  intent: Pick<AccountIntent, 'name' | 'email' | 'clearName' | 'clearEmail' | 'correction'>,
  confirming: '' | 'name' | 'email' = '',
): { name: string; email: string } {
  const next = { name: current.name, email: current.email };
  if (intent.clearName || (intent.correction && confirming === 'name' && !intent.name)) next.name = '';
  if (intent.clearEmail || (intent.correction && confirming === 'email' && !intent.email)) next.email = '';
  if (intent.name) next.name = intent.name;
  if (intent.email) next.email = intent.email;
  return next;
}
