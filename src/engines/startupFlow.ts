import type { GazeErrorCode } from '../accessibility/gazeTypes';
import {
  AccessibilityPreferences,
  NavigationStyle,
  PreferredLanguage,
} from '../types/accessbridge';

export type StartupStep = 'language' | 'methods' | 'head';

export interface InteractionChoice {
  keyboard: boolean;
  voice: boolean;
  head: boolean;
  eye: boolean;
  pointer: boolean;
}

export const EMPTY_INTERACTION: InteractionChoice = {
  keyboard: false,
  voice: false,
  head: false,
  eye: false,
  pointer: false,
};

export type CameraChoice = 'head' | 'eye' | 'hybrid';

const CAMERA_CHOICE_KEY = 'allways-camera-choice';

export function gazeModeForChoice(choice: Pick<InteractionChoice, 'head' | 'eye'>): CameraChoice {
  if (choice.head && choice.eye) return 'hybrid';
  if (choice.eye) return 'eye';
  return 'head';
}

export function rememberCameraChoice(choice: Pick<InteractionChoice, 'head' | 'eye'>): void {
  try {
    sessionStorage.setItem(CAMERA_CHOICE_KEY, gazeModeForChoice(choice));
  } catch {
    // Ignore storage failures.
  }
}

export function cameraChoice(): CameraChoice {
  try {
    const saved = sessionStorage.getItem(CAMERA_CHOICE_KEY);
    if (saved === 'eye' || saved === 'hybrid' || saved === 'head') return saved;
  } catch {
    // Ignore storage failures.
  }
  return 'head';
}

export const WELCOME_LOADING = 'Starting AllWays';
export const WELCOME_TITLE = 'Welcome to AllWays';
export const WELCOME_CONTINUE = 'Continue';

const CAMERA_FAILURES = new Set<GazeErrorCode>([
  'permission-denied',
  'no-camera',
  'camera-busy',
  'unsupported',
  'unknown',
]);

export function welcomeFallsBackMs(phase: 'loading' | 'welcome', reducedMotion: boolean): number {
  if (phase === 'loading') return reducedMotion ? 500 : 2800;
  return reducedMotion ? 900 : 2200;
}

export function withSelectedLanguage(
  current: AccessibilityPreferences,
  language: PreferredLanguage,
): AccessibilityPreferences {
  return { ...current, language, languageSelected: true };
}

export function instructionSpeechCode(preferences: Pick<AccessibilityPreferences, 'language' | 'languageSelected'>): string | null {
  if (!preferences.languageSelected) return null;
  return preferences.language === 'am' ? 'am-ET' : 'en-US';
}

export function explicitLanguage(
  preferences: Pick<AccessibilityPreferences, 'language' | 'languageSelected'>,
): PreferredLanguage | null {
  return preferences.languageSelected ? preferences.language : null;
}

function addStyle(styles: NavigationStyle[], style: NavigationStyle): NavigationStyle[] {
  return styles.includes(style) ? styles : [...styles, style];
}

export function applyInteractionChoices(
  current: AccessibilityPreferences,
  choice: InteractionChoice,
): AccessibilityPreferences {
  let preferredNavigationStyles = current.preferredNavigationStyles;
  const next: AccessibilityPreferences = { ...current };
  if (choice.keyboard) {
    next.keyboardNavigation = true;
    next.switchCompatibleControls = true;
    preferredNavigationStyles = addStyle(preferredNavigationStyles, 'keyboard_screen_reader');
    preferredNavigationStyles = addStyle(preferredNavigationStyles, 'switch_reduced_click');
  }
  if (choice.voice) {
    next.speechInput = true;
    preferredNavigationStyles = addStyle(preferredNavigationStyles, 'voice_commands');
  }
  if (choice.pointer) {
    next.textInput = true;
    preferredNavigationStyles = addStyle(preferredNavigationStyles, 'standard');
  }
  next.preferredNavigationStyles = preferredNavigationStyles;
  return next;
}

export function afterMethods(choice: InteractionChoice): 'head' | 'login' {
  return choice.head || choice.eye ? 'head' : 'login';
}

export function gazeEnabledOnStartup(savedGazeEnabled: boolean): boolean {
  return savedGazeEnabled;
}

export function mayRequestCamera(headConfirmed: boolean): boolean {
  return headConfirmed;
}

export function gazeAfterHeadConfirmation(
  current: AccessibilityPreferences,
  accepted: boolean,
  mode: CameraChoice = 'head',
): AccessibilityPreferences {
  if (!accepted) return { ...current, gazeControlEnabled: false };
  return { ...current, gazeControlEnabled: true, gazeTrackingMode: mode };
}

export function cameraFailureDisablesHead(code: GazeErrorCode): boolean {
  return CAMERA_FAILURES.has(code);
}

export function finishWithoutHead(current: AccessibilityPreferences): AccessibilityPreferences {
  return { ...current, gazeControlEnabled: false, startupModalCompleted: true };
}

export function methodsPrompt(language: PreferredLanguage): string {
  if (language === 'am') {
    return 'የቁልፍ ሰሌዳ፣ ድምፅ፣ የጭንቅላት እንቅስቃሴ፣ የዓይን እንቅስቃሴ፣ ወይም ንክኪ መጠቀም ይችላሉ። ከአንድ በላይ መምረጥ ይችላሉ። ለመዝለል ዝለል ይበሉ።';
  }
  return 'You can use a keyboard, voice, head movement, eye movement, or touch. You can choose more than one. Say skip if you want to continue without choosing.';
}

export function methodsRetry(language: PreferredLanguage): string {
  if (language === 'am') return 'ቁልፍ ሰሌዳ፣ ድምፅ፣ ጭንቅላት፣ ዓይን፣ ንክኪ፣ ወይም ዝለል ይበሉ።';
  return 'Say keyboard, voice, head, eye, touch, or skip.';
}

export function headPrompt(language: PreferredLanguage, mode: CameraChoice = 'head'): string {
  if (language === 'am') {
    if (mode === 'eye') {
      return 'የዓይን እንቅስቃሴ ወደ ቁልፍ በመመልከት እንዲመርጡ ያደርጋል። ካሜራ ይጠቀማል። ላበራው? አዎ ወይም አይ ይበሉ።';
    }
    if (mode === 'hybrid') {
      return 'የጭንቅላት እና የዓይን እንቅስቃሴ ካሜራ ይጠቀማሉ። ላበራ? አዎ ወይም አይ ይበሉ።';
    }
    return 'የጭንቅላት እንቅስቃሴ ጭንቅላትዎን ወደ ቁልፍ በማንቀሳቀስ እንዲመርጡ ያደርጋል። ካሜራ ይጠቀማል። ላበራው? አዎ ወይም አይ ይበሉ።';
  }
  if (mode === 'eye') {
    return 'Eye movement lets you look at a button and rest there to select it. It uses your camera. Do you want to turn it on? Say yes or no.';
  }
  if (mode === 'hybrid') {
    return 'Head and eye movement let you look or move your head to a button. They use your camera. Do you want to turn them on? Say yes or no.';
  }
  return 'Head movement lets you move your head to a button and rest there to select it. It uses your camera. Do you want to turn it on? Say yes or no.';
}

export function headRetry(language: PreferredLanguage): string {
  if (language === 'am') return 'አዎ ወይም አይ ይበሉ።';
  return 'Say yes or no.';
}

export function headEnabledMessage(language: PreferredLanguage, mode: CameraChoice = 'head'): string {
  if (language === 'am') {
    if (mode === 'eye') return 'የዓይን እንቅስቃሴ በርቷል። ካሜራውን ከፈቀዱ በኋላ ወደ ቁልፍ ይመልከቱ እና ትንሽ ይቆዩ።';
    if (mode === 'hybrid') return 'የጭንቅላት እና የዓይን እንቅስቃሴ በርተዋል። ካሜራውን ከፈቀዱ በኋላ ወደ ቁልፍ ይመልከቱ ወይም ጭንቅላትዎን ያንቀሳቅሱ።';
    return 'የጭንቅላት እንቅስቃሴ በርቷል። ካሜራውን ከፈቀዱ በኋላ ጭንቅላትዎን ወደ ቁልፍ ያንቀሳቅሱ እና ትንሽ ይቆዩ።';
  }
  if (mode === 'eye') return 'Eye movement is on. After you allow the camera, look at a button and rest there.';
  if (mode === 'hybrid') return 'Head and eye movement are on. After you allow the camera, look at a button or move your head to it.';
  return 'Head movement is on. After you allow the camera, move your head to a button and rest there.';
}

export function headDeclinedMessage(language: PreferredLanguage, mode: CameraChoice = 'head'): string {
  if (language === 'am') {
    if (mode === 'eye') return 'እሺ። ያለ የዓይን እንቅስቃሴ እንቀጥላለን።';
    if (mode === 'hybrid') return 'እሺ። ያለ የጭንቅላት እና የዓይን እንቅስቃሴ እንቀጥላለን።';
    return 'እሺ። ያለ የጭንቅላት እንቅስቃሴ እንቀጥላለን።';
  }
  if (mode === 'eye') return 'Okay. We will continue without eye movement.';
  if (mode === 'hybrid') return 'Okay. We will continue without head or eye movement.';
  return 'Okay. We will continue without head movement.';
}

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

const KEYBOARD_PATTERNS = [/\bkeyboard\b/i, /\bswitch\b/i, /ቁልፍ ሰሌዳ/, /ስዊች/];
const VOICE_PATTERNS = [/\bvoice\b/i, /\bspeak\b/i, /\btalk\b/i, /ድምፅ/, /ድምጽ/];
const HEAD_PATTERNS = [/\bhead\b/i, /ጭንቅላት/];
const EYE_PATTERNS = [/\beyes?\b/i, /ዓይን/, /አይን/];
const POINTER_PATTERNS = [/\btouch\b/i, /\bmouse\b/i, /\btap\b/i, /ንክኪ/, /መዳፊያ/];
const SKIP_PATTERNS = [/\bskip\b/i, /ዝለል/, /እለፍ/];
const YES_PATTERNS = [/\byes\b/i, /\byeah\b/i, /\byep\b/i, /አዎ/, /እሺ/];
const NO_PATTERNS = [/\bno\b/i, /አይደለም/, /አይ/];

export function interpretInteractionUtterance(text: string): { skip: boolean; choice: InteractionChoice } | null {
  const heard = text.trim();
  if (!heard) return null;
  const choice: InteractionChoice = {
    keyboard: hasAny(heard, KEYBOARD_PATTERNS),
    voice: hasAny(heard, VOICE_PATTERNS),
    head: hasAny(heard, HEAD_PATTERNS),
    eye: hasAny(heard, EYE_PATTERNS),
    pointer: hasAny(heard, POINTER_PATTERNS),
  };
  const picked = choice.keyboard || choice.voice || choice.head || choice.eye || choice.pointer;
  if (picked) return { skip: false, choice };
  if (hasAny(heard, SKIP_PATTERNS)) return { skip: true, choice: EMPTY_INTERACTION };
  return null;
}

export function interpretHeadConfirmation(text: string): 'yes' | 'no' | null {
  const heard = text.trim();
  if (!heard) return null;
  if (hasAny(heard, NO_PATTERNS)) return 'no';
  if (hasAny(heard, YES_PATTERNS)) return 'yes';
  return null;
}
