import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, Mic, Minus, Plus, Volume2, X } from 'lucide-react';
import { createCareerApplication, createJob, listJobs } from '../engines/api';
import { speakAloud, startVoiceDictation, type VoiceInputSession } from '../engines/accessibilityEngine';
import { beginDictation, releaseDictation } from '../engines/dictationControl';
import { getLanguageOption } from '../engines/i18n';
import { clearCareerApplyFill, loadCareerApplyFill, saveCareerApplyFill } from '../engines/formDraft';
import { JobListing, PreferredLanguage } from '../types/accessbridge';

const SUPPORTS = [
  { id: 'screen', label: 'Screen-reader compatible tools' },
  { id: 'step', label: 'Step-free access' },
  { id: 'flexible', label: 'Flexible schedule' },
  { id: 'written', label: 'Written instructions' },
  { id: 'sign', label: 'Sign language/captions' },
] as const;

type SupportId = (typeof SUPPORTS)[number]['id'];

interface GatewayJob {
  id: string;
  title: string;
  organization: string;
  location: string;
  summary: string;
  supports: SupportId[];
  otherSupport?: string;
}

const STARTER_JOBS: GatewayJob[] = [
  {
    id: 'customer-support-assistant',
    title: 'Customer Support Assistant',
    organization: 'Selam Connect',
    location: 'Addis Ababa · Hybrid',
    summary: 'Help customers by phone and message. Training and clear scripts are provided.',
    supports: ['screen', 'flexible'],
  },
  {
    id: 'junior-data-clerk',
    title: 'Junior Data Clerk',
    organization: 'Bright Path Logistics',
    location: 'Remote',
    summary: 'Check and organize simple delivery records from home.',
    supports: ['screen', 'flexible'],
  },
  {
    id: 'workshop-assistant',
    title: 'Workshop Assistant',
    organization: 'Unity Hall',
    location: 'Addis Ababa · On-site',
    summary: 'Welcome learners, set out materials, and keep the room easy to move through.',
    supports: ['step', 'written'],
  },
  {
    id: 'community-guide',
    title: 'Community Guide',
    organization: 'Selam Connect',
    location: 'Addis Ababa · Hybrid',
    summary: 'Share updates in writing and on captioned video calls with a small team.',
    supports: ['written', 'sign', 'flexible'],
  },
];

const POSTS_KEY = 'allways-career-posts';
const ANSWERS_KEY = 'allways-gateway-answers';
const STARTER_IDS = new Set(STARTER_JOBS.map((job) => job.id));

const APPLY_STEPS = [
  {
    key: 'name' as const,
    title: 'What is your name?',
    help: 'Enter the name you want the employer to use.',
    label: 'Full name',
    placeholder: '',
  },
  {
    key: 'phone' as const,
    title: 'How can the employer reach you?',
    help: 'A phone number or email is enough.',
    label: 'Phone or email',
    placeholder: '',
  },
  {
    key: 'experience' as const,
    title: 'What experience should we share?',
    help: 'A few words about work, learning, or helping others is enough.',
    label: 'Your experience',
    placeholder: '',
  },
  {
    key: 'review' as const,
    title: 'Review your application',
    help: 'Check these answers, then send them.',
    label: '',
    placeholder: '',
  },
];

interface CareerGatewayProps {
  onSelectJobForApplication: (job: JobListing) => void;
  onSpeakText: (text: string) => void;
  language: PreferredLanguage;
}

function loadPosted(): GatewayJob[] {
  try {
    const raw = sessionStorage.getItem(POSTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((job) => job && typeof job.title === 'string' && typeof job.id === 'string');
  } catch {
    return [];
  }
}

function supportLabel(id: string) {
  return SUPPORTS.find((item) => item.id === id)?.label || id;
}

function asGatewayJob(job: {
  id: string;
  title: string;
  organization: string;
  location: string;
  summary: string;
  supports: string[];
  otherSupport?: string;
}): GatewayJob {
  return {
    id: job.id,
    title: job.title,
    organization: job.organization,
    location: job.location,
    summary: job.summary,
    supports: job.supports.filter((id): id is SupportId => SUPPORTS.some((item) => item.id === id)),
    otherSupport: job.otherSupport || '',
  };
}

function toListing(job: GatewayJob): JobListing {
  const remote = /remote/i.test(job.location);
  return {
    id: job.id,
    platform: 'LinkedIn',
    title: job.title,
    employer: job.organization,
    arrangement: remote ? ['Remote', 'Flexible hours'] : ['Full-time', 'Flexible hours'],
    experienceLevel: 'Entry',
    hourlyRateMin: 25,
    hourlyRateMax: 25,
    paymentType: 'Hourly',
    paymentDisplay: 'Entry level',
    description: job.summary,
    requiredSkills: job.supports.map(supportLabel),
    applicationRequirements: job.supports.map(supportLabel),
    screeningQuestions: ['Describe how you would use the support this job offers.'],
    isSampleData: true,
    accessibilityNotes: job.supports.map(supportLabel).join(', '),
  };
}

export const CareerGateway: React.FC<CareerGatewayProps> = ({
  onSelectJobForApplication,
  onSpeakText,
  language,
}) => {
  const [mode, setMode] = useState<'learner' | 'employer'>('learner');
  const [supportsOpen, setSupportsOpen] = useState(true);
  const [needed, setNeeded] = useState<SupportId[]>([]);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [jobs, setJobs] = useState<GatewayJob[]>(() => [...loadPosted(), ...STARTER_JOBS]);
  const [notice, setNotice] = useState('');
  const [applyJob, setApplyJob] = useState<GatewayJob | null>(null);

  useEffect(() => {
    const fill = loadCareerApplyFill();
    if (!fill) return;
    const match = jobs.find((job) => job.id === fill.jobId);
    if (match) setApplyJob(match);
  }, [jobs]);

  useEffect(() => {
    const saved = sessionStorage.getItem('allways-account-notice');
    if (!saved) return;
    sessionStorage.removeItem('allways-account-notice');
    setNotice(saved);
  }, []);

  useEffect(() => {
    let live = true;
    listJobs()
      .then((remote) => {
        if (!live || remote.length === 0) return;
        const next = remote.map(asGatewayJob);
        setJobs(next);
        sessionStorage.setItem(
          POSTS_KEY,
          JSON.stringify(next.filter((job) => !STARTER_IDS.has(job.id))),
        );
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const results = useMemo(() => {
    const needle = appliedQuery.trim().toLowerCase();
    return jobs.filter((job) => {
      if (needed.length > 0 && !needed.every((item) => job.supports.includes(item))) return false;
      if (!needle) return true;
      return [job.title, job.organization, job.location, job.summary, ...job.supports.map(supportLabel)]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [appliedQuery, jobs, needed]);

  const toggleNeed = (id: SupportId) => {
    setNeeded((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const rememberPosts = (next: GatewayJob[]) => {
    sessionStorage.setItem(POSTS_KEY, JSON.stringify(next.filter((job) => !STARTER_IDS.has(job.id))));
  };

  return (
    <div className="bg-transparent high-contrast:bg-black">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10" inert={applyJob ? true : undefined}>
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#1565c0] high-contrast:text-yellow-300">
          Career gateway
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold tracking-[-0.03em] text-[#0e2a4a] high-contrast:text-white sm:text-5xl">
          Find work that works for you.
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-[#4d6786] high-contrast:text-slate-200">
          Explore supportive jobs or post a new opportunity.
        </p>

        <div
          className="mt-6 inline-flex rounded-2xl bg-[#e7f1fb] p-1 high-contrast:bg-black high-contrast:ring-1 high-contrast:ring-white"
          role="tablist"
          aria-label="Career gateway"
        >
          {(
            [
              ['learner', 'Learner job board'],
              ['employer', 'Employer post job'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => setMode(id)}
              className={`rounded-xl px-5 py-3 text-sm font-bold ${
                mode === id
                  ? 'bg-white text-[#0e2a4a] shadow-sm high-contrast:bg-yellow-300 high-contrast:text-black'
                  : 'text-[#3e5c7a] high-contrast:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'learner' ? (
          <div className="mt-6">
            <form
              className="mb-5 flex items-center gap-2 rounded-2xl border border-[#b7d4f2] bg-white p-1.5 shadow-[0_10px_30px_-24px_rgba(26,115,232,0.8)] high-contrast:border-yellow-300 high-contrast:bg-black"
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                setAppliedQuery(query);
              }}
            >
              <label htmlFor="opportunity-search" className="sr-only">
                Search by job title, skill, or organization
              </label>
              <input
                id="opportunity-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by job title, skill, or organization"
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-[#0e2a4a] placeholder:text-[#7f97b0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5a623] high-contrast:text-white"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#1a73e8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1259b8] high-contrast:bg-yellow-300 high-contrast:text-black"
              >
                Search
              </button>
            </form>

            <section className="rounded-2xl border border-[#d5e6f7] bg-white p-5 shadow-[0_18px_40px_-32px_rgba(26,115,232,0.7)] high-contrast:border-white high-contrast:bg-black sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[#1565c0] high-contrast:text-yellow-300">
                    Private on this screen
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold text-[#0e2a4a] high-contrast:text-white">
                    Support I need
                  </h2>
                </div>
                <button
                  type="button"
                  aria-expanded={supportsOpen}
                  onClick={() => setSupportsOpen((open) => !open)}
                  className="grid h-10 w-10 place-items-center rounded-full text-[#1565c0] hover:bg-[#e7f1fb] high-contrast:text-yellow-300"
                >
                  {supportsOpen ? <Minus aria-hidden="true" /> : <Plus aria-hidden="true" />}
                  <span className="sr-only">{supportsOpen ? 'Hide support choices' : 'Show support choices'}</span>
                </button>
              </div>
              {supportsOpen && (
                <>
                  <p className="mt-4 border-t border-[#e1edf8] pt-4 text-sm font-semibold text-[#0e2a4a] high-contrast:border-white/30 high-contrast:text-white">
                    Only show jobs offering all selected support
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {SUPPORTS.map((item) => (
                      <label
                        key={item.id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl px-1 py-2 text-sm font-medium text-[#0e2a4a] high-contrast:text-white"
                      >
                        <input
                          type="checkbox"
                          checked={needed.includes(item.id)}
                          onChange={() => toggleNeed(item.id)}
                          className="h-5 w-5 rounded border-[#9eb6ce] accent-[#1a73e8]"
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </section>

            <p className="mt-5 text-sm font-semibold text-[#3e5c7a] high-contrast:text-slate-200" aria-live="polite">
              {results.length} {results.length === 1 ? 'job matches' : 'jobs match'} your choices
            </p>
            {notice && (
              <p className="mt-3 rounded-xl bg-[#e7f1fb] px-4 py-3 text-sm font-semibold text-[#0e2a4a] high-contrast:bg-black high-contrast:text-yellow-300" role="status">
                {notice}
              </p>
            )}

            <ul className="mt-4 grid gap-4 md:grid-cols-2">
              {results.map((job) => (
                <li
                  key={job.id}
                  className="flex flex-col rounded-2xl border border-[#d5e6f7] bg-white p-5 shadow-[0_18px_40px_-32px_rgba(26,115,232,0.65)] high-contrast:border-white high-contrast:bg-black"
                >
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <p className="text-[#5a7390] high-contrast:text-slate-300">{job.location}</p>
                    <p className="font-bold text-[#1a73e8] high-contrast:text-yellow-300">Open</p>
                  </div>
                  <h2 className="mt-4 font-display text-2xl font-bold tracking-[-0.02em] text-[#0e2a4a] high-contrast:text-white">
                    {job.title}
                  </h2>
                  <p className="mt-1 font-bold text-[#1a73e8] high-contrast:text-yellow-300">{job.organization}</p>
                  <p className="mt-3 text-sm leading-relaxed text-[#3e5c7a] high-contrast:text-slate-200">{job.summary}</p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {job.supports.map((id) => (
                      <li
                        key={id}
                        className="rounded-lg bg-[#e7f1fb] px-2.5 py-1 text-xs font-semibold text-[#3e5c7a] high-contrast:bg-black high-contrast:text-white high-contrast:ring-1 high-contrast:ring-white"
                      >
                        {supportLabel(id)}
                      </li>
                    ))}
                    {job.otherSupport && (
                      <li className="rounded-lg bg-[#e7f1fb] px-2.5 py-1 text-xs font-semibold text-[#3e5c7a] high-contrast:bg-black high-contrast:text-white high-contrast:ring-1 high-contrast:ring-white">
                        {job.otherSupport}
                      </li>
                    )}
                  </ul>
                  <button
                    type="button"
                    data-voice-apply={job.title}
                    onClick={() => setApplyJob(job)}
                    className="mt-5 inline-flex w-fit rounded-xl bg-[#1a73e8] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1259b8] high-contrast:bg-yellow-300 high-contrast:text-black"
                  >
                    Apply
                  </button>
                </li>
              ))}
            </ul>
            {results.length === 0 && (
              <p className="mt-4 rounded-2xl border border-dashed border-[#c5dbf2] bg-white px-5 py-8 text-center text-sm text-[#4d6786] high-contrast:border-white high-contrast:bg-black high-contrast:text-white">
                No jobs offer every support you selected. Clear one choice to see more jobs.
              </p>
            )}
          </div>
        ) : (
          <EmployerForm
            language={language}
            onPost={async (job) => {
              const saved = asGatewayJob(
                await createJob({
                  title: job.title,
                  organization: job.organization,
                  location: job.location,
                  summary: job.summary,
                  supports: job.supports,
                  otherSupport: job.otherSupport || '',
                }),
              );
              setJobs((current) => {
                const next = [saved, ...current.filter((item) => item.id !== saved.id)];
                rememberPosts(next);
                return next;
              });
              setMode('learner');
              setNeeded([]);
              setQuery('');
              setAppliedQuery('');
              setNotice(`${saved.title} is now on the learner job board.`);
            }}
          />
        )}
      </div>

      {applyJob && (
        <ApplyDialog
          job={applyJob}
          language={language}
          onSpeakText={onSpeakText}
          onClose={() => {
            clearCareerApplyFill();
            setApplyJob(null);
          }}
          onContinue={(answers) => {
            sessionStorage.setItem(ANSWERS_KEY, JSON.stringify(answers));
            onSelectJobForApplication(toListing(applyJob));
          }}
        />
      )}
    </div>
  );
};

function EmployerForm({
  language,
  onPost,
}: {
  language: PreferredLanguage;
  onPost: (job: Omit<GatewayJob, 'id'>) => Promise<void>;
}) {
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [supports, setSupports] = useState<SupportId[]>([]);
  const [other, setOther] = useState('');
  const [error, setError] = useState('');

  const toggle = (id: SupportId) => {
    setSupports((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !company.trim() || !location.trim() || !description.trim()) {
      setError('Title, company, location, and description are required.');
      return;
    }
    setError('');
    setSending(true);
    try {
      await onPost({
        title: title.trim(),
        organization: company.trim(),
        location: location.trim(),
        summary: description.trim(),
        supports,
        otherSupport: other.trim(),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The job was not posted.');
    } finally {
      setSending(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mt-6 rounded-2xl border border-[#d5e6f7] bg-white p-5 shadow-[0_18px_40px_-32px_rgba(26,115,232,0.7)] high-contrast:border-white high-contrast:bg-black sm:p-8"
    >
      <h2 className="font-display text-3xl font-bold text-[#0e2a4a] high-contrast:text-white">Post a supportive job</h2>
      <p className="mt-2 text-[#4d6786] high-contrast:text-slate-200">
        Tell learners what the job offers. All fields marked required must be completed.
      </p>
      <div className="mt-6 space-y-5">
        <SpeakField id="job-title" label="Title" required language={language} value={title} onChange={setTitle} />
        <SpeakField id="job-company" label="Company" required language={language} value={company} onChange={setCompany} />
        <SpeakField
          id="job-location"
          label="Location or remote"
          required
          language={language}
          value={location}
          onChange={setLocation}
        />
        <SpeakField
          id="job-description"
          label="Description"
          required
          multiline
          language={language}
          value={description}
          onChange={setDescription}
        />
      </div>

      <fieldset className="mt-8">
        <legend className="font-display text-xl font-bold text-[#0e2a4a] high-contrast:text-white">
          Support this job offers
        </legend>
        <div className="mt-4 space-y-3">
          {SUPPORTS.map((item) => (
            <label
              key={item.id}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-4 text-sm font-semibold ${
                supports.includes(item.id)
                  ? 'border-[#1a73e8] bg-[#f3f8ff] text-[#0e2a4a] high-contrast:border-yellow-300 high-contrast:text-yellow-300'
                  : 'border-[#d5e6f7] bg-white text-[#0e2a4a] high-contrast:border-white high-contrast:bg-black high-contrast:text-white'
              }`}
            >
              <input
                type="checkbox"
                checked={supports.includes(item.id)}
                onChange={() => toggle(item.id)}
                className="h-5 w-5 rounded border-[#9eb6ce] accent-[#1a73e8]"
              />
              {item.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6">
        <SpeakField
          id="job-other-support"
          label="Other support"
          optional
          language={language}
          value={other}
          onChange={setOther}
          placeholder="For example, quiet workspace"
        />
      </div>
      {error && (
        <p className="mt-4 text-sm font-bold text-[#9a261b]" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={sending}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1a73e8] px-5 py-3 text-sm font-bold text-white hover:bg-[#1259b8] disabled:opacity-60 high-contrast:bg-yellow-300 high-contrast:text-black"
      >
        {sending ? 'Posting…' : 'Post job'} <span aria-hidden="true">&gt;</span>
      </button>
    </form>
  );
}

function SpeakField({
  id,
  label,
  required,
  optional,
  multiline,
  language,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  multiline?: boolean;
  language: PreferredLanguage;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState('');
  const sessionRef = useRef<VoiceInputSession | null>(null);
  const hintId = `${id}-hint`;

  useEffect(() => {
    return () => {
      sessionRef.current?.stop();
      sessionRef.current = null;
      releaseDictation();
    };
  }, []);

  const toggleSpeech = () => {
    if (listening) {
      sessionRef.current?.stop();
      sessionRef.current = null;
      releaseDictation();
      setListening(false);
      setNote('Stopped listening. You can type instead.');
      return;
    }
    const request = beginDictation(language);
    if (!request.ok) {
      setNote(request.note);
      return;
    }
    setListening(true);
    setNote(request.note);
    const session = startVoiceDictation({
      owner: 'dictation',
      lang: getLanguageOption(language).speechLang,
      onTranscript: (transcript, isFinal) => {
        if (isFinal && transcript.trim()) onChange(transcript.trim());
      },
      onError: (message) => {
        setNote(message);
        setListening(false);
        releaseDictation();
      },
      onEnd: () => {
        setListening(false);
        sessionRef.current = null;
        releaseDictation();
      },
    });
    sessionRef.current = session;
    if (!session) {
      setListening(false);
      releaseDictation();
      setNote('Speech recognition is not available. You can type your answer.');
    }
  };

  const fieldClass =
    'min-w-0 flex-1 rounded-xl border border-[#b7c9dc] bg-white px-3 py-3 text-[#0e2a4a] placeholder:text-[#8aa0b5] focus:border-[#1a73e8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5a623] high-contrast:border-white high-contrast:bg-black high-contrast:text-white';

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-[#0e2a4a] high-contrast:text-white">
        {label} {required ? <span>(required)</span> : optional ? <span>(optional)</span> : null}
      </label>
      <div className="flex items-stretch gap-2">
        {multiline ? (
          <textarea
            id={id}
            required={required}
            rows={5}
            value={value}
            placeholder={placeholder}
            aria-describedby={hintId}
            onChange={(event) => onChange(event.target.value)}
            className={fieldClass}
          />
        ) : (
          <input
            id={id}
            required={required}
            value={value}
            placeholder={placeholder}
            aria-describedby={hintId}
            onChange={(event) => onChange(event.target.value)}
            className={fieldClass}
          />
        )}
        <button
          type="button"
          onClick={toggleSpeech}
          aria-pressed={listening}
          className="grid w-[4.6rem] shrink-0 place-items-center rounded-xl border border-[#1a73e8] bg-[#e8f3ff] px-2 text-xs font-bold text-[#0d4f9e] high-contrast:border-yellow-300 high-contrast:bg-black high-contrast:text-yellow-300"
        >
          <Mic className="h-4 w-4" aria-hidden="true" />
          {listening ? 'Stop' : 'Speak'}
        </button>
      </div>
      <p id={hintId} className="mt-1.5 text-xs text-[#6d849c] high-contrast:text-slate-300">
        {note || 'You can type or use the Speak button.'}
      </p>
    </div>
  );
}

function ApplyDialog({
  job,
  language,
  onSpeakText,
  onClose,
  onContinue,
}: {
  job: GatewayJob;
  language: PreferredLanguage;
  onSpeakText: (text: string) => void;
  onClose: () => void;
  onContinue: (answers: { name: string; phone: string; experience: string }) => void;
}) {
  const titleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const savedFill = loadCareerApplyFill();
  const restored = savedFill?.jobId === job.id ? savedFill : null;
  const [step, setStep] = useState(restored?.step || 0);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [answers, setAnswers] = useState(restored?.answers || { name: '', phone: '', experience: '' });
  const current = APPLY_STEPS[step];

  useEffect(() => {
    if (!answers.name && !answers.phone && !answers.experience && step === 0) return;
    saveCareerApplyFill({ jobId: job.id, step, answers });
  }, [answers, job.id, step]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step, done]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const read = () => {
    const text = done
      ? `Application saved for ${job.title} at ${job.organization}. Reference ${reference}.`
      : `${current.title} ${current.help}`;
    if (reading) {
      window.speechSynthesis?.cancel();
      setReading(false);
      return;
    }
    setReading(true);
    const started = speakAloud(text, { lang: getLanguageOption(language).speechLang, onEnd: () => setReading(false) });
    if (!started) {
      onSpeakText(text);
      setReading(false);
    }
  };

  const goNext = () => {
    if (current.key !== 'review' && !answers[current.key].trim()) {
      setError('Add an answer before you continue. You can type or use Speak.');
      return;
    }
    setError('');
    if (step < APPLY_STEPS.length - 1) setStep(step + 1);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const saved = await createCareerApplication(job.id, {
        name: answers.name.trim(),
        phone: answers.phone.trim(),
        experience: answers.experience.trim(),
      });
      sessionStorage.setItem(ANSWERS_KEY, JSON.stringify(answers));
      clearCareerApplyFill();
      setReference(saved.reference);
      setDone(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The application was not saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#0e2a4a]/45 p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-career-apply={done ? 'done' : 'open'}
        className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl high-contrast:bg-black high-contrast:ring-2 high-contrast:ring-yellow-300 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[#1565c0] high-contrast:text-yellow-300">
            Apply for {job.title} · Step {Math.min(step + 1, 4)} of 4
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close application"
            className="grid h-10 w-10 place-items-center rounded-full bg-[#e7f1fb] text-[#0e2a4a] high-contrast:bg-black high-contrast:text-yellow-300 high-contrast:ring-1 high-contrast:ring-yellow-300"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {done ? (
          <div className="mt-5">
            <h2 id={titleId} ref={headingRef} tabIndex={-1} className="font-display text-4xl font-bold text-[#0e2a4a] high-contrast:text-white">
              Your application is saved.
            </h2>
            <p data-career-help className="mt-3 text-[#4d6786] high-contrast:text-slate-200">
              {job.organization} can see the name, contact, and experience you entered for {job.title}. Reference {reference}.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-[#1a73e8] px-5 py-3 text-sm font-bold text-white hover:bg-[#1259b8] high-contrast:bg-yellow-300 high-contrast:text-black"
              >
                Back to jobs
              </button>
              <button
                type="button"
                onClick={() => onContinue(answers)}
                className="rounded-xl border border-[#1a73e8] bg-white px-5 py-3 text-sm font-bold text-[#0d4f9e] high-contrast:border-yellow-300 high-contrast:bg-black high-contrast:text-yellow-300"
              >
                Open the full application
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2
              id={titleId}
              ref={headingRef}
              tabIndex={-1}
              className="mt-4 font-display text-4xl font-bold tracking-[-0.03em] text-[#0e2a4a] high-contrast:text-white"
            >
              {current.title}
            </h2>
            <p data-career-help className="mt-2 text-[#4d6786] high-contrast:text-slate-200">
              {current.help}
            </p>
            <button
              type="button"
              onClick={read}
              aria-pressed={reading}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#0e2a4a] bg-white px-4 py-2.5 text-sm font-bold text-[#0e2a4a] high-contrast:border-yellow-300 high-contrast:bg-black high-contrast:text-yellow-300"
            >
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              {reading ? 'Stop reading' : 'Read aloud'}
            </button>

            {current.key === 'review' ? (
              <dl className="mt-6 space-y-3 rounded-2xl bg-[#f3f8ff] p-4 high-contrast:bg-black high-contrast:ring-1 high-contrast:ring-white">
                {(
                  [
                    ['Name', answers.name],
                    ['Contact', answers.phone],
                    ['Experience', answers.experience],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-bold uppercase tracking-[0.12em] text-[#1565c0] high-contrast:text-yellow-300">
                      {label}
                    </dt>
                    <dd className="mt-1 font-semibold text-[#0e2a4a] high-contrast:text-white">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="mt-6">
                <SpeakField
                  id={`apply-${current.key}`}
                  label={current.label}
                  required
                  language={language}
                  value={answers[current.key]}
                  onChange={(value) => setAnswers((currentAnswers) => ({ ...currentAnswers, [current.key]: value }))}
                />
              </div>
            )}
            {error && (
              <p className="mt-3 text-sm font-bold text-[#9a261b]" role="alert">
                {error}
              </p>
            )}
            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  if (step === 0) onClose();
                  else setStep(step - 1);
                }}
                className="text-sm font-bold text-[#1565c0] underline high-contrast:text-yellow-300"
              >
                {step === 0 ? 'Cancel' : 'Back'}
              </button>
              {current.key === 'review' ? (
                <button
                  type="button"
                  data-voice="submit"
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1a73e8] px-5 py-3 text-sm font-bold text-white hover:bg-[#1259b8] disabled:opacity-60 high-contrast:bg-yellow-300 high-contrast:text-black"
                >
                  <Check className="h-4 w-4" aria-hidden="true" /> {saving ? 'Saving…' : 'Submit'}
                </button>
              ) : (
                <button
                  type="button"
                  data-voice="next"
                  onClick={goNext}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1a73e8] px-5 py-3 text-sm font-bold text-white hover:bg-[#1259b8] high-contrast:bg-yellow-300 high-contrast:text-black"
                >
                  Next <span aria-hidden="true">&gt;</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
