import { useCallback, useEffect, useRef, useState } from 'react';
import { Crosshair, Eye, EyeOff, Mic, MicOff, TriangleAlert, X } from 'lucide-react';
import type { AccessibilityPreferences } from '../types/accessbridge';
import { GazeCalibrationOverlay } from './GazeCalibrationOverlay';
import { GazeControlEngine, describeInteractiveElement } from './gazeControlEngine';
import { GazeOverlay } from './GazeOverlay';
import { GazeSettingsPanel } from './GazeSettingsPanel';
import {
  hasSavedGazeCalibration,
  isGazeAutoStartRequested,
} from './gazeCalibration';
import {
  getPermissionPromptSnapshot,
  subscribePermissionPrompt,
} from '../engines/browserPermissions';
import { gazeStatusForScreenReader } from './gazeVoiceAvailability';
import { useGazeVoiceCommands, type GazeVoiceStatus } from './useGazeVoiceCommands';
import type {
  GazeCalibrationData,
  GazeErrorInfo,
  GazeStatus,
} from './gazeTypes';

interface GazeControlManagerProps {
  preferences: AccessibilityPreferences;
  onUpdatePreferences: (patch: Partial<AccessibilityPreferences>) => void;
}

const STATUS_TOGGLE_LABEL: Record<GazeStatus, string> = {
  idle: 'Off',
  paused: 'Off',
  initializing: 'Starting',
  tracking: 'On',
  'no-face': 'No face',
  error: 'Error',
  calibrating: 'Calibrating',
};

const VOICE_STATUS_LABEL: Record<GazeVoiceStatus, string> = {
  off: 'Off',
  starting: 'Starting',
  listening: 'Listening',
  waiting: 'Waiting',
  error: 'Needs attention',
};

function isNativeInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'input, textarea, select, button, a[href], [contenteditable="true"], [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menuitem"]'
    )
  );
}

export function GazeControlManager({
  preferences,
  onUpdatePreferences,
}: GazeControlManagerProps) {
  const engineRef = useRef<GazeControlEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new GazeControlEngine({
      mode: preferences.gazeTrackingMode,
      activationMode: preferences.gazeActivationMode,
      dwellMs: preferences.gazeDwellMs,
      sensitivity: preferences.gazeSensitivity,
      smoothing: preferences.gazeSmoothing,
      edgeScrollSpeed: preferences.gazeEdgeScrollSpeed,
    });
  }
  const engine = engineRef.current;

  const [status, setStatus] = useState<GazeStatus>(() => engine.getStatus());
  const [error, setError] = useState<GazeErrorInfo | null>(null);
  const [calibration, setCalibration] = useState<GazeCalibrationData | null>(() =>
    engine.getCalibration()
  );
  const [panelOpen, setPanelOpen] = useState(false);
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');
  const [pendingCalibration, setPendingCalibration] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<GazeVoiceStatus>('off');
  const [voiceMessage, setVoiceMessage] = useState('Voice commands are off.');
  const autoCalibrationStartedRef = useRef(false);

  useEffect(() => {
    if (autoCalibrationStartedRef.current) return;
    autoCalibrationStartedRef.current = true;
    if (!isGazeAutoStartRequested() || hasSavedGazeCalibration()) return;
    setPendingCalibration(true);
    setLiveMessage('Starting gaze control and opening hands-free calibration.');
  }, []);

  useEffect(() => {
    const unsubscribeStatus = engine.onStatus(setStatus);
    const unsubscribeError = engine.onError((nextError) => {
      setError(nextError);
      if (nextError) setPanelOpen(true);
    });
    const unsubscribeCalibration = engine.onCalibrationChange(setCalibration);
    const unsubscribeClick = engine.onDwellClick((target) => {
      setLiveMessage(`Activated ${describeInteractiveElement(target)}.`);
    });
    const unsubscribePermissionPrompt = subscribePermissionPrompt((snapshot) => {
      engine.setInteractionSuspended(snapshot.active);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeError();
      unsubscribeCalibration();
      unsubscribeClick();
      unsubscribePermissionPrompt();
      engine.dispose();
    };
  }, [engine]);

  useEffect(() => {
    engine.updateSettings({
      mode: preferences.gazeTrackingMode,
      activationMode: preferences.gazeActivationMode,
      dwellMs: preferences.gazeDwellMs,
      sensitivity: preferences.gazeSensitivity,
      smoothing: preferences.gazeSmoothing,
      edgeScrollSpeed: preferences.gazeEdgeScrollSpeed,
    });
  }, [
    engine,
    preferences.gazeActivationMode,
    preferences.gazeDwellMs,
    preferences.gazeEdgeScrollSpeed,
    preferences.gazeSensitivity,
    preferences.gazeSmoothing,
    preferences.gazeTrackingMode,
  ]);

  useEffect(() => {
    if (preferences.gazeControlEnabled) {
      void engine.start();
    } else {
      engine.stop();
    }
  }, [engine, preferences.gazeControlEnabled]);

  const toggleEnabled = useCallback(() => {
    onUpdatePreferences({ gazeControlEnabled: !preferences.gazeControlEnabled });
  }, [onUpdatePreferences, preferences.gazeControlEnabled]);

  const activateAtReticle = useCallback(() => {
    if (getPermissionPromptSnapshot().active) {
      setLiveMessage(
        'Gaze activation is paused while the browser permission popup is open. Press Tab and Enter, or ask an assistant to choose Allow.'
      );
      return;
    }

    const target = engine.clickAtGaze();
    setLiveMessage(
      target
        ? `Activated ${describeInteractiveElement(target)}.`
        : 'No interactive element is under the gaze reticle.'
    );
  }, [engine]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if ((event.altKey && key === 'g') || event.key === 'F8') {
        event.preventDefault();
        toggleEnabled();
        return;
      }

      if (!preferences.gazeControlEnabled || calibrationOpen) return;

      if (event.key === 'F7') {
        event.preventDefault();
        activateAtReticle();
        return;
      }

      if (event.code === 'Space' && !isNativeInteractiveTarget(document.activeElement)) {
        event.preventDefault();
        activateAtReticle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activateAtReticle, calibrationOpen, preferences.gazeControlEnabled, toggleEnabled]);

  useEffect(() => {
    if (preferences.gazeControlEnabled || !calibrationOpen) return;
    engine.cancelCalibration();
    setCalibrationOpen(false);
  }, [calibrationOpen, engine, preferences.gazeControlEnabled]);

  useEffect(() => {
    if (!pendingCalibration) return;
    if (!preferences.gazeControlEnabled) {
      setPendingCalibration(false);
      return;
    }
    if (status === 'tracking' || status === 'no-face') {
      setPendingCalibration(false);
      setPanelOpen(false);
      setCalibrationOpen(true);
      setLiveMessage('Hands-free calibration started by voice command.');
      return;
    }
    if (status === 'error') {
      setPendingCalibration(false);
      setLiveMessage('Calibration could not start because gaze control has an error.');
    }
  }, [pendingCalibration, preferences.gazeControlEnabled, status]);

  const handleStartCalibration = useCallback(() => {
    if (!preferences.gazeControlEnabled) return;
    setPanelOpen(false);
    setCalibrationOpen(true);
    setLiveMessage('Hands-free calibration starting. Hold your gaze on each dot.');
  }, [preferences.gazeControlEnabled]);

  const handleCompleteCalibration = useCallback((nextCalibration: GazeCalibrationData) => {
    setCalibration(nextCalibration);
    setCalibrationOpen(false);
    setLiveMessage('Gaze calibration saved. Gaze control is ready to use.');
  }, []);

  const handleCloseCalibration = useCallback(() => {
    engine.cancelCalibration();
    setCalibrationOpen(false);
  }, [engine]);

  const handleResetCalibration = useCallback(() => {
    engine.resetCalibration();
    setLiveMessage('Gaze calibration reset. Using the default cursor mapping until you calibrate again.');
  }, [engine]);

  const handleRecenter = useCallback(() => {
    engine.recenter();
    setLiveMessage('Neutral position reset. Hold your head comfortably at the screen center for a moment.');
  }, [engine]);

  const handleVoiceStatus = useCallback((nextStatus: GazeVoiceStatus, message: string) => {
    setVoiceStatus(nextStatus);
    setVoiceMessage(message);
    const announcement = gazeStatusForScreenReader(nextStatus, message);
    if (announcement) setLiveMessage(announcement);
  }, []);

  const handleVoicePause = useCallback(() => {
    if (!preferences.gazeControlEnabled) {
      setLiveMessage('Gaze control is already paused.');
      return;
    }
    onUpdatePreferences({ gazeControlEnabled: false });
    setLiveMessage('Gaze control paused by voice command.');
  }, [onUpdatePreferences, preferences.gazeControlEnabled]);

  const handleVoiceResume = useCallback(() => {
    if (preferences.gazeControlEnabled) {
      setLiveMessage('Gaze control is already active.');
      return;
    }
    onUpdatePreferences({ gazeControlEnabled: true });
    setLiveMessage('Gaze control resumed by voice command.');
  }, [onUpdatePreferences, preferences.gazeControlEnabled]);

  const handleVoiceCalibrate = useCallback(() => {
    if (calibrationOpen) {
      setLiveMessage('Calibration is already open.');
      return;
    }
    if (!preferences.gazeControlEnabled) {
      setPendingCalibration(true);
      onUpdatePreferences({ gazeControlEnabled: true });
      setLiveMessage('Starting gaze control, then opening hands-free calibration.');
      return;
    }
    if (status === 'initializing' || status === 'idle' || status === 'paused') {
      setPendingCalibration(true);
      setLiveMessage('Waiting for gaze tracking to start before calibration.');
      return;
    }
    if (status === 'error') {
      setLiveMessage('Gaze control needs attention before calibration can start.');
      return;
    }
    setPanelOpen(false);
    setCalibrationOpen(true);
    setLiveMessage('Hands-free calibration started by voice command.');
  }, [
    calibrationOpen,
    onUpdatePreferences,
    preferences.gazeControlEnabled,
    status,
  ]);

  useGazeVoiceCommands({
    enabled: preferences.voiceCommands,
    engine,
    onCalibrate: handleVoiceCalibrate,
    onPause: handleVoicePause,
    onResume: handleVoiceResume,
    onStatus: handleVoiceStatus,
  });

  const enabled = preferences.gazeControlEnabled;
  const toggleLabel = enabled ? STATUS_TOGGLE_LABEL[status] : 'Off';

  return (
    <>
      <GazeOverlay
        engine={engine}
        enabled={enabled && !calibrationOpen}
        edgeScrollEnabled={preferences.gazeEdgeScrollSpeed > 0}
      />

      {!panelOpen && (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          aria-expanded={panelOpen}
          aria-controls="gaze-settings-title"
          aria-label={`Open gaze and head control settings. Current status: ${toggleLabel}.`}
          className={`fixed bottom-20 right-4 z-40 inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-xs font-semibold shadow-lg transition-colors ${
            error
              ? 'border-red-600 bg-red-50 text-red-900 hover:bg-red-100 high-contrast:border-red-400 high-contrast:bg-black high-contrast:text-red-300'
              : enabled
                ? 'border-[#15803D] bg-green-50 text-[#14532D] hover:bg-green-100 high-contrast:border-green-400 high-contrast:bg-black high-contrast:text-green-300'
                : 'border-[#001F3F] bg-white text-[#001F3F] hover:bg-slate-50 high-contrast:border-yellow-300 high-contrast:bg-black high-contrast:text-yellow-300'
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 rounded-full ${
              error
                ? 'bg-red-600'
                : enabled
                  ? status === 'tracking'
                    ? 'bg-green-600'
                    : 'bg-amber-500'
                  : 'bg-slate-400'
            }`}
          />
          {error ? (
            <TriangleAlert className="h-4 w-4" aria-hidden="true" />
          ) : enabled ? (
            <Eye className="h-4 w-4" aria-hidden="true" />
          ) : (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          )}
          Gaze: {toggleLabel}
        </button>
      )}

      {preferences.voiceCommands && voiceStatus !== 'off' && (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          aria-label={`Voice commands: ${VOICE_STATUS_LABEL[voiceStatus]}. ${voiceMessage} Open gaze settings.`}
          className={`fixed bottom-20 left-4 z-40 inline-flex max-w-[18rem] items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-left text-xs font-semibold shadow-lg transition-colors ${
            voiceStatus === 'error'
              ? 'border-red-600 bg-red-50 text-red-900 hover:bg-red-100 high-contrast:border-red-400 high-contrast:bg-black high-contrast:text-red-300'
              : 'border-[#0056B3] bg-blue-50 text-[#001F3F] hover:bg-blue-100 high-contrast:border-cyan-300 high-contrast:bg-black high-contrast:text-cyan-300'
          }`}
        >
          {voiceStatus === 'listening' ? (
            <Mic className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <MicOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span className="truncate">Voice: {VOICE_STATUS_LABEL[voiceStatus]}</span>
        </button>
      )}

      {error && !panelOpen && (
        <div
          role="alert"
          className="fixed left-1/2 top-4 z-[96] flex w-[min(94vw,34rem)] -translate-x-1/2 items-start gap-3 rounded-xl border-2 border-red-600 bg-white p-4 text-red-950 shadow-2xl high-contrast:border-red-400 high-contrast:bg-black high-contrast:text-red-200"
        >
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Gaze control needs attention</p>
            <p className="mt-1 text-xs leading-relaxed">{error.message}</p>
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              className="mt-2 rounded-md bg-red-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-800 high-contrast:bg-yellow-300 high-contrast:text-black"
            >
              Open gaze settings
            </button>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss gaze control alert"
            className="rounded-md p-1.5 text-red-900 hover:bg-red-100 high-contrast:text-red-200 high-contrast:hover:bg-neutral-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <GazeSettingsPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        preferences={preferences}
        onUpdatePreferences={onUpdatePreferences}
        status={status}
        error={error}
        calibration={calibration}
        voiceStatus={voiceStatus}
        voiceMessage={voiceMessage}
        onStartCalibration={handleStartCalibration}
        onResetCalibration={handleResetCalibration}
        onRecenter={handleRecenter}
      />

      <GazeCalibrationOverlay
        engine={engine}
        isOpen={calibrationOpen}
        onClose={handleCloseCalibration}
        onComplete={handleCompleteCalibration}
      />

      {!panelOpen && !enabled && (
        <div className="pointer-events-none fixed bottom-36 right-4 z-30 hidden max-w-[16rem] items-start gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-[11px] text-slate-600 shadow-md sm:flex high-contrast:border-slate-700 high-contrast:bg-black high-contrast:text-slate-300">
          <Crosshair className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0056B3] high-contrast:text-yellow-300" aria-hidden="true" />
          <span>
            Hands-free navigation is available. Open <strong>Gaze</strong> to start the camera and
            calibrate.
          </span>
        </div>
      )}

      <div className="sr-only" role="status" aria-live="polite">
        {liveMessage}
      </div>
    </>
  );
}
