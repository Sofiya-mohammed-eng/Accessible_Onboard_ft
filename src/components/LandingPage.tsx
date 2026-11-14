import React from 'react';
import { ArrowRight, CheckCircle2, Eye, Hand, Ear, Brain, ShieldCheck, Globe } from 'lucide-react';
import { getLocalizedCopy } from '../engines/i18n';
import { NavigationView, PreferredLanguage } from '../types/accessbridge';
import heroWorkspaceImg from '../assets/images/hero_accessible_workspace_1794648069172.jpg';

interface LandingPageProps {
  onNavigate: (view: NavigationView) => void;
  hasCompletedOnboarding: boolean;
  language: PreferredLanguage;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  hasCompletedOnboarding,
  language,
}) => {
  const copy = getLocalizedCopy(language);

  return (
    <div className="bg-white high-contrast:bg-black">
      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch">
          <div className="flex flex-col justify-center lg:col-span-6">
            <p className="text-sm font-semibold text-[#0056B3] high-contrast:text-cyan-300">
              Open-Source Accessibility Companion
            </p>
            <h1
              className="mt-3 font-display font-bold tracking-tight text-[#001F3F] high-contrast:text-white"
              style={{ fontSize: 'clamp(2.25rem, 4vw, 3.35rem)', lineHeight: 1.12, textWrap: 'balance' }}
            >
              {copy.heroHeadline}
            </h1>
            <p className="mt-5 text-lg font-medium text-slate-700 high-contrast:text-slate-200">
              {copy.heroSubheading}
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 high-contrast:text-slate-300">
              AccessBridge is an accessibility layer that works alongside international employment
              platforms such as Upwork, Fiverr, LinkedIn, Indeed, and Freelancer—helping people with
              disabilities navigate pages, prepare applications, and verify every entered value
              before submitting.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('onboarding')}
                className="inline-flex items-center gap-2.5 rounded-lg bg-[#001F3F] px-7 py-4 text-base font-semibold text-white hover:bg-[#003366] transition-colors high-contrast:bg-yellow-300 high-contrast:text-black"
              >
                {copy.navGetStarted}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate(hasCompletedOnboarding ? 'dashboard' : 'verify')}
                className="inline-flex items-center gap-2 rounded-lg border-2 border-[#001F3F] bg-white px-6 py-3.5 text-base font-semibold text-[#001F3F] hover:bg-slate-50 transition-colors high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              >
                {hasCompletedOnboarding ? 'Open Dashboard' : 'Try Verification Engine'}
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-slate-600 high-contrast:text-slate-300">
              <span>Not a job marketplace</span>
              <span aria-hidden="true">·</span>
              <span>Local-first privacy</span>
              <span aria-hidden="true">·</span>
              <span>Zero-cost operation</span>
              <span aria-hidden="true">·</span>
              <span>WCAG 2.2 AA target</span>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[300px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 high-contrast:border-white high-contrast:bg-neutral-900">
              <img
                src={heroWorkspaceImg}
                alt="Person working independently at a sunlit desk with a laptop displaying structured web forms, an ergonomic mechanical keyboard, and a refreshable braille display."
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Product Explanation & How It Works */}
      <section className="border-t border-slate-200 bg-slate-50 py-14 high-contrast:border-white high-contrast:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="font-display text-2xl font-bold text-[#001F3F] sm:text-3xl high-contrast:text-white">
              How AccessBridge Works Alongside Existing Platforms
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600 high-contrast:text-slate-300">
              Employment portals often hide critical inputs inside cluttered layouts, tiny numeric
              fields, or unlabeled modals. AccessBridge adds an independent, user-controlled workflow
              so mistakes are caught before you press submit.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-white p-6 high-contrast:border-white high-contrast:bg-black">
              <p className="text-sm font-semibold text-[#0056B3] high-contrast:text-cyan-300">
                01. Configure Your Preferences
              </p>
              <h3 className="mt-2 font-display text-xl font-semibold text-[#001F3F] high-contrast:text-white">
                Combine Multiple Needs
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 high-contrast:text-slate-300">
                Mix screen-reader labels, high contrast, visual captions, keyboard or switch
                controls, simplified instructions, and voice dictation—saved strictly in your
                browser.
              </p>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-6 high-contrast:border-white high-contrast:bg-black">
              <p className="text-sm font-semibold text-[#0056B3] high-contrast:text-cyan-300">
                02. Inspect & Prepare
              </p>
              <h3 className="mt-2 font-display text-xl font-semibold text-[#001F3F] high-contrast:text-white">
                Understand Every Form Field
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 high-contrast:text-slate-300">
                Explore page headings, labels, missing alt text, and job requirements in plain
                language. Prepare cover letters and screening answers with voice or text input.
              </p>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-6 high-contrast:border-white high-contrast:bg-black">
              <p className="text-sm font-semibold text-[#15803D] high-contrast:text-green-400">
                03. Verify Before Submitting
              </p>
              <h3 className="mt-2 font-display text-xl font-semibold text-[#001F3F] high-contrast:text-white">
                Catch Mismatches Deterministically
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 high-contrast:text-slate-300">
                Compare your intended hourly rate, availability, and links against actual entered
                values. If you intended $25/hr and typed $250/hr, AccessBridge stops and alerts you.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Supported Accessibility Capabilities */}
      <section className="border-t border-slate-200 bg-white py-14 high-contrast:border-white high-contrast:bg-black">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold text-[#001F3F] sm:text-3xl high-contrast:text-white">
              Built for Diverse, Overlapping Accessibility Requirements
            </h2>
            <p className="mt-3 text-base text-slate-600 high-contrast:text-slate-300">
              No two people share identical access needs. Every setting can be enabled independently
              or combined.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 p-5 high-contrast:border-white">
              <Eye className="h-6 w-6 text-[#0056B3] high-contrast:text-cyan-300" aria-hidden="true" />
              <h3 className="mt-3 font-display text-lg font-semibold text-[#001F3F] high-contrast:text-white">
                Visual & Deafblind
              </h3>
              <p className="mt-2 text-sm text-slate-600 high-contrast:text-slate-300">
                Semantic landmarks for braille displays and screen readers, high-contrast theme,
                magnification, and scalable typography.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-5 high-contrast:border-white">
              <Ear className="h-6 w-6 text-[#0056B3] high-contrast:text-cyan-300" aria-hidden="true" />
              <h3 className="mt-3 font-display text-lg font-semibold text-[#001F3F] high-contrast:text-white">
                Auditory Support
              </h3>
              <p className="mt-2 text-sm text-slate-600 high-contrast:text-slate-300">
                Text-based alerts, live visual captions mirroring spoken feedback, and zero audio-only
                signals.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-5 high-contrast:border-white">
              <Hand className="h-6 w-6 text-[#0056B3] high-contrast:text-cyan-300" aria-hidden="true" />
              <h3 className="mt-3 font-display text-lg font-semibold text-[#001F3F] high-contrast:text-white">
                Motor & Arm Injuries
              </h3>
              <p className="mt-2 text-sm text-slate-600 high-contrast:text-slate-300">
                Full keyboard navigation, large 44px+ controls, reduced-click flows, switch
                compatibility, and optional speech dictation.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-5 high-contrast:border-white">
              <Brain className="h-6 w-6 text-[#0056B3] high-contrast:text-cyan-300" aria-hidden="true" />
              <h3 className="mt-3 font-display text-lg font-semibold text-[#001F3F] high-contrast:text-white">
                Cognitive & Speech
              </h3>
              <p className="mt-2 text-sm text-slate-600 high-contrast:text-slate-300">
                Plain-language step-by-step guidance, reduced clutter, quick-phrase builders, and
                full text alternatives when speech is unavailable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Browser Extension Vision & Open-Source Commitment */}
      <section className="border-t border-slate-200 bg-slate-50 py-14 high-contrast:border-white high-contrast:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-7 high-contrast:border-white high-contrast:bg-black">
              <div className="flex items-center gap-2.5 text-[#001F3F] high-contrast:text-yellow-300">
                <Globe className="h-5 w-5" aria-hidden="true" />
                <h2 className="font-display text-xl font-bold">
                  Browser Extension & JavaScript SDK Vision
                </h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 high-contrast:text-slate-300">
                Standard web apps respect browser Same-Origin security and cannot inspect external
                tabs directly. AccessBridge separates its page understanding and deterministic
                verification engines into reusable TypeScript modules ready for a Manifest V3 Chrome
                Extension and optional site SDK.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700 high-contrast:text-slate-200">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#15803D] high-contrast:text-green-400" aria-hidden="true" />
                  <span>Inspect active platform DOM elements with explicit user permission</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#15803D] high-contrast:text-green-400" aria-hidden="true" />
                  <span>Compare live form inputs against your local intended application values</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#15803D] high-contrast:text-green-400" aria-hidden="true" />
                  <span>Never auto-submit applications without explicit user confirmation</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-7 high-contrast:border-white high-contrast:bg-black">
              <div className="flex items-center gap-2.5 text-[#001F3F] high-contrast:text-yellow-300">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                <h2 className="font-display text-xl font-bold">
                  Open-Source, Private & Zero-Cost Commitment
                </h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 high-contrast:text-slate-300">
                Accessibility tools should never be locked behind subscriptions or paid API keys. All
                core validation, local preference storage, speech synthesis, and job breakdown tools
                operate locally in your browser.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('onboarding')}
                  className="rounded-lg bg-[#001F3F] px-5 py-3 text-sm font-semibold text-white hover:bg-[#003366] transition-colors high-contrast:bg-yellow-300 high-contrast:text-black"
                >
                  Configure Accessibility Profile
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('scanner')}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#001F3F] hover:bg-slate-50 transition-colors high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
                >
                  Explore Page Understanding Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
