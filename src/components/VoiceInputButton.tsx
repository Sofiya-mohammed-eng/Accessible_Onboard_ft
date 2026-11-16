import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import {
  detectSpeechSupport,
  startVoiceDictation,
  VoiceInputSession,
} from '../engines/accessibilityEngine';
import { getLanguageOption } from '../engines/i18n';
import { getPageCopy, unsupportedLanguageNotice } from '../engines/pageCopy';
import { PreferredLanguage } from '../types/accessbridge';

interface VoiceInputButtonProps {
  language: PreferredLanguage;
  onTranscript: (text: string) => void;
  label?: string;
  className?: string;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  language,
  onTranscript,
  label,
  className = '',
}) => {
  const page = getPageCopy(language);
  const speech = detectSpeechSupport();
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState('');
  const sessionRef = useRef<VoiceInputSession | null>(null);
  const transcriptRef = useRef(onTranscript);
  transcriptRef.current = onTranscript;

  useEffect(() => {
    return () => {
      sessionRef.current?.stop();
      sessionRef.current = null;
    };
  }, []);

  const toggle = () => {
    if (sessionRef.current) {
      sessionRef.current.stop();
      sessionRef.current = null;
      setListening(false);
      setNote(page.voiceStopped);
      return;
    }
    if (!speech.recognitionSupported) {
      setNote(
        language === 'am'
          ? 'የድምፅ ግብዓት በዚህ አሳሽ አይደገፍም። እባክዎ ይተይቡ።'
          : 'Voice input is not supported in this browser. Please type instead.'
      );
      return;
    }
    setNote(page.voiceListening);
    setListening(true);
    const session = startVoiceDictation({
      lang: getLanguageOption(language).speechLang,
      onTranscript: (transcript, isFinal) => {
        if (!isFinal) return;
        const blocked = unsupportedLanguageNotice(transcript, language);
        if (blocked) {
          setNote(blocked);
          return;
        }
        transcriptRef.current(transcript);
        setNote(page.voiceAdded);
      },
      onError: (message) => {
        setNote(/language-not-supported/i.test(message) ? page.languageNotSupported : message);
        setListening(false);
      },
      onEnd: () => {
        sessionRef.current = null;
        setListening(false);
      },
    });
    sessionRef.current = session;
    if (!session) setListening(false);
  };

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        aria-pressed={listening}
        onClick={toggle}
        className="inline-flex items-center gap-2 rounded-xl border border-[#9eb8d6] bg-white px-3 py-2 text-sm font-bold text-[#0d4f9e] hover:bg-[#eaf3fc] high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
      >
        {listening ? (
          <MicOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Mic className="h-4 w-4" aria-hidden="true" />
        )}
        {listening ? page.stopVoice : label || page.answerByVoice}
      </button>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {note}
      </span>
    </span>
  );
};
