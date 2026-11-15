import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Crosshair, RotateCcw, Trash2, X } from 'lucide-react';
import { GazeControlEngine } from './gazeControlEngine';
import {
  GazeCalibrationData,
  GazeCalibrationPointTarget,
} from './gazeTypes';

interface GazeCalibrationOverlayProps {
  engine: GazeControlEngine;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (calibration: GazeCalibrationData) => void;
}

type CalibrationZone = 'seek' | 'stabilizing' | 'saving' | 'no-face';

const AUTO_CAPTURE_MS = 1200;
const STABILITY_MOTION_PX = 48;
const MIN_TARGET_RADIUS_PX = 96;
const MAX_TARGET_RADIUS_PX = 220;

const TARGETS: GazeCalibrationPointTarget[] = [
  { id: 'center', label: 'Center', xNorm: 0.5, yNorm: 0.5 },
  { id: 'top-left', label: 'Top left', xNorm: 0.1, yNorm: 0.15 },
  { id: 'top-center', label: 'Top center', xNorm: 0.5, yNorm: 0.15 },
  { id: 'top-right', label: 'Top right', xNorm: 0.9, yNorm: 0.15 },
  { id: 'middle-left', label: 'Middle left', xNorm: 0.1, yNorm: 0.5 },
  { id: 'middle-right', label: 'Middle right', xNorm: 0.9, yNorm: 0.5 },
  { id: 'bottom-left', label: 'Bottom left', xNorm: 0.1, yNorm: 0.8 },
  { id: 'bottom-center', label: 'Bottom center', xNorm: 0.5, yNorm: 0.8 },
  { id: 'bottom-right', label: 'Bottom right', xNorm: 0.9, yNorm: 0.8 },
];

function targetRadiusPx(): number {
  const shortestSide = Math.min(window.innerWidth, window.innerHeight);
  return Math.max(
    MIN_TARGET_RADIUS_PX,
    Math.min(MAX_TARGET_RADIUS_PX, shortestSide * 0.18)
  );
}

export function GazeCalibrationOverlay({
  engine,
  isOpen,
  onClose,
  onComplete,
}: GazeCalibrationOverlayProps) {
  const [index, setIndex] = useState(0);
  const [capturedCount, setCapturedCount] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [message, setMessage] = useState(
    'Look directly at the highlighted dot. Capture starts automatically when your gaze is steady.'
  );
  const [saving, setSaving] = useState(false);
  const [stabilizeProgress, setStabilizeProgress] = useState(0);
  const [zone, setZone] = useState<CalibrationZone>('seek');
  const [gazeCursor, setGazeCursor] = useState<{ x: number; y: number } | null>(null);

  const indexRef = useRef(0);
  const capturedCountRef = useRef(0);
  const savingRef = useRef(false);
  const captureGuardRef = useRef(false);
  const captureGuardTimerRef = useRef<number | null>(null);
  const stableSinceRef = useRef<number | null>(null);
  const stableAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const progressRef = useRef(0);
  const zoneRef = useRef<CalibrationZone>('seek');
  const containerRef = useRef<HTMLDivElement | null>(null);

  const setCalibrationZone = useCallback((nextZone: CalibrationZone) => {
    if (zoneRef.current === nextZone) return;
    zoneRef.current = nextZone;
    setZone(nextZone);

    if (nextZone === 'seek') {
      setMessage(
        'Look directly at the highlighted dot. Capture starts automatically when your gaze is steady.'
      );
    } else if (nextZone === 'stabilizing') {
      setMessage('Hold your gaze still. Capturing automatically in a moment.');
    } else if (nextZone === 'no-face') {
      setMessage('No face detected. Center your face in the webcam and check the lighting.');
    }
  }, []);

  const resetStability = useCallback(() => {
    stableSinceRef.current = null;
    stableAnchorRef.current = null;
    progressRef.current = 0;
    setStabilizeProgress(0);
  }, []);

  const clearCaptureGuardTimer = useCallback(() => {
    if (captureGuardTimerRef.current !== null) {
      window.clearTimeout(captureGuardTimerRef.current);
      captureGuardTimerRef.current = null;
    }
  }, []);

  const releaseCaptureGuard = useCallback(
    (delayMs: number) => {
      clearCaptureGuardTimer();
      captureGuardTimerRef.current = window.setTimeout(() => {
        captureGuardTimerRef.current = null;
        captureGuardRef.current = false;
      }, delayMs);
    },
    [clearCaptureGuardTimer]
  );

  const performCapture = useCallback(() => {
    const target = TARGETS[indexRef.current];
    if (!target) {
      captureGuardRef.current = false;
      return;
    }

    const captured = engine.captureCalibrationPoint(target.xNorm, target.yNorm);
    if (!captured) {
      resetStability();
      setMessage(
        'No face samples yet. Center your face in the camera, wait a moment, and look at the dot again.'
      );
      releaseCaptureGuard(350);
      return;
    }

    const nextCount = capturedCountRef.current + 1;
    capturedCountRef.current = nextCount;
    setCapturedCount(nextCount);

    if (nextCount >= TARGETS.length) {
      savingRef.current = true;
      setSaving(true);
      setCalibrationZone('saving');
      setMessage('All points captured. Saving calibration…');
      const calibration = engine.finishCalibration();
      savingRef.current = false;
      setSaving(false);
      if (calibration) {
        setMessage('Calibration saved. Gaze control is ready.');
        onComplete(calibration);
      } else {
        setMessage('Calibration could not be saved. Restart the wizard and try again.');
        releaseCaptureGuard(350);
      }
      return;
    }

    indexRef.current += 1;
    setIndex(indexRef.current);
    resetStability();
    setCalibrationZone('seek');
    setMessage('Point recorded automatically. Look at the next highlighted dot.');
    releaseCaptureGuard(450);
  }, [engine, onComplete, releaseCaptureGuard, resetStability, setCalibrationZone]);

  useEffect(() => {
    if (!isOpen) return;
    engine.beginCalibration();
    indexRef.current = 0;
    capturedCountRef.current = 0;
    savingRef.current = false;
    captureGuardRef.current = false;
    setIndex(0);
    setCapturedCount(0);
    setSaving(false);
    setFaceDetected(false);
    setGazeCursor(null);
    resetStability();
    zoneRef.current = 'seek';
    setZone('seek');
    setMessage(
      'Look directly at the highlighted dot. Capture starts automatically when your gaze is steady.'
    );

    const focusTimer = window.setTimeout(() => containerRef.current?.focus(), 0);
    const unsubscribe = engine.onFrame((frame) => {
      setFaceDetected((previous) =>
        previous === frame.faceDetected ? previous : frame.faceDetected
      );

      if (savingRef.current || captureGuardRef.current) return;

      const sample = frame.sample;
      if (!frame.faceDetected || !sample) {
        resetStability();
        setGazeCursor(null);
        setCalibrationZone('no-face');
        return;
      }
      if (performance.now() - sample.timestamp > 250) {
        resetStability();
        return;
      }

      const target = TARGETS[indexRef.current];
      if (!target) return;

      setGazeCursor((previous) => {
        if (
          previous &&
          Math.hypot(previous.x - sample.screenX, previous.y - sample.screenY) < 2
        ) {
          return previous;
        }
        return { x: sample.screenX, y: sample.screenY };
      });

      const targetX = target.xNorm * window.innerWidth;
      const targetY = target.yNorm * window.innerHeight;
      const nearTarget =
        Math.hypot(sample.screenX - targetX, sample.screenY - targetY) <=
        targetRadiusPx();
      if (!nearTarget) {
        resetStability();
        setCalibrationZone('seek');
        return;
      }

      const anchor = stableAnchorRef.current;
      if (!anchor) {
        stableAnchorRef.current = { x: sample.screenX, y: sample.screenY };
        stableSinceRef.current = sample.timestamp;
      } else {
        const drift = Math.hypot(sample.screenX - anchor.x, sample.screenY - anchor.y);
        if (drift > STABILITY_MOTION_PX) {
          stableAnchorRef.current = { x: sample.screenX, y: sample.screenY };
          stableSinceRef.current = sample.timestamp;
          progressRef.current = 0;
          setStabilizeProgress(0);
          setCalibrationZone('stabilizing');
        }
      }

      const stableSince = stableSinceRef.current;
      if (stableSince === null) {
        return;
      }

      const elapsed = sample.timestamp - stableSince;
      const nextProgress = Math.max(0, Math.min(1, elapsed / AUTO_CAPTURE_MS));
      if (
        nextProgress >= 1 ||
        nextProgress - progressRef.current >= 0.02
      ) {
        progressRef.current = nextProgress;
        setStabilizeProgress(nextProgress);
      }

      if (elapsed > 0) setCalibrationZone('stabilizing');

      if (elapsed >= AUTO_CAPTURE_MS) {
        captureGuardRef.current = true;
        progressRef.current = 1;
        setStabilizeProgress(1);
        performCapture();
      }
    });

    return () => {
      window.clearTimeout(focusTimer);
      clearCaptureGuardTimer();
      unsubscribe();
    };
  }, [
    clearCaptureGuardTimer,
    engine,
    isOpen,
    performCapture,
    resetStability,
    setCalibrationZone,
  ]);

  const handleCancel = useCallback(() => {
    resetStability();
    captureGuardRef.current = false;
    engine.cancelCalibration();
    onClose();
  }, [engine, onClose, resetStability]);

  const handleUndo = useCallback(() => {
    if (capturedCountRef.current === 0 || savingRef.current) return;
    resetStability();
    engine.undoCalibrationPoint();
    capturedCountRef.current = Math.max(0, capturedCountRef.current - 1);
    setCapturedCount(capturedCountRef.current);
    indexRef.current = Math.max(0, indexRef.current - 1);
    setIndex(indexRef.current);
    setCalibrationZone('seek');
    setMessage('Last point removed. Look at the highlighted dot to capture it again.');
  }, [engine, resetStability, setCalibrationZone]);

  const handleRestart = useCallback(() => {
    resetStability();
    captureGuardRef.current = false;
    engine.beginCalibration();
    indexRef.current = 0;
    capturedCountRef.current = 0;
    savingRef.current = false;
    setIndex(0);
    setCapturedCount(0);
    setSaving(false);
    setCalibrationZone('seek');
    setMessage('Calibration restarted. Look at the highlighted dot to capture each point.');
    containerRef.current?.focus();
  }, [engine, resetStability, setCalibrationZone]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCancel, isOpen]);

  if (!isOpen) return null;

  const currentTarget = TARGETS[index];
  const progressPercent = Math.round(stabilizeProgress * 100);
  const progressLabel =
    zone === 'no-face'
      ? 'Waiting for face detection'
      : saving
        ? 'Saving calibration'
        : zone === 'stabilizing'
          ? 'Gaze steady — capture in progress'
          : 'Look at the highlighted dot to begin';

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gaze-calibration-title"
      aria-describedby="gaze-calibration-description"
      tabIndex={-1}
      className="fixed inset-0 z-[95] select-none bg-slate-950/35 focus:outline-none"
    >
      <div className="pointer-events-none absolute left-1/2 top-4 z-10 w-[min(94vw,44rem)] -translate-x-1/2">
        <div className="pointer-events-auto rounded-xl border-2 border-[#001F3F] bg-white p-4 text-center shadow-2xl high-contrast:border-yellow-300 high-contrast:bg-black">
          <p className="inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide text-[#0056B3] high-contrast:text-yellow-300">
            <Crosshair className="h-4 w-4" aria-hidden="true" />
            Hands-Free Gaze Calibration
          </p>
          <h2
            id="gaze-calibration-title"
            className="mt-1 font-display text-xl font-bold text-[#001F3F] high-contrast:text-white"
          >
            Point {Math.min(index + 1, TARGETS.length)} of {TARGETS.length}
          </h2>
          <p
            id="gaze-calibration-description"
            aria-live="polite"
            className="mx-auto mt-1 max-w-xl text-sm text-slate-700 high-contrast:text-slate-200"
          >
            {message}
          </p>
          <p className="mt-1 text-xs text-slate-500 high-contrast:text-slate-300">
            Capture is automatic: hold a steady gaze on the dot for 1.2 seconds. No click or key
            press is needed. If the timer does not begin, glance away and back to the dot.
          </p>

          <div
            role="progressbar"
            aria-label="Automatic calibration capture progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            aria-valuetext={`${progressPercent} percent. ${progressLabel}.`}
            className="mx-auto mt-2 w-full max-w-md"
          >
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 high-contrast:bg-neutral-800">
              <div
                className="h-full rounded-full bg-[#007BFF] transition-[width] duration-100 high-contrast:bg-yellow-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500 high-contrast:text-slate-300">
              {progressLabel}
            </p>
          </div>

          {!faceDetected && (
            <p
              role="status"
              className="mt-2 rounded-md border border-amber-500 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 high-contrast:border-yellow-300 high-contrast:bg-black high-contrast:text-yellow-200"
            >
              No face detected. Center your face in the webcam and check the lighting.
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={capturedCount === 0 || saving}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-[#001F3F] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Undo
            </button>
            <button
              type="button"
              onClick={handleRestart}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-[#001F3F] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Restart
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-[#001F3F] hover:bg-slate-50 high-contrast:border-white high-contrast:bg-black high-contrast:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div className="absolute inset-0">
        {TARGETS.map((target, targetIndex) => {
          const isCurrent = targetIndex === index;
          const isCaptured = targetIndex < capturedCount;
          return (
            <div
              key={target.id}
              role={isCurrent ? 'img' : undefined}
              aria-hidden={!isCurrent}
              aria-label={`Calibration target ${target.label}${
                isCaptured ? ' (recorded)' : isCurrent ? ' (current)' : ''
              }`}
              aria-current={isCurrent ? 'step' : undefined}
              className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 shadow-lg transition-transform ${
                isCurrent
                  ? 'h-14 w-14 animate-pulse border-[#007BFF] bg-white text-[#001F3F] high-contrast:border-yellow-300 high-contrast:bg-black high-contrast:text-yellow-300'
                  : isCaptured
                    ? 'h-9 w-9 border-[#15803D] bg-[#15803D] text-white high-contrast:border-green-400 high-contrast:bg-green-400 high-contrast:text-black'
                    : 'h-8 w-8 border-slate-400 bg-white/90 text-slate-400 high-contrast:border-slate-500 high-contrast:bg-black'
              }`}
              style={{ left: `${target.xNorm * 100}%`, top: `${target.yNorm * 100}%` }}
            >
              {isCurrent && (
                <svg
                  className="pointer-events-none absolute -inset-3 h-[calc(100%+1.5rem)] w-[calc(100%+1.5rem)] -rotate-90"
                  viewBox="0 0 100 100"
                  aria-hidden="true"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity="0.2"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    pathLength="100"
                    strokeDasharray="100"
                    strokeDashoffset={100 - stabilizeProgress * 100}
                  />
                </svg>
              )}
              {isCaptured ? (
                <Check className="h-5 w-5 stroke-[3]" aria-hidden="true" />
              ) : isCurrent ? (
                <Crosshair className="h-6 w-6" aria-hidden="true" />
              ) : (
                <span className="h-2.5 w-2.5 rounded-full bg-current" aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
