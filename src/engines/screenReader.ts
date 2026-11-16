import { useSyncExternalStore } from 'react';

export type ScreenReaderSetting = 'auto' | 'on' | 'off';

export type ScreenReaderChoice = 'reader' | 'voice';

const STORAGE_KEY = 'accessbridge_screen_reader_v1';
const NOTICE_KEY = 'accessbridge_sr_notice_dismissed_v1';
const CHOICE_KEY = 'accessbridge_sr_choice_v1';

const listeners = new Set<() => void>();

let pointerUsed = false;
let keyboardOnly = false;
let keyboardNavCount = 0;
let cachedActive = false;
let installed = false;

const KEYBOARD_NAV_THRESHOLD = 3;

function readSetting(): ScreenReaderSetting {
  if (typeof window === 'undefined') return 'auto';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'on' || raw === 'off' ? raw : 'auto';
  } catch {
    return 'auto';
  }
}

function urlRequestsScreenReader(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const value = (params.get('screenreader') || params.get('sr') || '').toLowerCase();
    return value === '1' || value === 'true' || value === 'on';
  } catch {
    return false;
  }
}

function computeActive(): boolean {
  const setting = readSetting();
  if (setting === 'on') return true;
  if (setting === 'off') return false;
  return urlRequestsScreenReader() || keyboardOnly;
}

function refresh(): void {
  const next = computeActive();
  if (next === cachedActive) return;
  cachedActive = next;
  listeners.forEach((listener) => listener());
}

function installHeuristics(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  cachedActive = computeActive();

  const markPointer = () => {
    pointerUsed = true;
  };
  const markKeyboard = (event: KeyboardEvent) => {
    if (event.key !== 'Tab' && !event.key.startsWith('Arrow')) return;
    if (pointerUsed || keyboardOnly) return;
    keyboardNavCount += 1;
    if (keyboardNavCount < KEYBOARD_NAV_THRESHOLD) return;
    keyboardOnly = true;
    refresh();
  };

  window.addEventListener('pointerdown', markPointer, { passive: true });
  window.addEventListener('keydown', markKeyboard, true);
}

installHeuristics();

export function getScreenReaderSetting(): ScreenReaderSetting {
  return readSetting();
}

export function setScreenReaderSetting(setting: ScreenReaderSetting): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, setting);
  } catch {
    // Ignore storage quota/privacy-mode errors.
  }
  refresh();
}

export function isScreenReaderActive(): boolean {
  return cachedActive;
}

/**
 * The user's explicit resolution of the screen-reader-vs-voice-guide conflict.
 * `reader` means they keep using their own screen reader only (no synthesized
 * speech from us). `voice` means they opted into the built-in AI voice guide.
 */
export function getScreenReaderChoice(): ScreenReaderChoice | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CHOICE_KEY);
    return raw === 'reader' || raw === 'voice' ? raw : null;
  } catch {
    return null;
  }
}

export function setScreenReaderChoice(choice: ScreenReaderChoice | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (choice) window.localStorage.setItem(CHOICE_KEY, choice);
    else window.localStorage.removeItem(CHOICE_KEY);
  } catch {
    // Ignore storage quota/privacy-mode errors.
  }
  refresh();
}

/**
 * Whether auto-playing our own synthesized speech should be suppressed at
 * startup. We suppress it whenever the user has chosen screen-reader-only, or
 * when a screen reader is detected and the user has not yet resolved the
 * conflict. A stored `voice` choice always allows our voice to speak.
 */
export function shouldSuppressAutoSpeech(): boolean {
  const choice = getScreenReaderChoice();
  if (choice === 'voice') return false;
  if (choice === 'reader') return true;
  return computeActive();
}

export function subscribeScreenReader(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isScreenReaderNoticeDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(NOTICE_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissScreenReaderNotice(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NOTICE_KEY, '1');
  } catch {
    // Ignore.
  }
}

/**
 * Best-effort screen reader detection. Uses an explicit user override when set,
 * otherwise infers assistive-technology use when keyboard navigation happens
 * before any pointer input in the session.
 */
export function useScreenReaderActive(): boolean {
  return useSyncExternalStore(subscribeScreenReader, isScreenReaderActive, () => false);
}
