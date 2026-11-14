import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ClipboardCopy,
  Volume2,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import {
  ApplicationDraft,
  NavigationView,
  VerificationReport,
} from '../types/accessbridge';

interface FinalReviewViewProps {
  draft: ApplicationDraft;
  report: VerificationReport;
  onNavigate: (view: NavigationView) => void;
  onSpeakText: (text: string) => void;
  onConfirmApplicationReady: () => void;
}

export const FinalReviewView: React.FC<FinalReviewViewProps> = ({
  draft,
  report,
  onNavigate,
  onSpeakText,
  onConfirmApplicationReady,
}) => {
  const [userConfirmed, setUserConfirmed] = useState(false);
  const [confirmedTimestamp, setConfirmedTimestamp] = useState<string | null>(null);
  const [copiedNotice, setCopiedNotice] = useState<string>('');

  const isReady = report.readinessStatus === 'Ready for submission';

  const handleConfirm = () => {
    if (!userConfirmed) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setConfirmedTimestamp(now);
    onConfirmApplicationReady();
    onSpeakText(
      `Application summary confirmed at ${now}. Remember to paste or submit manually on ${draft.platform}.`
    );
  };

  const handleCopyPacket = async () => {
    const packet = [
      `AllWays Verified Application Summary`,
      `Platform: ${draft.platform}`,
      `Employer: ${draft.employer}`,
      `Job Title: ${draft.jobTitle}`,
      `Hourly Rate: $${draft.hourlyRate}/hr`,
      `Availability: ${draft.availability}`,
      `Experience Level: ${draft.experienceLevel}`,
      `Contact Email: ${draft.contactEmail}`,
      `Portfolio URL: ${draft.portfolioUrl}`,
      `Attachments: ${draft.attachments.map((a) => a.name).join(', ') || 'None'}`,
      ``,
      `Cover Letter:`,
      draft.coverLetter,
      ``,
      `Screening Questions:`,
      ...draft.screeningAnswers.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`),
    ].join('\n');

    try {
      await navigator.clipboard.writeText(packet);
      setCopiedNotice('Copied formatted application summary to clipboard.');
    } catch {
      setCopiedNotice('Clipboard permission unavailable. You can select and copy the summary directly.');
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6 high-contrast:border-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#0056B3] high-contrast:text-cyan-300">
              Final Application Review
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-[#001F3F] high-contrast:text-white">
              Review & Confirm Before Manual Submission
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 high-contrast:text-slate-300">
              AllWays never submits applications automatically. Review every summarized detail
              below and explicitly confirm when you are ready.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              onSpeakText(
                `Final review for ${draft.jobTitle} at ${draft.employer}. Readiness status: ${report.readinessStatus}. Hourly rate: ${draft.hourlyRate} dollars. Availability: ${draft.availability}. Experience level: ${draft.experienceLevel}.`
              )
            }
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#001F3F] hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-yellow-300"
          >
            <Volume2 className="h-4 w-4" aria-hidden="true" />
            Read Final Summary
          </button>
        </div>
      </div>

      {/* Readiness Banner */}
      <div
        role="status"
        className={`mt-6 rounded-xl border-2 p-5 ${
          isReady
            ? 'border-[#1a73e8] bg-green-50 text-[#14532D] high-contrast:border-green-400 high-contrast:bg-black high-contrast:text-green-400'
            : report.readinessStatus === 'Requires correction'
              ? 'border-red-700 bg-red-50 text-red-900 high-contrast:border-red-400 high-contrast:bg-black high-contrast:text-red-400'
              : 'border-amber-600 bg-amber-50 text-amber-950 high-contrast:border-yellow-300 high-contrast:bg-black high-contrast:text-yellow-300'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            {isReady ? (
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
            ) : report.readinessStatus === 'Requires correction' ? (
              <XCircle className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
            ) : (
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
            )}
            <div>
              <h2 className="font-display text-lg font-bold">
                Readiness Status: {report.readinessStatus}
              </h2>
              <p className="mt-1 text-sm">{report.summaryMessage}</p>
            </div>
          </div>

          {!isReady && (
            <button
              type="button"
              onClick={() => onNavigate('verify')}
              className="rounded-lg bg-[#001F3F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#003366] high-contrast:bg-yellow-300 high-contrast:text-black"
            >
              Fix Issues in Verification Engine
            </button>
          )}
        </div>
      </div>

      {/* Application Summary Card */}
      <section
        aria-label="Application details summary"
        className="mt-6 rounded-xl border border-slate-200 bg-white p-6 high-contrast:border-white high-contrast:bg-black"
      >
        <h2 className="font-display text-xl font-bold text-[#001F3F] high-contrast:text-white">
          Application Summary
        </h2>

        <dl className="mt-5 grid grid-cols-1 gap-5 border-b border-slate-200 pb-6 sm:grid-cols-2 lg:grid-cols-3 high-contrast:border-slate-700">
          <div>
            <dt className="text-xs font-semibold text-slate-500 high-contrast:text-slate-400">
              Job Title
            </dt>
            <dd className="mt-1 text-sm font-semibold text-[#001F3F] high-contrast:text-white">
              {draft.jobTitle || '(Not provided)'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500 high-contrast:text-slate-400">
              Employer & Platform
            </dt>
            <dd className="mt-1 text-sm font-semibold text-[#001F3F] high-contrast:text-white">
              {draft.employer} · {draft.platform}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500 high-contrast:text-slate-400">
              Hourly Rate
            </dt>
            <dd className="mt-1 font-mono text-sm font-semibold tabular-nums text-[#001F3F] high-contrast:text-yellow-300">
              {draft.hourlyRate ? `$${draft.hourlyRate}/hr` : '(Not provided)'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500 high-contrast:text-slate-400">
              Availability
            </dt>
            <dd className="mt-1 text-sm font-semibold text-[#001F3F] high-contrast:text-white">
              {draft.availability || '(Not provided)'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500 high-contrast:text-slate-400">
              Experience Level
            </dt>
            <dd className="mt-1 text-sm font-semibold text-[#001F3F] high-contrast:text-white">
              {draft.experienceLevel}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500 high-contrast:text-slate-400">
              Contact Email & Portfolio
            </dt>
            <dd className="mt-1 text-xs text-slate-700 high-contrast:text-slate-200">
              <div>{draft.contactEmail || '(Missing email)'}</div>
              <div className="mt-0.5 font-mono break-all">
                {draft.portfolioUrl || '(Missing portfolio URL)'}
              </div>
            </dd>
          </div>
        </dl>

        {/* Cover Letter */}
        <div className="mt-6 border-b border-slate-200 pb-6 high-contrast:border-slate-700">
          <h3 className="font-display text-base font-bold text-[#001F3F] high-contrast:text-white">
            Cover Letter
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 high-contrast:text-slate-200">
            {draft.coverLetter || '(No cover letter written yet)'}
          </p>
        </div>

        {/* Attachments */}
        <div className="mt-6 border-b border-slate-200 pb-6 high-contrast:border-slate-700">
          <h3 className="font-display text-base font-bold text-[#001F3F] high-contrast:text-white">
            Attachments ({draft.attachments.length})
          </h3>
          {draft.attachments.length === 0 ? (
            <p className="mt-2 text-sm text-amber-700 high-contrast:text-yellow-300">
              No attachments included.
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-slate-700 high-contrast:text-slate-200">
              {draft.attachments.map((att) => (
                <li key={att.id}>
                  {att.name} <span className="font-mono text-xs text-slate-500">({att.sizeLabel})</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Screening Questions */}
        <div className="mt-6">
          <h3 className="font-display text-base font-bold text-[#001F3F] high-contrast:text-white">
            Screening Questions ({draft.screeningAnswers.length})
          </h3>
          <div className="mt-3 space-y-3">
            {draft.screeningAnswers.map((qa, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 high-contrast:border-slate-700 high-contrast:bg-neutral-950"
              >
                <p className="text-xs font-semibold text-[#001F3F] high-contrast:text-yellow-300">
                  Q{idx + 1}: {qa.question}
                </p>
                <p className="mt-1.5 text-sm text-slate-700 high-contrast:text-slate-200">
                  {qa.answer || '(Unanswered)'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Explicit User Confirmation Step */}
      <section
        aria-labelledby="explicit-confirm-heading"
        className="mt-6 rounded-xl border-2 border-[#001F3F] bg-white p-6 high-contrast:border-yellow-300 high-contrast:bg-black"
      >
        <div className="flex items-center gap-2 text-[#001F3F] high-contrast:text-yellow-300">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          <h2 id="explicit-confirm-heading" className="font-display text-lg font-bold">
            Explicit User Confirmation
          </h2>
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-slate-800 high-contrast:text-white">
          <input
            type="checkbox"
            checked={userConfirmed}
            onChange={(e) => setUserConfirmed(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-slate-400 accent-[#001F3F]"
          />
          <span>
            I have personally reviewed my job title, hourly rate, availability, experience level,
            contact details, cover letter, screening answers, and attachments. I understand
            AllWays will not submit this application automatically.
          </span>
        </label>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('apply')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#001F3F] hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Application Assistant
            </button>

            <button
              type="button"
              onClick={handleCopyPacket}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#001F3F] hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            >
              <ClipboardCopy className="h-4 w-4" aria-hidden="true" />
              Copy Summary for Platform Form
            </button>
          </div>

          <button
            type="button"
            disabled={!userConfirmed}
            onClick={handleConfirm}
            className={`rounded-lg px-6 py-3 text-sm font-semibold transition-colors ${
              userConfirmed
                ? 'bg-[#1a73e8] text-white hover:bg-[#166534] high-contrast:bg-green-400 high-contrast:text-black'
                : 'cursor-not-allowed bg-slate-200 text-slate-500 high-contrast:bg-neutral-800 high-contrast:text-slate-500'
            }`}
          >
            Confirm & Mark Ready for Manual Submission
          </button>
        </div>

        {copiedNotice && (
          <p role="status" className="mt-3 text-xs font-semibold text-[#0056B3] high-contrast:text-cyan-300">
            {copiedNotice}
          </p>
        )}

        {confirmedTimestamp && (
          <div
            role="status"
            className="mt-4 flex items-start gap-2 rounded-lg border border-green-300 bg-green-50 p-4 text-sm font-semibold text-[#1a73e8] high-contrast:border-green-400 high-contrast:bg-neutral-950 high-contrast:text-green-400"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>
              Confirmed at {confirmedTimestamp}. Your verified application summary is ready—you may
              now copy and submit it directly on {draft.platform}.
            </span>
          </div>
        )}
      </section>
    </div>
  );
};
