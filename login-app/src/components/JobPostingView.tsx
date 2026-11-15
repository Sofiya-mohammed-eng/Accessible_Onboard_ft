import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { getPageCopy } from '../engines/pageCopy';
import { PreferredLanguage } from '../types/accessbridge';

type Availability = 'Available' | 'Not specified' | 'Not available';

interface AccessRow {
  label: string;
  status: Availability;
}

interface AccessGroup {
  title: string;
  rows: AccessRow[];
}

interface JobPostingViewProps {
  jobId: string;
  title: string;
  organization: string;
  location: string;
  schedule: string;
  level: string;
  summary: string;
  supports: string[];
  skills: string[];
  applyBy: string;
  language: PreferredLanguage;
  onBack: () => void;
  onApply: () => void;
}

const CUSTOMER_SUPPORT = {
  category: 'Customer service',
  title: 'Customer Support Associate',
  subtitle: 'Selam Digital Services · Addis Ababa · Hybrid',
  tags: ['Full-time', 'Entry level', 'ETB 18,000–24,000 monthly'],
  about:
    'Help customers by phone, email, and live chat using clear support guides. You will work with a supportive team and receive clear onboarding.',
  duties: [
    'Respond to customer questions using phone, email, and chat.',
    'Keep clear notes and follow simple support guides.',
    'Work with colleagues to solve customer issues.',
  ],
  needs: [
    'Clear written or spoken communication.',
    'Basic digital skills and willingness to learn.',
    'No previous customer service experience is required.',
  ],
  groups: [
    {
      title: 'Digital accessibility',
      rows: [
        { label: 'Screen-reader-compatible work tools', status: 'Available' },
        { label: 'Keyboard-accessible software', status: 'Available' },
        { label: 'Accessible digital documents', status: 'Available' },
        { label: 'Captioned video meetings', status: 'Not specified' },
      ],
    },
    {
      title: 'Physical accessibility',
      rows: [
        { label: 'Step-free building access', status: 'Available' },
        { label: 'Accessible restrooms', status: 'Not specified' },
        { label: 'Accessible parking information', status: 'Not available' },
      ],
    },
    {
      title: 'Communication accessibility',
      rows: [
        { label: 'Written interview instructions', status: 'Available' },
        { label: 'Alternative communication methods', status: 'Available' },
        { label: 'Interpretation arrangements', status: 'Not specified' },
      ],
    },
    {
      title: 'Work arrangements',
      rows: [
        { label: 'Remote work', status: 'Not available' },
        { label: 'Hybrid work', status: 'Available' },
        { label: 'Flexible working hours', status: 'Available' },
      ],
    },
  ] satisfies AccessGroup[],
  deadline: '18 June 2025',
  deadlineTime: '11:59 PM East Africa Time',
};

export const JobPostingView: React.FC<JobPostingViewProps> = ({
  jobId,
  title,
  organization,
  location,
  schedule,
  level,
  summary,
  supports,
  skills,
  applyBy,
  language,
  onBack,
  onApply,
}) => {
  const page = getPageCopy(language);
  const posting =
    jobId === 'customer-support-associate'
      ? CUSTOMER_SUPPORT
      : {
          category: 'Career opportunity',
          title,
          subtitle: `${organization} · ${location}`,
          tags: [schedule, level],
          about: summary,
          duties: supports,
          needs: skills,
          groups: [
            {
              title: 'Work arrangements',
              rows: supports.map((label) => ({ label, status: 'Available' as const })),
            },
          ],
          deadline: applyBy,
          deadlineTime: '11:59 PM East Africa Time',
        };

  const [activeTab, setActiveTab] = useState<'about' | 'requirements' | 'accessibility'>('about');
  const [note, setNote] = useState('');

  const showSection = (tab: 'about' | 'requirements' | 'accessibility') => {
    setActiveTab(tab);
    document.getElementById(tab)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="bg-[#f3f8ff] high-contrast:bg-black">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1a73e8] hover:underline high-contrast:text-yellow-300"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to opportunities
        </button>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#1565c0] high-contrast:text-yellow-300">
              {posting.category}
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.03em] text-[#0e2a4a] high-contrast:text-white sm:text-5xl">
              {posting.title}
            </h1>
            <p className="mt-3 text-base text-[#4d6786] high-contrast:text-slate-200">{posting.subtitle}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {posting.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-md bg-[#eef2ef] px-2.5 py-1 text-xs font-medium text-[#3e5c7a] high-contrast:bg-black high-contrast:text-white high-contrast:ring-1 high-contrast:ring-white"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </div>
          <div className="text-left sm:text-right">
            <button
              type="button"
              data-voice-apply={title}
              onClick={onApply}
              className="rounded-xl bg-[#1a73e8] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(26,115,232,0.9)] hover:bg-[#1259b8] high-contrast:bg-yellow-300 high-contrast:text-black"
            >
              {page.applyNow}
            </button>
            <p className="mt-2 text-xs text-[#6d7f74] high-contrast:text-slate-300">
              {page.signInThen}
            </p>
          </div>
        </div>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <div className="flex gap-6 border-b border-[#dce5df] high-contrast:border-white/30" role="tablist" aria-label="Job posting sections">
              {(
                [
                  ['about', 'About the role'],
                  ['requirements', 'Requirements'],
                  ['accessibility', 'Accessibility'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === id}
                  onClick={() => showSection(id)}
                  className={`-mb-px border-b-2 pb-3 text-sm font-semibold ${
                    activeTab === id
                      ? 'border-[#1a73e8] text-[#1a73e8] high-contrast:border-yellow-300 high-contrast:text-yellow-300'
                      : 'border-transparent text-[#4d6786] hover:text-[#0e2a4a] high-contrast:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <section id="about" className="scroll-mt-24 pt-8">
              <h2 className="font-display text-2xl font-bold text-[#0e2a4a] high-contrast:text-white">About the role</h2>
              <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#3e5c7a] high-contrast:text-slate-200">
                {posting.about}
              </p>
              <h3 className="mt-8 font-display text-xl font-bold text-[#0e2a4a] high-contrast:text-white">What you will do</h3>
              <ul className="mt-3 max-w-3xl space-y-3 text-base leading-relaxed text-[#3e5c7a] high-contrast:text-slate-200">
                {posting.duties.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section id="requirements" className="scroll-mt-24 pt-8">
              <h2 className="font-display text-xl font-bold text-[#0e2a4a] high-contrast:text-white">What you need</h2>
              <ul className="mt-3 max-w-3xl space-y-3 text-base leading-relaxed text-[#3e5c7a] high-contrast:text-slate-200">
                {posting.needs.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section id="accessibility" className="scroll-mt-24 pt-10">
              <h2 className="font-display text-2xl font-bold text-[#0e2a4a] high-contrast:text-white">
                Workplace accessibility
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#5a7390] high-contrast:text-slate-300">
                This information was provided by the employer. OpenPath has not independently verified it.
              </p>
              <div className="mt-6 max-w-3xl space-y-8">
                {posting.groups.map((group) => (
                  <div key={group.title}>
                    <h3 className="font-display text-lg font-bold text-[#0e2a4a] high-contrast:text-white">{group.title}</h3>
                    <dl className="mt-3 divide-y divide-[#e4eef8] high-contrast:divide-white/20">
                      {group.rows.map((row) => (
                        <div key={row.label} className="flex items-center justify-between gap-4 py-3">
                          <dt className="text-sm text-[#2c4a6e] high-contrast:text-slate-200">{row.label}</dt>
                          <dd>
                            <StatusValue status={row.status} />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setNote('Your question is saved on this device. Nothing is sent to the employer from this browser.')
                }
                className="mt-2 text-sm font-semibold text-[#1a73e8] underline decoration-[#1a73e8]/40 underline-offset-4 high-contrast:text-yellow-300"
              >
                Ask about an arrangement
              </button>
              {note && (
                <p role="status" className="mt-3 max-w-xl text-sm text-[#2c4a6e] high-contrast:text-slate-200">
                  {note}
                </p>
              )}
            </section>
          </div>

          <aside className="rounded-2xl border border-[#e4eef8] bg-white p-5 shadow-[0_16px_40px_-32px_rgba(26,115,232,0.7)] high-contrast:border-white high-contrast:bg-black lg:sticky lg:top-24">
            <p className="text-xs text-[#6d7f74] high-contrast:text-slate-300">Application deadline</p>
            <p className="mt-2 font-display text-xl font-bold text-[#0e2a4a] high-contrast:text-white">{posting.deadline}</p>
            <p className="mt-1 text-sm text-[#5a7390] high-contrast:text-slate-300">{posting.deadlineTime}</p>
            <button
              type="button"
              data-voice-apply={title}
              onClick={onApply}
              className="mt-5 w-full rounded-xl border border-[#d0e3f5] bg-white px-4 py-3 text-sm font-semibold text-[#1a73e8] hover:border-[#1a73e8] high-contrast:border-yellow-300 high-contrast:bg-black high-contrast:text-yellow-300"
            >
              {page.applyNow}
            </button>
            <button
              type="button"
              onClick={() =>
                setNote('Your accessibility question is saved on this device. Nothing is sent to the employer from this browser.')
              }
              className="mt-4 w-full text-center text-sm font-semibold text-[#1a73e8] underline decoration-[#1a73e8]/40 underline-offset-4 high-contrast:text-yellow-300"
            >
              Contact employer about accessibility
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
};

function StatusValue({ status }: { status: Availability }) {
  const tone =
    status === 'Available'
      ? 'text-[#1a73e8] high-contrast:text-green-300'
      : status === 'Not available'
        ? 'text-[#8d4a45] high-contrast:text-red-300'
        : 'text-[#7b8c82] high-contrast:text-slate-300';
  return <span className={`text-sm font-semibold ${tone}`}>{status}</span>;
}
