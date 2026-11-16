import type { PreferredLanguage } from './accessbridge';

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  stream: boolean;
  format?: 'json';
  options?: {
    temperature?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
  error?: string;
}

export interface OllamaGenerateOptions {
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  stream?: boolean;
  format?: 'json';
  timeoutMs?: number;
  signal?: AbortSignal;
  onToken?: (token: string) => void;
}

export interface LocalTextParsingOptions {
  targetLanguage: string;
  instruction?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface LocalSearchParsingOptions {
  targetLanguage: PreferredLanguage;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface LocalSearchParsingResult {
  searchText: string;
}

export type OllamaServiceErrorCode =
  | 'aborted'
  | 'http'
  | 'invalid_response'
  | 'timeout'
  | 'unavailable';
