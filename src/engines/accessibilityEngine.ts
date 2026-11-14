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

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options?.onEnd?.();
    return false;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 1.0;
    if (options?.lang) {
      utterance.lang = options.lang;
    }
    utterance.pitch = 1.0;
    utterance.onstart = () => options?.onStart?.();
    utterance.onend = () => options?.onEnd?.();
    utterance.onerror = () => options?.onEnd?.();
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    options?.onEnd?.();
    return false;
  }
}

export function stopSpeakingAloud(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
  }
}

export interface VoiceInputSession {
  stop: () => void;
}

export function startVoiceDictation(callbacks: {
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
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

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

    recognition.onend = () => {
      callbacks.onEnd();
    };

    recognition.start();
    return {
      stop: () => {
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
