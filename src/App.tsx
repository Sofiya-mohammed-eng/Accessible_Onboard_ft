import { useCallback, useEffect, useRef, useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { OnboardingWizard } from './components/OnboardingWizard';
import { DashboardView } from './components/DashboardView';
import { JobDiscoveryView } from './components/JobDiscoveryView';
import { ApplicationAssistantView } from './components/ApplicationAssistantView';
import { LoginToApply } from './components/LoginToApply';
import { BlindConversation } from './components/BlindConversation';
import { StartupAccessibilityModal } from './components/StartupAccessibilityModal';
import { WelcomeModal } from './components/WelcomeModal';
import { BrowserPermissionBanner } from './components/BrowserPermissionBanner';
import { AssistantStatusPill, AssistantState } from './components/AssistantStatusPill';
import { GazeControlManager } from './accessibility/GazeControlManager';
import {
  dismissScreenReaderNotice,
  getScreenReaderChoice,
  isScreenReaderNoticeDismissed,
  setScreenReaderChoice,
  shouldSuppressAutoSpeech,
  useScreenReaderActive,
  type ScreenReaderChoice,
} from './engines/screenReader';
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
import { speakAloud, stopAllSpeechAndListening } from './engines/accessibilityEngine';
import { askLocalGuidance, GUIDANCE_UNAVAILABLE } from './engines/guidanceService';
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

const AMHARIC_WELCOME =
  "ሰላም! በምዝገባዎ ላይ ልረዳዎ መጥቻለሁ። ድምጽን በመጠቀም መቀጠል ይፈልጋሉ? ወይስ ያለ ድምጽ እራስዎ መጠቀም ይፈልጋሉ? ማቆም ከፈለጉ 'አቁም' ይበሉ።";

export default function App() {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(() => loadPreferences());
  const [draft, setDraft] = useState<ApplicationDraft>(() => loadApplicationDraft());
  const [intended, setIntended] = useState<IntendedApplicationValues>(() => loadIntendedValues());
  const [, setActivities] = useState<ActivityLogItem[]>(() => loadActivities());
  const [currentView, setCurrentView] = useState<NavigationView>('landing');
  const [welcomeOpen, setWelcomeOpen] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [liveCaption, setLiveCaption] = useState<string>('');
  const [startupModalOpen, setStartupModalOpen] = useState<boolean>(false);
  const [signedIn, setSignedIn] = useState<boolean>(() => sessionStorage.getItem('allways-signed-in') === '1');
  const [assistantListening, setAssistantListening] = useState<boolean>(false);
  const [assistantMuted, setAssistantMuted] = useState<boolean>(false);
  const [srChoice, setSrChoice] = useState<ScreenReaderChoice | null>(() => getScreenReaderChoice());
  const [srNoticeDismissed, setSrNoticeDismissed] = useState<boolean>(() => isScreenReaderNoticeDismissed());
  const screenReaderActive = useScreenReaderActive();
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
    if (view === 'landing') {
      setCurrentView('landing');
      setWelcomeOpen(true);
      return;
    }
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
    stopAllSpeechAndListening();
    setIsSpeaking(false);
    setAssistantListening(false);
  }, []);

  const handleStopAssistant = useCallback(() => {
    handleStopSpeaking();
    setAssistantMuted(true);
  }, [handleStopSpeaking]);

  const handleTurnAssistantOn = useCallback(() => {
    setAssistantMuted(false);
  }, []);

  // Global Escape shortcut: immediately silence all speech and listening.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleStopSpeaking();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleStopSpeaking]);

  // Amharic-first welcome. Spoken only when no screen reader conflict is
  // detected, so we never talk over an active screen reader.
  const welcomeSpokenRef = useRef(false);
  useEffect(() => {
    if (welcomeSpokenRef.current) return;
    if (!welcomeOpen || currentView !== 'landing') return;
    if (shouldSuppressAutoSpeech()) return;
    welcomeSpokenRef.current = true;
    const timer = window.setTimeout(() => {
      if (shouldSuppressAutoSpeech()) return;
      handleSpeakText(AMHARIC_WELCOME, 'am-ET');
    }, 900);
    return () => window.clearTimeout(timer);
  }, [welcomeOpen, currentView, handleSpeakText]);

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
  const viewAnnouncements: Record<NavigationView, string> =
    preferences.language === 'am'
      ? {
          landing: 'እንኳን ደህና መጡ',
          onboarding: 'የተደራሽነት ማዋቀሪያ',
          dashboard: 'ዳሽቦርድ',
          scanner: 'የቅጽ ቃኚ',
          jobs: 'ሥራዎችን ይፈልጉ',
          apply: 'የማመልከቻ እርዳታ',
          login: 'ይግቡ',
          verify: 'ማረጋገጫ',
          review: 'የመጨረሻ ግምገማ',
        }
      : {
          landing: 'Welcome',
          onboarding: 'Accessibility setup',
          dashboard: 'Dashboard',
          scanner: 'Form scanner',
          jobs: 'Job search',
          apply: 'Application assistant',
          login: 'Sign in',
          verify: 'Verification',
          review: 'Final review',
        };
  const viewAnnouncement = viewAnnouncements[currentView];
  const guidanceMode = preferences.guidanceMode;
  const spokenGuidanceActive =
    guidanceMode === 'voice' &&
    !assistantMuted &&
    (srChoice === 'voice' || !screenReaderActive);
  const assistantVisible = guidanceMode === 'voice' && !welcomeOpen && !startupModalOpen;
  const assistantState: AssistantState = assistantMuted
    ? 'off'
    : isSpeaking
      ? 'speaking'
      : assistantListening
        ? 'listening'
        : 'off';
  const showScreenReaderNotice =
    screenReaderActive && !srNoticeDismissed && guidanceMode !== 'voice';

  const openLanguage = useCallback(() => {
    setWelcomeOpen(false);
    setStartupModalOpen(true);
  }, []);
  const openDashboard = useCallback(() => handleNavigate('dashboard'), [handleNavigate]);
  const chooseLanguage = useCallback(
    (language: PreferredLanguage) => handleUpdatePreferences({ language, languageSelected: true }),
    [handleUpdatePreferences],
  );
  const continueToSignIn = useCallback(() => {
    setStartupModalOpen(false);
    handleNavigate('login');
  }, [handleNavigate]);
  const resolveScreenReader = useCallback(
    (choice: ScreenReaderChoice) => {
      setScreenReaderChoice(choice);
      setSrChoice(choice);
      handleUpdatePreferences(
        choice === 'reader'
          ? { guidanceMode: 'standard', spokenGuidanceEnabled: false }
          : { guidanceMode: 'voice', spokenGuidanceEnabled: true }
      );
    },
    [handleUpdatePreferences]
  );
  const handleAskAi = useCallback(
    (question: string) => {
      const trimmed = question.trim();
      if (!trimmed) return;
      void (async () => {
        try {
          const answer = await askLocalGuidance(trimmed, {
            language: preferences.language,
            pageLabel: viewAnnouncement,
          });
          handleSpeakText(answer);
        } catch {
          handleSpeakText(GUIDANCE_UNAVAILABLE[preferences.language]);
        }
      })();
    },
    [preferences.language, viewAnnouncement, handleSpeakText]
  );

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-[#0e2a4a] high-contrast:bg-black high-contrast:text-white">
      <a href="#main-content" className="skip-link">
        {page.skipToContent}
      </a>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {viewAnnouncement}
      </p>

      {currentView !== 'landing' && (
        <AppHeader
          currentView={currentView}
          onNavigate={handleNavigate}
          onLogin={() => handleNavigate('login')}
          onGetStarted={openLanguage}
          onOpenLanguage={() => setStartupModalOpen(true)}
          language={preferences.language}
          languageLabel={currentLangOption.nativeName}
          loginLabel={page.login}
          signedIn={signedIn}
          colorMode={preferences.colorMode}
          onSetColorMode={(colorMode) => handleUpdatePreferences({ colorMode })}
        />
      )}

      {/* Live Visual Caption Banner (only rendered when active caption exists) */}
      {liveCaption && (
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="border-b border-[#d5e6f7] bg-white/80 px-4 py-2 text-xs text-[#0e2a4a] backdrop-blur high-contrast:border-yellow-300 high-contrast:bg-black high-contrast:text-yellow-200"
          >
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 sm:px-6 lg:px-8">
              <div>
                <span className="font-semibold text-[#001F3F] high-contrast:text-yellow-300">
                  {page.captionAlert}{' '}
                </span>
                <span>{liveCaption}</span>
              </div>
              <button
                type="button"
                onClick={() => setLiveCaption('')}
                aria-label={page.dismissCaption}
                className="shrink-0 text-xs font-semibold text-[#0056B3] hover:underline high-contrast:text-cyan-300"
              >
                {page.dismiss}
              </button>
            </div>
          </div>
        )}

      <main id="main-content" ref={mainRef} tabIndex={-1} className="flex-1 scroll-mt-20 focus:outline-none">
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
              handleSpeakText(page.prefsSaved);
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

      {currentView !== 'landing' && (
        <footer className="border-t border-white/80 bg-white/75 py-10 text-sm text-[#4d6786] backdrop-blur high-contrast:border-white high-contrast:bg-black high-contrast:text-slate-300">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:px-8">
            <div>
              <p className="font-display text-2xl font-bold text-[#0e2a4a] high-contrast:text-yellow-300">AllWays</p>
              <p className="mt-2 max-w-md text-base text-[#0e2a4a] high-contrast:text-white">
                {page.homeKicker}
              </p>
              <p className="mt-3 max-w-md leading-relaxed">
                {page.footerLead}
              </p>
            </div>
            <nav aria-label={page.footerNavLabel} className="flex flex-wrap items-start gap-3 lg:justify-end">
              <button type="button" onClick={() => handleNavigate('landing')} className="rounded-full bg-white px-4 py-2 font-semibold text-[#0e2a4a] ring-1 ring-[#d5e6f7]">
                {page.navHome}
              </button>
              {signedIn ? (
                <>
                  <button type="button" onClick={() => handleNavigate('jobs')} className="rounded-full bg-white px-4 py-2 font-semibold text-[#0e2a4a] ring-1 ring-[#d5e6f7]">
                    {page.navFindJobs}
                  </button>
                  <button type="button" onClick={() => handleNavigate('apply')} className="rounded-full bg-white px-4 py-2 font-semibold text-[#0e2a4a] ring-1 ring-[#d5e6f7]">
                    {page.navApply}
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => handleNavigate('login')} className="rounded-full bg-[#1a73e8] px-4 py-2 font-semibold text-white">
                  {page.navSignIn}
                </button>
              )}
            </nav>
          </div>
        </footer>
      )}

      <BlindConversation
        enabled={!welcomeOpen && spokenGuidanceActive}
        language={preferences.language}
        rate={preferences.speechRate}
        pageKey={currentView}
        languageOpen={startupModalOpen}
        onCaption={setLiveCaption}
        onGetStarted={openLanguage}
        onOpenDashboard={openDashboard}
        onChooseLanguage={chooseLanguage}
        onContinueToSignIn={continueToSignIn}
        onAskAi={handleAskAi}
        onStop={handleStopAssistant}
        onListeningChange={setAssistantListening}
      />

      <AssistantStatusPill
        state={assistantState}
        mode={guidanceMode}
        language={preferences.language}
        visible={assistantVisible}
        onStop={handleStopAssistant}
        onTurnOn={handleTurnAssistantOn}
      />

      {showScreenReaderNotice && (
        <div
          role="status"
          className="fixed left-1/2 top-4 z-[97] flex w-[min(94vw,34rem)] -translate-x-1/2 items-start gap-3 rounded-xl border-2 border-[#1a73e8] bg-white p-4 text-[#0e2a4a] shadow-2xl high-contrast:border-yellow-300 high-contrast:bg-black high-contrast:text-white"
        >
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e7f3ff] text-lg" aria-hidden="true">
            ♿
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{page.srDetected}</p>
            <p className="mt-1 text-xs leading-relaxed">{page.srGuidancePaused}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  resolveScreenReader('voice');
                  dismissScreenReaderNotice();
                  setSrNoticeDismissed(true);
                }}
                className="rounded-md bg-[#1a73e8] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0d4f9e] high-contrast:bg-yellow-300 high-contrast:text-black"
              >
                {page.turnVoiceOn}
              </button>
              <button
                type="button"
                onClick={() => {
                  dismissScreenReaderNotice();
                  setSrNoticeDismissed(true);
                }}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              >
                {page.dismiss}
              </button>
            </div>
          </div>
        </div>
      )}

      <StartupAccessibilityModal
        isOpen={startupModalOpen}
        preferences={preferences}
        isSpeaking={isSpeaking}
        screenReaderActive={screenReaderActive}
        screenReaderResolved={srChoice !== null}
        onUpdatePreferences={handleUpdatePreferences}
        onResolveScreenReader={resolveScreenReader}
        onSpeakText={handleSpeakText}
        onStopSpeaking={handleStopSpeaking}
        onOpenNavigationHelper={() => setStartupModalOpen(false)}
        onCompleteAndGo={handleCompleteStartupModal}
        onClose={() => {
          setStartupModalOpen(false);
          if (currentView === 'landing') setWelcomeOpen(true);
        }}
        canCloseDirectly={preferences.languageSelected}
      />

      {welcomeOpen && currentView === 'landing' && (
        <WelcomeModal language={preferences.language} onContinue={openLanguage} />
      )}

      <GazeControlManager
        preferences={preferences}
        onUpdatePreferences={handleUpdatePreferences}
      />
      <BrowserPermissionBanner />
    </div>
  );
}
