import {
  ChromeExtensionBridgeMessage,
  DetectedPageElement,
  PageElementCategory,
  SampleWebPage,
} from '../types/accessbridge';

export const SAMPLE_WEB_PAGES: SampleWebPage[] = [
  {
    id: 'upwork-proposal',
    platform: 'Upwork',
    title: 'Upwork — Submit a Proposal (DevSecOps Engineer)',
    url: 'https://www.upwork.com/nx/proposals/job/~01sample-devsecops/apply',
    summary:
      'Simulated Upwork job proposal page containing rate inputs, experience dropdown, cover letter textarea, screening questions, and file attachment controls.',
    isSimulated: true,
    elements: [
      {
        id: 'el-up-nav',
        category: 'navigation',
        tag: 'nav',
        role: 'navigation',
        accessibleName: 'Primary Upwork Workspace Navigation',
        selector: 'header nav[aria-label="Primary"]',
        focusOrder: 1,
        accessibilityNote: 'Landmark present. Contains 5 top-level links; skip link recommended.',
      },
      {
        id: 'el-up-h1',
        category: 'heading',
        tag: 'h1',
        role: 'heading (level 1)',
        accessibleName: 'Submit a Proposal: DevSecOps Engineer',
        selector: 'main h1.proposal-title',
        focusOrder: 2,
        accessibilityNote: 'Clear H1 heading establishing page context for screen readers.',
      },
      {
        id: 'el-up-rate-label',
        category: 'input_label',
        tag: 'label',
        role: 'label',
        accessibleName: 'Hourly Rate ($ USD/hr)',
        selector: 'label[for="hourly-rate-input"]',
        focusOrder: 3,
        accessibilityNote: 'Explicitly bound via for="hourly-rate-input".',
      },
      {
        id: 'el-up-rate',
        category: 'form_field',
        tag: 'input[type="number"]',
        role: 'spinbutton',
        accessibleName: 'Hourly Rate ($ USD/hr)',
        selector: '#hourly-rate-input',
        focusOrder: 4,
        required: true,
        currentValue: '$250',
        accessibilityNote:
          'CRITICAL CHECK: Numeric input lacks confirmation step. Easy to mistype $25 as $250.',
      },
      {
        id: 'el-up-exp',
        category: 'form_field',
        tag: 'select',
        role: 'combobox',
        accessibleName: 'Experience Level',
        selector: '#experience-level-select',
        focusOrder: 5,
        required: true,
        currentValue: 'Intermediate',
        accessibilityNote: 'Native <select> element; keyboard arrow navigation supported.',
      },
      {
        id: 'el-up-cover',
        category: 'form_field',
        tag: 'textarea',
        role: 'textbox (multiline)',
        accessibleName: 'Cover Letter',
        selector: '#cover-letter-textarea',
        focusOrder: 6,
        required: true,
        currentValue: 'Draft ready (182 characters)',
        accessibilityNote: 'Supports voice dictation and screen reader line announcements.',
      },
      {
        id: 'el-up-img-client',
        category: 'image',
        tag: 'img',
        role: 'img',
        accessibleName: 'Client verification badge icon',
        selector: 'img.payment-verified-badge',
        focusOrder: 7,
        altTextStatus: 'present',
        accessibilityNote: 'Alt text present: "Payment method verified".',
      },
      {
        id: 'el-up-img-banner',
        category: 'image',
        tag: 'img',
        role: 'img',
        accessibleName: 'Unnamed promotional banner image',
        selector: 'aside img.promo-banner',
        focusOrder: 8,
        altTextStatus: 'missing',
        accessibilityNote: 'WARNING: Missing alt attribute. Screen readers may announce raw filename.',
      },
      {
        id: 'el-up-attach',
        category: 'interactive',
        tag: 'input[type="file"]',
        role: 'button / file picker',
        accessibleName: 'Attach portfolio files (PDF, DOCX)',
        selector: '#portfolio-file-upload',
        focusOrder: 9,
        required: false,
        accessibilityNote: 'Drag-and-drop zone has keyboard-accessible fallback button.',
      },
      {
        id: 'el-up-help-link',
        category: 'link',
        tag: 'a',
        role: 'link',
        accessibleName: 'View client job posting details in side panel',
        selector: 'a.view-job-details',
        focusOrder: 10,
        accessibilityNote: 'Descriptive link text (avoids ambiguous "Click here").',
      },
      {
        id: 'el-up-submit',
        category: 'button',
        tag: 'button[type="submit"]',
        role: 'button',
        accessibleName: 'Send Proposal for 12 Connects',
        selector: 'button.submit-proposal-btn',
        focusOrder: 11,
        accessibilityNote: 'AccessBridge blocks auto-submit and triggers Verification Engine first.',
      },
    ],
  },
  {
    id: 'linkedin-easy-apply',
    platform: 'LinkedIn',
    title: 'LinkedIn — Easy Apply Modal (Accessibility QA Specialist)',
    url: 'https://www.linkedin.com/jobs/view/39001234-sample-qa/',
    summary:
      'Simulated LinkedIn multi-step Easy Apply modal featuring contact email, phone, resume upload, and screening radio questions.',
    isSimulated: true,
    elements: [
      {
        id: 'el-li-h1',
        category: 'heading',
        tag: 'h2',
        role: 'heading (level 2, dialog title)',
        accessibleName: 'Apply to Civic Digital Labs',
        selector: 'div[role="dialog"] h2',
        focusOrder: 1,
        accessibilityNote: 'Dialog correctly references heading via aria-labelledby.',
      },
      {
        id: 'el-li-nav',
        category: 'navigation',
        tag: 'nav',
        role: 'progressbar / step nav',
        accessibleName: 'Application Step 2 of 3: Additional Questions',
        selector: 'div[role="dialog"] nav.apply-steps',
        focusOrder: 2,
        accessibilityNote: 'Step progress announced visually and via aria-valuenow.',
      },
      {
        id: 'el-li-email-lbl',
        category: 'input_label',
        tag: 'label',
        role: 'label',
        accessibleName: 'Email address (Required)',
        selector: 'label[for="li-email"]',
        focusOrder: 3,
        accessibilityNote: 'Required status communicated via text, not asterisk/color alone.',
      },
      {
        id: 'el-li-email',
        category: 'form_field',
        tag: 'input[type="email"]',
        role: 'textbox',
        accessibleName: 'Email address',
        selector: '#li-email',
        focusOrder: 4,
        required: true,
        currentValue: 'alex.morgan@example.org',
        accessibilityNote: 'Validates email syntax before step advancement.',
      },
      {
        id: 'el-li-url',
        category: 'form_field',
        tag: 'input[type="url"]',
        role: 'textbox',
        accessibleName: 'Portfolio or GitHub URL',
        selector: '#li-portfolio-url',
        focusOrder: 5,
        required: true,
        currentValue: 'https://github.com/alexmorgan-dev',
        accessibilityNote: 'Expects full https:// protocol.',
      },
      {
        id: 'el-li-logo',
        category: 'image',
        tag: 'img',
        role: 'img',
        accessibleName: 'Civic Digital Labs company logo',
        selector: 'img.company-logo',
        focusOrder: 6,
        altTextStatus: 'present',
        accessibilityNote: 'Alt text present: "Civic Digital Labs".',
      },
      {
        id: 'el-li-radio',
        category: 'interactive',
        tag: 'fieldset',
        role: 'radiogroup',
        accessibleName: 'Are you authorized to work remotely in your region?',
        selector: 'fieldset.work-auth-group',
        focusOrder: 7,
        required: true,
        accessibilityNote: 'Grouped radio buttons navigable via Up/Down arrow keys.',
      },
      {
        id: 'el-li-terms',
        category: 'link',
        tag: 'a',
        role: 'link',
        accessibleName: 'Applicant Privacy Notice (opens new tab)',
        selector: 'a.privacy-notice-link',
        focusOrder: 8,
        accessibilityNote: 'Clearly warns screen-reader users that link opens a new tab.',
      },
      {
        id: 'el-li-next',
        category: 'button',
        tag: 'button',
        role: 'button',
        accessibleName: 'Review your application',
        selector: 'button[data-easy-apply-review]',
        focusOrder: 9,
        accessibilityNote: 'Primary forward action.',
      },
    ],
  },
  {
    id: 'indeed-application',
    platform: 'Indeed',
    title: 'Indeed — Technical Writer (Remote, Async) Application',
    url: 'https://www.indeed.com/viewjob?jk=sample-tech-writer',
    summary:
      'Simulated Indeed application workflow with availability scheduling, compensation expectations, and employer screening prompts.',
    isSimulated: true,
    elements: [
      {
        id: 'el-in-nav',
        category: 'navigation',
        tag: 'nav',
        role: 'navigation',
        accessibleName: 'Indeed Breadcrumb Navigation',
        selector: 'nav[aria-label="Breadcrumb"]',
        focusOrder: 1,
        accessibilityNote: 'Provides clear trail back to search results.',
      },
      {
        id: 'el-in-h1',
        category: 'heading',
        tag: 'h1',
        role: 'heading (level 1)',
        accessibleName: 'Technical Documentation Specialist — OpenGrid',
        selector: 'h1.jobsearch-JobInfoHeader-title',
        focusOrder: 2,
        accessibilityNote: 'Primary job heading properly structured.',
      },
      {
        id: 'el-in-avail-lbl',
        category: 'input_label',
        tag: 'label',
        role: 'label',
        accessibleName: 'Weekly Availability',
        selector: 'label[for="indeed-availability"]',
        focusOrder: 3,
        accessibilityNote: 'Associated label clarifies expected format (e.g., 20 hours/week).',
      },
      {
        id: 'el-in-avail',
        category: 'form_field',
        tag: 'input[type="text"]',
        role: 'textbox',
        accessibleName: 'Weekly Availability',
        selector: '#indeed-availability',
        focusOrder: 4,
        required: true,
        currentValue: '20 hours/week',
        accessibilityNote: 'Checked by AccessBridge Verification Engine against intended schedule.',
      },
      {
        id: 'el-in-badge',
        category: 'image',
        tag: 'img',
        role: 'img',
        accessibleName: 'Decorative divider graphic',
        selector: 'img.section-divider',
        focusOrder: 5,
        altTextStatus: 'decorative',
        accessibilityNote: 'Marked alt="" aria-hidden="true" so screen readers skip noise.',
      },
      {
        id: 'el-in-accordion',
        category: 'interactive',
        tag: 'button[aria-expanded]',
        role: 'disclosure button',
        accessibleName: 'Show full accessibility accommodations policy',
        selector: 'button.accommodations-toggle',
        focusOrder: 6,
        accessibilityNote: 'Properly exposes aria-expanded state.',
      },
      {
        id: 'el-in-continue',
        category: 'button',
        tag: 'button',
        role: 'button',
        accessibleName: 'Continue to review',
        selector: 'button.ia-continueButton',
        focusOrder: 7,
        accessibilityNote: '48px touch target height satisfies WCAG 2.2 Target Size.',
      },
    ],
  },
];

export function matchSamplePageForUrl(inputUrl: string): SampleWebPage | null {
  const lower = inputUrl.toLowerCase();
  if (lower.includes('upwork')) return SAMPLE_WEB_PAGES[0];
  if (lower.includes('linkedin')) return SAMPLE_WEB_PAGES[1];
  if (lower.includes('indeed')) return SAMPLE_WEB_PAGES[2];
  return null;
}

/**
 * Parses user-supplied HTML markup directly inside the browser using DOMParser.
 * Never makes external cross-origin requests.
 */
export function parseHtmlSnippetToElements(htmlMarkup: string): DetectedPageElement[] {
  if (!htmlMarkup.trim()) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlMarkup, 'text/html');
  const results: DetectedPageElement[] = [];
  let focusCounter = 1;

  const pushEl = (
    category: PageElementCategory,
    el: Element,
    accessibleName: string,
    accessibilityNote: string,
    extra?: Partial<DetectedPageElement>
  ) => {
    const idAttr = el.getAttribute('id');
    const classAttr = el.getAttribute('class')?.trim().split(/\s+/)[0];
    const selector = idAttr
      ? `#${idAttr}`
      : classAttr
        ? `${el.tagName.toLowerCase()}.${classAttr}`
        : el.tagName.toLowerCase();

    results.push({
      id: `parsed-${results.length + 1}`,
      category,
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role') || category.replace('_', ' '),
      accessibleName: accessibleName || '(No accessible name detected)',
      selector,
      focusOrder: focusCounter++,
      accessibilityNote,
      ...extra,
    });
  };

  doc.querySelectorAll('h1, h2, h3, h4').forEach((el) => {
    pushEl('heading', el, el.textContent?.trim() || '', 'Heading structure helps screen readers navigate by section.');
  });

  doc.querySelectorAll('nav').forEach((el) => {
    const label = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || 'Unnamed navigation region';
    pushEl('navigation', el, label, label === 'Unnamed navigation region' ? 'Recommend adding aria-label to <nav>.' : 'Accessible navigation landmark.');
  });

  doc.querySelectorAll('label').forEach((el) => {
    const forAttr = el.getAttribute('for');
    pushEl(
      'input_label',
      el,
      el.textContent?.trim() || '',
      forAttr ? `Linked to input #${forAttr}.` : 'Warning: Missing "for" attribute or wrapped input.'
    );
  });

  doc.querySelectorAll('input, select, textarea').forEach((el) => {
    const idAttr = el.getAttribute('id');
    const linkedLabel = idAttr ? doc.querySelector(`label[for="${idAttr}"]`)?.textContent?.trim() : '';
    const name =
      el.getAttribute('aria-label') ||
      linkedLabel ||
      el.getAttribute('placeholder') ||
      el.getAttribute('name') ||
      '';
    const isRequired = el.hasAttribute('required') || el.getAttribute('aria-required') === 'true';
    pushEl(
      'form_field',
      el,
      name,
      name ? 'Form control has an identifiable label.' : 'ERROR: Form control lacks an accessible label.',
      {
        required: isRequired,
        currentValue: (el as HTMLInputElement).value || el.getAttribute('value') || undefined,
      }
    );
  });

  doc.querySelectorAll('button, [role="button"]').forEach((el) => {
    const name = el.getAttribute('aria-label') || el.textContent?.trim() || '';
    pushEl(
      'button',
      el,
      name,
      name ? 'Button is focusable and labeled.' : 'WARNING: Icon button may need aria-label.'
    );
  });

  doc.querySelectorAll('a[href]').forEach((el) => {
    const name = el.getAttribute('aria-label') || el.textContent?.trim() || '';
    pushEl('link', el, name, 'Verify link text describes destination clearly.');
  });

  doc.querySelectorAll('img').forEach((el) => {
    const alt = el.getAttribute('alt');
    const altStatus = alt === null ? 'missing' : alt === '' ? 'decorative' : 'present';
    pushEl(
      'image',
      el,
      alt || '(Missing alt text)',
      altStatus === 'missing'
        ? 'WARNING: Missing alt attribute. Add descriptive alt text or alt="" if decorative.'
        : altStatus === 'decorative'
          ? 'Marked decorative (alt="").'
          : 'Descriptive alt text provided.',
      { altTextStatus: altStatus }
    );
  });

  return results;
}

export function createSampleExtensionBridgePayload(page: SampleWebPage): ChromeExtensionBridgeMessage {
  return {
    protocol: 'ACCESSBRIDGE_MV3_V1',
    source: 'content_script',
    action: 'INSPECT_ACTIVE_TAB',
    tabUrl: page.url,
    timestamp: new Date().toISOString(),
    payload: {
      elements: page.elements.slice(0, 4),
    },
  };
}
