export type NavigationView =
  | 'landing'
  | 'onboarding'
  | 'dashboard'
  | 'scanner'
  | 'jobs'
  | 'apply'
  | 'login'
  | 'verify'
  | 'review';

export type TextSizeOption = 'normal' | 'large' | 'xlarge';

export type GazeTrackingMode = 'hybrid' | 'head' | 'eye';

export type GazeActivationMode = 'dwell' | 'blink' | 'both';

export type PreferredLanguage = 'en' | 'am';

export type ColorMode = 'light' | 'dark';

export type NavigationStyle =
  | 'keyboard_screen_reader'
  | 'voice_commands'
  | 'simplified_step_by_step'
  | 'switch_reduced_click'
  | 'visual_captions_alerts'
  | 'standard';

export interface AccessibilityPreferences {
  // Language
  language: PreferredLanguage;
  languageSelected: boolean;

  // Visual
  screenReaderCompatibility: boolean;
  highContrast: boolean;
  magnification: boolean;
  textSize: TextSizeOption;

  // Auditory
  textBasedNotifications: boolean;
  captions: boolean;
  visualAlerts: boolean;

  // Motor
  voiceCommands: boolean;
  keyboardNavigation: boolean;
  reducedClickNavigation: boolean;
  switchCompatibleControls: boolean;

  // Cognitive
  simplifiedInstructions: boolean;
  stepByStepNavigation: boolean;
  reducedInformationOverload: boolean;

  // Communication
  speechInput: boolean;
  textInput: boolean;
  alternativeInputMethods: boolean;

  // Navigation & startup state
  preferredNavigationStyles: NavigationStyle[];
  startupModalCompleted: boolean;

  // Motion & speech settings
  colorMode: ColorMode;
  reducedMotion: boolean;
  speechRate: number;
  onboardingCompleted: boolean;

  gazeControlEnabled: boolean;
  gazeTrackingMode: GazeTrackingMode;
  gazeActivationMode: GazeActivationMode;
  gazeDwellMs: number;
  gazeSensitivity: number;
  gazeSmoothing: number;
  gazeEdgeScrollSpeed: number;
}

export type PageElementCategory =
  | 'heading'
  | 'navigation'
  | 'button'
  | 'link'
  | 'form_field'
  | 'input_label'
  | 'image'
  | 'interactive';

export interface DetectedPageElement {
  id: string;
  category: PageElementCategory;
  tag: string;
  role: string;
  accessibleName: string;
  selector: string;
  focusOrder: number;
  required?: boolean;
  currentValue?: string;
  altTextStatus?: 'present' | 'missing' | 'decorative';
  accessibilityNote: string;
}

export interface SampleWebPage {
  id: string;
  platform: 'Upwork' | 'LinkedIn' | 'Indeed' | 'Freelancer' | 'Fiverr';
  title: string;
  url: string;
  summary: string;
  isSimulated: true;
  elements: DetectedPageElement[];
}

export interface ChromeExtensionBridgeMessage {
  protocol: 'ACCESSBRIDGE_MV3_V1';
  source: 'content_script' | 'web_companion';
  action:
    | 'INSPECT_ACTIVE_TAB'
    | 'HIGHLIGHT_ELEMENT'
    | 'READ_FORM_VALUES'
    | 'VERIFY_INTENDED_VS_ACTUAL';
  tabUrl: string;
  timestamp: string;
  payload: {
    elements?: DetectedPageElement[];
    actualValues?: Partial<ActualApplicationValues>;
  };
}

export type WorkArrangement =
  | 'Remote'
  | 'Async-friendly'
  | 'Flexible hours'
  | 'Part-time'
  | 'Full-time';

export type ExperienceLevel = 'Entry' | 'Intermediate' | 'Expert';

export interface JobListing {
  id: string;
  platform: 'Upwork' | 'Fiverr' | 'LinkedIn' | 'Indeed' | 'Freelancer';
  title: string;
  employer: string;
  arrangement: WorkArrangement[];
  experienceLevel: ExperienceLevel;
  hourlyRateMin: number;
  hourlyRateMax: number;
  paymentType: 'Hourly' | 'Fixed-Price' | 'Annual Salary';
  paymentDisplay: string;
  description: string;
  requiredSkills: string[];
  applicationRequirements: string[];
  screeningQuestions: string[];
  isSampleData: true;
  accessibilityNotes: string;
}

export interface JobSearchCriteria {
  query: string;
  skills: string;
  arrangement: WorkArrangement | 'Any';
  experienceLevel: ExperienceLevel | 'Any';
  minHourlyRate: number;
}

export interface ScreeningAnswer {
  question: string;
  answer: string;
}

export interface AttachmentMetadata {
  id: string;
  name: string;
  type: string;
  sizeLabel: string;
}

export interface ApplicationDraft {
  jobId: string;
  jobTitle: string;
  employer: string;
  platform: string;
  contactEmail: string;
  portfolioUrl: string;
  hourlyRate: string;
  experienceLevel: ExperienceLevel;
  availability: string;
  coverLetter: string;
  screeningAnswers: ScreeningAnswer[];
  attachments: AttachmentMetadata[];
  lastSavedAt: string | null;
}

export interface IntendedApplicationValues {
  job_title: string;
  hourly_rate: number;
  availability: string;
  experience_level: ExperienceLevel;
  email: string;
  portfolio_url: string;
  required_attachments_count: number;
  require_screening_answers: boolean;
}

export interface ActualApplicationValues {
  job_title: string;
  hourly_rate: string;
  availability: string;
  experience_level: string;
  email: string;
  portfolio_url: string;
  cover_letter: string;
  attachments_count: number;
  screening_answers: ScreeningAnswer[];
  uninspectable_fields: string[];
}

export type VerificationStatus =
  | 'verified'
  | 'error_detected'
  | 'missing_information'
  | 'unable_to_verify';

export interface VerificationCheckResult {
  fieldKey: string;
  fieldLabel: string;
  intendedDisplay: string;
  actualDisplay: string;
  status: VerificationStatus;
  message: string;
  remediation?: string;
}

export type ReadinessStatus =
  | 'Ready for submission'
  | 'Requires correction'
  | 'Missing information';

export interface VerificationReport {
  checkedAt: string;
  overallStatus: VerificationStatus;
  readinessStatus: ReadinessStatus;
  summaryMessage: string;
  checks: VerificationCheckResult[];
  counts: {
    verified: number;
    errors: number;
    missing: number;
    unableToVerify: number;
  };
}

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  action: string;
  detail: string;
  view: NavigationView;
}
