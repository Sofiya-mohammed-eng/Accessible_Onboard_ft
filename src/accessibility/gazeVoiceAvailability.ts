import type { MicrophoneOwner } from '../engines/microphoneOwner';
import type { GazeVoiceStatus } from './useGazeVoiceCommands';

export const GAZE_VOICE_RETRY_MS = 900;

export const GAZE_VOICE_WAITING_MESSAGE =
  'Voice commands are waiting. The microphone is being used by another voice task.';

export function gazeVoiceWaitingStatus(): { status: 'waiting'; message: string } {
  return { status: 'waiting', message: GAZE_VOICE_WAITING_MESSAGE };
}

export function gazeMayAnnounceListening(input: {
  callbackToken: number;
  activeToken: number;
  owner: MicrophoneOwner | null;
}): boolean {
  return input.callbackToken === input.activeToken && input.owner === 'gaze';
}

export function gazeRetryDelay(input: {
  cancelled: boolean;
  restartAllowed: boolean;
  retryPending: boolean;
}): number | null {
  if (input.cancelled || !input.restartAllowed || input.retryPending) return null;
  return GAZE_VOICE_RETRY_MS;
}

export function gazeStatusForScreenReader(status: GazeVoiceStatus, message: string): string | null {
  if (status === 'off') return null;
  return message;
}
