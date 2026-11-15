import { getPageCopy } from './pageCopy';
import { acquireMicrophone, releaseMicrophone } from './microphoneOwner';
import type { PreferredLanguage } from '../types/accessbridge';

export function beginDictation(language: PreferredLanguage): { ok: boolean; note: string } {
  const copy = getPageCopy(language);
  if (!acquireMicrophone('dictation')) {
    return { ok: false, note: copy.microphoneBusy };
  }
  return { ok: true, note: copy.voiceListening };
}

export function noteAfterDictationLoss(language: PreferredLanguage, note: string): string {
  const copy = getPageCopy(language);
  if (note === copy.voiceListening) return copy.voiceStopped;
  return note;
}

export function noteAfterQuietDictation(language: PreferredLanguage, note: string, heardTranscript: boolean): string {
  const copy = getPageCopy(language);
  if (heardTranscript) return note;
  if (note === copy.voiceListening) return copy.nothingHeard;
  return note;
}

export function releaseDictation(): boolean {
  return releaseMicrophone('dictation');
}
