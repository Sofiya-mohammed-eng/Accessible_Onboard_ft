export type MicrophoneOwner = 'conversation' | 'dictation' | 'gaze' | 'dock' | 'navigation';

const CAN_PREEMPT: Record<MicrophoneOwner, MicrophoneOwner[]> = {
  dictation: ['conversation', 'gaze', 'dock', 'navigation'],
  conversation: ['gaze', 'dock', 'navigation'],
  dock: ['gaze'],
  navigation: ['gaze'],
  gaze: [],
};

let owner: MicrophoneOwner | null = null;
let speechDepth = 0;
const listeners = new Set<() => void>();
const ownerWatchers = new Set<() => void>();

function notifyOwnerWatchers(): void {
  [...ownerWatchers].forEach((listener) => listener());
}

export function watchMicrophoneOwner(listener: () => void): () => void {
  ownerWatchers.add(listener);
  return () => ownerWatchers.delete(listener);
}

export function microphoneOwner(): MicrophoneOwner | null {
  return owner;
}

export function microphonePausedForSpeech(): boolean {
  return speechDepth > 0;
}

export function acquireMicrophone(next: MicrophoneOwner): boolean {
  if (speechDepth > 0) return false;
  if (owner === next) return true;
  if (owner !== null && !CAN_PREEMPT[next].includes(owner)) return false;
  const previous = owner;
  owner = next;
  if (previous !== next) notifyOwnerWatchers();
  return true;
}

export function releaseMicrophone(current: MicrophoneOwner): boolean {
  if (owner !== current) return false;
  owner = null;
  notifyOwnerWatchers();
  wakeMicrophoneWaiters();
  return true;
}

export function beginSpeechPause(): void {
  speechDepth += 1;
  const yielded = owner === 'gaze' || owner === 'dock' || owner === 'navigation';
  if (!yielded) return;
  owner = null;
  notifyOwnerWatchers();
}

export function endSpeechPause(): void {
  if (speechDepth === 0) return;
  speechDepth -= 1;
  if (speechDepth === 0) wakeMicrophoneWaiters();
}

export function subscribeMicrophone(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function wakeMicrophoneWaiters(): void {
  [...listeners].forEach((listener) => listener());
}

export function waitForMicrophone(next: MicrophoneOwner, cancelled: () => boolean): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ready: boolean) => {
      if (settled) return;
      settled = true;
      unsubscribe();
      resolve(ready);
    };
    const attempt = () => {
      if (cancelled()) {
        finish(false);
        return;
      }
      if (acquireMicrophone(next)) finish(true);
    };
    const unsubscribe = subscribeMicrophone(attempt);
    attempt();
  });
}

export function resetMicrophoneOwnerForTests(): void {
  owner = null;
  speechDepth = 0;
  listeners.clear();
  ownerWatchers.clear();
}
