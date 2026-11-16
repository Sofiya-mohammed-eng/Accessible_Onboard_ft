import { useEffect, useRef } from 'react';
import {
  ArrowUpDown,
  CircleCheck,
  Crosshair,
  Eye,
  EyeOff,
  Focus,
  Gauge,
  Keyboard,
  Mic,
  MicOff,
  MousePointerClick,
  Pause,
  Play,
  RotateCcw,
  ScanFace,
  ShieldCheck,
  Timer,
  TriangleAlert,
  Waves,
  X,
} from 'lucide-react';
import type {
  AccessibilityPreferences,
  GazeActivationMode,
  GazeTrackingMode,
} from '../types/accessbridge';
import type {
  GazeCalibrationData,
  GazeErrorInfo,
  GazeStatus,
} from './gazeTypes';
import type { GazeVoiceStatus } from './useGazeVoiceCommands';

interface GazeSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: AccessibilityPreferences;
  onUpdatePreferences: (patch: Partial<AccessibilityPreferences>) => void;
  status: GazeStatus;
  error: GazeErrorInfo | null;
  calibration: GazeCalibrationData | null;
  voiceStatus: GazeVoiceStatus;
  voiceMessage: string;
  onStartCalibration: () => void;
  onResetCalibration: () => void;
  onRecenter: () => void;
}

const MODE_OPTIONS: Array<{
  id: GazeTrackingMode;
  label: string;
  detail: string;
}> = [
  {
    id: 'hybrid',
    label: 'Hybrid',
    detail: 'Head + eyes together for the most precise reach.',
  },
  {
    id: 'head',
    label: 'Head only',
    detail: 'Use head movement only—helpful for eye fatigue.',
  },
  {
    id: 'eye',
    label: 'Eyes only',
    detail: 'Use iris movement while keeping the head still.',
  },
];

const ACTIVATION_OPTIONS: Array<{
  id: GazeActivationMode;
  label: string;
  detail: string;
}> = [
  {
    id: 'dwell',
    label: 'Dwell',
    detail: 'Click by holding your gaze on a target for the dwell time.',
  },
  {
    id: 'blink',
    label: 'Blink',
    detail: 'Click with a deliberate blink held between 400 and 700 milliseconds.',
  },
  {
    id: 'both',
    label: 'Both',
    detail: 'Use either dwell or a deliberate blink to click.',
  },
];

const VOICE_STATUS_COPY: Record<GazeVoiceStatus, string> = {
  off: 'Voice commands are off.',
  starting: 'Waiting for microphone permission and starting voice commands.',
  listening: 'Listening for voice commands.',
  error: 'Voice commands need attention.',
};

const STATUS_COPY: Record<GazeStatus, { label: string; classes: string; dot: string }> = {
  idle: {
    label: 'Off',
    classes: 'border-slate-300 bg-slate-50 text-slate-700',
    dot: 'bg-slate-400',
  },
  paused: {
    label: 'Paused',
    classes: 'border-slate-300 bg-slate-50 text-slate-700',
    dot: 'bg-slate-400',
  },
  initializing: {
    label: 'Starting camera…',
    classes: 'border-amber-400 bg-amber-50 text-amber-900',
    dot: 'bg-amber-500 animate-pulse',
  },
  tracking: {
    label: 'Tracking active',
    classes: 'border-green-500 bg-green-50 text-green-900',
    dot: 'bg-green-600',
  },
  'no-face': {
    label: 'No face detected',
    classes: 'border-amber-400 bg-amber-50 text-amber-900',
    dot: 'bg-amber-500',
  },
  error: {
    label: 'Camera error',
    classes: 'border-red-500 bg-red-50 text-red-900',
    dot: 'bg-red-600',
  },
  calibrating: {
    label: 'Calibrating',
    classes: 'border-[#007BFF] bg-blue-50 text-blue-900',
    dot: 'bg-[#007BFF] animate-pulse',
  },
};

export function GazeSettingsPanel({
  isOpen,
  onClose,
  preferences,
  onUpdatePreferences,
  status,
  error,
  calibration,
  voiceStatus,
  voiceMessage,
  onStartCalibration,
  onResetCalibration,
  onRecenter,
}: GazeSettingsPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const statusInfo = STATUS_COPY[status];
  const enabled = preferences.gazeControlEnabled;
  const sensitivityPercent = Math.round(preferences.gazeSensitivity * 100);
  const smoothingPercent = Math.round(preferences.gazeSmoothing * 100);
  const edgeScrollSpeed = preferences.gazeEdgeScrollSpeed;
  const dwellDisabled = preferences.gazeActivationMode === 'blink';
  const activationDetail = ACTIVATION_OPTIONS.find(
    (option) => option.id === preferences.gazeActivationMode
  )?.detail;
  const voiceStatusText =
    voiceStatus === 'error'
      ? voiceMessage
      : voiceStatus === 'off'
        ? VOICE_STATUS_COPY.off
        : voiceMessage || VOICE_STATUS_COPY[voiceStatus];

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="gaze-settings-title"
      aria-describedby="gaze-settings-subtitle"
      className="fixed bottom-20 right-4 z-[85] flex max-h-[calc(100vh-6rem)] w-[min(94vw,25rem)] flex-col overflow-hidden rounded-xl border-2 border-[#001F3F] bg-white shadow-2xl high-contrast:border-yellow-300 high-contrast:bg-black"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4 high-contrast:border-white">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#001F3F] text-white high-contrast:bg-yellow-300 high-contrast:text-black">
            <ScanFace className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2
              id="gaze-settings-title"
              className="font-display text-lg font-bold leading-tight text-[#001F3F] high-contrast:text-white"
            >
              Gaze &amp; Head Control
            </h2>
            <p id="gaze-settings-subtitle" className="mt-0.5 text-xs text-slate-600 high-contrast:text-slate-300">
              Hands-free cursor, dwell or blink click, voice commands, and calibration.
            </p>
          </div>
        </div>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close gaze control settings"
          className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-100 high-contrast:border-white high-contrast:text-white high-contrast:hover:bg-neutral-900"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${statusInfo.classes}`}>
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusInfo.dot}`} aria-hidden="true" />
          <span>{statusInfo.label}</span>
          <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] opacity-80">
            {enabled ? <Eye className="h-3.5 w-3.5" aria-hidden="true" /> : <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />}
            {enabled ? 'ON' : 'OFF'}
          </span>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-3 rounded-lg border-2 border-red-500 bg-red-50 p-3 text-xs text-red-950 high-contrast:border-red-400 high-contrast:bg-black high-contrast:text-red-200"
          >
            <p className="flex items-center gap-2 font-bold">
              <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
              {error.code === 'permission-denied'
                ? 'Camera permission denied'
                : error.code === 'no-camera'
                  ? 'No camera found'
                  : error.code === 'camera-busy'
                    ? 'Camera is busy'
                    : error.code === 'model-load-failed'
                      ? 'Tracking model unavailable'
                      : 'Gaze control could not start'}
            </p>
            <p className="mt-1.5 leading-relaxed">{error.message}</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => onUpdatePreferences({ gazeControlEnabled: !enabled })}
          aria-pressed={enabled}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-bold transition-colors ${
            enabled
              ? 'border-[#001F3F] bg-[#001F3F] text-white hover:bg-[#003366] high-contrast:border-yellow-300 high-contrast:bg-yellow-300 high-contrast:text-black'
              : 'border-[#007BFF] bg-white text-[#001F3F] hover:bg-blue-50 high-contrast:border-yellow-300 high-contrast:bg-black high-contrast:text-yellow-300'
          }`}
        >
          {enabled ? (
            <>
              <Pause className="h-4 w-4" aria-hidden="true" />
              Pause gaze control
            </>
          ) : (
            <>
              <Play className="h-4 w-4" aria-hidden="true" />
              Start gaze control
            </>
          )}
        </button>
        <p className="mt-1.5 text-center text-[11px] text-slate-500 high-contrast:text-slate-400">
          Camera stays off until gaze control starts. <kbd className="font-mono">F8</kbd> or{' '}
          <kbd className="font-mono">Alt+G</kbd> pauses immediately.
        </p>

        <fieldset className="mt-5">
          <legend className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600 high-contrast:text-slate-300">
            <Focus className="h-3.5 w-3.5" aria-hidden="true" />
            Tracking mode
          </legend>
          <div
            role="radiogroup"
            aria-label="Gaze tracking mode"
            aria-describedby="gaze-tracking-mode-detail"
            className="mt-2 grid grid-cols-3 gap-2"
          >
            {MODE_OPTIONS.map((option) => {
              const selected = preferences.gazeTrackingMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onUpdatePreferences({ gazeTrackingMode: option.id })}
                  className={`rounded-lg border-2 px-2 py-2.5 text-center text-xs font-bold transition-colors ${
                    selected
                      ? 'border-[#0056B3] bg-blue-50 text-[#001F3F] high-contrast:border-yellow-300 high-contrast:bg-neutral-900 high-contrast:text-yellow-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 high-contrast:border-slate-700 high-contrast:bg-black high-contrast:text-slate-300'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p id="gaze-tracking-mode-detail" className="mt-1.5 text-[11px] text-slate-500 high-contrast:text-slate-400">
            {MODE_OPTIONS.find((option) => option.id === preferences.gazeTrackingMode)?.detail}
          </p>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600 high-contrast:text-slate-300">
            <MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" />
            Click activation
          </legend>
          <div
            role="radiogroup"
            aria-label="Gaze click activation mode"
            aria-describedby="gaze-activation-detail"
            className="mt-2 grid grid-cols-3 gap-2"
          >
            {ACTIVATION_OPTIONS.map((option) => {
              const selected = preferences.gazeActivationMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onUpdatePreferences({ gazeActivationMode: option.id })}
                  className={`rounded-lg border-2 px-2 py-2.5 text-center text-xs font-bold transition-colors ${
                    selected
                      ? 'border-[#0056B3] bg-blue-50 text-[#001F3F] high-contrast:border-yellow-300 high-contrast:bg-neutral-900 high-contrast:text-yellow-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 high-contrast:border-slate-700 high-contrast:bg-black high-contrast:text-slate-300'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p id="gaze-activation-detail" className="mt-1.5 text-[11px] text-slate-500 high-contrast:text-slate-400">
            {activationDetail}
          </p>
        </fieldset>

        <div className="mt-5 space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="gaze-dwell-duration"
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600 high-contrast:text-slate-300"
              >
                <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                Dwell click time
              </label>
              <output
                htmlFor="gaze-dwell-duration"
                className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#001F3F] high-contrast:bg-neutral-800 high-contrast:text-yellow-300"
              >
                {preferences.gazeDwellMs} ms
              </output>
            </div>
            <input
              id="gaze-dwell-duration"
              type="range"
              min={400}
              max={1500}
              step={50}
              value={preferences.gazeDwellMs}
              disabled={dwellDisabled}
              onChange={(event) =>
                onUpdatePreferences({ gazeDwellMs: Number(event.target.value) })
              }
              aria-valuetext={`${preferences.gazeDwellMs} milliseconds`}
              className="mt-1.5 h-2 w-full cursor-pointer accent-[#0056B3] disabled:cursor-not-allowed disabled:opacity-40 high-contrast:accent-yellow-300"
            />
            <p className="mt-1 text-[11px] text-slate-500 high-contrast:text-slate-400">
              {dwellDisabled
                ? 'Dwell is disabled while Blink activation is selected.'
                : 'How long to hold your gaze before a click is triggered.'}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="gaze-sensitivity"
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600 high-contrast:text-slate-300"
              >
                <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
                Sensitivity
              </label>
              <output
                htmlFor="gaze-sensitivity"
                className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#001F3F] high-contrast:bg-neutral-800 high-contrast:text-yellow-300"
              >
                {sensitivityPercent}%
              </output>
            </div>
            <input
              id="gaze-sensitivity"
              type="range"
              min={0}
              max={100}
              step={5}
              value={sensitivityPercent}
              onChange={(event) =>
                onUpdatePreferences({ gazeSensitivity: Number(event.target.value) / 100 })
              }
              aria-valuetext={`${sensitivityPercent} percent`}
              className="mt-1.5 h-2 w-full cursor-pointer accent-[#0056B3] high-contrast:accent-yellow-300"
            />
            <p className="mt-1 text-[11px] text-slate-500 high-contrast:text-slate-400">
              Higher sensitivity covers more of the screen with smaller head or eye movements.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="gaze-edge-scroll-speed"
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600 high-contrast:text-slate-300"
              >
                <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
                Edge scroll speed
              </label>
              <output
                htmlFor="gaze-edge-scroll-speed"
                className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#001F3F] high-contrast:bg-neutral-800 high-contrast:text-yellow-300"
              >
                {edgeScrollSpeed > 0 ? `${edgeScrollSpeed} px/s` : 'Off'}
              </output>
            </div>
            <input
              id="gaze-edge-scroll-speed"
              type="range"
              min={0}
              max={1200}
              step={30}
              value={edgeScrollSpeed}
              onChange={(event) =>
                onUpdatePreferences({ gazeEdgeScrollSpeed: Number(event.target.value) })
              }
              aria-valuetext={
                edgeScrollSpeed > 0
                  ? `${edgeScrollSpeed} pixels per second`
                  : 'Edge scrolling off'
              }
              className="mt-1.5 h-2 w-full cursor-pointer accent-[#0056B3] high-contrast:accent-yellow-300"
            />
            <p className="mt-1 text-[11px] text-slate-500 high-contrast:text-slate-400">
              Look into the top or bottom 60 pixels to scroll. Set to Off to disable edge scrolling.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="gaze-smoothing"
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600 high-contrast:text-slate-300"
              >
                <Waves className="h-3.5 w-3.5" aria-hidden="true" />
                Smoothing
              </label>
              <output
                htmlFor="gaze-smoothing"
                className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#001F3F] high-contrast:bg-neutral-800 high-contrast:text-yellow-300"
              >
                {smoothingPercent}%
              </output>
            </div>
            <input
              id="gaze-smoothing"
              type="range"
              min={0}
              max={100}
              step={5}
              value={smoothingPercent}
              onChange={(event) =>
                onUpdatePreferences({ gazeSmoothing: Number(event.target.value) / 100 })
              }
              aria-valuetext={`${smoothingPercent} percent`}
              className="mt-1.5 h-2 w-full cursor-pointer accent-[#0056B3] high-contrast:accent-yellow-300"
            />
            <p className="mt-1 text-[11px] text-slate-500 high-contrast:text-slate-400">
              Higher smoothing reduces jitter but adds a little cursor lag.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-lg border-2 border-slate-200 p-3 high-contrast:border-slate-700">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#001F3F] high-contrast:bg-neutral-800 high-contrast:text-yellow-300">
              {preferences.voiceCommands ? (
                <Mic className="h-4 w-4" aria-hidden="true" />
              ) : (
                <MicOff className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-sm font-bold text-[#001F3F] high-contrast:text-white">
                Voice commands
              </h3>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600 high-contrast:text-slate-300">
                Hands-free click, scroll, calibration, pause, and resume using your voice.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={preferences.voiceCommands}
              aria-label={`Voice commands ${preferences.voiceCommands ? 'on' : 'off'}`}
              onClick={() =>
                onUpdatePreferences({ voiceCommands: !preferences.voiceCommands })
              }
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border-2 px-2.5 py-1 text-[11px] font-bold transition-colors ${
                preferences.voiceCommands
                  ? 'border-[#15803D] bg-green-50 text-[#14532D] high-contrast:border-green-400 high-contrast:bg-black high-contrast:text-green-300'
                  : 'border-slate-300 bg-white text-slate-600 high-contrast:border-slate-600 high-contrast:bg-black high-contrast:text-slate-300'
              }`}
            >
              {preferences.voiceCommands ? 'On' : 'Off'}
            </button>
          </div>

          {preferences.voiceCommands && (
            <div
              role="status"
              className={`mt-2 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold ${
                voiceStatus === 'error'
                  ? 'border-red-500 bg-red-50 text-red-900 high-contrast:border-red-400 high-contrast:bg-black high-contrast:text-red-200'
                  : voiceStatus === 'listening'
                    ? 'border-green-500 bg-green-50 text-green-900 high-contrast:border-green-400 high-contrast:bg-black high-contrast:text-green-200'
                    : 'border-amber-400 bg-amber-50 text-amber-900 high-contrast:border-yellow-300 high-contrast:bg-black high-contrast:text-yellow-200'
              }`}
            >
              {voiceStatusText}
            </div>
          )}

          <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-600 high-contrast:text-slate-300">
            <p>
              <kbd className="font-mono text-[10px]">&quot;click&quot;</kbd> /{' '}
              <kbd className="font-mono text-[10px]">&quot;select&quot;</kbd>
            </p>
            <p>
              <kbd className="font-mono text-[10px]">&quot;scroll down&quot;</kbd> /{' '}
              <kbd className="font-mono text-[10px]">&quot;scroll up&quot;</kbd>
            </p>
            <p>
              <kbd className="font-mono text-[10px]">&quot;calibrate&quot;</kbd>
            </p>
            <p>
              <kbd className="font-mono text-[10px]">&quot;pause&quot;</kbd> /{' '}
              <kbd className="font-mono text-[10px]">&quot;resume&quot;</kbd>
            </p>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500 high-contrast:text-slate-400">
            Chrome or Edge and microphone permission are required. Say &quot;resume&quot; to restart
            gaze control when it is paused.
          </p>
        </div>

        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600 high-contrast:bg-neutral-950 high-contrast:text-slate-300">
          <span className="font-bold text-[#001F3F] high-contrast:text-yellow-300">
            Zero-touch start:
          </span>{' '}
          save a calibration or open the app with <kbd className="font-mono">?autostart=gaze</kbd>{' '}
          to start gaze control automatically. Browser permission setup is documented in{' '}
          <span className="font-mono">docs/hands-free-setup.md</span>.
        </p>

        <div className="mt-5 rounded-lg border-2 border-slate-200 p-3 high-contrast:border-slate-700">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#001F3F] high-contrast:bg-neutral-800 high-contrast:text-yellow-300">
              <Crosshair className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-sm font-bold text-[#001F3F] high-contrast:text-white">
                Calibration
              </h3>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600 high-contrast:text-slate-300">
                {calibration ? (
                  <>
                    <CircleCheck
                      className="mr-1 inline h-3.5 w-3.5 text-green-700 high-contrast:text-green-400"
                      aria-hidden="true"
                    />
                    Calibrated {new Date(calibration.createdAt).toLocaleString()} with{' '}
                    {calibration.points.length} points. Stored only in this browser.
                  </>
                ) : (
                  <>
                    Not calibrated yet. A 9-point calibration dramatically improves accuracy. Turn
                    gaze control on first, then run the wizard.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onStartCalibration}
              disabled={!enabled || status === 'initializing'}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#001F3F] px-3 py-2 text-xs font-bold text-white hover:bg-[#003366] disabled:cursor-not-allowed disabled:opacity-50 high-contrast:bg-yellow-300 high-contrast:text-black"
            >
              <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
              {calibration ? 'Recalibrate' : 'Run calibration'}
            </button>
            <button
              type="button"
              onClick={onRecenter}
              disabled={!enabled || status !== 'tracking'}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-xs font-bold text-[#001F3F] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Recenter
            </button>
            <button
              type="button"
              onClick={onResetCalibration}
              disabled={!calibration}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-xs font-bold text-[#001F3F] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Reset
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600 high-contrast:bg-neutral-950 high-contrast:text-slate-300">
          <p className="flex items-center gap-1.5 font-bold text-[#001F3F] high-contrast:text-yellow-300">
            <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
            Keyboard fallback
          </p>
          <ul className="mt-1.5 space-y-1">
            <li>
              <kbd className="font-mono text-[10px]">F7</kbd> or <kbd className="font-mono text-[10px]">Space</kbd>{' '}
              — activate the element under the reticle
            </li>
            <li>
              <kbd className="font-mono text-[10px]">F8</kbd> / <kbd className="font-mono text-[10px]">Alt+G</kbd>{' '}
              — pause or resume immediately
            </li>
          </ul>
        </div>

        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500 high-contrast:text-slate-400">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Video frames are processed locally in your browser with MediaPipe. No camera data is
          uploaded or stored.
        </p>
      </div>
    </section>
  );
}
