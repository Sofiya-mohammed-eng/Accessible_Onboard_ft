import { useCallback, useEffect, useRef, useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { LandingPage } from './components/LandingPage';
import { OnboardingWizard } from './components/OnboardingWizard';
import { DashboardView } from './components/DashboardView';
import { JobDiscoveryView } from './components/JobDiscoveryView';
import { ApplicationAssistantView } from './components/ApplicationAssistantView';
import { LoginToApply } from './components/LoginToApply';
import { VoiceDock } from './components/VoiceDock';
import { BlindConversation } from './components/BlindConversation';
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
import { getPageCopy } from './engines/pageCopy';
import {
  AccessibilityPreferences,
  ActivityLogItem,
  ApplicationDraft,
  IntendedApplicationValues,
  JobListing,
  NavigationView,
  PreferredLanguage,
} from './types/accessbridge';

export default function App() {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(() => loadPreferences());
  const [draft, setDraft] = useState<ApplicationDraft>(() => loadApplicationDraft());
  const [intended, setIntended] = useState<IntendedApplicationValues>(() => loadIntendedValues());
  const [, setActivities] = useState<ActivityLogItem[]>(() => loadActivities());
  const [currentView, setCurrentView] = useState<NavigationView>('landing');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [liveCaption, setLiveCaption] = useState<string>('');
  const [startupModalOpen, setStartupModalOpen] = useState<boolean>(false);
  const [signedIn, setSignedIn] = useState<boolean>(() => sessionStorage.getItem('allways-signed-in') === '1');
  const mainRef = useRef<HTMLElement | null>(null);

  // Sync accessibility & language attributes onto <html> element
  useEffect(() => {
    const root = document.documentElement;
    root.lang = preferences.language || 'en';
    root.classList.toggle('theme-dark', preferences.colorMode === 'dark');
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
    const needsAccount = view === 'jobs' || view === 'apply' || view === 'dashboard';
    const next = needsAccount && !signedIn ? 'login' : view;
    setCurrentView(next);
    window.scrollTo({ top: 0, behavior: 'auto' });
    setTimeout(() => {
      mainRef.current?.focus();
    }, 0);
  }, [signedIn]);

  // Global Keyboard Shortcuts (Alt+1 to Alt+7)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      const map: Record<string, NavigationView> = {
        '1': 'jobs',
        '2': 'apply',
        '3': 'login',
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

  const currentLangOption = getLanguageOption(preferences.language);
  const page = getPageCopy(preferences.language);
  const openLanguage = useCallback(() => setStartupModalOpen(true), []);
  const openDashboard = useCallback(() => handleNavigate('dashboard'), [handleNavigate]);
  const chooseLanguage = useCallback(
    (language: PreferredLanguage) => handleUpdatePreferences({ language, languageSelected: true }),
    [handleUpdatePreferences],
  );
  const continueToSignIn = useCallback(() => {
    setStartupModalOpen(false);
    handleNavigate('login');
  }, [handleNavigate]);

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-[#0e2a4a] high-contrast:bg-black high-contrast:text-white">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <AppHeader
        currentView={currentView}
        onNavigate={handleNavigate}
        onLogin={() => handleNavigate('login')}
        onGetStarted={() => setStartupModalOpen(true)}
        onOpenLanguage={() => setStartupModalOpen(true)}
        language={preferences.language}
        languageLabel={currentLangOption.nativeName}
        loginLabel={page.login}
        signedIn={signedIn}
        colorMode={preferences.colorMode}
        onSetColorMode={(colorMode) => handleUpdatePreferences({ colorMode })}
      />

      {/* Live Visual Caption Banner (only rendered when active caption exists) */}
      {liveCaption && (
          <div
            role="status"
            aria-live="polite"
            className="border-b border-[#d5e6f7] bg-white/80 px-4 py-2 text-xs text-[#0e2a4a] backdrop-blur high-contrast:border-yellow-300 high-contrast:bg-black high-contrast:text-yellow-200"
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
            onGetStarted={() => setStartupModalOpen(true)}
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

        {currentView === 'dashboard' && (
          <DashboardView onNavigate={handleNavigate} language={preferences.language} />
        )}

        {currentView === 'jobs' && (
          <JobDiscoveryView
            onSelectJobForApplication={handleSelectJobForApplication}
            onSpeakText={handleSpeakText}
            simplifiedInstructions={preferences.simplifiedInstructions}
            onNavigate={handleNavigate}
            onOpenPreferences={() => setStartupModalOpen(true)}
            language={preferences.language}
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

        {currentView === 'login' && (
          <LoginToApply
            purpose="account"
            language={preferences.language}
            onBack={() => handleNavigate('landing')}
            onContinue={() => {
              sessionStorage.setItem('allways-signed-in', '1');
              setSignedIn(true);
              setCurrentView('jobs');
            }}
          />
        )}
      </main>

      <footer className="border-t border-white/80 bg-white/75 py-10 text-sm text-[#4d6786] backdrop-blur high-contrast:border-white high-contrast:bg-black high-contrast:text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:px-8">
          <div>
            <p className="font-display text-2xl font-bold text-[#0e2a4a] high-contrast:text-yellow-300">AllWays</p>
            <p className="mt-2 max-w-md text-base text-[#0e2a4a] high-contrast:text-white">
              {preferences.language === 'am'
                ? 'አንድ መድረክ። የተለያዩ ችሎታዎች። እኩል እድሎች።'
                : 'One platform. Different abilities. Equal opportunities.'}
            </p>
            <p className="mt-3 max-w-md leading-relaxed">
              {preferences.language === 'am'
                ? 'ቋንቋዎን ይምረጡ፣ ይግቡ፣ እና ሥራዎን በተረጋጋ ውይይት ያመልክቱ።'
                : 'Choose your language, sign in, and apply for work in a calm conversation.'}
            </p>
          </div>
          <nav aria-label={preferences.language === 'am' ? 'የግርጌ አገናኞች' : 'Footer'} className="flex flex-wrap items-start gap-3 lg:justify-end">
            <button type="button" onClick={() => handleNavigate('landing')} className="rounded-full bg-white px-4 py-2 font-semibold text-[#0e2a4a] ring-1 ring-[#d5e6f7]">
              {preferences.language === 'am' ? 'መነሻ' : 'Home'}
            </button>
            {signedIn ? (
              <>
                <button type="button" onClick={() => handleNavigate('jobs')} className="rounded-full bg-white px-4 py-2 font-semibold text-[#0e2a4a] ring-1 ring-[#d5e6f7]">
                  {preferences.language === 'am' ? 'ስራ ፈልግ' : 'Find Jobs'}
                </button>
                <button type="button" onClick={() => handleNavigate('apply')} className="rounded-full bg-white px-4 py-2 font-semibold text-[#0e2a4a] ring-1 ring-[#d5e6f7]">
                  {preferences.language === 'am' ? 'ያመልክቱ' : 'Apply'}
                </button>
              </>
            ) : (
              <button type="button" onClick={() => handleNavigate('login')} className="rounded-full bg-[#1a73e8] px-4 py-2 font-semibold text-white">
                {preferences.language === 'am' ? 'ይግቡ' : 'Sign in'}
              </button>
            )}
          </nav>
        </div>
      </footer>

      <BlindConversation
        enabled
        language={preferences.language}
        rate={preferences.speechRate}
        pageKey={currentView}
        languageOpen={startupModalOpen}
        onCaption={setLiveCaption}
        onGetStarted={openLanguage}
        onOpenDashboard={openDashboard}
        onChooseLanguage={chooseLanguage}
        onContinueToSignIn={continueToSignIn}
      />
      {!startupModalOpen && (
        <VoiceDock
          language={preferences.language}
          speaking={isSpeaking}
          onSpeak={handleSpeakText}
          onStop={handleStopSpeaking}
        />
      )}

      <StartupAccessibilityModal
        isOpen={startupModalOpen}
        preferences={preferences}
        isSpeaking={isSpeaking}
        onUpdatePreferences={handleUpdatePreferences}
        onSpeakText={handleSpeakText}
        onStopSpeaking={handleStopSpeaking}
        onOpenNavigationHelper={() => setStartupModalOpen(false)}
        onCompleteAndGo={handleCompleteStartupModal}
        onClose={() => setStartupModalOpen(false)}
        canCloseDirectly={preferences.languageSelected}
      />
    </div>
  );
}
