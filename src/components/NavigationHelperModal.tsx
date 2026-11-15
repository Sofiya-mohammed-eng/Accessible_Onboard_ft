import React, { useEffect, useRef, useState } from 'react';
import { X, Compass, Keyboard, Mic, MicOff, SlidersHorizontal } from 'lucide-react';
import {
  detectSpeechSupport,
  startVoiceDictation,
  VoiceInputSession,
} from '../engines/accessibilityEngine';
import { acquireMicrophone, releaseMicrophone } from '../engines/microphoneOwner';
import { NavigationView } from '../types/accessbridge';

interface NavigationHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: NavigationView) => void;
  onSpeakText: (text: string) => void;
  onOpenStartupSetup: () => void;
}

const DESTINATIONS: Array<{ view: NavigationView; label: string; detail: string; shortcut: string }> = [
  { view: 'dashboard', label: 'Accessibility Dashboard', detail: 'Overview and primary actions', shortcut: 'Alt + 1' },
  { view: 'scanner', label: 'Understand This Page', detail: 'Inspect page elements & alt text', shortcut: 'Alt + 2' },
  { view: 'jobs', label: 'Find Jobs', detail: 'Sample roles & plain-language breakdowns', shortcut: 'Alt + 3' },
  { view: 'apply', label: 'Application Assistant', detail: 'Voice & text application drafting', shortcut: 'Alt + 4' },
  { view: 'verify', label: 'Smart Verification Engine', detail: 'Check intended vs entered values', shortcut: 'Alt + 5' },
  { view: 'review', label: 'Final Application Review', detail: 'Readiness status & manual confirm', shortcut: 'Alt + 6' },
  { view: 'onboarding', label: 'Accessibility Setup', detail: 'Adjust visual, auditory, motor & cognitive tools', shortcut: 'Alt + 7' },
];

function matchSpokenDestination(transcript: string): NavigationView | null {
  const lower = transcript.toLowerCase();
  if (lower.includes('dashboard') || lower.includes('home')) return 'dashboard';
  if (lower.includes('understand') || lower.includes('scan') || lower.includes('page')) return 'scanner';
  if (lower.includes('job') || lower.includes('find') || lower.includes('work')) return 'jobs';
  if (lower.includes('apply') || lower.includes('draft') || lower.includes('application')) return 'apply';
  if (lower.includes('verify') || lower.includes('check')) return 'verify';
  if (lower.includes('review') || lower.includes('final') || lower.includes('confirm')) return 'review';
  if (lower.includes('setting') || lower.includes('onboard') || lower.includes('preference')) return 'onboarding';
  return null;
}

export const NavigationHelperModal: React.FC<NavigationHelperModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onSpeakText,
  onOpenStartupSetup,
}) => {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const voiceRef = useRef<VoiceInputSession | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState('');
  const speechSupport = detectSpeechSupport();

  useEffect(() => {
    if (!isOpen) {
      voiceRef.current?.stop();
      voiceRef.current = null;
      releaseMicrophone('navigation');
      setIsListening(false);
      return;
    }
    closeBtnRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      voiceRef.current?.stop();
      voiceRef.current = null;
      releaseMicrophone('navigation');
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggleVoiceCommand = () => {
    if (isListening) {
      voiceRef.current?.stop();
      voiceRef.current = null;
      releaseMicrophone('navigation');
      setIsListening(false);
      setVoiceFeedback('Voice navigation stopped.');
      return;
    }
    if (!acquireMicrophone('navigation')) return;

    setIsListening(true);
    setVoiceFeedback('Listening... Say "Dashboard", "Find Jobs", "Apply", "Verify", or "Review".');

    const session = startVoiceDictation({
      owner: 'navigation',
      onTranscript: (transcript, isFinal) => {
        setVoiceFeedback(`Heard: "${transcript}"`);
        const matched = matchSpokenDestination(transcript);
        if (matched && isFinal) {
          voiceRef.current?.stop();
          voiceRef.current = null;
          releaseMicrophone('navigation');
          setIsListening(false);
          onNavigate(matched);
          onSpeakText(`Navigating to ${matched}`);
          onClose();
        }
      },
      onError: (msg) => {
        setVoiceFeedback(msg);
        setIsListening(false);
      },
      onEnd: () => {
        releaseMicrophone('navigation');
        setIsListening(false);
      },
    });

    if (!session) {
      releaseMicrophone('navigation');
      setIsListening(false);
    } else {
      voiceRef.current = session;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nav-helper-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
    >
      <div className="w-full max-w-2xl rounded-xl border-2 border-[#001F3F] bg-white p-6 shadow-xl high-contrast:border-yellow-300 high-contrast:bg-black">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 high-contrast:border-white">
          <div className="flex items-center gap-2.5">
            <Compass className="h-6 w-6 text-[#0056B3] high-contrast:text-yellow-300" aria-hidden="true" />
            <div>
              <h2
                id="nav-helper-title"
                className="font-display text-xl font-bold text-[#001F3F] high-contrast:text-white"
              >
                Help Me Navigate
              </h2>
              <p className="text-xs text-slate-600 high-contrast:text-slate-300">
                Choose a destination, speak a command, or press Escape to close.
              </p>
            </div>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close navigation helper"
            className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-100 high-contrast:border-white high-contrast:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Voice Command Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 high-contrast:border-white high-contrast:bg-neutral-950">
          <div className="text-xs text-slate-700 high-contrast:text-slate-200">
            <span className="font-semibold text-[#001F3F] high-contrast:text-yellow-300">
              Voice Navigation:
            </span>{' '}
            {voiceFeedback ||
              (speechSupport.recognitionSupported
                ? 'Click to say a page name (Dashboard, Find Jobs, Apply, Verify, Review).'
                : 'Speech recognition unavailable in this browser—use the large buttons or Alt shortcuts below.')}
          </div>
          <button
            type="button"
            onClick={handleToggleVoiceCommand}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
              isListening
                ? 'bg-red-700 text-white'
                : 'bg-[#001F3F] text-white hover:bg-[#003366] high-contrast:bg-yellow-300 high-contrast:text-black'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="h-3.5 w-3.5" aria-hidden="true" />
                Stop Voice Command
              </>
            ) : (
              <>
                <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                Speak Destination
              </>
            )}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {DESTINATIONS.map((dest) => (
            <button
              key={dest.view}
              type="button"
              onClick={() => {
                onNavigate(dest.view);
                onSpeakText(`Opened ${dest.label}`);
                onClose();
              }}
              className="flex flex-col justify-between rounded-lg border-2 border-slate-200 bg-white p-4 text-left hover:border-[#007BFF] hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:hover:border-yellow-300"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-sm font-bold text-[#001F3F] high-contrast:text-white">
                  {dest.label}
                </span>
                <span className="font-mono text-xs text-slate-500 high-contrast:text-yellow-300">
                  {dest.shortcut}
                </span>
              </div>
              <span className="mt-1 text-xs text-slate-600 high-contrast:text-slate-300">
                {dest.detail}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 high-contrast:border-slate-700 high-contrast:bg-neutral-950 high-contrast:text-slate-200">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 shrink-0 text-[#0056B3] high-contrast:text-cyan-300" aria-hidden="true" />
            <span>Tab moves forward · Shift+Tab moves back · Alt+1–7 jumps directly.</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenStartupSetup();
            }}
            className="inline-flex items-center gap-1.5 font-semibold text-[#0056B3] hover:underline high-contrast:text-cyan-300"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            Change Navigation Style
          </button>
        </div>
      </div>
    </div>
  );
};
