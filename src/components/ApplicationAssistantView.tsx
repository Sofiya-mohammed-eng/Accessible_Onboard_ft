import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Mic, Volume2 } from 'lucide-react';
import {
  detectSpeechSupport,
  startVoiceDictation,
  VoiceInputSession,
} from '../engines/accessibilityEngine';
import { beginDictation, noteAfterDictationLoss, noteAfterQuietDictation, releaseDictation } from '../engines/dictationControl';
import { getLanguageOption } from '../engines/i18n';
import { getPageCopy, unsupportedLanguageNotice } from '../engines/pageCopy';
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

type AnswerKey = 'name' | 'phone' | 'education' | 'experience' | 'skills' | 'cv';

const SAMPLE_ANSWERS: Record<AnswerKey, string> = {
  name: '',
  phone: '',
  education: 'degree',
  experience: 'yes',
  skills: 'fcdx',
  cv: 'Wix Website Design PROJECT PROPOSAL.docx',
};

const QUESTION_STEPS: Array<{ key: AnswerKey; type: 'text' | 'tel' }> = [
  { key: 'name', type: 'text' },
  { key: 'phone', type: 'tel' },
  { key: 'education', type: 'text' },
  { key: 'experience', type: 'text' },
  { key: 'skills', type: 'text' },
];

const REVIEW_FIELDS: Array<{ key: AnswerKey; step: number }> = [
  { key: 'name', step: 1 },
  { key: 'phone', step: 2 },
  { key: 'education', step: 3 },
  { key: 'experience', step: 4 },
  { key: 'skills', step: 5 },
  { key: 'cv', step: 6 },
];

export const ApplicationAssistantView: React.FC<ApplicationAssistantViewProps> = ({
  draft,
  preferences,
  onNavigate,
  onSpeakText,
}) => {
  const page = getPageCopy(preferences.language);
  const speechLang = getLanguageOption(preferences.language).speechLang;
  const questionTitles: Record<AnswerKey, string> = {
    name: page.qName,
    phone: page.qPhone,
    education: page.qEducation,
    experience: page.qExperience,
    skills: page.qSkills,
    cv: page.addCvTitle,
  };
  const jobTitle = draft.jobTitle.trim() || 'Customer Support Associate';
  const employer = draft.employer.trim() || 'Selam Digital Services';
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = sessionStorage.getItem('allways-gateway-answers');
      if (!saved) return SAMPLE_ANSWERS;
      const parsed = JSON.parse(saved) as Partial<typeof SAMPLE_ANSWERS>;
      return {
        ...SAMPLE_ANSWERS,
        name: parsed.name || SAMPLE_ANSWERS.name,
        phone: parsed.phone || SAMPLE_ANSWERS.phone,
        experience: parsed.experience || SAMPLE_ANSWERS.experience,
      };
    } catch {
      return SAMPLE_ANSWERS;
    }
  });
  const [submitted, setSubmitted] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [voiceNote, setVoiceNote] = useState('');
  const [dictating, setDictating] = useState(false);
  const [formError, setFormError] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const voiceRef = useRef<VoiceInputSession | null>(null);
  const dictationToken = useRef(0);
  const heardDictation = useRef(false);
  const speech = detectSpeechSupport();

  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo(0, 0);
  }, [step, submitted]);

  useEffect(() => {
    return () => {
      dictationToken.current += 1;
      voiceRef.current?.stop();
      voiceRef.current = null;
      releaseDictation();
    };
  }, []);

  const setAnswer = (key: AnswerKey, value: string) => {
    setFormError('');
    setAnswers((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    const onVoiceFile = (event: Event) => {
      const name = (event as CustomEvent<string>).detail?.trim() || '';
      if (name) setAnswer('cv', name);
    };
    window.addEventListener('allways-cv', onVoiceFile);
    return () => window.removeEventListener('allways-cv', onVoiceFile);
  }, []);

  const goNext = () => {
    const current = step <= 5 ? QUESTION_STEPS[step - 1] : null;
    if (current && !answers[current.key].trim()) {
      setFormError(`${questionTitles[current.key]} ${page.emptyAnswer}`);
      return;
    }
    if (step === 6 && !answers.cv.trim()) {
      setFormError(page.noFile);
      return;
    }
    setFormError('');
    setStep(step + 1);
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

  const loseDictation = (token: number) => {
    if (dictationToken.current !== token) return;
    dictationToken.current += 1;
    voiceRef.current = null;
    releaseDictation();
    setDictating(false);
    setVoiceNote((current) => noteAfterDictationLoss(preferences.language, current));
  };

  const dictate = (key: AnswerKey) => {
    if (voiceRef.current?.isCurrent()) {
      dictationToken.current += 1;
      voiceRef.current.stop();
      voiceRef.current = null;
      releaseDictation();
      setDictating(false);
      setVoiceNote(page.voiceStopped);
      return;
    }
    voiceRef.current = null;
    if (!speech.recognitionSupported) {
      setAnswer(key, answers[key] || page.voiceAdded);
      setVoiceNote(page.voiceAdded);
      return;
    }
    const request = beginDictation(preferences.language);
    if (!request.ok) {
      setDictating(false);
      setVoiceNote(request.note);
      return;
    }
    const token = dictationToken.current + 1;
    dictationToken.current = token;
    heardDictation.current = false;
    setDictating(true);
    setVoiceNote(request.note);
    const session = startVoiceDictation({
      owner: 'dictation',
      lang: speechLang,
      onInvalidate: () => loseDictation(token),
      onTranscript: (transcript, isFinal) => {
        if (dictationToken.current !== token || !isFinal) return;
        const blocked = unsupportedLanguageNotice(transcript, preferences.language);
        if (blocked) {
          setVoiceNote(blocked);
          onSpeakText(blocked);
          return;
        }
        heardDictation.current = true;
        setAnswer(key, transcript);
        setVoiceNote(page.voiceAdded);
      },
      onError: (message) => {
        if (dictationToken.current !== token) return;
        dictationToken.current += 1;
        voiceRef.current = null;
        releaseDictation();
        setDictating(false);
        setVoiceNote(/language-not-supported/i.test(message) ? page.languageNotSupported : message);
      },
      onEnd: () => {
        if (dictationToken.current !== token) return;
        const heard = heardDictation.current;
        dictationToken.current += 1;
        heardDictation.current = false;
        voiceRef.current = null;
        releaseDictation();
        setDictating(false);
        setVoiceNote((current) => noteAfterQuietDictation(preferences.language, current, heard));
      },
    });
    if (dictationToken.current !== token) {
      if (session?.isCurrent()) session.stop();
      return;
    }
    voiceRef.current = session;
    if (!session) {
      dictationToken.current += 1;
      releaseDictation();
      setDictating(false);
    }
  };

  if (submitted) {
    const summary = [
      `${page.applicationComplete}. OP-JOB-7352.`,
      `${page.youAppliedFor} ${jobTitle} · ${employer}.`,
      ...REVIEW_FIELDS.map(
        (field) => `${questionTitles[field.key]}: ${answers[field.key].trim() || page.notProvided}.`,
      ),
      page.agreed,
      page.thanksAndLuck,
    ].join(' ');

    return (
      <div className="bg-transparent high-contrast:bg-black" data-voice-scene="complete">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d4f9e] via-[#1a73e8] to-[#4aa3f0] px-6 py-8 text-white shadow-xl sm:px-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div
                className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-white text-[#1a73e8] shadow-lg ring-8 ring-white/20"
                aria-hidden="true"
              >
                <Check className="h-10 w-10" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d6ecff]">
                  {page.applicationComplete}
                </p>
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className="mt-2 font-display text-4xl font-bold leading-tight text-white focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f5a623]"
                >
                  {page.onItsWay}
                </h1>
                <p className="mt-3 max-w-xl text-base text-[#e7f3ff]">
                  {page.youAppliedFor} <strong className="text-white">{jobTitle}</strong> ·{' '}
                  <strong className="text-white">{employer}</strong>.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[page.referenceChip, page.submittedChip, page.calendarChip, page.stepChip].map(
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
            <section className="rounded-3xl border border-[#d5e6f7] bg-white p-6 high-contrast:border-white high-contrast:bg-black">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1565c0] high-contrast:text-yellow-300">
                {page.whatYouSent}
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold text-[#0e2a4a] high-contrast:text-white">
                {page.receipt}
              </h2>
              <p className="mt-4 font-display text-lg font-bold text-[#0e2a4a] high-contrast:text-white">
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
                      className="grid gap-1 border-b border-[#e1edf8] py-3 sm:grid-cols-[150px_1fr] high-contrast:border-white/20"
                    >
                      <dt className="text-sm text-slate-500 high-contrast:text-slate-300">{questionTitles[field.key]}</dt>
                      <dd
                        className={`font-semibold ${value ? 'text-[#0e2a4a] high-contrast:text-white' : 'text-slate-500 high-contrast:text-slate-300'}`}
                      >
                        {value || page.notProvided}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#0d4f9e] high-contrast:text-yellow-300">
                <Check className="h-4 w-4" aria-hidden="true" />
                {page.agreed}
              </p>
            </section>

            <section className="rounded-3xl border border-[#d5e6f7] bg-white p-6 high-contrast:border-white high-contrast:bg-black">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1565c0] high-contrast:text-yellow-300">
                {page.afterSubmit}
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold text-[#0e2a4a] high-contrast:text-white">
                {page.whatNext}
              </h2>
              <ol className="mt-4 space-y-4">
                <li className="flex gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#d7ebff] text-sm font-bold text-[#0d4f9e]">
                    1
                  </span>
                  <p className="text-sm text-slate-600 high-contrast:text-slate-200">
                    <strong className="block text-[#0e2a4a] high-contrast:text-white">
                      {page.reviewsTitle.replace('{employer}', employer)}
                    </strong>
                    {page.reviewsDetail}
                  </p>
                </li>
                <li className="flex gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#d7ebff] text-sm font-bold text-[#0d4f9e]">
                    2
                  </span>
                  <p className="text-sm text-slate-600 high-contrast:text-slate-200">
                    <strong className="block text-[#0e2a4a] high-contrast:text-white">
                      {page.supportTitle}
                    </strong>
                    {page.supportDetail}
                  </p>
                </li>
              </ol>
            </section>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('jobs')}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1a73e8] px-4 py-3 text-sm font-bold text-white hover:bg-[#0d4f9e]"
            >
              {page.browseMore}
            </button>
            <button
              type="button"
              onClick={() => readAloud(summary)}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-[#0e2a4a] hover:bg-[#d7ebff] high-contrast:text-white"
            >
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              {speaking ? page.stopReading : page.readConfirmation}
            </button>
          </div>
          <p
            data-voice-close
            className="mt-6 font-display text-2xl font-bold text-[#0e2a4a] high-contrast:text-white"
          >
            {page.thanksAndLuck}
          </p>
          <p className="sr-only" role="status">
            Application submitted. Reference OP-JOB-7352.
          </p>
        </div>
      </div>
    );
  }

  const question = step <= 5 ? QUESTION_STEPS[step - 1] : null;

  return (
    <div className="bg-transparent high-contrast:bg-black">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-slate-600 high-contrast:text-slate-200">
            <span>{page.progress}</span>
            <strong className="text-[#0e2a4a] high-contrast:text-white">Step {step} of 7</strong>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-[#e4eef8]"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={7}
            aria-label={`${page.progress} ${step} / 7`}
          >
            <div className="h-full bg-[#1a73e8]" style={{ width: `${(step / 7) * 100}%` }} />
          </div>
        </div>

        {question && (
          <>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1565c0] high-contrast:text-yellow-300">
              {page.applyingFor} {jobTitle}
            </p>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="mt-2 font-display text-4xl font-bold text-[#0e2a4a] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f5a623] high-contrast:text-white"
            >
              {questionTitles[question.key]}
            </h1>
            <p className="mt-3 text-slate-600 high-contrast:text-slate-200">
              {page.briefHint}
            </p>
            <button
              type="button"
              onClick={() => readAloud(questionTitles[question.key])}
              className="mt-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-[#0e2a4a] hover:bg-[#d7ebff] high-contrast:text-white"
            >
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              {speaking ? page.stopReading : page.readAloud}
            </button>
            <label className="mt-6 block text-sm font-semibold text-[#0e2a4a] high-contrast:text-white">
              {page.yourAnswer}
              <input
                type={question.type}
                value={answers[question.key]}
                onChange={(event) => setAnswer(question.key, event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#c5daf2] bg-white px-4 py-3 text-base text-[#0e2a4a] high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              />
            </label>
            <button
              type="button"
              onClick={() => dictate(question.key)}
              aria-pressed={dictating}
              aria-describedby={voiceNote ? 'application-dictation-status' : undefined}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#9eb8d6] bg-white px-4 py-3 text-sm font-bold text-[#0d4f9e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5a623] high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            >
              <Mic className="h-4 w-4" aria-hidden="true" />
              {page.answerByVoice}
            </button>
            {voiceNote && (
              <p id="application-dictation-status" role="status" className="mt-3 text-sm text-slate-600 high-contrast:text-slate-200">
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
              className="font-display text-4xl font-bold text-[#0e2a4a] focus:outline-none high-contrast:text-white"
            >
              {page.addCvTitle}
            </h1>
            <p className="mt-3 text-slate-600 high-contrast:text-slate-200">
              {page.addCvHint}
            </p>
            <div className="mt-6 rounded-2xl border border-dashed border-[#1a73e8] bg-white px-5 py-6 high-contrast:border-white high-contrast:bg-black">
              <strong className="text-[#0e2a4a] high-contrast:text-white" data-voice="cv-name">
                {answers.cv || page.chooseFile}
              </strong>
              <p className="mt-1 text-sm text-slate-500 high-contrast:text-slate-300">{page.fileHint}</p>
              <input
                id="cv-file"
                data-voice="file"
                type="file"
                accept=".pdf,.doc,.docx"
                className="sr-only"
                onChange={(event) => {
                  const picked = event.target.files?.[0]?.name || '';
                  event.currentTarget.setAttribute('data-picked', picked);
                  if (picked) setAnswer('cv', picked);
                }}
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  data-voice="open-file"
                  onClick={() => document.getElementById('cv-file')?.click()}
                  className="rounded-xl bg-[#1a73e8] px-4 py-3 text-sm font-bold text-white"
                >
                  {page.openFile}
                </button>
              </div>
            </div>
            <p className="mt-4 rounded-xl bg-[#e8f3ff] px-4 py-3 text-sm text-[#0e2a4a] high-contrast:bg-black high-contrast:text-white">
              {page.cannotUpload}
            </p>
          </>
        )}

        {step === 7 && (
          <>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="font-display text-4xl font-bold text-[#0e2a4a] focus:outline-none high-contrast:text-white"
            >
              {page.reviewTitle}
            </h1>
            <div className="mt-5 rounded-2xl bg-[#e8f3ff] px-4 py-4 text-[#0e2a4a] high-contrast:bg-black high-contrast:text-white">
              <strong>{page.youAreApplying}</strong>
              <br />
              {jobTitle} at {employer}
            </div>
            <dl className="mt-4 overflow-hidden rounded-2xl border border-[#d5e6f7] bg-white high-contrast:border-white high-contrast:bg-black">
              {REVIEW_FIELDS.map((field) => (
                <div
                  key={field.key}
                  className="grid grid-cols-[120px_1fr_auto] items-center gap-3 border-b border-[#e1edf8] px-4 py-3 last:border-0 high-contrast:border-white/20"
                >
                  <dt className="text-sm capitalize text-slate-500 high-contrast:text-slate-300">
                    {questionTitles[field.key]}
                  </dt>
                  <dd className="font-semibold text-[#0e2a4a] high-contrast:text-white">
                    {answers[field.key].trim() || page.notProvided}
                  </dd>
                  <button
                    type="button"
                    onClick={() => setStep(field.step)}
                    className="font-bold text-[#1a73e8] underline high-contrast:text-yellow-300"
                  >
                    {page.edit}
                  </button>
                </div>
              ))}
            </dl>
            <label className="mt-4 flex items-start gap-3 text-sm font-semibold text-[#0e2a4a] high-contrast:text-white">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(event) => setAgreed(event.target.checked)}
                className="mt-1"
              />
              {page.agree}
            </label>
          </>
        )}

        {formError && (
          <p
            role="alert"
            data-voice-fix={step === 6 ? 'file' : 'answer'}
            className="mt-6 rounded-xl bg-[#fdecec] px-4 py-3 text-sm font-semibold text-[#8a1f17]"
          >
            {formError}
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => (step === 1 ? onNavigate('jobs') : setStep(step - 1))}
            className="inline-flex items-center gap-2 rounded-xl border border-[#9eb8d6] bg-white px-4 py-3 text-sm font-bold text-[#0d4f9e] high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {page.back}
          </button>
          {step < 7 ? (
            <button
              type="button"
              data-voice="next"
              onClick={goNext}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1a73e8] px-4 py-3 text-sm font-bold text-white hover:bg-[#0d4f9e]"
            >
              {step === 6 ? page.reviewApplication : page.continue}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              data-voice="submit"
              disabled={!agreed}
              onClick={() => setSubmitted(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1a73e8] px-4 py-3 text-sm font-bold text-white hover:bg-[#0d4f9e] disabled:opacity-50"
            >
              {page.submitApplication}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
