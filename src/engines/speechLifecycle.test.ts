import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listenOnce, setAmharicCaptureForTests, speakAloud, startVoiceDictation, stopConversationRecognition } from './accessibilityEngine';
import { beginDictation, noteAfterDictationLoss, releaseDictation } from './dictationControl';
import {
  acquireMicrophone,
  microphoneOwner,
  releaseMicrophone,
  resetMicrophoneOwnerForTests,
} from './microphoneOwner';
import { getPageCopy } from './pageCopy';
import { nextVoiceDockAction } from './voiceDockControl';

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const copy = getPageCopy('en');

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
  emitFinal(transcript: string): void {
    this.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript } }],
    });
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

describe('speech lifecycle recovery', () => {
  it('releases dictation and clears listening when speech invalidates the session', async () => {
    installRecognition();
    let note = '';
    let field = '';
    let submitted = false;
    let continued = false;
    const started = beginDictation('en');
    assert.equal(started.ok, true);
    note = started.note;
    let token = 1;
    let current = 1;
    const session = startVoiceDictation({
      owner: 'dictation',
      onTranscript: (transcript, isFinal) => {
        if (!isFinal || current !== token) return;
        field = transcript;
        note = copy.voiceAdded;
      },
      onError() {},
      onInvalidate: () => {
        if (current !== token) return;
        current += 1;
        releaseDictation();
        note = noteAfterDictationLoss('en', note);
      },
      onEnd: () => {
        if (current !== token) return;
        current += 1;
        releaseDictation();
      },
    });
    assert.equal(note, copy.voiceListening);
    created[0].emitFinal('Ada Lovelace');
    assert.equal(field, 'Ada Lovelace');
    assert.equal(note, copy.voiceAdded);
    speakAloud('Reading the question');
    await delay(0);
    assert.equal(microphoneOwner(), null);
    assert.equal(note, copy.voiceAdded);
    assert.equal(field, 'Ada Lovelace');
    assert.equal(submitted, false);
    assert.equal(continued, false);
    assert.equal(created.length, 1);
    assert.equal(session?.isCurrent(), false);
  });

  it('clears a listening dictation note without starting another session', async () => {
    installRecognition();
    let note = beginDictation('en').note;
    let current = 1;
    startVoiceDictation({
      owner: 'dictation',
      onTranscript() {},
      onError() {},
      onInvalidate: () => {
        if (current !== 1) return;
        current += 1;
        releaseDictation();
        note = noteAfterDictationLoss('en', note);
      },
      onEnd: () => {
        if (current !== 1) return;
        releaseDictation();
      },
    });
    assert.equal(note, copy.voiceListening);
    speakAloud('Hello');
    await delay(20);
    assert.equal(note, copy.voiceStopped);
    assert.equal(microphoneOwner(), null);
    assert.equal(created.length, 1);
  });

  it('does not let a stale dictation callback release a newer session', () => {
    installRecognition();
    assert.equal(beginDictation('en').ok, true);
    let current = 1;
    const first = startVoiceDictation({
      owner: 'dictation',
      onTranscript() {},
      onError() {},
      onInvalidate: () => {
        if (current !== 1) return;
        releaseDictation();
      },
      onEnd: () => {
        if (current !== 1) return;
        releaseDictation();
      },
    });
    current = 2;
    const second = startVoiceDictation({
      owner: 'dictation',
      onTranscript() {},
      onError() {},
      onInvalidate: () => {
        if (current !== 2) return;
        releaseDictation();
      },
      onEnd() {},
    });
    created[0].emitEnd();
    assert.equal(first?.isCurrent(), false);
    assert.equal(second?.isCurrent(), true);
    assert.equal(microphoneOwner(), 'dictation');
    assert.equal(releaseDictation(), true);
  });

  it('explains a busy microphone and can start after it is free', async () => {
    installRecognition();
    acquireMicrophone('conversation');
    speakAloud('The question is being read.');
    const busy = beginDictation('en');
    assert.equal(busy.ok, false);
    assert.equal(busy.note, copy.microphoneBusy);
    assert.equal(getPageCopy('am').microphoneBusy.length > 0, true);
    assert.equal(startVoiceDictation({
      owner: 'dictation',
      onTranscript() {},
      onError() {},
      onEnd() {},
    }), null);
    assert.equal(created.length, 0);
    assert.equal(microphoneOwner(), 'conversation');
    await delay(0);
    releaseMicrophone('conversation');
    const ready = beginDictation('en');
    assert.equal(ready.ok, true);
    assert.equal(ready.note, copy.voiceListening);
    const session = startVoiceDictation({
      owner: 'dictation',
      onTranscript() {},
      onError() {},
      onEnd() {},
    });
    assert.equal(session?.isCurrent(), true);
    assert.equal(microphoneOwner(), 'dictation');
    session?.stop();
    releaseDictation();
  });

  it('stops an Amharic recording when conversation loses the microphone', async () => {
    installRecognition();
    let recorded = 0;
    let transcribed = 0;
    let released = 0;
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
        return 'ሰላም';
      },
      release: () => {
        released += 1;
      },
    });
    try {
      const pending = listenOnce('am-ET', 1000);
      for (let attempt = 0; attempt < 40 && recorded < 1; attempt += 1) await delay(25);
      assert.equal(recorded, 1);
      assert.equal(microphoneOwner(), 'conversation');
      assert.equal(acquireMicrophone('dictation'), true);
      assert.equal(released, 1);
      assert.equal(await pending, '');
      resolveRecord(new ArrayBuffer(3200));
      await delay(0);
      assert.equal(transcribed, 0);
      assert.equal(microphoneOwner(), 'dictation');
      releaseMicrophone('dictation');
    } finally {
      setAmharicCaptureForTests({ record: null, transcribe: null });
    }
  });

  it('releases Amharic microphone tracks when ownership changes during capture', async () => {
    installRecognition();
    let requested = 0;
    let stopped = 0;
    let released = 0;
    let resolveStream: (stream: { getTracks: () => Array<{ stop: () => void }> }) => void = () => {};
    const mediaDevices = {
      getUserMedia: () => {
        requested += 1;
        return new Promise((resolve) => {
          resolveStream = resolve;
        });
      },
    };
    const previous = (globalThis as { navigator?: unknown }).navigator;
    Object.defineProperty(globalThis, 'navigator', {
      value: { mediaDevices },
      configurable: true,
    });
    setAmharicCaptureForTests({
      record: null,
      transcribe: null,
      release: () => {
        released += 1;
      },
    });
    try {
      const pending = listenOnce('am-ET', 1000);
      for (let attempt = 0; attempt < 40 && requested < 1; attempt += 1) await delay(25);
      assert.equal(requested, 1);
      assert.equal(acquireMicrophone('dictation'), true);
      assert.equal(await pending, '');
      resolveStream({
        getTracks: () => [{
          stop: () => {
            stopped += 1;
          },
        }],
      });
      await delay(0);
      assert.equal(stopped, 1);
      assert.equal(released, 1);
      assert.equal(microphoneOwner(), 'dictation');
      releaseMicrophone('dictation');
    } finally {
      setAmharicCaptureForTests({ record: null, transcribe: null });
      Object.defineProperty(globalThis, 'navigator', {
        value: previous,
        configurable: true,
      });
    }
  });

  it('drops a stale Amharic result after a newer conversation listen starts', async () => {
    installRecognition();
    let transcribed = 0;
    const records: Array<(audio: ArrayBuffer | null) => void> = [];
    setAmharicCaptureForTests({
      record: () => new Promise((resolve) => {
        records.push(resolve);
      }),
      transcribe: async () => {
        transcribed += 1;
        return 'new';
      },
    });
    try {
      const first = listenOnce('am-ET', 1000);
      for (let attempt = 0; attempt < 40 && records.length < 1; attempt += 1) await delay(25);
      stopConversationRecognition();
      const second = listenOnce('am-ET', 1000);
      for (let attempt = 0; attempt < 40 && records.length < 2; attempt += 1) await delay(25);
      records[0](new ArrayBuffer(3200));
      assert.equal(await first, '');
      records[1](new ArrayBuffer(3200));
      assert.equal(await second, 'new');
      assert.equal(transcribed, 1);
      releaseMicrophone('conversation');
    } finally {
      setAmharicCaptureForTests({ record: null, transcribe: null });
    }
  });

  it('keeps dictation transcripts on the field and leaves gaze and VoiceDock rules intact', () => {
    installRecognition();
    const view = readFileSync(join(sourceRoot, 'components/ApplicationAssistantView.tsx'), 'utf8');
    const dictate = view.slice(view.indexOf('const dictate = '), view.indexOf('if (submitted)'));
    assert.match(dictate, /setAnswer\(key, transcript\)/);
    assert.equal(dictate.includes('setSubmitted'), false);
    assert.equal(dictate.includes('goNext'), false);
    assert.equal(dictate.includes('data-voice'), false);
    assert.match(view, /aria-pressed=\{dictating\}/);
    assert.match(view, /id="application-dictation-status"/);
    assert.match(view, /role="status"/);
    assert.match(view, /beginDictation\(/);
    assert.equal(beginDictation('en').ok, true);
    assert.equal(acquireMicrophone('gaze'), false);
    const dock = nextVoiceDockAction(false, 'en');
    assert.equal(dock.action, 'busy');
    releaseDictation();
    assert.equal(acquireMicrophone('gaze'), true);
    releaseMicrophone('gaze');
    const retry = nextVoiceDockAction(false, 'en');
    assert.equal(retry.action, 'start');
    releaseMicrophone('dock');
  });
});
