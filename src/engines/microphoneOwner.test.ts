import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listenOnce, setAmharicCaptureForTests, speakAloud, startVoiceDictation } from './accessibilityEngine';
import {
  acquireMicrophone,
  microphoneOwner,
  microphonePausedForSpeech,
  releaseMicrophone,
  resetMicrophoneOwnerForTests,
} from './microphoneOwner';

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

class FakeRecognition {
  continuous = true;
  interimResults = false;
  lang = '';
  onstart: (() => void) | null = null;
  onresult: ((event: { resultIndex: number; results: Array<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  stops = 0;
  start(): void {
    this.onstart?.();
  }
  stop(): void {
    this.stops += 1;
    const end = this.onend;
    setTimeout(() => end?.(), 0);
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
  (globalThis as unknown as { window: Record<string, unknown> }).window = {
    SpeechRecognition,
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    setInterval: globalThis.setInterval.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('microphone ownership', () => {
  it('allows only one owner at a time', () => {
    resetMicrophoneOwnerForTests();
    assert.equal(acquireMicrophone('conversation'), true);
    assert.equal(microphoneOwner(), 'conversation');
    assert.equal(acquireMicrophone('gaze'), false);
    assert.equal(microphoneOwner(), 'conversation');
    assert.equal(releaseMicrophone('conversation'), true);
    assert.equal(microphoneOwner(), null);
  });

  it('rejects a lower-priority owner while conversation or dictation is active', () => {
    installRecognition();
    assert.equal(acquireMicrophone('conversation'), true);
    assert.equal(acquireMicrophone('gaze'), false);
    assert.equal(acquireMicrophone('dock'), false);
    const blocked = startVoiceDictation({
      owner: 'gaze',
      onTranscript() {},
      onError() {},
      onEnd() {},
    });
    assert.equal(blocked, null);
    assert.equal(created.length, 0);
    releaseMicrophone('conversation');
    assert.equal(acquireMicrophone('dictation'), true);
    assert.equal(acquireMicrophone('gaze'), false);
    assert.equal(acquireMicrophone('dock'), false);
    assert.equal(acquireMicrophone('conversation'), false);
    releaseMicrophone('dictation');
  });

  it('does not let an old owner release the microphone held by a newer owner', () => {
    resetMicrophoneOwnerForTests();
    acquireMicrophone('conversation');
    assert.equal(acquireMicrophone('dictation'), true);
    assert.equal(releaseMicrophone('conversation'), false);
    assert.equal(microphoneOwner(), 'dictation');
    assert.equal(releaseMicrophone('dictation'), true);
    assert.equal(microphoneOwner(), null);
  });

  it('releases conversation ownership after listening finishes', async () => {
    installRecognition();
    const pending = listenOnce('en-US', 1000);
    for (let attempt = 0; attempt < 40 && created.length < 1; attempt += 1) await delay(25);
    assert.equal(microphoneOwner(), 'conversation');
    created[0].onresult?.({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: 'hello' } }],
    });
    assert.equal(await pending, 'hello');
    assert.equal(microphoneOwner(), null);
  });

  it('keeps gaze and the dock from starting while conversation is listening', () => {
    installRecognition();
    acquireMicrophone('conversation');
    const gaze = startVoiceDictation({
      owner: 'gaze',
      onTranscript() {},
      onError() {},
      onEnd() {},
    });
    const dock = startVoiceDictation({
      owner: 'dock',
      onTranscript() {},
      onError() {},
      onEnd() {},
    });
    assert.equal(gaze, null);
    assert.equal(dock, null);
    assert.equal(created.length, 0);
    assert.equal(microphoneOwner(), 'conversation');
    releaseMicrophone('conversation');
    assert.equal(acquireMicrophone('gaze'), true);
    releaseMicrophone('gaze');
  });

  it('keeps application dictation exclusive', () => {
    installRecognition();
    assert.equal(acquireMicrophone('dictation'), true);
    const session = startVoiceDictation({
      owner: 'dictation',
      onTranscript() {},
      onError() {},
      onEnd() {},
    });
    assert.ok(session);
    assert.equal(created.length, 1);
    assert.equal(startVoiceDictation({
      owner: 'gaze',
      onTranscript() {},
      onError() {},
      onEnd() {},
    }), null);
    assert.equal(startVoiceDictation({
      owner: 'dock',
      onTranscript() {},
      onError() {},
      onEnd() {},
    }), null);
    assert.equal(created.length, 1);
    session?.stop();
    releaseMicrophone('dictation');
  });

  it('does not let the dock open a second recognizer while a protected owner is active', () => {
    installRecognition();
    acquireMicrophone('conversation');
    assert.equal(acquireMicrophone('dock'), false);
    acquireMicrophone('dictation');
    assert.equal(acquireMicrophone('dock'), false);
    const dock = readFileSync(join(sourceRoot, 'components/VoiceDock.tsx'), 'utf8');
    const dictation = readFileSync(join(sourceRoot, 'components/ApplicationAssistantView.tsx'), 'utf8');
    assert.match(dock, /nextVoiceDockAction\(/);
    assert.match(dictation, /owner: 'dictation'/);
    assert.match(dictation, /setAnswer\(key, transcript\)/);
    releaseMicrophone('dictation');
  });

  it('holds Amharic recording until the microphone is free and drops a stale result', async () => {
    installRecognition();
    let recorded = 0;
    let transcribed = 0;
    let resolveRecord: (audio: ArrayBuffer | null) => void = () => {};
    setAmharicCaptureForTests({
      record: () => {
        recorded += 1;
        return new Promise((resolve) => {
          resolveRecord = resolve;
        });
      },
      transcribe: async () => {
        transcribed += 1;
        return 'ሥራ';
      },
    });
    try {
      acquireMicrophone('dictation');
      const pending = listenOnce('am-ET', 1000);
      await delay(500);
      assert.equal(recorded, 0);
      assert.equal(microphoneOwner(), 'dictation');
      releaseMicrophone('dictation');
      for (let attempt = 0; attempt < 40 && recorded < 1; attempt += 1) await delay(25);
      assert.equal(recorded, 1);
      assert.equal(microphoneOwner(), 'conversation');
      acquireMicrophone('dictation');
      resolveRecord(new ArrayBuffer(3200));
      assert.equal(await pending, '');
      assert.equal(transcribed, 0);
      assert.equal(microphoneOwner(), 'dictation');
      releaseMicrophone('dictation');
    } finally {
      setAmharicCaptureForTests({ record: null, transcribe: null });
    }
  });

  it('does not let speech playback restart a replaced recognition session', async () => {
    installRecognition();
    let ends = 0;
    acquireMicrophone('gaze');
    const first = startVoiceDictation({
      owner: 'gaze',
      onTranscript() {},
      onError() {},
      onEnd: () => {
        ends += 1;
      },
    });
    const firstRecognizer = created[0];
    speakAloud('Hello');
    assert.equal(microphonePausedForSpeech(), true);
    assert.equal(acquireMicrophone('gaze'), false);
    await delay(0);
    assert.equal(microphonePausedForSpeech(), false);
    assert.equal(ends, 0);
    acquireMicrophone('conversation');
    const second = startVoiceDictation({
      owner: 'conversation',
      onTranscript() {},
      onError() {},
      onEnd: () => {
        ends += 1;
      },
    });
    firstRecognizer.emitEnd();
    created[1].emitEnd();
    assert.equal(ends, 1);
    assert.equal(first?.isCurrent(), false);
    assert.equal(second?.isCurrent(), true);
    second?.stop();
    releaseMicrophone('conversation');
  });
});
