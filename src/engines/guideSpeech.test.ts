import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { GUIDE_SPEECH_RATE, speakAloud, speakAndWait, speechSegments, stopSpeakingAloud, ttsRequest } from './accessibilityEngine';
import { resetMicrophoneOwnerForTests } from './microphoneOwner';
import { DEFAULT_PREFERENCES } from './preferencesStore';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

class FakeUtterance {
  rate = 1;
  pitch = 1;
  volume = 1;
  lang = '';
  voice: unknown = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
}

class FakeAudio {
  static latest: FakeAudio | null = null;
  preload = '';
  playbackRate = 1;
  src = '';
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    FakeAudio.latest = this;
  }
  play(): Promise<void> {
    return Promise.reject(new Error('use the browser voice'));
  }
  pause(): void {}
}

function installBrowserSpeech(): FakeUtterance[] {
  resetMicrophoneOwnerForTests();
  stopSpeakingAloud();
  const spoken: FakeUtterance[] = [];
  const target = globalThis as unknown as { window: Record<string, unknown>; SpeechSynthesisUtterance: unknown; Audio: unknown };
  target.SpeechSynthesisUtterance = FakeUtterance;
  target.Audio = FakeAudio;
  target.window = {
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
      speak(utterance: FakeUtterance) {
        spoken.push(utterance);
        utterance.onstart?.();
        utterance.onend?.();
      },
    },
  };
  return spoken;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('guide browser speech uses the slower rate', async () => {
  const spoken = installBrowserSpeech();
  speakAloud('Hello from the guide.', { lang: 'en-US', rate: GUIDE_SPEECH_RATE, slow: true });
  await delay(80);
  assert.equal(GUIDE_SPEECH_RATE, 0.85);
  assert.equal(spoken[0]?.rate, 0.85);
  assert.equal(spoken[0]?.pitch, 1);
  assert.equal(FakeAudio.latest?.playbackRate, 0.85);
});

function requestParts(url: string) {
  const parsed = new URL(url, 'http://localhost');
  return {
    path: parsed.pathname,
    lang: parsed.searchParams.get('lang'),
    slow: parsed.searchParams.get('slow'),
    text: parsed.searchParams.get('text'),
  };
}

test('English guide speech requests slow speech', () => {
  assert.deepEqual(requestParts(ttsRequest('en-US', 'Hello.', true)), {
    path: '/api/tts',
    lang: 'en',
    slow: '1',
    text: 'Hello.',
  });
  assert.equal(requestParts(ttsRequest('en-US', 'Hello.', false)).slow, '0');
});

test('Amharic words use the Amharic voice even inside an English line', () => {
  assert.deepEqual(speechSegments('Say English, or say Amharic. እንግሊዝኛ ወይም አማርኛ ይበሉ።', 'en-US'), [
    { text: 'Say English, or say Amharic.', lang: 'en-US' },
    { text: 'እንግሊዝኛ ወይም አማርኛ ይበሉ።', lang: 'am-ET' },
  ]);
  assert.deepEqual(requestParts(ttsRequest('am-ET', 'እንግሊዝኛ ወይም አማርኛ ይበሉ።', true)).lang, 'am');
});

test('Amharic keeps its existing slow route', () => {
  assert.deepEqual(requestParts(ttsRequest('am-ET', 'ሰላም', true)), {
    path: '/api/tts',
    lang: 'am',
    slow: '1',
    text: 'ሰላም',
  });
  assert.deepEqual(requestParts(ttsRequest('am-ET', 'ሰላም', false)), {
    path: '/api/tts',
    lang: 'am',
    slow: '1',
    text: 'ሰላም',
  });
});

test('the saved speech preference stays at its current rate', () => {
  const preferences = readFileSync(join(root, 'engines/preferencesStore.ts'), 'utf8');
  const app = readFileSync(join(root, 'App.tsx'), 'utf8');
  assert.equal(DEFAULT_PREFERENCES.speechRate, 1);
  assert.match(preferences, /speechRate: 1\.0/);
  assert.match(app, /rate: preferences\.speechRate/);
  assert.doesNotMatch(preferences, /speechRate: 0\.85/);
});

test('guide captions are available and listening waits for playback', async () => {
  resetMicrophoneOwnerForTests();
  stopSpeakingAloud();
  const played: { audio: FakeAudio | null } = { audio: null };
  const target = globalThis as unknown as { window: Record<string, unknown>; Audio: unknown };
  target.window = {
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    setInterval: globalThis.setInterval.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
    addEventListener() {},
    removeEventListener() {},
    speechSynthesis: { speaking: false, pending: false, getVoices: () => [], cancel() {}, resume() {}, speak() {} },
  };
  target.Audio = class extends FakeAudio {
    play(): Promise<void> {
      played.audio = this;
      return Promise.resolve();
    }
  };
  const captions: string[] = [];
  let finished = false;
  const pending = speakAndWait('Find work from Ethiopia.', {
    lang: 'en-US',
    rate: GUIDE_SPEECH_RATE,
    slow: true,
    onCaption: (text) => captions.push(text),
  });
  pending.then(() => {
    finished = true;
  });
  await delay(20);
  assert.deepEqual(captions, ['Find work from Ethiopia.']);
  assert.equal(finished, false);
  assert.match(played.audio?.src || '', /\/api\/tts\?lang=en&slow=1/);
  played.audio?.onended?.();
  await pending;
  assert.equal(finished, true);
  const guide = readFileSync(join(root, 'components/BlindConversation.tsx'), 'utf8');
  const say = guide.slice(guide.indexOf('const say ='), guide.indexOf('const hear ='));
  assert.match(say, /speakAndWait\(/);
  assert.match(say, /GUIDE_SPEECH_RATE/);
  assert.match(say, /slow: true/);
  assert.match(say, /onCaption: captionRef\.current/);
  assert.equal(say.includes('listenOnce'), false);
});
