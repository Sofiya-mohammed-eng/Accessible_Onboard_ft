import { getLanguageOption } from './i18n';
import type { PreferredLanguage } from '../types/accessbridge';

export function pageListenLanguage(pageKey: string, language: PreferredLanguage): string {
  if (!pageKey) return getLanguageOption(language).speechLang;
  return getLanguageOption(language).speechLang;
}

export function pageListenSequence(pageKey: string, language: PreferredLanguage): readonly string[] {
  return [pageListenLanguage(pageKey, language)];
}

export function startupRecognitionLanguages(): readonly ['am-ET', 'en-US'] {
  return ['am-ET', 'en-US'];
}
