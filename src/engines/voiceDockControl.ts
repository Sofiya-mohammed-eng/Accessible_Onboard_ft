import { getPageCopy } from './pageCopy';
import { acquireMicrophone, microphoneOwner, releaseMicrophone } from './microphoneOwner';
import type { PreferredLanguage } from '../types/accessbridge';

export interface VoiceDockRequest {
  accepted: boolean;
  listening: boolean;
  note: string;
}

export function requestVoiceDock(language: PreferredLanguage): VoiceDockRequest {
  const copy = getPageCopy(language);
  if (!acquireMicrophone('dock')) {
    return { accepted: false, listening: false, note: copy.microphoneBusy };
  }
  return { accepted: true, listening: true, note: copy.listening };
}

export function nextVoiceDockAction(hasSession: boolean, language: PreferredLanguage):
  | { action: 'stop' }
  | { action: 'busy'; note: string }
  | { action: 'start'; note: string } {
  if (hasSession) return { action: 'stop' };
  const request = requestVoiceDock(language);
  if (!request.accepted) return { action: 'busy', note: request.note };
  return { action: 'start', note: request.note };
}

export function releaseVoiceDock(): boolean {
  return releaseMicrophone('dock');
}

export function voiceDockStillOwnsSession(sessionIsCurrent: boolean): boolean {
  return microphoneOwner() === 'dock' && sessionIsCurrent;
}

export function noteAfterDockEnd(language: PreferredLanguage, note: string, heardTranscript: boolean): string {
  const copy = getPageCopy(language);
  if (heardTranscript) return note;
  if (note === copy.listening) return copy.nothingHeard;
  return note;
}
