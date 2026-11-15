import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StartupIntro } from '../components/StartupIntro';
import { DEFAULT_PREFERENCES } from './preferencesStore';
import {
  WELCOME_CONTINUE,
  WELCOME_LOADING,
  WELCOME_TITLE,
  afterMethods,
  applyInteractionChoices,
  cameraFailureDisablesHead,
  explicitLanguage,
  gazeAfterHeadConfirmation,
  gazeEnabledOnStartup,
  headPrompt,
  instructionSpeechCode,
  interpretHeadConfirmation,
  interpretInteractionUtterance,
  mayRequestCamera,
  methodsPrompt,
  welcomeFallsBackMs,
  withSelectedLanguage,
} from './startupFlow';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('accessible startup flow', () => {
  it('keeps language and head-movement questions off the welcome screen', () => {
    const html = renderToStaticMarkup(createElement(StartupIntro, { onFinished() {} }));
    assert.match(html, new RegExp(WELCOME_LOADING));
    assert.equal(html.includes('Amharic'), false);
    assert.equal(html.includes('አማርኛ'), false);
    assert.equal(/head movement/i.test(html), false);
    assert.equal(html.includes('Choose English'), false);
    const source = readFileSync(join(root, 'components/StartupIntro.tsx'), 'utf8');
    assert.match(source, /WELCOME_TITLE/);
    assert.equal(/head movement/i.test(source), false);
  });

  it('offers a keyboard-operable Continue button', () => {
    const html = renderToStaticMarkup(createElement(StartupIntro, { onFinished() {} }));
    assert.match(html, new RegExp(`<button[^>]*type="button"[^>]*>${WELCOME_CONTINUE}</button>`));
    assert.equal(welcomeFallsBackMs('loading', true) < welcomeFallsBackMs('loading', false), true);
    assert.equal(welcomeFallsBackMs('welcome', true) < welcomeFallsBackMs('welcome', false), true);
  });

  it('saves a language before later spoken instructions', () => {
    assert.equal(explicitLanguage(DEFAULT_PREFERENCES), null);
    assert.equal(instructionSpeechCode(DEFAULT_PREFERENCES), null);
    const saved = withSelectedLanguage(DEFAULT_PREFERENCES, 'am');
    assert.equal(saved.language, 'am');
    assert.equal(saved.languageSelected, true);
    assert.equal(instructionSpeechCode(saved), 'am-ET');
    assert.equal(instructionSpeechCode(withSelectedLanguage(DEFAULT_PREFERENCES, 'en')), 'en-US');
  });

  it('uses the selected language for later startup instructions', () => {
    assert.match(methodsPrompt('en'), /keyboard/i);
    assert.equal(methodsPrompt('en').includes('ድምፅ'), false);
    assert.match(methodsPrompt('am'), /ድምፅ/);
    assert.equal(methodsPrompt('am').includes('keyboard'), false);
    assert.match(headPrompt('en'), /camera/i);
    assert.match(headPrompt('am'), /ካሜራ/);
    const guide = readFileSync(join(root, 'components/BlindConversation.tsx'), 'utf8');
    const methods = guide.slice(guide.indexOf("startupStep === 'methods'"), guide.indexOf("startupStep === 'head'"));
    assert.match(methods, /methodsPrompt\(currentLanguage\(\)\)/);
    assert.match(methods, /hear\(speechLang\(\)\)/);
    assert.equal(methods.includes('am-ET'), false);
  });

  it('keeps several interaction methods enabled together', () => {
    const next = applyInteractionChoices(DEFAULT_PREFERENCES, {
      keyboard: true,
      voice: true,
      head: true,
      eye: false,
      pointer: true,
    });
    assert.equal(next.keyboardNavigation, true);
    assert.equal(next.switchCompatibleControls, true);
    assert.equal(next.speechInput, true);
    assert.equal(next.textInput, true);
    assert.equal(next.voiceCommands, DEFAULT_PREFERENCES.voiceCommands);
    assert.equal(next.gazeControlEnabled, false);
    const voiceOnly = applyInteractionChoices(
      { ...DEFAULT_PREFERENCES, keyboardNavigation: true, textSize: 'large', speechRate: 0.8, language: 'am', languageSelected: true },
      { keyboard: false, voice: true, head: false, eye: false, pointer: false },
    );
    assert.equal(voiceOnly.keyboardNavigation, true);
    assert.equal(voiceOnly.speechInput, true);
    assert.equal(voiceOnly.textSize, 'large');
    assert.equal(voiceOnly.speechRate, 0.8);
    assert.equal(voiceOnly.language, 'am');
  });

  it('lets skip reach login without enabling head movement', () => {
    const app = readFileSync(join(root, 'App.tsx'), 'utf8');
    const finish = app.slice(app.indexOf('const finishToLogin'), app.indexOf('const chooseLanguage'));
    assert.match(finish, /handleNavigate\('login'\)/);
    assert.equal(finish.includes('gazeControlEnabled'), false);
    assert.match(app, /onSkipMethods=\{finishToLogin\}/);
    assert.match(app, /onSkipInteraction=\{finishToLogin\}/);
  });

  it('keeps head movement off until the separate confirmation', () => {
    const choice = { keyboard: true, voice: false, head: true, eye: false, pointer: false };
    const pending = applyInteractionChoices(DEFAULT_PREFERENCES, choice);
    assert.equal(afterMethods(choice), 'head');
    assert.equal(pending.gazeControlEnabled, false);
    assert.equal(mayRequestCamera(false), false);
    assert.equal(gazeAfterHeadConfirmation(DEFAULT_PREFERENCES, false).gazeControlEnabled, false);
  });

  it('requests the camera only after head movement is confirmed', () => {
    assert.equal(mayRequestCamera(false), false);
    assert.equal(mayRequestCamera(true), true);
    const enabled = gazeAfterHeadConfirmation(DEFAULT_PREFERENCES, true);
    assert.equal(enabled.gazeControlEnabled, true);
    assert.equal(enabled.gazeTrackingMode, 'head');
    const app = readFileSync(join(root, 'App.tsx'), 'utf8');
    const confirm = app.slice(app.indexOf('const confirmHead'), app.indexOf('const continueToSignIn'));
    assert.match(confirm, /mayRequestCamera\(accepted\)/);
    assert.match(confirm, /gazeControlEnabled: next.gazeControlEnabled/);
    const intro = readFileSync(join(root, 'components/StartupIntro.tsx'), 'utf8');
    const modal = readFileSync(join(root, 'components/StartupAccessibilityModal.tsx'), 'utf8');
    assert.equal(intro.includes('getUserMedia'), false);
    assert.equal(modal.includes('getUserMedia'), false);
    assert.equal(modal.includes('gazeControlEnabled'), false);
  });

  it('continues to login when head movement or the camera is declined', () => {
    assert.equal(interpretHeadConfirmation('no'), 'no');
    assert.equal(interpretHeadConfirmation('አይ'), 'no');
    assert.equal(cameraFailureDisablesHead('permission-denied'), true);
    assert.equal(cameraFailureDisablesHead('no-camera'), true);
    assert.equal(cameraFailureDisablesHead('model-load-failed'), false);
    const declined = gazeAfterHeadConfirmation(
      { ...DEFAULT_PREFERENCES, language: 'en', languageSelected: true },
      false,
    );
    assert.equal(declined.gazeControlEnabled, false);
    assert.equal(declined.language, 'en');
    const app = readFileSync(join(root, 'App.tsx'), 'utf8');
    const confirm = app.slice(app.indexOf('const confirmHead'), app.indexOf('const continueToSignIn'));
    assert.match(confirm, /handleNavigate\('login'\)/);
  });

  it('does not turn gaze on from saved calibration before an explicit opt-in', () => {
    assert.equal(gazeEnabledOnStartup(false), false);
    assert.equal(gazeEnabledOnStartup(true), true);
    const app = readFileSync(join(root, 'App.tsx'), 'utf8');
    assert.equal(app.includes('shouldAutoStartGaze'), false);
    assert.match(app, /gazeEnabledOnStartup\(loaded.gazeControlEnabled\)/);
  });

  it('understands a spoken choice of more than one method', () => {
    const heard = interpretInteractionUtterance('keyboard and voice');
    assert.equal(heard?.skip, false);
    assert.equal(heard?.choice.keyboard, true);
    assert.equal(heard?.choice.voice, true);
    assert.equal(heard?.choice.head, false);
    assert.equal(interpretInteractionUtterance('skip')?.skip, true);
    assert.equal(interpretHeadConfirmation('yes'), 'yes');
  });
});
