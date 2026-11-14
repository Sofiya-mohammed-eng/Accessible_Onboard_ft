import React, { useRef, useState } from 'react';
import { Mic, Square, Volume2 } from 'lucide-react';
import { startVoiceDictation, VoiceInputSession } from '../engines/accessibilityEngine';
import { getLanguageOption } from '../engines/i18n';
import { getPageCopy, unsupportedLanguageNotice } from '../engines/pageCopy';
import { PreferredLanguage } from '../types/accessbridge';

interface VoiceDockProps {
  language: PreferredLanguage;
  speaking: boolean;
  onSpeak: (text: string) => void;
  onStop: () => void;
}

export const VoiceDock: React.FC<VoiceDockProps> = ({ language, speaking, onSpeak, onStop }) => {
  const copy = getPageCopy(language);
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState('');
  const sessionRef = useRef<VoiceInputSession | null>(null);

  const readPage = () => {
    if (speaking) {
      onStop();
      return;
    }
    const text = document.getElementById('main-content')?.innerText?.replace(/\s+/g, ' ').trim();
    if (text) onSpeak(text.slice(0, 1800));
  };

  const toggleVoice = () => {
    if (sessionRef.current) {
      sessionRef.current.stop();
      sessionRef.current = null;
      setListening(false);
      return;
    }
    setNote(copy.listening);
    setListening(true);
    const session = startVoiceDictation({
      lang: getLanguageOption(language).speechLang,
      onTranscript: (transcript, isFinal) => {
        const blocked = unsupportedLanguageNotice(transcript, language);
        if (blocked) {
          setNote(blocked);
          if (isFinal) onSpeak(blocked);
          return;
        }
        if (isFinal) setNote(transcript);
      },
      onError: (message) => {
        const blocked = /language-not-supported/i.test(message);
        setNote(blocked ? copy.languageNotSupported : message);
        setListening(false);
      },
      onEnd: () => setListening(false),
    });
    sessionRef.current = session;
    if (!session) setListening(false);
  };

  return (
    <div className="fixed bottom-4 left-4 z-30 flex max-w-sm flex-col gap-2">
      {note && (
        <p role="status" className="rounded-xl bg-[#0e2a4a] px-3 py-2 text-sm font-semibold text-white shadow-lg">
          {note}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={readPage}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1a73e8] px-3 py-2 text-sm font-bold text-white shadow-lg hover:bg-[#0d4f9e]"
        >
          {speaking ? <Square className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
          {speaking ? copy.stopReading : copy.readPage}
        </button>
        <button
          type="button"
          onClick={toggleVoice}
          aria-pressed={listening}
          className="inline-flex items-center gap-2 rounded-xl border border-[#1a73e8] bg-white px-3 py-2 text-sm font-bold text-[#0d4f9e] shadow-lg"
        >
          <Mic className="h-4 w-4" aria-hidden="true" />
          {listening ? copy.stopVoice : copy.voiceInput}
        </button>
      </div>
    </div>
  );
};
