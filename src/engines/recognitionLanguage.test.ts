import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listenOnce, setAmharicCaptureForTests, startVoiceDictation } from './accessibilityEngine';
import { getLanguageOption } from './i18n';
import { acquireMicrophone, releaseMicrophone, resetMicrophoneOwnerForTests } from './microphoneOwner';
import { pageListenLanguage, pageListenSequence, startupRecognitionLanguages } from './recognitionLanguage';

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

class FakeRecognition {
  continuous = true;
  interimResults = false;
  lang = '';
  onstart: (() => void) | null = null;
  onresult: ((event: { resultIndex: number; results: Array<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start(): void {
    this.onstart?.();
  }
  stop(): void {
    const end = this.onend;
    setTimeout(() => end?.(), 0);
  }
  emitFinal(transcript: string): void {
    this.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript } }],
    });
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
    addEventListener() {},
    removeEventListener() {},
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('selected recognition language', () => {
  it('uses en-US only for an English Landing listen', () => {
    assert.equal(pageListenLanguage('landing', 'en'), 'en-US');
    assert.deepEqual(pageListenSequence('landing', 'en'), ['en-US']);
  });

  it('uses am-ET only for an Amharic Landing listen', () => {
    assert.equal(pageListenLanguage('landing', 'am'), 'am-ET');
    assert.deepEqual(pageListenSequence('landing', 'am'), ['am-ET']);
  });

  it('uses en-US only for an English Find Jobs listen', () => {
    assert.equal(pageListenLanguage('jobs', 'en'), 'en-US');
    assert.deepEqual(pageListenSequence('jobs', 'en'), ['en-US']);
  });

  it('uses am-ET only for an Amharic Find Jobs listen', () => {
    assert.equal(pageListenLanguage('jobs', 'am'), 'am-ET');
    assert.deepEqual(pageListenSequence('jobs', 'am'), ['am-ET']);
  });

  it('uses en-US only for an English Apply listen', () => {
    assert.equal(pageListenLanguage('apply', 'en'), 'en-US');
    assert.deepEqual(pageListenSequence('apply', 'en'), ['en-US']);
  });

  it('uses am-ET only for an Amharic Apply listen', () => {
    assert.equal(pageListenLanguage('apply', 'am'), 'am-ET');
    assert.deepEqual(pageListenSequence('apply', 'am'), ['am-ET']);
  });

  it('keeps the language chosen for an active listen when the preference changes', () => {
    let language: 'en' | 'am' = 'en';
    const active = pageListenLanguage('apply', language);
    language = 'am';
    assert.equal(active, 'en-US');
    assert.equal(pageListenLanguage('apply', language), 'am-ET');
  });

  it('does not start English recognition after an empty Amharic result', async () => {
    installRecognition();
    let recorded = 0;
    setAmharicCaptureForTests({
      record: async () => {
        recorded += 1;
        return new ArrayBuffer(100);
      },
      transcribe: async () => 'should-not-run',
    });
    try {
      assert.deepEqual(pageListenSequence('jobs', 'am'), ['am-ET']);
      assert.equal(await listenOnce('am-ET', 1000), '');
      assert.equal(recorded, 2);
      assert.equal(created.length, 0);
    } finally {
      setAmharicCaptureForTests({ record: null, transcribe: null });
    }
  });

  it('keeps startup language selection in Amharic and then English', () => {
    assert.deepEqual(startupRecognitionLanguages(), ['am-ET', 'en-US']);
    const guide = readFileSync(join(sourceRoot, 'components/BlindConversation.tsx'), 'utf8');
    const startup = guide.slice(guide.indexOf('startupStep !== \'control\''), guide.indexOf('startupStep === \'control\''));
    assert.match(startup, /startupRecognitionLanguages\(\)/);
    assert.match(startup, /hear\(amharicChoice\)\) \|\| \(await hear\(englishChoice\)\)/);
    const landing = guide.slice(guide.indexOf('pageKey === \'landing\''), guide.indexOf('pageKey === \'dashboard\''));
    assert.match(landing, /const command = await hear\(\)/);
    assert.equal(landing.includes('hear(\'am-ET\')'), false);
    assert.match(landing, /Find work from Ethiopia to the world/);
    assert.match(landing, /ከኢትዮጵያ እስከ ዓለም ሥራ ይፈልጉ/);
  });

  it('keeps gaze recognition in English', () => {
    installRecognition();
    assert.equal(acquireMicrophone('gaze'), true);
    const session = startVoiceDictation({
      owner: 'gaze',
      onTranscript() {},
      onError() {},
      onEnd() {},
    });
    assert.equal(created[0].lang, 'en-US');
    const gaze = readFileSync(join(sourceRoot, 'accessibility/useGazeVoiceCommands.ts'), 'utf8');
    const call = gaze.slice(gaze.indexOf('startVoiceDictation({'), gaze.indexOf('onStart:'));
    assert.equal(call.includes('lang'), false);
    session?.stop();
    releaseMicrophone('gaze');
  });

  it('keeps VoiceDock and application dictation on the selected speech code', () => {
    assert.equal(pageListenLanguage('apply', 'en'), getLanguageOption('en').speechLang);
    assert.equal(pageListenLanguage('apply', 'am'), getLanguageOption('am').speechLang);
    const dock = readFileSync(join(sourceRoot, 'components/VoiceDock.tsx'), 'utf8');
    const dictate = readFileSync(join(sourceRoot, 'components/ApplicationAssistantView.tsx'), 'utf8');
    assert.match(dock, /lang: getLanguageOption\(language\)\.speechLang/);
    assert.match(dictate, /getLanguageOption\(preferences\.language\)\.speechLang/);
    assert.match(dictate, /lang: speechLang/);
  });

  it('sends Amharic conversation audio to the Amharic transcription route', async () => {
    installRecognition();
    const previousFetch = globalThis.fetch;
    let requested = '';
    globalThis.fetch = (async (input: string | URL | Request) => {
      requested = String(input);
      return new Response(JSON.stringify({ transcript: 'ሰላም' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;
    setAmharicCaptureForTests({
      record: async () => new ArrayBuffer(3200),
      transcribe: null,
    });
    try {
      assert.equal(await listenOnce(pageListenLanguage('landing', 'am'), 1000), 'ሰላም');
      assert.equal(requested, '/api/stt?lang=am-ET');
      assert.equal(created.length, 0);
    } finally {
      globalThis.fetch = previousFetch;
      setAmharicCaptureForTests({ record: null, transcribe: null });
    }
  });

  it('uses browser recognition for an English conversation listen', async () => {
    installRecognition();
    let recorded = 0;
    setAmharicCaptureForTests({
      record: async () => {
        recorded += 1;
        return new ArrayBuffer(3200);
      },
      transcribe: async () => 'should-not-run',
    });
    try {
      const pending = listenOnce(pageListenLanguage('apply', 'en'), 1000);
      for (let attempt = 0; attempt < 40 && created.length < 1; attempt += 1) await delay(25);
      assert.equal(created[0].lang, 'en-US');
      created[0].emitFinal('continue');
      assert.equal(await pending, 'continue');
      assert.equal(recorded, 0);
    } finally {
      setAmharicCaptureForTests({ record: null, transcribe: null });
    }
  });
});
