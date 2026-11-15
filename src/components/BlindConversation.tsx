import { useEffect, useRef, useState } from 'react';
import { listenOnce, speakAndWait, stopSpeakingAloud } from '../engines/accessibilityEngine';
import { getLanguageOption, getLocalizedCopy } from '../engines/i18n';
import { getPageCopy, unsupportedLanguageNotice } from '../engines/pageCopy';
import { interpretAccount } from '../engines/accountIntent';
import { emailLooksValid, normalizeSpokenEmail } from '../engines/spokenEmail';
import { PreferredLanguage } from '../types/accessbridge';

interface BlindConversationProps {
  enabled: boolean;
  language: PreferredLanguage;
  rate: number;
  pageKey: string;
  languageOpen: boolean;
  onCaption: (text: string) => void;
  onGetStarted: () => void;
  onOpenDashboard: () => void;
  onChooseLanguage: (language: PreferredLanguage) => void;
  onContinueToSignIn: () => void;
}

const GET_STARTED = ['get started', 'get start', 'lets start', "let's start", 'start', 'ጀምር', 'ጀምሩ', 'ጀመር', 'ጀምሪ', 'እንጀምር', 'ጀምረን', 'ጀምርልኝ', 'እጀምር', 'ተጀመር', 'jemer', 'jemir', 'jemr', 'gemer', 'gemir', 'jemeru'];
const ENGLISH = ['english', 'እንግሊዝኛ'];
const AMHARIC = ['amharic', 'አማርኛ', 'amarinya'];
const REGISTER = ['register', 'sign up', 'create account', 'ተመዝገብ', 'ምዝገባ'];
const SIGN_IN = ['sign in', 'login', 'log in', 'ግባ', 'መግቢያ'];
const APPLY = ['apply', 'አመልክት', 'አመልከት', 'ያመልክቱ', 'ላመልክት', 'ማመልከት', 'አመልክቻለሁ', 'አፕላይ', 'amelk', 'amalk', 'amelket', 'melket', 'memelket', 'yamelk', 'aplik'];
const DETAILS = ['view job details', 'view details', 'details', 'ዝርዝር', 'ተመልከት', 'zerzer', 'zirzir', 'zirzer', 'dets'];
const OPEN_FILE = ['open file', 'choose file', 'ፋይል ክፈት', 'ፋይል', 'ክፈት', 'fayl', 'fayil', 'file', 'kfet', 'keft', 'open'];
const YES = ['yes', 'yeah', 'yep', 'ok', 'okay', 'አዎ', 'አዎን', 'እሺ', 'awo', 'awon', 'eshi', 'ishi'];
const NO = ['no', 'nope', 'wrong', 'again', 'አይ', 'አይደለም', 'አይደለ', 'እንደገና', 'aydelem', 'aydele'];
const CORRECTION = [
  'not correct',
  'incorrect',
  'not right',
  'wrong',
  'fix it',
  'fix this',
  'try again',
  'say again',
  'change it',
  'change the email',
  'አይደለም',
  'አይደለ',
  'ስህተት',
  'የተሳሳተ',
  'ተሳስቷል',
  'ተሳስታል',
  'አስተካክል',
  'አስተካክይ',
  'አስተካከይ',
  'እስተካክል',
  'እንደገና',
  'ድጋሚ',
  'ድገም',
  'ደግመህ',
  'እደግማለሁ',
  'እሞክራለሁ',
  'ልሞክር',
  'እሞክር',
  'ቀይር',
];
const NEXT = ['continue', 'next', 'submit', 'ቀጥል', 'ቀጽል', 'ቀጣይ', 'ቀጥይ', 'እንቀጥል', 'ቀጥለን', 'ቀጠል', 'ላክ', 'ስላክ', 'ገምግም', 'review', 'ketl', 'ketel', 'kettel', 'ketel'];
const FIND_JOBS = ['find jobs', 'find job', 'jobs', 'ስራ ፈልግ', 'ሥራ'];

function includesAny(text: string, phrases: string[]) {
  const lower = text.toLowerCase();
  return phrases.some((phrase) => lower.includes(phrase.toLowerCase()));
}

function wantsCorrection(text: string) {
  const lower = text.toLowerCase();
  if (!lower.trim()) return false;
  return includesAny(lower, NO) || includesAny(lower, CORRECTION);
}

function wantsStart(text: string) {
  const lower = text.toLowerCase();
  if (!lower.trim()) return false;
  if (includesAny(lower, GET_STARTED) || isYes(lower)) return true;
  return /ጀም|ጀመ|jemer|jemir|jemr|gemer|gemir|jamr|jamer/.test(lower) || (lower.includes('start') && !lower.includes('not'));
}

function wantsApply(text: string) {
  const lower = text.toLowerCase();
  return includesAny(lower, APPLY) || /አመልክ|መልከት|amelk|apply/.test(lower);
}

function wantsNext(text: string) {
  const lower = text.toLowerCase();
  if (!lower.trim() || wantsCorrection(lower)) return false;
  return includesAny(lower, NEXT) || isYes(lower) || /ቀጥ|ቀጽ|ketl|ketel|next|continue/.test(lower);
}

function isYes(text: string) {
  const lower = text.toLowerCase();
  if (!lower.trim() || wantsCorrection(lower)) return false;
  if (includesAny(lower, YES)) return true;
  if (lower.includes('ትክክል') && !lower.includes('አይ')) return true;
  if (/\bcorrect\b/.test(lower) && !/\bnot\b/.test(lower)) return true;
  return false;
}

function speakableEmail(email: string, amharic: boolean) {
  const [name, domain = ''] = email.split('@');
  if (!name || !domain) return email;
  const host = domain.replace(/\./g, amharic ? ' ነጥብ ' : ' dot ').replace(/\s+/g, ' ').trim();
  return amharic ? `${name} አት ${host}` : `${name} at ${host}`;
}

function setFieldValue(field: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype =
    field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  setter?.call(field, value);
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function visiblePage(root: HTMLElement) {
  const selector = 'h1, h2, h3, p, li, dt, dd, button, label, legend';
  const blocks = [...root.querySelectorAll<HTMLElement>(selector)].filter((node) => {
    if (node.closest('.sr-only, [aria-hidden="true"], [data-voice-close]')) return false;
    if (node.offsetParent === null) return false;
    return !node.querySelector(selector);
  });
  const lines: string[] = [];
  const add = (text: string) => {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (clean.length < 2 || lines[lines.length - 1] === clean) return;
    lines.push(clean);
  };
  for (const node of blocks) {
    let text = node.textContent || '';
    const field = node.querySelector('input, textarea');
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
      if (field.type !== 'radio' && field.type !== 'checkbox' && field.type !== 'file' && field.value.trim()) {
        text = `${text} ${field.value.trim()}`;
      }
    }
    add(text);
  }
  for (const node of root.querySelectorAll<HTMLElement>('strong, span')) {
    if (node.closest(`.sr-only, [aria-hidden="true"], ${selector}`)) continue;
    if (node.offsetParent === null) continue;
    const text = node.textContent || '';
    if (/^\d+$/.test(text.trim())) continue;
    add(text);
  }
  return lines.join('. ');
}

function textFields(root: HTMLElement) {
  return [...root.querySelectorAll('input, textarea')].filter((node): node is HTMLInputElement | HTMLTextAreaElement => {
    if (!(node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement)) return false;
    if (node.disabled || node.type === 'hidden' || node.type === 'file' || node.type === 'radio' || node.type === 'checkbox') {
      return false;
    }
    return node.offsetParent !== null;
  });
}

export function BlindConversation({
  enabled,
  language,
  rate,
  pageKey,
  languageOpen,
  onCaption,
  onGetStarted,
  onOpenDashboard,
  onChooseLanguage,
  onContinueToSignIn,
}: BlindConversationProps) {
  const [promptKey, setPromptKey] = useState(pageKey);
  const captionRef = useRef(onCaption);
  const languageRef = useRef(language);
  const lastProblemRef = useRef('');
  const problemSpeechRef = useRef<Promise<void>>(Promise.resolve());
  const guideActiveRef = useRef(false);
  captionRef.current = onCaption;
  languageRef.current = language;

  useEffect(() => {
    if (pageKey !== 'apply') {
      setPromptKey(pageKey);
      return;
    }
    const root = document.getElementById('main-content');
    if (!root) return;
    const heading = () => root.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() || 'apply';
    setPromptKey(heading());
    const observer = new MutationObserver(() => {
      const next = heading();
      setPromptKey((current) => (current === next ? current : next));
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [pageKey]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    guideActiveRef.current = true;
    const currentLanguage = () => languageRef.current;
    const speechLang = () => getLanguageOption(currentLanguage()).speechLang;
    const page = () => getPageCopy(currentLanguage());
    const copy = () => getLocalizedCopy(currentLanguage());
    const amharic = () => currentLanguage() === 'am';

    const say = (text: string, lang?: string) => {
      captionRef.current(text);
      return speakAndWait(text, { lang: lang || speechLang(), rate, onCaption: captionRef.current });
    };

    const hear = async (lang?: string) => {
      const once = async (code: string) => {
        captionRef.current(code.startsWith('am') ? 'እያዳመጥኩ ነው…' : 'Listening…');
        const transcript = await listenOnce(code);
        if (cancelled || !transcript) return '';
        const blocked = unsupportedLanguageNotice(transcript, currentLanguage());
        if (blocked) {
          await say(blocked);
          return '';
        }
        captionRef.current(transcript);
        return transcript;
      };
      if (lang) return once(lang);
      if (pageKey === 'landing' || pageKey === 'jobs' || pageKey === 'apply') {
        return (await once('am-ET')) || (await once('en-US'));
      }
      return once(speechLang());
    };

    const confirmField = async (field: HTMLInputElement | HTMLTextAreaElement): Promise<'done' | 'fix-email'> => {
      const label = (field.labels?.[0]?.innerText || field.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
      const emailField = field.type === 'email';
      const ask = amharic()
        ? `${label}። አሁን ይናገሩ። ትክክል ካልሆነ ትክክል አይደለም ይበሉ።`
        : `${label}. I am listening. If it is wrong, say it is not correct.`;
      const heardLead = amharic() ? 'ይህን ሰማሁ።' : 'I heard';
      const check = amharic() ? 'ትክክል ከሆነ አዎ ይበሉ። ካልሆነ ትክክል አይደለም ይበሉ።' : 'Say yes if that is right. If not, say it is not correct.';
      const prepare = (value: string) => (emailField ? normalizeSpokenEmail(value) : value.trim());
      const repeatHeard = async (raw: string, next: string) => {
        const addedAt = emailField && !raw.includes('@') && next.includes('@');
        if (addedAt) {
          await say(amharic()
            ? `ይህን ሰማሁ። @ ጨምሬዋለሁ። ${next}. ${check}`
            : `I heard ${next}. I added the @ sign. ${check}`);
          return;
        }
        await say(`${heardLead} ${next}. ${check}`);
      };
      const acceptCorrection = async (raw: string) => {
        const recovered = emailField ? prepare(raw) : '';
        if (emailField && emailLooksValid(recovered)) {
          setFieldValue(field, recovered);
          await say(amharic()
            ? `እሺ። አስተካክዬዋለሁ። ${recovered}. ${check}`
            : `Okay. I corrected it to ${recovered}. ${check}`);
          return false;
        }
        setFieldValue(field, '');
        await say(emailField
          ? (amharic()
            ? 'እሺ። ኢሜይሉ ትክክል አይደለም። አጽድቻለሁ። ትክክለኛውን እንደገና ይናገሩ።'
            : 'Okay. That email is not correct. I cleared it. Say the email again.')
          : (amharic()
            ? 'እሺ። ትክክል አይደለም። አጽድቻለሁ። እንደገና ይናገሩ።'
            : 'Okay. That is not correct. I cleared it. Say it again.'));
        return true;
      };
      let attempt = 0;
      while (attempt < 8 && !cancelled) {
        attempt += 1;
        field.focus();
        await say(ask);
        const raw = await hear();
        if (cancelled) return 'done';
        if (!raw) {
          await say(amharic() ? 'አልሰማሁም። እንደገና ይናገሩ።' : 'I did not hear you. Please say it again.');
          continue;
        }
        if (!emailField && wantsCorrection(raw) && (raw.includes('ኢሜይል') || raw.includes('ኢሜል') || raw.toLowerCase().includes('email'))) {
          return 'fix-email';
        }
        if (wantsCorrection(raw)) {
          const cleared = await acceptCorrection(raw);
          if (cleared) continue;
        } else {
          const heard = prepare(raw);
          if (!heard) continue;
          if (emailField && !emailLooksValid(heard)) {
            setFieldValue(field, '');
            await say(amharic()
              ? `${raw} ኢሜይል አይደለም። እንደገና ይናገሩ። ለምሳሌ name at gmail dot com። @ እጨምራለሁ።`
              : `${raw} is not an email. Say it again, like name at gmail dot com. I will add the @ sign.`);
            continue;
          }
          setFieldValue(field, heard);
          await repeatHeard(raw, heard);
        }
        const rawAnswer = await hear();
        if (cancelled) return 'done';
        if (!emailField && wantsCorrection(rawAnswer) && (rawAnswer.includes('ኢሜይል') || rawAnswer.includes('ኢሜል') || rawAnswer.toLowerCase().includes('email'))) {
          return 'fix-email';
        }
        if (wantsCorrection(rawAnswer)) {
          const cleared = await acceptCorrection(rawAnswer);
          if (cleared) continue;
        }
        if (wantsNext(rawAnswer)) {
          if (emailField && !emailLooksValid(field.value)) continue;
          return 'done';
        }
        const answer = prepare(rawAnswer);
        if (!answer || wantsCorrection(answer)) continue;
        if (emailField && !emailLooksValid(answer)) {
          setFieldValue(field, '');
          await say(amharic()
            ? `${rawAnswer} ኢሜይል አይደለም። ትክክለኛውን እንደገና ይናገሩ።`
            : `${rawAnswer} is not an email. Say the correct email again.`);
          continue;
        }
        setFieldValue(field, answer);
        await repeatHeard(rawAnswer, answer);
        const second = await hear();
        if (wantsCorrection(second)) {
          await acceptCorrection(second);
          continue;
        }
        if (wantsNext(second)) return 'done';
      }
      return emailField && !emailLooksValid(field.value) ? 'fix-email' : 'done';
    };

    const readProblem = async (root: HTMLElement) => {
      await wait(280);
      const alert = root.querySelector('[role="alert"]');
      const message = alert?.textContent?.replace(/\s+/g, ' ').trim() || '';
      if (!message) return '';
      if (message !== lastProblemRef.current) {
        lastProblemRef.current = message;
        problemSpeechRef.current = say(message);
      }
      await problemSpeechRef.current;
      return alert?.getAttribute('data-voice-fix') || 'again';
    };

    const repairFields = async (root: HTMLElement, fix: string) => {
      const fields = textFields(root).filter((field) => {
        if (fix === 'email') return field.type === 'email';
        if (fix === 'password' || fix === 'confirm') return field.type === 'password';
        if (fix === 'name') return field.getAttribute('autocomplete') === 'name';
        if (fix === 'answer') return field.type !== 'password';
        return !field.value.trim() || field.getAttribute('aria-invalid') === 'true';
      });
      for (const field of fields) {
        if (cancelled) return;
        await confirmField(field);
      }
    };

    const run = async () => {
      const root = document.getElementById('main-content');
      if (!root || cancelled) return;

      if (languageOpen) {
        await say('Say English, or say Amharic. እንግሊዝኛ ወይም አማርኛ ይበሉ።');
        for (let attempt = 0; attempt < 4 && !cancelled; attempt += 1) {
          const choice = (await hear('am-ET')) || (await hear('en-US'));
          const next = includesAny(choice, AMHARIC) ? 'am' : includesAny(choice, ENGLISH) ? 'en' : null;
          if (!next) {
            await say(amharic() ? 'እንግሊዝኛ ወይም አማርኛ ይበሉ።' : 'Please say English or Amharic.');
            continue;
          }
          languageRef.current = next;
          onChooseLanguage(next);
          await say(next === 'am' ? 'አማርኛ ተመርጧል።' : 'English is selected.');
          onContinueToSignIn();
          return;
        }
        return;
      }

      if (pageKey === 'landing') {
        await say('Find work from Ethiopia to the world. Say get started.', 'en-US');
        if (cancelled) return;
        await say('ከኢትዮጵያ እስከ ዓለም ሥራ ይፈልጉ። ለመጀመር ጀምር ይበሉ።', 'am-ET');
        for (let attempt = 0; attempt < 4 && !cancelled; attempt += 1) {
          const command = (await hear('am-ET')) || (await hear('en-US'));
          if (wantsStart(command)) {
            onGetStarted();
            return;
          }
          await say('Say get started. Or say ጀምር.', 'en-US');
          if (cancelled) return;
          await say('ለመጀመር ጀምር ይበሉ።', 'am-ET');
        }
        return;
      }

      if (pageKey === 'dashboard') {
        const title = root.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() || page().dashboardHeadline;
        await say(title);
        await say(amharic() ? 'ሥራ ለመፈለግ ስራ ፈልግ ይበሉ።' : 'Say find jobs.');
        const command = await hear();
        if (includesAny(command, FIND_JOBS)) {
          root.querySelector<HTMLButtonElement>('[data-voice="find-jobs"]')?.click();
        }
        return;
      }

      if (pageKey === 'login') {
        const phrases = { yes: YES, signIn: SIGN_IN, register: REGISTER };
        await say(amharic()
          ? 'መግባት ወይም መመዝገብ ይችላሉ። ኢሜይል ወይም የይለፍ ቃል ቢሉኝ እረዳለሁ።'
          : 'You can sign in or register. You can also tell me your email or your password.');
        let register = false;
        let carry = '';
        while (!cancelled && !carry) {
          const choice = await hear();
          if (cancelled) return;
          if (!choice) {
            await say(amharic() ? 'ግባ፣ ተመዝገብ፣ ኢሜይል ወይም የይለፍ ቃል ይበሉ።' : 'Say sign in, register, your email, or your password.');
            continue;
          }
          const intent = interpretAccount(choice, phrases);
          if (intent.register || intent.signIn || intent.email || intent.password || intent.name) {
            register = intent.register && !intent.signIn ? true : intent.register;
            if (intent.signIn && !intent.register) register = false;
            carry = choice;
            break;
          }
          await say(amharic()
            ? `ሰማሁ። ${choice}. ግባ ወይም ተመዝገብ ይበሉ። ኢሜይል ወይም የይለፍ ቃልም መናገር ይችላሉ።`
            : `I heard ${choice}. Say sign in or register. You can also say your email or your password.`);
        }
        if (cancelled || !carry) return;
        root.querySelector<HTMLButtonElement>(`[data-voice-choice="${register ? 'register' : 'login'}"]`)?.click();
        await wait(350);
        const formRoot = document.getElementById('main-content');
        if (!formRoot || cancelled) return;
        const emailInput = () => formRoot.querySelector<HTMLInputElement>('input[type="email"]');
        const nameInput = () => formRoot.querySelector<HTMLInputElement>('input[autocomplete="name"]');
        const passwordInputs = () => [...formRoot.querySelectorAll<HTMLInputElement>('input[type="password"]')];
        let maybePassword = '';
        let lastTopic: 'email' | 'password' | 'name' | '' = '';
        let pending: { kind: 'email' | 'password' | 'name'; value: string } | null = null;
        const confirmLine = (kind: 'email' | 'password' | 'name', value: string) => {
          const spoken = kind === 'email' ? speakableEmail(value, amharic()) : value;
          if (amharic()) {
            const lead = kind === 'email' ? 'ኢሜይልዎን ሰማሁ' : kind === 'password' ? 'የይለፍ ቃልዎን ሰማሁ' : 'ስምዎን ሰማሁ';
            return `${lead}። ${spoken}. ትክክል ከሆነ አዎ ይበሉ። ካልሆነ ትክክል አይደለም ይበሉ።`;
          }
          const lead = kind === 'email' ? 'I heard your email' : kind === 'password' ? 'I heard your password' : 'I heard your name';
          return `${lead}, ${spoken}. Say yes if that is right. If not, say it is not correct.`;
        };
        const savePending = () => {
          if (!pending) return;
          if (pending.kind === 'email') {
            const email = emailInput();
            if (email) setFieldValue(email, pending.value);
          } else if (pending.kind === 'password') {
            const fields = passwordInputs();
            if (fields[0]) setFieldValue(fields[0], pending.value);
          } else {
            const name = nameInput();
            if (name) setFieldValue(name, pending.value);
          }
          lastTopic = pending.kind;
          pending = null;
        };
        const nextNeed = () => {
          const email = emailInput();
          const passwords = passwordInputs();
          const name = nameInput();
          const emailReady = Boolean(email && emailLooksValid(email.value));
          const passwordReady = Boolean(passwords[0]?.value.trim());
          const nameReady = !register || !name || Boolean(name.value.trim());
          if (!emailReady) return amharic() ? 'እሺ። ኢሜይልዎን ገና እየጠበቅኩ ነው።' : 'Okay. I still need your email.';
          if (!passwordReady) return amharic() ? 'እሺ። የይለፍ ቃልዎን ገና እየጠበቅኩ ነው።' : 'Okay. I still need your password.';
          if (!nameReady) return amharic() ? 'እሺ። ሙሉ ስምዎን ይናገሩ።' : 'Okay. Tell me your full name.';
          if (passwords[1] && !passwords[1].value.trim()) return amharic() ? 'ተመሳሳይ የይለፍ ቃል ከሆነ አዎ ይበሉ።' : 'If the password is the same, say yes.';
          return amharic() ? 'ሁለቱም ዝግጁ ናቸው። ለመግባት ግባ ይበሉ። ለማስተካከል ትክክል አይደለም ይበሉ።' : 'Both are ready. Say sign in. If something is wrong, say it is not correct.';
        };
        while (!cancelled) {
          const heard = carry || await hear();
          carry = '';
          if (cancelled) return;
          if (!heard) {
            await say(amharic() ? 'እየሰማሁ ነው። ኢሜይል ወይም የይለፍ ቃል ይናገሩ።' : 'I am listening. Tell me your email or your password.');
            continue;
          }
          const intent = interpretAccount(heard, phrases);
          if (maybePassword) {
            const offered = maybePassword;
            maybePassword = '';
            if (intent.yes && !intent.email && !intent.password) {
              const fields = passwordInputs();
              if (fields[0]) setFieldValue(fields[0], offered);
              const emailReadyNow = Boolean(emailInput() && emailLooksValid(emailInput()?.value || ''));
              await say(amharic()
                ? `እሺ። የይለፍ ቃልዎን አስቀምጫለሁ። ${offered}. ${emailReadyNow ? 'ለመግባት ግባ ይበሉ።' : 'ኢሜይልዎን ገና እየጠበቅኩ ነው።'}`
                : `Okay. I saved your password, ${offered}. ${emailReadyNow ? 'Say sign in when you are ready.' : 'I still need your email.'}`);
              continue;
            }
            if (!intent.email && !intent.password && !intent.correction && !intent.clearEmail && !intent.clearPassword) {
              await say(amharic()
                ? 'እሺ። ያ የይለፍ ቃል አይደለም። ኢሜይልዎን ወይም የይለፍ ቃልዎን ይናገሩ።'
                : 'Okay. I will not use that as the password. Tell me your email or your password.');
              continue;
            }
          }
          if (intent.correction && !intent.clearEmail && !intent.clearPassword && !intent.clearName && !intent.email && !intent.password && !intent.name) {
            if (pending) {
              pending = null;
              await say(amharic() ? 'እሺ። ትክክል አይደለም። አጽድቻለሁ። እንደገና ይናገሩ።' : 'Okay. That is not correct. I cleared it. Say it again.');
              continue;
            }
            const topic = lastTopic as string;
            if (topic === 'password') intent.clearPassword = true;
            else if (topic === 'name') intent.clearName = true;
            else intent.clearEmail = true;
          }
          const notes: string[] = [];
          if (intent.clearEmail) {
            const email = emailInput();
            if (email) setFieldValue(email, '');
            if (pending?.kind === 'email') pending = null;
            notes.push(amharic() ? 'እሺ። ኢሜይሉ ትክክል አይደለም። አጽድቻለሁ።' : 'Okay. That email is not correct. I cleared it.');
          }
          if (intent.clearPassword) {
            passwordInputs().forEach((field) => setFieldValue(field, ''));
            if (pending?.kind === 'password') pending = null;
            notes.push(amharic() ? 'እሺ። የይለፍ ቃሉን አጽድቻለሁ።' : 'Okay. I cleared the password.');
          }
          if (intent.clearName) {
            const name = nameInput();
            if (name) setFieldValue(name, '');
            if (pending?.kind === 'name') pending = null;
            notes.push(amharic() ? 'እሺ። ስሙን አጽድቻለሁ።' : 'Okay. I cleared the name.');
          }
          if (intent.email || intent.password || intent.name) {
            if (notes.length) await say(notes.join(' '));
            const kind = intent.email ? 'email' : intent.password ? 'password' : 'name';
            const value = intent.email || intent.password || intent.name;
            pending = { kind, value };
            await say(confirmLine(kind, value));
            continue;
          }
          if (pending && intent.yes) {
            savePending();
            if (!intent.signIn && !intent.register) {
              await say(nextNeed());
              continue;
            }
          }
          const email = emailInput();
          const passwords = passwordInputs();
          const name = nameInput();
          const emailReady = Boolean(email && emailLooksValid(email.value));
          const passwordReady = Boolean(passwords[0]?.value.trim());
          const nameReady = !register || !name || Boolean(name.value.trim());
          if (!intent.clearEmail && !intent.clearPassword && !intent.clearName && !intent.signIn && !intent.register && !intent.yes) {
            maybePassword = heard.trim();
            await say(amharic()
              ? `${heard} ኢሜይል አይደለም። የይለፍ ቃልዎ ከሆነ አዎ ይበሉ። ኢሜይል ከሆነ ኢሜይሉን ይናገሩ።`
              : `${heard} is not an email. If it is your password, say yes. Or tell me your email.`);
            continue;
          }
          if (passwords[1] && passwordReady && !passwords[1].value.trim() && intent.yes && !pending) {
            setFieldValue(passwords[1], passwords[0].value);
          }
          const confirmReady = !passwords[1] || Boolean(passwords[1].value.trim());
          const ready = emailReady && passwordReady && nameReady && confirmReady && !pending;
          if ((intent.signIn || intent.register || (intent.yes && ready)) && ready) {
            if (notes.length) await say(notes.join(' '));
            formRoot.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
            const fix = await readProblem(formRoot);
            if (!fix || cancelled) return;
            if (fix === 'email' && email) setFieldValue(email, '');
            if (fix === 'password' || fix === 'confirm') passwords.forEach((field) => setFieldValue(field, ''));
            await say(amharic()
              ? 'ያ አልተሳካም። ኢሜይሉን ወይም የይለፍ ቃሉን እንደገና ይናገሩ።'
              : 'That did not work. Tell me the email or the password again.');
            continue;
          }
          if (notes.length) notes.push(nextNeed());
          await say(notes.length ? notes.join(' ') : nextNeed());
        }
        return;
      }

      if (pageKey === 'jobs') {
        const jobButtons = () => [...root.querySelectorAll<HTMLButtonElement>('[data-voice-apply]')];
        if (jobButtons().length > 0) {
          const searchInput = root.querySelector<HTMLInputElement>('#opportunity-search');
          const totalJobs = jobButtons().length;
          const ignore = ['the', 'a', 'an', 'job', 'jobs', 'work', 'want', 'i', 'my', 'please', 'ሥራ', 'ስራ', 'እፈልጋለሁ', 'እፈልጋለው', 'ፈልጌ', 'ነው', 'አንድ'];
          await say(amharic()
            ? 'ምን ዓይነት ሥራ ይፈልጋሉ? የሥራውን ስም ይናገሩ።'
            : 'What job do you want? Say the kind of work.');
          let narrowed = false;
          for (let attempt = 0; attempt < 4 && !cancelled && !narrowed; attempt += 1) {
            const request = await hear(amharic() ? 'am-ET' : undefined);
            if (cancelled) return;
            if (!request) {
              await say(amharic() ? 'አልሰማሁም። የሚፈልጉትን ሥራ ይናገሩ።' : 'I did not hear you. Say the job you want.');
              continue;
            }
            if (wantsApply(request)) {
              jobButtons()[0]?.click();
              return;
            }
            const words = request.toLowerCase().split(/\s+/).map((word) => word.replace(/[።.!?]/g, '')).filter((word) => word.length > 2 && !ignore.includes(word));
            const tries = [request, ...words];
            let matched = false;
            for (const term of tries) {
              if (!searchInput) break;
              setFieldValue(searchInput, term);
              searchInput.form?.requestSubmit();
              await wait(250);
              if (jobButtons().length > 0 && jobButtons().length < totalJobs) {
                matched = true;
                break;
              }
            }
            if (!matched && searchInput) {
              setFieldValue(searchInput, '');
              searchInput.form?.requestSubmit();
              await wait(250);
              await say(amharic()
                ? `${request} ብዬ ሰማሁ። ያንን ትክክለኛ ሥራ አላገኘሁም። ያሉትን ሥራዎች እነግርዎታለሁ።`
                : `I heard ${request}. I could not find that exact job. I will tell you the jobs we have.`);
            } else {
              await say(amharic() ? `${request} ብዬ ፈልጌአለሁ። ያገኘሁት ይህ ነው።` : `I searched for ${request}. Here is what I found.`);
            }
            narrowed = true;
          }
          const found = jobButtons();
          for (const button of found) {
            if (cancelled) return;
            const card = button.closest('li');
            const title = card?.querySelector('h2')?.textContent?.replace(/\s+/g, ' ').trim() || button.getAttribute('data-voice-apply') || '';
            const lines = [...(card?.querySelectorAll('p') || [])].map((item) => item.textContent?.replace(/\s+/g, ' ').trim() || '').filter(Boolean);
            const summary = lines.find((line) => line.length > 40) || lines[1] || '';
            await say(amharic()
              ? `${title}. ${lines[0] || ''}. ${summary}`
              : `${title}. ${lines[0] || ''}. ${summary}`);
          }
          await say(amharic()
            ? 'ለማመልከት አመልክት ይበሉ። ወይም የሥራውን ስም ይበሉ።'
            : 'Say apply. Or say the name of the job.');
          for (let attempt = 0; attempt < 4 && !cancelled; attempt += 1) {
            const command = await hear(amharic() ? 'am-ET' : undefined);
            if (!command) {
              await say(amharic() ? 'አልሰማሁም። አመልክት ይበሉ። ወይም የሥራውን ስም ይበሉ።' : 'I did not hear you. Say apply, or say the job name.');
              continue;
            }
            await say(amharic() ? `ሰማሁ። ${command}` : `I heard ${command}.`);
            const named = jobButtons().find((button) => {
              const title = (button.getAttribute('data-voice-apply') || '').toLowerCase();
              return title && command.toLowerCase().split(/\s+/).some((word) => word.length > 3 && title.includes(word));
            });
            if (named) {
              await say(amharic() ? 'እሺ። ወደ ማመልከቻው እሄዳለሁ። ቀጣዩ ደረጃ ማመልከቻው ነው።' : 'Okay. I am opening the application. The next step is the application.');
              named.click();
              return;
            }
            if (wantsApply(command) || isYes(command)) {
              await say(amharic() ? 'እሺ። ወደ ማመልከቻው እሄዳለሁ። ቀጣዩ ደረጃ ማመልከቻው ነው።' : 'Okay. I am opening the application. The next step is the application.');
              (named || jobButtons()[0])?.click();
              return;
            }
            await say(amharic() ? 'አመልክት ይበሉ። ወይም የሥራውን ስም ይበሉ።' : 'Say apply, or say the job name.');
          }
          return;
        }
        const jobTitle = root.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() || '';
        const about = root.querySelector('section p')?.textContent?.replace(/\s+/g, ' ').trim() || '';
        await say(`${jobTitle}. ${about}`);
        await say(amharic()
          ? 'ቀጣዩ ደረጃ ማመልከት ነው። ለማመልከት አመልክት ይበሉ።'
          : 'The next step is to apply. Say apply.');
        for (let attempt = 0; attempt < 4 && !cancelled; attempt += 1) {
          const command = await hear();
          if (!command) {
            await say(amharic() ? 'አልሰማሁም። አመልክት ይበሉ።' : 'I did not hear you. Say apply.');
            continue;
          }
          await say(amharic() ? `ሰማሁ። ${command}` : `I heard ${command}.`);
          if (wantsApply(command) || isYes(command)) {
            await say(amharic() ? 'እሺ። ወደ ማመልከቻው እሄዳለሁ።' : 'Okay. I am opening the application.');
            root.querySelector<HTMLButtonElement>('[data-voice-apply]')?.click();
            return;
          }
          await say(amharic() ? 'ቀጣዩ ደረጃ ማመልከት ነው። አመልክት ይበሉ።' : 'The next step is to apply. Say apply.');
        }
        return;
      }

      if (pageKey === 'apply') {
        const pageText = visiblePage(root);
        if (pageText) await say(pageText);
        if (root.querySelector('[data-voice-scene="complete"]')) {
          await say(page().thanksAndLuck);
          return;
        }
        if (root.querySelector('[data-voice="open-file"]')) {
          const openButton = root.querySelector<HTMLButtonElement>('[data-voice="open-file"]');
          const fileInput = root.querySelector<HTMLInputElement>('#cv-file');
          const shownName = () => {
            const picked = fileInput?.getAttribute('data-picked') || '';
            if (picked) return picked;
            const shown = root.querySelector('[data-voice="cv-name"]')?.textContent?.replace(/\s+/g, ' ').trim() || '';
            return shown && shown !== page().chooseFile ? shown : '';
          };
          const rememberFile = (name: string) => {
            fileInput?.setAttribute('data-picked', name);
            const label = root.querySelector('[data-voice="cv-name"]');
            if (label) label.textContent = name;
            window.dispatchEvent(new CustomEvent('allways-cv', { detail: name }));
          };
          const waitForFile = async () => {
            const started = Date.now();
            const before = fileInput?.getAttribute('data-picked') || '';
            while (!cancelled && Date.now() - started < 45000) {
              const name = fileInput?.getAttribute('data-picked') || '';
              if (name && name !== before) return name;
              await wait(250);
            }
            return '';
          };
          openButton?.focus();
          for (let attempt = 0; attempt < 4 && !cancelled; attempt += 1) {
            const command = await hear();
            if (cancelled) return;
            if (!command) {
              await say(amharic() ? 'አልሰማሁም። ቀጥል ይበሉ። ወይም ፋይል ክፈት ይበሉ።' : 'I did not hear you. Say continue. Or say open file.');
              continue;
            }
            await say(amharic() ? `ሰማሁ። ${command}` : `I heard ${command}.`);
            if (includesAny(command, OPEN_FILE) && !wantsNext(command)) {
              openButton?.focus();
              await say(amharic()
                ? 'አሁን Enter ይጫኑ። መስኮቱ ይከፈታል። የታች ቀስት፣ ከዚያ Enter። እጠብቃለሁ።'
                : 'Press Enter now. The file window opens. Press the Down arrow, then Enter. I will wait.');
              const chosen = await waitForFile();
              if (!chosen) {
                await say(amharic() ? 'ፋይል አልተመረጠም። የታች ቀስት እና Enter ይጫኑ። ከዚያ ቀጥል ይበሉ።' : 'No new file was chosen. Press the Down arrow and Enter. Then say continue.');
                continue;
              }
              await say(amharic() ? `${chosen} ተመርጧል። ቀጣዩ ደረጃ መቀጠል ነው። ቀጥል ይበሉ።` : `${chosen} is selected. The next step is to continue. Say continue.`);
              continue;
            }
            if (/\.(pdf|doc|docx)\b/i.test(command)) {
              const picked = command.trim();
              rememberFile(picked);
              await say(amharic() ? `${picked} አስቀምጫለሁ። ቀጣዩ ደረጃ መቀጠል ነው። ቀጥል ይበሉ።` : `I saved ${picked}. The next step is to continue. Say continue.`);
              continue;
            }
            if (wantsNext(command) || isYes(command)) {
              if (!shownName()) {
                await say(amharic() ? 'ፋይል የለም። ፋይል ክፈት ይበሉ።' : 'There is no file. Say open file.');
                continue;
              }
              root.querySelector<HTMLButtonElement>('[data-voice="next"]')?.click();
              await readProblem(root);
              return;
            }
            const ready = shownName();
            await say(ready
              ? (amharic() ? `${ready} አለ። ቀጥል ይበሉ። ሌላ ፋይል ከፈለጉ ፋይል ክፈት ይበሉ።` : `${ready} is ready. Say continue. To choose another file, say open file.`)
              : (amharic() ? 'ፋይል ክፈት ይበሉ።' : 'Say open file.'));
          }
          return;
        }
        for (const field of textFields(root)) {
          if (cancelled) return;
          await confirmField(field);
        }
        const continueButton = root.querySelector<HTMLButtonElement>('[data-voice="next"], [data-voice="submit"]');
        if (!continueButton) return;
        const submitting = continueButton.getAttribute('data-voice') === 'submit';
        await say(submitting
          ? (amharic() ? 'ቀጣዩ ደረጃ መላክ ነው። ማመልከቻውን ለመጨረስ ላክ ይበሉ።' : 'The next step is to send it. Say submit to finish the application.')
          : (amharic() ? 'ቀጣዩ ደረጃ ይህን መልስ ማለፍ ነው። ቀጥል ይበሉ።' : 'The next step is to move on. Say continue.'));
        for (let attempt = 0; attempt < 4 && !cancelled; attempt += 1) {
          const command = await hear();
          if (!command) {
            await say(amharic() ? 'አልሰማሁም። እንደገና ይናገሩ።' : 'I did not hear you. Please say it again.');
            continue;
          }
          await say(amharic() ? `ሰማሁ። ${command}` : `I heard ${command}.`);
          if (!wantsCorrection(command) && (wantsNext(command) || wantsApply(command) || includesAny(command, [page().submitApplication]))) {
            if (continueButton.disabled) {
              root.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click();
              if (continueButton.disabled) {
                await say(amharic()
                  ? 'መላክ አይቻልም። መጀመሪያ ለመላክ መስማማት አለብዎት። አዎ ይበሉ።'
                  : 'I cannot submit yet. You need to agree to send this application. Say yes.');
                continue;
              }
            }
            continueButton.click();
            const fix = await readProblem(root);
            if (!fix || cancelled) return;
            if (fix === 'answer') {
              for (const field of textFields(root)) {
                if (cancelled) return;
                await confirmField(field);
              }
            }
            await say(submitting
              ? (amharic() ? 'ላክ ይበሉ።' : 'Say submit.')
              : (amharic() ? 'ቀጥል ይበሉ።' : 'Say continue.'));
            continue;
          }
          await say(submitting
            ? (amharic() ? 'ላክ ይበሉ።' : 'Say submit.')
            : (amharic() ? 'ቀጥል ይበሉ።' : 'Say continue.'));
        }
      }
    };

    const timer = window.setTimeout(() => {
      void run();
    }, 150);
    return () => {
      cancelled = true;
      guideActiveRef.current = false;
      window.clearTimeout(timer);
      stopSpeakingAloud();
    };
  }, [
    enabled,
    languageOpen,
    onChooseLanguage,
    onContinueToSignIn,
    onGetStarted,
    onOpenDashboard,
    pageKey,
    promptKey,
    rate,
  ]);

  useEffect(() => {
    if (!enabled) return;
    let timer = 0;
    const announce = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (guideActiveRef.current) return;
        const message = document.querySelector('[role="alert"]')?.textContent?.replace(/\s+/g, ' ').trim() || '';
        if (!message) {
          lastProblemRef.current = '';
          return;
        }
        if (message === lastProblemRef.current) return;
        lastProblemRef.current = message;
        problemSpeechRef.current = speakAndWait(message, {
          lang: getLanguageOption(languageRef.current).speechLang,
          rate,
          onCaption: captionRef.current,
        });
      }, 200);
    };
    const observer = new MutationObserver(announce);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [enabled, rate]);

  return null;
}
