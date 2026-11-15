import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Eye, Globe, Keyboard, Mic, MousePointer2, Move, Volume2, VolumeX, X } from 'lucide-react';
import { SUPPORTED_LANGUAGES, getLanguageOption, getLocalizedCopy } from '../engines/i18n';
import { getPageCopy } from '../engines/pageCopy';
import { AccessibilityPreferences, PreferredLanguage } from '../types/accessbridge';
import {
  EMPTY_INTERACTION,
  InteractionChoice,
  StartupStep,
  explicitLanguage,
  cameraChoice,
  headPrompt,
  methodsPrompt,
} from '../engines/startupFlow';

interface StartupAccessibilityModalProps {
  isOpen: boolean;
  step: StartupStep;
  preferences: AccessibilityPreferences;
  isSpeaking: boolean;
  onUpdatePreferences: (patch: Partial<AccessibilityPreferences>) => void;
  onSpeakText: (text: string, langOverride?: string) => void;
  onStopSpeaking: () => void;
  onContinueFromLanguage: () => void;
  onContinueFromMethods: (choice: InteractionChoice) => void;
  onSkipMethods: () => void;
  onConfirmHead: (accepted: boolean) => void;
  onBackToLanguage: () => void;
  onBackToMethods: () => void;
  onClose?: () => void;
  canCloseDirectly: boolean;
}

export const StartupAccessibilityModal: React.FC<StartupAccessibilityModalProps> = ({
  isOpen,
  step,
  preferences,
  isSpeaking,
  onUpdatePreferences,
  onSpeakText,
  onStopSpeaking,
  onContinueFromLanguage,
  onContinueFromMethods,
  onSkipMethods,
  onConfirmHead,
  onBackToLanguage,
  onBackToMethods,
  onClose,
  canCloseDirectly,
}) => {
  const firstFocusRef = useRef<HTMLButtonElement | null>(null);
  const copy = getLocalizedCopy(preferences.language);
  const page = getPageCopy(preferences.language);
  const chosenLanguage = explicitLanguage(preferences);
  const [methods, setMethods] = useState<InteractionChoice>(EMPTY_INTERACTION);
  const amharic = preferences.language === 'am';

  useEffect(() => {
    if (step === 'methods') setMethods(EMPTY_INTERACTION);
  }, [step]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => firstFocusRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && canCloseDirectly && onClose) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, canCloseDirectly, onClose, step]);

  if (!isOpen) return null;

  const selectLanguage = (code: PreferredLanguage) => {
    onStopSpeaking();
    onUpdatePreferences({ language: code, languageSelected: true });
  };

  const toggleMethod = (key: keyof InteractionChoice) => {
    setMethods((current) => ({ ...current, [key]: !current[key] }));
  };

  const readAloud = () => {
    if (isSpeaking) {
      onStopSpeaking();
      return;
    }
    const text =
      step === 'head'
        ? headPrompt(preferences.language, cameraChoice())
        : step === 'methods'
          ? methodsPrompt(preferences.language)
          : amharic
            ? 'እንግሊዝኛ ወይም አማርኛ ይምረጡ።'
            : 'Please choose English or Amharic.';
    onSpeakText(text, step === 'language' ? 'en-US' : getLanguageOption(preferences.language).speechLang);
  };

  const methodButtons: Array<{ key: keyof InteractionChoice; title: string; detail: string; icon: typeof Keyboard }> = [
    {
      key: 'keyboard',
      title: amharic ? 'የቁልፍ ሰሌዳ እና ስዊች' : 'Keyboard and switch',
      detail: amharic
        ? 'ታብ እና ኢንተር ይጠቀሙ። ስዊች እነዚህን ቁልፎች ቢልክም ይሠራል።'
        : 'Use Tab and Enter. A switch that sends those keys works too.',
      icon: Keyboard,
    },
    {
      key: 'voice',
      title: amharic ? 'ድምፅ' : 'Voice',
      detail: amharic ? 'መልስዎን ይናገሩ። AllWays እያዳመጠ ነው።' : 'Speak your answers. AllWays is listening.',
      icon: Mic,
    },
    {
      key: 'head',
      title: amharic ? 'የጭንቅላት እንቅስቃሴ' : 'Head movement',
      detail: amharic
        ? 'ካሜራ አይጠየቅም እስክትሉ ድረስ። ቀጥሎ እንጠይቃለን።'
        : 'The camera stays off until you confirm on the next step.',
      icon: Move,
    },
    {
      key: 'eye',
      title: amharic ? 'የዓይን እንቅስቃሴ' : 'Eye movement',
      detail: amharic
        ? 'ወደ ቁልፍ ይመልከቱ። ካሜራው ቀጥሎ ይጠየቃል።'
        : 'Look at a button to choose it. The camera is requested on the next step.',
      icon: Eye,
    },
    {
      key: 'pointer',
      title: amharic ? 'ንክኪ እና መዳፊያ' : 'Touch and mouse',
      detail: amharic ? 'መታ ያድርጉ ወይም ጠቅ ያድርጉ። ይህ አሁንም ይሠራል።' : 'Tap or click. This already works.',
      icon: MousePointer2,
    },
  ];
  const camera = cameraChoice();
  const cameraKicker = amharic
    ? camera === 'eye'
      ? 'የዓይን እንቅስቃሴ'
      : camera === 'hybrid'
        ? 'ዓይን እና ጭንቅላት'
        : 'የጭንቅላት እንቅስቃሴ'
    : camera === 'eye'
      ? 'Eye movement'
      : camera === 'hybrid'
        ? 'Eye and head movement'
        : 'Head movement';
  const cameraTitle = amharic
    ? camera === 'eye'
      ? 'የዓይን እንቅስቃሴ ልክፈት?'
      : camera === 'hybrid'
        ? 'ዓይን እና ጭንቅላት ልክፈት?'
        : 'የጭንቅላት እንቅስቃሴ ልክፈት?'
    : camera === 'eye'
      ? 'Turn on eye movement?'
      : camera === 'hybrid'
        ? 'Turn on eye and head movement?'
        : 'Turn on head movement?';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="startup-a11y-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#0e2a4a]/45 p-4 backdrop-blur-md"
    >
      <div className="my-auto w-full max-w-4xl rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_40px_90px_-30px_rgba(26,115,232,0.55)] backdrop-blur-xl sm:p-8 high-contrast:border-yellow-300 high-contrast:bg-black">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5 high-contrast:border-white">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0056B3] high-contrast:text-cyan-300">
              <Globe className="h-4 w-4" aria-hidden="true" />
              {step === 'language'
                ? copy.languageStepKicker
                : step === 'head'
                  ? cameraKicker
                  : amharic
                    ? 'እንዴት መጠቀም እንደሚፈልጉ'
                    : 'How you want to interact'}
            </p>
            <h1 id="startup-a11y-title" className="mt-1.5 font-display text-3xl font-bold text-[#001F3F] high-contrast:text-white">
              {step === 'language'
                ? copy.languageStepTitle
                : step === 'head'
                  ? cameraTitle
                  : amharic
                    ? 'የትኞቹን መንገዶች ይጠቀማሉ?'
                    : 'Which ways do you want to use?'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 high-contrast:text-slate-300">
              {step === 'language'
                ? copy.languageStepSubtitle
                : step === 'head'
                  ? headPrompt(preferences.language, cameraChoice())
                  : amharic
                    ? 'ከአንድ በላይ መምረጥ ይችላሉ። ወይም ይዝለሉ።'
                    : 'You can choose more than one, or skip this step.'}
            </p>
          </div>
          {canCloseDirectly && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg border border-slate-300 p-2 text-slate-700 high-contrast:border-white high-contrast:text-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>

        <button
          ref={firstFocusRef}
          type="button"
          onClick={readAloud}
          className="mt-5 inline-flex items-center gap-2 rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm font-semibold text-[#001F3F] high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
        >
          {isSpeaking ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
          {isSpeaking ? page.stopReading : step === 'language' ? copy.readLanguagesAloud : amharic ? 'አማራጮችን አንብብ' : 'Read the choices'}
        </button>

        {step === 'language' && (
          <div role="radiogroup" aria-label="Preferred language" className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SUPPORTED_LANGUAGES.map((langOption) => {
              const selected = chosenLanguage === langOption.code;
              const showEnglishName = langOption.englishName !== langOption.nativeName;
              return (
                <button
                  key={langOption.code}
                  type="button"
                  role="radio"
                  aria-checked={selected}
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
                      {showEnglishName && (
                        <span className="mt-1 block text-sm text-slate-600 high-contrast:text-slate-300">
                          {langOption.englishName}
                        </span>
                      )}
                    </span>
                    {selected && <Check className="h-5 w-5 text-[#0056B3] high-contrast:text-yellow-300" aria-hidden="true" />}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {step === 'methods' && (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {methodButtons.map((method) => {
              const selected = methods[method.key];
              const Icon = method.icon;
              return (
                <button
                  key={method.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleMethod(method.key)}
                  className={`rounded-3xl border p-5 text-left shadow-[0_16px_40px_-28px_rgba(26,115,232,0.55)] ${
                    selected
                      ? 'border-[#1a73e8] bg-gradient-to-br from-white to-[#d7ebff]'
                      : 'border-[#d5e6f7] bg-white/90'
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <Icon className="mt-1 h-5 w-5 shrink-0 text-[#0056B3]" aria-hidden="true" />
                    <span>
                      <span className="block font-display text-xl font-bold text-[#001F3F]">{method.title}</span>
                      <span className="mt-1 block text-sm text-slate-600">{method.detail}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {step === 'head' && (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onConfirmHead(true)}
              className="rounded-3xl border border-[#d5e6f7] bg-white/90 p-5 text-left"
            >
              <span className="block font-display text-xl font-bold text-[#001F3F]">{amharic ? 'አዎ' : 'Yes, turn it on'}</span>
              <span className="mt-1 block text-sm text-slate-600">
                {amharic ? 'ከዚያ አሳሽ ካሜራውን ይጠይቃል።' : 'The browser will then ask for the camera.'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onConfirmHead(false)}
              className="rounded-3xl border border-[#d5e6f7] bg-white/90 p-5 text-left"
            >
              <span className="block font-display text-xl font-bold text-[#001F3F]">{amharic ? 'አይ' : 'No, continue'}</span>
              <span className="mt-1 block text-sm text-slate-600">
                {amharic ? 'ካሜራ አይጠየቅም።' : 'The camera will not be requested.'}
              </span>
            </button>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-200 pt-5 high-contrast:border-white">
          {step === 'language' ? (
            <span />
          ) : (
            <button
              type="button"
              onClick={step === 'head' ? onBackToMethods : onBackToLanguage}
              className="inline-flex items-center gap-2 rounded-full border border-[#d5e6f7] px-5 py-3 text-sm font-semibold text-[#001F3F]"
            >
              {step === 'head' ? (amharic ? 'ተመለስ' : 'Back') : amharic ? 'ቋንቋ ቀይር' : 'Change language'}
            </button>
          )}
          {step === 'language' && (
            <button
              type="button"
              onClick={onContinueFromLanguage}
              disabled={chosenLanguage === null}
              className="inline-flex items-center gap-2 rounded-full bg-[#1a73e8] px-6 py-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {amharic ? 'ቀጥል' : 'Continue'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {step === 'methods' && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onSkipMethods}
                className="rounded-full border border-[#d5e6f7] px-5 py-3 text-sm font-semibold text-[#001F3F]"
              >
                {amharic ? 'ዝለል' : 'Skip'}
              </button>
              <button
                type="button"
                onClick={() => onContinueFromMethods(methods)}
                className="inline-flex items-center gap-2 rounded-full bg-[#1a73e8] px-6 py-3.5 text-sm font-semibold text-white"
              >
                {amharic ? 'ቀጥል' : 'Continue'}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
