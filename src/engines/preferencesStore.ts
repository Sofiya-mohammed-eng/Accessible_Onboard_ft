import {
  AccessibilityPreferences,
  ActivityLogItem,
  ApplicationDraft,
  IntendedApplicationValues,
} from '../types/accessbridge';

const KEYS = {
  PREFERENCES: 'accessbridge_preferences_v1',
  DRAFT: 'accessbridge_application_draft_v1',
  INTENDED: 'accessbridge_intended_values_v1',
  ACTIVITIES: 'accessbridge_activities_v1',
  STEPPER: 'accessbridge_application_stepper_v1',
} as const;

export const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  language: 'am',
  languageSelected: false,
  screenReaderCompatibility: true,
  highContrast: false,
  magnification: false,
  textSize: 'normal',
  textBasedNotifications: true,
  captions: true,
  visualAlerts: true,
  voiceCommands: false,
  keyboardNavigation: true,
  reducedClickNavigation: false,
  switchCompatibleControls: false,
  simplifiedInstructions: false,
  stepByStepNavigation: false,
  reducedInformationOverload: false,
  speechInput: false,
  textInput: true,
  alternativeInputMethods: false,
  preferredNavigationStyles: ['keyboard_screen_reader'],
  startupModalCompleted: false,
  colorMode: 'light',
  reducedMotion: false,
  speechRate: 1.0,
  spokenGuidanceEnabled: true,
  guidanceMode: 'voice',
  onboardingCompleted: false,
  gazeControlEnabled: false,
  gazeTrackingMode: 'hybrid',
  gazeActivationMode: 'both',
  gazeDwellMs: 800,
  gazeSensitivity: 0.6,
  gazeSmoothing: 0.45,
  gazeEdgeScrollSpeed: 500,
};

export const DEFAULT_INTENDED_VALUES: IntendedApplicationValues = {
  job_title: 'DevSecOps Engineer',
  hourly_rate: 25,
  availability: '20 hours/week',
  experience_level: 'Intermediate',
  email: 'alex.morgan@example.org',
  portfolio_url: 'https://github.com/alexmorgan-dev',
  required_attachments_count: 1,
  require_screening_answers: true,
};

export const DEFAULT_APPLICATION_DRAFT: ApplicationDraft = {
  jobId: 'job-upwork-devsecops',
  jobTitle: 'DevSecOps Engineer',
  employer: 'Northstar Cloud Security',
  platform: 'Upwork',
  contactEmail: 'alex.morgan@example.org',
  portfolioUrl: 'https://github.com/alexmorgan-dev',
  hourlyRate: '25',
  experienceLevel: 'Intermediate',
  availability: '20 hours/week',
  coverLetter:
    'I am an intermediate DevSecOps Engineer experienced in automated CI/CD security scanning, Terraform infrastructure auditing, and accessible internal documentation.',
  screeningAnswers: [
    {
      question: 'Describe your experience with automated security checks in CI/CD pipelines.',
      answer:
        'Configured GitHub Actions SAST, dependency scanning, and container image verification across production repositories.',
    },
    {
      question: 'Confirm your weekly availability and preferred async communication tools.',
      answer: 'Available 20 hours/week with structured written updates in Slack, Linear, or GitHub Issues.',
    },
  ],
  attachments: [
    {
      id: 'att-sample-resume',
      name: 'Alex_Morgan_DevSecOps_Resume.pdf',
      type: 'application/pdf',
      sizeLabel: '248 KB',
    },
  ],
  lastSavedAt: null,
};

export interface ApplicationStepperState {
  answers: Record<string, string>;
  step: number;
  agreed: boolean;
}

export const DEFAULT_APPLICATION_STEPPER: ApplicationStepperState = {
  answers: {},
  step: 1,
  agreed: true,
};

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function safeReadArray<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function loadPreferences(): AccessibilityPreferences {
  const loaded = safeRead(KEYS.PREFERENCES, DEFAULT_PREFERENCES);
  const guidanceMode =
    loaded.guidanceMode === 'visual' || loaded.guidanceMode === 'standard' || loaded.guidanceMode === 'voice'
      ? loaded.guidanceMode
      : DEFAULT_PREFERENCES.guidanceMode;
  return {
    ...loaded,
    language: loaded.language === 'am' ? 'am' : 'en',
    colorMode: loaded.colorMode === 'dark' ? 'dark' : 'light',
    guidanceMode,
  };
}

export function savePreferences(prefs: AccessibilityPreferences): void {
  try {
    window.localStorage.setItem(KEYS.PREFERENCES, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadApplicationDraft(): ApplicationDraft {
  return safeRead(KEYS.DRAFT, DEFAULT_APPLICATION_DRAFT);
}

export function saveApplicationDraft(draft: ApplicationDraft): void {
  try {
    window.localStorage.setItem(KEYS.DRAFT, JSON.stringify(draft));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadApplicationStepper(): ApplicationStepperState {
  const loaded = safeRead(KEYS.STEPPER, DEFAULT_APPLICATION_STEPPER);
  const step = typeof loaded.step === 'number' ? Math.min(7, Math.max(1, Math.round(loaded.step))) : 1;
  const answers =
    loaded.answers && typeof loaded.answers === 'object' ? (loaded.answers as Record<string, string>) : {};
  return { answers, step, agreed: loaded.agreed !== false };
}

export function saveApplicationStepper(state: ApplicationStepperState): void {
  try {
    window.localStorage.setItem(KEYS.STEPPER, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function clearApplicationStepper(): void {
  try {
    window.localStorage.removeItem(KEYS.STEPPER);
  } catch {
    // Ignore
  }
}

export function loadIntendedValues(): IntendedApplicationValues {
  return safeRead(KEYS.INTENDED, DEFAULT_INTENDED_VALUES);
}

export function saveIntendedValues(values: IntendedApplicationValues): void {
  try {
    window.localStorage.setItem(KEYS.INTENDED, JSON.stringify(values));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadActivities(): ActivityLogItem[] {
  return safeReadArray<ActivityLogItem>(KEYS.ACTIVITIES, [
    {
      id: 'act-init',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      action: 'Workspace initialized locally',
      detail: 'No personal data leaves your browser.',
      view: 'dashboard',
    },
  ]);
}

export function appendActivity(
  current: ActivityLogItem[],
  item: Omit<ActivityLogItem, 'id' | 'timestamp'>
): ActivityLogItem[] {
  const next: ActivityLogItem = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ...item,
  };
  const updated = [next, ...current].slice(0, 12);
  try {
    window.localStorage.setItem(KEYS.ACTIVITIES, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors gracefully
  }
  return updated;
}

export function clearAllLocalData(): void {
  try {
    Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // Ignore
  }
}
