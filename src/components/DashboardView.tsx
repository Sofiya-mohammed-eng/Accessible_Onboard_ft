import React from 'react';
import {
  Compass,
  ScanSearch,
  Briefcase,
  FileEdit,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Trash2,
} from 'lucide-react';
import { getLanguageOption, getLocalizedCopy } from '../engines/i18n';
import {
  AccessibilityPreferences,
  ActivityLogItem,
  ApplicationDraft,
  NavigationView,
  VerificationReport,
} from '../types/accessbridge';

interface DashboardViewProps {
  preferences: AccessibilityPreferences;
  draft: ApplicationDraft;
  verificationReport: VerificationReport;
  activities: ActivityLogItem[];
  onNavigate: (view: NavigationView) => void;
  onOpenNavigationHelper: () => void;
  onUpdatePreferences: (patch: Partial<AccessibilityPreferences>) => void;
  onClearLocalData: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  preferences,
  draft,
  verificationReport,
  activities,
  onNavigate,
  onOpenNavigationHelper,
  onUpdatePreferences,
  onClearLocalData,
}) => {
  const copy = getLocalizedCopy(preferences.language);
  const langInfo = getLanguageOption(preferences.language);
  const activeModes: string[] = [`${langInfo.nativeName} (${langInfo.englishName})`];
  if (preferences.screenReaderCompatibility) activeModes.push('Screen Reader');
  if (preferences.highContrast) activeModes.push('High Contrast');
  if (preferences.magnification) activeModes.push('Magnification');
  if (preferences.textSize !== 'normal') activeModes.push(`Text: ${preferences.textSize}`);
  if (preferences.captions || preferences.visualAlerts) activeModes.push('Captions & Visual Alerts');
  if (preferences.keyboardNavigation) activeModes.push('Keyboard Nav');
  if (preferences.switchCompatibleControls) activeModes.push('Switch Controls');
  if (preferences.simplifiedInstructions || preferences.stepByStepNavigation)
    activeModes.push('Simplified Step-by-Step');
  if (preferences.speechInput || preferences.voiceCommands) activeModes.push('Speech / Voice');

  const primaryActions = [
    {
      id: 'navigate',
      title: copy.action1Title,
      description: 'Open keyboard shortcuts, voice jump, and single-click section guide.',
      icon: Compass,
      onClick: onOpenNavigationHelper,
    },
    {
      id: 'scanner',
      title: copy.action2Title,
      description: 'Inspect headings, form fields, buttons, links, and image alt text.',
      icon: ScanSearch,
      onClick: () => onNavigate('scanner'),
    },
    {
      id: 'jobs',
      title: copy.action3Title,
      description: 'Search sample remote roles with plain-language job breakdowns.',
      icon: Briefcase,
      onClick: () => onNavigate('jobs'),
    },
    {
      id: 'apply',
      title: copy.action4Title,
      description: 'Prepare cover letters, rates, and answers using voice or text.',
      icon: FileEdit,
      onClick: () => onNavigate('apply'),
    },
    {
      id: 'verify',
      title: copy.action5Title,
      description: 'Compare intended values against entered inputs to catch errors.',
      icon: ShieldCheck,
      onClick: () => onNavigate('verify'),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header & Current Accessibility Profile */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6 high-contrast:border-white">
        <div>
          <p className="text-sm font-semibold text-[#0056B3] high-contrast:text-cyan-300">
            Accessibility Dashboard
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-[#001F3F] high-contrast:text-white">
            {copy.dashboardTitle}
          </h1>
          <p className="mt-2 text-sm text-slate-600 high-contrast:text-slate-300">
            Active accessibility profile:{' '}
            <span className="font-semibold text-[#001F3F] high-contrast:text-yellow-300">
              {activeModes.length > 0 ? activeModes.join(' · ') : 'Standard defaults'}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('onboarding')}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#001F3F] hover:bg-slate-50 whitespace-nowrap shrink-0 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
          Edit Accessibility Profile
        </button>
      </div>

      {/* 5 Primary Actions */}
      <section aria-labelledby="primary-actions-heading" className="mt-8">
        <h2
          id="primary-actions-heading"
          className="font-display text-xl font-bold text-[#001F3F] high-contrast:text-white"
        >
          {copy.primaryActionsHeading}
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {primaryActions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                type="button"
                onClick={act.onClick}
                className="flex flex-col justify-between rounded-xl border-2 border-slate-200 bg-white p-5 text-left hover:border-[#007BFF] hover:bg-slate-50/70 transition-colors high-contrast:border-white high-contrast:bg-black high-contrast:hover:border-yellow-300"
              >
                <div>
                  <Icon
                    className="h-6 w-6 text-[#0056B3] high-contrast:text-yellow-300"
                    aria-hidden="true"
                  />
                  <h3 className="mt-3 font-display text-base font-bold text-[#001F3F] high-contrast:text-white">
                    {act.title}
                  </h3>
                  {!preferences.reducedInformationOverload && (
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600 high-contrast:text-slate-300">
                      {act.description}
                    </p>
                  )}
                </div>
                <span className="mt-4 text-xs font-semibold text-[#0056B3] high-contrast:text-cyan-300">
                  Open tool →
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Workspace Status Grid */}
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Active Application & Verification Summary */}
        <section
          aria-labelledby="active-app-heading"
          className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7 high-contrast:border-white high-contrast:bg-black"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 high-contrast:border-slate-700">
            <div>
              <h2
                id="active-app-heading"
                className="font-display text-lg font-bold text-[#001F3F] high-contrast:text-white"
              >
                Active Application & Verification Status
              </h2>
              <p className="mt-0.5 text-xs text-slate-600 high-contrast:text-slate-300">
                {draft.platform} · {draft.employer}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {verificationReport.readinessStatus === 'Ready for submission' ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-3 py-1.5 text-xs font-semibold text-[#15803D] border border-green-200 high-contrast:bg-black high-contrast:text-green-400 high-contrast:border-green-400">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Ready for submission
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 border border-red-200 high-contrast:bg-black high-contrast:text-red-400 high-contrast:border-red-400">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  {verificationReport.readinessStatus}
                </span>
              )}
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-slate-500 high-contrast:text-slate-400">Job Title</dt>
              <dd className="mt-1 font-semibold text-[#001F3F] high-contrast:text-white">
                {draft.jobTitle || 'Not set'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 high-contrast:text-slate-400">Entered Rate</dt>
              <dd className="mt-1 font-mono font-semibold tabular-nums text-[#001F3F] high-contrast:text-white">
                {draft.hourlyRate ? `$${draft.hourlyRate}/hr` : 'Not set'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 high-contrast:text-slate-400">Availability</dt>
              <dd className="mt-1 font-semibold text-[#001F3F] high-contrast:text-white">
                {draft.availability || 'Not set'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 high-contrast:text-slate-400">
                Verification Checks
              </dt>
              <dd className="mt-1 font-mono font-semibold tabular-nums text-[#001F3F] high-contrast:text-white">
                {verificationReport.counts.verified}/{verificationReport.checks.length} passed
              </dd>
            </div>
          </dl>

          <p className="mt-4 text-sm text-slate-700 high-contrast:text-slate-200">
            {verificationReport.summaryMessage}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('apply')}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#001F3F] hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            >
              Continue Application Draft
            </button>
            <button
              type="button"
              onClick={() => onNavigate('verify')}
              className="rounded-lg bg-[#001F3F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#003366] high-contrast:bg-yellow-300 high-contrast:text-black"
            >
              Run Verification Engine
            </button>
            <button
              type="button"
              onClick={() => onNavigate('review')}
              className="rounded-lg border border-[#0056B3] bg-white px-4 py-2.5 text-sm font-semibold text-[#0056B3] hover:bg-blue-50 high-contrast:border-cyan-300 high-contrast:bg-black high-contrast:text-cyan-300"
            >
              Final Review & Confirm
            </button>
          </div>
        </section>

        {/* Quick Accessibility Settings */}
        <section
          aria-labelledby="quick-settings-heading"
          className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 high-contrast:border-white high-contrast:bg-black"
        >
          <h2
            id="quick-settings-heading"
            className="font-display text-lg font-bold text-[#001F3F] high-contrast:text-white"
          >
            Quick Accessibility Settings
          </h2>
          <p className="mt-1 text-xs text-slate-600 high-contrast:text-slate-300">
            Changes apply immediately and save locally.
          </p>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 high-contrast:border-slate-800">
              <span className="text-sm font-medium text-slate-800 high-contrast:text-white">
                High Contrast Mode
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.highContrast}
                onClick={() => onUpdatePreferences({ highContrast: !preferences.highContrast })}
                className={`rounded-lg border px-3.5 py-1.5 text-xs font-semibold ${
                  preferences.highContrast
                    ? 'border-yellow-300 bg-black text-yellow-300'
                    : 'border-slate-300 bg-slate-50 text-slate-800'
                }`}
              >
                {preferences.highContrast ? 'On' : 'Off'}
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 high-contrast:border-slate-800">
              <span className="text-sm font-medium text-slate-800 high-contrast:text-white">
                Magnification (108% zoom)
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.magnification}
                onClick={() => onUpdatePreferences({ magnification: !preferences.magnification })}
                className={`rounded-lg border px-3.5 py-1.5 text-xs font-semibold ${
                  preferences.magnification
                    ? 'border-[#001F3F] bg-[#001F3F] text-white high-contrast:border-yellow-300 high-contrast:bg-yellow-300 high-contrast:text-black'
                    : 'border-slate-300 bg-slate-50 text-slate-800'
                }`}
              >
                {preferences.magnification ? 'On' : 'Off'}
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 high-contrast:border-slate-800">
              <span className="text-sm font-medium text-slate-800 high-contrast:text-white">
                Step-by-Step Form Mode
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.stepByStepNavigation}
                onClick={() =>
                  onUpdatePreferences({ stepByStepNavigation: !preferences.stepByStepNavigation })
                }
                className={`rounded-lg border px-3.5 py-1.5 text-xs font-semibold ${
                  preferences.stepByStepNavigation
                    ? 'border-[#001F3F] bg-[#001F3F] text-white high-contrast:border-yellow-300 high-contrast:bg-yellow-300 high-contrast:text-black'
                    : 'border-slate-300 bg-slate-50 text-slate-800'
                }`}
              >
                {preferences.stepByStepNavigation ? 'On' : 'Off'}
              </button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-slate-800 high-contrast:text-white">
                Speech Rate ({preferences.speechRate.toFixed(1)}x)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePreferences({
                      speechRate: Math.max(0.7, Number((preferences.speechRate - 0.1).toFixed(1))),
                    })
                  }
                  aria-label="Decrease speech rate"
                  className="rounded border border-slate-300 px-2.5 py-1 text-xs font-semibold hover:bg-slate-100 high-contrast:border-white"
                >
                  Slower
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePreferences({
                      speechRate: Math.min(1.5, Number((preferences.speechRate + 0.1).toFixed(1))),
                    })
                  }
                  aria-label="Increase speech rate"
                  className="rounded border border-slate-300 px-2.5 py-1 text-xs font-semibold hover:bg-slate-100 high-contrast:border-white"
                >
                  Faster
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Recent Activities & Privacy Control */}
      <section
        aria-labelledby="recent-activity-heading"
        className="mt-8 rounded-xl border border-slate-200 bg-white p-6 high-contrast:border-white high-contrast:bg-black"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="recent-activity-heading"
            className="font-display text-lg font-bold text-[#001F3F] high-contrast:text-white"
          >
            Recent Local Activity
          </h2>
          <button
            type="button"
            onClick={onClearLocalData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 high-contrast:border-white high-contrast:text-white"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Clear Local Workspace Data
          </button>
        </div>

        <ul className="mt-4 divide-y divide-slate-200 high-contrast:divide-slate-700">
          {activities.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div>
                <span className="font-semibold text-[#001F3F] high-contrast:text-white">
                  {item.action}
                </span>
                <span className="mx-2 text-slate-400" aria-hidden="true">
                  ·
                </span>
                <span className="text-slate-600 high-contrast:text-slate-300">{item.detail}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs tabular-nums text-slate-500 high-contrast:text-slate-400">
                  {item.timestamp}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate(item.view)}
                  className="text-xs font-semibold text-[#0056B3] hover:underline high-contrast:text-cyan-300"
                >
                  Open
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
