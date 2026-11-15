import { emailLooksValid, normalizeSpokenEmail } from './spokenEmail';

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

const NAME_CUES = ['my name is', 'full name is', 'ሙሉ ስሜ', 'ሙሉ ስም', 'ስምዬ', 'ስሜ'];

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
  email: string;
  password: string;
  name: string;
  clearEmail: boolean;
  clearPassword: boolean;
  clearName: boolean;
  signIn: boolean;
  register: boolean;
  yes: boolean;
  correction: boolean;
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
  const raw = text.replace(/\s+/g, ' ').trim();
  const lower = raw.toLowerCase();
  const includes = (list: string[]) => list.some((item) => lower.includes(item.toLowerCase()));
  const emailCue = findCue(raw, EMAIL_CUES);
  const passwordCue = findCue(raw, PASSWORD_CUES);
  const nameCue = findCue(raw, NAME_CUES);
  const correction = includes(CORRECTION_WORDS);
  const later = [emailCue?.index, passwordCue?.index, nameCue?.index].filter((index): index is number => index !== undefined);
  const emailValue = pieceValue(raw, emailCue, later);
  const passwordValue = pieceValue(raw, passwordCue, later);
  const nameValue = pieceValue(raw, nameCue, later);
  const normalizedEmail = normalizeSpokenEmail(emailValue || (!emailCue && !passwordCue && !nameCue ? raw : ''));
  const intent: AccountIntent = {
    email: '',
    password: '',
    name: '',
    clearEmail: false,
    clearPassword: false,
    clearName: false,
    signIn: includes(phrases.signIn),
    register: includes(phrases.register),
    yes: (includes(phrases.yes) || (/ትክክል/.test(raw) && !raw.includes('አይ')) || (/\bcorrect\b/i.test(lower) && !/\bnot\b/i.test(lower))) && !correction,
    correction,
  };

  if (emailCue && emailLooksValid(normalizeSpokenEmail(emailValue)) && !onlyCorrection(emailValue)) {
    intent.email = normalizeSpokenEmail(emailValue);
  } else if (!emailCue && !passwordCue && !nameCue && emailLooksValid(normalizedEmail)) {
    intent.email = normalizedEmail;
  } else if (correction && (emailCue || lower.includes('email') || raw.includes('ኢሜይል') || raw.includes('ኢሜል'))) {
    intent.clearEmail = true;
  }

  if (passwordCue && passwordValue && !onlyCorrection(passwordValue)) {
    intent.password = passwordValue;
  } else if (correction && passwordCue) {
    intent.clearPassword = true;
  }

  if (nameCue && nameValue && !onlyCorrection(nameValue)) intent.name = nameValue;
  else if (correction && nameCue) intent.clearName = true;

  if (correction && !intent.clearEmail && !intent.clearPassword && !intent.clearName && !intent.email && !intent.password) {
    intent.correction = true;
  }
  return intent;
}
