import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Volume2 } from 'lucide-react';
import { startVoiceDictation, VoiceInputSession } from '../engines/accessibilityEngine';
import { releaseMicrophone, watchMicrophoneOwner } from '../engines/microphoneOwner';
import { getLanguageOption } from '../engines/i18n';
import { getPageCopy, unsupportedLanguageNotice } from '../engines/pageCopy';
import { nextVoiceDockAction, noteAfterDockEnd, voiceDockStillOwnsSession } from '../engines/voiceDockControl';
import { PreferredLanguage } from '../types/accessbridge';

interface VoiceDockProps {
  language: PreferredLanguage;
  speaking: boolean;
  onSpeak: (text: string) => void;
  onStop: () => void;
}

const buttonClass = 'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5a623]';

export const VoiceDock: React.FC<VoiceDockProps> = ({ language, speaking, onSpeak, onStop }) => {
  const copy = getPageCopy(language);
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState('');
  const sessionRef = useRef<VoiceInputSession | null>(null);
  const tokenRef = useRef(0);
  const heardRef = useRef(false);

  const clearOwnedSession = (nextNote: string) => {
    const session = sessionRef.current;
    sessionRef.current = null;
    tokenRef.current += 1;
    if (session?.isCurrent()) session.stop();
    releaseMicrophone('dock');
    heardRef.current = false;
    setListening(false);
    setNote(nextNote);
  };

  useEffect(() => {
    return watchMicrophoneOwner(() => {
      const session = sessionRef.current;
      if (!session) return;
      if (voiceDockStillOwnsSession(session.isCurrent())) return;
      sessionRef.current = null;
      tokenRef.current += 1;
      if (session.isCurrent()) session.stop();
      heardRef.current = false;
      setListening(false);
      setNote((current) => noteAfterDockEnd(language, current === copy.listening ? copy.voiceDockStopped : current, false));
    });
  }, [copy.listening, copy.voiceDockStopped, language]);

  useEffect(() => {
    if (!speaking) return;
    const session = sessionRef.current;
    if (!session || voiceDockStillOwnsSession(session.isCurrent())) return;
    sessionRef.current = null;
    tokenRef.current += 1;
    heardRef.current = false;
    setListening(false);
    setNote((current) => (current === copy.listening ? copy.voiceDockStopped : current));
  }, [copy.listening, copy.voiceDockStopped, speaking]);

  useEffect(() => {
    return () => {
      sessionRef.current?.stop();
      sessionRef.current = null;
      releaseMicrophone('dock');
    };
  }, []);

  const readPage = () => {
    if (speaking) {
      onStop();
      return;
    }
    const text = document.getElementById('main-content')?.innerText?.replace(/\s+/g, ' ').trim();
    if (text) onSpeak(text.slice(0, 1800));
  };

  const toggleVoice = () => {
    const action = nextVoiceDockAction(Boolean(sessionRef.current), language);
    if (action.action === 'stop') {
      clearOwnedSession(copy.voiceDockStopped);
      return;
    }
    if (action.action === 'busy') {
      setListening(false);
      setNote(action.note);
      return;
    }
    const token = tokenRef.current + 1;
    tokenRef.current = token;
    heardRef.current = false;
    setListening(true);
    setNote(action.note);
    const session = startVoiceDictation({
      owner: 'dock',
      lang: getLanguageOption(language).speechLang,
      onTranscript: (transcript, isFinal) => {
        if (tokenRef.current !== token) return;
        const blocked = unsupportedLanguageNotice(transcript, language);
        if (blocked) {
          setNote(blocked);
          if (isFinal) onSpeak(blocked);
          return;
        }
        if (!isFinal) return;
        heardRef.current = true;
        setNote(transcript);
      },
      onError: (message) => {
        if (tokenRef.current !== token) return;
        const blocked = /language-not-supported/i.test(message);
        clearOwnedSession(blocked ? copy.languageNotSupported : message);
      },
      onEnd: () => {
        if (tokenRef.current !== token) return;
        const heard = heardRef.current;
        sessionRef.current = null;
        releaseMicrophone('dock');
        heardRef.current = false;
        setListening(false);
        setNote((current) => noteAfterDockEnd(language, current, heard));
      },
    });
    if (tokenRef.current !== token) return;
    sessionRef.current = session;
    if (!session) clearOwnedSession(copy.languageNotSupported);
  };

  const statusId = 'voice-dock-status';
  const micLabel = listening ? copy.stopVoice : copy.voiceInput;

  return (
    <div className="fixed bottom-4 left-4 z-30 flex max-w-sm flex-col gap-2">
      {note && (
        <p id={statusId} role="status" className="rounded-xl bg-[#0e2a4a] px-3 py-2 text-sm font-semibold text-white shadow-lg">
          {note}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={readPage}
          aria-pressed={speaking}
          className={`${buttonClass} bg-[#1a73e8] text-white hover:bg-[#0d4f9e]`}
        >
          {speaking ? <Square className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
          {speaking ? copy.stopReading : copy.readPage}
        </button>
        <button
          type="button"
          onClick={toggleVoice}
          aria-pressed={listening}
          aria-label={micLabel}
          aria-describedby={note ? statusId : undefined}
          className={`${buttonClass} border border-[#1a73e8] bg-white text-[#0d4f9e]`}
        >
          <Mic className="h-4 w-4" aria-hidden="true" />
          {micLabel}
        </button>
      </div>
    </div>
  );
};
