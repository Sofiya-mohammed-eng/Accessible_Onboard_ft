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
    greeting: 'Welcome to AccessBridge',
  },
  {
    code: 'am',
    englishName: 'Amharic',
    nativeName: 'አማርኛ',
    speechLang: 'am-ET',
    greeting: 'ወደ AccessBridge እንኳን በደህና መጡ',
  },
  {
    code: 'om',
    englishName: 'Afan Oromo',
    nativeName: 'Afaan Oromoo',
    speechLang: 'om-ET',
    greeting: 'Baga gara AccessBridge nagaan dhuftan',
  },
  {
    code: 'ti',
    englishName: 'Tigrigna',
    nativeName: 'ትግርኛ',
    speechLang: 'ti-ET',
    greeting: 'ናብ AccessBridge ብደሓን መጻእኩም',
  },
  {
    code: 'sgw',
    englishName: 'Guragigna',
    nativeName: 'ጉራግኛ',
    speechLang: 'am-ET',
    greeting: 'ተ AccessBridge በደህና መጣኹም',
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
    languageStepKicker: 'Step 1 of 2 · Language Selection',
    languageStepTitle: 'Which language do you prefer?',
    languageStepSubtitle:
      'Choose your preferred language before starting. You can switch languages at any time.',
    continueToSetup: 'Continue to Accessibility & Navigation Setup',
    readLanguagesAloud: 'Read Languages Aloud',
    setupStepKicker: 'Step 2 of 2 · AccessBridge Accessibility & Navigation Setup',
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
    heroHeadline: 'Your Abilities Should Never Limit Your Digital Opportunities.',
    heroSubheading: 'One accessibility companion. Every digital opportunity.',
    dashboardTitle: 'Your Independent Work Companion',
    primaryActionsHeading: 'Primary Actions',
    action1Title: '1. Help Me Navigate',
    action2Title: '2. Understand This Page',
    action3Title: '3. Find Jobs',
    action4Title: '4. Help Me Apply',
    action5Title: '5. Verify My Application',
  },
  am: {
    languageStepKicker: 'ደረጃ 1 ከ 2 · ቋንቋ መምረጥ',
    languageStepTitle: 'የትኛውን ቋንቋ ይመርጣሉ?',
    languageStepSubtitle:
      'ከመጀመርዎ በፊት የሚመርጡትን ቋንቋ ይምረጡ። በማንኛውም ጊዜ ቋንቋ መቀየር ይችላሉ።',
    continueToSetup: 'ወደ ተደራሽነት እና አሰሳ ቅንብር ይቀጥሉ',
    readLanguagesAloud: 'ቋንቋዎችን በድምፅ ያንብቡ',
    setupStepKicker: 'ደረጃ 2 ከ 2 · የ AccessBridge ተደራሽነት እና አሰሳ ቅንብር',
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
    heroHeadline: 'ችሎታዎ ዲጂታል እድሎችዎን በፍጹም መገደብ የለበትም።',
    heroSubheading: 'አንድ የተደራሽነት ጓደኛ። ለእያንዳንዱ ዲጂታል እድል።',
    dashboardTitle: 'የእርስዎ ገለልተኛ የስራ ረዳት',
    primaryActionsHeading: 'ዋና ተግባራት',
    action1Title: '1. እንድንቀሳቀስ እርዳኝ',
    action2Title: '2. ይህን ገጽ ተረዳ',
    action3Title: '3. ስራዎችን ፈልግ',
    action4Title: '4. እንዳመለክት እርዳኝ',
    action5Title: '5. ማመልከቻዬን አረጋግጥ',
  },
  om: {
    languageStepKicker: 'Sadarkaa 1ffaa · Filannoo Afaanii',
    languageStepTitle: 'Afaan kam filattu?',
    languageStepSubtitle:
      'Oso hin jalqabin dura afaan barbaaddan filadhaa. Yeroo barbaaddanitti jijjiiruu dandeessu.',
    continueToSetup: 'Gara Qindaa’ina Dhaqqabummaatti Itti Fufi',
    readLanguagesAloud: 'Afaanota Sagaleedhaan Dubbisi',
    setupStepKicker: 'Sadarkaa 2ffaa · Qindaa’ina Dhaqqabummaa fi Daandii AccessBridge',
    setupStepTitle: 'Mul’ata Sirreessi & Akkaataa Itti Fayyadamaa Filadhu',
    setupStepSubtitle:
      'Dura meeshaalee mul’ataa, sagalee fi dubbisaa qindeessi, sana booda akkaataa waltajjii kana itti fayyadamuu barbaaddu filadhu.',
    quickControlsHeading: '1. To’annoo Dhaqqabummaa Saffisaa',
    navChoiceHeading: '2. Akkaataa Waltajjicha Itti Keessa Deemtu Filadhu',
    navChoiceSubtitle: 'Tokko ykn isaa ol walitti makuun filachuu dandeessu.',
    changeLanguageBtn: 'Afaan Jijjiiri',
    continueToWelcome: 'Gara Fuula Jalqabaatti Itti Fufi',
    saveAndDashboard: 'Olkaa’i & Gara Daashboordii Seeni',
    navDashboard: 'Daashboordii',
    navUnderstandPage: 'Fuula Hubadhu',
    navFindJobs: 'Hojii Barbaadi',
    navApply: 'Iyyadhu',
    navVerify: 'Mirkaneessi',
    navFinalReview: 'Gamaaggama Xumuraa',
    navGetStarted: 'Jalqabi',
    heroHeadline: 'Dandeettiin Kee Carraa Dijitaalaa Kee Gonkumaa Daangessuu Hin Qabu.',
    heroSubheading: 'Hiriyaa dhaqqabummaa tokko. Carraa dijitaalaa hundaaf.',
    dashboardTitle: 'Gargaaraa Hojii Of-Danda’aa Kee',
    primaryActionsHeading: 'Gochaalee Ijoo',
    action1Title: '1. Akkan Keessa Deemu Na Gargaari',
    action2Title: '2. Fuula Kana Hubadhu',
    action3Title: '3. Hojii Barbaadi',
    action4Title: '4. Akkan Iyyadhu Na Gargaari',
    action5Title: '5. Iyyata Koo Mirkaneessi',
  },
  ti: {
    languageStepKicker: 'ደረጃ 1 ካብ 2 · ምርጫ ቋንቋ',
    languageStepTitle: 'ኣየናይ ቋንቋ ትመርጹ?',
    languageStepSubtitle:
      'ቅድሚ ምጅማርኩም እትመርጽዎ ቋንቋ ምረጹ። ኣብ ዝኾነ እዋን ቋንቋ ክትቅይሩ ትኽእሉ ኢኹም።',
    continueToSetup: 'ናብ ምድላው ተበጻሕነትን ምንቅስቓስን ቀጽሉ',
    readLanguagesAloud: 'ቋንቋታት ብድምጺ ኣንብብ',
    setupStepKicker: 'ደረጃ 2 ካብ 2 · ምድላው ተበጻሕነትን ምንቅስቓስን AccessBridge',
    setupStepTitle: 'ትርኢት ኣስተኻኽሉን ከመይ ከም እትንቀሳቐሱ ምረጹን',
    setupStepSubtitle:
      'መጀመርታ መሳርሒታት ርእየት፣ ድምጽን ንባብን ኣስተኻኽሉ፤ ቀጺልኩም ነዚ መድረኽ ከመይ ክትጥቀሙሉ ከም እትደልዩ ምረጹ።',
    quickControlsHeading: '1. ቅልጡፍ መቆጻጸሪታት ተበጻሕነት',
    navChoiceHeading: '2. ነዚ መድረኽ ከመይ ክትንቀሳቐሱሉ ከም እትደልዩ ምረጹ',
    navChoiceSubtitle: 'ሓደ ወይ ካብ ሓደ ንላዕሊ ኣገባባት ክትመርጹ ትኽእሉ ኢኹም።',
    changeLanguageBtn: 'ቋንቋ ቀይር',
    continueToWelcome: 'ናብ መእተዊ ገጽ ቀጽሉ',
    saveAndDashboard: 'ኣቐምጥ እሞ ናብ ዳሽቦርድ እቶ',
    navDashboard: 'ዳሽቦርድ',
    navUnderstandPage: 'ገጽ ተረዳእ',
    navFindJobs: 'ስራሕ ድለ',
    navApply: 'ኣመልክት',
    navVerify: 'ኣረጋግጽ',
    navFinalReview: 'ናይ መወዳእታ ገምጋም',
    navGetStarted: 'ጀምር',
    heroHeadline: 'ዓቕምኹም ዲጂታላዊ ዕድላትኩም ክድርት የብሉን።',
    heroSubheading: 'ሓደ መሓዛ ተበጻሕነት። ንኹሉ ዲጂታላዊ ዕድል።',
    dashboardTitle: 'ናይ ባዕልኹም ናጻ ሓጋዚ ስራሕ',
    primaryActionsHeading: 'ቀንዲ ተግባራት',
    action1Title: '1. ክንቀሳቐስ ሓግዘኒ',
    action2Title: '2. ነዚ ገጽ ተረዳእ',
    action3Title: '3. ስራሕ ድለ',
    action4Title: '4. ከመልክት ሓግዘኒ',
    action5Title: '5. መመልከቲይ ኣረጋግጽ',
  },
  sgw: {
    languageStepKicker: 'ደረጃ 1 ተ 2 · የቋንቋ ምርጫ',
    languageStepTitle: 'ምር ቋንቋ ተሽ?',
    languageStepSubtitle:
      'ከምትቅርስ ቀደም የምትፈርጂ ቋንቋ ምረጥ። በማንኛውም ሰዓት ቋንቋ መቀየር ይቻላል።',
    continueToSetup: 'ወደ ተደራሽነት እና አሰሳ ቅንብር ግባ',
    readLanguagesAloud: 'ቋንቋዎቹን በድምፅ አንብብ',
    setupStepKicker: 'ደረጃ 2 ተ 2 · የ AccessBridge ተደራሽነት እና አሰሳ ቅንብር',
    setupStepTitle: 'እይታ አስተካክል እና የምትሄድበት መንገድ ምረጥ',
    setupStepSubtitle:
      'ቀደም የእይታ፣ የድምፅ እና የንባብ መሳሪያዎችን አስተካክል፤ ከዛ መድረኩን በምን መንገድ መጠቀም እንደምትፈልግ ምረጥ።',
    quickControlsHeading: '1. ፈጣን የተደራሽነት መቆጣጠሪያዎች',
    navChoiceHeading: '2. መድረኩን በምን መንገድ መንቀሳቀስ ትፈልጋለህ?',
    navChoiceSubtitle: 'አንድ ወይም ከአንድ በላይ መንገዶችን መምረጥ ይቻላል።',
    changeLanguageBtn: 'ቋንቋ ቀይር',
    continueToWelcome: 'ወደ መግቢያ ገጽ ሂድ',
    saveAndDashboard: 'አስቀምጥ እና ዳሽቦርድ ግባ',
    navDashboard: 'ዳሽቦርድ',
    navUnderstandPage: 'ገፁን ተረዳ',
    navFindJobs: 'ስራ ፈልግ',
    navApply: 'አመልክት',
    navVerify: 'አረጋግጥ',
    navFinalReview: 'የመጨረሻ እይታ',
    navGetStarted: 'ጀምር',
    heroHeadline: 'ችሎታህ ዲጂታል እድሎችህን መገደብ የለበትም።',
    heroSubheading: 'አንድ የተደራሽነት ጓደኛ። ለሁሉም ዲጂታል እድል።',
    dashboardTitle: 'የራስህ ገለልተኛ የስራ ረዳት',
    primaryActionsHeading: 'ዋና ተግባራት',
    action1Title: '1. እንድንቀሳቀስ እርዳኝ',
    action2Title: '2. ይህን ገፅ ተረዳ',
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
