# AllWays Workspace Status Report

**Review date:** 2026-11-16  
**Scope:** Current working tree in `Accessible_Onboard_ft`, including tracked changes and untracked source files. This is a static code review plus TypeScript/build validation, not a manual assistive-technology audit.

## Executive summary

AllWays is a React 19 + TypeScript + Vite application for accessible job discovery and application assistance. It includes English/Amharic copy, browser speech interfaces, a local-Ollama guidance/search path, browser-local preferences, a deterministic application verification library, and an extensive camera-based gaze-control subsystem.

The project compiles and builds, but the supplied Track 1 checklist is only **partially met**:

- Amharic has meaningful coverage, but substantial UI remains English-only.
- There is a seven-screen application stepper, but no reusable step engine; its answers are not persisted.
- `localStorage` persistence exists for several data categories, but not the live application answers.
- Web Speech APIs are present, but speech services also send data to Google, and the custom endpoints are Vite development-server middleware rather than a production backend.
- Accessibility patterns are present, but WCAG 2.2 AA conformance has not been demonstrated by the available source or tests.

The highest-priority conflicts are multiple independent speech-recognition entry points, the mismatch between screen-reader detection and its controls, unreachable feature screens, and the privacy/deployment gap in speech services.

## 1. File and directory structure

The source inventory contains **61 paths** outside `.git`, `node_modules`, and `dist`; `.env` is an additional present, ignored file. The report intentionally does not read or reproduce `.env` contents. `node_modules/` and `.git/` are present but their internal contents are omitted as installed dependencies/repository metadata. `dist/` is generated build output and is listed separately.

```text
.
├── .env                         # Present; ignored; contents not inspected
├── .env.example
├── .gitignore
├── index.html
├── metadata.json
├── package.json
├── package-lock.json
├── requirements.txt
├── tsconfig.json
├── vite.config.ts
├── .git/                        # Repository metadata; contents omitted
├── node_modules/                # Installed dependencies; contents omitted
├── dist/                        # Generated build output
│   ├── index.html
│   └── assets/
│       ├── index-Blqb7hRK.js
│       ├── index-C_FWCFYu.css
│       ├── vision_bundle-BeiP3cWa.js
│       └── aistudio/
│           └── Screenshot_2026-11-14_at_12.27.47_PM_987afc40.png
├── public/
│   └── assets/
│       └── aistudio/
│           └── Screenshot_2026-11-14_at_12.27.47_PM_987afc40.png
├── scripts/
│   └── gtts_speak.py
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── index.css
    ├── accessibility/
    │   ├── GazeCalibrationOverlay.tsx
    │   ├── GazeControlManager.tsx
    │   ├── GazeOverlay.tsx
    │   ├── GazeSettingsPanel.tsx
    │   ├── gazeCalibration.ts
    │   ├── gazeControlEngine.ts
    │   ├── gazeEdgeScroll.ts
    │   ├── gazeTypes.ts
    │   ├── gazeVoiceCommands.ts
    │   ├── oneEuroFilter.ts
    │   └── useGazeVoiceCommands.ts
    ├── assets/
    │   └── images/
    │       ├── hero_accessible_workspace_1794648069172.jpg
    │       └── home-hero.jpg
    ├── components/
    │   ├── AiGuidancePanel.tsx
    │   ├── AppHeader.tsx
    │   ├── ApplicationAssistantView.tsx
    │   ├── BlindConversation.tsx
    │   ├── BrowserPermissionBanner.tsx
    │   ├── DashboardView.tsx
    │   ├── FinalReviewView.tsx
    │   ├── JobDiscoveryView.tsx
    │   ├── JobPostingView.tsx
    │   ├── LandingPage.tsx
    │   ├── LoginToApply.tsx
    │   ├── NavigationHelperModal.tsx
    │   ├── OnboardingWizard.tsx
    │   ├── StartupAccessibilityModal.tsx
    │   ├── VerificationEngineView.tsx
    │   ├── VoiceDock.tsx
    │   ├── VoiceInputButton.tsx
    │   ├── WebsiteUnderstandingView.tsx
    │   └── WelcomeModal.tsx
    ├── engines/
    │   ├── accessibilityEngine.ts
    │   ├── accountIntent.ts
    │   ├── browserPermissions.ts
    │   ├── guidanceService.ts
    │   ├── i18n.ts
    │   ├── jobDiscovery.ts
    │   ├── ollamaService.ts
    │   ├── pageCopy.ts
    │   ├── pageUnderstanding.ts
    │   ├── preferencesStore.ts
    │   ├── screenReader.ts
    │   ├── spokenEmail.ts
    │   └── verificationEngine.ts
    └── types/
        ├── accessbridge.ts
        └── ollama.ts
```

### Root files and runtime/build support

| File | Purpose |
|---|---|
| `.env` | Local environment file exists and is ignored by Git; deliberately not inspected. |
| `.env.example` | Environment-variable template; contents not needed for this review. |
| `.gitignore` | Ignores dependencies, generated output, `.env*` (except `.env.example`), and common artifacts. |
| `index.html` | Vite HTML shell, document metadata, Google Fonts links, and React root element. |
| `metadata.json` | App metadata and requested camera/microphone permissions. |
| `package.json` | React/Vite/TypeScript dependencies and `dev`, `build`, `preview`, `clean`, and `lint` scripts. No test script is defined. |
| `package-lock.json` | Locked npm dependency graph. |
| `requirements.txt` | Python dependency for gTTS (`gTTS==2.5.4`). |
| `tsconfig.json` | TypeScript compiler settings; `npm run lint` is `tsc --noEmit`. |
| `vite.config.ts` | Vite configuration and custom development middleware for `/api/tts` and `/api/stt`; details and caveats are below. |
| `scripts/gtts_speak.py` | Reads text from stdin and produces MP3 output using Python gTTS. |
| `public/assets/aistudio/Screenshot_...png` | Static screenshot asset, copied into `dist` by Vite. |

### Application entry, styles, and components

| File | Purpose |
|---|---|
| `src/main.tsx` | Creates the React root, renders `App`, and imports global CSS. |
| `src/App.tsx` | Main state and routing shell. Loads/saves preferences and drafts, coordinates login state, speech, onboarding, welcome/language dialogs, local AI help, screen-reader notice, gaze controls, and permissions. |
| `src/index.css` | Tailwind import, color/font variables, themes, high-contrast and reduced-motion styles, focus outlines, skip-link styles, animation, and dark-mode overrides. |
| `src/components/AiGuidancePanel.tsx` | Floating, bilingual help panel; accepts typed or voice questions, sends them to local Ollama service, announces responses, and optionally reads answers aloud. |
| `src/components/AppHeader.tsx` | Brand, signed-in navigation links, language selector, light/dark controls, login action, and mobile navigation drawer. |
| `src/components/ApplicationAssistantView.tsx` | Seven-step application demo for questions, CV selection, review, and a simulated success screen. |
| `src/components/BlindConversation.tsx` | Automatic spoken page guidance, command listening, language selection, navigation, application/login voice workflows, and account-intent interpretation. |
| `src/components/BrowserPermissionBanner.tsx` | Announces pending camera/microphone permission prompts and explains gaze interaction pauses. |
| `src/components/DashboardView.tsx` | Career companion dashboard with primary job-browsing action and feature summary. |
| `src/components/FinalReviewView.tsx` | Standalone application-readiness review, copy-to-clipboard packet, confirmation, and read-aloud controls. Not mounted by `App` currently. |
| `src/components/JobDiscoveryView.tsx` | Job search/filter UI, sample opportunities, local search parsing via Ollama, job details, and application entry. |
| `src/components/JobPostingView.tsx` | Opportunity detail, requirements/accessibility information, section navigation, and apply actions. |
| `src/components/LandingPage.tsx` | Older full landing-page story/carousel with English/Amharic content. Not imported/rendered by `App` now; associated home image and copy are effectively legacy. |
| `src/components/LoginToApply.tsx` | Client-side login/register form with field validation, spoken-email normalization, password visibility, voice input, and account/job modes. |
| `src/components/NavigationHelperModal.tsx` | Standalone spoken/keyboard navigation helper and destination list. Not mounted by `App` currently. |
| `src/components/OnboardingWizard.tsx` | Accessibility preference controls and presets across visual, auditory, motor, cognitive, and communication categories. English-only. `App` has a render branch, but no current main-flow control opens it. |
| `src/components/StartupAccessibilityModal.tsx` | Language-selection dialog with keyboard radio behavior, read-aloud option, and continue-to-sign-in action. |
| `src/components/VerificationEngineView.tsx` | Intended-vs-actual values checker UI and test scenarios. Not mounted by `App` currently. |
| `src/components/VoiceDock.tsx` | Persistent page-level read-aloud, voice-input, and automatic voice-guidance controls. |
| `src/components/VoiceInputButton.tsx` | Reusable microphone dictation control with support checks and status announcements. |
| `src/components/WebsiteUnderstandingView.tsx` | Simulated page inspection, HTML snippet parsing, categorization, and extension-architecture demo. Not mounted by `App` currently. |
| `src/components/WelcomeModal.tsx` | Compact bilingual first-screen welcome dialog before language selection. |

### Engines, types, and gaze-control subsystem

| File | Purpose |
|---|---|
| `src/engines/accessibilityEngine.ts` | Shared speech synthesis/audio, browser speech recognition, PCM recording, Amharic transcription request, dictation sessions, and speech cancellation. |
| `src/engines/accountIntent.ts` | Parses spoken account intents, names, email/password cues, corrections, and sign-in/register commands. |
| `src/engines/browserPermissions.ts` | Tracks concurrent browser permission prompts and requests camera/microphone access. |
| `src/engines/guidanceService.ts` | Builds bilingual safety/context prompts and calls Ollama for local help. |
| `src/engines/i18n.ts` | Supported language options and a smaller shared bilingual copy set. |
| `src/engines/jobDiscovery.ts` | Separate sample job dataset, filters, and plain-language job-breakdown helper. Not used by the current `JobDiscoveryView`. |
| `src/engines/ollamaService.ts` | Ollama HTTP client, timeout/abort/stream handling, text parsing, and structured job-search parsing. Defaults to `localhost:11434`, configurable through Vite environment variables. |
| `src/engines/pageCopy.ts` | Main English/Amharic UI copy dictionary and unsupported-language phrase detection. |
| `src/engines/pageUnderstanding.ts` | Sample external-site structures, URL matching, HTML snippet parsing, and extension bridge payload helpers. |
| `src/engines/preferencesStore.ts` | Defaults and browser-local persistence for preferences, draft, intended values, and activity history. |
| `src/engines/screenReader.ts` | Screen-reader preference storage and best-effort detection based on URL options or keyboard-only navigation. |
| `src/engines/spokenEmail.ts` | Email syntax checks and normalization of English/Amharic spoken email terms. |
| `src/engines/verificationEngine.ts` | Deterministic field-by-field readiness, mismatch, missing-data, and uninspectable-field checks. |
| `src/types/accessbridge.ts` | Navigation, accessibility preference, job, application, page-inspection, and verification domain types. |
| `src/types/ollama.ts` | Ollama request/response/options and service error types. |
| `src/accessibility/GazeCalibrationOverlay.tsx` | Nine-point gaze calibration flow, stability detection, capture, and save feedback. |
| `src/accessibility/GazeControlManager.tsx` | Gaze-control lifecycle, keyboard controls, settings, calibration, voice commands, and permission-prompt coordination. |
| `src/accessibility/GazeOverlay.tsx` | Visual gaze reticle, dwell progress, target highlight, and edge-scroll indicators. |
| `src/accessibility/GazeSettingsPanel.tsx` | Gaze/head tracking settings and status panel. Mostly English copy. |
| `src/accessibility/gazeCalibration.ts` | Polynomial calibration model, fallback coordinate mapping, and localStorage persistence. |
| `src/accessibility/gazeControlEngine.ts` | MediaPipe face/eye feature extraction, camera tracking, calibration, dwell/blink activation, scrolling, and interaction targeting. |
| `src/accessibility/gazeEdgeScroll.ts` | Edge-scroll zone, velocity, hysteresis, and viewport coordinate helpers. |
| `src/accessibility/gazeTypes.ts` | Gaze statuses, settings, features, samples, calibration, and error types. |
| `src/accessibility/gazeVoiceCommands.ts` | English command matching for gaze activation, clicks, scrolling, pause/resume, and calibration. |
| `src/accessibility/oneEuroFilter.ts` | One Euro low-pass smoothing filter for gaze coordinates. |
| `src/accessibility/useGazeVoiceCommands.ts` | Persistent microphone recognition loop that maps speech to gaze commands. |
| `src/assets/images/hero_accessible_workspace_1794648069172.jpg` | Image asset; no source import/reference was found. |
| `src/assets/images/home-hero.jpg` | Legacy landing-page image; only referenced from the unmounted `LandingPage`. |

## 2. Current implementation overview

### Main user path

The current app starts on a welcome modal, then opens the language dialog, then the account/login UI. After client-side login/register validation, it marks the session as signed in and opens job discovery. Job selection initializes part of the application draft and opens the application assistant.

Several implemented screens are not currently connected to the app renderer: website understanding (`scanner`), deterministic verification (`verify`), and final review (`review`). The navigation helper that lists these destinations is also not mounted. The onboarding wizard has a render branch but no reachable control in the current flow.

The “login” is a client-side simulation: no authentication service is called. The application assistant’s final “submitted” screen is also simulated; its answers are local component state rather than a real application submission.

### Data and persistence

`preferencesStore.ts` persists preferences, application draft, intended values, and recent activity in `localStorage`; gaze calibration and screen-reader settings use separate localStorage keys. The signed-in marker uses `sessionStorage`.

Important gap: `ApplicationAssistantView` keeps its answers and current step in component state. Although draft update/save callbacks are passed to it, the component does not use them for these answers. Navigating away or reloading can therefore lose the current step answers. The separate `VerificationEngineView` and `FinalReviewView` operate on the app draft, but they are not mounted into the current route flow.

### Speech and AI

- Speech output is centralized mainly through `accessibilityEngine.ts`: audio URL playback is attempted first, then browser speech synthesis fallback.
- English voice input uses `SpeechRecognition`/`webkitSpeechRecognition` where available.
- The custom Amharic `listenOnce` path records PCM and posts it to `/api/stt`; ordinary `VoiceInputButton` and `VoiceDock` dictation use browser recognition instead.
- `/api/tts` and `/api/stt` are installed through Vite `configureServer` middleware. That makes them development-server facilities; there is no corresponding production API server in the listed project files.
- The speech routes are not local-only: gTTS/Google Translate TTS transmit speech text to Google, and `/api/stt` forwards recorded audio to a Google Speech endpoint. The Google Speech key is hard-coded in `vite.config.ts`; its value is omitted here.
- The local AI client defaults to Ollama on localhost. Configuration can point it elsewhere.

## 3. Redundancies, overlaps, and conflicts

### Voice and audio controls

There are multiple controls with overlapping jobs:

1. `VoiceDock` offers whole-page read-aloud, a microphone, and an automatic voice-guidance toggle.
2. `BlindConversation` automatically speaks prompts and listens for commands while spoken guidance is enabled.
3. `VoiceInputButton` adds a microphone beside individual fields, in AI help, and in job search.
4. `AiGuidancePanel` has its own voice-input button and automatically reads AI answers aloud.
5. Several screens have their own “read this” buttons. Some of these screens are currently unmounted.
6. Gaze voice commands run a separate continuous recognition loop when that preference is enabled.
7. `NavigationHelperModal` has another recognizer, although the modal itself is currently unmounted.

These are not all identical features, but they share the same recognition/speech engine without a single session coordinator. `startVoiceDictation` maintains a shared active recognizer and stops the previous one when a new one starts. Consequently, starting a field mic, the VoiceDock mic, gaze commands, or a spoken-conversation listener can interrupt another session or leave one UI’s “listening” state stale. Automatic guidance and manual VoiceDock reading can also overlap as user-facing choices.

`ApplicationAssistantView` additionally cancels `window.speechSynthesis` directly, rather than calling the shared engine’s stop function. This does not reliably stop the engine’s HTML audio playback fallback, and its local “speaking” indicator resets on a short timer rather than actual completion.

### Screen-reader mode and toggles

- `screenReaderCompatibility` is shown as a preference checkbox, but source usage is limited to its type, default, and wizard UI; it does not activate or change screen-reader behavior.
- `screenReader.ts` supports `auto`/`on`/`off`, but its setting getter/setter have no UI caller in the current workspace.
- Actual automatic detection is heuristic: URL opt-in or several keyboard-only interactions before pointer use. This can mistake a keyboard-only user for a screen-reader user and can miss actual screen-reader use.
- `VoiceDock`’s “Voice guide on/off” switch is not a screen-reader toggle. Automatic spoken guidance is gated off whenever `screenReaderActive` is true.
- The App notice’s “Turn voice guidance on” action only sets the preference; the `!screenReaderActive` gate still keeps automatic guidance off. The label therefore suggests an override that does not take effect.
- Manual read-aloud controls remain available while a screen reader is detected, so users can still intentionally produce overlapping audio.

### Duplicate or disconnected implementation

- Job listings/filtering exist both in `engines/jobDiscovery.ts` and as a separate inline `OPPORTUNITIES` dataset in `JobDiscoveryView.tsx`; the engine helpers are not used by that view.
- `LandingPage.tsx`, its image, and home-oriented copy remain in source but are not rendered by `App` after the welcome-flow change.
- `NavigationHelperModal` lists `scanner`, `verify`, and `review` routes, but it is not mounted. `App` has no rendering branches for those view values either.
- `WebsiteUnderstandingView`, `VerificationEngineView`, and `FinalReviewView` are present but not mounted.
- Navigation shortcuts conflict: the app-level shortcut map assigns Alt+1/2/3 to jobs/apply/login, while the unmounted helper advertises Alt+1 through Alt+7 for dashboard/scanner/jobs/apply/verify/review/onboarding.
- `clearAllLocalData()` exists but is not called by current UI.

## 4. Hackathon Track 1 checklist status

This assessment uses the five requirements named in the request; no Track 1 specification document was found in the workspace.

| Requirement | Status | Evidence and remaining gap |
|---|---|---|
| Amharic localization | **Partial** | Amharic is supported in language selection, shared copy, much of `pageCopy.ts`, welcome flow, speech command matching, and some controls. Large areas remain English-only, including the accessibility wizard, gaze settings/calibration, navigation helper, job posting labels, verification/final review, and some status/error messages. The language is applied to the HTML `lang` attribute, but not every rendered string follows it. |
| Step engine | **Partial** | `ApplicationAssistantView` implements a seven-step fixed wizard with progress, per-step checks, focus on step headings, review/edit, and a confirmation checkbox. There is no reusable step-engine module, no branching engine, and the `stepByStepNavigation` preference is not consumed by the application flow. Step answers remain component state and are not saved to the draft. |
| localStorage persistence | **Mostly present, incomplete** | Preferences, application draft, intended values, activity log, gaze calibration, screen-reader setting, and some dismissal state use `localStorage`. Sign-in uses `sessionStorage`. However, live form answers/step position are not persisted; some storage errors are silently ignored; and the visible application submission is a client-side simulation. |
| Web Speech API integration | **Partial** | The code detects/uses `SpeechSynthesis`, `SpeechRecognition` and `webkitSpeechRecognition`, supports dictation buttons, and has an Amharic PCM-to-transcription route. Amharic voice input in standard dictation buttons still depends on browser recognition support, while the custom Amharic flow uses a separate route. TTS/STT route availability is development-only as written. |
| WCAG 2.2 AA | **Not verified; useful foundations** | Positive patterns include skip link, visible focus, semantic landmarks/labels, live status regions, reduced-motion support, keyboard radio/tab behavior, focus handling in several dialogs, high-contrast mode, and text scaling. No WCAG test suite, axe scan, contrast measurements, or documented NVDA/JAWS/VoiceOver/keyboard test evidence is present. The screen-reader detection/toggle mismatch, incomplete localization, several orphan screens, and untested focus/target-size/contrast behavior prevent a conformance claim. |

## 5. Priority follow-ups

1. **Unify speech-session ownership.** Coordinate recognition and speech output so automatic guidance, field dictation, AI help, and gaze commands cannot unexpectedly cancel or overlap one another; synchronize listening/speaking indicators to actual session state.
2. **Resolve speech privacy and production support.** Make external audio/text processing explicit to users, remove any embedded service credential from source, and provide secured production endpoints or use browser/local speech services consistently. The current `/api/tts` and `/api/stt` handlers only exist in Vite development middleware.
3. **Complete the application data flow.** Persist wizard answers into the draft, connect verification/final review to reachable routes, and distinguish simulated completion from a real submission.
4. **Finish Amharic coverage and review translations.** Localize all reachable controls, errors, dialogs, status messages, and accessibility settings; add language-specific test coverage.
5. **Clarify screen-reader behavior.** Provide an actual override control or remove unused settings, improve detection messaging, and make the notice’s “turn on” action consistent with the spoken-guidance gate.
6. **Reconnect or remove legacy/demo routes and data.** Wire reachable screens into `App`, reconcile duplicate job data, and remove stale home-page code/assets once no longer needed.
7. **Add accessibility and behavior tests.** There is no test script or test file in the current inventory. Add focused tests and manual keyboard/screen-reader/contrast checks; build/type-check alone do not establish WCAG conformance.

## 6. Validation and workspace state

- `npm run lint` — passed (`tsc --noEmit`).
- `npm run build` — passed. Vite emitted a non-blocking warning that `__dirname` in `vite.config.ts` is unsupported by its future native config loader.
- No test script or test/spec files were found.
- The worktree contains **18 modified tracked files** and **5 untracked source files** at review time. This report describes the current worktree, not only the last commit.
- `.env` is ignored by the repository rules and was not opened. A credential-like Google Speech service key is embedded in `vite.config.ts`; its value is intentionally omitted from this report.

