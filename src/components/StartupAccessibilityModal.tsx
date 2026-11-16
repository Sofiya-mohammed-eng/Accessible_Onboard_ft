import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Eye, Globe, Type, Volume2, VolumeX, X } from 'lucide-react';
import { SUPPORTED_LANGUAGES, getLocalizedCopy } from '../engines/i18n';
import { getPageCopy } from '../engines/pageCopy';
import {
  AccessibilityPreferences,
  GuidanceMode,
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

type Step = 'sr' | 'language' | 'guidance' | 'motor';

const GUIDANCE_OPTIONS: Array<{
  mode: GuidanceMode;
  en: { title: string; body: string };
  am: { title: string; body: string };
}> = [
  {
    mode: 'voice',
    en: { title: 'Voice + Screen Guide', body: 'I speak every prompt aloud and listen for your answers. Best if you cannot see the screen.' },
    am: { title: 'ድምጽ እና ስክሪን መመሪያ', body: 'እያንዳንዱን መመሪያ በድምጽ እናነባለሁ እና መልስዎን አዳምጣለሁ። ስክሪኑን ማየት ካልቻሉ ምርጥ ነው።' },
  },
  {
    mode: 'visual',
    en: { title: 'Visual Text Guide Only', body: 'Large, clear on-screen text and alerts. No speech, no microphone. Best if you are Deaf or hard of hearing.' },
    am: { title: 'የጽሑፍ መመሪያ ብቻ', body: 'ትልቅና ግልጽ የስክሪን ጽሑፍ እና ማሳወቂያ። ድምጽም ሆነ ማይክራፎን የለም። መስማት ካልቻሉ ምርጥ ነው።' },
  },
  {
    mode: 'standard',
    en: { title: 'Standard Self-Guided', body: 'No assistant. You move through the platform yourself with keyboard, touch, or screen reader.' },
    am: { title: 'መደበኛ ራስን መምራት', body: 'ረዳት የለም። መድረኩን በቁልፍ ሰሌዳ፣ በንክኪ ወይም በስክሪን አንባቢ ራስዎ ይመሩት።' },
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

  const [step, setStep] = useState<Step>('language');

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

  const selectGuidance = (mode: GuidanceMode) => {
    onStopSpeaking();
    onUpdatePreferences({ guidanceMode: mode, spokenGuidanceEnabled: mode === 'voice' });
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

  const finish = () => {
    onUpdatePreferences({ languageSelected: true, startupModalCompleted: true });
    onCompleteAndGo('login');
  };

  const heading =
    step === 'sr'
      ? amharic
        ? 'የስክሪን አንባቢ ተለይቷል'
        : 'Screen reader detected'
      : step === 'language'
        ? copy.languageStepTitle
        : step === 'guidance'
          ? amharic
            ? 'እንዴት እንድረዳዎ ይፈልጋሉ?'
            : 'How should I help you?'
          : amharic
            ? 'እንዴት መጠቀም ይፈልጋሉ?'
            : 'How will you use the platform?';

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
                  ? 'የስክሪን አንባቢ ተለይቷል። በስክሪን አንባቢዎ ብቻ መቀጠል ይፈልጋሉ፣ ወይስ ወደ አብሮ የድምጽ መመሪያ መቀየር ይፈልጋሉ?'
                  : 'Screen reader detected. Would you like to continue with your screen reader only, or switch to the built-in AI voice guide?'}
              </p>
              <p className="mt-2 text-sm" lang="am">
                የስክሪን አንባቢ ተለይቷል። በስክሪን አንባቢዎ ብቻ መቀጠል ይፈልጋሉ፣ ወይስ ወደ አብሮ የድምጽ መመሪያ መቀየር ይፈልጋሉ?
              </p>
              <p className="mt-1 text-sm" lang="en">
                Screen reader detected. Would you like to continue with your screen reader only, or switch to the built-in AI voice guide?
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

            <div role="radiogroup" aria-label="Preferred language" className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SUPPORTED_LANGUAGES.map((langOption, index) => {
                const selected = preferences.language === langOption.code;
                return (
                  <button
                    key={langOption.code}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    tabIndex={selected || (!preferences.languageSelected && index === 0) ? 0 : -1}
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

        {step === 'guidance' && (
          <div role="radiogroup" aria-label={amharic ? 'የእርዳታ ሁኔታ' : 'Guidance and output mode'} className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
            {GUIDANCE_OPTIONS.map((option, index) => {
              const selected = preferences.guidanceMode === option.mode;
              const text = option[amharic ? 'am' : 'en'];
              const Icon = option.mode === 'voice' ? Volume2 : option.mode === 'visual' ? Type : Eye;
              return (
                <button
                  key={option.mode}
                  ref={index === 0 ? primaryRef : undefined}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected || index === 0 ? 0 : -1}
                  onClick={() => selectGuidance(option.mode)}
                  className={`rounded-3xl border p-5 text-left shadow-[0_16px_40px_-28px_rgba(26,115,232,0.55)] transition hover:-translate-y-1 ${
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
        )}

        {step === 'motor' && (
          <div className="mt-6 space-y-3">
            <p className="text-sm leading-relaxed text-slate-600 high-contrast:text-slate-300">
              {amharic
                ? 'የዓይን እንቅስቃሴ በራስ-ሰር አይጀመርም። እዚህ ወይም በቅንብሮች ውስጥ ሲፈልጉ ብቻ ማብራት ይችላሉ።'
                : 'Eye gaze never starts automatically. Turn it on here or later in settings, only when you want it.'}
            </p>
            <button
              ref={primaryRef}
              type="button"
              role="switch"
              aria-checked={preferences.gazeControlEnabled}
              onClick={() => onUpdatePreferences({ gazeControlEnabled: !preferences.gazeControlEnabled })}
              className={`flex w-full items-center justify-between gap-4 rounded-2xl border-2 p-5 text-left ${
                preferences.gazeControlEnabled
                  ? 'border-[#1a73e8] bg-[#e7f3ff] high-contrast:border-yellow-300 high-contrast:bg-neutral-900'
                  : 'border-[#d5e6f7] bg-white high-contrast:border-slate-600 high-contrast:bg-black'
              }`}
            >
              <span>
                <span className="block text-lg font-bold text-[#001F3F] high-contrast:text-white">
                  {amharic ? 'ያለእጅ በዓይን እንቅስቃሴ መጠቀም' : 'Use hands-free eye gaze'}
                </span>
                <span className="mt-1 block text-sm text-slate-600 high-contrast:text-slate-300">
                  {amharic
                    ? 'ለእጅ እንቅስቃሴ ውስንነት ይረዳል። ማስተካከያ ይጠይቃል።'
                    : 'Helps with motor limitations. Requires a short calibration.'}
                </span>
              </span>
              <span
                className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition ${
                  preferences.gazeControlEnabled ? 'bg-[#1a73e8]' : 'bg-slate-300'
                }`}
                aria-hidden="true"
              >
                <span
                  className={`h-5 w-5 rounded-full bg-white transition ${preferences.gazeControlEnabled ? 'translate-x-5' : ''}`}
                />
              </span>
            </button>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 high-contrast:border-white">
          <div className="flex flex-wrap gap-2">
            {step === 'guidance' && (
              <button
                type="button"
                onClick={() => setStep('language')}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 high-contrast:border-white high-contrast:text-white"
              >
                {amharic ? 'ተመለስ' : 'Back'}
              </button>
            )}
            {step === 'motor' && (
              <button
                type="button"
                onClick={() => setStep('guidance')}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 high-contrast:border-white high-contrast:text-white"
              >
                {amharic ? 'ተመለስ' : 'Back'}
              </button>
            )}
          </div>
          {step === 'language' && (
            <button
              type="button"
              onClick={() => setStep('guidance')}
              className="inline-flex items-center gap-2 rounded-full bg-[#1a73e8] px-6 py-3.5 text-sm font-semibold text-white high-contrast:bg-yellow-300 high-contrast:text-black"
            >
              {copy.continueToSetup}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {step === 'guidance' && (
            <button
              type="button"
              onClick={() => setStep('motor')}
              className="inline-flex items-center gap-2 rounded-full bg-[#1a73e8] px-6 py-3.5 text-sm font-semibold text-white high-contrast:bg-yellow-300 high-contrast:text-black"
            >
              {amharic ? 'ቀጥል' : 'Continue'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {step === 'motor' && (
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
