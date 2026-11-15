import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { GazeControlEngine } from './gazeControlEngine';
import { GAZE_SCROLL_ZONE_PX } from './gazeEdgeScroll';
import { GazeFrame } from './gazeTypes';

interface GazeOverlayProps {
  engine: GazeControlEngine;
  enabled: boolean;
  edgeScrollEnabled: boolean;
}

const RETICLE_SIZE = 68;
const PROGRESS_RADIUS = 30;
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RADIUS;

interface ScrollEdgeIndicatorProps {
  edge: 'top' | 'bottom';
  active: boolean;
  intensity: number;
}

function ScrollEdgeIndicator({ edge, active, intensity }: ScrollEdgeIndicatorProps) {
  const isTop = edge === 'top';
  const Icon = isTop ? ChevronUp : ChevronDown;
  const strength = Math.max(0, Math.min(1, intensity));

  return (
    <div
      aria-hidden="true"
      data-gaze-ignore="true"
      className={`pointer-events-none fixed inset-x-0 z-[87] ${
        isTop ? 'top-0' : 'bottom-0'
      }`}
      style={{ height: GAZE_SCROLL_ZONE_PX }}
    >
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          isTop
            ? 'bg-gradient-to-b from-[#007BFF]/30 via-[#007BFF]/[0.08] to-transparent high-contrast:from-yellow-300/[0.35] high-contrast:via-yellow-300/10'
            : 'bg-gradient-to-t from-[#007BFF]/30 via-[#007BFF]/[0.08] to-transparent high-contrast:from-yellow-300/[0.35] high-contrast:via-yellow-300/10'
        }`}
        style={{ opacity: active ? 0.6 + strength * 0.4 : 0.3 }}
      />
      <div
        className={`absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#007BFF] to-transparent transition-all duration-300 high-contrast:via-yellow-300 ${
          isTop ? 'top-0' : 'bottom-0'
        }`}
        style={{
          opacity: active ? 1 : 0.35,
          transform: `scaleX(${active ? 0.7 + strength * 0.3 : 0.35})`,
        }}
      />
      <div
        className={`absolute inset-x-0 flex justify-center ${
          isTop ? 'top-2.5' : 'bottom-2.5'
        }`}
      >
        <span
          className={`inline-flex items-center rounded-full border bg-white/90 px-2 py-0.5 text-[10px] font-bold shadow-sm transition-all duration-300 high-contrast:bg-black ${
            active
              ? 'border-[#007BFF]/60 text-[#0056B3] high-contrast:border-yellow-300 high-contrast:text-yellow-300'
              : 'border-slate-300/70 text-slate-500 high-contrast:border-slate-600 high-contrast:text-slate-300'
          }`}
          style={{ opacity: active ? 1 : 0.55 }}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          <span
            className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
              active ? 'ml-1 max-w-[6rem] opacity-100' : 'ml-0 max-w-0 opacity-0'
            }`}
          >
            {isTop ? 'Scroll up' : 'Scroll down'}
          </span>
        </span>
      </div>
    </div>
  );
}

export function GazeOverlay({ engine, enabled, edgeScrollEnabled }: GazeOverlayProps) {
  const [frame, setFrame] = useState<GazeFrame>({
    sample: null,
    faceDetected: false,
    dwellProgress: 0,
    target: null,
    targetLabel: null,
    edgeScroll: { zone: null, intensity: 0, atLimit: false },
  });

  useEffect(() => {
    if (!enabled) return;
    return engine.onFrame(setFrame);
  }, [engine, enabled]);

  if (!enabled) return null;

  const sample = frame.sample;
  const visible = Boolean(sample?.faceDetected);
  const x = sample?.screenX ?? 0;
  const y = sample?.screenY ?? 0;
  const dwellProgress = frame.dwellProgress;
  const targetRect = frame.target?.getBoundingClientRect();
  const showTargetBox =
    Boolean(targetRect) &&
    Boolean(targetRect && targetRect.width > 0 && targetRect.height > 0);
  const edgeScroll = frame.edgeScroll;
  const showScrollIndicators = visible && edgeScrollEnabled;
  const topActive = edgeScroll.zone === 'top' && !edgeScroll.atLimit;
  const bottomActive = edgeScroll.zone === 'bottom' && !edgeScroll.atLimit;

  return (
    <>
      {showScrollIndicators && (
        <>
          <ScrollEdgeIndicator
            edge="top"
            active={topActive}
            intensity={topActive ? edgeScroll.intensity : 0}
          />
          <ScrollEdgeIndicator
            edge="bottom"
            active={bottomActive}
            intensity={bottomActive ? edgeScroll.intensity : 0}
          />
        </>
      )}

      {showTargetBox && targetRect && (
        <div
          aria-hidden="true"
          data-gaze-ignore="true"
          className="pointer-events-none fixed z-[88] rounded-lg border-[3px] border-[#007BFF] bg-[#007BFF]/10 high-contrast:border-yellow-300 high-contrast:bg-yellow-300/10"
          style={{
            left: targetRect.left - 4,
            top: targetRect.top - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}

      <div
        aria-hidden="true"
        className={`pointer-events-none fixed left-0 top-0 z-[90] will-change-transform ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          width: RETICLE_SIZE,
          height: RETICLE_SIZE,
          transform: `translate3d(${Math.round(x - RETICLE_SIZE / 2)}px, ${Math.round(
            y - RETICLE_SIZE / 2
          )}px, 0)`,
        }}
      >
        <svg
          width={RETICLE_SIZE}
          height={RETICLE_SIZE}
          viewBox={`0 0 ${RETICLE_SIZE} ${RETICLE_SIZE}`}
          className="overflow-visible"
        >
          <circle
            cx={RETICLE_SIZE / 2}
            cy={RETICLE_SIZE / 2}
            r={PROGRESS_RADIUS}
            className="fill-[#001F3F]/85 stroke-white high-contrast:fill-black high-contrast:stroke-yellow-300"
            strokeWidth={3}
          />
          <circle
            cx={RETICLE_SIZE / 2}
            cy={RETICLE_SIZE / 2}
            r={PROGRESS_RADIUS}
            className="fill-none stroke-[#007BFF] high-contrast:stroke-yellow-300"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={PROGRESS_CIRCUMFERENCE}
            strokeDashoffset={PROGRESS_CIRCUMFERENCE * (1 - dwellProgress)}
            transform={`rotate(-90 ${RETICLE_SIZE / 2} ${RETICLE_SIZE / 2})`}
          />
          <circle
            cx={RETICLE_SIZE / 2}
            cy={RETICLE_SIZE / 2}
            r={5}
            className="fill-white high-contrast:fill-yellow-300"
          />
          <circle
            cx={RETICLE_SIZE / 2}
            cy={RETICLE_SIZE / 2}
            r={10}
            className="fill-none stroke-white/70 high-contrast:stroke-yellow-300/80"
            strokeWidth={1.5}
          />
        </svg>
      </div>

      {visible && frame.targetLabel && dwellProgress > 0.05 && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[89] max-w-[18rem] -translate-x-1/2 rounded-md border-2 border-[#001F3F] bg-white px-2.5 py-1 text-center text-[11px] font-semibold text-[#001F3F] shadow-md high-contrast:border-yellow-300 high-contrast:bg-black high-contrast:text-yellow-300"
          style={{ left: x, top: Math.max(8, y - 60) }}
        >
          {frame.targetLabel}
        </div>
      )}
    </>
  );
}
