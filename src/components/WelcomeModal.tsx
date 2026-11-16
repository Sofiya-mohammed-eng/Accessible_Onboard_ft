import React, { useEffect, useRef } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { PreferredLanguage } from '../types/accessbridge';

interface WelcomeModalProps {
  language: PreferredLanguage;
  onContinue: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ language, onContinue }) => {
  const continueRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    continueRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        continueRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const amharic = language === 'am';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      aria-describedby="welcome-description"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0e2a4a]/45 p-4 backdrop-blur-md"
    >
      <div className="w-full max-w-sm rounded-3xl border border-white/80 bg-white/95 p-6 text-center shadow-[0_30px_70px_-30px_rgba(26,115,232,0.6)] high-contrast:border-yellow-300 high-contrast:bg-black">
        <Sparkles className="mx-auto h-8 w-8 text-[#1a73e8] high-contrast:text-yellow-300" aria-hidden="true" />
        <h1 id="welcome-title" className="mt-3 font-display text-2xl font-bold text-[#001F3F] high-contrast:text-white">
          {amharic ? 'ወደ AllWays እንኳን በደህና መጡ' : 'Welcome to AllWays'}
        </h1>
        <p id="welcome-description" className="mt-2 text-sm leading-relaxed text-slate-600 high-contrast:text-slate-300">
          {amharic
            ? 'ሥራ ለመፈለግ እና ለማመልከት ተደራሽ ድጋፍ።'
            : 'Accessible support for finding work and completing applications.'}
        </p>
        <button
          ref={continueRef}
          type="button"
          onClick={onContinue}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1a73e8] px-5 py-3 text-sm font-semibold text-white high-contrast:bg-yellow-300 high-contrast:text-black"
        >
          {amharic ? 'ቀጥል' : 'Continue'}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
