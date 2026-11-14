import React from 'react';
import { Briefcase, Check, Mic, Shield, Volume2 } from 'lucide-react';
import { NavigationView } from '../types/accessbridge';

interface DashboardViewProps {
  onNavigate: (view: NavigationView) => void;
}

const features = [
  { label: 'Read-aloud', icon: Volume2 },
  { label: 'Voice answers', icon: Mic },
  { label: 'Private preferences', icon: Shield },
];

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  return (
    <section className="relative isolate overflow-hidden bg-[#f4f7f2] high-contrast:bg-black">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 high-contrast:hidden"
      >
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#d7efe4] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#e7f3ea] blur-3xl" />
        <div className="absolute left-1/2 top-0 h-px w-[70%] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#c5ddd0] to-transparent" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-8.5rem)] max-w-7xl items-center gap-14 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:py-16">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#1c6b45] high-contrast:text-yellow-300">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-[#d5e6dc] high-contrast:bg-black high-contrast:ring-yellow-300">
              <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            Accessible Career Pathway
          </p>

          <h1
            className="mt-6 font-display font-bold tracking-[-0.035em] text-[#14281f] high-contrast:text-white"
            style={{ fontSize: 'clamp(2.7rem, 5.4vw, 4.6rem)', lineHeight: 0.98, textWrap: 'balance' }}
          >
            Find work that
            <br />
            works for you.
          </h1>

          <p className="mt-6 max-w-md text-lg leading-relaxed text-[#4a6356] high-contrast:text-slate-200">
            Explore jobs, understand available workplace arrangements, and apply with accessible
            forms.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('jobs')}
              className="inline-flex items-center rounded-xl bg-[#157347] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(21,115,71,0.9)] transition hover:-translate-y-0.5 hover:bg-[#115c39] high-contrast:bg-yellow-300 high-contrast:text-black high-contrast:hover:bg-yellow-200"
            >
              Browse opportunities
            </button>
          </div>

          <div className="mt-10 border-t border-[#e1e8e2] pt-6 high-contrast:border-white/30">
            <ul className="flex flex-wrap items-center gap-x-7 gap-y-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <li
                    key={feature.label}
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#3e564a] high-contrast:text-slate-200"
                  >
                    <Icon className="h-4 w-4 text-[#1c6b45] high-contrast:text-yellow-300" aria-hidden="true" />
                    {feature.label}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[540px]" aria-hidden="true">
          <div className="absolute inset-[4%] rounded-full bg-[radial-gradient(circle_at_40%_35%,#eef8f3_0%,#d5ebe1_55%,#c5e2d4_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65)] high-contrast:bg-neutral-900 high-contrast:shadow-none high-contrast:ring-2 high-contrast:ring-yellow-300" />
          <div className="absolute inset-[16%] rounded-full border border-dashed border-[#8fbfa8]/80 high-contrast:border-yellow-300" />
          <div className="absolute inset-[27%] rounded-full border border-[#ffffff]/70 high-contrast:border-white/20" />

          <div className="career-card-a absolute left-[6%] top-[11%] w-[58%] rounded-[1.4rem] bg-white p-5 shadow-[0_30px_60px_-28px_rgba(20,60,42,0.45),0_8px_20px_-12px_rgba(20,60,42,0.25)] ring-1 ring-[#edf2ee] high-contrast:bg-black high-contrast:ring-yellow-300">
            <Briefcase className="h-5 w-5 text-[#1c6b45] high-contrast:text-yellow-300" />
            <div className="mt-5 h-2.5 w-[78%] rounded-full bg-[#e4ebe6]" />
            <div className="mt-2.5 h-2.5 w-[52%] rounded-full bg-[#eef3f0]" />
          </div>

          <div className="career-card-b absolute bottom-[9%] right-[4%] w-[58%] rounded-[1.4rem] bg-white p-5 shadow-[0_30px_60px_-28px_rgba(20,60,42,0.4),0_8px_20px_-12px_rgba(20,60,42,0.22)] ring-1 ring-[#edf2ee] high-contrast:bg-black high-contrast:ring-yellow-300">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#157347] text-white shadow-[0_8px_16px_-8px_rgba(21,115,71,0.9)] high-contrast:bg-yellow-300 high-contrast:text-black">
              <Check className="h-4 w-4" strokeWidth={3} />
            </span>
            <div className="mt-5 h-2.5 w-[78%] rounded-full bg-[#e4ebe6]" />
            <div className="mt-2.5 h-2.5 w-[46%] rounded-full bg-[#eef3f0]" />
          </div>
        </div>
      </div>
    </section>
  );
};
