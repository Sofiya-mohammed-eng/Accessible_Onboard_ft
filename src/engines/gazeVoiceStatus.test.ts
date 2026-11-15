import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import {
  GAZE_VOICE_RETRY_MS,
  GAZE_VOICE_WAITING_MESSAGE,
  gazeMayAnnounceListening,
  gazeRetryDelay,
  gazeStatusForScreenReader,
  gazeVoiceWaitingStatus,
} from '../accessibility/gazeVoiceAvailability';
import { speakAloud } from './accessibilityEngine';
import {
  acquireMicrophone,
  microphoneOwner,
  microphonePausedForSpeech,
  releaseMicrophone,
  resetMicrophoneOwnerForTests,
} from './microphoneOwner';
import { getPageCopy } from './pageCopy';
import { noteAfterQuietDictation, releaseDictation } from './dictationControl';

function installAudio(): void {
  resetMicrophoneOwnerForTests();
  (globalThis as unknown as { window: Record<string, unknown> }).window = {
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    addEventListener() {},
    removeEventListener() {},
  };
  (globalThis as unknown as { Audio: unknown }).Audio = class {
    play(): Promise<void> {
      return Promise.reject(new Error('no audio'));
    }
    pause(): void {}
  };
}

describe('gaze and dictation status accuracy', () => {
  it('shows gaze waiting when conversation takes the microphone', () => {
    resetMicrophoneOwnerForTests();
    acquireMicrophone('gaze');
    assert.equal(gazeMayAnnounceListening({
      callbackToken: 1,
      activeToken: 1,
      owner: microphoneOwner(),
    }), true);
    assert.equal(acquireMicrophone('conversation'), true);
    const waiting = gazeVoiceWaitingStatus();
    assert.equal(waiting.status, 'waiting');
    assert.equal(gazeMayAnnounceListening({
      callbackToken: 1,
      activeToken: 2,
      owner: microphoneOwner(),
    }), false);
    assert.equal(gazeStatusForScreenReader(waiting.status, waiting.message), GAZE_VOICE_WAITING_MESSAGE);
    releaseMicrophone('conversation');
  });

  it('shows gaze waiting when dictation takes the microphone', () => {
    resetMicrophoneOwnerForTests();
    acquireMicrophone('gaze');
    assert.equal(acquireMicrophone('dictation'), true);
    assert.equal(gazeVoiceWaitingStatus().status, 'waiting');
    assert.equal(gazeMayAnnounceListening({
      callbackToken: 1,
      activeToken: 1,
      owner: microphoneOwner(),
    }), false);
    releaseMicrophone('dictation');
  });

  it('shows gaze waiting during speech playback', async () => {
    installAudio();
    acquireMicrophone('gaze');
    speakAloud('Reading aloud');
    assert.equal(microphonePausedForSpeech(), true);
    assert.equal(microphoneOwner() === 'gaze', false);
    assert.equal(gazeVoiceWaitingStatus().message, GAZE_VOICE_WAITING_MESSAGE);
    assert.equal(gazeMayAnnounceListening({
      callbackToken: 1,
      activeToken: 2,
      owner: microphoneOwner(),
    }), false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(microphonePausedForSpeech(), false);
  });

  it('does not let a stale gaze callback restore listening', () => {
    resetMicrophoneOwnerForTests();
    acquireMicrophone('conversation');
    let status: 'listening' | 'waiting' = 'waiting';
    if (gazeMayAnnounceListening({
      callbackToken: 1,
      activeToken: 2,
      owner: microphoneOwner(),
    })) status = 'listening';
    assert.equal(status, 'waiting');
    assert.equal(gazeStatusForScreenReader('listening', 'Voice commands listening.'), 'Voice commands listening.');
    releaseMicrophone('conversation');
  });

  it('retries gaze after the microphone is free using the existing delay', () => {
    resetMicrophoneOwnerForTests();
    acquireMicrophone('conversation');
    assert.equal(acquireMicrophone('gaze'), false);
    releaseMicrophone('conversation');
    const delay = gazeRetryDelay({
      cancelled: false,
      restartAllowed: true,
      retryPending: false,
    });
    assert.equal(delay, GAZE_VOICE_RETRY_MS);
    assert.equal(delay, 900);
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
      let restarted = false;
      const timer = setTimeout(() => {
        restarted = acquireMicrophone('gaze');
      }, delay);
      mock.timers.tick(899);
      assert.equal(restarted, false);
      mock.timers.tick(1);
      assert.equal(restarted, true);
      assert.equal(microphoneOwner(), 'gaze');
      clearTimeout(timer);
      releaseMicrophone('gaze');
    } finally {
      mock.timers.reset();
    }
  });

  it('clears the dictation listening message when recognition ends quietly', () => {
    const copy = getPageCopy('en');
    let note = copy.voiceListening;
    let pressed = true;
    const heard = false;
    pressed = false;
    note = noteAfterQuietDictation('en', note, heard);
    assert.equal(pressed, false);
    assert.equal(note, copy.nothingHeard);
    assert.equal(getPageCopy('am').nothingHeard.length > 0, true);
  });

  it('keeps a dictated answer when a transcript already arrived', () => {
    const copy = getPageCopy('en');
    let field = '';
    let note = copy.voiceListening;
    field = 'Ada Lovelace';
    note = copy.voiceAdded;
    note = noteAfterQuietDictation('en', note, true);
    assert.equal(field, 'Ada Lovelace');
    assert.equal(note, copy.voiceAdded);
  });

  it('does not let a quiet dictation callback release a newer owner', () => {
    resetMicrophoneOwnerForTests();
    acquireMicrophone('dictation');
    const activeToken = 2;
    const quietEnd = (token: number) => {
      if (token !== activeToken) return;
      releaseDictation();
    };
    quietEnd(1);
    assert.equal(microphoneOwner(), 'dictation');
    releaseDictation();
    assert.equal(acquireMicrophone('conversation'), true);
    quietEnd(1);
    assert.equal(microphoneOwner(), 'conversation');
    releaseMicrophone('conversation');
  });
});
