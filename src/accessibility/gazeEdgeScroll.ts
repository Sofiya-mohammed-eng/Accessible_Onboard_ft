import type { GazeEdgeScrollState, GazeEdgeScrollZone } from './gazeTypes';

export const GAZE_SCROLL_ZONE_PX = 36;
export const GAZE_SCROLL_ZONE_HYSTERESIS_PX = 8;
export const GAZE_EDGE_MARGIN_PX = 12;
export const GAZE_EDGE_SCROLL_ACCELERATION = 1800;
export const GAZE_EDGE_SCROLL_MIN_SPEED = 0;
export const GAZE_EDGE_SCROLL_MAX_SPEED = 1200;

export const IDLE_EDGE_SCROLL_STATE: GazeEdgeScrollState = {
  zone: null,
  intensity: 0,
  atLimit: false,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface EdgeScrollTargetInput {
  screenY: number;
  viewportHeight: number;
  speed: number;
  canScrollUp: boolean;
  canScrollDown: boolean;
  enabled: boolean;
  previousZone?: GazeEdgeScrollZone;
}

export interface EdgeScrollTarget {
  zone: GazeEdgeScrollZone;
  targetVelocity: number;
  atLimit: boolean;
}

export function resolveEdgeScrollTarget(input: EdgeScrollTargetInput): EdgeScrollTarget {
  if (!input.enabled || input.speed <= 0) {
    return { zone: null, targetVelocity: 0, atLimit: false };
  }

  const topDistance = Math.max(0, input.screenY);
  const bottomDistance = Math.max(0, input.viewportHeight - input.screenY);

  let zone: GazeEdgeScrollZone = null;
  let distance = 0;
  let canScroll = false;

  const topBoundary =
    GAZE_SCROLL_ZONE_PX +
    (input.previousZone === 'top' ? GAZE_SCROLL_ZONE_HYSTERESIS_PX : 0);
  const bottomBoundary =
    GAZE_SCROLL_ZONE_PX +
    (input.previousZone === 'bottom' ? GAZE_SCROLL_ZONE_HYSTERESIS_PX : 0);

  if (topDistance <= topBoundary) {
    zone = 'top';
    distance = topDistance;
    canScroll = input.canScrollUp;
  } else if (bottomDistance <= bottomBoundary) {
    zone = 'bottom';
    distance = bottomDistance;
    canScroll = input.canScrollDown;
  }

  if (!zone) {
    return { zone: null, targetVelocity: 0, atLimit: false };
  }
  if (!canScroll) {
    return { zone, targetVelocity: 0, atLimit: true };
  }

  const depth = clamp(1 - distance / GAZE_SCROLL_ZONE_PX, 0, 1);
  const overshoot = clamp(
    (distance - GAZE_SCROLL_ZONE_PX) / GAZE_SCROLL_ZONE_HYSTERESIS_PX,
    0,
    1
  );
  const intensity =
    distance <= GAZE_SCROLL_ZONE_PX
      ? 0.45 + depth * 0.55
      : 0.45 * (1 - overshoot);
  const direction = zone === 'top' ? -1 : 1;

  return {
    zone,
    targetVelocity: direction * input.speed * intensity,
    atLimit: false,
  };
}

export function rampEdgeScrollVelocity(
  current: number,
  target: number,
  dtSeconds: number,
  acceleration = GAZE_EDGE_SCROLL_ACCELERATION
): number {
  if (!Number.isFinite(current)) return 0;
  if (!Number.isFinite(target)) return 0;
  const dt = clamp(dtSeconds, 0, 0.1);
  const rate = target === 0 ? acceleration * 2 : acceleration;
  const maxChange = rate * dt;

  if (current < target) {
    return Math.min(target, current + maxChange);
  }
  if (current > target) {
    return Math.max(target, current - maxChange);
  }
  return target;
}

export function describeEdgeScroll(
  velocity: number,
  configuredSpeed: number,
  target: EdgeScrollTarget
): GazeEdgeScrollState {
  const magnitude = Math.abs(velocity);
  const moving = magnitude > 4;
  const zone: GazeEdgeScrollZone = moving
    ? velocity < 0
      ? 'top'
      : 'bottom'
    : target.zone;
  const intensity =
    configuredSpeed > 0 ? clamp(magnitude / configuredSpeed, 0, 1) : 0;

  return {
    zone: target.atLimit && !moving ? null : zone,
    intensity,
    atLimit: target.atLimit,
  };
}

export function clampViewportPoint(
  xNorm: number,
  yNorm: number,
  viewportWidth: number,
  viewportHeight: number,
  margin = GAZE_EDGE_MARGIN_PX
): { x: number; y: number } {
  const width = Math.max(1, viewportWidth);
  const height = Math.max(1, viewportHeight);
  const safeXMargin = Math.min(Math.max(0, margin), (width - 1) / 2);
  const safeYMargin = Math.min(Math.max(0, margin), (height - 1) / 2);

  return {
    x: clamp(clamp(xNorm, 0, 1) * width, safeXMargin, width - safeXMargin),
    y: clamp(clamp(yNorm, 0, 1) * height, safeYMargin, height - safeYMargin),
  };
}

export function clampEdgeScrollSpeed(value: number): number {
  if (!Number.isFinite(value)) return 500;
  return Math.round(
    clamp(value, GAZE_EDGE_SCROLL_MIN_SPEED, GAZE_EDGE_SCROLL_MAX_SPEED)
  );
}
