import { PreferredLanguage } from '../types/accessbridge';

export interface LanguageOption {
  code: PreferredLanguage;
  englishName: string;
  nativeName: string;
  speechLang: string;
  greeting: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: 'en',
    englishName: 'English',
    nativeName: 'English',
    speechLang: 'en-US',
    greeting: 'Welcome to AllWays',
  },
  {
    code: 'am',
    englishName: 'Amharic',
    nativeName: 'አማርኛ',
    speechLang: 'am-ET',
    greeting: 'ወደ AllWays እንኳን በደህና መጡ',
  },
];

export interface LocalizedCopy {
  languageStepKicker: string;
  languageStepTitle: string;
  languageStepSubtitle: string;
  continueToSetup: string;
  readLanguagesAloud: string;
  setupStepKicker: string;
  setupStepTitle: string;
  setupStepSubtitle: string;
  quickControlsHeading: string;
  navChoiceHeading: string;
  navChoiceSubtitle: string;
  changeLanguageBtn: string;
  continueToWelcome: string;
  saveAndDashboard: string;
  navDashboard: string;
  navUnderstandPage: string;
  navFindJobs: string;
  navApply: string;
  navVerify: string;
  navFinalReview: string;
  navGetStarted: string;
  heroHeadline: string;
  heroSubheading: string;
  dashboardTitle: string;
  primaryActionsHeading: string;
  action1Title: string;
  action2Title: string;
  action3Title: string;
  action4Title: string;
  action5Title: string;
}

const COPY_BY_LANG: Record<PreferredLanguage, LocalizedCopy> = {
  en: {
    languageStepKicker: 'Language',
    languageStepTitle: 'Which language do you prefer?',
    languageStepSubtitle:
      'Choose your preferred language before starting. You can switch languages at any time.',
    continueToSetup: 'Continue to Accessibility & Navigation Setup',
    readLanguagesAloud: 'Read Languages Aloud',
    setupStepKicker: 'Step 2 of 2 · AllWays Accessibility & Navigation Setup',
    setupStepTitle: 'Adjust Display & Choose How to Navigate',
    setupStepSubtitle:
      'Set your visual, audio, and reading tools first, then select one or more navigation methods that match how you prefer to use this platform.',
    quickControlsHeading: '1. Quick Accessibility Controls',
    navChoiceHeading: '2. Choose How You Want to Navigate the Platform',
    navChoiceSubtitle: 'Select one or combine multiple navigation styles. You can change this anytime.',
    changeLanguageBtn: 'Change Language',
    continueToWelcome: 'Continue to Welcome Page',
    saveAndDashboard: 'Save & Enter Dashboard',
    navDashboard: 'Dashboard',
    navUnderstandPage: 'Understand Page',
    navFindJobs: 'Find Jobs',
    navApply: 'Apply',
    navVerify: 'Verify',
    navFinalReview: 'Final Review',
    navGetStarted: 'Get Started',
    heroHeadline: 'Find work from Ethiopia to the world.',
    heroSubheading: 'Roles at home and abroad, reached by listening, reading, or speaking. The opportunity stays the same.',
    dashboardTitle: 'Your Independent Work Companion',
    primaryActionsHeading: 'Primary Actions',
    action1Title: '1. Help Me Navigate',
    action2Title: '2. Understand This Page',
    action3Title: '3. Find Jobs',
    action4Title: '4. Help Me Apply',
    action5Title: '5. Verify My Application',
  },
  am: {
    languageStepKicker: 'ቋንቋ',
    languageStepTitle: 'የትኛውን ቋንቋ ይመርጣሉ?',
    languageStepSubtitle:
      'ከመጀመርዎ በፊት የሚመርጡትን ቋንቋ ይምረጡ። በማንኛውም ጊዜ ቋንቋ መቀየር ይችላሉ።',
    continueToSetup: 'ወደ ተደራሽነት እና አሰሳ ቅንብር ይቀጥሉ',
    readLanguagesAloud: 'ቋንቋዎችን በድምፅ ያንብቡ',
    setupStepKicker: 'ደረጃ 2 ከ 2 · የ AllWays ተደራሽነት እና አሰሳ ቅንብር',
    setupStepTitle: 'እይታን ያስተካክሉ እና እንዴት እንደሚንቀሳቀሱ ይምረጡ',
    setupStepSubtitle:
      'መጀመሪያ የእይታ፣ የድምፅ እና የንባብ መሳሪያዎችን ያስተካክሉ፤ ከዚያ መድረኩን እንዴት መጠቀም እንደሚፈልጉ ይምረጡ።',
    quickControlsHeading: '1. ፈጣን የተደራሽነት መቆጣጠሪያዎች',
    navChoiceHeading: '2. መድረኩን እንዴት ማሰስ እንደሚፈልጉ ይምረጡ',
    navChoiceSubtitle: 'አንድ ወይም ከአንድ በላይ የአሰሳ መንገዶችን መምረጥ ይችላሉ።',
    changeLanguageBtn: 'ቋንቋ ቀይር',
    continueToWelcome: 'ወደ መግቢያ ገጽ ይቀጥሉ',
    saveAndDashboard: 'አስቀምጥ እና ወደ ዳሽቦርድ ግባ',
    navDashboard: 'ዳሽቦርድ',
    navUnderstandPage: 'ገጹን ተረዳ',
    navFindJobs: 'ስራ ፈልግ',
    navApply: 'ያመልክቱ',
    navVerify: 'አረጋግጥ',
    navFinalReview: 'የመጨረሻ ግምገማ',
    navGetStarted: 'ጀምር',
    heroHeadline: 'ከኢትዮጵያ እስከ ዓለም ሥራ ይፈልጉ።',
    heroSubheading: 'በአገር ውስጥ እና በውጭ ያሉ ሥራዎች። በማዳመጥ፣ በማንበብ ወይም በመናገር ይደርሱባቸው። እድሉ አንድ ነው።',
    dashboardTitle: 'የእርስዎ ገለልተኛ የስራ ረዳት',
    primaryActionsHeading: 'ዋና ተግባራት',
    action1Title: '1. እንድንቀሳቀስ እርዳኝ',
    action2Title: '2. ይህን ገጽ ተረዳ',
    action3Title: '3. ስራዎችን ፈልግ',
    action4Title: '4. እንዳመለክት እርዳኝ',
    action5Title: '5. ማመልከቻዬን አረጋግጥ',
  },
};

export function getLocalizedCopy(lang: PreferredLanguage): LocalizedCopy {
  return COPY_BY_LANG[lang] || COPY_BY_LANG.en;
}

export function getLanguageOption(lang: PreferredLanguage): LanguageOption {
  return SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];
}
