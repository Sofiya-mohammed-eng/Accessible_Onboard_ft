import React, { useMemo, useState } from 'react';
import { Volume2, CheckCircle2, ArrowRight, Info } from 'lucide-react';
import {
  filterSampleJobs,
  generateJobBreakdown,
} from '../engines/jobDiscovery';
import {
  ExperienceLevel,
  JobListing,
  JobSearchCriteria,
  WorkArrangement,
} from '../types/accessbridge';

interface JobDiscoveryViewProps {
  onSelectJobForApplication: (job: JobListing) => void;
  onSpeakText: (text: string) => void;
  simplifiedInstructions: boolean;
}

export const JobDiscoveryView: React.FC<JobDiscoveryViewProps> = ({
  onSelectJobForApplication,
  onSpeakText,
  simplifiedInstructions,
}) => {
  const [criteria, setCriteria] = useState<JobSearchCriteria>({
    query: '',
    skills: '',
    arrangement: 'Any',
    experienceLevel: 'Any',
    minHourlyRate: 0,
  });
  const [selectedJobId, setSelectedJobId] = useState<string>('job-upwork-devsecops');

  const filteredJobs = useMemo(() => filterSampleJobs(criteria), [criteria]);
  const selectedJob =
    filteredJobs.find((j) => j.id === selectedJobId) || filteredJobs[0] || null;

  const breakdown = useMemo(
    () => (selectedJob ? generateJobBreakdown(selectedJob, criteria.skills) : null),
    [selectedJob, criteria.skills]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6 high-contrast:border-white">
        <p className="text-sm font-semibold text-[#0056B3] high-contrast:text-cyan-300">
          Job Discovery Assistant
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-[#001F3F] high-contrast:text-white">
          Explore Sample Opportunities & Plain-Language Breakdowns
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 high-contrast:text-slate-300">
          {simplifiedInstructions
            ? 'Type a job title or skill below to filter sample jobs. Select any job to read a plain-language summary and start your application.'
            : 'Filter curated sample listings across Upwork, LinkedIn, Indeed, Freelancer, and Fiverr. All listings below are local sample data—AccessBridge never fabricates live employment feeds.'}
        </p>
      </div>

      {/* Search & Preference Filters */}
      <section
        aria-label="Job search criteria"
        className="mt-6 rounded-xl border border-slate-200 bg-white p-6 high-contrast:border-white high-contrast:bg-black"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label
              htmlFor="job-title-filter"
              className="block text-xs font-semibold text-[#001F3F] high-contrast:text-white"
            >
              Job Title or Keyword
            </label>
            <input
              id="job-title-filter"
              type="text"
              value={criteria.query}
              onChange={(e) => setCriteria((prev) => ({ ...prev, query: e.target.value }))}
              placeholder="e.g., DevSecOps, QA, Writer"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="job-skills-filter"
              className="block text-xs font-semibold text-[#001F3F] high-contrast:text-white"
            >
              Your Skills (comma-separated)
            </label>
            <input
              id="job-skills-filter"
              type="text"
              value={criteria.skills}
              onChange={(e) => setCriteria((prev) => ({ ...prev, skills: e.target.value }))}
              placeholder="e.g., React, ARIA, Terraform"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="job-arrangement-filter"
              className="block text-xs font-semibold text-[#001F3F] high-contrast:text-white"
            >
              Working Arrangement
            </label>
            <select
              id="job-arrangement-filter"
              value={criteria.arrangement}
              onChange={(e) =>
                setCriteria((prev) => ({
                  ...prev,
                  arrangement: e.target.value as WorkArrangement | 'Any',
                }))
              }
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            >
              <option value="Any">Any arrangement</option>
              <option value="Remote">Remote</option>
              <option value="Async-friendly">Async-friendly</option>
              <option value="Flexible hours">Flexible hours</option>
              <option value="Part-time">Part-time</option>
              <option value="Full-time">Full-time</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="job-exp-filter"
              className="block text-xs font-semibold text-[#001F3F] high-contrast:text-white"
            >
              Experience Level
            </label>
            <select
              id="job-exp-filter"
              value={criteria.experienceLevel}
              onChange={(e) =>
                setCriteria((prev) => ({
                  ...prev,
                  experienceLevel: e.target.value as ExperienceLevel | 'Any',
                }))
              }
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            >
              <option value="Any">Any level</option>
              <option value="Entry">Entry</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Expert">Expert</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="job-rate-filter"
              className="block text-xs font-semibold text-[#001F3F] high-contrast:text-white"
            >
              Min Expected Rate ($/hr)
            </label>
            <input
              id="job-rate-filter"
              type="number"
              min={0}
              value={criteria.minHourlyRate || ''}
              onChange={(e) =>
                setCriteria((prev) => ({
                  ...prev,
                  minHourlyRate: Number(e.target.value) || 0,
                }))
              }
              placeholder="e.g., 25"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono tabular-nums text-slate-900 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            />
          </div>
        </div>
      </section>

      {/* Split Layout: Sample Listings + Plain-Language Breakdown */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section aria-label="Sample employment opportunities" className="space-y-4 lg:col-span-6">
          <div className="flex items-center justify-between text-xs text-slate-600 high-contrast:text-slate-300">
            <span>Showing {filteredJobs.length} sample listings</span>
            <span>Local demonstration dataset</span>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 high-contrast:border-white high-contrast:bg-black high-contrast:text-slate-300">
              <p>No sample opportunities match your current filters.</p>
              <button
                type="button"
                onClick={() =>
                  setCriteria({
                    query: '',
                    skills: '',
                    arrangement: 'Any',
                    experienceLevel: 'Any',
                    minHourlyRate: 0,
                  })
                }
                className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-[#001F3F] hover:bg-slate-50 high-contrast:border-white high-contrast:text-white"
              >
                Reset Job Filters
              </button>
            </div>
          ) : (
            filteredJobs.map((job) => {
              const isSelected = selectedJob?.id === job.id;
              return (
                <article
                  key={job.id}
                  className={`rounded-xl border-2 bg-white p-5 transition-colors high-contrast:bg-black ${
                    isSelected
                      ? 'border-[#0056B3] high-contrast:border-yellow-300'
                      : 'border-slate-200 hover:border-slate-300 high-contrast:border-slate-600'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 high-contrast:text-slate-400">
                    <span className="font-semibold text-[#0056B3] high-contrast:text-cyan-300">
                      {job.platform} Sample
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{job.employer}</span>
                    <span aria-hidden="true">·</span>
                    <span>{job.experienceLevel}</span>
                  </div>

                  <h2 className="mt-1.5 font-display text-lg font-bold text-[#001F3F] high-contrast:text-white">
                    {job.title}
                  </h2>

                  <p className="mt-1 font-mono text-xs font-semibold tabular-nums text-[#15803D] high-contrast:text-green-400">
                    {job.paymentDisplay}
                  </p>

                  <p className="mt-2.5 text-sm leading-relaxed text-slate-600 high-contrast:text-slate-300">
                    {job.description}
                  </p>

                  <p className="mt-3 text-xs text-slate-500 high-contrast:text-slate-400">
                    Skills: {job.requiredSkills.join(' · ')}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedJobId(job.id)}
                      className={`rounded-lg px-4 py-2 text-xs font-semibold ${
                        isSelected
                          ? 'bg-[#001F3F] text-white high-contrast:bg-yellow-300 high-contrast:text-black'
                          : 'border border-slate-300 bg-white text-[#001F3F] hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white'
                      }`}
                    >
                      {isSelected ? 'Viewing Breakdown' : 'Inspect Breakdown'}
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectJobForApplication(job)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#0056B3] bg-white px-4 py-2 text-xs font-semibold text-[#0056B3] hover:bg-blue-50 high-contrast:border-cyan-300 high-contrast:bg-black high-contrast:text-cyan-300"
                    >
                      Prepare Application
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>

        {/* Plain-Language Job Explanation Panel */}
        <aside
          aria-label="Plain-language job explanation"
          className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6 lg:self-start high-contrast:border-white high-contrast:bg-black"
        >
          {selectedJob && breakdown ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 high-contrast:border-slate-700">
                <div>
                  <p className="text-xs font-semibold text-[#0056B3] high-contrast:text-cyan-300">
                    Plain-Language Job Assistant (Local Analysis)
                  </p>
                  <h2 className="mt-1 font-display text-xl font-bold text-[#001F3F] high-contrast:text-white">
                    {selectedJob.title}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onSpeakText(
                      `Job explanation for ${selectedJob.title} at ${selectedJob.employer}. ${breakdown.roleSummary} Payment details: ${breakdown.compensationClarity} Accessibility notes: ${breakdown.accessibilityFit}`
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-[#001F3F] hover:bg-slate-50 high-contrast:border-white high-contrast:text-yellow-300"
                >
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                  Read Explanation Aloud
                </button>
              </div>

              <div className="mt-5 space-y-5 text-sm">
                <div>
                  <h3 className="font-semibold text-[#001F3F] high-contrast:text-yellow-300">
                    What You Will Do
                  </h3>
                  <p className="mt-1 leading-relaxed text-slate-700 high-contrast:text-slate-200">
                    {breakdown.roleSummary}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-[#001F3F] high-contrast:text-yellow-300">
                    Accessibility & Work Arrangement
                  </h3>
                  <p className="mt-1 leading-relaxed text-slate-700 high-contrast:text-slate-200">
                    {breakdown.accessibilityFit}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-500 high-contrast:text-slate-400">
                    Arrangements: {selectedJob.arrangement.join(' · ')}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-[#001F3F] high-contrast:text-yellow-300">
                    Payment & Experience Requirements
                  </h3>
                  <p className="mt-1 leading-relaxed text-slate-700 high-contrast:text-slate-200">
                    {breakdown.compensationClarity}
                  </p>
                </div>

                {criteria.skills.trim() && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 high-contrast:border-white high-contrast:bg-neutral-950">
                    <h3 className="text-xs font-semibold text-[#001F3F] high-contrast:text-yellow-300">
                      Skill Match Against Your Entered Skills
                    </h3>
                    <p className="mt-1 text-xs text-slate-700 high-contrast:text-slate-200">
                      Matched:{' '}
                      {breakdown.matchedSkills.length > 0
                        ? breakdown.matchedSkills.join(', ')
                        : 'None yet'}
                    </p>
                    {breakdown.missingSkills.length > 0 && (
                      <p className="mt-1 text-xs text-slate-600 high-contrast:text-slate-300">
                        Additional skills listed: {breakdown.missingSkills.join(', ')}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-[#001F3F] high-contrast:text-yellow-300">
                    Application Requirements Checklist
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {breakdown.checklist.map((req) => (
                      <li
                        key={req}
                        className="flex items-start gap-2 text-xs text-slate-700 high-contrast:text-slate-200"
                      >
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 shrink-0 text-[#15803D] high-contrast:text-green-400"
                          aria-hidden="true"
                        />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 high-contrast:border-slate-700 high-contrast:bg-neutral-950 high-contrast:text-slate-300">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  Selecting &ldquo;Prepare Application&rdquo; pre-fills your Application Assistant
                  and Intended Values locally without contacting {selectedJob.platform}.
                </span>
              </div>

              <button
                type="button"
                onClick={() => onSelectJobForApplication(selectedJob)}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#001F3F] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#003366] high-contrast:bg-yellow-300 high-contrast:text-black"
              >
                Help Me Apply for This Role
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Select a job listing on the left to inspect its plain-language breakdown.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
};
