export type KeyboardTarget = 'conversation-resume' | 'application-next' | 'text-entry' | 'submit' | 'other';

export interface KeyboardActivation {
  key: string;
  repeat?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  target: KeyboardTarget;
  awaitingResume: boolean;
}

export interface KeyboardEffect {
  resumeConversation: boolean;
  advanceApplication: boolean;
}

export type ShortcutDestination = 'jobs' | 'apply' | 'login';

export interface ShortcutResult {
  destination: ShortcutDestination | null;
  findJobs: boolean;
  ok: boolean | null;
  resumeConversation: false;
}

export function navigationShortcut(key: string, signedIn: boolean, currentView: string): ShortcutResult | null {
  if (key !== '1' && key !== '2' && key !== '3') return null;
  if (key === '1') {
    const ok = signedIn;
    return {
      destination: ok && currentView !== 'jobs' ? 'jobs' : null,
      findJobs: true,
      ok,
      resumeConversation: false,
    };
  }
  const destination: ShortcutDestination = key === '2' && signedIn ? 'apply' : 'login';
  return {
    destination: currentView === destination ? null : destination,
    findJobs: false,
    ok: null,
    resumeConversation: false,
  };
}

function isActivationKey(key: string): boolean {
  return key === 'Enter' || key === ' ' || key === 'Spacebar';
}

export function keyboardEffects(activation: KeyboardActivation): KeyboardEffect {
  const none = { resumeConversation: false, advanceApplication: false };
  if (activation.repeat || activation.altKey || activation.ctrlKey || activation.metaKey) return none;
  if (!isActivationKey(activation.key)) return none;
  if (activation.target === 'text-entry' || activation.target === 'submit' || activation.target === 'other') return none;
  if (activation.target === 'application-next') {
    return { resumeConversation: false, advanceApplication: true };
  }
  if (!activation.awaitingResume) return none;
  return { resumeConversation: true, advanceApplication: false };
}
