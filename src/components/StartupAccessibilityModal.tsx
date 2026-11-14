import React, { useEffect, useRef, useState } from 'react';
import {
  Compass,
  Contrast,
  Volume2,
  VolumeX,
  ZoomIn,
  SlidersHorizontal,
  Keyboard,
  Mic,
  ListChecks,
  Hand,
  Ear,
  MousePointerClick,
  Check,
  ArrowRight,
  ArrowLeft,
  Globe,
  X,
} from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  getLocalizedCopy,
} from '../engines/i18n';
import {
  AccessibilityPreferences,
  NavigationStyle,
  NavigationView,
  PreferredLanguage,
  TextSizeOption,
} from '../types/accessbridge';

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

interface NavChoiceCard {
  id: NavigationStyle;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}

const NAVIGATION_CHOICES: NavChoiceCard[] = [
  {
    id: 'keyboard_screen_reader',
    title: 'Keyboard & Screen Reader',
    description:
      'Navigate using Tab, Shift+Tab, Alt+1–7 shortcuts, skip links, and braille-friendly semantic labels.',
    icon: Keyboard,
  },
  {
    id: 'voice_commands',
    title: 'Voice & Speech Navigation',
    description:
      'Speak navigation commands and dictate applications using the browser microphone (with text fallback).',
    icon: Mic,
  },
  {
    id: 'simplified_step_by_step',
    title: 'Simplified Step-by-Step',
    description:
      'Show plain-language instructions, break forms into single steps, and reduce visual clutter.',
    icon: ListChecks,
  },
  {
    id: 'switch_reduced_click',
    title: 'Switch & Reduced-Click',
    description:
      'Large targets, predictable linear focus order, and minimal clicks for limited hand mobility.',
    icon: Hand,
  },
  {
    id: 'visual_captions_alerts',
    title: 'Visual Captions & Alerts',
    description:
      'Display written live captions and clear on-screen visual notifications for every system action.',
    icon: Ear,
  },
  {
    id: 'standard',
    title: 'Standard Pointer / Touch',
    description:
      'Use standard mouse or touch browsing while keeping verification and speech tools ready anytime.',
    icon: MousePointerClick,
  },
];

export const StartupAccessibilityModal: React.FC<StartupAccessibilityModalProps> = ({
  isOpen,
  preferences,
  isSpeaking,
  onUpdatePreferences,
  onSpeakText,
  onStopSpeaking,
  onOpenNavigationHelper,
  onCompleteAndGo,
  onClose,
  canCloseDirectly,
}) => {
  const [step, setStep] = useState<'language' | 'setup'>(() =>
    preferences.languageSelected ? 'setup' : 'language'
  );
  const firstFocusRef = useRef<HTMLButtonElement | null>(null);
  const copy = getLocalizedCopy(preferences.language);

  useEffect(() => {
    if (!isOpen) return;
    if (!preferences.languageSelected) {
      setStep('language');
    }
    setTimeout(() => {
      firstFocusRef.current?.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canCloseDirectly && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, canCloseDirectly, onClose, preferences.languageSelected]);

  if (!isOpen) return null;

  const handleSelectLanguage = (code: PreferredLanguage) => {
    onUpdatePreferences({ language: code, languageSelected: true });
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === code);
    if (langObj) {
      onSpeakText(`${langObj.englishName} — ${langObj.greeting}`, langObj.speechLang);
    }
  };

  const handleReadLanguages = () => {
    onSpeakText(
      'Please choose your preferred language: English, Amharic, Afan Oromo, Tigrigna, or Guragigna.',
      'en-US'
    );
  };

  const handleReadSetup = () => {
    onSpeakText(
      `${copy.setupStepTitle}. ${copy.setupStepSubtitle}`
    );
  };

  const cycleTextSize = () => {
    const order: TextSizeOption[] = ['normal', 'large', 'xlarge'];
    const idx = order.indexOf(preferences.textSize);
    onUpdatePreferences({ textSize: order[(idx + 1) % order.length] });
  };

  const textSizeLabel =
    preferences.textSize === 'normal'
      ? 'Text: Standard'
      : preferences.textSize === 'large'
        ? 'Text: Large'
        : 'Text: Extra Large';

  const toggleNavigationStyle = (styleId: NavigationStyle) => {
    const current = preferences.preferredNavigationStyles || [];
    const exists = current.includes(styleId);

    let nextStyles: NavigationStyle[];
    if (exists) {
      nextStyles = current.filter((s) => s !== styleId);
      if (nextStyles.length === 0) nextStyles = ['standard'];
    } else {
      nextStyles =
        styleId === 'standard'
          ? ['standard']
          : [...current.filter((s) => s !== 'standard'), styleId];
    }

    onUpdatePreferences({
      preferredNavigationStyles: nextStyles,
      keyboardNavigation:
        nextStyles.includes('keyboard_screen_reader') || preferences.keyboardNavigation,
      screenReaderCompatibility:
        nextStyles.includes('keyboard_screen_reader') || preferences.screenReaderCompatibility,
      voiceCommands: nextStyles.includes('voice_commands'),
      speechInput: nextStyles.includes('voice_commands') || preferences.speechInput,
      simplifiedInstructions: nextStyles.includes('simplified_step_by_step'),
      stepByStepNavigation: nextStyles.includes('simplified_step_by_step'),
      reducedInformationOverload: nextStyles.includes('simplified_step_by_step'),
      switchCompatibleControls: nextStyles.includes('switch_reduced_click'),
      reducedClickNavigation: nextStyles.includes('switch_reduced_click'),
      captions: nextStyles.includes('visual_captions_alerts') || preferences.captions,
      visualAlerts: nextStyles.includes('visual_captions_alerts') || preferences.visualAlerts,
      textBasedNotifications:
        nextStyles.includes('visual_captions_alerts') || preferences.textBasedNotifications,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="startup-a11y-title"
      aria-describedby="startup-a11y-desc"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-xs"
    >
      <div className="my-auto w-full max-w-4xl rounded-2xl border-2 border-[#001F3F] bg-white p-6 shadow-2xl sm:p-8 high-contrast:border-yellow-300 high-contrast:bg-black">
        {step === 'language' ? (
          <div>
            {/* Step 1: Language Selection */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5 high-contrast:border-white">
              <div>
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0056B3] high-contrast:text-cyan-300">
                  <Globe className="h-4 w-4" aria-hidden="true" />
                  {copy.languageStepKicker}
                </p>
                <h1
                  id="startup-a11y-title"
                  className="mt-1.5 font-display text-2xl font-bold text-[#001F3F] sm:text-3xl high-contrast:text-white"
                >
                  {copy.languageStepTitle}
                </h1>
                <p
                  id="startup-a11y-desc"
                  className="mt-2 max-w-2xl text-sm text-slate-600 high-contrast:text-slate-300"
                >
                  {copy.languageStepSubtitle}
                </p>
              </div>

              {canCloseDirectly && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close setup window"
                  className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-100 high-contrast:border-white high-contrast:text-white"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                ref={firstFocusRef}
                type="button"
                onClick={isSpeaking ? onStopSpeaking : handleReadLanguages}
                className={`inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                  isSpeaking
                    ? 'border-red-700 bg-red-700 text-white'
                    : 'border-slate-300 bg-white text-[#001F3F] hover:border-[#007BFF] hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white'
                }`}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="h-4 w-4" aria-hidden="true" />
                    Stop Reading
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                    {copy.readLanguagesAloud}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => onUpdatePreferences({ highContrast: !preferences.highContrast })}
                aria-pressed={preferences.highContrast}
                className={`inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                  preferences.highContrast
                    ? 'border-yellow-300 bg-black text-yellow-300'
                    : 'border-slate-300 bg-white text-[#001F3F] hover:border-[#007BFF] hover:bg-slate-50'
                }`}
              >
                <Contrast className="h-4 w-4" aria-hidden="true" />
                {preferences.highContrast ? 'High Contrast: On' : 'High Contrast: Off'}
              </button>
            </div>

            <div
              role="radiogroup"
              aria-label="Preferred language"
              className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              {SUPPORTED_LANGUAGES.map((langOption) => {
                const isSelected = preferences.language === langOption.code;
                return (
                  <button
                    key={langOption.code}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleSelectLanguage(langOption.code)}
                    className={`flex items-start justify-between gap-3 rounded-xl border-2 p-5 text-left transition-colors ${
                      isSelected
                        ? 'border-[#0056B3] bg-blue-50/80 high-contrast:border-yellow-300 high-contrast:bg-neutral-900'
                        : 'border-slate-200 bg-white hover:border-slate-300 high-contrast:border-slate-600 high-contrast:bg-black'
                    }`}
                  >
                    <div>
                      <span className="block font-display text-xl font-bold text-[#001F3F] high-contrast:text-white">
                        {langOption.nativeName}
                      </span>
                      <span className="mt-1 block text-sm font-medium text-slate-600 high-contrast:text-slate-300">
                        {langOption.englishName}
                      </span>
                      <span className="mt-2 block text-xs text-slate-500 high-contrast:text-slate-400">
                        {langOption.greeting}
                      </span>
                    </div>
                    <span
                      aria-hidden="true"
                      className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                        isSelected
                          ? 'border-[#0056B3] bg-[#0056B3] text-white high-contrast:border-yellow-300 high-contrast:bg-yellow-300 high-contrast:text-black'
                          : 'border-slate-400 bg-white high-contrast:border-white high-contrast:bg-black'
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-5 high-contrast:border-white">
              <button
                type="button"
                onClick={() => {
                  onUpdatePreferences({ languageSelected: true });
                  setStep('setup');
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#001F3F] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#003366] high-contrast:bg-yellow-300 high-contrast:text-black"
              >
                {copy.continueToSetup}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Step 2: Accessibility Controls & Navigation Style Selection */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5 high-contrast:border-white">
              <div>
                <p className="text-xs font-semibold text-[#0056B3] high-contrast:text-cyan-300">
                  {copy.setupStepKicker}
                </p>
                <h1
                  id="startup-a11y-title"
                  className="mt-1 font-display text-2xl font-bold text-[#001F3F] sm:text-3xl high-contrast:text-white"
                >
                  {copy.setupStepTitle}
                </h1>
                <p
                  id="startup-a11y-desc"
                  className="mt-2 max-w-2xl text-sm text-slate-600 high-contrast:text-slate-300"
                >
                  {copy.setupStepSubtitle}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setStep('language')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-[#001F3F] hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  {copy.changeLanguageBtn}
                </button>
                {canCloseDirectly && onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close accessibility setup window"
                    className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-100 high-contrast:border-white high-contrast:text-white"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Accessibility Controls */}
            <section aria-labelledby="quick-bar-heading" className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2
                  id="quick-bar-heading"
                  className="font-display text-base font-bold text-[#001F3F] high-contrast:text-yellow-300"
                >
                  {copy.quickControlsHeading}
                </h2>
                <button
                  type="button"
                  onClick={() => onCompleteAndGo('onboarding')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0056B3] hover:underline high-contrast:text-cyan-300"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit Profile Preferences
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2.5">
                <button
                  ref={firstFocusRef}
                  type="button"
                  onClick={isSpeaking ? onStopSpeaking : handleReadSetup}
                  className={`inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                    isSpeaking
                      ? 'border-red-700 bg-red-700 text-white'
                      : 'border-slate-300 bg-white text-[#001F3F] hover:border-[#007BFF] hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white'
                  }`}
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="h-4 w-4" aria-hidden="true" />
                      Stop Reading
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4" aria-hidden="true" />
                      Read Section Aloud
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onUpdatePreferences({ highContrast: !preferences.highContrast })}
                  aria-pressed={preferences.highContrast}
                  className={`inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                    preferences.highContrast
                      ? 'border-yellow-300 bg-black text-yellow-300'
                      : 'border-slate-300 bg-white text-[#001F3F] hover:border-[#007BFF] hover:bg-slate-50'
                  }`}
                >
                  <Contrast className="h-4 w-4" aria-hidden="true" />
                  {preferences.highContrast ? 'High Contrast: On' : 'High Contrast: Off'}
                </button>

                <button
                  type="button"
                  onClick={cycleTextSize}
                  className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#001F3F] hover:border-[#007BFF] hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
                >
                  <ZoomIn className="h-4 w-4" aria-hidden="true" />
                  {textSizeLabel}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdatePreferences({
                      simplifiedInstructions: !preferences.simplifiedInstructions,
                    })
                  }
                  aria-pressed={preferences.simplifiedInstructions}
                  className={`inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                    preferences.simplifiedInstructions
                      ? 'border-[#0056B3] bg-[#0056B3] text-white high-contrast:border-cyan-300 high-contrast:bg-cyan-300 high-contrast:text-black'
                      : 'border-slate-300 bg-white text-[#001F3F] hover:border-[#007BFF] hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white'
                  }`}
                >
                  {preferences.simplifiedInstructions
                    ? 'Simplified View: On'
                    : 'Simplified View: Off'}
                </button>

                <button
                  type="button"
                  onClick={onOpenNavigationHelper}
                  className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#001F3F] hover:border-[#007BFF] hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-yellow-300"
                >
                  <Compass className="h-4 w-4" aria-hidden="true" />
                  Help Me Navigate
                </button>
              </div>
            </section>

            {/* Choose Navigation Style */}
            <section aria-labelledby="nav-choice-heading" className="mt-7">
              <h2
                id="nav-choice-heading"
                className="font-display text-base font-bold text-[#001F3F] high-contrast:text-yellow-300"
              >
                {copy.navChoiceHeading}
              </h2>
              <p className="mt-1 text-xs text-slate-600 high-contrast:text-slate-300">
                {copy.navChoiceSubtitle}
              </p>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {NAVIGATION_CHOICES.map((choice) => {
                  const Icon = choice.icon;
                  const selected = (preferences.preferredNavigationStyles || []).includes(choice.id);

                  return (
                    <button
                      key={choice.id}
                      type="button"
                      role="checkbox"
                      aria-checked={selected}
                      onClick={() => toggleNavigationStyle(choice.id)}
                      className={`flex flex-col justify-between rounded-xl border-2 p-4 text-left transition-colors ${
                        selected
                          ? 'border-[#0056B3] bg-blue-50/75 high-contrast:border-yellow-300 high-contrast:bg-neutral-900'
                          : 'border-slate-200 bg-white hover:border-slate-300 high-contrast:border-slate-600 high-contrast:bg-black'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <Icon
                            className={`h-5 w-5 ${
                              selected
                                ? 'text-[#0056B3] high-contrast:text-yellow-300'
                                : 'text-slate-600 high-contrast:text-slate-300'
                            }`}
                            aria-hidden={true}
                          />
                          <span
                            aria-hidden="true"
                            className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                              selected
                                ? 'border-[#0056B3] bg-[#0056B3] text-white high-contrast:border-yellow-300 high-contrast:bg-yellow-300 high-contrast:text-black'
                                : 'border-slate-400 bg-white high-contrast:border-white high-contrast:bg-black'
                            }`}
                          >
                            {selected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                          </span>
                        </div>
                        <h3 className="mt-3 font-display text-sm font-bold text-[#001F3F] high-contrast:text-white">
                          {choice.title}
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600 high-contrast:text-slate-300">
                          {choice.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Bottom Actions */}
            <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 high-contrast:border-white">
              <button
                type="button"
                onClick={() => onCompleteAndGo('landing')}
                className="rounded-lg border-2 border-[#001F3F] bg-white px-5 py-3 text-sm font-semibold text-[#001F3F] hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              >
                {copy.continueToWelcome}
              </button>

              <button
                type="button"
                onClick={() => onCompleteAndGo('dashboard')}
                className="inline-flex items-center gap-2 rounded-lg bg-[#001F3F] px-6 py-3 text-sm font-semibold text-white hover:bg-[#003366] high-contrast:bg-yellow-300 high-contrast:text-black"
              >
                {copy.saveAndDashboard}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
