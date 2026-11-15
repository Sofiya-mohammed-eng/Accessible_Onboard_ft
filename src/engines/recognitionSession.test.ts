import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  listenOnce,
  setAmharicCaptureForTests,
  speakAloud,
  startVoiceDictation,
  stopConversationRecognition,
  stopSpeakingAloud,
  type VoiceInputSession,
} from './accessibilityEngine';
import { acquireMicrophone, microphoneOwner, resetMicrophoneOwnerForTests, type MicrophoneOwner } from './microphoneOwner';

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

class FakeRecognition {
  continuous = true;
  interimResults = false;
  lang = '';
  onstart: (() => void) | null = null;
  onresult: ((event: { resultIndex: number; results: Array<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  starts = 0;
  stops = 0;

  start(): void {
    this.starts += 1;
    this.onstart?.();
  }

  stop(): void {
    this.stops += 1;
    const end = this.onend;
    setTimeout(() => end?.(), 0);
  }

  emitResult(transcript: string, isFinal: boolean): void {
    this.onresult?.({
      resultIndex: 0,
      results: [{ isFinal, 0: { transcript } }],
    });
  }

  emitError(error: string): void {
    this.onerror?.({ error });
  }

  emitEnd(): void {
    this.onend?.();
  }
}

const created: FakeRecognition[] = [];

function installRecognition(): void {
  resetMicrophoneOwnerForTests();
  created.length = 0;
  function SpeechRecognition(this: FakeRecognition) {
    const fake = new FakeRecognition();
    created.push(fake);
    return fake;
  }
  const target = globalThis as unknown as { window: Record<string, unknown> };
  target.window = {
    SpeechRecognition,
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    setInterval: globalThis.setInterval.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
    addEventListener() {},
    removeEventListener() {},
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function track(lang = 'en-US', owner: MicrophoneOwner = 'dictation') {
  const transcripts: Array<{ text: string; isFinal: boolean }> = [];
  const errors: string[] = [];
  let ends = 0;
  let starts = 0;
  if (microphoneOwner() !== owner && !acquireMicrophone(owner)) throw new Error(`microphone busy for ${owner}`);
  const session = startVoiceDictation({
    owner,
    lang,
    onStart: () => {
      starts += 1;
    },
    onTranscript: (text, isFinal) => transcripts.push({ text, isFinal }),
    onError: (message) => errors.push(message),
    onEnd: () => {
      ends += 1;
    },
  });
  const recognizer = created.at(-1);
  if (!session || !recognizer) throw new Error('recognition did not start');
  return { session, recognizer, transcripts, errors, ends: () => ends, starts: () => starts };
}

describe('recognition session safety', () => {
  it('keeps transcript, interim, language, and error behavior for the active session', () => {
    installRecognition();
    const active = track('en-GB');
    assert.equal(active.recognizer.lang, 'en-GB');
    assert.equal(active.recognizer.continuous, false);
    assert.equal(active.recognizer.interimResults, true);
    assert.equal(active.starts(), 1);
    active.recognizer.emitResult('hel', false);
    active.recognizer.emitResult('hello', true);
    active.recognizer.emitError('not-allowed');
    active.recognizer.emitError('network');
    active.recognizer.emitEnd();
    assert.deepEqual(active.transcripts, [
      { text: 'hel', isFinal: false },
      { text: 'hello', isFinal: true },
    ]);
    assert.deepEqual(active.errors, [
      'Microphone permission was denied. Please allow microphone access or continue with text input.',
      'Voice input stopped (network). You can type directly at any time.',
    ]);
    assert.equal(active.ends(), 1);
    active.session.stop();
  });

  it('invalidates the first session when a second session starts', async () => {
    installRecognition();
    const first = track();
    const second = track();
    assert.equal(first.session.isCurrent(), false);
    assert.equal(second.session.isCurrent(), true);
    await delay(0);
    assert.equal(second.recognizer.stops, 0);
    assert.equal(first.ends(), 0);
    assert.equal(second.ends(), 0);
  });

  it('drops a stale result, error, and end without restarting recognition', async () => {
    installRecognition();
    let restarts = 0;
    let session: VoiceInputSession | null = null;
    const transcripts: string[] = [];
    const errors: string[] = [];
    if (!acquireMicrophone('dictation')) throw new Error('microphone busy');
    session = startVoiceDictation({
      owner: 'dictation',
      onTranscript: (text) => transcripts.push(text),
      onError: (message) => errors.push(message),
      onEnd: () => {
        restarts += 1;
        session?.start();
      },
    });
    const first = created[0];
    const current = track();
    await delay(0);
    first.emitResult('old answer', true);
    first.emitError('network');
    first.emitEnd();
    assert.deepEqual(transcripts, []);
    assert.deepEqual(errors, []);
    assert.equal(restarts, 0);
    assert.equal(first.starts, 1);
    current.recognizer.emitResult('new answer', true);
    current.recognizer.emitError('network');
    assert.deepEqual(current.transcripts, [{ text: 'new answer', isFinal: true }]);
    assert.deepEqual(current.errors, ['Voice input stopped (network). You can type directly at any time.']);
    assert.equal(current.recognizer.stops, 0);
  });

  it('stops callbacks after the active session is stopped', async () => {
    installRecognition();
    const active = track();
    active.session.stop();
    await delay(0);
    active.recognizer.emitResult('after stop', true);
    active.recognizer.emitError('network');
    active.recognizer.emitEnd();
    assert.deepEqual(active.transcripts, []);
    assert.deepEqual(active.errors, []);
    assert.equal(active.ends(), 0);
  });

  it('lets an old cleanup stop only the session it still owns', async () => {
    installRecognition();
    const pending = listenOnce('en-US', 400);
    for (let attempt = 0; attempt < 40 && created.length < 1; attempt += 1) await delay(25);
    assert.equal(created.length, 1);
    const owned = created[0];
    const newer = track();
    const stops = newer.recognizer.stops;
    stopConversationRecognition();
    owned.stop();
    await delay(0);
    assert.equal(newer.recognizer.stops, stops);
    assert.equal(newer.session.isCurrent(), true);
    newer.recognizer.emitResult('still listening', true);
    assert.deepEqual(newer.transcripts, [{ text: 'still listening', isFinal: true }]);
    assert.equal(await pending, '');
    newer.session.stop();
  });

  it('does not leave speech playback suppressing the next session end', async () => {
    installRecognition();
    (globalThis as unknown as { Audio: unknown }).Audio = class {
      preload = '';
      playbackRate = 1;
      src = '';
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      play(): Promise<void> {
        return Promise.reject(new Error('no audio'));
      }
      pause(): void {}
    };
    const first = track();
    speakAloud('Hello');
    await delay(0);
    const second = track();
    first.recognizer.emitEnd();
    second.recognizer.emitEnd();
    assert.equal(first.ends(), 0);
    assert.equal(second.ends(), 1);
    second.session.stop();
  });

  it('returns a current Amharic transcript and drops a stale recording', async () => {
    installRecognition();
    let resolveRecord: (audio: ArrayBuffer | null) => void = () => {};
    let recording = false;
    let transcribed = 0;
    setAmharicCaptureForTests({
      record: () => {
        recording = true;
        return new Promise((resolve) => {
          resolveRecord = resolve;
        });
      },
      transcribe: async () => {
        transcribed += 1;
        return 'ሥራ';
      },
    });
    const waitForRecording = async () => {
      for (let attempt = 0; attempt < 40 && !recording; attempt += 1) await delay(25);
      assert.equal(recording, true);
      recording = false;
    };
    try {
      const current = listenOnce('am-ET', 1000);
      await waitForRecording();
      resolveRecord(new ArrayBuffer(3200));
      assert.equal(await current, 'ሥራ');
      assert.equal(transcribed, 1);

      transcribed = 0;
      const stale = listenOnce('am-ET', 1000);
      await waitForRecording();
      const newer = track();
      stopSpeakingAloud();
      resolveRecord(new ArrayBuffer(3200));
      assert.equal(await stale, '');
      assert.equal(transcribed, 0);
      assert.equal(newer.recognizer.stops, 0);
      newer.recognizer.emitResult('jobs', true);
      assert.deepEqual(newer.transcripts, [{ text: 'jobs', isFinal: true }]);
      newer.session.stop();
    } finally {
      setAmharicCaptureForTests({ record: null, transcribe: null });
    }
  });

  it('wires conversation and dock cleanup to the owning session', () => {
    const guide = readFileSync(join(sourceRoot, 'components/BlindConversation.tsx'), 'utf8');
    const dock = readFileSync(join(sourceRoot, 'components/VoiceDock.tsx'), 'utf8');
    assert.match(guide, /stopConversationRecognition\(\);\s*stopSpeakingAloud\(\);/);
    assert.match(dock, /sessionRef\.current\?\.stop\(\);\s*sessionRef\.current = null;\s*releaseMicrophone\('dock'\);/);
  });
});
