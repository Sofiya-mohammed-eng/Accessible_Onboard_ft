import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Volume2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { runDeterministicVerification } from '../engines/verificationEngine';
import {
  ActualApplicationValues,
  ApplicationDraft,
  ExperienceLevel,
  IntendedApplicationValues,
  NavigationView,
  VerificationStatus,
} from '../types/accessbridge';

interface VerificationEngineViewProps {
  intended: IntendedApplicationValues;
  draft: ApplicationDraft;
  onUpdateIntended: (next: IntendedApplicationValues) => void;
  onUpdateDraft: (next: ApplicationDraft) => void;
  onNavigate: (view: NavigationView) => void;
  onSpeakText: (text: string) => void;
  onLogVerification: (summary: string) => void;
}

export const VerificationEngineView: React.FC<VerificationEngineViewProps> = ({
  intended,
  draft,
  onUpdateIntended,
  onUpdateDraft,
  onNavigate,
  onSpeakText,
  onLogVerification,
}) => {
  const [uninspectableFields, setUninspectableFields] = useState<string[]>([]);

  const actualValues: ActualApplicationValues = useMemo(
    () => ({
      job_title: draft.jobTitle,
      hourly_rate: draft.hourlyRate,
      availability: draft.availability,
      experience_level: draft.experienceLevel,
      email: draft.contactEmail,
      portfolio_url: draft.portfolioUrl,
      cover_letter: draft.coverLetter,
      attachments_count: draft.attachments.length,
      screening_answers: draft.screeningAnswers,
      uninspectable_fields: uninspectableFields,
    }),
    [draft, uninspectableFields]
  );

  const report = useMemo(
    () => runDeterministicVerification(intended, actualValues),
    [intended, actualValues]
  );

  const loadRateMismatchScenario = () => {
    setUninspectableFields([]);
    onUpdateIntended({
      ...intended,
      job_title: 'DevSecOps Engineer',
      hourly_rate: 25,
      availability: '20 hours/week',
      experience_level: 'Intermediate',
    });
    onUpdateDraft({
      ...draft,
      jobTitle: 'DevSecOps Engineer',
      hourlyRate: '250',
      availability: '20 hours/week',
      experienceLevel: 'Intermediate',
    });
    onLogVerification('Tested $25 intended vs $250 actual rate mismatch scenario');
  };

  const loadMissingAndFormatErrorScenario = () => {
    setUninspectableFields([]);
    onUpdateDraft({
      ...draft,
      contactEmail: 'alex.morgan@invalid',
      portfolioUrl: 'github.com/missing-protocol',
      attachments: [],
    });
    onLogVerification('Tested invalid email, malformed URL, and missing attachment check');
  };

  const toggleUninspectableRate = () => {
    setUninspectableFields((prev) =>
      prev.includes('hourly_rate')
        ? prev.filter((f) => f !== 'hourly_rate')
        : [...prev, 'hourly_rate']
    );
  };

  const syncCleanDraftFromIntended = () => {
    setUninspectableFields([]);
    onUpdateDraft({
      ...draft,
      jobTitle: intended.job_title,
      hourlyRate: String(intended.hourly_rate),
      availability: intended.availability,
      experienceLevel: intended.experience_level,
      contactEmail: intended.email,
      portfolioUrl: intended.portfolio_url,
      attachments:
        draft.attachments.length >= intended.required_attachments_count
          ? draft.attachments
          : [
              {
                id: 'att-synced',
                name: 'Verified_Resume_Portfolio.pdf',
                type: 'application/pdf',
                sizeLabel: '240 KB',
              },
            ],
    });
    onLogVerification('Aligned actual application draft with intended values');
  };

  const renderStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-green-300 bg-green-50 px-2.5 py-1 text-xs font-semibold text-[#1a73e8] high-contrast:border-green-400 high-contrast:bg-black high-contrast:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Verified
          </span>
        );
      case 'error_detected':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 high-contrast:border-red-400 high-contrast:bg-black high-contrast:text-red-400">
            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Error detected
          </span>
        );
      case 'missing_information':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 high-contrast:border-yellow-300 high-contrast:bg-black high-contrast:text-yellow-300">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            Missing information
          </span>
        );
      case 'unable_to_verify':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 high-contrast:border-cyan-300 high-contrast:bg-black high-contrast:text-cyan-300">
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Unable to verify
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6 high-contrast:border-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#0056B3] high-contrast:text-cyan-300">
              Smart Verification Engine (Deterministic TypeScript Checks)
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-[#001F3F] high-contrast:text-white">
              Compare Intended vs. Actual Application Values
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 high-contrast:text-slate-300">
              Define what you intend to submit on the left, inspect or edit the entered form values
              on the right, and review deterministic verification results below. Uninspectable
              fields are always marked &ldquo;Unable to verify&rdquo;—never falsely passed.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              onSpeakText(
                `${report.summaryMessage} ${report.counts.verified} verified, ${report.counts.errors} errors detected, ${report.counts.missing} missing, ${report.counts.unableToVerify} unable to verify.`
              )
            }
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#001F3F] hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-yellow-300"
          >
            <Volume2 className="h-4 w-4" aria-hidden="true" />
            Read Verification Summary
          </button>
        </div>

        {/* Scenario Test Buttons */}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadRateMismatchScenario}
            className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 high-contrast:border-red-400 high-contrast:bg-black high-contrast:text-red-400"
          >
            Test $25 vs $250 Rate Mismatch
          </button>
          <button
            type="button"
            onClick={loadMissingAndFormatErrorScenario}
            className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 high-contrast:border-yellow-300 high-contrast:bg-black high-contrast:text-yellow-300"
          >
            Test Invalid Email / URL / Missing Attachment
          </button>
          <button
            type="button"
            onClick={toggleUninspectableRate}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 high-contrast:border-cyan-300 high-contrast:bg-black high-contrast:text-cyan-300"
          >
            {uninspectableFields.includes('hourly_rate')
              ? 'Restore Rate Field Inspection'
              : 'Simulate Uninspectable Rate Field'}
          </button>
          <button
            type="button"
            onClick={syncCleanDraftFromIntended}
            className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3.5 py-2 text-xs font-semibold text-[#1a73e8] hover:bg-green-100 high-contrast:border-green-400 high-contrast:bg-black high-contrast:text-green-400"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Align Draft to Intended Values
          </button>
        </div>
      </div>

      {/* Prominent Alert Banner */}
      <div
        role="status"
        aria-live="polite"
        className={`mt-6 rounded-xl border-2 p-5 ${
          report.overallStatus === 'verified'
            ? 'border-[#1a73e8] bg-green-50 text-[#14532D] high-contrast:border-green-400 high-contrast:bg-black high-contrast:text-green-400'
            : report.overallStatus === 'error_detected'
              ? 'border-red-700 bg-red-50 text-red-900 high-contrast:border-red-400 high-contrast:bg-black high-contrast:text-red-400'
              : 'border-amber-600 bg-amber-50 text-amber-950 high-contrast:border-yellow-300 high-contrast:bg-black high-contrast:text-yellow-300'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            {report.overallStatus === 'verified' ? (
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
            ) : report.overallStatus === 'error_detected' ? (
              <XCircle className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
            ) : (
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
            )}
            <div>
              <p className="font-display text-lg font-bold">
                Readiness: {report.readinessStatus}
              </p>
              <p className="mt-1 text-sm font-medium">{report.summaryMessage}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 font-mono text-xs font-semibold tabular-nums">
            <span>Verified: {report.counts.verified}</span>
            <span>Errors: {report.counts.errors}</span>
            <span>Missing: {report.counts.missing}</span>
            <span>Unable to verify: {report.counts.unableToVerify}</span>
          </div>
        </div>
      </div>

      {/* Intended vs Actual Editable Panels */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Intended Values */}
        <section
          aria-labelledby="intended-values-heading"
          className="rounded-xl border border-slate-200 bg-white p-6 high-contrast:border-white high-contrast:bg-black"
        >
          <h2
            id="intended-values-heading"
            className="font-display text-lg font-bold text-[#001F3F] high-contrast:text-white"
          >
            Intended Application Values (Your Target)
          </h2>
          <p className="mt-1 text-xs text-slate-600 high-contrast:text-slate-300">
            AllWays treats these values as your source of truth.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="intended-job-title"
                className="block text-xs font-semibold text-[#001F3F] high-contrast:text-white"
              >
                Intended Job Title
              </label>
              <input
                id="intended-job-title"
                type="text"
                value={intended.job_title}
                onChange={(e) => onUpdateIntended({ ...intended, job_title: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="intended-hourly-rate"
                className="block text-xs font-semibold text-[#001F3F] high-contrast:text-white"
              >
                Intended Hourly Rate ($ USD)
              </label>
              <input
                id="intended-hourly-rate"
                type="number"
                value={intended.hourly_rate}
                onChange={(e) =>
                  onUpdateIntended({ ...intended, hourly_rate: Number(e.target.value) || 0 })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="intended-availability"
                className="block text-xs font-semibold text-[#001F3F] high-contrast:text-white"
              >
                Intended Availability
              </label>
              <input
                id="intended-availability"
                type="text"
                value={intended.availability}
                onChange={(e) => onUpdateIntended({ ...intended, availability: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="intended-experience"
                className="block text-xs font-semibold text-[#001F3F] high-contrast:text-white"
              >
                Intended Experience Level
              </label>
              <select
                id="intended-experience"
                value={intended.experience_level}
                onChange={(e) =>
                  onUpdateIntended({
                    ...intended,
                    experience_level: e.target.value as ExperienceLevel,
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              >
                <option value="Entry">Entry</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Expert">Expert</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="intended-email"
                className="block text-xs font-semibold text-[#001F3F] high-contrast:text-white"
              >
                Intended Email
              </label>
              <input
                id="intended-email"
                type="email"
                value={intended.email}
                onChange={(e) => onUpdateIntended({ ...intended, email: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="intended-portfolio"
                className="block text-xs font-semibold text-[#001F3F] high-contrast:text-white"
              >
                Intended Portfolio URL
              </label>
              <input
                id="intended-portfolio"
                type="url"
                value={intended.portfolio_url}
                onChange={(e) => onUpdateIntended({ ...intended, portfolio_url: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              />
            </div>
          </div>

          <pre className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 p-3 text-xs text-slate-100 high-contrast:border-white">
            {JSON.stringify(
              {
                job_title: intended.job_title,
                hourly_rate: intended.hourly_rate,
                availability: intended.availability,
                experience_level: intended.experience_level,
              },
              null,
              2
            )}
          </pre>
        </section>

        {/* Actual Entered Values */}
        <section
          aria-labelledby="actual-values-heading"
          className="rounded-xl border border-slate-200 bg-white p-6 high-contrast:border-white high-contrast:bg-black"
        >
          <h2
            id="actual-values-heading"
            className="font-display text-lg font-bold text-[#001F3F] high-contrast:text-white"
          >
            Actual Entered Values (Form State)
          </h2>
          <p className="mt-1 text-xs text-slate-600 high-contrast:text-slate-300">
            Edit any field below to correct errors or test real-time discrepancy detection.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="actual-job-title"
                className="block text-xs font-semibold text-[#001F3F] high-contrast:text-white"
              >
                Entered Job Title
              </label>
              <input
                id="actual-job-title"
                type="text"
                value={draft.jobTitle}
                onChange={(e) => onUpdateDraft({ ...draft, jobTitle: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="actual-hourly-rate"
                className="block text-xs font-semibold text-[#001F3F] high-contrast:text-white"
              >
                Entered Hourly Rate ($ USD)
              </label>
              <input
                id="actual-hourly-rate"
                type="text"
                value={draft.hourlyRate}
                onChange={(e) => onUpdateDraft({ ...draft, hourlyRate: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="actual-availability"
                className="block text-xs font-semibold text-[#001F3F] high-contrast:text-white"
              >
                Entered Availability
              </label>
              <input
                id="actual-availability"
                type="text"
                value={draft.availability}
                onChange={(e) => onUpdateDraft({ ...draft, availability: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="actual-experience"
                className="block text-xs font-semibold text-[#001F3F] high-contrast:text-white"
              >
                Entered Experience Level
              </label>
              <select
                id="actual-experience"
                value={draft.experienceLevel}
                onChange={(e) =>
                  onUpdateDraft({
                    ...draft,
                    experienceLevel: e.target.value as ExperienceLevel,
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              >
                <option value="Entry">Entry</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Expert">Expert</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="actual-email"
                className="block text-xs font-semibold text-[#001F3F] high-contrast:text-white"
              >
                Entered Contact Email
              </label>
              <input
                id="actual-email"
                type="text"
                value={draft.contactEmail}
                onChange={(e) => onUpdateDraft({ ...draft, contactEmail: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="actual-portfolio"
                className="block text-xs font-semibold text-[#001F3F] high-contrast:text-white"
              >
                Entered Portfolio URL
              </label>
              <input
                id="actual-portfolio"
                type="text"
                value={draft.portfolioUrl}
                onChange={(e) => onUpdateDraft({ ...draft, portfolioUrl: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('apply')}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#001F3F] hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            >
              Edit Cover Letter & Attachments in Assistant
            </button>
          </div>
        </section>
      </div>

      {/* Field-by-Field Deterministic Comparison Table */}
      <section
        aria-labelledby="verification-table-heading"
        className="mt-8 rounded-xl border border-slate-200 bg-white high-contrast:border-white high-contrast:bg-black"
      >
        <div className="border-b border-slate-200 px-6 py-4 high-contrast:border-white">
          <h2
            id="verification-table-heading"
            className="font-display text-lg font-bold text-[#001F3F] high-contrast:text-white"
          >
            Field-by-Field Verification Audit
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 high-contrast:border-white high-contrast:bg-neutral-950 high-contrast:text-white">
                <th scope="col" className="px-6 py-3.5">
                  Field
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Intended Value
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Actual Entered Value
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Status
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Finding & Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 high-contrast:divide-slate-700">
              {report.checks.map((check) => (
                <tr key={check.fieldKey} className="align-top">
                  <th
                    scope="row"
                    className="px-6 py-4 font-semibold text-[#001F3F] high-contrast:text-white"
                  >
                    {check.fieldLabel}
                  </th>
                  <td className="px-6 py-4 font-mono text-xs text-slate-700 high-contrast:text-slate-200">
                    {check.intendedDisplay}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-900 high-contrast:text-yellow-300">
                    {check.actualDisplay}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{renderStatusBadge(check.status)}</td>
                  <td className="px-6 py-4 text-xs leading-relaxed text-slate-700 high-contrast:text-slate-200">
                    <p className="font-semibold">{check.message}</p>
                    {check.remediation && (
                      <p className="mt-1 text-slate-600 high-contrast:text-slate-300">
                        Recommended fix: {check.remediation}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-4">
        <button
          type="button"
          onClick={() => onNavigate('review')}
          className="inline-flex items-center gap-2 rounded-lg bg-[#001F3F] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#003366] high-contrast:bg-yellow-300 high-contrast:text-black"
        >
          Proceed to Final Application Review
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
