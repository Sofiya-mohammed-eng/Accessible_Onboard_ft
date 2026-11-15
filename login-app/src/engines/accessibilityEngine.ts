const API_BASE = (document.currentScript as HTMLScriptElement | null)?.dataset.api ?? 'http://localhost:8000';
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
  currentAudio = null;
  if (!audio) return;
  audio.onended = null;
  audio.onerror = null;
  audio.pause();
  audio.src = '';
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
      if (currentAudio === audio) currentAudio = null;
      resolve(ok && token === speechToken);
    };
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

async function speakWithAudio(text: string, lang: string, rate: number, token: number): Promise<boolean> {
  const voiceCode = lang.toLowerCase().startsWith('am') ? 'am' : 'en';
  for (const part of chunkText(text)) {
    if (token !== speechToken) return false;
    const url = `${API_BASE}/api/tts?lang=${voiceCode}&text=${encodeURIComponent(part)}`;
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
  const done = () => {
    if (token === speechToken) options?.onEnd?.();
  };
  const read = async () => {
    try {
      suppressRecognitionEnd = true;
      activeRecognition?.stop();
    } catch {
      suppressRecognitionEnd = false;
    }
    const played = await speakWithAudio(text, lang || 'en-US', rate, token);
    if (token !== speechToken) return;
    if (played) {
      done();
      return;
    }
    let status = await speakWithBrowser(text, lang, rate, token);
    if (status === 'blocked' && token === speechToken) {
      const stillCurrent = await whenSomeoneTaps(token);
      if (!stillCurrent) return;
      const playedAfterTap = await speakWithAudio(text, lang || 'en-US', rate, token);
      if (token !== speechToken) return;
      if (playedAfterTap) {
        done();
        return;
      }
      status = await speakWithBrowser(text, lang, rate, token);
    }
    if (token === speechToken && status !== 'cancelled') done();
  };
  void read();
  return true;
}

let speechChain: Promise<void> = Promise.resolve();
let activeSpeech = '';

export function speakAndWait(
  text: string,
  options?: { rate?: number; lang?: string; onCaption?: (captionText: string) => void },
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
    void (async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch {
        resolve(null);
        return;
      }
      const context = listeningContext();
      await context.resume().catch(() => undefined);
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      const mute = context.createGain();
      mute.gain.value = 0;
      const chunks: Float32Array[] = [];
      let heard = false;
      let silence = 0;
      let settled = false;
      const started = performance.now();
      const finish = () => {
        if (settled) return;
        settled = true;
        if (stopRecording === finish) stopRecording = null;
        processor.onaudioprocess = null;
        processor.disconnect();
        source.disconnect();
        mute.disconnect();
        stream.getTracks().forEach((track) => track.stop());
        resolve(heard ? downsampleTo16k(chunks, context.sampleRate || 48000) : null);
      };
      processor.onaudioprocess = (event) => {
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
        if ((heard && silence > 800) || elapsed > maxMs || (!heard && elapsed > 8000)) finish();
      };
      stopRecording = finish;
      source.connect(processor);
      processor.connect(mute);
      mute.connect(context.destination);
    })();
  });
}

async function transcribeAmharic(audio: ArrayBuffer): Promise<string> {
  const response = await fetch(`${API_BASE}/api/stt?lang=am-ET`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: audio,
  });
  if (!response.ok) return '';
  const data = (await response.json()) as { transcript?: string };
  return (data.transcript || '').trim();
}

async function listenAmharic(timeoutMs: number): Promise<string> {
  const generation = captureGeneration;
  try {
    activeRecognition?.stop();
  } catch {
    // The browser recognizer does not understand Amharic, so it is stopped first.
  }
  await waitForQuiet(450);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (generation !== captureGeneration) return '';
    const audio = await recordSpeechPcm(Math.min(timeoutMs, 10000));
    if (generation !== captureGeneration) return '';
    if (!audio || audio.byteLength < 3200) continue;
    try {
      const transcript = await transcribeAmharic(audio);
      if (generation !== captureGeneration) return '';
      if (transcript) return transcript;
    } catch {
      return '';
    }
  }
  return '';
}

function waitForQuiet(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function listenOnce(lang: string, timeoutMs = 12000): Promise<string> {
  if (lang.toLowerCase().startsWith('am')) return listenAmharic(timeoutMs);
  return new Promise((resolve) => {
    window.setTimeout(() => {
      let settled = false;
      let restarts = 0;
      const finish = (value: string) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(value);
      };
      const timer = window.setTimeout(() => {
        try {
          activeRecognition?.stop();
        } catch {
          // Ignore
        }
        finish('');
      }, timeoutMs);
      let latest = '';
      const session = startVoiceDictation({
        lang,
        onTranscript: (transcript, isFinal) => {
          latest = transcript.trim();
          if (!isFinal || !latest) return;
          finish(latest);
          session?.stop();
        },
        onError: (message) => {
          if (/no-speech|aborted/i.test(message)) return;
          if (/language-not-supported/i.test(message) && lang !== 'am-ET') {
            finish('');
            return;
          }
          if (/language-not-supported/i.test(message)) return;
          finish('');
        },
        onEnd: () => {
          if (settled) return;
          if (latest) {
            finish(latest);
            return;
          }
          restarts += 1;
          if (restarts > 4) {
            finish('');
            return;
          }
          window.setTimeout(() => {
            if (settled) return;
            try {
              session?.start();
            } catch {
              finish('');
            }
          }, 250);
        },
      });
      if (!session) finish('');
    }, 350);
  });
}

export interface VoiceInputSession {
  stop: () => void;
  start: () => void;
}

let activeRecognition: SpeechRecognitionInstanceLike | null = null;
let suppressRecognitionEnd = false;

export function startVoiceDictation(callbacks: {
  lang?: string;
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}): VoiceInputSession | null {
  const Ctor = getSpeechRecognitionConstructor();
  if (!Ctor) {
    callbacks.onError(
      'Speech recognition is not supported in this browser. Use the accessible text input or quick-phrase controls instead.'
    );
    callbacks.onEnd();
    return null;
  }

  try {
    activeRecognition?.stop();
    const recognition = new Ctor();
    activeRecognition = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = callbacks.lang || 'en-US';

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
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
      const reason =
        event.error === 'not-allowed'
          ? 'Microphone permission was denied. Please allow microphone access or continue with text input.'
          : `Voice input stopped (${event.error}). You can type directly at any time.`;
      callbacks.onError(reason);
    };

    let closedByUs = false;
    recognition.onend = () => {
      if (activeRecognition === recognition) activeRecognition = null;
      if (suppressRecognitionEnd || closedByUs) {
        suppressRecognitionEnd = false;
        return;
      }
      callbacks.onEnd();
    };

    recognition.start();
    return {
      start: () => {
        activeRecognition = recognition;
        try {
          recognition.start();
        } catch {
          // Ignore a restart that is already running.
        }
      },
      stop: () => {
        closedByUs = true;
        try {
          recognition.stop();
        } catch {
          // Ignore
        }
      },
    };
  } catch {
    callbacks.onError('Unable to start browser speech recognition. Please use text input.');
    callbacks.onEnd();
    return null;
  }
}
