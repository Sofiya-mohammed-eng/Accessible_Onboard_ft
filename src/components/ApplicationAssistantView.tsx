import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Save,
  ArrowRight,
  Paperclip,
  Trash2,
  CheckCircle2,
  Info,
  MessageSquarePlus,
} from 'lucide-react';
import {
  detectSpeechSupport,
  startVoiceDictation,
  VoiceInputSession,
} from '../engines/accessibilityEngine';
import {
  AccessibilityPreferences,
  ApplicationDraft,
  ExperienceLevel,
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

const QUICK_PHRASES = [
  'I am available for asynchronous written updates and accessible documentation workflows.',
  'My background includes automated security checks, clean code reviews, and reliable weekly delivery.',
  'I welcome written screening follow-ups and flexible milestone planning.',
];

export const ApplicationAssistantView: React.FC<ApplicationAssistantViewProps> = ({
  draft,
  preferences,
  onUpdateDraft,
  onSaveDraft,
  onNavigate,
  onSpeakText,
}) => {
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [stepMode, setStepMode] = useState<boolean>(preferences.stepByStepNavigation);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceStatus, setVoiceStatus] = useState<string>('');
  const [saveNotice, setSaveNotice] = useState<string>('');
  const voiceSessionRef = useRef<VoiceInputSession | null>(null);
  const speechSupport = detectSpeechSupport();

  useEffect(() => {
    setStepMode(preferences.stepByStepNavigation);
  }, [preferences.stepByStepNavigation]);

  useEffect(() => {
    return () => {
      voiceSessionRef.current?.stop();
    };
  }, []);

  const completedStepsCount = [
    Boolean(draft.jobTitle.trim() && draft.contactEmail.trim() && draft.portfolioUrl.trim()),
    Boolean(draft.hourlyRate.trim() && draft.availability.trim() && draft.experienceLevel),
    Boolean(draft.coverLetter.trim().length >= 40),
    draft.screeningAnswers.every((qa) => Boolean(qa.answer.trim())),
    draft.attachments.length > 0,
  ].filter(Boolean).length;

  const progressPercent = Math.round((completedStepsCount / 5) * 100);

  const handleToggleVoice = (targetField: 'coverLetter' | number) => {
    if (isListening) {
      voiceSessionRef.current?.stop();
      voiceSessionRef.current = null;
      setIsListening(false);
      setVoiceStatus('Voice dictation paused.');
      return;
    }

    setVoiceStatus('Listening... Speak clearly, or click Stop Dictation when finished.');
    setIsListening(true);

    const session = startVoiceDictation({
      onTranscript: (transcript, isFinal) => {
        if (!isFinal) {
          setVoiceStatus(`Hearing: "${transcript}"`);
          return;
        }
        if (targetField === 'coverLetter') {
          const separator = draft.coverLetter.trim() ? ' ' : '';
          onUpdateDraft({
            ...draft,
            coverLetter: `${draft.coverLetter.trim()}${separator}${transcript}`,
          });
        } else {
          const nextAnswers = draft.screeningAnswers.map((qa, idx) =>
            idx === targetField
              ? {
                  ...qa,
                  answer: `${qa.answer.trim()}${qa.answer.trim() ? ' ' : ''}${transcript}`,
                }
              : qa
          );
          onUpdateDraft({ ...draft, screeningAnswers: nextAnswers });
        }
        setVoiceStatus('Dictated text added cleanly.');
      },
      onError: (msg) => {
        setVoiceStatus(msg);
        setIsListening(false);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });

    if (!session) {
      setIsListening(false);
    } else {
      voiceSessionRef.current = session;
    }
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const added = Array.from(files).map((file) => ({
      id: `att-${Date.now()}-${file.name}`,
      name: file.name,
      type: file.type || 'application/octet-stream',
      sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
    }));
    onUpdateDraft({
      ...draft,
      attachments: [...draft.attachments, ...added],
    });
    e.target.value = '';
  };

  const handleSaveAndNotify = () => {
    onSaveDraft();
    const msg = `Application draft saved locally at ${new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}.`;
    setSaveNotice(msg);
    onSpeakText(msg);
  };

  const showSection = (idx: number) => !stepMode || stepIndex === idx;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header & Progress */}
      <div className="border-b border-slate-200 pb-6 high-contrast:border-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#0056B3] high-contrast:text-cyan-300">
              Application Assistant
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-[#001F3F] high-contrast:text-white">
              Prepare Your Application Safely
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 high-contrast:text-slate-300">
              {preferences.simplifiedInstructions
                ? 'Fill out each box at your own pace using typing, voice dictation, or quick phrases. AccessBridge never submits automatically.'
                : 'Draft and review every application field locally. You stay in complete control—AccessBridge checks your inputs before you manually submit on the target platform.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setStepMode((prev) => !prev)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#001F3F] hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
          >
            {stepMode ? 'Switch to Full Form View' : 'Switch to Step-by-Step View'}
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 high-contrast:text-slate-200">
            <span>Preparation Progress ({completedStepsCount} of 5 sections complete)</span>
            <span className="font-mono tabular-nums">{progressPercent}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Application preparation progress"
            className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 high-contrast:bg-neutral-800"
          >
            <div
              className="h-full bg-[#007BFF] transition-all high-contrast:bg-yellow-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Step Navigation Tabs when Step Mode is on */}
        {stepMode && (
          <nav aria-label="Application steps" className="mt-5 flex flex-wrap gap-2">
            {[
              '1. Role & Contact',
              '2. Rate & Experience',
              '3. Cover Letter',
              '4. Screening Questions',
              '5. Attachments',
            ].map((label, idx) => (
              <button
                key={label}
                type="button"
                onClick={() => setStepIndex(idx)}
                aria-current={stepIndex === idx ? 'step' : undefined}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold ${
                  stepIndex === idx
                    ? 'bg-[#001F3F] text-white high-contrast:bg-yellow-300 high-contrast:text-black'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* Browser Speech Support Banner */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700 high-contrast:border-white high-contrast:bg-black high-contrast:text-slate-200">
        <div>
          <span className="font-semibold text-[#001F3F] high-contrast:text-yellow-300">
            Voice Input Status:
          </span>{' '}
          {speechSupport.recognitionSupported
            ? `Available (${speechSupport.recognitionEngineName}). Text input and quick-phrase buttons remain available at all times.`
            : 'Speech recognition is not supported in this browser. Full accessible text input and quick-phrase insertion are ready below.'}
        </div>
        {voiceStatus && (
          <span role="status" className="font-semibold text-[#0056B3] high-contrast:text-cyan-300">
            {voiceStatus}
          </span>
        )}
      </div>

      {/* Form Sections */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSaveAndNotify();
          onNavigate('verify');
        }}
        className="mt-6 space-y-6"
      >
        {/* Section 1: Role & Contact */}
        {showSection(0) && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 high-contrast:border-white high-contrast:bg-black">
            <h2 className="font-display text-lg font-bold text-[#001F3F] high-contrast:text-white">
              1. Role & Contact Information
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="draft-job-title"
                  className="block text-sm font-semibold text-[#001F3F] high-contrast:text-white"
                >
                  Job Title (Required)
                </label>
                <input
                  id="draft-job-title"
                  type="text"
                  value={draft.jobTitle}
                  onChange={(e) => onUpdateDraft({ ...draft, jobTitle: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="draft-employer"
                  className="block text-sm font-semibold text-[#001F3F] high-contrast:text-white"
                >
                  Employer / Platform
                </label>
                <input
                  id="draft-employer"
                  type="text"
                  value={draft.employer}
                  onChange={(e) => onUpdateDraft({ ...draft, employer: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="draft-email"
                  className="block text-sm font-semibold text-[#001F3F] high-contrast:text-white"
                >
                  Contact Email (Required)
                </label>
                <input
                  id="draft-email"
                  type="email"
                  value={draft.contactEmail}
                  onChange={(e) => onUpdateDraft({ ...draft, contactEmail: e.target.value })}
                  placeholder="name@example.org"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="draft-portfolio"
                  className="block text-sm font-semibold text-[#001F3F] high-contrast:text-white"
                >
                  Portfolio or GitHub URL (Required)
                </label>
                <input
                  id="draft-portfolio"
                  type="url"
                  value={draft.portfolioUrl}
                  onChange={(e) => onUpdateDraft({ ...draft, portfolioUrl: e.target.value })}
                  placeholder="https://github.com/username"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
                />
              </div>
            </div>
          </section>
        )}

        {/* Section 2: Rate, Availability & Experience */}
        {showSection(1) && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 high-contrast:border-white high-contrast:bg-black">
            <h2 className="font-display text-lg font-bold text-[#001F3F] high-contrast:text-white">
              2. Rate, Availability & Experience Level
            </h2>
            <p className="mt-1 text-xs text-slate-600 high-contrast:text-slate-300">
              Double-check numeric digits here. The Verification Engine compares these directly
              against your intended values.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="draft-rate"
                  className="block text-sm font-semibold text-[#001F3F] high-contrast:text-white"
                >
                  Hourly Rate ($ USD/hr)
                </label>
                <input
                  id="draft-rate"
                  type="text"
                  inputMode="decimal"
                  value={draft.hourlyRate}
                  onChange={(e) => onUpdateDraft({ ...draft, hourlyRate: e.target.value })}
                  placeholder="25"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono tabular-nums text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="draft-availability"
                  className="block text-sm font-semibold text-[#001F3F] high-contrast:text-white"
                >
                  Weekly Availability
                </label>
                <input
                  id="draft-availability"
                  type="text"
                  value={draft.availability}
                  onChange={(e) => onUpdateDraft({ ...draft, availability: e.target.value })}
                  placeholder="20 hours/week"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="draft-experience"
                  className="block text-sm font-semibold text-[#001F3F] high-contrast:text-white"
                >
                  Experience Level
                </label>
                <select
                  id="draft-experience"
                  value={draft.experienceLevel}
                  onChange={(e) =>
                    onUpdateDraft({
                      ...draft,
                      experienceLevel: e.target.value as ExperienceLevel,
                    })
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
                >
                  <option value="Entry">Entry</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>
            </div>
          </section>
        )}

        {/* Section 3: Cover Letter with Voice & Quick-Phrase Input */}
        {showSection(2) && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 high-contrast:border-white high-contrast:bg-black">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-[#001F3F] high-contrast:text-white">
                  3. Cover Letter
                </h2>
                <p className="mt-0.5 text-xs text-slate-600 high-contrast:text-slate-300">
                  Type directly, dictate with your microphone, or insert accessible quick phrases.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleToggleVoice('coverLetter')}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors ${
                  isListening
                    ? 'border-red-700 bg-red-700 text-white'
                    : 'border-[#0056B3] bg-white text-[#0056B3] hover:bg-blue-50 high-contrast:border-yellow-300 high-contrast:bg-black high-contrast:text-yellow-300'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="h-4 w-4" aria-hidden="true" />
                    Stop Voice Dictation
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" aria-hidden="true" />
                    Dictate Cover Letter
                  </>
                )}
              </button>
            </div>

            <label htmlFor="draft-cover-letter" className="sr-only">
              Cover Letter Text
            </label>
            <textarea
              id="draft-cover-letter"
              rows={5}
              value={draft.coverLetter}
              onChange={(e) => onUpdateDraft({ ...draft, coverLetter: e.target.value })}
              placeholder="Write or dictate why your skills fit this role..."
              className="mt-3 w-full rounded-lg border border-slate-300 bg-white p-3.5 text-sm leading-relaxed text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            />

            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-700 high-contrast:text-slate-200">
                Alternative Input — Quick Phrases (click to append):
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK_PHRASES.map((phrase, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      onUpdateDraft({
                        ...draft,
                        coverLetter: `${draft.coverLetter.trim()}${
                          draft.coverLetter.trim() ? ' ' : ''
                        }${phrase}`,
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-left text-xs text-slate-800 hover:bg-slate-100 high-contrast:border-white high-contrast:bg-neutral-900 high-contrast:text-white"
                  >
                    <MessageSquarePlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{phrase.slice(0, 48)}...</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Section 4: Screening Questions */}
        {showSection(3) && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 high-contrast:border-white high-contrast:bg-black">
            <h2 className="font-display text-lg font-bold text-[#001F3F] high-contrast:text-white">
              4. Screening Questions
            </h2>
            <div className="mt-4 space-y-4">
              {draft.screeningAnswers.map((qa, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 high-contrast:border-slate-700 high-contrast:bg-neutral-950"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label
                      htmlFor={`screening-q-${index}`}
                      className="text-sm font-semibold text-[#001F3F] high-contrast:text-white"
                    >
                      Question {index + 1}: {qa.question}
                    </label>
                    <button
                      type="button"
                      onClick={() => handleToggleVoice(index)}
                      className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-[#001F3F] hover:bg-slate-100 high-contrast:border-white high-contrast:bg-black high-contrast:text-yellow-300"
                    >
                      <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                      Dictate Answer
                    </button>
                  </div>
                  <textarea
                    id={`screening-q-${index}`}
                    rows={3}
                    value={qa.answer}
                    onChange={(e) => {
                      const next = draft.screeningAnswers.map((item, i) =>
                        i === index ? { ...item, answer: e.target.value } : item
                      );
                      onUpdateDraft({ ...draft, screeningAnswers: next });
                    }}
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 5: Portfolio Attachments */}
        {showSection(4) && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 high-contrast:border-white high-contrast:bg-black">
            <h2 className="font-display text-lg font-bold text-[#001F3F] high-contrast:text-white">
              5. Portfolio & Resume Attachments
            </h2>
            <p className="mt-1 text-xs text-slate-600 high-contrast:text-slate-300">
              Select a local file (only filename and size metadata are recorded locally—no files are
              uploaded).
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-[#0056B3] bg-blue-50/50 px-4 py-2.5 text-sm font-semibold text-[#0056B3] hover:bg-blue-50 high-contrast:border-yellow-300 high-contrast:bg-black high-contrast:text-yellow-300">
                <Paperclip className="h-4 w-4" aria-hidden="true" />
                <span>Attach File Metadata</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFilePick}
                  className="sr-only"
                />
              </label>

              <button
                type="button"
                onClick={() =>
                  onUpdateDraft({
                    ...draft,
                    attachments: [
                      ...draft.attachments,
                      {
                        id: `att-sample-${Date.now()}`,
                        name: 'Accessible_Portfolio_Work_Samples.pdf',
                        type: 'application/pdf',
                        sizeLabel: '412 KB',
                      },
                    ],
                  })
                }
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-[#001F3F] hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              >
                + Add Sample Portfolio PDF
              </button>
            </div>

            {draft.attachments.length === 0 ? (
              <p className="mt-4 text-sm text-amber-700 high-contrast:text-yellow-300">
                No attachments selected yet.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 high-contrast:divide-slate-700 high-contrast:border-white">
                {draft.attachments.map((att) => (
                  <li key={att.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <div>
                      <span className="font-semibold text-[#001F3F] high-contrast:text-white">
                        {att.name}
                      </span>
                      <span className="ml-2 font-mono text-xs text-slate-500 high-contrast:text-slate-400">
                        ({att.sizeLabel})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateDraft({
                          ...draft,
                          attachments: draft.attachments.filter((a) => a.id !== att.id),
                        })
                      }
                      aria-label={`Remove ${att.name}`}
                      className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 high-contrast:border-red-400 high-contrast:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Stepper Footer or Full-Form Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6 high-contrast:border-white">
          <div className="flex flex-wrap items-center gap-3">
            {stepMode && stepIndex > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#001F3F] hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              >
                ← Previous Step
              </button>
            )}
            {stepMode && stepIndex < 4 && (
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.min(4, i + 1))}
                className="rounded-lg border border-[#0056B3] bg-white px-4 py-2.5 text-sm font-semibold text-[#0056B3] hover:bg-blue-50 high-contrast:border-cyan-300 high-contrast:bg-black high-contrast:text-cyan-300"
              >
                Next Step →
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveAndNotify}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#001F3F] hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Save Draft Locally
            </button>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-[#001F3F] px-6 py-3 text-sm font-semibold text-white hover:bg-[#003366] high-contrast:bg-yellow-300 high-contrast:text-black"
          >
            Save & Proceed to Verification Engine
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {saveNotice && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm font-semibold text-[#15803D] high-contrast:border-green-400 high-contrast:bg-black high-contrast:text-green-400"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{saveNotice}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-slate-600 high-contrast:text-slate-300">
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Safety rule: AccessBridge prepares and checks your inputs, and never automatically
            submits applications to external sites.
          </span>
        </div>
      </form>
    </div>
  );
};
