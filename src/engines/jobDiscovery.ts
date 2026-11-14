import { JobListing, JobSearchCriteria } from '../types/accessbridge';

export const SAMPLE_JOB_LISTINGS: JobListing[] = [
  {
    id: 'job-upwork-devsecops',
    platform: 'Upwork',
    title: 'DevSecOps Engineer',
    employer: 'Northstar Cloud Security',
    arrangement: ['Remote', 'Async-friendly', 'Part-time'],
    experienceLevel: 'Intermediate',
    hourlyRateMin: 22,
    hourlyRateMax: 35,
    paymentType: 'Hourly',
    paymentDisplay: '$22 – $35 / hr (Payment Verified)',
    description:
      'Help maintain automated CI/CD security pipelines, review Terraform configurations, and document vulnerability remediation steps using written asynchronous workflows.',
    requiredSkills: ['GitHub Actions', 'Terraform', 'Docker', 'Security Scanning', 'Linux'],
    applicationRequirements: [
      'Cover letter summarizing CI/CD security experience',
      'Hourly rate proposal',
      'GitHub or portfolio link',
      '2 brief written screening answers',
      'Resume or capability PDF attachment',
    ],
    screeningQuestions: [
      'Describe your experience with automated security checks in CI/CD pipelines.',
      'Confirm your weekly availability and preferred async communication tools.',
    ],
    isSampleData: true,
    accessibilityNotes:
      '100% written/async collaboration via GitHub Issues and Slack. Flexible 20 hrs/week schedule with no mandatory live video standups.',
  },
  {
    id: 'job-linkedin-a11y-qa',
    platform: 'LinkedIn',
    title: 'Accessibility QA Specialist (WCAG 2.2)',
    employer: 'Civic Digital Labs',
    arrangement: ['Remote', 'Flexible hours', 'Full-time'],
    experienceLevel: 'Intermediate',
    hourlyRateMin: 28,
    hourlyRateMax: 42,
    paymentType: 'Hourly',
    paymentDisplay: '$28 – $42 / hr (W-2 or Contract)',
    description:
      'Audit public-sector web applications against WCAG 2.2 AA using keyboard navigation, NVDA/JAWS/VoiceOver screen readers, and structured bug reports.',
    requiredSkills: ['WCAG 2.2', 'Screen Readers', 'ARIA', 'Keyboard Testing', 'HTML'],
    applicationRequirements: [
      'Contact email and portfolio link',
      'Sample accessibility audit or cover letter',
      '1 work authorization screening question',
    ],
    screeningQuestions: [
      'Which assistive technologies or keyboard testing workflows do you use regularly?',
      'Are you authorized to work remotely in your region?',
    ],
    isSampleData: true,
    accessibilityNotes:
      'Lived experience with assistive technology is strongly valued. Screen-reader friendly ticketing system and captioned team demos.',
  },
  {
    id: 'job-indeed-tech-writer',
    platform: 'Indeed',
    title: 'Technical Documentation Specialist',
    employer: 'OpenGrid Developer Tools',
    arrangement: ['Remote', 'Async-friendly', 'Part-time', 'Flexible hours'],
    experienceLevel: 'Entry',
    hourlyRateMin: 20,
    hourlyRateMax: 30,
    paymentType: 'Hourly',
    paymentDisplay: '$20 – $30 / hr',
    description:
      'Write clear, plain-language API guides, onboarding tutorials, and alt-text descriptions for developer documentation repositories.',
    requiredSkills: ['Technical Writing', 'Markdown', 'Git', 'Documentation', 'Plain Language'],
    applicationRequirements: [
      'Writing sample URL or PDF attachment',
      'Availability confirmation (hours/week)',
      'Short cover note',
    ],
    screeningQuestions: [
      'Share a link or brief example of technical documentation you simplified for readers.',
      'How many hours per week can you commit reliably?',
    ],
    isSampleData: true,
    accessibilityNotes:
      'Text-first async environment. All deliverables submitted via Markdown pull requests; zero phone calls required.',
  },
  {
    id: 'job-freelancer-frontend',
    platform: 'Freelancer',
    title: 'Accessible React UI Developer',
    employer: 'BridgeHealth Cooperative',
    arrangement: ['Remote', 'Flexible hours', 'Part-time'],
    experienceLevel: 'Expert',
    hourlyRateMin: 40,
    hourlyRateMax: 60,
    paymentType: 'Hourly',
    paymentDisplay: '$40 – $60 / hr',
    description:
      'Refactor multi-step intake forms in React and TypeScript to achieve full keyboard operability, clear error announcements, and high-contrast theming.',
    requiredSkills: ['React', 'TypeScript', 'Tailwind CSS', 'ARIA', 'Form Validation'],
    applicationRequirements: [
      'Milestone hourly bid',
      'GitHub or live accessible component link',
      'Cover letter detailing React accessibility fixes',
    ],
    screeningQuestions: [
      'How do you manage focus restoration when closing accessible modals or drawers?',
      'What is your target hourly rate and weekly capacity?',
    ],
    isSampleData: true,
    accessibilityNotes:
      'Written spec reviews, voice-dictation friendly async check-ins, and flexible milestone delivery.',
  },
  {
    id: 'job-fiverr-data-analyst',
    platform: 'Fiverr',
    title: 'Spreadsheet & Python Data Normalization Consultant',
    employer: 'ClearLedger Operations',
    arrangement: ['Remote', 'Async-friendly', 'Flexible hours'],
    experienceLevel: 'Intermediate',
    hourlyRateMin: 25,
    hourlyRateMax: 38,
    paymentType: 'Fixed-Price',
    paymentDisplay: '$25 – $38 / hr equivalent ($500 milestone)',
    description:
      'Clean CSV exports, standardize financial date formats, and build documented summary sheets with clear column headers and error checks.',
    requiredSkills: ['Python', 'Excel', 'CSV', 'Data Cleaning', 'SQL'],
    applicationRequirements: [
      'Proposal summary & turnaround estimate',
      'Sample cleaned dataset or script link',
    ],
    screeningQuestions: [
      'How do you validate that no rows or decimal values were altered during normalization?',
    ],
    isSampleData: true,
    accessibilityNotes:
      'Asynchronous scope via Fiverr messages. Structured written acceptance criteria provided upfront.',
  },
];

export function filterSampleJobs(criteria: JobSearchCriteria): JobListing[] {
  const q = criteria.query.trim().toLowerCase();
  const skillTokens = criteria.skills
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return SAMPLE_JOB_LISTINGS.filter((job) => {
    if (criteria.experienceLevel !== 'Any' && job.experienceLevel !== criteria.experienceLevel) {
      return false;
    }
    if (criteria.arrangement !== 'Any' && !job.arrangement.includes(criteria.arrangement)) {
      return false;
    }
    if (criteria.minHourlyRate > 0 && job.hourlyRateMax < criteria.minHourlyRate) {
      return false;
    }
    if (q) {
      const hay = `${job.title} ${job.description} ${job.employer} ${job.platform} ${job.requiredSkills.join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (skillTokens.length > 0) {
      const jobSkillsLower = job.requiredSkills.map((s) => s.toLowerCase());
      const matchesAny = skillTokens.some((token) =>
        jobSkillsLower.some((js) => js.includes(token)) || job.description.toLowerCase().includes(token)
      );
      if (!matchesAny) return false;
    }
    return true;
  });
}

export interface JobPlainLanguageBreakdown {
  roleSummary: string;
  compensationClarity: string;
  accessibilityFit: string;
  matchedSkills: string[];
  missingSkills: string[];
  checklist: string[];
}

export function generateJobBreakdown(job: JobListing, userSkillsInput: string): JobPlainLanguageBreakdown {
  const userTokens = userSkillsInput
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const matchedSkills = job.requiredSkills.filter((skill) =>
    userTokens.some((u) => skill.toLowerCase().includes(u) || u.includes(skill.toLowerCase()))
  );
  const missingSkills = job.requiredSkills.filter((skill) => !matchedSkills.includes(skill));

  return {
    roleSummary: `You would work with ${job.employer} (listed via ${job.platform} sample) at an ${job.experienceLevel.toLowerCase()} level. Main focus: ${job.description}`,
    compensationClarity: `${job.paymentType}: ${job.paymentDisplay}. Always verify that your entered rate matches your intended budget before submitting.`,
    accessibilityFit: job.accessibilityNotes,
    matchedSkills,
    missingSkills,
    checklist: job.applicationRequirements,
  };
}
