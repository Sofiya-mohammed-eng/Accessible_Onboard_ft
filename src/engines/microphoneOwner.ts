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
  owner = next;
  return true;
}

export function releaseMicrophone(current: MicrophoneOwner): boolean {
  if (owner !== current) return false;
  owner = null;
  wakeMicrophoneWaiters();
  return true;
}

export function beginSpeechPause(): void {
  if (owner === 'gaze' || owner === 'dock' || owner === 'navigation') owner = null;
  speechDepth += 1;
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
}
