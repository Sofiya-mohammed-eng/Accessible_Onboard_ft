import { ActionId, ConversationLanguage, PendingQuestion } from './types';

const TEXT: Record<string, Record<ConversationLanguage, string>> = {
  emailQuestion: {
    en: 'Please tell me your email address.',
    am: 'እባክዎ ኢሜይል አድራሻዎን ይንገሩኝ።',
  },
  passwordQuestion: {
    en: 'Please tell me your password.',
    am: 'እባክዎ የይለፍ ቃልዎን ይንገሩኝ።',
  },
  nameQuestion: {
    en: 'Please tell me your full name.',
    am: 'እባክዎ ሙሉ ስምዎን ይንገሩኝ።',
  },
  resumeEmail: {
    en: 'We were entering your email address. Would you like to continue?',
    am: 'ኢሜይል አድራሻዎን እየሞላን ነበር። መቀጠል ይፈልጋሉ?',
  },
  resumePassword: {
    en: 'We were entering your password. Would you like to continue?',
    am: 'የይለፍ ቃልዎን እየሞላን ነበር። መቀጠል ይፈልጋሉ?',
  },
  resumeName: {
    en: 'We were entering your name. Would you like to continue?',
    am: 'ስምዎን እየሞላን ነበር። መቀጠል ይፈልጋሉ?',
  },
  resumeGeneric: {
    en: 'We left a question unfinished. Would you like to continue?',
    am: 'ያልተጠናቀቀ ጥያቄ አለ። መቀጠል ይፈልጋሉ?',
  },
  decline: {
    en: 'Okay. I will keep that question. Say go back when you want to continue.',
    am: 'እሺ። ጥያቄውን አስቀምጣለሁ። ለመቀጠል ተመለስ ይበሉ።',
  },
  cancel: {
    en: 'Okay. I cancelled that task. I will not continue it, and I will not send anything.',
    am: 'እሺ። ያንን ሥራ ሰርዬዋለሁ። አልቀጥልም፣ ምንም አልልክም።',
  },
  subject: {
    en: 'Okay. I paused that task. Say go back when you want to continue.',
    am: 'እሺ። ያንን ሥራ አቁሜዋለሁ። ለመቀጠል ተመለስ ይበሉ።',
  },
  clarify: {
    en: 'I can open the header navigation, read this page, change the text size, or stay on the question we were answering. What would you like?',
    am: 'የራስጌ ዳሰሳ መክፈት፣ ይህን ገጽ ማንበብ፣ የጽሑፍ መጠን መቀየር፣ ወይም በነበርነው ጥያቄ መቆየት እችላለሁ። ምን ይፈልጋሉ?',
  },
  clarifyWithQuestion: {
    en: 'I did not understand that request. We still have an unfinished question. You can answer it, or ask me to open navigation, read this page, or change the text size.',
    am: 'ያንን ጥያቄ አልገባኝም። ያልተጠናቀቀ ጥያቄ አለን። መልስ መስጠት፣ ዳሰሳ መክፈት፣ ገጹን ማንበብ፣ ወይም የጽሑፍ መጠን መቀየር ይችላሉ።',
  },
  navOk: {
    en: 'The header navigation is open.',
    am: 'የራስጌ ዳሰሳው ተከፍቷል።',
  },
  navFail: {
    en: 'I could not open the header navigation. It is not available on this page.',
    am: 'የራስጌ ዳሰሳውን መክፈት አልቻልኩም። በዚህ ገጽ ላይ የለም።',
  },
  jobsOk: {
    en: 'Find Jobs is open.',
    am: 'ስራ ፈልግ ተከፍቷል።',
  },
  jobsFail: {
    en: 'I could not open Find Jobs.',
    am: 'ስራ ፈልግ መክፈት አልቻልኩም።',
  },
  passwordReceived: {
    en: 'Thank you. I have received your password.',
    am: 'አመሰግናለሁ። የይለፍ ቃልዎን ተቀብዬአለሁ።',
  },
  registrationRestarted: {
    en: 'Registration is open again. I will continue from the question that is still unfinished.',
    am: 'ምዝገባው እንደገና ተጀምሯል። ያልተጠናቀቀውን ጥያቄ እቀጥላለሁ።',
  },
  readFail: {
    en: 'I could not read this page.',
    am: 'ይህን ገጽ ማንበብ አልቻልኩም።',
  },
  textUpOk: {
    en: 'The text is larger.',
    am: 'ጽሑፉ ትልቅ ሆኗል።',
  },
  textUpFail: {
    en: 'The text is already as large as it can be.',
    am: 'ጽሑፉ አሁን ካለው በላይ አይበልጥም።',
  },
  textDownOk: {
    en: 'The text is smaller.',
    am: 'ጽሑፉ ትንሽ ሆኗል።',
  },
  textDownFail: {
    en: 'The text is already as small as it can be.',
    am: 'ጽሑፉ አሁን ካለው በታች አይቀንስም።',
  },
  focusOk: {
    en: 'The input is focused.',
    am: 'ግቤቱ ላይ አተኩሬአለሁ።',
  },
  focusFail: {
    en: 'I could not find an input to focus.',
    am: 'የምያተኩርበት ግቤት አላገኘሁም።',
  },
  questionFail: {
    en: 'There is no question waiting.',
    am: 'የሚጠበቅ ጥያቄ የለም።',
  },
  nextOk: {
    en: 'The next question is open.',
    am: 'ቀጣዩ ጥያቄ ተከፍቷል።',
  },
  nextFail: {
    en: 'I could not move to the next question.',
    am: 'ወደ ቀጣዩ ጥያቄ መሄድ አልቻልኩም።',
  },
  languageEn: {
    en: 'I will continue in English.',
    am: 'I will continue in English.',
  },
  languageAm: {
    en: 'ከዚህ በኋላ በአማርኛ እቀጥላለሁ።',
    am: 'ከዚህ በኋላ በአማርኛ እቀጥላለሁ።',
  },
};

function line(key: string, language: ConversationLanguage): string {
  return TEXT[key][language];
}

export function emailQuestion(language: ConversationLanguage): string {
  return line('emailQuestion', language);
}

export function passwordQuestion(language: ConversationLanguage): string {
  return line('passwordQuestion', language);
}

export function passwordReceived(language: ConversationLanguage): string {
  return line('passwordReceived', language);
}

export function registrationRestarted(language: ConversationLanguage): string {
  return line('registrationRestarted', language);
}

export function nameQuestion(language: ConversationLanguage): string {
  return line('nameQuestion', language);
}

export function questionPrompt(question: PendingQuestion | null, language: ConversationLanguage): string {
  if (!question) return '';
  if (question.id === 'email') return emailQuestion(language);
  if (question.id === 'password') return passwordQuestion(language);
  if (question.id === 'name') return nameQuestion(language);
  return question.prompt;
}

export function resumeOffer(question: PendingQuestion | null, language: ConversationLanguage): string {
  if (question?.id === 'email') return line('resumeEmail', language);
  if (question?.id === 'password') return line('resumePassword', language);
  if (question?.id === 'name') return line('resumeName', language);
  if (!question) return line('resumeGeneric', language);
  const prompt = questionPrompt(question, language);
  return language === 'am' ? `ይህን አልጨረስንም። ${prompt} መቀጠል ይፈልጋሉ?` : `We had not finished. ${prompt} Would you like to continue?`;
}

export function declineResume(language: ConversationLanguage): string {
  return line('decline', language);
}

export function cancelTaskResponse(language: ConversationLanguage): string {
  return line('cancel', language);
}

export function subjectChangeResponse(language: ConversationLanguage): string {
  return line('subject', language);
}

export function clarificationResponse(language: ConversationLanguage, hasQuestion: boolean): string {
  return line(hasQuestion ? 'clarifyWithQuestion' : 'clarify', language);
}

export function languageSwitchedResponse(language: ConversationLanguage): string {
  return language === 'am' ? line('languageAm', language) : line('languageEn', language);
}

export function actionResult(
  action: ActionId,
  ok: boolean,
  detail: string,
  language: ConversationLanguage,
): string {
  if (action === 'open-navigation') return line(ok ? 'navOk' : 'navFail', language);
  if (action === 'read-page') {
    if (!ok || !detail.trim()) return line('readFail', language);
    return language === 'am' ? `ገጹ ይህን ይላል። ${detail}` : `This page says: ${detail}`;
  }
  if (action === 'increase-text') return line(ok ? 'textUpOk' : 'textUpFail', language);
  if (action === 'decrease-text') return line(ok ? 'textDownOk' : 'textDownFail', language);
  if (action === 'focus-input') return line(ok ? 'focusOk' : 'focusFail', language);
  if (action === 'read-question') return ok && detail.trim() ? detail.trim() : line('questionFail', language);
  if (action === 'next-question') return line(ok ? 'nextOk' : 'nextFail', language);
  if (action === 'find-jobs') return line(ok ? 'jobsOk' : 'jobsFail', language);
  if (action === 'set-language') return languageSwitchedResponse(language);
  return line('clarify', language);
}
