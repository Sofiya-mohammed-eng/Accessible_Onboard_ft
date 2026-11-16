import React, { useEffect, useState } from 'react';
import { speakAloud } from '../engines/accessibilityEngine';
import { WELCOME_CONTINUE, WELCOME_LOADING, WELCOME_TITLE, welcomeFallsBackMs } from '../engines/startupFlow';

type Phase = 'loading' | 'welcome';

function motionIsReduced(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.classList.contains('reduced-motion')
  );
}

export function StartupIntro({ onFinished }: { onFinished: () => void }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const reducedMotion = motionIsReduced();
  const loadingMs = welcomeFallsBackMs('loading', reducedMotion);

  useEffect(() => {
    const timer = window.setTimeout(() => setPhase('welcome'), loadingMs);
    return () => window.clearTimeout(timer);
  }, [loadingMs]);

  useEffect(() => {
    if (phase !== 'welcome') return;
    speakAloud(WELCOME_TITLE, { lang: 'en-US', rate: 0.92 });
    const timer = window.setTimeout(onFinished, welcomeFallsBackMs('welcome', motionIsReduced()));
    return () => window.clearTimeout(timer);
  }, [phase, onFinished]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#071426]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(26,115,232,0.45), transparent 46%), radial-gradient(circle at 80% 80%, rgba(18,89,184,0.28), transparent 32%)',
        }}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="startup-welcome-title"
        aria-label="Welcome"
        className="relative w-[min(92vw,460px)] overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
        style={{ animation: 'allways-window-in 0.55s ease both' }}
      >
        <div className="bg-[#0e2a4a] px-4 py-3 text-white">
          <span className="text-sm font-semibold tracking-wide">AllWays</span>
        </div>

        {phase === 'loading' ? (
          <div className="flex flex-col items-center px-8 pb-4 pt-12">
            <div className="relative h-24 w-24" aria-hidden="true">
              {Array.from({ length: 8 }, (_, index) => {
                const angle = (index / 8) * Math.PI * 2 - Math.PI / 2;
                const x = Math.cos(angle) * 34;
                const y = Math.sin(angle) * 34;
                return (
                  <span
                    key={index}
                    className="absolute left-1/2 top-1/2 h-3.5 w-3.5"
                    style={{ marginLeft: -7, marginTop: -7, transform: `translate(${x}px, ${y}px)` }}
                  >
                    <span
                      className="block h-full w-full rounded-full bg-[#1a73e8]"
                      style={{
                        animation: reducedMotion ? undefined : 'allways-dot 1.05s ease-in-out infinite',
                        animationDelay: `${index * 0.13}s`,
                      }}
                    />
                  </span>
                );
              })}
            </div>
            <p id="startup-welcome-title" className="mt-8 text-lg font-semibold text-[#0e2a4a]">{WELCOME_LOADING}</p>
            <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-[#d5e6f7]">
              <div
                className="h-full rounded-full bg-[#1a73e8]"
                style={{ animation: reducedMotion ? undefined : `allways-bar ${loadingMs}ms ease-out forwards`, width: reducedMotion ? '100%' : undefined }}
              />
            </div>
          </div>
        ) : (
          <div className="px-8 pb-4 pt-14 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#1a73e8]">AllWays</p>
            <h1 id="startup-welcome-title" className="mt-3 text-4xl font-semibold tracking-tight text-[#0e2a4a]">
              {WELCOME_TITLE}
            </h1>
          </div>
        )}
        <div className="flex justify-end px-8 pb-8">
          <button
            type="button"
            onClick={onFinished}
            className="rounded-full bg-[#1a73e8] px-6 py-3 text-sm font-semibold text-white"
          >
            {WELCOME_CONTINUE}
          </button>
        </div>
      </section>
    </div>
  );
}
