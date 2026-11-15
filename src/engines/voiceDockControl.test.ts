import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { speakAloud, startVoiceDictation } from './accessibilityEngine';
import { getPageCopy } from './pageCopy';
import {
  acquireMicrophone,
  microphoneOwner,
  releaseMicrophone,
  resetMicrophoneOwnerForTests,
} from './microphoneOwner';
import { nextVoiceDockAction, noteAfterDockEnd, releaseVoiceDock } from './voiceDockControl';

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

class FakeRecognition {
  onstart: (() => void) | null = null;
  onresult: ((event: { resultIndex: number; results: Array<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  stops = 0;
  continuous = false;
  interimResults = false;
  lang = '';
  start(): void {
    this.onstart?.();
  }
  stop(): void {
    this.stops += 1;
    const end = this.onend;
    setTimeout(() => end?.(), 0);
  }
  emitError(error: string): void {
    this.onerror?.({ error });
  }
  emitEnd(): void {
    this.onend?.();
  }
  emitResult(transcript: string, isFinal: boolean): void {
    this.onresult?.({ resultIndex: 0, results: [{ isFinal, 0: { transcript } }] });
  }
}

const created: FakeRecognition[] = [];

function installRecognition(): void {
  resetMicrophoneOwnerForTests();
  created.length = 0;
  function SpeechRecognition(this: FakeRecognition) {
    const recognition = new FakeRecognition();
    created.push(recognition);
    return recognition;
  }
  (globalThis as unknown as { window: Record<string, unknown>; Audio: unknown }).window = {
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

describe('voice dock microphone ownership', () => {
  it('acquires the microphone when it is free', () => {
    installRecognition();
    const action = nextVoiceDockAction(false, 'en');
    assert.equal(action.action, 'start');
    if (action.action !== 'start') return;
    assert.equal(action.note, getPageCopy('en').listening);
    assert.equal(microphoneOwner(), 'dock');
    const session = startVoiceDictation({
      owner: 'dock',
      onTranscript() {},
      onError() {},
      onEnd() {},
    });
    assert.ok(session?.isCurrent());
    assert.equal(created.length, 1);
    session?.stop();
    releaseVoiceDock();
  });

  it('does not interrupt conversation or application dictation', () => {
    installRecognition();
    acquireMicrophone('conversation');
    const duringConversation = nextVoiceDockAction(false, 'en');
    assert.equal(duringConversation.action, 'busy');
    if (duringConversation.action === 'busy') {
      assert.equal(duringConversation.note, getPageCopy('en').microphoneBusy);
      assert.equal(getPageCopy('am').microphoneBusy.length > 0, true);
    }
    assert.equal(created.length, 0);
    assert.equal(microphoneOwner(), 'conversation');
    releaseMicrophone('conversation');

    acquireMicrophone('dictation');
    const duringDictation = nextVoiceDockAction(false, 'en');
    assert.equal(duringDictation.action, 'busy');
    assert.equal(startVoiceDictation({
      owner: 'dock',
      onTranscript() {},
      onError() {},
      onEnd() {},
    }), null);
    assert.equal(created.length, 0);
    assert.equal(microphoneOwner(), 'dictation');
    releaseMicrophone('dictation');
  });

  it('releases ownership when recognition ends or reports an error', async () => {
    installRecognition();
    assert.equal(nextVoiceDockAction(false, 'en').action, 'start');
    let ended = 0;
    const session = startVoiceDictation({
      owner: 'dock',
      onTranscript() {},
      onError() {},
      onEnd: () => {
        ended += 1;
        releaseVoiceDock();
      },
    });
    created[0].emitEnd();
    assert.equal(ended, 1);
    assert.equal(microphoneOwner(), null);
    assert.equal(noteAfterDockEnd('en', getPageCopy('en').listening, false), getPageCopy('en').nothingHeard);
    assert.equal(noteAfterDockEnd('en', 'open the door', true), 'open the door');

    assert.equal(nextVoiceDockAction(false, 'en').action, 'start');
    let errorNote = '';
    const failed = startVoiceDictation({
      owner: 'dock',
      onTranscript() {},
      onError: (message) => {
        errorNote = message;
        releaseVoiceDock();
      },
      onEnd() {},
    });
    created.at(-1)?.emitError('network');
    assert.match(errorNote, /Voice input stopped \(network\)/i);
    assert.equal(microphoneOwner(), null);
    failed?.stop();
    await delay(0);
  });

  it('does not let an old dock session release a newer owner', () => {
    installRecognition();
    assert.equal(nextVoiceDockAction(false, 'en').action, 'start');
    const dockSession = startVoiceDictation({
      owner: 'dock',
      onTranscript() {},
      onError() {},
      onEnd() {},
    });
    assert.equal(acquireMicrophone('dictation'), true);
    const newer = startVoiceDictation({
      owner: 'dictation',
      onTranscript() {},
      onError() {},
      onEnd() {},
    });
    const stops = created.at(-1)?.stops ?? 0;
    dockSession?.stop();
    assert.equal(releaseVoiceDock(), false);
    assert.equal(created.at(-1)?.stops, stops);
    assert.equal(microphoneOwner(), 'dictation');
    assert.equal(newer?.isCurrent(), true);
    newer?.stop();
    releaseMicrophone('dictation');
  });

  it('does not open another session on a repeated click or after speech', async () => {
    installRecognition();
    assert.equal(nextVoiceDockAction(false, 'en').action, 'start');
    let restarts = 0;
    const session = startVoiceDictation({
      owner: 'dock',
      onTranscript() {},
      onError() {},
      onEnd: () => {
        restarts += 1;
      },
    });
    assert.equal(created.length, 1);
    const repeated = nextVoiceDockAction(true, 'en');
    assert.equal(repeated.action, 'stop');
    assert.equal(created.length, 1);

    speakAloud('Hello');
    await delay(0);
    assert.equal(restarts, 0);
    assert.equal(created.length, 1);
    assert.equal(microphoneOwner() === 'dock', false);
    session?.stop();
    releaseVoiceDock();
  });

  it('keeps transcripts inside the dock and releases its own session on cleanup', () => {
    installRecognition();
    const dock = readFileSync(join(sourceRoot, 'components/VoiceDock.tsx'), 'utf8');
    assert.equal(dock.includes('handleUtterance'), false);
    assert.equal(dock.includes('setAnswer'), false);
    assert.equal(dock.includes('onNavigate'), false);
    assert.equal(dock.includes('setSubmitted'), false);
    assert.match(dock, /role="status"/);
    assert.match(dock, /aria-pressed=\{listening\}/);
    assert.match(dock, /aria-describedby=\{note \? statusId : undefined\}/);
    assert.match(dock, /focus-visible:outline/);
    assert.match(dock, /sessionRef\.current\?\.stop\(\);\s*sessionRef\.current = null;\s*releaseMicrophone\('dock'\);/);

    assert.equal(nextVoiceDockAction(false, 'en').action, 'start');
    let shown = '';
    const session = startVoiceDictation({
      owner: 'dock',
      onTranscript: (transcript, isFinal) => {
        if (isFinal) shown = transcript;
      },
      onError() {},
      onEnd() {},
    });
    created[0].emitResult('partial', false);
    created[0].emitResult('read this page', true);
    assert.equal(shown, 'read this page');
    session?.stop();
    assert.equal(releaseVoiceDock(), true);
    assert.equal(microphoneOwner(), null);
    assert.equal(releaseVoiceDock(), false);
  });
});
