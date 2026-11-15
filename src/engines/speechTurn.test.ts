import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  AMHARIC_END_SILENCE_MS,
  AMHARIC_NO_SPEECH_MS,
  AMHARIC_STT_TIMEOUT_MS,
  ENGLISH_FINAL_GRACE_MS,
  GUIDE_SPEECH_RATE,
  amharicRecordingShouldStop,
  listenFailureMessage,
  listenOnce,
  mergeFinalTranscript,
  setAmharicCaptureForTests,
  setAmharicSttTimeoutForTests,
  speakAloud,
  stopConversationRecognition,
  stopSpeakingAloud,
  takeListenFailure,
} from './accessibilityEngine';
import { acquireMicrophone, microphoneOwner, microphonePausedForSpeech, releaseMicrophone, resetMicrophoneOwnerForTests } from './microphoneOwner';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

class FakeRecognition {
  lang = '';
  onresult: ((event: { resultIndex: number; results: Array<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  onstart: (() => void) | null = null;
  start(): void {
    this.onstart?.();
  }
  stop(): void {
    const end = this.onend;
    setTimeout(() => end?.(), 0);
  }
  emit(transcript: string, isFinal: boolean): void {
    this.onresult?.({ resultIndex: 0, results: [{ isFinal, 0: { transcript } }] });
  }
  emitError(error: string): void {
    this.onerror?.({ error });
  }
}

const created: FakeRecognition[] = [];

function installRecognition(): void {
  resetMicrophoneOwnerForTests();
  stopSpeakingAloud();
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
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startEnglishListen(timeoutMs = 5000): Promise<{ pending: Promise<string>; recognizer: FakeRecognition }> {
  installRecognition();
  const pending = listenOnce('en-US', timeoutMs);
  for (let attempt = 0; attempt < 40 && created.length < 1; attempt += 1) await delay(25);
  assert.ok(created[0]);
  return { pending, recognizer: created[0] };
}

test('one final result resolves after the grace period', async () => {
  const { pending, recognizer } = await startEnglishListen();
  recognizer.emit('Alex', true);
  const early = await Promise.race([
    pending.then(() => 'done'),
    delay(200).then(() => 'waiting'),
  ]);
  assert.equal(early, 'waiting');
  assert.equal(await pending, 'Alex');
  assert.equal(ENGLISH_FINAL_GRACE_MS, 900);
});

test('two final results within the grace period stay in order', async () => {
  const { pending, recognizer } = await startEnglishListen();
  recognizer.emit('My name is Alex', true);
  await delay(200);
  recognizer.emit('My email is alex@example.com', true);
  assert.equal(await pending, 'My name is Alex My email is alex@example.com');
  assert.equal(
    mergeFinalTranscript('My name is Alex', 'My email is alex@example.com'),
    'My name is Alex My email is alex@example.com',
  );
});

test('a final result after the grace period is not appended', async () => {
  const { pending, recognizer } = await startEnglishListen();
  recognizer.emit('Alex', true);
  const heard = await pending;
  recognizer.emit('My email is alex@example.com', true);
  await delay(50);
  assert.equal(heard, 'Alex');
});

test('interim text is not repeated when the final result arrives', async () => {
  const { pending, recognizer } = await startEnglishListen();
  recognizer.emit('hello', false);
  recognizer.emit('hello', true);
  assert.equal(await pending, 'hello');
  assert.equal(mergeFinalTranscript('hello', 'hello'), 'hello');
});

test('a stale recognition result does not join a newer turn', async () => {
  const first = await startEnglishListen();
  first.recognizer.emit('Alex', true);
  stopConversationRecognition();
  assert.equal(await first.pending, '');
  installRecognition();
  const pending = listenOnce('en-US', 5000);
  for (let attempt = 0; attempt < 40 && created.length < 1; attempt += 1) await delay(25);
  first.recognizer.emit('stale phrase', true);
  created[0].emit('fresh phrase', true);
  assert.equal(await pending, 'fresh phrase');
});

test('cancellation clears the pending grace timer', async () => {
  const { pending, recognizer } = await startEnglishListen();
  const target = globalThis as unknown as { window: { clearTimeout: typeof clearTimeout } };
  const original = target.window.clearTimeout.bind(target.window);
  let cleared = 0;
  target.window.clearTimeout = ((id: ReturnType<typeof setTimeout>) => {
    cleared += 1;
    return original(id);
  }) as typeof clearTimeout;
  recognizer.emit('Alex', true);
  const before = cleared;
  stopConversationRecognition();
  assert.equal(cleared > before, true);
  assert.equal(await pending, '');
  recognizer.emit('later', true);
  await delay(50);
  assert.equal(await pending, '');
});

test('a recognition error releases the microphone', async () => {
  const { pending, recognizer } = await startEnglishListen();
  assert.equal(microphoneOwner(), 'conversation');
  recognizer.emitError('network');
  assert.equal(await pending, '');
  assert.equal(microphoneOwner(), null);
});

test('Amharic keeps recording through a pause inside the silence threshold', () => {
  assert.equal(AMHARIC_END_SILENCE_MS, 1400);
  assert.equal(amharicRecordingShouldStop({
    heard: true,
    silenceMs: 1000,
    elapsedMs: 2000,
    maxMs: 10000,
  }), false);
  assert.equal(amharicRecordingShouldStop({
    heard: false,
    silenceMs: 2000,
    elapsedMs: 2000,
    maxMs: 10000,
  }), false);
});

test('Amharic stops after the silence threshold once speech has started', () => {
  assert.equal(amharicRecordingShouldStop({
    heard: true,
    silenceMs: AMHARIC_END_SILENCE_MS + 1,
    elapsedMs: 3000,
    maxMs: 10000,
  }), true);
});

test('Amharic still stops at the maximum recording duration and the no-speech limit', () => {
  assert.equal(amharicRecordingShouldStop({
    heard: true,
    silenceMs: 0,
    elapsedMs: 10001,
    maxMs: 10000,
  }), true);
  assert.equal(amharicRecordingShouldStop({
    heard: false,
    silenceMs: 0,
    elapsedMs: AMHARIC_NO_SPEECH_MS + 1,
    maxMs: 10000,
  }), true);
  const source = readFileSync(join(root, 'engines/accessibilityEngine.ts'), 'utf8');
  assert.match(source, /amharicRecordingShouldStop\(/);
  assert.match(source, /Math\.min\(timeoutMs, 10000\)/);
  assert.match(source, /\/api\/stt\?lang=am-ET/);
});

test('playback still prevents listening from starting', async () => {
  installRecognition();
  const played: { audio: { onended: (() => void) | null } | null } = { audio: null };
  (globalThis as unknown as { Audio: unknown }).Audio = class {
    preload = '';
    playbackRate = 1;
    src = '';
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor() {
      played.audio = this;
    }
    play(): Promise<void> {
      return Promise.resolve();
    }
    pause(): void {}
  };
  speakAloud('The guide is speaking.', { lang: 'en-US', rate: GUIDE_SPEECH_RATE, slow: true });
  const pending = listenOnce('en-US', 2000);
  await delay(500);
  assert.equal(created.length, 0);
  played.audio?.onended?.();
  for (let attempt = 0; attempt < 40 && created.length < 1; attempt += 1) await delay(25);
  assert.equal(created.length, 1);
  stopConversationRecognition();
  assert.equal(await pending, '');
  assert.equal(GUIDE_SPEECH_RATE, 0.85);
});

test('an Amharic transcription timeout releases the microphone and ignores the late transcript', async () => {
  installRecognition();
  setAmharicSttTimeoutForTests(40);
  let late = '';
  let aborted = false;
  setAmharicCaptureForTests({
    record: async () => new ArrayBuffer(4000),
    transcribe: (_audio, signal) => new Promise((resolve) => {
      signal?.addEventListener('abort', () => {
        aborted = true;
      });
      setTimeout(() => {
        late = 'አማርኛ';
        resolve('አማርኛ');
      }, 160);
    }),
  });
  try {
    const pending = listenOnce('am-ET', 1000, 1);
    for (let attempt = 0; attempt < 20 && microphoneOwner() !== 'conversation'; attempt += 1) await delay(25);
    assert.equal(microphoneOwner(), 'conversation');
    assert.equal(await pending, '');
    assert.equal(microphoneOwner(), null);
    assert.equal(takeListenFailure(), 'timed-out');
    await delay(200);
    assert.equal(aborted, true);
    assert.equal(late, 'አማርኛ');
    setAmharicCaptureForTests({
      record: async () => new ArrayBuffer(4000),
      transcribe: async () => 'ሰላም',
    });
    assert.equal(await listenOnce('am-ET', 1000, 1), 'ሰላም');
    assert.equal(takeListenFailure(), null);
  } finally {
    setAmharicSttTimeoutForTests(AMHARIC_STT_TIMEOUT_MS);
    setAmharicCaptureForTests({ record: null, transcribe: null });
  }
});

test('a cancelled Amharic transcription ignores a late result', async () => {
  installRecognition();
  setAmharicSttTimeoutForTests(5000);
  let started = false;
  let resolveLate: (value: string) => void = () => {};
  setAmharicCaptureForTests({
    record: async () => new ArrayBuffer(4000),
    transcribe: () => new Promise((resolve) => {
      started = true;
      resolveLate = resolve;
    }),
  });
  try {
    const pending = listenOnce('am-ET', 8000, 1);
    for (let attempt = 0; attempt < 40 && !started; attempt += 1) await delay(25);
    assert.equal(started, true);
    stopConversationRecognition();
    assert.equal(await pending, '');
    resolveLate('አማርኛ');
    await delay(30);
    assert.equal(microphoneOwner(), null);
    assert.equal(takeListenFailure(), 'cancelled');
  } finally {
    setAmharicSttTimeoutForTests(AMHARIC_STT_TIMEOUT_MS);
    setAmharicCaptureForTests({ record: null, transcribe: null });
  }
});

test('a failed English restart ends with the text already heard', async () => {
  const { pending, recognizer } = await startEnglishListen(12000);
  recognizer.emit('Alex', true);
  recognizer.emit('Smith', true);
  recognizer.start = () => {
    throw new Error('cannot restart');
  };
  recognizer.onend?.();
  const started = Date.now();
  assert.equal(await pending, 'Alex Smith');
  assert.equal(Date.now() - started < 1500, true);
});

test('a failed English restart with no text ends promptly', async () => {
  const { pending, recognizer } = await startEnglishListen(12000);
  recognizer.start = () => {
    throw new Error('cannot restart');
  };
  recognizer.onend?.();
  const started = Date.now();
  assert.equal(await pending, '');
  assert.equal(Date.now() - started < 1500, true);
  assert.equal(takeListenFailure(), 'no-speech');
  assert.equal(listenFailureMessage('no-speech', 'en'), 'No speech was heard.');
  assert.equal(listenFailureMessage('unavailable', 'en').includes('('), false);
});

test('a successful English restart still waits for the grace period', async () => {
  const { pending, recognizer } = await startEnglishListen();
  const started = Date.now();
  recognizer.emit('Alex', true);
  recognizer.onend?.();
  assert.equal(await pending, 'Alex');
  assert.equal(Date.now() - started >= ENGLISH_FINAL_GRACE_MS - 80, true);
});

test('dictation, VoiceDock, and gaze keep their microphone priority', () => {
  resetMicrophoneOwnerForTests();
  assert.equal(acquireMicrophone('conversation'), true);
  assert.equal(acquireMicrophone('gaze'), false);
  assert.equal(acquireMicrophone('dock'), false);
  assert.equal(acquireMicrophone('dictation'), true);
  assert.equal(microphoneOwner(), 'dictation');
  releaseMicrophone('dictation');
  assert.equal(acquireMicrophone('dock'), true);
  assert.equal(acquireMicrophone('gaze'), false);
  releaseMicrophone('dock');
  assert.equal(microphoneOwner(), null);
});

class HoldingAudio {
  static all: HoldingAudio[] = [];
  preload = '';
  playbackRate = 1;
  src = '';
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    HoldingAudio.all.push(this);
  }
  play(): Promise<void> {
    return Promise.resolve();
  }
  pause(): void {}
}

class HoldingRecognition {
  lang = '';
  onresult: ((event: { resultIndex: number; results: Array<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  onstart: (() => void) | null = null;
  start(): void {
    this.onstart?.();
  }
  stop(): void {
    const end = this.onend;
    setTimeout(() => end?.(), 0);
  }
  emit(transcript: string, isFinal: boolean): void {
    this.onresult?.({ resultIndex: 0, results: [{ isFinal, 0: { transcript } }] });
  }
}

const holdingRecognizers: HoldingRecognition[] = [];

function installHoldingAudio(): void {
  resetMicrophoneOwnerForTests();
  stopSpeakingAloud();
  stopConversationRecognition();
  HoldingAudio.all = [];
  holdingRecognizers.length = 0;
  function SpeechRecognition(this: HoldingRecognition) {
    const fake = new HoldingRecognition();
    holdingRecognizers.push(fake);
    return fake;
  }
  const target = globalThis as unknown as {
    window: Record<string, unknown>;
    Audio: unknown;
    SpeechSynthesisUtterance: unknown;
  };
  target.Audio = HoldingAudio;
  target.SpeechSynthesisUtterance = class {
    text = '';
    rate = 1;
    pitch = 1;
    volume = 1;
    lang = '';
    voice: unknown = null;
    onstart: (() => void) | null = null;
    onend: (() => void) | null = null;
    onerror: ((event: { error: string }) => void) | null = null;
    constructor(text = '') {
      this.text = text;
    }
  };
  target.window = {
    SpeechRecognition,
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    setInterval: globalThis.setInterval.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
    addEventListener() {},
    removeEventListener() {},
    speechSynthesis: {
      speaking: false,
      pending: false,
      getVoices: () => [],
      cancel() {},
      resume() {},
      speak(utterance: { onstart: (() => void) | null; onend: (() => void) | null }) {
        utterance.onstart?.();
        utterance.onend?.();
      },
    },
  };
}

async function startHeldUtterance(text: string): Promise<HoldingAudio> {
  const before = HoldingAudio.all.length;
  speakAloud(text, { lang: 'en-US', rate: 0.92 });
  await Promise.resolve();
  const audio = HoldingAudio.all[before];
  assert.ok(audio);
  assert.equal(typeof audio.onended, 'function');
  assert.equal(microphonePausedForSpeech(), true);
  return audio;
}

test('stopping welcome audio releases the speech pause and lets listening start', async () => {
  installHoldingAudio();
  const welcome = await startHeldUtterance('Welcome to AllWays');
  const ended = welcome.onended;
  const failed = welcome.onerror;
  assert.equal(acquireMicrophone('dictation'), false);
  assert.equal(acquireMicrophone('dock'), false);
  assert.equal(acquireMicrophone('gaze'), false);
  const blocked = listenOnce('en-US', 2000);
  await delay(500);
  assert.equal(holdingRecognizers.length, 0);
  assert.equal(microphoneOwner(), null);

  stopSpeakingAloud();
  await delay(0);
  assert.equal(microphonePausedForSpeech(), false);
  assert.equal(welcome.onended, null);
  assert.equal(welcome.onerror, null);
  ended?.();
  failed?.();
  await delay(0);
  assert.equal(microphonePausedForSpeech(), false);

  for (let attempt = 0; attempt < 40 && holdingRecognizers.length < 1; attempt += 1) await delay(25);
  const recognizer = holdingRecognizers[0];
  assert.ok(recognizer);
  assert.equal(microphoneOwner(), 'conversation');
  assert.equal(acquireMicrophone('dock'), false);
  assert.equal(acquireMicrophone('gaze'), false);
  recognizer.emit('English', true);
  const heard = await Promise.race([
    blocked.then((text) => text),
    delay(2500).then(() => 'still-waiting'),
  ]);
  assert.equal(heard, 'English');
  assert.equal(microphonePausedForSpeech(), false);
  assert.equal(microphoneOwner(), null);
  assert.equal(acquireMicrophone('dictation'), true);
  releaseMicrophone('dictation');
  assert.equal(acquireMicrophone('dock'), true);
  releaseMicrophone('dock');
  assert.equal(acquireMicrophone('gaze'), true);
  releaseMicrophone('gaze');
  stopConversationRecognition();
});

test('a stopped audio element cannot complete twice or release a newer pause', async () => {
  installHoldingAudio();
  const older = await startHeldUtterance('Welcome to AllWays');
  const olderEnded = older.onended;
  const olderFailed = older.onerror;
  const before = HoldingAudio.all.length;
  speakAloud('Say English, or say Amharic.', { lang: 'en-US', rate: GUIDE_SPEECH_RATE, slow: true });
  await delay(0);
  const newer = HoldingAudio.all[before];
  assert.ok(newer);
  assert.equal(microphonePausedForSpeech(), true);
  assert.equal(older.onended, null);
  olderEnded?.();
  olderEnded?.();
  olderFailed?.();
  await delay(0);
  assert.equal(microphonePausedForSpeech(), true);
  assert.equal(acquireMicrophone('conversation'), false);
  newer.onended?.();
  await delay(0);
  assert.equal(microphonePausedForSpeech(), false);
  assert.equal(acquireMicrophone('conversation'), true);
  releaseMicrophone('conversation');
});

test('normal audio completion releases the speech pause once', async () => {
  installHoldingAudio();
  let ended = 0;
  speakAloud('Say English, or say Amharic.', {
    lang: 'en-US',
    rate: GUIDE_SPEECH_RATE,
    slow: true,
    onEnd: () => {
      ended += 1;
    },
  });
  await Promise.resolve();
  const audio = HoldingAudio.all[0];
  assert.ok(audio);
  assert.equal(microphonePausedForSpeech(), true);
  audio.onended?.();
  audio.onended?.();
  await delay(0);
  assert.equal(ended, 1);
  assert.equal(microphonePausedForSpeech(), false);
  assert.equal(acquireMicrophone('conversation'), true);
  releaseMicrophone('conversation');
});

test('an audio playback error still releases the speech pause', async () => {
  installHoldingAudio();
  const audio = await startHeldUtterance('Welcome to AllWays');
  audio.onerror?.();
  audio.onerror?.();
  audio.onended?.();
  await delay(120);
  assert.equal(microphonePausedForSpeech(), false);
  assert.equal(acquireMicrophone('conversation'), true);
  releaseMicrophone('conversation');
});
