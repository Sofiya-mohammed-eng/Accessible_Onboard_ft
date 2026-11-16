import React, { useEffect, useMemo, useState } from 'react';
import { Check, LoaderCircle, Search, Shield, Sparkles } from 'lucide-react';
import { parseJobSearchQueryLocally } from '../engines/ollamaService';
import { getPageCopy } from '../engines/pageCopy';
import { JobListing, NavigationView, PreferredLanguage } from '../types/accessbridge';
import { JobPostingView } from './JobPostingView';
import { LoginToApply } from './LoginToApply';
import { VoiceInputButton } from './VoiceInputButton';

interface JobDiscoveryViewProps {
  onSelectJobForApplication: (job: JobListing) => void;
  onSpeakText: (text: string) => void;
  simplifiedInstructions: boolean;
  onNavigate: (view: NavigationView) => void;
  onOpenPreferences: () => void;
  language: PreferredLanguage;
  voiceInputEnabled?: boolean;
}

type Schedule = 'Full-time' | 'Part-time';
type Workplace = 'Remote' | 'Hybrid' | 'On-site';
type AccessFeature = 'Accessible digital tools' | 'Physical access' | 'Accessible interview';

interface Opportunity {
  id: string;
  mark: string;
  title: string;
  organization: string;
  location: string;
  workplace: Workplace;
  schedule: Schedule;
  level: string;
  summary: string;
  supports: string[];
  applyBy: string;
  match: string;
  access: AccessFeature[];
  skills: string[];
}

const OPPORTUNITIES: Opportunity[] = [
  {
    id: 'customer-support-associate',
    mark: 'S',
    title: 'Customer Support Associate',
    organization: 'Selam Digital Services',
    location: 'Addis Ababa · Hybrid',
    workplace: 'Hybrid',
    schedule: 'Full-time',
    level: 'Entry level',
    summary: 'Help customers by phone, email, and live chat using clear support guides.',
    supports: ['Hybrid work', 'Flexible hours', 'Screen-reader tools'],
    applyBy: '18 June 2025',
    match: 'Strong match',
    access: ['Accessible digital tools'],
    skills: ['Customer support', 'Live chat', 'Email'],
  },
  {
    id: 'junior-data-assistant',
    mark: 'J',
    title: 'Junior Data Assistant',
    organization: 'Blue Nile Analytics',
    location: 'Addis Ababa · Remote',
    workplace: 'Remote',
    schedule: 'Part-time',
    level: 'Entry level',
    summary: 'Check figures, tidy spreadsheets, and summarize results in plain language.',
    supports: ['Remote work', 'Flexible hours', 'Accessible interview'],
    applyBy: '9 July 2025',
    match: 'Strong match',
    access: ['Accessible interview'],
    skills: ['Spreadsheets', 'Data checking'],
  },
  {
    id: 'reception-coordinator',
    mark: 'R',
    title: 'Reception Coordinator',
    organization: 'Unity Hall',
    location: 'Addis Ababa · On-site',
    workplace: 'On-site',
    schedule: 'Full-time',
    level: 'Entry level',
    summary: 'Greet visitors, schedule appointments, and keep the lobby easy to move through.',
    supports: ['Physical access', 'Flexible hours'],
    applyBy: '25 June 2025',
    match: 'Strong match',
    access: ['Physical access'],
    skills: ['Scheduling', 'Visitor support'],
  },
];

const SCHEDULES: Array<'All' | Schedule> = ['All', 'Full-time', 'Part-time'];
const WORKPLACES: Workplace[] = ['Remote', 'Hybrid', 'On-site'];
const ACCESS_OPTIONS: AccessFeature[] = [
  'Accessible digital tools',
  'Physical access',
  'Accessible interview',
];

function toListing(job: Opportunity): JobListing {
  const arrangement =
    job.workplace === 'Remote'
      ? (['Remote'] as JobListing['arrangement'])
      : job.schedule === 'Part-time'
        ? (['Part-time', 'Flexible hours'] as JobListing['arrangement'])
        : (['Full-time', 'Flexible hours'] as JobListing['arrangement']);

  return {
    id: job.id,
    platform: 'LinkedIn',
    title: job.title,
    employer: job.organization,
    arrangement,
    experienceLevel: 'Entry',
    hourlyRateMin: 25,
    hourlyRateMax: 25,
    paymentType: 'Hourly',
    paymentDisplay: job.level,
    description: job.summary,
    requiredSkills: job.skills,
    applicationRequirements: job.supports,
    screeningQuestions: [
      'Describe how you would use the available workplace arrangements for this role.',
    ],
    isSampleData: true,
    accessibilityNotes: job.supports.join(', '),
  };
}

export const JobDiscoveryView: React.FC<JobDiscoveryViewProps> = ({
  onSelectJobForApplication,
  onNavigate,
  onOpenPreferences,
  language,
  voiceInputEnabled = true,
}) => {
  const page = getPageCopy(language);
  const [schedule, setSchedule] = useState<'All' | Schedule>('All');
  const [workplace, setWorkplace] = useState<Workplace | ''>('');
  const [access, setAccess] = useState<AccessFeature[]>([]);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [isParsingQuery, setIsParsingQuery] = useState(false);
  const [searchNotice, setSearchNotice] = useState('');
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [postingId, setPostingId] = useState<string | null>(null);
  const [loginJob, setLoginJob] = useState<Opportunity | null>(null);

  const results = useMemo(() => {
    const needle = appliedQuery.trim().toLowerCase();
    return OPPORTUNITIES.filter((job) => {
      if (schedule !== 'All' && job.schedule !== schedule) return false;
      if (workplace && job.workplace !== workplace) return false;
      if (access.length > 0 && !access.every((item) => job.access.includes(item))) return false;
      if (!needle) return true;
      const haystack = [
        job.title,
        job.organization,
        job.summary,
        job.location,
        job.level,
        ...job.skills,
        ...job.supports,
      ]
        .join(' ')
        .toLowerCase();
      return (
        haystack.includes(needle) ||
        needle.split(/\s+/).every((term) => haystack.includes(term))
      );
    });
  }, [access, appliedQuery, schedule, workplace]);

  const posting = OPPORTUNITIES.find((job) => job.id === postingId) || null;

  useEffect(() => {
    if (posting) window.scrollTo({ top: 0, behavior: 'auto' });
  }, [posting]);

  if (loginJob) {
    return (
      <LoginToApply
        language={language}
        voiceInputEnabled={voiceInputEnabled}
        jobTitle={loginJob.title}
        employer={loginJob.organization}
        onBack={() => setLoginJob(null)}
        onContinue={() => onSelectJobForApplication(toListing(loginJob))}
      />
    );
  }

  if (posting) {
    return (
      <JobPostingView
        jobId={posting.id}
        title={posting.title}
        organization={posting.organization}
        location={posting.location}
        schedule={posting.schedule}
        level={posting.level}
        summary={posting.summary}
        supports={posting.supports}
        skills={posting.skills}
        applyBy={posting.applyBy}
        language={language}
        onBack={() => setPostingId(null)}
        onApply={() => onSelectJobForApplication(toListing(posting))}
      />
    );
  }

  const clearAll = () => {
    setSchedule('All');
    setWorkplace('');
    setAccess([]);
    setQuery('');
    setAppliedQuery('');
    setOpenJobId(null);
    setSearchNotice('');
  };

  const toggleAccess = (feature: AccessFeature) => {
    setAccess((current) =>
      current.includes(feature) ? current.filter((item) => item !== feature) : [...current, feature]
    );
  };

  const understandSearchLocally = async () => {
    const originalQuery = query.trim();
    if (!originalQuery || isParsingQuery) return;

    setIsParsingQuery(true);
    setSearchNotice(
      language === 'am' ? 'በአካባቢው Ollama የፍለጋ ጥያቄውን በመረዳት ላይ…' : 'Understanding your search locally…'
    );
    try {
      const parsed = await parseJobSearchQueryLocally(originalQuery, { targetLanguage: language });
      setAppliedQuery(parsed.searchText);
      setSearchNotice(
        language === 'am'
          ? `የአካባቢ ፍለጋ ተዘጋጅቷል፦ ${parsed.searchText}`
          : `Local search ready: ${parsed.searchText}`
      );
    } catch (error) {
      setAppliedQuery(originalQuery);
      const detail = error instanceof Error ? error.message : 'Unknown Ollama error.';
      setSearchNotice(
        language === 'am'
          ? `Ollama አልተገናኘም፤ የመጀመሪያውን ጽሑፍ በመጠቀም ፈልግ። ${detail}`
          : `Ollama unavailable; searching the original text instead. ${detail}`
      );
    } finally {
      setIsParsingQuery(false);
    }
  };

  return (
    <div className="bg-transparent high-contrast:bg-black">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:flex-row lg:gap-12 lg:px-8 lg:py-10">
        <aside className="w-full shrink-0 lg:w-56" aria-label="Filter jobs">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-[#0e2a4a] high-contrast:text-white">
              Filter jobs
            </h2>
            <button
              type="button"
              onClick={clearAll}
              aria-label="Clear all job filters"
              className="text-sm font-semibold text-[#1a73e8] underline decoration-[#1a73e8]/40 underline-offset-4 hover:decoration-[#1a73e8] high-contrast:text-yellow-300"
            >
              Clear all
            </button>
          </div>

          <fieldset className="mt-8 border-t border-[#e1edf8] pt-6 high-contrast:border-white/25">
            <legend className="text-sm font-semibold text-[#0e2a4a] high-contrast:text-white">
              Work schedule
            </legend>
            <div className="mt-3 space-y-1">
              {SCHEDULES.map((option) => (
                <FilterRadio
                  key={option}
                  name="work-schedule"
                  label={option}
                  checked={schedule === option}
                  onSelect={() => setSchedule(option)}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-6 border-t border-[#e1edf8] pt-6 high-contrast:border-white/25">
            <legend className="text-sm font-semibold text-[#0e2a4a] high-contrast:text-white">
              Workplace
            </legend>
            <div className="mt-3 space-y-1">
              {WORKPLACES.map((option) => (
                <FilterRadio
                  key={option}
                  name="workplace"
                  label={option}
                  checked={workplace === option}
                  onSelect={() => setWorkplace(option)}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-6 border-t border-[#e1edf8] pt-6 high-contrast:border-white/25">
            <legend className="text-sm font-semibold text-[#0e2a4a] high-contrast:text-white">
              Accessibility
            </legend>
            <div className="mt-3 space-y-1">
              {ACCESS_OPTIONS.map((option) => (
                <FilterCheck
                  key={option}
                  label={option}
                  checked={access.includes(option)}
                  onToggle={() => toggleAccess(option)}
                />
              ))}
            </div>
          </fieldset>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#1565c0] high-contrast:text-yellow-300">
                Career opportunities
              </p>
              <h1 className="mt-2 font-display text-4xl font-bold tracking-[-0.03em] text-[#0e2a4a] high-contrast:text-white sm:text-5xl">
                {page.findJobsTitle}
              </h1>
            </div>
            <button
              type="button"
              onClick={onOpenPreferences}
              className="inline-flex items-center gap-2 rounded-xl border border-[#d0e3f5] bg-white px-4 py-2.5 text-sm font-semibold text-[#0e2a4a] shadow-sm hover:border-[#b7d0ea] high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            >
              <Shield className="h-4 w-4 text-[#1a73e8] high-contrast:text-yellow-300" aria-hidden="true" />
              {page.privateFeature}
            </button>
          </div>

          <form
            className="mt-6 flex items-center gap-2 rounded-2xl border border-[#1565c0] bg-white p-1.5 shadow-[0_10px_30px_-24px_rgba(26,115,232,0.8)] high-contrast:border-yellow-300 high-contrast:bg-black"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              setAppliedQuery(query);
              setSearchNotice('');
            }}
          >
            <Search className="ml-2 h-4 w-4 shrink-0 text-[#7d8f84]" aria-hidden="true" />
            <label htmlFor="opportunity-search" className="sr-only">
              {page.searchPlaceholder}
            </label>
            <input
              id="opportunity-search"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchNotice('');
              }}
              placeholder={page.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm text-[#0e2a4a] placeholder:text-[#8aa093] high-contrast:text-white"
            />
            {voiceInputEnabled && (
              <VoiceInputButton
                language={language}
                className="shrink-0"
                onTranscript={(transcript) => {
                  setQuery(transcript);
                  setSearchNotice('');
                }}
              />
            )}
            <button
              type="submit"
              className="rounded-xl bg-[#1a73e8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1259b8] high-contrast:bg-yellow-300 high-contrast:text-black"
            >
              {page.search}
            </button>
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={understandSearchLocally}
              disabled={!query.trim() || isParsingQuery}
              className="inline-flex items-center gap-2 rounded-xl border border-[#d0e3f5] bg-white px-4 py-2.5 text-sm font-semibold text-[#1a73e8] hover:border-[#1a73e8] disabled:cursor-not-allowed disabled:opacity-60 high-contrast:border-yellow-300 high-contrast:bg-black high-contrast:text-yellow-300"
            >
              {isParsingQuery ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              {language === 'am' ? 'በአካባቢ AI አስተውል' : 'Understand with local AI'}
            </button>
            <p className="text-xs text-[#5a7390] high-contrast:text-slate-300">
              {language === 'am' ? 'ጽሑፉ ከመሣሪያዎ አይወጣም።' : 'Your text stays on your device.'}
            </p>
            <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              {searchNotice}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm text-[#4d6786] high-contrast:text-slate-200">
            <p role="status" aria-live="polite" aria-atomic="true">
              {results.length} {results.length === 1 ? 'opportunity' : 'opportunities'} found
            </p>
            <p>Sorted by: Most relevant</p>
          </div>

          <ul aria-label="Job search results" className="mt-4 space-y-4">
            {results.map((job) => {
              const detailsOpen = openJobId === job.id;
              const detailsId = `${job.id}-details`;
              return (
                <li
                  key={job.id}
                  className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-[0_22px_50px_-28px_rgba(26,115,232,0.45)] backdrop-blur high-contrast:border-white high-contrast:bg-black sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    <span
                      aria-hidden="true"
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e7f3ff] font-display text-lg font-bold text-[#1a73e8] high-contrast:bg-black high-contrast:text-yellow-300 high-contrast:ring-1 high-contrast:ring-yellow-300"
                    >
                      {job.mark}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="font-display text-xl font-bold text-[#0e2a4a] high-contrast:text-white">
                            {job.title}
                          </h2>
                          <p className="mt-0.5 text-sm text-[#5a7390] high-contrast:text-slate-300">
                            {job.organization}
                          </p>
                        </div>
                        <span className="rounded-md bg-[#e7f6ee] px-2.5 py-1 text-xs font-semibold text-[#1a73e8] high-contrast:bg-black high-contrast:text-yellow-300 high-contrast:ring-1 high-contrast:ring-yellow-300">
                          {job.match}
                        </span>
                      </div>

                      <ul className="mt-3 flex flex-wrap gap-2">
                        {[job.location, job.schedule, job.level].map((tag) => (
                          <li
                            key={tag}
                            className="rounded-md bg-[#eaf3fc] px-2.5 py-1 text-xs font-medium text-[#3e5c7a] high-contrast:bg-black high-contrast:text-white high-contrast:ring-1 high-contrast:ring-white"
                          >
                            {tag}
                          </li>
                        ))}
                      </ul>

                      <p className="mt-3 text-sm leading-relaxed text-[#3e5c7a] high-contrast:text-slate-200">
                        {job.summary}
                      </p>

                      <ul className="mt-3 flex flex-wrap gap-2">
                        {job.supports.map((support) => (
                          <li
                            key={support}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#d7e7f8] bg-white px-2.5 py-1 text-xs font-medium text-[#2c4a6e] high-contrast:border-white high-contrast:text-white"
                          >
                            <Check className="h-3.5 w-3.5 text-[#1a73e8] high-contrast:text-yellow-300" aria-hidden="true" />
                            {support}
                          </li>
                        ))}
                      </ul>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e3eef8] pt-4 high-contrast:border-white/25">
                        <p className="text-sm text-[#5a7390] high-contrast:text-slate-300">
                          Apply by{' '}
                          <span className="mt-0.5 block font-semibold text-[#0e2a4a] high-contrast:text-white">
                            {job.applyBy}
                          </span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            data-voice-apply={job.title}
                            aria-label={`${page.applyNow}: ${job.title}`}
                            onClick={() => onSelectJobForApplication(toListing(job))}
                            className="rounded-xl bg-[#1a73e8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1259b8] high-contrast:bg-yellow-300 high-contrast:text-black"
                          >
                            {page.applyNow}
                          </button>
                          <button
                            type="button"
                            data-voice-details={job.title}
                            aria-expanded={detailsOpen}
                            aria-controls={detailsId}
                            aria-label={`${page.viewDetails}: ${job.title}`}
                            onClick={() => setOpenJobId(detailsOpen ? null : job.id)}
                            className="rounded-xl border border-[#d0e3f5] bg-white px-4 py-2.5 text-sm font-semibold text-[#1a73e8] hover:border-[#1a73e8] high-contrast:border-yellow-300 high-contrast:bg-black high-contrast:text-yellow-300"
                          >
                            {page.viewDetails}
                          </button>
                        </div>
                      </div>

                      {detailsOpen && (
                        <div
                          id={detailsId}
                          role="region"
                          aria-label={`${job.title} details`}
                          className="mt-4 rounded-xl bg-[#eef6ff] p-4 high-contrast:bg-black high-contrast:ring-1 high-contrast:ring-white"
                        >
                          <p className="text-sm leading-relaxed text-[#2c4a6e] high-contrast:text-slate-200">
                            {job.summary} {job.organization} lists this as {job.level.toLowerCase()} in{' '}
                            {job.location}.
                          </p>
                          <p className="mt-2 text-sm text-[#3e5c7a] high-contrast:text-slate-200">
                            Workplace supports: {job.supports.join(', ')}.
                          </p>
                          <button
                            type="button"
                            aria-label={`${page.prepareApplication}: ${job.title}`}
                            onClick={() => setPostingId(job.id)}
                            className="mt-4 rounded-xl bg-[#1a73e8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1259b8] high-contrast:bg-yellow-300 high-contrast:text-black"
                          >
                            {page.prepareApplication}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {results.length === 0 && (
            <p
              role="status"
              className="mt-6 rounded-2xl border border-dashed border-[#c5dbf2] bg-white px-5 py-8 text-center text-sm text-[#4d6786] high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            >
              {page.noMatches}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

function FilterRadio({
  name,
  label,
  checked,
  onSelect,
}: {
  name: string;
  label: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <label className="relative flex cursor-pointer items-center gap-3 rounded-lg py-1.5 text-sm font-medium text-[#0e2a4a] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#1a73e8] high-contrast:text-white">
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="absolute inset-0 cursor-pointer opacity-0" />
      <span
        className={`pointer-events-none grid h-5 w-5 place-items-center rounded-full ${
          checked
            ? 'bg-[#1a73e8] text-white high-contrast:bg-yellow-300 high-contrast:text-black'
            : 'border-2 border-[#c5daf2] bg-white high-contrast:border-white high-contrast:bg-black'
        }`}
        aria-hidden="true"
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      {label}
    </label>
  );
}

function FilterCheck({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="relative flex cursor-pointer items-center gap-3 rounded-lg py-1.5 text-sm font-medium text-[#0e2a4a] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#1a73e8] high-contrast:text-white">
      <input type="checkbox" checked={checked} onChange={onToggle} className="absolute inset-0 cursor-pointer opacity-0" />
      <span
        className={`pointer-events-none grid h-5 w-5 place-items-center rounded-md ${
          checked
            ? 'bg-[#1a73e8] text-white high-contrast:bg-yellow-300 high-contrast:text-black'
            : 'border-2 border-[#c5daf2] bg-white high-contrast:border-white high-contrast:bg-black'
        }`}
        aria-hidden="true"
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      {label}
    </label>
  );
}
