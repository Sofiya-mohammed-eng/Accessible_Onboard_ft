import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Eye, EyeOff, Globe, Type, Volume2, VolumeX, X } from 'lucide-react';
import { SUPPORTED_LANGUAGES, getLocalizedCopy } from '../engines/i18n';
import { getPageCopy } from '../engines/pageCopy';
import {
  AccessibilityPreferences,
  NavigationView,
  PreferredLanguage,
} from '../types/accessbridge';

export type ScreenReaderResolution = 'reader' | 'voice';

interface StartupAccessibilityModalProps {
  isOpen: boolean;
  preferences: AccessibilityPreferences;
  isSpeaking: boolean;
  screenReaderActive: boolean;
  screenReaderResolved: boolean;
  onUpdatePreferences: (patch: Partial<AccessibilityPreferences>) => void;
  onResolveScreenReader: (choice: ScreenReaderResolution) => void;
  onSpeakText: (text: string, langOverride?: string) => void;
  onStopSpeaking: () => void;
  onOpenNavigationHelper: () => void;
  onCompleteAndGo: (destination: NavigationView) => void;
  onClose?: () => void;
  canCloseDirectly: boolean;
}

type Step = 'sr' | 'language';
type InteractionProfile = 'voice' | 'visual' | 'motor' | 'standard';

const PROFILE_OPTIONS: Array<{
  id: InteractionProfile;
  en: { title: string; body: string };
  am: { title: string; body: string };
}> = [
  {
    id: 'voice',
    en: { title: 'Profile A: Voice & Audio Guide', body: 'Read-aloud guidance and voice input are available while this profile is selected. Best for blind and low-vision users.' },
    am: { title: 'መገለጫ A፦ የድምጽ መመሪያ', body: 'ይህ መገለጫ ሲመረጥ የድምጽ መመሪያና የድምጽ ግብዓት ይኖራሉ። ለዓይነ ስውራንና ዝቅተኛ እይታ ላላቸው ተስማሚ ነው።' },
  },
  {
    id: 'visual',
    en: { title: 'Profile B: Visual Text Guide Only', body: 'Large, clear on-screen text and alerts. No synthesized speech or microphone use. Best for Deaf and hard-of-hearing users.' },
    am: { title: 'መገለጫ B፦ የጽሑፍ መመሪያ ብቻ', body: 'ትልቅና ግልጽ የስክሪን ጽሑፍና ማሳወቂያ። የተዋሃደ ድምጽም ሆነ ማይክራፎን አይጠቀምም። ለመስማት ችግር ላላቸው ተስማሚ ነው።' },
  },
  {
    id: 'motor',
    en: { title: 'Profile C: Eye Gaze / Head Tracking', body: 'For motor access. Selecting this profile explicitly enables gaze control and may request camera permission; it never starts before your choice.' },
    am: { title: 'መገለጫ C፦ የዓይን / የራስ እንቅስቃሴ', body: 'ለእንቅስቃሴ ድጋፍ። ይህን መገለጫ መምረጥ የዓይን ቁጥጥርን በግልጽ ፈቃድዎ ያበራል፤ የካሜራ ፈቃድ ሊጠይቅ ይችላል። ከመምረጥዎ በፊት አይጀምርም።' },
  },
  {
    id: 'standard',
    en: { title: 'Profile D: Standard / Self-Guided', body: 'No assistant audio or microphone. Use the platform yourself with keyboard, touch, or your screen reader.' },
    am: { title: 'መገለጫ D፦ መደበኛ / ራስን መምራት', body: 'የረዳት ድምጽም ሆነ ማይክራፎን የለም። መድረኩን በቁልፍ ሰሌዳ፣ በንክኪ ወይም በስክሪን አንባቢ ይጠቀሙ።' },
  },
];

export const StartupAccessibilityModal: React.FC<StartupAccessibilityModalProps> = ({
  isOpen,
  preferences,
  isSpeaking,
  screenReaderActive,
  screenReaderResolved,
  onUpdatePreferences,
  onResolveScreenReader,
  onSpeakText,
  onStopSpeaking,
  onCompleteAndGo,
  onClose,
  canCloseDirectly,
}) => {
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const copy = getLocalizedCopy(preferences.language);
  const page = getPageCopy(preferences.language);
  const amharic = preferences.language === 'am';

  const [step, setStep] = useState<Step>(() =>
    screenReaderActive && !screenReaderResolved ? 'sr' : 'language'
  );

  useEffect(() => {
    if (!isOpen) return;
    setStep(screenReaderActive && !screenReaderResolved ? 'sr' : 'language');
  }, [isOpen, screenReaderActive, screenReaderResolved]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => primaryRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && canCloseDirectly && onCloseRef.current) {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !modalRef.current) return;
      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen, canCloseDirectly, step]);

  if (!isOpen) return null;

  const selectLanguage = (code: PreferredLanguage) => {
    onStopSpeaking();
    onUpdatePreferences({ language: code, languageSelected: true });
  };

  const selectProfile = (profile: InteractionProfile) => {
    onStopSpeaking();
    if (profile === 'motor') {
      onUpdatePreferences({
        guidanceMode: 'standard',
        spokenGuidanceEnabled: false,
        gazeControlEnabled: true,
      });
      return;
    }
    if (profile === 'voice' && (screenReaderActive || screenReaderResolved)) {
      onResolveScreenReader('voice');
    }
    onUpdatePreferences({
      guidanceMode: profile,
      spokenGuidanceEnabled: profile === 'voice',
      gazeControlEnabled: false,
    });
  };

  const handleLanguageKeyDown = (event: React.KeyboardEvent<HTMLElement>, currentIndex: number) => {
    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % SUPPORTED_LANGUAGES.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + SUPPORTED_LANGUAGES.length) % SUPPORTED_LANGUAGES.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = SUPPORTED_LANGUAGES.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    const next = SUPPORTED_LANGUAGES[nextIndex];
    selectLanguage(next.code);
    modalRef.current?.querySelector<HTMLButtonElement>(`[data-language="${next.code}"]`)?.focus();
  };

  const handleProfileKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const buttons = Array.from(
      modalRef.current?.querySelectorAll<HTMLButtonElement>('[data-profile]') || [],
    );
    if (buttons.length === 0) return;
    event.preventDefault();
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    const delta = forward ? 1 : -1;
    const columns = window.matchMedia('(min-width: 640px)').matches ? 2 : 1;
    let nextIndex: number;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      if (columns === 1) {
        nextIndex = (currentIndex + delta + buttons.length) % buttons.length;
      } else {
        const rowStart = Math.floor(currentIndex / columns) * columns;
        const column = (currentIndex % columns + delta + columns) % columns;
        nextIndex = Math.min(rowStart + column, buttons.length - 1);
      }
    } else {
      nextIndex = (currentIndex + delta * columns + buttons.length) % buttons.length;
    }
    buttons[nextIndex].focus();
  };

  const readProfilesAloud = () => {
    const text = PROFILE_OPTIONS.map((option) => {
      const description = option[amharic ? 'am' : 'en'];
      return `${description.title}. ${description.body}`;
    }).join(' ');
    onSpeakText(text, amharic ? 'am-ET' : 'en-US');
  };

  const finish = () => {
    onUpdatePreferences({ languageSelected: true, startupModalCompleted: true });
    onCompleteAndGo('login');
  };

  const heading =
    step === 'sr'
      ? amharic
        ? 'የስክሪን አንባቢ ተለይቷል'
        : 'Screen reader detected'
      : copy.languageStepTitle;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="startup-a11y-title"
      aria-describedby="startup-a11y-subtitle"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#0e2a4a]/45 p-4 backdrop-blur-md"
    >
      <div
        ref={modalRef}
        className="my-auto w-full max-w-4xl rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_40px_90px_-30px_rgba(26,115,232,0.55)] backdrop-blur-xl sm:p-8 high-contrast:border-yellow-300 high-contrast:bg-black"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5 high-contrast:border-white">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0056B3] high-contrast:text-cyan-300">
              {step === 'sr' ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Globe className="h-4 w-4" aria-hidden="true" />}
              {amharic ? 'መጀመሪያ ማዋቀሪያ' : 'Startup setup'}
            </p>
            <h1 id="startup-a11y-title" className="mt-1.5 font-display text-3xl font-bold text-[#001F3F] high-contrast:text-white">
              {heading}
            </h1>
            <p id="startup-a11y-subtitle" className="mt-2 max-w-2xl text-sm text-slate-600 high-contrast:text-slate-300">
              {step === 'sr'
                ? amharic
                  ? 'ከመጀመርዎ በፊት አንድ ምርጫ እንፈልጋለን።'
                  : 'One choice before we begin.'
                : amharic
                  ? 'በማንኛውም ጊዜ መቀየር ይችላሉ።'
                  : 'You can change all of this at any time.'}
            </p>
          </div>
          {canCloseDirectly && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close accessibility settings"
              className="rounded-lg border border-slate-300 p-2 text-slate-700 high-contrast:border-white high-contrast:text-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {step === 'sr' && (
          <div className="mt-5">
            <div
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="rounded-2xl border-2 border-[#1a73e8] bg-[#e7f3ff] p-5 text-[#0e2a4a] high-contrast:border-yellow-300 high-contrast:bg-neutral-900 high-contrast:text-white"
            >
              <p className="text-lg font-semibold leading-relaxed">
                {amharic
                  ? 'የስክሪን አንባቢ ተለይቷል። ስክሪን አንባቢዎን ብቻ መጠቀም ይፈልጋሉ፣ ወይስ አብሮ የተሰራውን ረዳት?'
                  : 'Screen reader detected. Would you like to use your screen reader, or the built-in assistant?'}
              </p>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                ref={primaryRef}
                type="button"
                onClick={() => {
                  onResolveScreenReader('reader');
                  setStep('language');
                }}
                className="rounded-2xl border-2 border-[#1a73e8] bg-white p-5 text-left text-[#001F3F] high-contrast:border-yellow-300 high-contrast:bg-black high-contrast:text-white"
              >
                <span className="block text-lg font-bold">{amharic ? 'በስክሪን አንባቢዬ ብቻ' : 'My screen reader only'}</span>
                <span className="mt-1 block text-sm text-slate-600 high-contrast:text-slate-300">
                  {amharic ? 'ምንም ተጨማሪ ድምጽ አይሰማም።' : 'No extra synthesized speech will play.'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onResolveScreenReader('voice');
                  setStep('language');
                }}
                className="rounded-2xl border-2 border-[#d5e6f7] bg-white p-5 text-left text-[#001F3F] high-contrast:border-slate-600 high-contrast:bg-black high-contrast:text-white"
              >
                <span className="block text-lg font-bold">{amharic ? 'ወደ AI ድምጽ መመሪያ ቀይር' : 'Switch to the AI voice guide'}</span>
                <span className="mt-1 block text-sm text-slate-600 high-contrast:text-slate-300">
                  {amharic ? 'አብሮ ረዳቴ በድምጽ ይመራዎታል።' : 'The built-in assistant will guide you aloud.'}
                </span>
              </button>
            </div>
          </div>
        )}

        {step === 'language' && (
          <>
            {preferences.guidanceMode === 'voice' && (
              <button
                ref={primaryRef}
                type="button"
                onClick={
                  isSpeaking
                    ? onStopSpeaking
                    : () =>
                        onSpeakText(
                          amharic ? 'እንግሊዝኛ ወይም አማርኛ ይምረጡ።' : 'Please choose English or Amharic.',
                          amharic ? 'am-ET' : 'en-US'
                        )
                }
                className="mt-5 inline-flex items-center gap-2 rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm font-semibold text-[#001F3F] high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              >
                {isSpeaking ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
                {isSpeaking ? page.stopReading : copy.readLanguagesAloud}
              </button>
            )}

            <div role="radiogroup" aria-label="Preferred language" className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SUPPORTED_LANGUAGES.map((langOption, index) => {
                const selected = preferences.language === langOption.code;
                return (
                  <button
                    key={langOption.code}
                    ref={
                      selected && preferences.guidanceMode !== 'voice'
                        ? primaryRef
                        : undefined
                    }
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    tabIndex={selected ? 0 : -1}
                    data-language={langOption.code}
                    onKeyDown={(event) => handleLanguageKeyDown(event, index)}
                    onClick={() => selectLanguage(langOption.code)}
                    className={`rounded-3xl border p-5 text-left shadow-[0_16px_40px_-28px_rgba(26,115,232,0.55)] transition hover:-translate-y-1 ${
                      selected
                        ? 'border-[#1a73e8] bg-gradient-to-br from-white to-[#d7ebff] high-contrast:border-yellow-300 high-contrast:bg-neutral-900'
                        : 'border-[#d5e6f7] bg-white/90 high-contrast:border-slate-600 high-contrast:bg-black'
                    }`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block font-display text-xl font-bold text-[#001F3F] high-contrast:text-white">
                          {langOption.nativeName}
                        </span>
                        <span className="mt-1 block text-sm text-slate-600 high-contrast:text-slate-300">
                          {langOption.englishName}
                        </span>
                        <span className="mt-2 block text-xs text-slate-500 high-contrast:text-slate-400">
                          {langOption.greeting}
                        </span>
                      </span>
                      {selected && <Check className="h-5 w-5 text-[#0056B3] high-contrast:text-yellow-300" aria-hidden="true" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 'language' && (
          <>
            {preferences.guidanceMode === 'voice' && (
              <button
                type="button"
                onClick={isSpeaking ? onStopSpeaking : readProfilesAloud}
                className="mt-5 inline-flex items-center gap-2 rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm font-semibold text-[#001F3F] high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              >
                {isSpeaking ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
                {isSpeaking
                  ? page.stopReading
                  : amharic
                    ? 'የመገለጫ ምርጫዎችን በድምጽ ያዳምጡ'
                    : 'Read profile options aloud'}
              </button>
            )}
            <div
              role="group"
              aria-label={amharic ? 'የመገለጫ ምርጫዎች' : 'Interaction profiles'}
              className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              {PROFILE_OPTIONS.map((option, index) => {
                const selected =
                  option.id === 'motor'
                    ? preferences.gazeControlEnabled
                    : !preferences.gazeControlEnabled && preferences.guidanceMode === option.id;
                const text = option[amharic ? 'am' : 'en'];
                const Icon =
                  option.id === 'voice'
                    ? Volume2
                    : option.id === 'visual'
                      ? Type
                      : option.id === 'motor'
                        ? Eye
                        : EyeOff;
                return (
                  <button
                    key={option.id}
                    type="button"
                    data-profile={option.id}
                    aria-pressed={selected}
                    onKeyDown={(event) => handleProfileKeyDown(event, index)}
                    onClick={() => selectProfile(option.id)}
                    className={`min-h-36 rounded-3xl border p-5 text-left shadow-[0_16px_40px_-28px_rgba(26,115,232,0.55)] transition hover:-translate-y-1 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#0056B3] ${
                      selected
                        ? 'border-[#1a73e8] bg-gradient-to-br from-white to-[#d7ebff] high-contrast:border-yellow-300 high-contrast:bg-neutral-900'
                        : 'border-[#d5e6f7] bg-white/90 high-contrast:border-slate-600 high-contrast:bg-black'
                    }`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <Icon className="h-6 w-6 text-[#0056B3] high-contrast:text-cyan-300" aria-hidden="true" />
                        <span className="mt-2 block font-display text-lg font-bold text-[#001F3F] high-contrast:text-white">
                          {text.title}
                        </span>
                        <span className="mt-1 block text-sm leading-relaxed text-slate-600 high-contrast:text-slate-300">
                          {text.body}
                        </span>
                      </span>
                      {selected && <Check className="h-5 w-5 shrink-0 text-[#0056B3] high-contrast:text-yellow-300" aria-hidden="true" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 high-contrast:border-white">
          {step === 'language' && (
            <button
              type="button"
              onClick={finish}
              className="inline-flex items-center gap-2 rounded-full bg-[#1a73e8] px-6 py-3.5 text-sm font-semibold text-white high-contrast:bg-yellow-300 high-contrast:text-black"
            >
              {page.continueToSignIn}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
