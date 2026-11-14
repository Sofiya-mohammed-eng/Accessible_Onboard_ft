import {
  ActualApplicationValues,
  IntendedApplicationValues,
  ReadinessStatus,
  VerificationCheckResult,
  VerificationReport,
  VerificationStatus,
} from '../types/accessbridge';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isValidHttpUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

function parseNumericRate(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function detectExperienceContradiction(
  selectedLevel: string,
  coverLetter: string
): string | null {
  const lowerLetter = coverLetter.toLowerCase();
  const yearsMatch = lowerLetter.match(/(\d+)\+?\s+years?/);
  if (!yearsMatch) return null;
  const years = Number(yearsMatch[1]);
  if (selectedLevel === 'Entry' && years >= 5) {
    return `Cover letter mentions ${years} years of experience, which conflicts with selected "Entry" level.`;
  }
  if (selectedLevel === 'Expert' && years === 0) {
    return 'Cover letter mentions 0 years of experience, which conflicts with selected "Expert" level.';
  }
  return null;
}

/**
 * Deterministic verification engine reusable across the web companion
 * and future Chrome Extension Manifest V3 content scripts.
 */
export function runDeterministicVerification(
  intended: IntendedApplicationValues,
  actual: ActualApplicationValues
): VerificationReport {
  const checks: VerificationCheckResult[] = [];
  const uninspectable = new Set(actual.uninspectable_fields);

  // 1. Job Title Check
  if (uninspectable.has('job_title')) {
    checks.push({
      fieldKey: 'job_title',
      fieldLabel: 'Job Title',
      intendedDisplay: intended.job_title,
      actualDisplay: 'Uninspectable (cross-origin restriction)',
      status: 'unable_to_verify',
      message: 'UNABLE TO VERIFY: Actual job title field could not be read.',
      remediation: 'Confirm the job title manually on the target platform before submitting.',
    });
  } else if (!actual.job_title.trim()) {
    checks.push({
      fieldKey: 'job_title',
      fieldLabel: 'Job Title',
      intendedDisplay: intended.job_title,
      actualDisplay: '(Empty)',
      status: 'missing_information',
      message: 'MISSING INFORMATION: Job title is blank.',
      remediation: `Enter "${intended.job_title}" in the job title field.`,
    });
  } else if (normalizeText(intended.job_title) !== normalizeText(actual.job_title)) {
    checks.push({
      fieldKey: 'job_title',
      fieldLabel: 'Job Title',
      intendedDisplay: intended.job_title,
      actualDisplay: actual.job_title,
      status: 'error_detected',
      message: 'ERROR DETECTED: Job title does not match your intended role.',
      remediation: `Update job title to "${intended.job_title}".`,
    });
  } else {
    checks.push({
      fieldKey: 'job_title',
      fieldLabel: 'Job Title',
      intendedDisplay: intended.job_title,
      actualDisplay: actual.job_title,
      status: 'verified',
      message: 'Verified: Job title matches your intended value.',
    });
  }

  // 2. Hourly Rate Check (Core example: $25 intended vs $250 actual)
  const parsedActualRate = parseNumericRate(actual.hourly_rate);
  if (uninspectable.has('hourly_rate')) {
    checks.push({
      fieldKey: 'hourly_rate',
      fieldLabel: 'Hourly Rate',
      intendedDisplay: `$${intended.hourly_rate}/hr`,
      actualDisplay: 'Uninspectable (protected iframe)',
      status: 'unable_to_verify',
      message: 'UNABLE TO VERIFY: Hourly rate input could not be inspected.',
      remediation: `Manually verify the platform shows $${intended.hourly_rate}/hr.`,
    });
  } else if (!actual.hourly_rate.trim() || parsedActualRate === null) {
    checks.push({
      fieldKey: 'hourly_rate',
      fieldLabel: 'Hourly Rate',
      intendedDisplay: `$${intended.hourly_rate}/hr`,
      actualDisplay: actual.hourly_rate.trim() || '(Empty)',
      status: 'missing_information',
      message: 'MISSING INFORMATION: Hourly rate is missing or non-numeric.',
      remediation: `Enter $${intended.hourly_rate} as a valid number.`,
    });
  } else if (Math.abs(parsedActualRate - intended.hourly_rate) > 0.001) {
    checks.push({
      fieldKey: 'hourly_rate',
      fieldLabel: 'Hourly Rate',
      intendedDisplay: `$${intended.hourly_rate}/hr`,
      actualDisplay: `$${parsedActualRate}/hr`,
      status: 'error_detected',
      message: 'ERROR DETECTED: Your hourly rate does not match your intended value.',
      remediation: `Change hourly rate from $${parsedActualRate} back to $${intended.hourly_rate}.`,
    });
  } else {
    checks.push({
      fieldKey: 'hourly_rate',
      fieldLabel: 'Hourly Rate',
      intendedDisplay: `$${intended.hourly_rate}/hr`,
      actualDisplay: `$${parsedActualRate}/hr`,
      status: 'verified',
      message: `Verified: Hourly rate ($${parsedActualRate}/hr) matches your intended value.`,
    });
  }

  // 3. Availability Check
  if (uninspectable.has('availability')) {
    checks.push({
      fieldKey: 'availability',
      fieldLabel: 'Availability',
      intendedDisplay: intended.availability,
      actualDisplay: 'Uninspectable',
      status: 'unable_to_verify',
      message: 'UNABLE TO VERIFY: Availability field could not be read.',
      remediation: `Check your weekly availability is set to "${intended.availability}".`,
    });
  } else if (!actual.availability.trim()) {
    checks.push({
      fieldKey: 'availability',
      fieldLabel: 'Availability',
      intendedDisplay: intended.availability,
      actualDisplay: '(Empty)',
      status: 'missing_information',
      message: 'MISSING INFORMATION: Availability is required.',
      remediation: `Specify "${intended.availability}".`,
    });
  } else if (normalizeText(intended.availability) !== normalizeText(actual.availability)) {
    checks.push({
      fieldKey: 'availability',
      fieldLabel: 'Availability',
      intendedDisplay: intended.availability,
      actualDisplay: actual.availability,
      status: 'error_detected',
      message: 'ERROR DETECTED: Entered availability differs from your intended schedule.',
      remediation: `Update availability to "${intended.availability}".`,
    });
  } else {
    checks.push({
      fieldKey: 'availability',
      fieldLabel: 'Availability',
      intendedDisplay: intended.availability,
      actualDisplay: actual.availability,
      status: 'verified',
      message: 'Verified: Availability matches your intended schedule.',
    });
  }

  // 4. Experience Level & Cover Letter Consistency Check
  const contradiction = detectExperienceContradiction(actual.experience_level, actual.cover_letter);
  if (uninspectable.has('experience_level')) {
    checks.push({
      fieldKey: 'experience_level',
      fieldLabel: 'Experience Level',
      intendedDisplay: intended.experience_level,
      actualDisplay: 'Uninspectable',
      status: 'unable_to_verify',
      message: 'UNABLE TO VERIFY: Experience level selector could not be inspected.',
    });
  } else if (!actual.experience_level.trim()) {
    checks.push({
      fieldKey: 'experience_level',
      fieldLabel: 'Experience Level',
      intendedDisplay: intended.experience_level,
      actualDisplay: '(Not selected)',
      status: 'missing_information',
      message: 'MISSING INFORMATION: Experience level has not been selected.',
    });
  } else if (normalizeText(intended.experience_level) !== normalizeText(actual.experience_level)) {
    checks.push({
      fieldKey: 'experience_level',
      fieldLabel: 'Experience Level',
      intendedDisplay: intended.experience_level,
      actualDisplay: actual.experience_level,
      status: 'error_detected',
      message: 'ERROR DETECTED: Selected experience level does not match your intended value.',
      remediation: `Set experience level to "${intended.experience_level}".`,
    });
  } else if (contradiction) {
    checks.push({
      fieldKey: 'experience_level',
      fieldLabel: 'Experience Level Consistency',
      intendedDisplay: intended.experience_level,
      actualDisplay: `${actual.experience_level} (inconsistent narrative)`,
      status: 'error_detected',
      message: `ERROR DETECTED: ${contradiction}`,
      remediation: 'Align your selected experience level with the years stated in your cover letter.',
    });
  } else {
    checks.push({
      fieldKey: 'experience_level',
      fieldLabel: 'Experience Level',
      intendedDisplay: intended.experience_level,
      actualDisplay: actual.experience_level,
      status: 'verified',
      message: 'Verified: Experience level matches and is consistent with your cover letter.',
    });
  }

  // 5. Contact Email Format Check
  if (uninspectable.has('email')) {
    checks.push({
      fieldKey: 'email',
      fieldLabel: 'Contact Email',
      intendedDisplay: intended.email,
      actualDisplay: 'Uninspectable',
      status: 'unable_to_verify',
      message: 'UNABLE TO VERIFY: Email field is inaccessible.',
    });
  } else if (!actual.email.trim()) {
    checks.push({
      fieldKey: 'email',
      fieldLabel: 'Contact Email',
      intendedDisplay: intended.email,
      actualDisplay: '(Empty)',
      status: 'missing_information',
      message: 'MISSING INFORMATION: Contact email is missing.',
      remediation: 'Provide a valid email address.',
    });
  } else if (!EMAIL_REGEX.test(actual.email.trim())) {
    checks.push({
      fieldKey: 'email',
      fieldLabel: 'Contact Email',
      intendedDisplay: intended.email,
      actualDisplay: actual.email,
      status: 'error_detected',
      message: 'ERROR DETECTED: Invalid email format.',
      remediation: 'Use standard format such as name@domain.com.',
    });
  } else if (intended.email.trim() && normalizeText(intended.email) !== normalizeText(actual.email)) {
    checks.push({
      fieldKey: 'email',
      fieldLabel: 'Contact Email',
      intendedDisplay: intended.email,
      actualDisplay: actual.email,
      status: 'error_detected',
      message: 'ERROR DETECTED: Entered email does not match your intended contact email.',
      remediation: `Update email to "${intended.email}".`,
    });
  } else {
    checks.push({
      fieldKey: 'email',
      fieldLabel: 'Contact Email',
      intendedDisplay: intended.email || 'Valid email format',
      actualDisplay: actual.email,
      status: 'verified',
      message: 'Verified: Email format is valid and matches your intended address.',
    });
  }

  // 6. Portfolio / Profile URL Check
  if (uninspectable.has('portfolio_url')) {
    checks.push({
      fieldKey: 'portfolio_url',
      fieldLabel: 'Portfolio URL',
      intendedDisplay: intended.portfolio_url,
      actualDisplay: 'Uninspectable',
      status: 'unable_to_verify',
      message: 'UNABLE TO VERIFY: Portfolio URL field could not be read.',
    });
  } else if (!actual.portfolio_url.trim()) {
    checks.push({
      fieldKey: 'portfolio_url',
      fieldLabel: 'Portfolio URL',
      intendedDisplay: intended.portfolio_url || 'Valid https:// URL',
      actualDisplay: '(Empty)',
      status: 'missing_information',
      message: 'MISSING INFORMATION: Portfolio or profile URL is blank.',
      remediation: 'Add a full link beginning with https://.',
    });
  } else if (!isValidHttpUrl(actual.portfolio_url)) {
    checks.push({
      fieldKey: 'portfolio_url',
      fieldLabel: 'Portfolio URL',
      intendedDisplay: intended.portfolio_url || 'Valid https:// URL',
      actualDisplay: actual.portfolio_url,
      status: 'error_detected',
      message: 'ERROR DETECTED: Portfolio URL is malformed or missing https://.',
      remediation: 'Enter a valid URL starting with https:// (e.g., https://github.com/username).',
    });
  } else if (
    intended.portfolio_url.trim() &&
    normalizeText(intended.portfolio_url) !== normalizeText(actual.portfolio_url)
  ) {
    checks.push({
      fieldKey: 'portfolio_url',
      fieldLabel: 'Portfolio URL',
      intendedDisplay: intended.portfolio_url,
      actualDisplay: actual.portfolio_url,
      status: 'error_detected',
      message: 'ERROR DETECTED: Portfolio URL does not match your intended link.',
      remediation: `Replace with "${intended.portfolio_url}".`,
    });
  } else {
    checks.push({
      fieldKey: 'portfolio_url',
      fieldLabel: 'Portfolio URL',
      intendedDisplay: intended.portfolio_url || 'Valid URL',
      actualDisplay: actual.portfolio_url,
      status: 'verified',
      message: 'Verified: Portfolio URL is valid and matches your intended link.',
    });
  }

  // 7. Cover Letter Check
  if (uninspectable.has('cover_letter')) {
    checks.push({
      fieldKey: 'cover_letter',
      fieldLabel: 'Cover Letter',
      intendedDisplay: 'Non-empty cover letter (>= 40 chars)',
      actualDisplay: 'Uninspectable',
      status: 'unable_to_verify',
      message: 'UNABLE TO VERIFY: Cover letter editor could not be inspected.',
    });
  } else if (!actual.cover_letter.trim()) {
    checks.push({
      fieldKey: 'cover_letter',
      fieldLabel: 'Cover Letter',
      intendedDisplay: 'Complete cover letter',
      actualDisplay: '(Empty)',
      status: 'missing_information',
      message: 'MISSING INFORMATION: Cover letter is empty.',
      remediation: 'Write or dictate a brief cover letter before applying.',
    });
  } else if (actual.cover_letter.trim().length < 40) {
    checks.push({
      fieldKey: 'cover_letter',
      fieldLabel: 'Cover Letter',
      intendedDisplay: 'At least 40 characters',
      actualDisplay: `${actual.cover_letter.trim().length} characters`,
      status: 'missing_information',
      message: 'MISSING INFORMATION: Cover letter appears incomplete (under 40 characters).',
      remediation: 'Expand your cover letter with relevant skills and availability.',
    });
  } else {
    checks.push({
      fieldKey: 'cover_letter',
      fieldLabel: 'Cover Letter',
      intendedDisplay: 'Complete cover letter',
      actualDisplay: `${actual.cover_letter.trim().length} characters provided`,
      status: 'verified',
      message: 'Verified: Cover letter is populated and passes length check.',
    });
  }

  // 8. Screening Questions Check
  if (intended.require_screening_answers) {
    const unansweredCount = actual.screening_answers.filter((qa) => !qa.answer.trim()).length;
    if (actual.screening_answers.length === 0 || unansweredCount > 0) {
      checks.push({
        fieldKey: 'screening_answers',
        fieldLabel: 'Screening Questions',
        intendedDisplay: 'All screening questions answered',
        actualDisplay:
          actual.screening_answers.length === 0
            ? 'No questions recorded'
            : `${unansweredCount} of ${actual.screening_answers.length} unanswered`,
        status: 'missing_information',
        message: 'MISSING INFORMATION: One or more screening questions are unanswered.',
        remediation: 'Complete every screening question in the Application Assistant.',
      });
    } else {
      checks.push({
        fieldKey: 'screening_answers',
        fieldLabel: 'Screening Questions',
        intendedDisplay: 'All screening questions answered',
        actualDisplay: `${actual.screening_answers.length} answered`,
        status: 'verified',
        message: 'Verified: All screening questions have non-empty answers.',
      });
    }
  }

  // 9. Attachments Check
  if (intended.required_attachments_count > 0) {
    if (actual.attachments_count < intended.required_attachments_count) {
      checks.push({
        fieldKey: 'attachments',
        fieldLabel: 'Portfolio & Resume Attachments',
        intendedDisplay: `${intended.required_attachments_count} attachment(s)`,
        actualDisplay: `${actual.attachments_count} attached`,
        status: 'missing_information',
        message: `MISSING INFORMATION: Missing required attachment (${actual.attachments_count} of ${intended.required_attachments_count}).`,
        remediation: 'Attach your resume or portfolio file in the Application Assistant.',
      });
    } else {
      checks.push({
        fieldKey: 'attachments',
        fieldLabel: 'Portfolio & Resume Attachments',
        intendedDisplay: `${intended.required_attachments_count} attachment(s)`,
        actualDisplay: `${actual.attachments_count} attached`,
        status: 'verified',
        message: `Verified: ${actual.attachments_count} attachment(s) present.`,
      });
    }
  }

  const counts = {
    verified: checks.filter((c) => c.status === 'verified').length,
    errors: checks.filter((c) => c.status === 'error_detected').length,
    missing: checks.filter((c) => c.status === 'missing_information').length,
    unableToVerify: checks.filter((c) => c.status === 'unable_to_verify').length,
  };

  let overallStatus: VerificationStatus = 'verified';
  let readinessStatus: ReadinessStatus = 'Ready for submission';
  let summaryMessage =
    'All inspectable application fields match your intended values and pass format checks.';

  if (counts.errors > 0) {
    overallStatus = 'error_detected';
    readinessStatus = 'Requires correction';
    summaryMessage = `ERROR DETECTED: ${counts.errors} field(s) contradict your intended application values or formatting rules.`;
  } else if (counts.missing > 0) {
    overallStatus = 'missing_information';
    readinessStatus = 'Missing information';
    summaryMessage = `MISSING INFORMATION: ${counts.missing} required field(s) or attachment(s) must be completed before submission.`;
  } else if (counts.unableToVerify > 0) {
    overallStatus = 'unable_to_verify';
    readinessStatus = 'Requires correction';
    summaryMessage = `UNABLE TO VERIFY: ${counts.unableToVerify} field(s) could not be inspected automatically. Manual review required.`;
  }

  return {
    checkedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    overallStatus,
    readinessStatus,
    summaryMessage,
    checks,
    counts,
  };
}
