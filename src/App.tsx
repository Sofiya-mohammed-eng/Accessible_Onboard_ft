import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Globe, SlidersHorizontal } from 'lucide-react';
import { AppHeader } from './components/AppHeader';
import { LandingPage } from './components/LandingPage';
import { OnboardingWizard } from './components/OnboardingWizard';
import { DashboardView } from './components/DashboardView';
import { WebsiteUnderstandingView } from './components/WebsiteUnderstandingView';
import { JobDiscoveryView } from './components/JobDiscoveryView';
import { ApplicationAssistantView } from './components/ApplicationAssistantView';
import { VerificationEngineView } from './components/VerificationEngineView';
import { FinalReviewView } from './components/FinalReviewView';
import { NavigationHelperModal } from './components/NavigationHelperModal';
import { StartupAccessibilityModal } from './components/StartupAccessibilityModal';
import {
  appendActivity,
  loadActivities,
  loadApplicationDraft,
  loadIntendedValues,
  loadPreferences,
  saveApplicationDraft,
  saveIntendedValues,
  savePreferences,
} from './engines/preferencesStore';
import { speakAloud, stopSpeakingAloud } from './engines/accessibilityEngine';
import { getLanguageOption } from './engines/i18n';
import { runDeterministicVerification } from './engines/verificationEngine';
import {
  AccessibilityPreferences,
  ActivityLogItem,
  ApplicationDraft,
  IntendedApplicationValues,
  JobListing,
  NavigationView,
} from './types/accessbridge';

export default function App() {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(() => loadPreferences());
  const [draft, setDraft] = useState<ApplicationDraft>(() => loadApplicationDraft());
  const [intended, setIntended] = useState<IntendedApplicationValues>(() => loadIntendedValues());
  const [, setActivities] = useState<ActivityLogItem[]>(() => loadActivities());
  const [currentView, setCurrentView] = useState<NavigationView>('landing');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [liveCaption, setLiveCaption] = useState<string>('');
  const [navHelperOpen, setNavHelperOpen] = useState<boolean>(false);
  const [startupModalOpen, setStartupModalOpen] = useState<boolean>(() => {
    const loaded = loadPreferences();
    return !loaded.languageSelected || !loaded.startupModalCompleted;
  });
  const mainRef = useRef<HTMLElement | null>(null);

  // Sync accessibility & language attributes onto <html> element
  useEffect(() => {
    const root = document.documentElement;
    root.lang = preferences.language || 'en';
    root.classList.toggle('high-contrast', preferences.highContrast);
    root.classList.toggle('reduced-motion', preferences.reducedMotion);
    root.classList.toggle('magnifier-active', preferences.magnification);
    root.classList.remove('text-scale-large', 'text-scale-xlarge');
    if (preferences.textSize === 'large') root.classList.add('text-scale-large');
    if (preferences.textSize === 'xlarge') root.classList.add('text-scale-xlarge');
  }, [preferences]);

  const recordActivity = useCallback((action: string, detail: string, view: NavigationView) => {
    setActivities((prev) => appendActivity(prev, { action, detail, view }));
  }, []);

  const handleUpdatePreferences = useCallback(
    (patch: Partial<AccessibilityPreferences>) => {
      setPreferences((prev) => {
        const next = { ...prev, ...patch };
        savePreferences(next);
        return next;
      });
    },
    []
  );

  const handleNavigate = useCallback((view: NavigationView) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'auto' });
    setTimeout(() => {
      mainRef.current?.focus();
    }, 0);
  }, []);

  // Global Keyboard Shortcuts (Alt+1 to Alt+7)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      const map: Record<string, NavigationView> = {
        '1': 'dashboard',
        '2': 'scanner',
        '3': 'jobs',
        '4': 'apply',
        '5': 'verify',
        '6': 'review',
        '7': 'onboarding',
      };
      if (map[e.key]) {
        e.preventDefault();
        handleNavigate(map[e.key]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleNavigate]);

  const handleSpeakText = useCallback(
    (text: string, langOverride?: string) => {
      setLiveCaption(text);
      const activeLang = langOverride || getLanguageOption(preferences.language).speechLang;
      speakAloud(text, {
        rate: preferences.speechRate,
        lang: activeLang,
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
        onCaption: (caption) => setLiveCaption(caption),
      });
    },
    [preferences.speechRate, preferences.language]
  );

  const handleStopSpeaking = useCallback(() => {
    stopSpeakingAloud();
    setIsSpeaking(false);
  }, []);

  const handleCompleteStartupModal = useCallback(
    (destination: NavigationView) => {
      handleUpdatePreferences({
        languageSelected: true,
        startupModalCompleted: true,
        onboardingCompleted:
          destination === 'dashboard' ? true : preferences.onboardingCompleted,
      });
      setStartupModalOpen(false);
      const langInfo = getLanguageOption(preferences.language);
      const chosenLabels = (preferences.preferredNavigationStyles || []).join(', ');
      recordActivity(
        `Language (${langInfo.englishName}) & navigation saved`,
        chosenLabels || 'Standard navigation',
        destination
      );
      if (
        (preferences.preferredNavigationStyles || []).includes('switch_reduced_click') &&
        destination === 'dashboard'
      ) {
        setNavHelperOpen(true);
      }
      handleNavigate(destination);
    },
    [
      handleUpdatePreferences,
      preferences.onboardingCompleted,
      preferences.preferredNavigationStyles,
      preferences.language,
      recordActivity,
      handleNavigate,
    ]
  );

  const handleUpdateDraft = useCallback((next: ApplicationDraft) => {
    setDraft(next);
    saveApplicationDraft(next);
  }, []);

  const handleUpdateIntended = useCallback((next: IntendedApplicationValues) => {
    setIntended(next);
    saveIntendedValues(next);
  }, []);

  const handleSelectJobForApplication = useCallback(
    (job: JobListing) => {
      const nextDraft: ApplicationDraft = {
        ...draft,
        jobId: job.id,
        jobTitle: job.title,
        employer: job.employer,
        platform: job.platform,
        hourlyRate: String(job.hourlyRateMin),
        experienceLevel: job.experienceLevel,
        screeningAnswers: job.screeningQuestions.map((q) => ({ question: q, answer: '' })),
        lastSavedAt: new Date().toISOString(),
      };
      const nextIntended: IntendedApplicationValues = {
        ...intended,
        job_title: job.title,
        hourly_rate: job.hourlyRateMin,
        experience_level: job.experienceLevel,
      };
      handleUpdateDraft(nextDraft);
      handleUpdateIntended(nextIntended);
      recordActivity('Selected sample job for application', `${job.title} (${job.platform})`, 'apply');
      handleNavigate('apply');
    },
    [draft, intended, handleUpdateDraft, handleUpdateIntended, recordActivity, handleNavigate]
  );

  const verificationReport = useMemo(() => {
    return runDeterministicVerification(intended, {
      job_title: draft.jobTitle,
      hourly_rate: draft.hourlyRate,
      availability: draft.availability,
      experience_level: draft.experienceLevel,
      email: draft.contactEmail,
      portfolio_url: draft.portfolioUrl,
      cover_letter: draft.coverLetter,
      attachments_count: draft.attachments.length,
      screening_answers: draft.screeningAnswers,
      uninspectable_fields: [],
    });
  }, [draft, intended]);

  const currentLangOption = getLanguageOption(preferences.language);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 high-contrast:bg-black high-contrast:text-white">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <AppHeader
        currentView={currentView}
        onNavigate={handleNavigate}
        language={preferences.language}
      />

      {/* Live Visual Caption Banner (only rendered when active caption exists) */}
      {(preferences.captions || preferences.visualAlerts || preferences.textBasedNotifications) &&
        liveCaption && (
          <div
            role="status"
            aria-live="polite"
            className="border-b border-slate-200 bg-white px-4 py-2 text-xs text-slate-800 high-contrast:border-yellow-300 high-contrast:bg-black high-contrast:text-yellow-200"
          >
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 sm:px-6 lg:px-8">
              <div>
                <span className="font-semibold text-[#001F3F] high-contrast:text-yellow-300">
                  Caption / Alert:{' '}
                </span>
                <span>{liveCaption}</span>
              </div>
              <button
                type="button"
                onClick={() => setLiveCaption('')}
                className="text-xs font-semibold text-[#0056B3] hover:underline shrink-0 high-contrast:text-cyan-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

      <main id="main-content" ref={mainRef} tabIndex={-1} className="flex-1 scroll-mt-20 focus:outline-none">
        {currentView === 'landing' && (
          <LandingPage
            onNavigate={handleNavigate}
            hasCompletedOnboarding={preferences.onboardingCompleted}
            language={preferences.language}
          />
        )}

        {currentView === 'onboarding' && (
          <OnboardingWizard
            preferences={preferences}
            onUpdatePreferences={handleUpdatePreferences}
            onComplete={() => {
              handleUpdatePreferences({
                languageSelected: true,
                onboardingCompleted: true,
                startupModalCompleted: true,
              });
              recordActivity(
                'Updated accessibility preferences',
                'Saved locally in browser',
                'onboarding'
              );
              handleSpeakText('Accessibility preferences saved. Opening your dashboard.');
              handleNavigate('dashboard');
            }}
          />
        )}

        {currentView === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}

        {currentView === 'scanner' && (
          <WebsiteUnderstandingView
            onSpeakText={handleSpeakText}
            onNavigate={handleNavigate}
            simplifiedInstructions={preferences.simplifiedInstructions}
          />
        )}

        {currentView === 'jobs' && (
          <JobDiscoveryView
            onSelectJobForApplication={handleSelectJobForApplication}
            onSpeakText={handleSpeakText}
            simplifiedInstructions={preferences.simplifiedInstructions}
            onNavigate={handleNavigate}
            onOpenPreferences={() => setStartupModalOpen(true)}
          />
        )}

        {currentView === 'apply' && (
          <ApplicationAssistantView
            draft={draft}
            preferences={preferences}
            onUpdateDraft={handleUpdateDraft}
            onSaveDraft={() => {
              const stamped = { ...draft, lastSavedAt: new Date().toISOString() };
              handleUpdateDraft(stamped);
              recordActivity('Saved application draft', `${draft.jobTitle} (${draft.platform})`, 'apply');
            }}
            onNavigate={handleNavigate}
            onSpeakText={handleSpeakText}
          />
        )}

        {currentView === 'verify' && (
          <VerificationEngineView
            intended={intended}
            draft={draft}
            onUpdateIntended={handleUpdateIntended}
            onUpdateDraft={handleUpdateDraft}
            onNavigate={handleNavigate}
            onSpeakText={handleSpeakText}
            onLogVerification={(summary) => recordActivity('Verification check', summary, 'verify')}
          />
        )}

        {currentView === 'review' && (
          <FinalReviewView
            draft={draft}
            report={verificationReport}
            onNavigate={handleNavigate}
            onSpeakText={handleSpeakText}
            onConfirmApplicationReady={() =>
              recordActivity(
                'Confirmed application readiness',
                `${draft.jobTitle} marked ready for manual submission`,
                'review'
              )
            }
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-600 high-contrast:border-white high-contrast:bg-black high-contrast:text-slate-300">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-display font-bold text-[#001F3F] high-contrast:text-yellow-300">
              AccessBridge
            </span>
            <span aria-hidden="true">·</span>
            <span>Open-Source Universal Digital Accessibility Companion</span>
            <span aria-hidden="true">·</span>
            <span>Local-only privacy (zero passwords stored)</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => {
                handleUpdatePreferences({ languageSelected: false });
                setStartupModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 font-semibold text-[#0056B3] hover:underline high-contrast:text-cyan-300"
            >
              <Globe className="h-3.5 w-3.5" aria-hidden="true" />
              Language: {currentLangOption.nativeName}
            </button>
            <button
              type="button"
              onClick={() => setStartupModalOpen(true)}
              className="inline-flex items-center gap-1.5 font-semibold text-[#0056B3] hover:underline high-contrast:text-cyan-300"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              Accessibility &amp; Navigation Window
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('onboarding')}
              className="font-semibold text-[#0056B3] hover:underline high-contrast:text-cyan-300"
            >
              Full Profile Settings
            </button>
            <button
              type="button"
              onClick={() => setNavHelperOpen(true)}
              className="font-semibold text-[#0056B3] hover:underline high-contrast:text-cyan-300"
            >
              Help Me Navigate
            </button>
          </div>
        </div>
      </footer>

      {/* Floating Re-open Accessibility Window Trigger (when modal is closed) */}
      {!startupModalOpen && (
        <button
          type="button"
          onClick={() => setStartupModalOpen(true)}
          aria-label="Open Language, Accessibility and Navigation Setup Window"
          className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-lg border-2 border-[#001F3F] bg-white px-4 py-2.5 text-xs font-semibold text-[#001F3F] shadow-lg hover:bg-slate-50 high-contrast:border-yellow-300 high-contrast:bg-black high-contrast:text-yellow-300"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {currentLangOption.nativeName} · Accessibility Window
        </button>
      )}

      {/* Initial Startup Pop-up Window (Step 1: Language, Step 2: Accessibility & Navigation) */}
      <StartupAccessibilityModal
        isOpen={startupModalOpen}
        preferences={preferences}
        isSpeaking={isSpeaking}
        onUpdatePreferences={handleUpdatePreferences}
        onSpeakText={handleSpeakText}
        onStopSpeaking={handleStopSpeaking}
        onOpenNavigationHelper={() => {
          handleUpdatePreferences({ languageSelected: true, startupModalCompleted: true });
          setStartupModalOpen(false);
          setNavHelperOpen(true);
        }}
        onCompleteAndGo={handleCompleteStartupModal}
        onClose={() => setStartupModalOpen(false)}
        canCloseDirectly={preferences.startupModalCompleted}
      />

      <NavigationHelperModal
        isOpen={navHelperOpen}
        onClose={() => setNavHelperOpen(false)}
        onNavigate={handleNavigate}
        onSpeakText={handleSpeakText}
        onOpenStartupSetup={() => setStartupModalOpen(true)}
      />
    </div>
  );
}
