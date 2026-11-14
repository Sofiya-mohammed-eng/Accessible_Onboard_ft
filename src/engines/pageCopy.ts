import { PreferredLanguage } from '../types/accessbridge';

export interface PageCopy {
  continueToApply: string;
  login: string;
  readPage: string;
  stopReading: string;
  voiceInput: string;
  stopVoice: string;
  languageNotSupported: string;
  listening: string;
  dashboardEyebrow: string;
  dashboardHeadline: string;
  dashboardLead: string;
  browseJobs: string;
  readAloudFeature: string;
  voiceAnswersFeature: string;
  privateFeature: string;
  loginTitle: string;
  loginLead: string;
  welcomeBack: string;
  signInContinue: string;
  emailLabel: string;
  passwordLabel: string;
  backToJob: string;
  loginHint: string;
  applyingFor: string;
  readAloud: string;
  yourAnswer: string;
  answerByVoice: string;
  briefHint: string;
  back: string;
  continue: string;
  reviewApplication: string;
  submitApplication: string;
  addCvTitle: string;
  addCvHint: string;
  cannotUpload: string;
  optional: string;
  interviewTitle: string;
  interviewHint: string;
  reviewTitle: string;
  youAreApplying: string;
  agree: string;
  notProvided: string;
  applicationComplete: string;
  onItsWay: string;
  thanksAndLuck: string;
  youAppliedFor: string;
  whatYouSent: string;
  receipt: string;
  whatNext: string;
  afterSubmit: string;
  reviewsTitle: string;
  reviewsDetail: string;
  supportTitle: string;
  supportDetail: string;
  referenceChip: string;
  submittedChip: string;
  calendarChip: string;
  stepChip: string;
  browseMore: string;
  readConfirmation: string;
  agreed: string;
  findJobsTitle: string;
  filterJobs: string;
  searchPlaceholder: string;
  viewDetails: string;
  prepareApplication: string;
  loginToApply: string;
  signInThen: string;
  search: string;
  careerHome: string;
  edit: string;
  progress: string;
  chooseFile: string;
  fileHint: string;
  qName: string;
  qPhone: string;
  qEducation: string;
  qExperience: string;
  qSkills: string;
  noRequest: string;
  extraTime: string;
  remoteInterview: string;
  writtenQuestions: string;
  captioning: string;
  accessibleLocation: string;
  altCommunication: string;
  openDashboard: string;
  noMatches: string;
  enterBoth: string;
  enterEmail: string;
  missingName: string;
  emptyAnswer: string;
  noFile: string;
  voiceStopped: string;
  voiceAdded: string;
  voiceListening: string;
  showPassword: string;
  hidePassword: string;
  aboutTen: string;
  signInLead: string;
  register: string;
  createAccount: string;
  fullName: string;
  confirmPassword: string;
  passwordsMismatch: string;
  continueToSignIn: string;
  haveAccount: string;
  needAccount: string;
  accountLead: string;
  openFile: string;
  upload: string;
  applyNow: string;
  homeKicker: string;
  homeBody: string;
}

const COPY: Record<PreferredLanguage, PageCopy> = {
  en: {
    continueToApply: 'Continue to apply',
    login: 'Login',
    readPage: 'Read this page',
    stopReading: 'Stop reading',
    voiceInput: 'Voice input',
    stopVoice: 'Stop voice',
    languageNotSupported: 'This language is not supported.',
    listening: 'Listening in your selected language.',
    dashboardEyebrow: 'Accessible career pathway',
    dashboardHeadline: 'Find work that works for you.',
    dashboardLead: 'Explore jobs, understand workplace arrangements, and apply with accessible forms.',
    browseJobs: 'Browse opportunities',
    readAloudFeature: 'Read-aloud',
    voiceAnswersFeature: 'Voice answers',
    privateFeature: 'Private preferences',
    loginTitle: 'Login to apply',
    loginLead: 'Sign in to start your application.',
    welcomeBack: 'Welcome back',
    signInContinue: 'Sign in and continue',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    backToJob: 'Back to the job',
    loginHint: 'Use your email and password. They stay on this page and are not sent to the employer.',
    applyingFor: 'Applying for',
    readAloud: 'Read this aloud',
    yourAnswer: 'Your answer',
    answerByVoice: 'Answer by voice',
    briefHint: 'You can type or use voice. Keep your answer brief.',
    back: 'Back',
    continue: 'Continue',
    reviewApplication: 'Review application',
    submitApplication: 'Submit application',
    addCvTitle: 'Add your CV',
    addCvHint: 'PDF, DOC, or DOCX. Maximum file size: 5 MB.',
    cannotUpload: 'If you do not have another file, say continue. The file shown on this page is the one that will be sent.',
    optional: 'Optional',
    interviewTitle: 'Would you like to request any arrangements for the interview?',
    interviewHint: 'Only the request you choose here will be shared. Your private preferences and disability status are not sent.',
    reviewTitle: 'Review and submit',
    youAreApplying: 'You are applying for:',
    agree: 'I agree to send this application to the employer',
    notProvided: 'Not provided',
    applicationComplete: 'Application complete',
    onItsWay: 'Your application is on its way.',
    thanksAndLuck: 'Thank you for choosing us. Good luck.',
    youAppliedFor: 'You applied for',
    whatYouSent: 'What you sent',
    receipt: 'Application receipt',
    whatNext: 'What happens next',
    afterSubmit: 'After you submit',
    reviewsTitle: '{employer} reviews applications',
    reviewsDetail: 'Shortlisted applicants are contacted with the details on this application.',
    supportTitle: 'Support stays available',
    supportDetail: 'For application support, call +251 11 555 0182.',
    referenceChip: 'Reference OP-JOB-7352',
    submittedChip: 'Submitted 12 June 2025',
    calendarChip: '5 Sene 2017 EC',
    stepChip: 'Step 7 of 7',
    browseMore: 'Browse more jobs',
    readConfirmation: 'Read this confirmation aloud',
    agreed: 'You agreed to send this application to the employer.',
    findJobsTitle: 'Find your next opportunity',
    filterJobs: 'Filter jobs',
    searchPlaceholder: 'Search by job title, skill, or organization',
    viewDetails: 'View job details',
    prepareApplication: 'Prepare application',
    loginToApply: 'Login to apply',
    signInThen: 'Sign in, then the application takes about 10 minutes',
    search: 'Search',
    careerHome: 'Career home',
    edit: 'Edit',
    progress: 'Application progress',
    chooseFile: 'Choose a file from your device',
    fileHint: 'The file shown is already added. To choose another file, press Enter, then the Down arrow, then Enter. Voice cannot click inside the computer file window. Then say continue.',
    qName: 'What is your full name?',
    qPhone: 'What is your phone number?',
    qEducation: 'Tell us about your education',
    qExperience: 'Tell us about your work experience',
    qSkills: 'What skills would you bring to this role?',
    noRequest: 'No request',
    extraTime: 'Additional time',
    remoteInterview: 'Remote interview',
    writtenQuestions: 'Written questions',
    captioning: 'Captioning',
    accessibleLocation: 'Accessible interview location',
    altCommunication: 'Alternative communication method',
    openDashboard: 'Open Dashboard',
    noMatches: 'No opportunities match these filters.',
    enterBoth: 'The email or the password is empty. Say the email, then say the password, before you continue.',
    enterEmail: 'It needs an @ sign, like name@example.com. Please say the email again.',
    missingName: 'Your full name is missing. Say your full name to create the account.',
    emptyAnswer: 'This answer is empty. Say your answer, then say continue.',
    noFile: 'No file was chosen. Say open file, press Enter, and choose the file.',
    voiceStopped: 'Voice answer stopped.',
    voiceAdded: 'Voice answer added. You can edit it before you continue.',
    voiceListening: 'Listening. Speak your answer, then it will appear in the box.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    aboutTen: 'About 10 minutes',
    signInLead: 'Sign in to continue',
    register: 'Register',
    createAccount: 'Create your account',
    fullName: 'Full name',
    confirmPassword: 'Confirm password',
    passwordsMismatch: 'The two passwords do not match. Say the password again, then say the same password to confirm.',
    continueToSignIn: 'Continue to sign in',
    haveAccount: 'I already have an account',
    needAccount: 'I need an account',
    accountLead: 'Sign in or create an account. Next you will see jobs you can apply for.',
    openFile: 'Open file',
    upload: 'Upload',
    applyNow: 'Apply',
    homeKicker: 'One platform. Different abilities. Equal opportunities.',
    homeBody: 'Say get started to choose your language, then sign in.',
  },
  am: {
    continueToApply: 'ወደ ማመልከቻ ቀጥል',
    login: 'ግባ',
    readPage: 'ይህን ገጽ አንብብ',
    stopReading: 'ንባብ አቁም',
    voiceInput: 'የድምፅ ግብዓት',
    stopVoice: 'ድምፅ አቁም',
    languageNotSupported: 'ይህ ቋንቋ አይደገፍም።',
    listening: 'በመረጡት ቋንቋ በመስማት ላይ።',
    dashboardEyebrow: 'ተደራሽ የሥራ መንገድ',
    dashboardHeadline: 'ለእርስዎ የሚስማማ ሥራ ያግኙ።',
    dashboardLead: 'ሥራዎችን ይመልከቱ፣ የሥራ ቦታ ዝግጅቶችን ይረዱ፣ እና በተደራሽ ቅጽ ያመልክቱ።',
    browseJobs: 'እድሎችን ይመልከቱ',
    readAloudFeature: 'ጮክ ብሎ ማንበብ',
    voiceAnswersFeature: 'የድምፅ መልሶች',
    privateFeature: 'የግል ምርጫዎች',
    loginTitle: 'ለማመልከት ይግቡ',
    loginLead: 'ማመልከቻዎን ለመጀመር ይግቡ።',
    welcomeBack: 'እንኳን ደህና መጡ',
    signInContinue: 'ግባ እና ቀጥል',
    emailLabel: 'ኢሜይል',
    passwordLabel: 'የይለፍ ቃል',
    backToJob: 'ወደ ሥራው ተመለስ',
    loginHint: 'ኢሜይልዎን እና የይለፍ ቃልዎን ይጠቀሙ። ወደ አሠሪው አይላኩም።',
    applyingFor: 'እየተመዘገቡ ያሉት',
    readAloud: 'ጮክ ብለህ አንብብ',
    yourAnswer: 'መልስዎ',
    answerByVoice: 'በድምፅ መልስ',
    briefHint: 'መተየብ ወይም ድምፅ መጠቀም ይችላሉ። መልስዎን አጭር ያድርጉ።',
    back: 'ተመለስ',
    continue: 'ቀጥል',
    reviewApplication: 'ማመልከቻውን ይገምግሙ',
    submitApplication: 'ማመልከቻ ላክ',
    addCvTitle: 'የሕይወት ታሪክዎን ያክሉ',
    addCvHint: 'PDF፣ DOC ወይም DOCX። ከፍተኛ መጠን 5 ሜባ።',
    cannotUpload: 'ሌላ ፋይል ከሌለዎት ቀጥል ይበሉ። በዚህ ገጽ ላይ የታየው ፋይል ነው የሚላከው።',
    optional: 'አማራጭ',
    interviewTitle: 'ለቃለ መጠይቁ ዝግጅት መጠየቅ ይፈልጋሉ?',
    interviewHint: 'እዚህ የመረጡት ጥያቄ ብቻ ይጋራል። የግል ምርጫዎችዎ አይላኩም።',
    reviewTitle: 'ገምግም እና ላክ',
    youAreApplying: 'እየተመዘገቡ ያሉት፦',
    agree: 'ይህን ማመልከቻ ለአሠሪው ለመላክ እስማማለሁ',
    notProvided: 'አልተሰጠም',
    applicationComplete: 'ማመልከቻው ተጠናቋል',
    onItsWay: 'ማመልከቻዎ በመንገድ ላይ ነው።',
    thanksAndLuck: 'ስለመረጡን እናመሰግናለን። መልካም ዕድል።',
    youAppliedFor: 'ያመለከቱት',
    whatYouSent: 'የላኩት',
    receipt: 'የማመልከቻ ደረሰኝ',
    whatNext: 'ቀጥሎ ምን ይሆናል',
    afterSubmit: 'ከላኩ በኋላ',
    reviewsTitle: '{employer} ማመልከቻዎችን ይመለከታል',
    reviewsDetail: 'የተመረጡ አመልካቾች በዚህ ማመልከቻ ላይ ባለው ዝርዝር ይገናኛሉ።',
    supportTitle: 'ድጋፍ አለ',
    supportDetail: 'ለማመልከቻ ድጋፍ +251 11 555 0182 ይደውሉ።',
    referenceChip: 'ማጣቀሻ OP-JOB-7352',
    submittedChip: 'የተላከው 12 June 2025',
    calendarChip: '5 ሰኔ 2017 ዓ.ም.',
    stepChip: 'ደረጃ 7 ከ 7',
    browseMore: 'ተጨማሪ ሥራዎችን ይመልከቱ',
    readConfirmation: 'ይህን ማረጋገጫ ጮክ ብለህ አንብብ',
    agreed: 'ይህን ማመልከቻ ለአሠሪው ለመላክ ተስማምተዋል።',
    findJobsTitle: 'ቀጣዩን እድልዎን ያግኙ',
    filterJobs: 'ሥራዎችን አጣራ',
    searchPlaceholder: 'በሥራ ርዕስ፣ ክህሎት ወይም ድርጅት ይፈልጉ',
    viewDetails: 'ዝርዝር ይመልከቱ',
    prepareApplication: 'ማመልከቻ አዘጋጅ',
    loginToApply: 'ለማመልከት ይግቡ',
    signInThen: 'ከገቡ በኋላ ማመልከቻው ወደ 10 ደቂቃ ይወስዳል',
    search: 'ፈልግ',
    careerHome: 'የሙያ መነሻ',
    edit: 'አርትዕ',
    progress: 'የማመልከቻ ሂደት',
    chooseFile: 'ከመሣሪያዎ ፋይል ይምረጡ',
    fileHint: 'የታየው ፋይል ተጨምሯል። ሌላ ፋይል ለመምረጥ Enter፣ ከዚያ የታች ቀስት፣ ከዚያ Enter ይጫኑ። የኮምፒውተሩ መስኮት በድምፅ አይመረጥም። ከዚያ ቀጥል ይበሉ።',
    qName: 'ሙሉ ስምዎ ማን ነው?',
    qPhone: 'ስልክ ቁጥርዎ ምንድን ነው?',
    qEducation: 'ስለ ትምህርትዎ ይንገሩን',
    qExperience: 'ስለ የሥራ ልምድዎ ይንገሩን',
    qSkills: 'ለዚህ ሥራ ምን ክህሎት ያመጣሉ?',
    noRequest: 'ጥያቄ የለም',
    extraTime: 'ተጨማሪ ጊዜ',
    remoteInterview: 'የርቀት ቃለ መጠይቅ',
    writtenQuestions: 'የጽሑፍ ጥያቄዎች',
    captioning: 'የጽሑፍ መግለጫ',
    accessibleLocation: 'ተደራሽ የቃለ መጠይቅ ቦታ',
    altCommunication: 'ሌላ የመግባቢያ መንገድ',
    openDashboard: 'ዳሽቦርድ ክፈት',
    noMatches: 'ከእነዚህ ማጣሪያዎች ጋር የሚስማማ እድል የለም።',
    enterBoth: 'ኢሜይል ወይም የይለፍ ቃል ባዶ ነው። ከመቀጠልዎ በፊት ኢሜይሉን ይናገሩ፣ ከዚያ የይለፍ ቃሉን ይናገሩ።',
    enterEmail: 'የ @ ምልክት ያስፈልጋል፣ እንደ name@example.com። እባክዎ ኢሜይሉን እንደገና ይናገሩ።',
    missingName: 'ሙሉ ስም አልተሰጠም። መለያ ለመፍጠር ሙሉ ስምዎን ይናገሩ።',
    emptyAnswer: 'ይህ መልስ ባዶ ነው። መልስዎን ይናገሩ፣ ከዚያ ቀጥል ይበሉ።',
    noFile: 'ፋይል አልተመረጠም። ፋይል ክፈት ይበሉ፣ Enter ይጫኑ፣ እና ፋይሉን ይምረጡ።',
    voiceStopped: 'የድምፅ መልስ ቆሟል።',
    voiceAdded: 'የድምፅ መልስ ተጨምሯል። ከመቀጠልዎ በፊት ማረም ይችላሉ።',
    voiceListening: 'እየሰማ ነው። መልስዎን ይናገሩ፣ ከዚያ በሳጥኑ ውስጥ ይታያል።',
    showPassword: 'የይለፍ ቃል አሳይ',
    hidePassword: 'የይለፍ ቃል ደብቅ',
    aboutTen: 'ወደ 10 ደቂቃ',
    signInLead: 'ለመቀጠል ይግቡ',
    register: 'ተመዝገብ',
    createAccount: 'መለያ ይፍጠሩ',
    fullName: 'ሙሉ ስም',
    confirmPassword: 'የይለፍ ቃል ያረጋግጡ',
    passwordsMismatch: 'ሁለቱ የይለፍ ቃሎች አይዛመዱም። የይለፍ ቃሉን ይናገሩ፣ ከዚያ ለማረጋገጥ ተመሳሳዩን ይናገሩ።',
    continueToSignIn: 'ወደ መግቢያ ቀጥል',
    haveAccount: 'መለያ አለኝ',
    needAccount: 'መለያ እፈልጋለሁ',
    accountLead: 'ይግቡ ወይም መለያ ይፍጠሩ። ከዚያ ማመልከት የሚችሉባቸው ሥራዎች ይታያሉ።',
    openFile: 'ፋይል ክፈት',
    upload: 'ጫን',
    applyNow: 'አመልክት',
    homeKicker: 'አንድ መድረክ። የተለያዩ ችሎታዎች። እኩል እድሎች።',
    homeBody: 'ቋንቋ ለመምረጥ ጀምር ይበሉ። ከዚያ ይግቡ።',
  },
};

const UNSUPPORTED_PHRASES = [
  'bonjour',
  'francais',
  'français',
  'je suis',
  'merci beaucoup',
  'au revoir',
  's il vous plait',
  'comment allez',
  'hola',
  'buenos dias',
  'muchas gracias',
  'guten tag',
  'danke schon',
  'arrivederci',
  'obrigado',
  'bonjour madame',
];

export function getPageCopy(lang: PreferredLanguage): PageCopy {
  return COPY[lang] || COPY.en;
}

export function unsupportedLanguageNotice(transcript: string, lang: PreferredLanguage): string | null {
  const lower = transcript.toLowerCase();
  const blocked = UNSUPPORTED_PHRASES.some((phrase) => lower.includes(phrase));
  if (!blocked) return null;
  return getPageCopy(lang).languageNotSupported;
}
