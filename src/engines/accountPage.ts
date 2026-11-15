import type { PreferredLanguage } from '../types/accessbridge';

export type AccountFormMode = 'login' | 'register';

export const ACCOUNT_OPEN_EVENT = 'allways-open-account';

function elementWithStage(root: ParentNode): Element | null {
  if (typeof Element !== 'undefined' && root instanceof Element && root.hasAttribute('data-account-stage')) return root;
  return root.querySelector('[data-account-stage]');
}

export function visibleAccountMode(root: ParentNode | null): '' | AccountFormMode {
  if (!root) return '';
  const host = elementWithStage(root);
  if (!host || host.getAttribute('data-account-stage') !== 'form') return '';
  const mode = host.getAttribute('data-account-mode');
  return mode === 'register' ? 'register' : mode === 'login' ? 'login' : '';
}

export function showAccountForm(root: ParentNode, mode: AccountFormMode): boolean {
  const host = elementWithStage(root);
  if (!host) return false;
  host.setAttribute('data-account-stage', 'form');
  host.setAttribute('data-account-mode', mode);
  return visibleAccountMode(root) === mode;
}

export function accountFormSpeech(mode: AccountFormMode, language: PreferredLanguage): string {
  if (language === 'am') {
    return mode === 'register'
      ? 'የምዝገባ ቅጽ ነው። ሙሉ ስም፣ ኢሜይል፣ የይለፍ ቃል፣ እና ማረጋገጫ አሉ። ሙሉ ስምዎን ይንገሩኝ። የይለፍ ቃሉን ይጻፉ። አላነባውም።'
      : 'የመግቢያ ቅጽ ነው። ኢሜይል እና የይለፍ ቃል አሉ። ኢሜይልዎን ይንገሩኝ። የይለፍ ቃሉን ይጻፉ። አላነባውም።';
  }
  return mode === 'register'
    ? 'This is the register form. The fields are Full name, Email, Password, and Confirm password. Tell me your full name. Type the password. I will not read it.'
    : 'This is the sign-in form. The fields are Email and Password. Tell me your email. Type the password. I will not read it.';
}

export function accountChoicePrompt(language: PreferredLanguage): string {
  return language === 'am'
    ? 'መግባት እፈልጋለሁ ይበሉ። ወይም መመዝገብ እፈልጋለሁ ይበሉ።'
    : 'Say I want to log in, or I want to register.';
}

export function accountSwitchMissed(language: PreferredLanguage): string {
  return language === 'am'
    ? 'ቅጹ አልተቀየረም። እንደገና ይበሉ።'
    : 'The form did not change. Please say it again.';
}

export function passwordBoxFilled(language: PreferredLanguage): string {
  return language === 'am'
    ? 'የይለፍ ቃሉ በሳጥኑ ውስጥ ገብቷል። አላነባውም።'
    : 'The password box is filled. I will not read it.';
}

export function speechMatchesVisibleForm(mode: '' | AccountFormMode, speech: string): boolean {
  if (mode === 'register') return /Full name|ሙሉ ስም/.test(speech) && !/sign-in form|የመግቢያ ቅጽ/.test(speech);
  if (mode === 'login') return /sign-in form|የመግቢያ ቅጽ/.test(speech) && !/Full name|ሙሉ ስም/.test(speech);
  return false;
}

export function requestAccountForm(mode: AccountFormMode): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ACCOUNT_OPEN_EVENT, { detail: mode }));
}

export function visibleHeading(root: ParentNode | null): string {
  if (!root) return '';
  const heading = root.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() || '';
  const detail = root.querySelector('p')?.textContent?.replace(/\s+/g, ' ').trim() || '';
  return [heading, detail].filter(Boolean).join('. ');
}
