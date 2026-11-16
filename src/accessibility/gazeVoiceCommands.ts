export type GazeVoiceCommand =
  | 'activate'
  | 'click'
  | 'scroll-down'
  | 'scroll-up'
  | 'calibrate'
  | 'pause'
  | 'resume';

function normalizeTranscript(transcript: string): string {
  return transcript
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchGazeVoiceCommand(transcript: string): GazeVoiceCommand | null {
  const text = normalizeTranscript(transcript);
  if (!text) return null;

  if (/\bscroll\s+down\b/.test(text) || /\bpage\s+down\b/.test(text)) {
    return 'scroll-down';
  }
  if (/\bscroll\s+up\b/.test(text) || /\bpage\s+up\b/.test(text)) {
    return 'scroll-up';
  }
  if (/\bcalibrat(e|ion)\b/.test(text)) {
    return 'calibrate';
  }
  if (/\bclick\b/.test(text) || /\bselect\b/.test(text)) {
    return 'click';
  }
  if (
    /\bactivate\b/.test(text) ||
    /\bgaze\s+on\b/.test(text) ||
    /\bturn\s+on\s+gaze\b/.test(text) ||
    /\benable\s+gaze\b/.test(text) ||
    /\bstart\s+gaze\b/.test(text)
  ) {
    return 'activate';
  }
  if (/\bpause\b/.test(text) || /\bstop\b/.test(text)) {
    return 'pause';
  }
  if (/\bresume\b/.test(text) || /\bstart\b/.test(text)) {
    return 'resume';
  }

  return null;
}
