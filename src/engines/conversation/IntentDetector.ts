import { LANGUAGE_PHRASES } from './LanguageManager';
import { ActionRequest, ConversationLanguage, DetectedIntent, IntentName } from './types';

interface PhraseRule {
  intent: IntentName;
  phrases: string[];
  action?: () => ActionRequest;
}

const EXPLICIT: PhraseRule[] = [
  {
    intent: 'cancel_task',
    phrases: ['cancel registration', 'cancel the registration', 'cancel this task', 'cancel this', 'cancel that', 'cancel', 'ምዝገባውን ሰርዝ', 'ምዝገባ ሰርዝ', 'ሰርዝ'],
  },
  {
    intent: 'restart_task',
    phrases: ['restart registration', 'start registration again', 'register again', 'start registration', 'ምዝገባውን እንደገና ጀምር', 'እንደገና ተመዝገብ'],
  },
  {
    intent: 'find_jobs',
    phrases: ['find jobs', 'find job', 'open find jobs', 'go to find jobs', 'show me jobs', 'take me to jobs', 'ስራ ፈልግ', 'ሥራ ፈልግ', 'ስራዎችን አሳይ'],
    action: () => ({ id: 'find-jobs' }),
  },
  {
    intent: 'resume_task',
    phrases: [
      'go back to my email question',
      'go back to the email question',
      'go back to my email',
      'return to my email question',
      'return to my email',
      'return to registration',
      'go back',
      'come back',
      'ተመለስ',
      'ወደ ኢሜይሉ ተመለስ',
      'ቀጥልበት',
    ],
  },
  {
    intent: 'open_navigation',
    phrases: [
      'open the header navigation',
      'open header navigation',
      'open the navigation',
      'open navigation',
      'open the menu',
      'show the menu',
      'የራስጌ ዳሰሳ ክፈት',
      'ዳሰሳውን ክፈት',
      'ዳሰሳ ክፈት',
      'ሜኑ ክፈት',
    ],
    action: () => ({ id: 'open-navigation' }),
  },
  {
    intent: 'read_question',
    phrases: ['read the question', 'repeat the question', 'say the question', 'ጥያቄውን ድገም', 'ጥያቄውን አንብብ'],
    action: () => ({ id: 'read-question' }),
  },
  {
    intent: 'read_page',
    phrases: ['read this page', 'read the page', 'read the current page', 'ገጹን አንብብ', 'ይህን ገጽ አንብብ'],
    action: () => ({ id: 'read-page' }),
  },
  {
    intent: 'increase_text',
    phrases: ['increase the text size', 'increase the text', 'increase text', 'bigger text', 'larger text', 'ጽሑፉን አበልጥ', 'ጽሑፍ አትልቅ', 'ፊደል አትልቅ'],
    action: () => ({ id: 'increase-text' }),
  },
  {
    intent: 'decrease_text',
    phrases: ['decrease the text size', 'decrease the text', 'decrease text', 'smaller text', 'ጽሑፉን አሳንስ', 'ጽሑፍ አሳንስ', 'ፊደል አሳንስ'],
    action: () => ({ id: 'decrease-text' }),
  },
  {
    intent: 'focus_input',
    phrases: ['focus the input', 'focus the field', 'go to the input', 'go to the field', 'ግቤቱን አተኩር', 'መስኩ ላይ ሂድ'],
    action: () => ({ id: 'focus-input' }),
  },
  {
    intent: 'next_question',
    phrases: ['next question', 'following question', 'ቀጣዩ ጥያቄ', 'ወደ ቀጣይ ጥያቄ'],
    action: () => ({ id: 'next-question' }),
  },
  {
    intent: 'change_subject',
    phrases: ['change the subject', 'change subject', 'something else', 'different subject', 'new subject', 'ርዕስ ቀይር', 'ሌላ ነገር', 'ሌላ ርዕስ'],
  },
  {
    intent: 'clarify',
    phrases: ['what do you mean', 'i do not understand', "i don't understand", 'can you help', 'help me', 'ምን ማለት ነው', 'አልገባኝም', 'እርዳታ'],
  },
];

const REQUEST = /^(please|can you|could you|would you|what|how|why|where|who)\b/i;
const AMHARIC_REQUEST = /^(እባክ|ምን |እንዴት)/;

export function commandText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[።.!?]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(please|እባክህ|እባክሽ)\s+/, '')
    .replace(/\s+(please|እባክህ|እባክሽ)$/, '');
}

function explicitRule(spoken: string): PhraseRule | null {
  return EXPLICIT.find((rule) => rule.phrases.some((phrase) => spoken === phrase.toLowerCase())) ?? null;
}

function mentionsCommand(spoken: string): boolean {
  return (
    /\bcancel\b/i.test(spoken) ||
    spoken.includes('ሰርዝ') ||
    /\bfind jobs\b/i.test(spoken) ||
    spoken.includes('ስራ ፈልግ') ||
    spoken.includes('ሥራ ፈልግ') ||
    /\bgo back\b/i.test(spoken) ||
    /\breturn to\b/i.test(spoken) ||
    spoken.includes('header navigation') ||
    spoken.includes('open navigation')
  );
}

function isNegated(spoken: string): boolean {
  return /\b(don't|dont|do not|never|not|no)\b/i.test(spoken) || spoken.includes('አልፈልግም') || spoken.includes('አይደለም');
}

function isInformational(spoken: string): boolean {
  return /\b(how to|how do i|how can i|want to know|what is|tell me how|tell me about)\b/i.test(spoken);
}

export function looksLikeRequest(text: string): boolean {
  const clean = text.trim();
  if (!clean) return false;
  return REQUEST.test(clean) || AMHARIC_REQUEST.test(clean) || clean.endsWith('?');
}

export function containsAnswer(text: string): boolean {
  const lower = text.toLowerCase();
  if (text.includes('@') || lower.includes('email') || text.includes('ኢሜይል') || text.includes('ኢሜል')) return true;
  return /\bat\b/i.test(lower) && /\b(gmail|yahoo|outlook|hotmail|icloud|example|proton)\b/i.test(lower);
}

export function isBareYes(text: string): boolean {
  const stripped = commandText(text);
  return ['yes', 'yeah', 'yep', 'ok', 'okay', 'አዎ', 'አዎን', 'እሺ', 'continue', 'ቀጥል'].includes(stripped);
}

export function isBareNo(text: string): boolean {
  const stripped = commandText(text);
  return ['no', 'nope', 'አይ', 'አይደለም'].includes(stripped);
}

function languageCommand(original: string): ConversationLanguage | null {
  const forms = [
    commandText(original),
    original.toLowerCase().replace(/[።.!?]+/g, '').replace(/\s+/g, ' ').trim(),
  ];
  for (const form of forms) {
    for (const language of ['am', 'en'] as const) {
      if (LANGUAGE_PHRASES[language].some((phrase) => form === phrase.toLowerCase())) return language;
    }
  }
  return null;
}

export function detectIntent(text: string): DetectedIntent {
  const clean = text.replace(/\s+/g, ' ').trim();
  const spoken = commandText(clean);
  if (!spoken) return { intent: 'unknown', action: null, confidence: 'none' };

  const language = languageCommand(clean);
  if (language) {
    return { intent: 'set_language', action: { id: 'set-language', language }, confidence: 'match' };
  }

  const rule = explicitRule(spoken);
  if (rule && !(isNegated(spoken) && (rule.intent === 'cancel_task' || rule.intent === 'find_jobs'))) {
    return { intent: rule.intent, action: rule.action?.() ?? null, confidence: 'match' };
  }

  if (mentionsCommand(spoken) && (isNegated(spoken) || isInformational(spoken) || !rule)) {
    return { intent: 'clarify', action: null, confidence: 'match' };
  }

  if (looksLikeRequest(clean)) return { intent: 'unknown', action: null, confidence: 'request' };
  return { intent: 'unknown', action: null, confidence: 'none' };
}
