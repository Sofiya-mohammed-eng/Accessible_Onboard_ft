# AllWays platform status

Date: 15 November 2026  
Project: AllWays (`Accessible_Onboard_ft-1`)  
Branch: `backup`  
This file describes the app as it runs now, including work that is not committed yet.

AllWays is a job-application companion for people who need another way to read, hear, speak, or move through a form. The current product is a browser demo. Accounts, jobs, and applications stay on this computer. Nothing is sent to an employer.

## What a person can do today

1. Open the home page. The page speaks in English and Amharic and asks them to say “get started” or “ጀምር”.
2. Choose English or Amharic, by voice or by pressing a language.
3. Answer “Which one do you prefer?” They can say or press:
   - Head movement
   - Eyes
   - Head and eyes
   - Voice
   - Keyboard
4. Sign in or register. The form checks the email and, for registration, that the two passwords match. A successful submit only sets a flag in this browser. There is no account server.
5. Look through sample jobs and open one posting.
6. Apply one question at a time. They can hear the question, type the answer, or say it. The draft is stored in this browser. Submit does not send the application anywhere.

Jobs, dashboard, and apply stay behind the local sign-in flag. Home and the language screen do not.

## Languages and speech

- English and Amharic are the two languages in the interface and in the spoken guide.
- Speech output uses the browser’s own voice.
- English listening uses the browser speech recognizer.
- Amharic listening can use the browser recognizer, and the speech engine also has a path that records audio and posts it to `/api/stt?lang=am-ET`. That endpoint is not part of the running app unless a separate server is started.
- A caption line shows the words that were just spoken or heard.
- The voice dock can read the current page aloud and take a short spoken command when the start dialog is closed.

## Ways to control the app

| Choice | What starts | Current behavior |
| --- | --- | --- |
| Head movement | Camera gaze, head only | Face tracking works on the built-in camera. A modest head turn moves the cursor. Resting on a button selects it. |
| Eyes | Camera gaze, eyes only | Same tracker, using eye position. |
| Head and eyes | Camera gaze, both | This is the usual gaze mode. |
| Voice | Spoken guide, camera stays off | The guide keeps asking and filling the sign-in and application steps. |
| Keyboard | Tab and Enter, camera stays off | The page can be used without a mouse. |

Gaze details that are in the product:

- A **Gaze: Off / On** control sits at the bottom right on every screen.
- Settings cover tracking mode, dwell or blink click, sensitivity, smoothing, edge scroll, voice commands for gaze, calibration, and recenter.
- The first camera frame is copied before face detection, because a hidden 2-pixel video was being read as an empty frame.
- Movement is stronger than the first version, and a button stays selected through a small jitter so the click can finish.
- Dwell is about half a second with the current default. Sensitivity is high. Both can be changed in the gaze panel.
- Calibration is a 9-point wizard. It is optional. Saved calibration stays in this browser and can turn gaze on automatically next time.
- Camera and microphone prompts show a banner telling the person to press Tab and Enter, or to ask someone to choose Allow. The gaze cursor cannot press the browser’s own permission popup.
- Video stays in the browser. The face model is downloaded from MediaPipe the first time gaze starts. No camera image is uploaded by the gaze feature.

## Screens in the live path

| Screen | Status |
| --- | --- |
| Home | Working. English and Amharic copy, light and dark, get started. |
| Language, then control choice | Working. Spoken and on screen. |
| Sign in / register | Working as a local check only. |
| Find jobs | Working with built-in sample listings. |
| Job posting | Working inside Find jobs. |
| Apply | Working as a guided local form. |
| Dashboard | Built and reachable after sign-in, but it is a short welcome, not a saved-applications list. |

## Stored on this computer

- Language, colors, text size, and the chosen control.
- Gaze calibration.
- The application draft.
- A local “signed in” flag that lasts until the browser tab session ends.
- An activity note when a job is chosen or a draft is saved.

Clearing site data removes all of this.

## Built, but not part of the current path

These files exist and are not mounted from the current home → language → control → sign-in → jobs → apply flow:

- Website understanding. It explains a pasted page or a sample posting. It cannot read a live external site, because the browser blocks that.
- Verification engine.
- Final review as its own screen. The apply flow has its own last step.
- Older navigation-helper dialog.
- The longer onboarding wizard. The app can still open it if something navigates to that view, but Get started no longer does.

## What this version is not

- It is not connected to Upwork, LinkedIn, Indeed, or any employer.
- It does not create a real account, reset a password, or keep a password.
- It does not submit an application.
- Jobs are sample listings marked as sample data, not a live search.
- It does not translate the whole product beyond English and Amharic.
- High contrast, larger text, magnification, and reduced motion exist as preference flags. The start conversation does not ask for them.
- Gaze is easier than the first version and still needs a calibration pass before it is precise for every person. Bright light, a covered camera, or a face outside the frame still shows “No face detected.”
- The hands-free Windows launcher and its setup note are on `main`. They were not brought onto this branch. This branch has the gaze control itself.

## Code and git

- App entry: `src/App.tsx`
- Spoken guide: `src/components/BlindConversation.tsx`
- Start question: `src/components/StartupAccessibilityModal.tsx` and `src/engines/controlChoice.ts`
- Gaze: `src/accessibility/`
- Speech: `src/engines/accessibilityEngine.ts`
- Sample jobs: `src/engines/jobDiscovery.ts`

`backup` already contains the earlier UI, speech, and the gaze files copied from `main`. These later changes are still uncommitted:

- Easier gaze movement and selection
- Real camera frames for face detection
- The “which one do you prefer?” start question

`main` has the original gaze commit. It does not have this branch’s newer home page, spoken application guide, or the start question.
