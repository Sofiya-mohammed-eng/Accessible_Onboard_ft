import React from 'react';
import { Check, RotateCcw, ArrowRight } from 'lucide-react';
import { AccessibilityPreferences, TextSizeOption } from '../types/accessbridge';
import { DEFAULT_PREFERENCES } from '../engines/preferencesStore';

interface OnboardingWizardProps {
  preferences: AccessibilityPreferences;
  onUpdatePreferences: (patch: Partial<AccessibilityPreferences>) => void;
  onComplete: () => void;
}

interface ToggleOption {
  key: keyof AccessibilityPreferences;
  label: string;
  description: string;
}

const VISUAL_OPTIONS: ToggleOption[] = [
  {
    key: 'screenReaderCompatibility',
    label: 'Screen reader compatibility',
    description: 'Enhanced ARIA landmarks, explicit field descriptions, and spoken status summaries.',
  },
  {
    key: 'highContrast',
    label: 'High contrast mode',
    description: 'Black background, crisp white typography, and high-visibility yellow focus borders.',
  },
  {
    key: 'magnification',
    label: 'Magnification',
    description: 'Scales workspace controls and spacing for easier visual tracking.',
  },
];

const AUDITORY_OPTIONS: ToggleOption[] = [
  {
    key: 'textBasedNotifications',
    label: 'Text-based notifications',
    description: 'All alerts, errors, and confirmations appear as readable on-screen text.',
  },
  {
    key: 'captions',
    label: 'Captions',
    description: 'Displays live written captions whenever spoken feedback is triggered.',
  },
  {
    key: 'visualAlerts',
    label: 'Visual alerts',
    description: 'High-visibility banners and explicit status icons accompany every system change.',
  },
];

const MOTOR_OPTIONS: ToggleOption[] = [
  {
    key: 'voiceCommands',
    label: 'Voice commands',
    description: 'Enable browser microphone controls where supported alongside full manual fallback.',
  },
  {
    key: 'keyboardNavigation',
    label: 'Keyboard navigation',
    description: 'Clear Tab focus rings, skip links, and keyboard-first action layouts.',
  },
  {
    key: 'reducedClickNavigation',
    label: 'Reduced-click navigation',
    description: 'Larger button targets and streamlined workflows requiring fewer pointer clicks.',
  },
  {
    key: 'switchCompatibleControls',
    label: 'Switch-compatible controls',
    description: 'Predictable linear focus order compatible with single-switch and assistive hardware.',
  },
];

const COGNITIVE_OPTIONS: ToggleOption[] = [
  {
    key: 'simplifiedInstructions',
    label: 'Simplified instructions',
    description: 'Uses short, plain-language guidance above every form and verification check.',
  },
  {
    key: 'stepByStepNavigation',
    label: 'Step-by-step navigation',
    description: 'Breaks long application forms into focused one-step-at-a-time sections.',
  },
  {
    key: 'reducedInformationOverload',
    label: 'Reduced information overload',
    description: 'Hides optional technical details and keeps only essential actions on screen.',
  },
];

const COMMUNICATION_OPTIONS: ToggleOption[] = [
  {
    key: 'speechInput',
    label: 'Speech input',
    description: 'Dictate cover letters and answers using the Web Speech API when supported.',
  },
  {
    key: 'textInput',
    label: 'Text input',
    description: 'Full keyboard and assistive typing support across every field.',
  },
  {
    key: 'alternativeInputMethods',
    label: 'Alternative input methods',
    description: 'Includes quick-insert structured response templates for non-speaking or AAC users.',
  },
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  preferences,
  onUpdatePreferences,
  onComplete,
}) => {
  const toggleBoolean = (key: keyof AccessibilityPreferences) => {
    const current = preferences[key];
    if (typeof current === 'boolean') {
      onUpdatePreferences({ [key]: !current });
    }
  };

  const applyPreset = (preset: 'blind' | 'deaf' | 'motor' | 'cognitive' | 'combined') => {
    if (preset === 'blind') {
      onUpdatePreferences({
        screenReaderCompatibility: true,
        keyboardNavigation: true,
        textSize: 'large',
        highContrast: false,
      });
    } else if (preset === 'deaf') {
      onUpdatePreferences({
        textBasedNotifications: true,
        captions: true,
        visualAlerts: true,
        textInput: true,
      });
    } else if (preset === 'motor') {
      onUpdatePreferences({
        voiceCommands: true,
        speechInput: true,
        keyboardNavigation: true,
        reducedClickNavigation: true,
        switchCompatibleControls: true,
      });
    } else if (preset === 'cognitive') {
      onUpdatePreferences({
        simplifiedInstructions: true,
        stepByStepNavigation: true,
        reducedInformationOverload: true,
        reducedMotion: true,
      });
    } else {
      onUpdatePreferences({
        screenReaderCompatibility: true,
        highContrast: true,
        captions: true,
        visualAlerts: true,
        keyboardNavigation: true,
        simplifiedInstructions: true,
        textInput: true,
        alternativeInputMethods: true,
      });
    }
  };

  const renderGroup = (title: string, subtitle: string, options: ToggleOption[]) => (
    <fieldset className="rounded-xl border border-slate-200 bg-white p-6 high-contrast:border-white high-contrast:bg-black">
      <legend className="px-1 font-display text-lg font-bold text-[#001F3F] high-contrast:text-yellow-300">
        {title}
      </legend>
      <p className="mt-1 text-sm text-slate-600 high-contrast:text-slate-300">{subtitle}</p>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {options.map((opt) => {
          const checked = Boolean(preferences[opt.key]);
          return (
            <button
              key={String(opt.key)}
              type="button"
              role="checkbox"
              aria-checked={checked}
              onClick={() => toggleBoolean(opt.key)}
              className={`flex items-start gap-3.5 rounded-lg border-2 p-4 text-left transition-colors ${
                checked
                  ? 'border-[#0056B3] bg-blue-50/70 high-contrast:border-yellow-300 high-contrast:bg-neutral-900'
                  : 'border-slate-200 bg-white hover:border-slate-300 high-contrast:border-slate-600 high-contrast:bg-black'
              }`}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 ${
                  checked
                    ? 'border-[#0056B3] bg-[#0056B3] text-white high-contrast:border-yellow-300 high-contrast:bg-yellow-300 high-contrast:text-black'
                    : 'border-slate-400 bg-white high-contrast:border-white high-contrast:bg-black'
                }`}
              >
                {checked && <Check className="h-4 w-4 stroke-[3]" />}
              </span>
              <span>
                <span className="block text-sm font-semibold text-[#001F3F] high-contrast:text-white">
                  {opt.label}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-600 high-contrast:text-slate-300">
                  {opt.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6 high-contrast:border-white">
        <p className="text-sm font-semibold text-[#0056B3] high-contrast:text-cyan-300">
          Accessibility Onboarding
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#001F3F] high-contrast:text-white">
          Configure Your Interaction Preferences
        </h1>
        <p className="mt-2 max-w-3xl text-base text-slate-600 high-contrast:text-slate-300">
          Select as many options as you need across Visual, Auditory, Motor, Cognitive, and
          Communication categories. Preferences are saved locally in your browser and never sent to
          external servers.
        </p>

        {/* Optional Quick Presets */}
        <div className="mt-6">
          <p className="text-xs font-semibold text-slate-700 high-contrast:text-slate-200">
            Optional starting combinations (you can customize every checkbox below):
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset('blind')}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#001F3F] hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            >
              Screen Reader + Keyboard
            </button>
            <button
              type="button"
              onClick={() => applyPreset('deaf')}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#001F3F] hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            >
              Visual Alerts + Captions
            </button>
            <button
              type="button"
              onClick={() => applyPreset('motor')}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#001F3F] hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            >
              Low Hand Mobility + Voice
            </button>
            <button
              type="button"
              onClick={() => applyPreset('cognitive')}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#001F3F] hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            >
              Step-by-Step + Reduced Clutter
            </button>
            <button
              type="button"
              onClick={() => applyPreset('combined')}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#001F3F] hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            >
              Multi-Modal (Deafblind / Combined)
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {/* Visual + Text Size */}
        <fieldset className="rounded-xl border border-slate-200 bg-white p-6 high-contrast:border-white high-contrast:bg-black">
          <legend className="px-1 font-display text-lg font-bold text-[#001F3F] high-contrast:text-yellow-300">
            Visual Preferences
          </legend>
          <p className="mt-1 text-sm text-slate-600 high-contrast:text-slate-300">
            Support for blindness, low vision, and deafblindness.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {VISUAL_OPTIONS.map((opt) => {
              const checked = Boolean(preferences[opt.key]);
              return (
                <button
                  key={String(opt.key)}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggleBoolean(opt.key)}
                  className={`flex items-start gap-3.5 rounded-lg border-2 p-4 text-left transition-colors ${
                    checked
                      ? 'border-[#0056B3] bg-blue-50/70 high-contrast:border-yellow-300 high-contrast:bg-neutral-900'
                      : 'border-slate-200 bg-white hover:border-slate-300 high-contrast:border-slate-600 high-contrast:bg-black'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 ${
                      checked
                        ? 'border-[#0056B3] bg-[#0056B3] text-white high-contrast:border-yellow-300 high-contrast:bg-yellow-300 high-contrast:text-black'
                        : 'border-slate-400 bg-white high-contrast:border-white high-contrast:bg-black'
                    }`}
                  >
                    {checked && <Check className="h-4 w-4 stroke-[3]" />}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-[#001F3F] high-contrast:text-white">
                      {opt.label}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-600 high-contrast:text-slate-300">
                      {opt.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 border-t border-slate-200 pt-4 high-contrast:border-slate-700">
            <p className="text-sm font-semibold text-[#001F3F] high-contrast:text-white">
              Adjustable Text Size
            </p>
            <div className="mt-2.5 flex flex-wrap gap-3" role="radiogroup" aria-label="Adjustable text size">
              {(
                [
                  { id: 'normal', label: 'Standard (16px)' },
                  { id: 'large', label: 'Large (18px)' },
                  { id: 'xlarge', label: 'Extra Large (21px)' },
                ] as Array<{ id: TextSizeOption; label: string }>
              ).map((sizeOpt) => {
                const selected = preferences.textSize === sizeOpt.id;
                return (
                  <button
                    key={sizeOpt.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onUpdatePreferences({ textSize: sizeOpt.id })}
                    className={`rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                      selected
                        ? 'border-[#001F3F] bg-[#001F3F] text-white high-contrast:border-yellow-300 high-contrast:bg-yellow-300 high-contrast:text-black'
                        : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white'
                    }`}
                  >
                    {sizeOpt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </fieldset>

        {renderGroup(
          'Auditory Preferences',
          'Support for deafness, hard-of-hearing users, and quiet environments.',
          AUDITORY_OPTIONS
        )}

        {renderGroup(
          'Motor & Mobility Preferences',
          'Support for limited hand mobility, tremors, temporary arm injuries, and switch access.',
          MOTOR_OPTIONS
        )}

        {renderGroup(
          'Cognitive & Learning Preferences',
          'Reduce visual clutter and break complex tasks into manageable steps.',
          COGNITIVE_OPTIONS
        )}

        {renderGroup(
          'Communication & Input Preferences',
          'Choose voice, text, or alternative structured phrase input.',
          COMMUNICATION_OPTIONS
        )}

        {/* Reduced Motion */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 high-contrast:border-white high-contrast:bg-black">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-bold text-[#001F3F] high-contrast:text-white">
                Reduced Motion
              </h2>
              <p className="mt-1 text-sm text-slate-600 high-contrast:text-slate-300">
                Disables non-essential transitions and smooth scrolling.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={preferences.reducedMotion}
              onClick={() => onUpdatePreferences({ reducedMotion: !preferences.reducedMotion })}
              className={`rounded-lg border-2 px-5 py-2.5 text-sm font-semibold transition-colors ${
                preferences.reducedMotion
                  ? 'border-[#001F3F] bg-[#001F3F] text-white high-contrast:border-yellow-300 high-contrast:bg-yellow-300 high-contrast:text-black'
                  : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white'
              }`}
            >
              {preferences.reducedMotion ? 'Reduced Motion: Enabled' : 'Reduced Motion: Standard'}
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6 high-contrast:border-white">
        <button
          type="button"
          onClick={() => onUpdatePreferences(DEFAULT_PREFERENCES)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Reset to Defaults
        </button>

        <button
          type="button"
          onClick={onComplete}
          className="inline-flex items-center gap-2 rounded-lg bg-[#001F3F] px-7 py-3.5 text-base font-semibold text-white hover:bg-[#003366] transition-colors high-contrast:bg-yellow-300 high-contrast:text-black"
        >
          Save Preferences & Open Dashboard
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
