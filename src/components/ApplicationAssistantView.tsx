import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Mic, Volume2 } from 'lucide-react';
import {
  detectSpeechSupport,
  startVoiceDictation,
  VoiceInputSession,
} from '../engines/accessibilityEngine';
import {
  AccessibilityPreferences,
  ApplicationDraft,
  NavigationView,
} from '../types/accessbridge';

interface ApplicationAssistantViewProps {
  draft: ApplicationDraft;
  preferences: AccessibilityPreferences;
  onUpdateDraft: (next: ApplicationDraft) => void;
  onSaveDraft: () => void;
  onNavigate: (view: NavigationView) => void;
  onSpeakText: (text: string) => void;
}

type AnswerKey = 'name' | 'phone' | 'education' | 'experience' | 'skills' | 'cv' | 'request';

const SAMPLE_ANSWERS: Record<AnswerKey, string> = {
  name: '',
  phone: '',
  education: 'degree',
  experience: 'yes',
  skills: 'fcdx',
  cv: 'Wix Website Design PROJECT PROPOSAL.docx',
  request: '',
};

const QUESTION_STEPS: Array<{ key: AnswerKey; title: string; type: 'text' | 'tel' }> = [
  { key: 'name', title: 'What is your full name?', type: 'text' },
  { key: 'phone', title: 'How can the employer contact you?', type: 'tel' },
  { key: 'education', title: 'Tell us about your education', type: 'text' },
  { key: 'experience', title: 'Tell us about your work experience', type: 'text' },
  { key: 'skills', title: 'What skills would you bring to this role?', type: 'text' },
];

const REQUESTS = [
  'No request',
  'Additional time',
  'Remote interview',
  'Written questions',
  'Captioning',
  'Accessible interview location',
  'Alternative communication method',
];

const REVIEW_FIELDS: Array<{ key: AnswerKey; label: string; step: number }> = [
  { key: 'name', label: 'Name', step: 1 },
  { key: 'phone', label: 'Phone', step: 2 },
  { key: 'education', label: 'Education', step: 3 },
  { key: 'experience', label: 'Experience', step: 4 },
  { key: 'skills', label: 'Skills', step: 5 },
  { key: 'cv', label: 'CV', step: 6 },
  { key: 'request', label: 'Interview request', step: 7 },
];

export const ApplicationAssistantView: React.FC<ApplicationAssistantViewProps> = ({
  draft,
  onNavigate,
  onSpeakText,
}) => {
  const jobTitle = draft.jobTitle.trim() || 'Customer Support Associate';
  const employer = draft.employer.trim() || 'Selam Digital Services';
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState(SAMPLE_ANSWERS);
  const [submitted, setSubmitted] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [voiceNote, setVoiceNote] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const voiceRef = useRef<VoiceInputSession | null>(null);
  const speech = detectSpeechSupport();

  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo(0, 0);
  }, [step, submitted]);

  useEffect(() => {
    return () => {
      voiceRef.current?.stop();
    };
  }, []);

  const setAnswer = (key: AnswerKey, value: string) => {
    setAnswers((current) => ({ ...current, [key]: value }));
  };

  const readAloud = (text: string) => {
    if (speaking) {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      return;
    }
    onSpeakText(text);
    setSpeaking(true);
    window.setTimeout(() => setSpeaking(false), 1200);
  };

  const dictate = async (key: AnswerKey) => {
    if (voiceRef.current) {
      voiceRef.current.stop();
      voiceRef.current = null;
      setVoiceNote('Voice answer stopped.');
      return;
    }
    if (!speech.recognitionSupported) {
      setAnswer(key, answers[key] || 'Spoken answer');
      setVoiceNote('Voice answer added. You can edit it before you continue.');
      return;
    }
    setVoiceNote('Listening. Speak your answer, then it will appear in the box.');
    const session = await startVoiceDictation({
      onTranscript: (transcript, isFinal) => {
        if (!isFinal) return;
        setAnswer(key, transcript);
        setVoiceNote('Voice answer added. You can edit it before you continue.');
      },
      onError: (message) => setVoiceNote(message),
      onEnd: () => {
        voiceRef.current = null;
      },
    });
    voiceRef.current = session;
  };

  if (submitted) {
    const summary = [
      `Application complete. Reference OP-JOB-7352.`,
      `You applied for ${jobTitle} at ${employer}.`,
      ...REVIEW_FIELDS.map(
        (field) => `${field.label}: ${answers[field.key].trim() || 'Not provided'}.`,
      ),
      'You agreed to send this application to the employer.',
    ].join(' ');

    return (
      <div className="bg-[#f4f7f2] high-contrast:bg-black">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0e4638] via-[#176b52] to-[#2b8a68] px-6 py-8 text-white shadow-xl sm:px-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div
                className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-white text-[#176b52] shadow-lg ring-8 ring-white/20"
                aria-hidden="true"
              >
                <Check className="h-10 w-10" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d7f3e8]">
                  Application complete
                </p>
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className="mt-2 font-display text-4xl font-bold leading-tight text-white focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f5a623]"
                >
                  Your application is on its way.
                </h1>
                <p className="mt-3 max-w-xl text-base text-[#e7f6ef]">
                  You applied for <strong className="text-white">{jobTitle}</strong> at{' '}
                  <strong className="text-white">{employer}</strong>.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {['Reference OP-JOB-7352', 'Submitted 12 June 2025', '5 Sene 2017 EC', 'Step 8 of 8'].map(
                    (item) => (
                      <span
                        key={item}
                        className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-sm font-semibold"
                      >
                        {item}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-3xl border border-[#dbe3df] bg-white p-6 high-contrast:border-white high-contrast:bg-black">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1c6b45] high-contrast:text-yellow-300">
                What you sent
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold text-[#14281f] high-contrast:text-white">
                Application receipt
              </h2>
              <p className="mt-4 font-display text-lg font-bold text-[#14281f] high-contrast:text-white">
                {jobTitle}
                <span className="mt-1 block font-sans text-sm font-medium text-slate-500 high-contrast:text-slate-300">
                  {employer}
                </span>
              </p>
              <dl className="mt-2">
                {REVIEW_FIELDS.map((field) => {
                  const value = answers[field.key].trim();
                  return (
                    <div
                      key={field.key}
                      className="grid gap-1 border-b border-[#e1e8e2] py-3 sm:grid-cols-[150px_1fr] high-contrast:border-white/20"
                    >
                      <dt className="text-sm text-slate-500 high-contrast:text-slate-300">{field.label}</dt>
                      <dd
                        className={`font-semibold ${value ? 'text-[#14281f] high-contrast:text-white' : 'text-slate-500 high-contrast:text-slate-300'}`}
                      >
                        {value || 'Not provided'}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#0e4638] high-contrast:text-yellow-300">
                <Check className="h-4 w-4" aria-hidden="true" />
                You agreed to send this application to the employer.
              </p>
            </section>

            <section className="rounded-3xl border border-[#dbe3df] bg-white p-6 high-contrast:border-white high-contrast:bg-black">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1c6b45] high-contrast:text-yellow-300">
                After you submit
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold text-[#14281f] high-contrast:text-white">
                What happens next
              </h2>
              <ol className="mt-4 space-y-4">
                <li className="flex gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#d9eee5] text-sm font-bold text-[#0e4638]">
                    1
                  </span>
                  <p className="text-sm text-slate-600 high-contrast:text-slate-200">
                    <strong className="block text-[#14281f] high-contrast:text-white">
                      {employer} reviews applications
                    </strong>
                    Shortlisted applicants are contacted with the details on this application.
                  </p>
                </li>
                <li className="flex gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#d9eee5] text-sm font-bold text-[#0e4638]">
                    2
                  </span>
                  <p className="text-sm text-slate-600 high-contrast:text-slate-200">
                    <strong className="block text-[#14281f] high-contrast:text-white">
                      Only your chosen interview request is shared
                    </strong>
                    {answers.request.trim()
                      ? `You asked for: ${answers.request.trim()}.`
                      : 'You did not add an interview request.'}{' '}
                    Private preferences and disability status stay with you.
                  </p>
                </li>
                <li className="flex gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#d9eee5] text-sm font-bold text-[#0e4638]">
                    3
                  </span>
                  <p className="text-sm text-slate-600 high-contrast:text-slate-200">
                    <strong className="block text-[#14281f] high-contrast:text-white">
                      Support stays available
                    </strong>
                    For application support, call +251 11 555 0182.
                  </p>
                </li>
              </ol>
            </section>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('jobs')}
              className="inline-flex items-center gap-2 rounded-xl bg-[#176b52] px-4 py-3 text-sm font-bold text-white hover:bg-[#0e4638]"
            >
              Browse more jobs
            </button>
            <button
              type="button"
              onClick={() => readAloud(summary)}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-[#14281f] hover:bg-[#d9eee5] high-contrast:text-white"
            >
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              {speaking ? 'Stop reading' : 'Read this confirmation aloud'}
            </button>
          </div>
          <p className="sr-only" role="status">
            Application submitted. Reference OP-JOB-7352.
          </p>
        </div>
      </div>
    );
  }

  const question = step <= 5 ? QUESTION_STEPS[step - 1] : null;

  return (
    <div className="bg-[#f4f7f2] high-contrast:bg-black">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-slate-600 high-contrast:text-slate-200">
            <span>Application progress</span>
            <strong className="text-[#14281f] high-contrast:text-white">Step {step} of 8</strong>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-[#e3e9e6]"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={8}
            aria-label={`Application progress, step ${step} of 8`}
          >
            <div className="h-full bg-[#176b52]" style={{ width: `${(step / 8) * 100}%` }} />
          </div>
        </div>

        {question && (
          <>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1c6b45] high-contrast:text-yellow-300">
              Applying for {jobTitle}
            </p>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="mt-2 font-display text-4xl font-bold text-[#14281f] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f5a623] high-contrast:text-white"
            >
              {question.title}
            </h1>
            <p className="mt-3 text-slate-600 high-contrast:text-slate-200">
              You can type or use voice. Keep your answer brief.
            </p>
            <button
              type="button"
              onClick={() => readAloud(question.title)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-[#14281f] hover:bg-[#d9eee5] high-contrast:text-white"
            >
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              {speaking ? 'Stop reading' : 'Read this aloud'}
            </button>
            <label className="mt-6 block text-sm font-semibold text-[#14281f] high-contrast:text-white">
              Your answer
              <input
                type={question.type}
                value={answers[question.key]}
                onChange={(event) => setAnswer(question.key, event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#c9d5ce] bg-white px-4 py-3 text-base text-[#14281f] high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              />
            </label>
            <button
              type="button"
              onClick={() => dictate(question.key)}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#a9bbb4] bg-white px-4 py-3 text-sm font-bold text-[#0e4638] high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            >
              <Mic className="h-4 w-4" aria-hidden="true" />
              Answer by voice
            </button>
            {voiceNote && (
              <p role="status" className="mt-3 text-sm text-slate-600 high-contrast:text-slate-200">
                {voiceNote}
              </p>
            )}
          </>
        )}

        {step === 6 && (
          <>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="font-display text-4xl font-bold text-[#14281f] focus:outline-none high-contrast:text-white"
            >
              Add your CV
            </h1>
            <p className="mt-3 text-slate-600 high-contrast:text-slate-200">
              PDF, DOC, or DOCX. Maximum file size: 5 MB.
            </p>
            <label className="mt-6 flex cursor-pointer flex-col items-start gap-1 rounded-2xl border border-dashed border-[#176b52] bg-white px-5 py-6 high-contrast:border-white high-contrast:bg-black">
              <strong className="text-[#14281f] high-contrast:text-white">
                {answers.cv || 'Choose a file from your device'}
              </strong>
              <span className="text-sm text-slate-500 high-contrast:text-slate-300">
                Keyboard accessible. Drag and drop is not required.
              </span>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="mt-3"
                onChange={(event) => setAnswer('cv', event.target.files?.[0]?.name || answers.cv)}
              />
            </label>
            <p className="mt-4 rounded-xl bg-[#eef6f1] px-4 py-3 text-sm text-[#14281f] high-contrast:bg-black high-contrast:text-white">
              Cannot upload a CV? You can continue and enter your experience in the form instead.
            </p>
          </>
        )}

        {step === 7 && (
          <>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1c6b45] high-contrast:text-yellow-300">
              Optional
            </p>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="mt-2 font-display text-4xl font-bold text-[#14281f] focus:outline-none high-contrast:text-white"
            >
              Would you like to request any arrangements for the interview?
            </h1>
            <p className="mt-3 text-slate-600 high-contrast:text-slate-200">
              Only the request you choose here will be shared. Your private preferences and disability
              status are not sent.
            </p>
            <fieldset className="mt-6 space-y-2">
              <legend className="sr-only">Interview request</legend>
              {REQUESTS.map((option) => (
                <label
                  key={option}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-white px-4 py-3 font-semibold text-[#14281f] high-contrast:bg-black high-contrast:text-white ${
                    answers.request === option ? 'border-[#176b52]' : 'border-[#dbe3df] high-contrast:border-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="interview-request"
                    value={option}
                    checked={answers.request === option}
                    onChange={() => setAnswer('request', option)}
                  />
                  {option}
                </label>
              ))}
            </fieldset>
          </>
        )}

        {step === 8 && (
          <>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="font-display text-4xl font-bold text-[#14281f] focus:outline-none high-contrast:text-white"
            >
              Review and submit
            </h1>
            <div className="mt-5 rounded-2xl bg-[#eef6f1] px-4 py-4 text-[#14281f] high-contrast:bg-black high-contrast:text-white">
              <strong>You are applying for:</strong>
              <br />
              {jobTitle} at {employer}
            </div>
            <dl className="mt-4 overflow-hidden rounded-2xl border border-[#dbe3df] bg-white high-contrast:border-white high-contrast:bg-black">
              {REVIEW_FIELDS.map((field) => (
                <div
                  key={field.key}
                  className="grid grid-cols-[120px_1fr_auto] items-center gap-3 border-b border-[#e1e8e2] px-4 py-3 last:border-0 high-contrast:border-white/20"
                >
                  <dt className="text-sm capitalize text-slate-500 high-contrast:text-slate-300">
                    {field.label}
                  </dt>
                  <dd className="font-semibold text-[#14281f] high-contrast:text-white">
                    {answers[field.key].trim() || 'Not provided'}
                  </dd>
                  <button
                    type="button"
                    onClick={() => setStep(field.step)}
                    className="font-bold text-[#176b52] underline high-contrast:text-yellow-300"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </dl>
            <label className="mt-4 flex items-start gap-3 text-sm font-semibold text-[#14281f] high-contrast:text-white">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(event) => setAgreed(event.target.checked)}
                className="mt-1"
              />
              I agree to send this application to the employer
            </label>
          </>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => (step === 1 ? onNavigate('jobs') : setStep(step - 1))}
            className="inline-flex items-center gap-2 rounded-xl border border-[#a9bbb4] bg-white px-4 py-3 text-sm font-bold text-[#0e4638] high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
          {step < 8 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#176b52] px-4 py-3 text-sm font-bold text-white hover:bg-[#0e4638]"
            >
              {step === 7 ? 'Review application' : 'Continue'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              disabled={!agreed}
              onClick={() => setSubmitted(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#176b52] px-4 py-3 text-sm font-bold text-white hover:bg-[#0e4638] disabled:opacity-50"
            >
              Submit application
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
