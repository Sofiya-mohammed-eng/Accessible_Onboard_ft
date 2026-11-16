import React, { useEffect, useRef } from 'react';
import { ArrowRight, Check, Globe, Volume2, VolumeX, X } from 'lucide-react';
import { SUPPORTED_LANGUAGES, getLocalizedCopy } from '../engines/i18n';
import { getPageCopy } from '../engines/pageCopy';
import { AccessibilityPreferences, NavigationView, PreferredLanguage } from '../types/accessbridge';

interface StartupAccessibilityModalProps {
  isOpen: boolean;
  preferences: AccessibilityPreferences;
  isSpeaking: boolean;
  onUpdatePreferences: (patch: Partial<AccessibilityPreferences>) => void;
  onSpeakText: (text: string, langOverride?: string) => void;
  onStopSpeaking: () => void;
  onOpenNavigationHelper: () => void;
  onCompleteAndGo: (destination: NavigationView) => void;
  onClose?: () => void;
  canCloseDirectly: boolean;
}

export const StartupAccessibilityModal: React.FC<StartupAccessibilityModalProps> = ({
  isOpen,
  preferences,
  isSpeaking,
  onUpdatePreferences,
  onSpeakText,
  onStopSpeaking,
  onCompleteAndGo,
  onClose,
  canCloseDirectly,
}) => {
  const firstFocusRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const copy = getLocalizedCopy(preferences.language);
  const page = getPageCopy(preferences.language);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => firstFocusRef.current?.focus(), 0);
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
  }, [isOpen, canCloseDirectly]);

  if (!isOpen) return null;

  const selectLanguage = (code: PreferredLanguage) => {
    onStopSpeaking();
    onUpdatePreferences({ language: code, languageSelected: true });
  };

  const handleLanguageKeyDown = (
    event: React.KeyboardEvent<HTMLElement>,
    currentIndex: number
  ) => {
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
    modalRef.current
      ?.querySelector<HTMLButtonElement>(`[data-language="${next.code}"]`)
      ?.focus();
  };

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
              <Globe className="h-4 w-4" aria-hidden="true" />
              {copy.languageStepKicker}
            </p>
            <h1 id="startup-a11y-title" className="mt-1.5 font-display text-3xl font-bold text-[#001F3F] high-contrast:text-white">
              {copy.languageStepTitle}
            </h1>
            <p id="startup-a11y-subtitle" className="mt-2 max-w-2xl text-sm text-slate-600 high-contrast:text-slate-300">
              {copy.languageStepSubtitle}
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

        <button
          ref={firstFocusRef}
          type="button"
          onClick={
            isSpeaking
              ? onStopSpeaking
              : () =>
                  onSpeakText(
                    preferences.language === 'am'
                      ? 'እንግሊዝኛ ወይም አማርኛ ይምረጡ።'
                      : 'Please choose English or Amharic.',
                    preferences.language === 'am' ? 'am-ET' : 'en-US',
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

        <div className="mt-8 flex justify-end border-t border-slate-200 pt-5 high-contrast:border-white">
          <button
            type="button"
            onClick={() => {
              onUpdatePreferences({ languageSelected: true, startupModalCompleted: true });
              onCompleteAndGo('login');
            }}
            className="inline-flex items-center gap-2 rounded-full bg-[#1a73e8] px-6 py-3.5 text-sm font-semibold text-white high-contrast:bg-yellow-300 high-contrast:text-black"
          >
            {page.continueToSignIn}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
