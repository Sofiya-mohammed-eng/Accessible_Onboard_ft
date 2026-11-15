import {
  beginSpeechPause,
  endSpeechPause,
  microphoneOwner,
  microphonePausedForSpeech,
  releaseMicrophone,
  waitForMicrophone,
  wakeMicrophoneWaiters,
  watchMicrophoneOwner,
  type MicrophoneOwner,
} from './microphoneOwner';

export interface SpeechSupportInfo {
  synthesisSupported: boolean;
  recognitionSupported: boolean;
  recognitionEngineName: string;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionInstanceLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstanceLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function detectSpeechSupport(): SpeechSupportInfo {
  const synthesisSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  const Ctor = getSpeechRecognitionConstructor();
  const recognitionSupported = Boolean(Ctor);
  const recognitionEngineName =
    typeof window !== 'undefined' &&
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition
      ? 'Web Speech API (Standard)'
      : recognitionSupported
        ? 'Web Speech API (WebKit)'
        : 'Not supported in this browser';

  return {
    synthesisSupported,
    recognitionSupported,
    recognitionEngineName,
  };
}

let speechToken = 0;
let currentAudio: HTMLAudioElement | null = null;
let settleCurrentAudio: ((ok: boolean) => void) | null = null;
const speechWaiters = new Set<() => void>();

function voicesFor(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const prefix = lang.slice(0, 2).toLowerCase();
  return (
    window.speechSynthesis
      .getVoices()
      .find((voice) => voice.lang.toLowerCase().replace('_', '-').startsWith(prefix)) || null
  );
}

function chunkText(text: string, size = 160): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const parts: string[] = [];
  let rest = clean;
  while (rest.length > size) {
    const slice = rest.slice(0, size);
    const breakAt = Math.max(slice.lastIndexOf(' '), slice.lastIndexOf('።'), slice.lastIndexOf('.'));
    const cut = breakAt > 40 ? breakAt : size;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

let audioUnlocked = false;
const audioUnlockers: Array<() => void> = [];

function armAudioUnlock() {
  if (typeof window === 'undefined') return;
  const unlock = () => {
    const silent = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
    silent.play().then(() => {
      audioUnlocked = true;
      const waiting = audioUnlockers.splice(0);
      waiting.forEach((run) => run());
    }).catch(() => undefined);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

armAudioUnlock();

function stopCurrentAudio() {
  const audio = currentAudio;
  const settle = settleCurrentAudio;
  currentAudio = null;
  settleCurrentAudio = null;
  if (audio) {
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    audio.src = '';
  }
  settle?.(false);
}

function playAudioUrl(url: string, rate: number, token: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (token !== speechToken) {
      resolve(false);
      return;
    }
    stopCurrentAudio();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    const audio = new Audio();
    currentAudio = audio;
    audio.preload = 'auto';
    try {
      audio.playbackRate = rate;
    } catch {
      audio.playbackRate = 1;
    }
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      if (settleCurrentAudio === finish) settleCurrentAudio = null;
      if (currentAudio === audio) currentAudio = null;
      resolve(ok && token === speechToken);
    };
    settleCurrentAudio = finish;
    audio.onended = () => finish(token === speechToken);
    audio.onerror = () => finish(false);
    audio.src = url;
    audio.play().then(() => {
      if (token !== speechToken || currentAudio !== audio) {
        audio.pause();
        finish(false);
        return;
      }
      audioUnlocked = true;
    }).catch(() => finish(false));
  });
}

export const GUIDE_SPEECH_RATE = 0.85;
export const ENGLISH_FINAL_GRACE_MS = 900;
export const AMHARIC_END_SILENCE_MS = 1400;
export const AMHARIC_NO_SPEECH_MS = 8000;
export const AMHARIC_STT_TIMEOUT_MS = 4000;

export type ConversationListenFailure =
  | 'no-speech'
  | 'permission-denied'
  | 'unavailable'
  | 'timed-out'
  | 'cancelled';

let conversationListenFailure: ConversationListenFailure | null = null;
let amharicSttTimeoutMs = AMHARIC_STT_TIMEOUT_MS;
let abortAmharicTranscription: (() => void) | null = null;

export function setAmharicSttTimeoutForTests(ms: number): void {
  amharicSttTimeoutMs = ms;
}

export function peekListenFailure(): ConversationListenFailure | null {
  return conversationListenFailure;
}

export function takeListenFailure(): ConversationListenFailure | null {
  const current = conversationListenFailure;
  conversationListenFailure = null;
  return current;
}

export function listenFailureMessage(
  failure: ConversationListenFailure | null,
  language: 'en' | 'am',
): string {
  const amharic = language === 'am';
  if (failure === 'no-speech') return amharic ? 'ምንም ንግግር አልተሰማም።' : 'No speech was heard.';
  if (failure === 'permission-denied') {
    return amharic
      ? 'የማይክሮፎን ፈቃድ አልተሰጠም። በጽሑፍ መቀጠል ይችላሉ።'
      : 'Microphone permission was denied. You can continue by typing.';
  }
  if (failure === 'unavailable') {
    return amharic
      ? 'የድምፅ ማወቂያ አይገኝም። በጽሑፍ መቀጠል ይችላሉ።'
      : 'Voice recognition is unavailable. You can continue by typing.';
  }
  if (failure === 'timed-out') {
    return amharic
      ? 'ጽሑፉ በሰዓቱ አልደረሰም። እባክዎ እንደገና ይናገሩ።'
      : 'The transcript did not arrive in time. Please try again.';
  }
  if (failure === 'cancelled') return amharic ? 'ማዳመጥ ቆሟል።' : 'Listening stopped.';
  return '';
}

function noteListenFailure(next: ConversationListenFailure): void {
  conversationListenFailure = next;
}

function clearListenFailure(): void {
  conversationListenFailure = null;
}

export function mergeFinalTranscript(committed: string, incoming: string): string {
  const next = incoming.replace(/\s+/g, ' ').trim();
  if (!next) return committed;
  if (!committed || next === committed) return next;
  if (next.startsWith(committed)) return next;
  return `${committed} ${next}`;
}

export function amharicRecordingShouldStop(input: {
  heard: boolean;
  silenceMs: number;
  elapsedMs: number;
  maxMs: number;
}): boolean {
  if (input.heard && input.silenceMs > AMHARIC_END_SILENCE_MS) return true;
  if (input.elapsedMs > input.maxMs) return true;
  return !input.heard && input.elapsedMs > AMHARIC_NO_SPEECH_MS;
}

export function ttsRequest(lang: string, text: string, slow = false): string {
  const voiceCode = lang.toLowerCase().startsWith('am') ? 'am' : 'en';
  const useSlow = voiceCode === 'am' || slow;
  return `/api/tts?lang=${voiceCode}&slow=${useSlow ? '1' : '0'}&text=${encodeURIComponent(text)}`;
}

async function speakWithAudio(text: string, lang: string, rate: number, token: number, slow = false): Promise<boolean> {
  const voiceCode = lang.toLowerCase().startsWith('am') ? 'am' : 'en';
  for (const part of chunkText(text)) {
    if (token !== speechToken) return false;
    const url = ttsRequest(voiceCode, part, slow);
    const played = await playAudioUrl(url, rate, token);
    if (!played) return false;
  }
  return token === speechToken;
}

let activeUtterance: SpeechSynthesisUtterance | null = null;

function speakWithBrowser(
  text: string,
  lang: string | undefined,
  rate: number,
  token: number,
): Promise<'spoken' | 'blocked' | 'cancelled'> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || token !== speechToken) {
      resolve('cancelled');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    activeUtterance = utterance;
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;
    if (lang) {
      utterance.lang = lang;
      const voice = voicesFor(lang);
      if (voice) utterance.voice = voice;
    }
    let settled = false;
    const finish = (status: 'spoken' | 'blocked' | 'cancelled') => {
      if (settled) return;
      settled = true;
      window.clearInterval(keepAlive);
      if (activeUtterance === utterance) activeUtterance = null;
      resolve(status);
    };
    utterance.onstart = () => {
      window.clearTimeout(blockedTimer);
    };
    utterance.onend = () => finish('spoken');
    utterance.onerror = (event) => {
      const reason = (event as SpeechSynthesisErrorEvent).error;
      if (reason === 'not-allowed') finish('blocked');
      else if (reason === 'canceled' || reason === 'interrupted') finish('cancelled');
      else finish('spoken');
    };
    const keepAlive = window.setInterval(() => {
      if (token !== speechToken) {
        finish('cancelled');
        return;
      }
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.resume();
      }
    }, 4000);
    const blockedTimer = window.setTimeout(() => {
      if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) finish('blocked');
    }, 1200);
    window.setTimeout(() => {
      if (token !== speechToken) {
        finish('cancelled');
        return;
      }
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    }, 60);
  });
}

function whenSomeoneTaps(token: number): Promise<boolean> {
  return new Promise((resolve) => {
    const go = () => {
      window.removeEventListener('pointerdown', go);
      window.removeEventListener('keydown', go);
      audioUnlocked = true;
      resolve(token === speechToken);
    };
    window.addEventListener('pointerdown', go);
    window.addEventListener('keydown', go);
  });
}

export function speakAloud(
  text: string,
  options?: {
    rate?: number;
    lang?: string;
    onStart?: () => void;
    onEnd?: () => void;
    onCaption?: (captionText: string) => void;
    slow?: boolean;
  }
): boolean {
  options?.onCaption?.(text);
  const token = ++speechToken;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.getVoices();
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
      window.speechSynthesis.resume();
    } catch {
      // Ignore
    }
  }
  stopCurrentAudio();
  options?.onStart?.();
  const lang = options?.lang;
  const rate = options?.rate ?? 1;
  const slow = options?.slow === true;
  const done = () => {
    if (token === speechToken) options?.onEnd?.();
  };
  const read = async () => {
    beginSpeechPause();
    releaseRecognitionForSpeech();
    try {
    const amharicVoice = (lang || '').toLowerCase().startsWith('am');
    const played = await speakWithAudio(text, lang || 'en-US', rate, token, slow);
    if (token !== speechToken) return;
    if (played) {
      done();
      return;
    }
    if (amharicVoice) {
      const stillCurrent = await whenSomeoneTaps(token);
      if (!stillCurrent) return;
      const playedAfterTap = await speakWithAudio(text, lang || 'am-ET', rate, token, slow);
      if (token === speechToken) done();
      return;
    }
    let status = await speakWithBrowser(text, lang, rate, token);
    if (status === 'blocked' && token === speechToken) {
      const stillCurrent = await whenSomeoneTaps(token);
      if (!stillCurrent) return;
      const playedAfterTap = await speakWithAudio(text, lang || 'en-US', rate, token, slow);
      if (token !== speechToken) return;
      if (playedAfterTap) {
        done();
        return;
      }
      status = await speakWithBrowser(text, lang, rate, token);
    }
    if (token === speechToken && status !== 'cancelled') done();
    } finally {
      endSpeechPause();
    }
  };
  void read();
  return true;
}

let speechChain: Promise<void> = Promise.resolve();
let activeSpeech = '';

export function speakAndWait(
  text: string,
  options?: { rate?: number; lang?: string; onCaption?: (captionText: string) => void; slow?: boolean },
): Promise<void> {
  const spoken = text.trim();
  if (!spoken) return Promise.resolve();
  if (spoken === activeSpeech) return speechChain;
  activeSpeech = spoken;
  const run = speechChain.then(() => new Promise<void>((resolve) => {
    const finish = () => {
      if (activeSpeech === spoken) activeSpeech = '';
      speechWaiters.delete(finish);
      resolve();
    };
    speechWaiters.add(finish);
    speakAloud(spoken, {
      ...options,
      onEnd: finish,
    });
  }));
  speechChain = run.then(() => undefined, () => undefined);
  return run;
}

export function stopSpeakingAloud(): void {
  speechToken += 1;
  captureGeneration += 1;
  stopRecording?.();
  activeSpeech = '';
  stopCurrentAudio();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
  }
  speechWaiters.forEach((finish) => finish());
  speechWaiters.clear();
}

function downsampleTo16k(chunks: Float32Array[], inputRate: number): ArrayBuffer {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const merged = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  const ratio = inputRate / 16000;
  const outLength = Math.max(1, Math.floor(merged.length / ratio));
  const pcm = new Int16Array(outLength);
  for (let i = 0; i < outLength; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(merged.length, Math.max(start + 1, Math.floor((i + 1) * ratio)));
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += merged[j];
    const sample = Math.max(-1, Math.min(1, sum / (end - start)));
    pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return pcm.buffer;
}

let stopRecording: (() => void) | null = null;
let captureGeneration = 0;
let recordCaptureForTests: ((maxMs: number) => Promise<ArrayBuffer | null>) | null = null;
let transcribeCaptureForTests: ((audio: ArrayBuffer, signal?: AbortSignal) => Promise<string>) | null = null;
let releaseCaptureForTests: (() => void) | null = null;

export function setAmharicCaptureForTests(hooks: {
  record: ((maxMs: number) => Promise<ArrayBuffer | null>) | null;
  transcribe: ((audio: ArrayBuffer, signal?: AbortSignal) => Promise<string>) | null;
  release?: (() => void) | null;
}): void {
  recordCaptureForTests = hooks.record;
  transcribeCaptureForTests = hooks.transcribe;
  releaseCaptureForTests = hooks.release ?? null;
}
let sharedAudio: AudioContext | null = null;

function listeningContext(): AudioContext {
  if (!sharedAudio || sharedAudio.state === 'closed') sharedAudio = new AudioContext();
  return sharedAudio;
}

if (typeof window !== 'undefined') {
  const unlockListening = () => {
    const context = listeningContext();
    void context.resume();
  };
  window.addEventListener('pointerdown', unlockListening);
  window.addEventListener('keydown', unlockListening);
}

function recordSpeechPcm(maxMs: number): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    let settled = false;
    let stream: MediaStream | null = null;
    let unsubscribe = () => {};
    let processor: ScriptProcessorNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let mute: GainNode | null = null;
    let resourcesReleased = false;
    const releaseStream = () => {
      processor?.disconnect();
      source?.disconnect();
      mute?.disconnect();
      processor = null;
      source = null;
      mute = null;
      const current = stream;
      stream = null;
      current?.getTracks().forEach((track) => track.stop());
      if (resourcesReleased) return;
      resourcesReleased = true;
      releaseCaptureForTests?.();
    };
    const finish = (audio: ArrayBuffer | null) => {
      if (settled) {
        const late = stream;
        stream = null;
        late?.getTracks().forEach((track) => track.stop());
        return;
      }
      settled = true;
      unsubscribe();
      if (stopRecording === requestStop) stopRecording = null;
      releaseStream();
      resolve(microphoneOwner() === 'conversation' ? audio : null);
    };
    const requestStop = () => finish(null);
    unsubscribe = watchMicrophoneOwner(() => {
      if (microphoneOwner() !== 'conversation') requestStop();
    });
    stopRecording = requestStop;
    if (microphoneOwner() !== 'conversation') {
      finish(null);
      return;
    }
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch {
        finish(null);
        return;
      }
      if (settled || microphoneOwner() !== 'conversation') {
        const late = stream;
        stream = null;
        late.getTracks().forEach((track) => track.stop());
        if (!settled) finish(null);
        return;
      }
      try {
        const context = listeningContext();
        await context.resume().catch(() => undefined);
        if (settled || microphoneOwner() !== 'conversation') {
          finish(null);
          return;
        }
        source = context.createMediaStreamSource(stream);
        processor = context.createScriptProcessor(4096, 1, 1);
        mute = context.createGain();
        mute.gain.value = 0;
        const chunks: Float32Array[] = [];
        let heard = false;
        let silence = 0;
        const started = performance.now();
        processor.onaudioprocess = (event) => {
          if (microphoneOwner() !== 'conversation') {
            requestStop();
            return;
          }
          const input = event.inputBuffer.getChannelData(0);
          chunks.push(new Float32Array(input));
          let energy = 0;
          for (let i = 0; i < input.length; i += 1) energy += input[i] * input[i];
          const rms = Math.sqrt(energy / input.length);
          if (rms > 0.012) {
            heard = true;
            silence = 0;
          } else if (heard) {
            silence += (input.length / (context.sampleRate || 48000)) * 1000;
          }
          const elapsed = performance.now() - started;
          if (amharicRecordingShouldStop({ heard, silenceMs: silence, elapsedMs: elapsed, maxMs })) {
            finish(heard ? downsampleTo16k(chunks, context.sampleRate || 48000) : null);
          }
        };
        source.connect(processor);
        processor.connect(mute);
        mute.connect(context.destination);
      } catch {
        finish(null);
      }
    })();
  });
}

async function transcribeAmharic(audio: ArrayBuffer, signal: AbortSignal): Promise<string> {
  const response = await fetch('/api/stt?lang=am-ET', {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: audio,
    signal,
  });
  if (!response.ok) return '';
  const data = (await response.json()) as { transcript?: string };
  return (data.transcript || '').trim();
}

function captureAmharic(maxMs: number): Promise<ArrayBuffer | null> {
  const record = recordCaptureForTests;
  if (!record) return recordSpeechPcm(maxMs);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (audio: ArrayBuffer | null) => {
      if (settled) return;
      settled = true;
      unsubscribe();
      resolve(microphoneOwner() === 'conversation' ? audio : null);
    };
    const unsubscribe = watchMicrophoneOwner(() => {
      if (microphoneOwner() !== 'conversation') {
        releaseCaptureForTests?.();
        finish(null);
      }
    });
    if (microphoneOwner() !== 'conversation') {
      finish(null);
      return;
    }
    void Promise.resolve(record(maxMs)).then(
      (audio) => finish(audio),
      () => finish(null),
    );
  });
}

async function listenAmharic(timeoutMs: number, epoch: number, captures = 2): Promise<string> {
  const generation = captureGeneration;
  releaseRecognitionForSpeech();
  await waitForQuiet(450);
  let timedOut = false;
  for (let attempt = 0; attempt < captures; attempt += 1) {
    if (epoch !== conversationEpoch || generation !== captureGeneration || microphoneOwner() !== 'conversation') return '';
    const audio = await captureAmharic(Math.min(timeoutMs, 10000));
    if (epoch !== conversationEpoch || generation !== captureGeneration || microphoneOwner() !== 'conversation') return '';
    if (!audio || audio.byteLength < 3200) continue;
    try {
      const outcome = await transcribeBounded(audio, epoch);
      if (epoch !== conversationEpoch || generation !== captureGeneration || microphoneOwner() !== 'conversation') return '';
      if (outcome.text) {
        clearListenFailure();
        return outcome.text;
      }
      if (outcome.timedOut) timedOut = true;
    } catch {
      return '';
    }
  }
  if (epoch === conversationEpoch) noteListenFailure(timedOut ? 'timed-out' : 'no-speech');
  return '';
}

async function transcribeBounded(
  audio: ArrayBuffer,
  epoch: number,
): Promise<{ text: string; timedOut: boolean }> {
  const controller = new AbortController();
  const abort = () => {
    if (!controller.signal.aborted) controller.abort();
  };
  abortAmharicTranscription = abort;
  let timer = 0;
  let expired = false;
  const pending = (
    transcribeCaptureForTests
      ? transcribeCaptureForTests(audio, controller.signal)
      : transcribeAmharic(audio, controller.signal)
  ).then(
    (text) => (epoch !== conversationEpoch || controller.signal.aborted ? '' : (text || '').trim()),
    () => '',
  );
  try {
    const text = await new Promise<string>((resolve) => {
      const finish = (value: string) => resolve(value);
      timer = window.setTimeout(() => {
        expired = true;
        abort();
        finish('');
      }, amharicSttTimeoutMs);
      controller.signal.addEventListener('abort', () => finish(''));
      pending.then((value) => finish(value));
    });
    if (epoch !== conversationEpoch) return { text: '', timedOut: false };
    return { text, timedOut: expired && !text };
  } finally {
    window.clearTimeout(timer);
    if (abortAmharicTranscription === abort) abortAmharicTranscription = null;
  }
}

function waitForQuiet(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

let conversationEpoch = 0;
let conversationSession: VoiceInputSession | null = null;

let releaseEnglishListen: (() => void) | null = null;

export function stopConversationRecognition(): void {
  noteListenFailure('cancelled');
  conversationEpoch += 1;
  abortAmharicTranscription?.();
  const session = conversationSession;
  conversationSession = null;
  if (session?.isCurrent()) session.stop();
  releaseMicrophone('conversation');
  wakeMicrophoneWaiters();
  const release = releaseEnglishListen;
  releaseEnglishListen = null;
  release?.();
}

export function listenOnce(lang: string, timeoutMs = 12000, captures = 2): Promise<string> {
  clearListenFailure();
  const epoch = conversationEpoch;
  const cancelled = () => epoch !== conversationEpoch;
  return waitForMicrophone('conversation', cancelled).then((ready) => {
    if (!ready || cancelled()) return '';
    const capture = lang.toLowerCase().startsWith('am')
      ? listenAmharic(timeoutMs, epoch, captures)
      : listenEnglish(lang, timeoutMs, epoch);
    return capture.finally(() => {
      if (epoch === conversationEpoch) releaseMicrophone('conversation');
    });
  });
}

function listenEnglish(lang: string, timeoutMs: number, epoch: number): Promise<string> {
  return new Promise((resolve) => {
    let settled = false;
    let restarts = 0;
    let session: VoiceInputSession | null = null;
    let committed = '';
    let startupTimer = 0;
    let timeoutTimer = 0;
    let graceTimer = 0;
    let restartTimer = 0;
    const clearTimers = () => {
      window.clearTimeout(startupTimer);
      window.clearTimeout(timeoutTimer);
      window.clearTimeout(graceTimer);
      window.clearTimeout(restartTimer);
      startupTimer = 0;
      timeoutTimer = 0;
      graceTimer = 0;
      restartTimer = 0;
    };
    let cancelListen = () => {};
    const finish = (value: string) => {
      if (settled) return;
      settled = true;
      clearTimers();
      if (releaseEnglishListen === cancelListen) releaseEnglishListen = null;
      if (conversationSession === session) conversationSession = null;
      if (session?.isCurrent()) session.stop();
      if (epoch === conversationEpoch) {
        if (value) clearListenFailure();
        else if (!conversationListenFailure) noteListenFailure('no-speech');
      }
      resolve(value);
    };
    cancelListen = () => finish('');
    const armGrace = () => {
      window.clearTimeout(graceTimer);
      graceTimer = window.setTimeout(() => {
        graceTimer = 0;
        if (settled || epoch !== conversationEpoch) return;
        finish(committed);
      }, ENGLISH_FINAL_GRACE_MS);
    };
    const scheduleRestart = () => {
      if (restartTimer || settled) return;
      restartTimer = window.setTimeout(() => {
        restartTimer = 0;
        if (settled || epoch !== conversationEpoch || !session?.isCurrent()) return;
        if (!session.start()) finish(committed);
      }, 250);
    };
    releaseEnglishListen = cancelListen;
    startupTimer = window.setTimeout(() => {
      startupTimer = 0;
      if (settled || epoch !== conversationEpoch) {
        finish('');
        return;
      }
      timeoutTimer = window.setTimeout(() => {
        timeoutTimer = 0;
        if (session?.isCurrent()) session.stop();
        finish(epoch === conversationEpoch ? committed : '');
      }, timeoutMs);
      session = startVoiceDictation({
        owner: 'conversation',
        lang,
        onTranscript: (transcript, isFinal) => {
          if (settled || epoch !== conversationEpoch || !session?.isCurrent()) return;
          if (!isFinal) return;
          const next = mergeFinalTranscript(committed, transcript);
          if (next === committed) return;
          committed = next;
          armGrace();
        },
        onError: (message) => {
          if (settled || epoch !== conversationEpoch) return;
          if (/no-speech/i.test(message)) {
            noteListenFailure('no-speech');
            return;
          }
          if (/aborted/i.test(message)) return;
          if (/language-not-supported/i.test(message) && lang === 'am-ET') return;
          if (/permission was denied|not-allowed/i.test(message)) noteListenFailure('permission-denied');
          else noteListenFailure('unavailable');
          finish('');
        },
        onEnd: () => {
          if (settled || epoch !== conversationEpoch) return;
          if (committed || graceTimer) {
            if (!graceTimer) armGrace();
            if (restarts > 8) return;
            restarts += 1;
            scheduleRestart();
            return;
          }
          restarts += 1;
          if (restarts > 4) {
            finish('');
            return;
          }
          scheduleRestart();
        },
      });
      if (!session || epoch !== conversationEpoch) {
        if (session?.isCurrent()) session.stop();
        if (!session && epoch === conversationEpoch) noteListenFailure('unavailable');
        finish('');
        return;
      }
      conversationSession = session;
      onConversationSessionLost = () => {
        if (settled || epoch !== conversationEpoch || session?.isCurrent()) return;
        finish('');
      };
    }, 350);
  });
}

export interface VoiceInputSession {
  stop: () => void;
  start: () => boolean;
  isCurrent: () => boolean;
}

let activeRecognition: SpeechRecognitionInstanceLike | null = null;
let recognitionSerial = 0;
let activeSerial = 0;

let onConversationSessionLost: (() => void) | null = null;
let onActiveSessionInvalidated: (() => void) | null = null;

function discardActiveRecognition(): void {
  const recognition = activeRecognition;
  activeSerial = ++recognitionSerial;
  activeRecognition = null;
  const lost = onConversationSessionLost;
  onConversationSessionLost = null;
  const invalidate = onActiveSessionInvalidated;
  onActiveSessionInvalidated = null;
  lost?.();
  invalidate?.();
  if (!recognition) return;
  try {
    recognition.stop();
  } catch {
    // The recognizer may already be stopped.
  }
}

function releaseRecognitionForSpeech(): void {
  discardActiveRecognition();
}

export function startVoiceDictation(callbacks: {
  owner: MicrophoneOwner;
  lang?: string;
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError: (message: string) => void;
  onEnd: () => void;
  onInvalidate?: () => void;
  onStart?: () => void;
}): VoiceInputSession | null {
  const Ctor = getSpeechRecognitionConstructor();
  if (microphonePausedForSpeech() || microphoneOwner() !== callbacks.owner) return null;
  if (!Ctor) {
    callbacks.onError(
      'Speech recognition is not supported in this browser. Use the accessible text input or quick-phrase controls instead.'
    );
    callbacks.onEnd();
    return null;
  }

  discardActiveRecognition();
  const serial = ++recognitionSerial;
  activeSerial = serial;

  try {
    const recognition = new Ctor();
    const isCurrent = () => activeSerial === serial;
    if (!isCurrent()) return null;
    activeRecognition = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = callbacks.lang || 'en-US';

    recognition.onstart = () => {
      if (!isCurrent()) return;
      callbacks.onStart?.();
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      if (!isCurrent()) return;
      let combined = '';
      let hasFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        combined += result[0]?.transcript ?? '';
        if (result.isFinal) hasFinal = true;
      }
      if (combined.trim()) {
        callbacks.onTranscript(combined.trim(), hasFinal);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      if (!isCurrent()) return;
      const reason =
        event.error === 'not-allowed'
          ? 'Microphone permission was denied. Please allow microphone access or continue with text input.'
          : `Voice input stopped (${event.error}). You can type directly at any time.`;
      callbacks.onError(reason);
    };

    recognition.onend = () => {
      if (!isCurrent()) return;
      onActiveSessionInvalidated = null;
      if (activeRecognition === recognition) activeRecognition = null;
      callbacks.onEnd();
    };

    const session: VoiceInputSession = {
      isCurrent,
      start: () => {
        if (!isCurrent()) return false;
        activeRecognition = recognition;
        try {
          recognition.start();
          return true;
        } catch {
          return false;
        }
      },
      stop: () => {
        if (!isCurrent()) return;
        const invalidate = onActiveSessionInvalidated;
        onActiveSessionInvalidated = null;
        activeSerial = ++recognitionSerial;
        if (activeRecognition === recognition) activeRecognition = null;
        try {
          recognition.stop();
        } catch {
          // Ignore
        }
        invalidate?.();
      },
    };
    if (!isCurrent()) return null;
    onActiveSessionInvalidated = () => {
      callbacks.onInvalidate?.();
    };
    recognition.start();
    return session;
  } catch {
    if (activeSerial === serial) {
      onActiveSessionInvalidated = null;
      callbacks.onError('Unable to start browser speech recognition. Please use text input.');
      callbacks.onEnd();
    }
    return null;
  }
}
