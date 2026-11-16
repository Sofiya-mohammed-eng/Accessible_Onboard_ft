import React from 'react';
import { Mic, Square, Volume2, VolumeX } from 'lucide-react';
import type { GuidanceMode, PreferredLanguage } from '../types/accessbridge';

export type AssistantState = 'speaking' | 'listening' | 'off';

interface AssistantStatusPillProps {
  state: AssistantState;
  mode: GuidanceMode;
  language: PreferredLanguage;
  visible: boolean;
  onStop: () => void;
  onTurnOn: () => void;
}

const LABELS = {
  speaking: { en: 'Speaking', am: 'በመናገር ላይ' },
  listening: { en: 'Listening', am: 'በማዳመጥ ላይ' },
  off: { en: 'Off', am: 'ጠፍቷል' },
} as const;

/**
 * The single, always-available control for the invisible background
 * facilitator. It reports whether the assistant is Speaking, Listening, or Off
 * and offers one 44px "Stop / አቁም" action (also bound to the Escape key) that
 * immediately silences all speech and microphone listening.
 */
export const AssistantStatusPill: React.FC<AssistantStatusPillProps> = ({
  state,
  mode,
  language,
  visible,
  onStop,
  onTurnOn,
}) => {
  if (!visible) return null;

  const amharic = language === 'am';
  const label = LABELS[state][amharic ? 'am' : 'en'];
  const isOff = state === 'off';

  const dotClass = isOff
    ? 'bg-slate-400'
    : state === 'speaking'
      ? 'bg-[#1a73e8] animate-pulse'
      : 'bg-emerald-500 animate-pulse';

  return (
    <div
      className="fixed bottom-4 right-4 z-[95] flex items-center gap-2 rounded-full border border-[#d5e6f7] bg-white/95 px-3 py-2 shadow-[0_18px_45px_-20px_rgba(26,115,232,0.7)] backdrop-blur high-contrast:border-yellow-300 high-contrast:bg-black"
      role="group"
      aria-label={amharic ? 'የጀርባ ረዳት ሁኔታ' : 'Background assistant status'}
    >
      <span className="flex items-center gap-2 px-1" role="status" aria-live="polite" aria-atomic="true">
        <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} aria-hidden="true" />
        {mode === 'voice' ? (
          state === 'listening' ? (
            <Mic className="h-4 w-4 text-[#0056B3] high-contrast:text-cyan-300" aria-hidden="true" />
          ) : (
            <Volume2 className="h-4 w-4 text-[#0056B3] high-contrast:text-cyan-300" aria-hidden="true" />
          )
        ) : (
          <VolumeX className="h-4 w-4 text-slate-500 high-contrast:text-slate-300" aria-hidden="true" />
        )}
        <span className="text-xs font-semibold text-[#0e2a4a] high-contrast:text-white">{label}</span>
      </span>
      {isOff ? (
        <button
          type="button"
          onClick={onTurnOn}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#1a73e8] px-3 text-xs font-bold text-white hover:bg-[#0d4f9e] high-contrast:bg-yellow-300 high-contrast:text-black"
        >
          <Volume2 className="h-4 w-4" aria-hidden="true" />
          {amharic ? 'አብራ' : 'Turn on'}
        </button>
      ) : (
        <button
          type="button"
          onClick={onStop}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#0e2a4a] px-3 text-xs font-bold text-white hover:bg-[#001F3F] high-contrast:bg-yellow-300 high-contrast:text-black"
        >
          <Square className="h-3.5 w-3.5" aria-hidden="true" />
          {amharic ? 'አቁም' : 'Stop'}
        </button>
      )}
    </div>
  );
};
