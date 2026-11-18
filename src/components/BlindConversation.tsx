import { useEffect, useRef, useState } from 'react';
import { GUIDE_SPEECH_RATE, listenFailureMessage, listenOnce, speakAndWait, stopConversationRecognition, stopSpeakingAloud, takeListenFailure } from '../engines/accessibilityEngine';
import { getLanguageOption, getLocalizedCopy } from '../engines/i18n';
import { leyuSpokenAnswer } from '../engines/leyuConversation';
import { listenForStartupLanguage, pageListenLanguage, startupListenRetry } from '../engines/recognitionLanguage';
import { getPageCopy, unsupportedLanguageNotice } from '../engines/pageCopy';
import { acceptHeldConfirmation, accountChoice, applyAccountFields, cleanSpokenName, emptyHeldAccount, firstHeldField, interpretAccount, releaseHeldField, retainAccountFields } from '../engines/accountIntent';
import { accountChoicePrompt, accountFormSpeech, accountSwitchMissed, passwordBoxFilled, requestAccountForm, visibleAccountMode, visibleHeading } from '../engines/accountPage';
import { emailLooksValid, normalizeSpokenEmail } from '../engines/spokenEmail';
import { PreferredLanguage } from '../types/accessbridge';
import {
  headDeclinedMessage,
  headEnabledMessage,
  cameraChoice,
  headPrompt,
  headRetry,
  type InteractionChoice,
  interpretHeadConfirmation,
  interpretInteractionUtterance,
  methodsPrompt,
  methodsRetry,
} from '../engines/startupFlow';
import { executeAction } from '../engines/conversation/ActionRegistry';
import { ConversationEngine } from '../engines/conversation/ConversationEngine';
import { focusNamedField, goToNextQuestion, openHeaderNavigation, readVisiblePage } from '../engines/conversation/pageActions';
import { emailQuestion, nameQuestion, passwordQuestion, passwordReceived } from '../engines/conversation/ResponseGenerator';

interface BlindConversationProps {
  enabled: boolean;
  language: PreferredLanguage;
  rate: number;
  pageKey: string;
  languageOpen: boolean;
  startupStep: 'language' | 'methods' | 'head';
  onCaption: (text: string) => void;
  onGetStarted: () => void;
  onOpenDashboard: () => void;
  onChooseLanguage: (language: PreferredLanguage) => void;
  onLanguageReady: (language: PreferredLanguage) => void;
  onMethodsChosen: (choice: InteractionChoice) => void;
  onSkipInteraction: () => void;
  onConfirmHead: (accepted: boolean) => void;
  interactionSetup: boolean;
  onContinueToSignIn: () => void;
  onAdjustTextSize?: (direction: 'increase' | 'decrease') => boolean;
  onSetLanguage?: (language: PreferredLanguage) => void;
  onOpenFindJobs?: () => boolean;
  onReturnToRegistration?: () => boolean;
  conversationEngine: ConversationEngine;
}

const GET_STARTED = ['get started', 'get start', 'lets start', "let's start", 'start', 'ጀምር', 'ጀምሩ', 'ጀመር', 'ጀምሪ', 'እንጀምር', 'ጀምረን', 'ጀምርልኝ', 'እጀምር', 'ተጀመር', 'jemer', 'jemir', 'jemr', 'gemer', 'gemir', 'jemeru'];
const REGISTER = ['register', 'sign up', 'create account', 'ተመዝገብ', 'ምዝገባ', 'መመዝገብ', 'ልመዝገብ'];
const SIGN_IN = ['sign in', 'login', 'log in', 'ግባ', 'መግቢያ', 'መግባት', 'ልግባ'];
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
      if (field.type !== 'radio' && field.type !== 'checkbox' && field.type !== 'file' && field.type !== 'password' && field.value.trim()) {
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
    if (node.disabled || node.type === 'hidden' || node.type === 'file' || node.type === 'radio' || node.type === 'checkbox' || node.type === 'password') {
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
  startupStep,
  onCaption,
  onGetStarted,
  onOpenDashboard,
  onChooseLanguage,
  onLanguageReady,
  onMethodsChosen,
  onSkipInteraction,
  onConfirmHead,
  interactionSetup,
  onContinueToSignIn,
  onAdjustTextSize,
  onSetLanguage,
  onOpenFindJobs,
  onReturnToRegistration,
  conversationEngine,
}: BlindConversationProps) {
  const [promptKey, setPromptKey] = useState(pageKey);
  const engineRef = useRef(conversationEngine);
  engineRef.current = conversationEngine;
  const adjustTextRef = useRef(onAdjustTextSize);
  const setLanguageRef = useRef(onSetLanguage);
  const openJobsRef = useRef(onOpenFindJobs);
  const returnRef = useRef(onReturnToRegistration);
  const languageReadyRef = useRef(onLanguageReady);
  const methodsChosenRef = useRef(onMethodsChosen);
  const skipInteractionRef = useRef(onSkipInteraction);
  const confirmHeadRef = useRef(onConfirmHead);
  const interactionSetupRef = useRef(interactionSetup);
  adjustTextRef.current = onAdjustTextSize;
  languageReadyRef.current = onLanguageReady;
  methodsChosenRef.current = onMethodsChosen;
  skipInteractionRef.current = onSkipInteraction;
  confirmHeadRef.current = onConfirmHead;
  interactionSetupRef.current = interactionSetup;
  setLanguageRef.current = onSetLanguage;
  openJobsRef.current = onOpenFindJobs;
  returnRef.current = onReturnToRegistration;
  const captionRef = useRef(onCaption);
  const languageRef = useRef(language);
  const pageKeyRef = useRef(pageKey);
  const rateRef = useRef(rate);
  pageKeyRef.current = pageKey;
  rateRef.current = rate;
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
      return speakAndWait(text, { lang: lang || speechLang(), rate: GUIDE_SPEECH_RATE, slow: true, onCaption: captionRef.current });
    };

    const hear = async (lang?: string) => {
      const once = async (code: string) => {
        if (!document.querySelector('[role="alert"]')) {
          captionRef.current(code.startsWith('am') ? 'እያዳመጥኩ ነው…' : 'Listening…');
        }
        const transcript = await listenOnce(code);
        if (cancelled || !transcript) {
          if (!cancelled && !document.querySelector('[role="alert"]')) {
            const note = listenFailureMessage(takeListenFailure(), currentLanguage());
            if (note) captionRef.current(note);
          }
          return '';
        }
        const blocked = unsupportedLanguageNotice(transcript, currentLanguage());
        if (blocked) {
          await say(blocked);
          return '';
        }
        captionRef.current(transcript);
        const natural = await leyuSpokenAnswer(transcript);
        if (!cancelled && natural) await say(natural, 'am-ET');
        return transcript;
      };
      if (lang) return once(lang);
      return once(pageListenLanguage(pageKey, currentLanguage()));
    };

    const engine = engineRef.current;
    engine.setLanguage(currentLanguage());
    const formTaskId = () => {
      if (pageKey === 'apply') return 'application';
      if (engine.hasTask('registration')) return 'registration';
      if (engine.hasTask('sign-in')) return 'sign-in';
      return pageKey === 'login' ? 'account' : 'form';
    };
    const routeUtterance = async (text: string): Promise<{ kind: 'forward'; text: string } | { kind: 'again' } | { kind: 'stop' } | { kind: 'leave' }> => {
      let current = text;
      for (let hop = 0; hop < 6 && !cancelled; hop += 1) {
        const turn = engine.handleUtterance(current);
        if (!turn.consumed) return { kind: 'forward', text: turn.forwardText || current };
        if (turn.intent === 'cancel_task') {
          if (turn.response) await say(turn.response);
          return { kind: 'stop' };
        }
        if (turn.intent === 'resume_task' && pageKey === 'jobs') {
          if (turn.response) await say(turn.response);
          const returned = returnRef.current?.() ?? false;
          if (!returned) {
            await say(amharic() ? 'ወደ ምዝገባው መመለስ አልቻልኩም።' : 'I could not return to registration.');
          }
          return { kind: 'leave' };
        }
        if (turn.action) {
          if (turn.action.id === 'set-language' && turn.action.language) {
            languageRef.current = turn.action.language;
            setLanguageRef.current?.(turn.action.language);
          }
          const result = executeAction(
            {
              openHeaderNavigation: () => openHeaderNavigation(document),
              readCurrentPage: () => readVisiblePage(document.getElementById('main-content')),
              adjustTextSize: (direction) => adjustTextRef.current?.(direction) ?? false,
              focusField: (target) => focusNamedField(document.getElementById('main-content'), target),
              readFormQuestion: () => engine.pendingPrompt(),
              goToNextQuestion: () => goToNextQuestion(document.getElementById('main-content')),
              openFindJobs: () => openJobsRef.current?.() ?? false,
            },
            turn.action,
          );
          const after = engine.reportAction(turn.action, result.ok, result.detail);
          if (after.response) await say(after.response);
          if (!engine.isAwaitingResume()) return { kind: 'again' };
          const follow = await hear();
          if (!follow) return { kind: 'again' };
          current = follow;
          continue;
        }
        if (turn.response) await say(turn.response);
        return { kind: 'again' };
      }
      return { kind: 'again' };
    };

    const confirmField = async (field: HTMLInputElement | HTMLTextAreaElement): Promise<'done' | 'fix-email' | 'stop'> => {
      const label = (field.labels?.[0]?.innerText || field.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
      const emailField = field.type === 'email';
      const ask = amharic()
        ? `${label}። አሁን ይናገሩ። ትክክል ካልሆነ ትክክል አይደለም ይበሉ።`
        : `${label}. I am listening. If it is wrong, say it is not correct.`;
      const heardLead = amharic() ? 'ይህን ሰማሁ።' : 'I heard';
      const check = amharic() ? 'ትክክል ከሆነ አዎ ይበሉ። ካልሆነ ትክክል አይደለም ይበሉ።' : 'Say yes if that is right. If not, say it is not correct.';
      const prepare = (value: string) => (emailField ? normalizeSpokenEmail(value) : value.trim());
      const repeatHeard = async (raw: string, next: string) => {
        if (field instanceof HTMLInputElement && field.type === 'password') {
          await say(`${passwordReceived(currentLanguage())} ${check}`);
          return;
        }
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
      const taskId = formTaskId();
      const questionId = emailField
        ? 'email'
        : field instanceof HTMLInputElement && field.type === 'password'
          ? 'password'
          : 'answer';
      const acceptField = () => {
        if (!field.value.trim()) return;
        if (emailField && !emailLooksValid(field.value)) return;
        const stored = questionId === 'password' ? '' : field.value;
        engine.completeQuestion(taskId, questionId, stored);
      };
      if (engine.taskStatus(taskId) === 'cancelled') return 'stop';
      engine.ensureTask(taskId, taskId);
      if (engine.isCompleted(taskId, questionId) && field.value.trim()) return 'done';
      if (engine.taskStatus(taskId) === 'active') {
        engine.ask(taskId, {
          id: questionId,
          prompt: emailField ? emailQuestion(currentLanguage()) : ask,
          field: emailField ? 'email' : 'text',
        });
      }
      let attempt = 0;
      let skipAsk = false;
      while (attempt < 8 && !cancelled) {
        attempt += 1;
        if (engine.taskStatus(taskId) === 'cancelled') return 'stop';
        field.focus();
        if (!skipAsk) await say(ask);
        skipAsk = false;
        let raw = await hear();
        if (cancelled) return 'done';
        if (!raw) {
          await say(amharic() ? 'ይቅርታ፣ አልሰማሁም። እንደገና ቢናገሩልኝ እቀበላለሁ።' : 'I did not hear you. Please say it again.');
          continue;
        }
        const routed = await routeUtterance(raw);
        if (routed.kind === 'stop') return 'stop';
        if (routed.kind === 'leave') return 'done';
        if (routed.kind === 'again') {
          skipAsk = engine.takeRepeatedPrompt();
          continue;
        }
        raw = routed.text;
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
        const rawAnswerHeard = await hear();
        if (cancelled) return 'done';
        if (!rawAnswerHeard) continue;
        const routedAnswer = await routeUtterance(rawAnswerHeard);
        if (routedAnswer.kind === 'stop') return 'stop';
        if (routedAnswer.kind === 'leave') return 'done';
        if (routedAnswer.kind === 'again') {
          skipAsk = engine.takeRepeatedPrompt();
          continue;
        }
        const rawAnswer = routedAnswer.text;
        if (!emailField && wantsCorrection(rawAnswer) && (rawAnswer.includes('ኢሜይል') || rawAnswer.includes('ኢሜል') || rawAnswer.toLowerCase().includes('email'))) {
          return 'fix-email';
        }
        if (wantsCorrection(rawAnswer)) {
          const cleared = await acceptCorrection(rawAnswer);
          if (cleared) continue;
        }
        if (wantsNext(rawAnswer)) {
          if (emailField && !emailLooksValid(field.value)) continue;
          acceptField();
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
        const secondHeard = await hear();
        if (!secondHeard) continue;
        const routedSecond = await routeUtterance(secondHeard);
        if (routedSecond.kind === 'stop') return 'stop';
        if (routedSecond.kind === 'leave') return 'done';
        if (routedSecond.kind === 'again') {
          skipAsk = engine.takeRepeatedPrompt();
          continue;
        }
        const second = routedSecond.text;
        if (wantsCorrection(second)) {
          await acceptCorrection(second);
          continue;
        }
        if (wantsNext(second)) {
          acceptField();
          return 'done';
        }
      }
      if (!(emailField && !emailLooksValid(field.value)) && field.value.trim()) acceptField();
      return emailField && !emailLooksValid(field.value) ? 'fix-email' : 'done';
    };

    const readProblem = async (root: HTMLElement) => {
      const started = Date.now();
      let message = '';
      let fix = '';
      while (!cancelled && Date.now() - started < 4000) {
        const alert = root.querySelector('[role="alert"]');
        message = alert?.textContent?.replace(/\s+/g, ' ').trim() || '';
        fix = alert?.getAttribute('data-voice-fix') || '';
        if (message) break;
        if (pageKeyRef.current !== pageKey) return '';
        await wait(200);
      }
      if (!message) return '';
      if (message !== lastProblemRef.current) {
        lastProblemRef.current = message;
        await say(message);
      } else {
        await problemSpeechRef.current;
      }
      return fix || 'again';
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
        const result = await confirmField(field);
        if (result === 'stop') return;
      }
    };

    const run = async () => {
      const root = document.getElementById('main-content');
      if (!root || cancelled) return;

      if (languageOpen && startupStep === 'language') {
        await say('Say English, or say Amharic.', 'en-US');
        if (cancelled) return;
        await say('እንግሊዝኛ መጠቀም ከፈለጉ እንግሊዝኛ ይበሉ። አማርኛ ከፈለጉ አማርኛ ይበሉ።', 'am-ET');
        for (let attempt = 0; attempt < 4 && !cancelled; attempt += 1) {
          const choice = await listenForStartupLanguage((lang) => {
            captionRef.current(lang === 'am' ? 'እያዳመጥኩ ነው…' : 'Listening…');
          });
          if (cancelled) return;
          if (!choice) {
            await say(startupListenRetry(takeListenFailure(), currentLanguage()));
            continue;
          }
          languageRef.current = choice;
          if (interactionSetupRef.current) languageReadyRef.current(choice);
          else onChooseLanguage(choice);
          return;
        }
        return;
      }

      if (languageOpen && startupStep === 'methods') {
        await say(methodsPrompt(currentLanguage()));
        for (let attempt = 0; attempt < 4 && !cancelled; attempt += 1) {
          const heard = await hear(speechLang());
          const parsed = interpretInteractionUtterance(heard);
          if (!parsed) {
            await say(methodsRetry(currentLanguage()));
            continue;
          }
          if (parsed.skip) {
            skipInteractionRef.current();
            return;
          }
          methodsChosenRef.current(parsed.choice);
          return;
        }
        return;
      }

      if (languageOpen && startupStep === 'head') {
        const camera = cameraChoice();
        await say(headPrompt(currentLanguage(), camera));
        for (let attempt = 0; attempt < 4 && !cancelled; attempt += 1) {
          const heard = await hear(speechLang());
          const answer = interpretHeadConfirmation(heard);
          if (!answer) {
            await say(headRetry(currentLanguage()));
            continue;
          }
          await say(answer === 'yes' ? headEnabledMessage(currentLanguage(), camera) : headDeclinedMessage(currentLanguage(), camera));
          confirmHeadRef.current(answer === 'yes');
          return;
        }
        return;
      }

      if (pageKey === 'landing') {
        const landingText = visibleHeading(root);
        await say(landingText || (amharic()
          ? 'ከኢትዮጵያ እስከ ዓለም ሥራ ይፈልጉ። ለመጀመር ጀምር ብለው ቢነግሩኝ እንጀምራለን።'
          : 'Find work from Ethiopia to the world. Say get started.'));
        if (cancelled) return;
        for (let attempt = 0; attempt < 4 && !cancelled; attempt += 1) {
          const command = await hear();
          if (wantsStart(command)) {
            onGetStarted();
            return;
          }
          await say(amharic() ? 'ለመጀመር ጀምር ይበሉ።' : 'Say get started.');
          if (cancelled) return;
        }
        return;
      }

      if (pageKey === 'dashboard') {
        const title = visibleHeading(root) || page().dashboardHeadline;
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
        const waitingId = (['registration', 'sign-in'] as const).find((id) => {
          const status = engine.taskStatus(id);
          return (status === 'paused' || status === 'active') && Boolean(engine.pendingQuestion());
        });
        const shownMode = () => visibleAccountMode(root);
        let register = shownMode() === 'register' || waitingId === 'registration';
        let carry = '';
        let skipFieldPrompt = false;
        let clicked: 'login' | 'register' | '' = '';
        let accountTask = register ? 'registration' : 'sign-in';
        const onAccountChoice = (event: Event) => {
          const detail = (event as CustomEvent<string>).detail;
          if (detail !== 'login' && detail !== 'register') return;
          clicked = detail;
          stopConversationRecognition();
        };
        window.addEventListener('allways-account-choice', onAccountChoice);
        const speakOpenedForm = async (which: 'login' | 'register') => {
          requestAccountForm(which);
          const started = Date.now();
          while (!cancelled && shownMode() !== which && Date.now() - started < 1200) {
            await wait(50);
          }
          const visible = shownMode();
          register = visible === 'register';
          accountTask = register ? 'registration' : 'sign-in';
          if (visible !== which) {
            await say(accountSwitchMissed(currentLanguage()));
            return;
          }
          engine.ensureTask(accountTask, accountTask);
          await say(accountFormSpeech(visible, currentLanguage()));
          skipFieldPrompt = true;
        };
        const chooseAccount = async () => {
          await say(accountChoicePrompt(currentLanguage()));
          while (!cancelled && !shownMode()) {
            if (clicked) {
              const which = clicked;
              clicked = '';
              await speakOpenedForm(which);
              return;
            }
            const choice = carry || await hear();
            carry = '';
            if (cancelled) return;
            if (clicked) continue;
            if (!choice) {
              await say(accountChoicePrompt(currentLanguage()));
              continue;
            }
            const which = accountChoice(choice);
            if (which) {
              clicked = '';
              const intent = interpretAccount(choice, phrases);
              if (intent.name || intent.email) carry = choice;
              await speakOpenedForm(which);
              return;
            }
            await say(accountChoicePrompt(currentLanguage()));
          }
        };
        try {
        const already = shownMode();
        if (already) {
          register = already === 'register';
          accountTask = register ? 'registration' : 'sign-in';
          engine.ensureTask(accountTask, accountTask);
          await say(accountFormSpeech(already, currentLanguage()));
          skipFieldPrompt = true;
        } else {
          await chooseAccount();
          if (cancelled || !shownMode()) return;
        }
        const formRoot = document.getElementById('main-content');
        if (!formRoot || cancelled) return;
        const emailInput = () => formRoot.querySelector<HTMLInputElement>('input[type="email"]');
        const nameInput = () => formRoot.querySelector<HTMLInputElement>('input[autocomplete="name"]');
        const passwordInputs = () => [...formRoot.querySelectorAll<HTMLInputElement>('input[type="password"]')];
        let lastTopic: 'email' | 'password' | 'name' | '' = '';
        let held = emptyHeldAccount();
        let confirming: 'email' | 'password' | 'name' | '' = '';
        const confirmLine = (kind: 'email' | 'password' | 'name', value: string) => {
          if (kind === 'password') return passwordBoxFilled(currentLanguage());
          const spoken = kind === 'email' ? speakableEmail(value, amharic()) : value;
          return amharic() ? `${spoken}። ትክክል ነው?` : `${spoken}. Is that right?`;
        };
        const saveConfirming = () => {
          if (!confirming || !held[confirming]) return;
          const kind = confirming;
          const value = held[kind];
          if (kind === 'email') {
            const email = emailInput();
            if (email) setFieldValue(email, value);
          } else if (kind === 'password') {
            const fields = passwordInputs();
            if (fields[0]) setFieldValue(fields[0], value);
          } else {
            const name = nameInput();
            if (name) setFieldValue(name, value);
          }
          lastTopic = kind;
          engine.completeQuestion(accountTask, kind, kind === 'password' ? '' : value);
          held = acceptHeldConfirmation(held, kind);
          confirming = '';
        };
        const confirmNextHeld = async () => {
          const kind = firstHeldField(held);
          confirming = kind;
          if (!kind) return false;
          await say(confirmLine(kind, held[kind]));
          return true;
        };
        const nextNeed = () => {
          const email = emailInput();
          const passwords = passwordInputs();
          const name = nameInput();
          const emailReady = Boolean(email && emailLooksValid(email.value));
          const passwordReady = Boolean(passwords[0]?.value.trim());
          const nameReady = !register || !name || Boolean(name.value.trim());
          if (register && !nameReady) return amharic() ? 'ሙሉ ስምዎን ይንገሩኝ።' : 'Tell me your full name.';
          if (!emailReady) return amharic() ? 'ኢሜይልዎን ይንገሩኝ።' : 'Tell me your email.';
          if (!passwordReady) return passwordQuestion(currentLanguage());
          if (passwords[1] && !passwords[1].value.trim()) return amharic() ? 'ተመሳሳይ የይለፍ ቃልን በማረጋገጫው ሳጥን ይጻፉ።' : 'Type the same password in Confirm password.';
          return register
            ? (amharic() ? 'ዝግጁ ነው። መመዝገብ እፈልጋለሁ ይበሉ።' : 'Ready. Say I want to register.')
            : (amharic() ? 'ዝግጁ ነው። መግባት እፈልጋለሁ ይበሉ።' : 'Ready. Say I want to log in.');
        };
        engine.ensureTask(accountTask, accountTask);
        const syncAccountQuestion = () => {
          if (engine.taskStatus(accountTask) !== 'active') return;
          const email = emailInput();
          const passwords = passwordInputs();
          const name = nameInput();
          if (register && name && !name.value.trim()) {
            const savedName = engine.savedAnswer(accountTask, 'name');
            if (savedName) setFieldValue(name, savedName);
          }
          if (email && !email.value.trim()) {
            const savedEmail = engine.savedAnswer(accountTask, 'email');
            if (savedEmail) setFieldValue(email, savedEmail);
          }
          if (register && name && !name.value.trim()) {
            engine.ask(accountTask, { id: 'name', prompt: nameQuestion(currentLanguage()), field: 'name' });
            return;
          }
          if (!email || !emailLooksValid(email.value)) {
            engine.ask(accountTask, { id: 'email', prompt: emailQuestion(currentLanguage()), field: 'email' });
            return;
          }
          if (!engine.isCompleted(accountTask, 'email')) engine.completeQuestion(accountTask, 'email', email.value);
          if (!passwords[0]?.value.trim()) {
            engine.ask(accountTask, { id: 'password', prompt: passwordQuestion(currentLanguage()), field: 'password' });
            return;
          }
          if (!engine.isCompleted(accountTask, 'password')) engine.completeQuestion(accountTask, 'password', '');
          if (register && name?.value.trim() && !engine.isCompleted(accountTask, 'name')) {
            engine.completeQuestion(accountTask, 'name', name.value);
          }
        };
        while (!cancelled) {
          const visibleNow = shownMode();
          if (!visibleNow) {
            await chooseAccount();
            if (cancelled || !shownMode()) return;
            continue;
          }
          register = visibleNow === 'register';
          accountTask = register ? 'registration' : 'sign-in';
          if (clicked) {
            const which = clicked;
            clicked = '';
            await speakOpenedForm(which);
            continue;
          }
          if (engine.taskStatus(accountTask) === 'cancelled') {
            const heardRestart = carry || await hear();
            carry = '';
            if (!heardRestart) {
              await say(amharic()
                ? 'ምዝገባው ተሰርዟል። መልሶችዎ በቅጹ ላይ አሉ። እንደገና ለመጀመር ምዝገባውን እንደገና ጀምር ይበሉ።'
                : 'Registration is cancelled. Your answers are still in the form. Say restart registration to begin again.');
              continue;
            }
            await routeUtterance(heardRestart);
            if (engine.taskStatus(accountTask) === 'cancelled') {
              await say(amharic()
                ? 'ምዝገባው ተሰርዟል። መልሶችዎ በቅጹ ላይ አሉ። እንደገና ለመጀመር ምዝገባውን እንደገና ጀምር ይበሉ።'
                : 'Registration is cancelled. Your answers are still in the form. Say restart registration to begin again.');
            }
            continue;
          }
          syncAccountQuestion();
          const repeated = engine.takeRepeatedPrompt();
          let heardRaw = carry;
          carry = '';
          if (!heardRaw) {
            const holdPrompt = skipFieldPrompt;
            skipFieldPrompt = false;
            const askName = !holdPrompt && !confirming && register && !nameInput()?.value.trim();
            const askEmail = !holdPrompt
              && !confirming
              && !askName
              && !repeated
              && engine.taskStatus(accountTask) === 'active'
              && engine.pendingQuestion()?.id === 'email'
              && !emailLooksValid(emailInput()?.value || '');
            const problem = formRoot.querySelector('[role="alert"]')?.textContent?.replace(/\s+/g, ' ').trim() || '';
            if (problem) {
              if (problem !== lastProblemRef.current) {
                lastProblemRef.current = problem;
                await say(problem);
              }
            } else if (askName) await say(amharic() ? 'ሙሉ ስምዎን ይናገሩ።' : 'Tell me your full name.');
            else if (askEmail) await say(emailQuestion(currentLanguage()));
            heardRaw = await hear();
          }
          if (cancelled) return;
          if (!heardRaw) {
            if (clicked || !shownMode()) continue;
            const problem = formRoot.querySelector('[role="alert"]')?.textContent?.replace(/\s+/g, ' ').trim() || '';
            if (problem) {
              if (problem !== lastProblemRef.current) {
                lastProblemRef.current = problem;
                await say(problem);
              }
              continue;
            }
            await say(amharic() ? 'እየሰማሁ ነው።' : 'I am listening.');
            continue;
          }
          const routed = await routeUtterance(heardRaw);
          if (routed.kind === 'leave') return;
          if (routed.kind === 'stop') continue;
          if (routed.kind !== 'forward') continue;
          const heard = routed.text;
          const spokenChoice = accountChoice(heard);
          const visibleMode = shownMode();
          if (spokenChoice && spokenChoice !== visibleMode) {
            clicked = '';
            const switching = interpretAccount(heard, phrases);
            if (switching.name || switching.email) carry = heard;
            await speakOpenedForm(spokenChoice);
            continue;
          }
          const intent = interpretAccount(heard, phrases);
          if (register && nameInput() && !nameInput()?.value.trim() && !intent.name && !intent.email && !intent.password) {
            const spokenName = cleanSpokenName(heard);
            if (spokenName) intent.name = spokenName;
          }
          let passwordNoted = false;
          if (intent.password) {
            const fields = passwordInputs();
            if (fields[0]) setFieldValue(fields[0], intent.password);
            intent.password = '';
            passwordNoted = true;
          }
          if (intent.emailUnclear) {
            held = releaseHeldField(retainAccountFields(held, { ...intent, email: '' }), 'email');
            if (confirming === 'email') confirming = '';
            await say(amharic()
              ? 'ያንን ኢሜይል ማረጋገጥ አልቻልኩም። እባክዎ እንደገና ይናገሩ።'
              : 'I could not confirm that email. Please say it again.');
            if (await confirmNextHeld()) continue;
            continue;
          }
          if (intent.correction && !intent.clearEmail && !intent.clearPassword && !intent.clearName && !intent.email && !intent.password && !intent.name) {
            if (confirming) {
              held = releaseHeldField(held, confirming);
              confirming = '';
              await say(amharic() ? 'እሺ። ትክክል አይደለም። አጽድቻለሁ። እንደገና ይናገሩ።' : 'Okay. That is not correct. I cleared it. Say it again.');
              if (await confirmNextHeld()) continue;
              continue;
            }
            const topic = lastTopic as string;
            if (topic === 'password') intent.clearPassword = true;
            else if (topic === 'name') intent.clearName = true;
            else intent.clearEmail = true;
          }
          const notes: string[] = [];
          if (passwordNoted) notes.push(passwordBoxFilled(currentLanguage()));
          const confirmingField = confirming === 'name' || confirming === 'email' ? confirming : '';
          const beforeFields = { name: nameInput()?.value || '', email: emailInput()?.value || '' };
          const cleared = applyAccountFields(beforeFields, { ...intent, name: '', email: '' }, confirmingField);
          if (intent.clearEmail || cleared.email !== beforeFields.email) {
            const email = emailInput();
            if (email) setFieldValue(email, cleared.email);
            held = releaseHeldField(held, 'email');
            if (confirming === 'email') confirming = '';
            notes.push(amharic() ? 'እሺ። ኢሜይሉ ትክክል አይደለም። አጽድቻለሁ።' : 'Okay. That email is not correct. I cleared it.');
          }
          if (intent.clearPassword) {
            passwordInputs().forEach((field) => setFieldValue(field, ''));
            held = releaseHeldField(held, 'password');
            if (confirming === 'password') confirming = '';
            notes.push(amharic() ? 'እሺ። የይለፍ ቃሉን አጽድቻለሁ።' : 'Okay. I cleared the password.');
          }
          if (intent.clearName || cleared.name !== beforeFields.name) {
            const name = nameInput();
            if (name) setFieldValue(name, cleared.name);
            held = releaseHeldField(held, 'name');
            if (confirming === 'name') confirming = '';
            notes.push(amharic() ? 'እሺ። ስሙን አጽድቻለሁ።' : 'Okay. I cleared the name.');
          }
          if (intent.email || intent.password || intent.name) {
            if (notes.length) await say(notes.join(' '));
            held = retainAccountFields(held, intent);
            if (await confirmNextHeld()) continue;
          }
          if (confirming && intent.yes && !intent.email && !intent.password && !intent.name) {
            saveConfirming();
            if (await confirmNextHeld()) continue;
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
            if (confirming && held[confirming]) {
              await say(confirmLine(confirming, held[confirming]));
              continue;
            }
            await say(notes.length ? `${notes.join(' ')} ${nextNeed()}` : nextNeed());
            continue;
          }
          const confirmReady = !passwords[1] || Boolean(passwords[1].value.trim());
          const ready = emailReady && passwordReady && nameReady && confirmReady && !confirming && !firstHeldField(held);
          if ((intent.signIn || intent.register || (intent.yes && ready)) && ready) {
            if (notes.length) await say(notes.join(' '));
            formRoot.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
            const fix = await readProblem(formRoot);
            if (cancelled || pageKeyRef.current !== 'login') return;
            if (!fix) {
              await say(nextNeed());
              continue;
            }
            if (fix === 'email' && email) setFieldValue(email, '');
            if (fix === 'password' || fix === 'confirm') passwords.forEach((field) => setFieldValue(field, ''));
            await say(amharic() ? 'እንደገና ይናገሩ።' : 'Please say it again.');
            continue;
          }
          if (notes.length) {
            const waiting = firstHeldField(held);
            if (waiting) {
              confirming = waiting;
              notes.push(confirmLine(waiting, held[waiting]));
            } else notes.push(nextNeed());
          }
          await say(notes.length ? notes.join(' ') : nextNeed());
        }
        } finally {
          window.removeEventListener('allways-account-choice', onAccountChoice);
        }
        return;
      }

      if (pageKey === 'jobs') {
        const accountPaused = engine.taskStatus('registration') === 'paused' || engine.taskStatus('sign-in') === 'paused';
        let leaving = false;
        const hearJob = async () => {
          const heard = await hear();
          if (!heard || leaving) return '';
          if (!accountPaused) return heard;
          const routed = await routeUtterance(heard);
          if (routed.kind === 'leave') {
            leaving = true;
            return '';
          }
          if (routed.kind !== 'forward') return '';
          return routed.text;
        };
        if (accountPaused && !cancelled) {
          const prompt = engine.pendingPrompt();
          await say(prompt
            ? (amharic()
              ? `ስራ ፈልግ ተከፍቷል። ${prompt} ለመመለስ ወደ ኢሜይሉ ተመለስ ይበሉ።`
              : `Find Jobs is open. ${prompt} Say go back to my email question when you want to continue.`)
            : (amharic() ? 'ስራ ፈልግ ተከፍቷል።' : 'Find Jobs is open.'));
        }
        const jobButtons = () => [...root.querySelectorAll<HTMLButtonElement>('[data-voice-apply]')];
        const openApplication = async (button?: HTMLButtonElement | null) => {
          if (!button) return;
          button.click();
          await wait(300);
          for (let step = 0; step < 6 && !cancelled && !leaving; step += 1) {
            const box = root.querySelector<HTMLElement>('[data-career-apply]');
            if (!box) return;
            if (box.getAttribute('data-career-apply') === 'done') {
              const saved = box.querySelector('h2')?.textContent?.replace(/\s+/g, ' ').trim() || '';
              if (saved) await say(saved);
              return;
            }
            const question = box.querySelector('h2')?.textContent?.replace(/\s+/g, ' ').trim() || '';
            const help = box.querySelector('[data-career-help]')?.textContent?.replace(/\s+/g, ' ').trim() || '';
            await say(`${question}. ${help}`);
            const field = box.querySelector<HTMLInputElement | HTMLTextAreaElement>('input:not([type="checkbox"]), textarea');
            if (field) {
              const answer = await hearJob();
              if (cancelled || leaving) return;
              if (!answer) {
                await say(amharic() ? 'አልሰማሁም። እንደገና ይናገሩ።' : 'I did not hear you. Please say your answer.');
                step -= 1;
                continue;
              }
              setFieldValue(field, answer);
              await say(amharic() ? `ሰማሁ። ${answer}` : `I heard ${answer}.`);
            }
            const action = box.querySelector<HTMLButtonElement>('[data-voice="next"], [data-voice="submit"]');
            action?.click();
            await wait(300);
          }
        };
        if (jobButtons().length > 0) {
          const searchInput = root.querySelector<HTMLInputElement>('#opportunity-search');
          const totalJobs = jobButtons().length;
          const ignore = ['the', 'a', 'an', 'job', 'jobs', 'work', 'want', 'i', 'my', 'please', 'ሥራ', 'ስራ', 'እፈልጋለሁ', 'እፈልጋለው', 'ፈልጌ', 'ነው', 'አንድ'];
          const jobsHeading = visibleHeading(root);
          await say(amharic()
            ? `${jobsHeading ? `${jobsHeading}. ` : ''}ምን ዓይነት ሥራ ይፈልጋሉ? የሥራውን ስም በነፃነት ይንገሩኝ።`
            : `${jobsHeading ? `${jobsHeading}. ` : ''}What job do you want? Say the kind of work.`);
          let narrowed = false;
          for (let attempt = 0; attempt < 4 && !cancelled && !narrowed; attempt += 1) {
            const request = await hearJob();
            if (cancelled || leaving) return;
            if (!request) {
              await say(amharic() ? 'አልሰማሁም። የሚፈልጉትን ሥራ ይናገሩ።' : 'I did not hear you. Say the job you want.');
              continue;
            }
            if (wantsApply(request)) {
              await say(amharic() ? 'እሺ። ወደ ማመልከቻው እሄዳለሁ።' : 'Okay. I am opening the application.');
              await openApplication(jobButtons()[0]);
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
            const command = await hearJob();
            if (cancelled || leaving) return;
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
              await openApplication(named);
              return;
            }
            if (wantsApply(command) || isYes(command)) {
              await say(amharic() ? 'እሺ። ወደ ማመልከቻው እሄዳለሁ። ቀጣዩ ደረጃ ማመልከቻው ነው።' : 'Okay. I am opening the application. The next step is the application.');
              await openApplication(named || jobButtons()[0]);
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
          const command = await hearJob();
          if (cancelled || leaving) return;
          if (!command) {
            await say(amharic() ? 'አልሰማሁም። አመልክት ይበሉ።' : 'I did not hear you. Say apply.');
            continue;
          }
          await say(amharic() ? `ሰማሁ። ${command}` : `I heard ${command}.`);
          if (wantsApply(command) || isYes(command)) {
            await say(amharic() ? 'እሺ። ወደ ማመልከቻው እሄዳለሁ።' : 'Okay. I am opening the application.');
            await openApplication(root.querySelector<HTMLButtonElement>('[data-voice-apply]'));
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
            const commandHeard = await hear();
            if (cancelled) return;
            if (!commandHeard) {
              await say(amharic() ? 'አልሰማሁም። ቀጥል ይበሉ። ወይም ፋይል ክፈት ይበሉ።' : 'I did not hear you. Say continue. Or say open file.');
              continue;
            }
            const routed = await routeUtterance(commandHeard);
            if (routed.kind === 'stop') return;
            if (routed.kind !== 'forward') continue;
            const command = routed.text;
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
          const filled = await confirmField(field);
          if (filled === 'stop') return;
        }
        const continueButton = root.querySelector<HTMLButtonElement>('[data-voice="next"], [data-voice="submit"]');
        if (!continueButton) return;
        const submitting = continueButton.getAttribute('data-voice') === 'submit';
        await say(submitting
          ? (amharic() ? 'ቀጣዩ ደረጃ መላክ ነው። ማመልከቻውን ለመጨረስ ላክ ይበሉ።' : 'The next step is to send it. Say submit to finish the application.')
          : (amharic() ? 'ቀጣዩ ደረጃ ይህን መልስ ማለፍ ነው። ቀጥል ይበሉ።' : 'The next step is to move on. Say continue.'));
        for (let attempt = 0; attempt < 4 && !cancelled; attempt += 1) {
          const commandHeard = await hear();
          if (!commandHeard) {
            await say(amharic() ? 'ይቅርታ፣ አልሰማሁም። እንደገና ቢናገሩልኝ እቀበላለሁ።' : 'I did not hear you. Please say it again.');
            continue;
          }
          const routed = await routeUtterance(commandHeard);
          if (routed.kind === 'stop') return;
          if (routed.kind !== 'forward') continue;
          const command = routed.text;
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
                const filled = await confirmField(field);
                if (filled === 'stop') return;
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
      stopConversationRecognition();
      stopSpeakingAloud();
    };
  }, [
    enabled,
    languageOpen,
    onChooseLanguage,
    onContinueToSignIn,
    startupStep,
    onGetStarted,
    onOpenDashboard,
    pageKey,
    promptKey,
    rate,
  ]);

  const resumeConversation = () => {
    const engine = engineRef.current;
    if (!engine.isAwaitingResume()) return;
    const turn = engine.handleUtterance('continue');
    if (turn.intent !== 'resume_task') return;
    const sayResume = (text: string) => {
      captionRef.current(text);
      void speakAndWait(text, {
        lang: getLanguageOption(languageRef.current).speechLang,
        rate: GUIDE_SPEECH_RATE,
        slow: true,
        onCaption: captionRef.current,
      });
    };
    if (turn.response) sayResume(turn.response);
    if (pageKeyRef.current === 'jobs') {
      const returned = returnRef.current?.() ?? false;
      if (!returned) {
        sayResume(languageRef.current === 'am' ? 'ወደ ምዝገባው መመለስ አልቻልኩም።' : 'I could not return to registration.');
      }
    }
  };

  useEffect(() => {
    if (!enabled) return;
    let timer = 0;
    const announce = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const message = document.querySelector('[role="alert"]')?.textContent?.replace(/\s+/g, ' ').trim() || '';
        if (!message) {
          lastProblemRef.current = '';
          return;
        }
        if (message === lastProblemRef.current) return;
        lastProblemRef.current = message;
        stopSpeakingAloud();
        problemSpeechRef.current = speakAndWait(message, {
          lang: getLanguageOption(languageRef.current).speechLang,
          rate: GUIDE_SPEECH_RATE,
          slow: true,
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

  if (!conversationEngine.isAwaitingResume()) return null;

  return (
    <button
      type="button"
      data-voice="resume"
      onClick={resumeConversation}
      className="fixed bottom-4 right-4 z-30 rounded-xl bg-[#0e2a4a] px-4 py-3 text-sm font-bold text-white shadow-lg"
    >
      {language === 'am' ? 'ተመለስ' : 'Resume'}
    </button>
  );
}
