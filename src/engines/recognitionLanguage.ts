import type { ConversationListenFailure } from './accessibilityEngine';
import { listenFailureMessage, listenOnce, peekListenFailure } from './accessibilityEngine';
import { getLanguageOption } from './i18n';
import type { PreferredLanguage } from '../types/accessbridge';

export const STARTUP_ENGLISH_LISTEN_MS = 5000;
export const STARTUP_AMHARIC_LISTEN_MS = 8000;

const SPOKEN_PROMPT = 'say english, or say amharic';
const SPOKEN_AMHARIC_PROMPT = 'እንግሊዝኛ ወይም አማርኛ';

export function pageListenLanguage(pageKey: string, language: PreferredLanguage): string {
  if (!pageKey) return getLanguageOption(language).speechLang;
  return getLanguageOption(language).speechLang;
}

export function pageListenSequence(pageKey: string, language: PreferredLanguage): readonly string[] {
  return [pageListenLanguage(pageKey, language)];
}

export function startupLanguageChoice(transcript: string): 'en' | 'am' | null {
  const heard = transcript.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!heard) return null;
  if (heard.includes(SPOKEN_PROMPT) || heard.includes(SPOKEN_AMHARIC_PROMPT)) return null;
  const wantsAmharic = ['amharic', 'አማርኛ', 'amarinya'].some((phrase) => heard.includes(phrase));
  const wantsEnglish = ['english', 'እንግሊዝኛ'].some((phrase) => heard.includes(phrase));
  if (wantsAmharic && wantsEnglish) return null;
  if (wantsAmharic) return 'am';
  if (wantsEnglish) return 'en';
  return null;
}

export function startupListenRetry(
  failure: ConversationListenFailure | null,
  language: PreferredLanguage,
): string {
  if (failure === 'permission-denied' || failure === 'unavailable' || failure === 'timed-out' || failure === 'cancelled') {
    return listenFailureMessage(failure, language);
  }
  return language === 'am'
    ? 'ምንም ንግግር አልተሰማም። እንግሊዝኛ ወይም አማርኛ ይበሉ።'
    : 'No speech was heard. Please say English or Amharic.';
}

export async function listenForStartupLanguage(
  onPhase?: (lang: 'en' | 'am') => void,
): Promise<'en' | 'am' | null> {
  onPhase?.('en');
  const english = startupLanguageChoice(await listenOnce('en-US', STARTUP_ENGLISH_LISTEN_MS));
  if (english) return english;
  const blocked = peekListenFailure();
  if (blocked === 'permission-denied' || blocked === 'unavailable' || blocked === 'cancelled') return null;
  onPhase?.('am');
  return startupLanguageChoice(await listenOnce('am-ET', STARTUP_AMHARIC_LISTEN_MS, 1));
}
