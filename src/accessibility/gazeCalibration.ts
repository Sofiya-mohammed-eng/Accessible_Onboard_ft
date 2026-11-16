import type { GazeTrackingMode } from '../types/accessbridge';
import {
  EMPTY_GAZE_FEATURES,
  GazeCalibrationData,
  GazeCalibrationPoint,
  GazeFeatures,
  GazePolynomialModel,
} from './gazeTypes';

const STORAGE_KEY = 'accessbridge_gaze_calibration_v1';
const POLYNOMIAL_FEATURE_COUNT = 7;
const RIDGE_STRENGTH = 0.0015;
const MIN_POINTS_FOR_FIT = 4;

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function gateGazeFeatures(features: GazeFeatures, mode: GazeTrackingMode): GazeFeatures {
  return {
    headYaw: mode === 'eye' ? 0 : features.headYaw,
    headPitch: mode === 'eye' ? 0 : features.headPitch,
    eyeX: mode === 'head' ? 0 : features.eyeX,
    eyeY: mode === 'head' ? 0 : features.eyeY,
    faceScale: features.faceScale,
  };
}

export function buildPolynomialFeatures(features: GazeFeatures, mode: GazeTrackingMode): number[] {
  const gated = gateGazeFeatures(features, mode);
  return [
    1,
    gated.headYaw,
    gated.headPitch,
    gated.eyeX,
    gated.eyeY,
    gated.headYaw * gated.eyeX,
    gated.headPitch * gated.eyeY,
  ];
}

function emptyMatrix(size: number): number[][] {
  return Array.from({ length: size }, () => new Array<number>(size).fill(0));
}

function solveLinearSystem(matrix: number[][], vector: number[]): number[] | null {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let column = 0; column < size; column += 1) {
    let pivotRow = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivotRow][column])) {
        pivotRow = row;
      }
    }

    if (Math.abs(augmented[pivotRow][column]) < 1e-10) {
      return null;
    }

    if (pivotRow !== column) {
      const temporary = augmented[pivotRow];
      augmented[pivotRow] = augmented[column];
      augmented[column] = temporary;
    }

    const pivot = augmented[column][column];
    for (let cell = column; cell <= size; cell += 1) {
      augmented[column][cell] /= pivot;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      if (factor === 0) continue;
      for (let cell = column; cell <= size; cell += 1) {
        augmented[row][cell] -= factor * augmented[column][cell];
      }
    }
  }

  return augmented.map((row) => row[size]);
}

function fitOutput(
  designMatrix: number[][],
  targets: number[]
): number[] | null {
  const size = POLYNOMIAL_FEATURE_COUNT;
  const normal = emptyMatrix(size);
  const rightHandSide = new Array<number>(size).fill(0);

  for (let index = 0; index < designMatrix.length; index += 1) {
    const phi = designMatrix[index];
    for (let row = 0; row < size; row += 1) {
      rightHandSide[row] += phi[row] * targets[index];
      for (let column = 0; column < size; column += 1) {
        normal[row][column] += phi[row] * phi[column];
      }
    }
  }

  for (let index = 0; index < size; index += 1) {
    normal[index][index] += index === 0 ? RIDGE_STRENGTH * 0.05 : RIDGE_STRENGTH;
  }

  return solveLinearSystem(normal, rightHandSide);
}

function fallbackCoefficients(): number[] {
  const coefficients = new Array<number>(POLYNOMIAL_FEATURE_COUNT).fill(0);
  coefficients[0] = 0.5;
  return coefficients;
}

export function fitPolynomialModel(
  points: GazeCalibrationPoint[],
  mode: GazeTrackingMode
): GazePolynomialModel {
  if (points.length < MIN_POINTS_FOR_FIT) {
    return {
      coefficientsX: fallbackCoefficients(),
      coefficientsY: fallbackCoefficients(),
      featureCount: POLYNOMIAL_FEATURE_COUNT,
    };
  }

  const designMatrix = points.map((point) => buildPolynomialFeatures(point.features, mode));
  const targetX = points.map((point) => clamp01(point.targetX));
  const targetY = points.map((point) => clamp01(point.targetY));

  let coefficientsX = fitOutput(designMatrix, targetX);
  let coefficientsY = fitOutput(designMatrix, targetY);

  if (!coefficientsX || coefficientsX.some((value) => !Number.isFinite(value))) {
    coefficientsX = fallbackCoefficients();
  }
  if (!coefficientsY || coefficientsY.some((value) => !Number.isFinite(value))) {
    coefficientsY = fallbackCoefficients();
  }

  return {
    coefficientsX,
    coefficientsY,
    featureCount: POLYNOMIAL_FEATURE_COUNT,
  };
}

export function createCalibration(points: GazeCalibrationPoint[]): GazeCalibrationData {
  const safePoints = points.map((point) => ({
    targetX: clamp01(point.targetX),
    targetY: clamp01(point.targetY),
    features: { ...EMPTY_GAZE_FEATURES, ...point.features },
  }));

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    points: safePoints,
    models: {
      hybrid: fitPolynomialModel(safePoints, 'hybrid'),
      head: fitPolynomialModel(safePoints, 'head'),
      eye: fitPolynomialModel(safePoints, 'eye'),
    },
  };
}

export function mapWithModel(
  features: GazeFeatures,
  mode: GazeTrackingMode,
  model: GazePolynomialModel
): { x: number; y: number } | null {
  if (
    model.featureCount !== POLYNOMIAL_FEATURE_COUNT ||
    model.coefficientsX.length !== POLYNOMIAL_FEATURE_COUNT ||
    model.coefficientsY.length !== POLYNOMIAL_FEATURE_COUNT
  ) {
    return null;
  }

  const phi = buildPolynomialFeatures(features, mode);
  let x = 0;
  let y = 0;

  for (let index = 0; index < POLYNOMIAL_FEATURE_COUNT; index += 1) {
    x += phi[index] * model.coefficientsX[index];
    y += phi[index] * model.coefficientsY[index];
  }

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return { x: clamp01(x), y: clamp01(y) };
}

/**
 * Heuristic mapping used before calibration exists, or if a fit is unusable.
 * Features are already centered on the user's neutral pose, so 0,0 maps to
 * the center of the viewport.
 */
export function defaultGazeMap(
  features: GazeFeatures,
  mode: GazeTrackingMode
): { x: number; y: number } {
  const gated = gateGazeFeatures(features, mode);

  let x = 0.5;
  let y = 0.5;

  if (mode === 'hybrid') {
    x += gated.headYaw * 1.15 + gated.eyeX * 0.6;
    y += gated.headPitch * 1.1 + gated.eyeY * 0.75;
  } else if (mode === 'head') {
    x += gated.headYaw * 2.0;
    y += gated.headPitch * 2.0;
  } else {
    x += gated.eyeX * 1.25;
    y += gated.eyeY * 1.6;
  }

  return { x: clamp01(x), y: clamp01(y) };
}

const MIN_SENSITIVITY_GAIN = 1.0;
const MAX_SENSITIVITY_GAIN = 2.2;

export function sensitivityGain(sensitivity: number): number {
  return MIN_SENSITIVITY_GAIN + clamp01(sensitivity) * (MAX_SENSITIVITY_GAIN - MIN_SENSITIVITY_GAIN);
}

export function applySensitivity(
  point: { x: number; y: number },
  sensitivity: number
): { x: number; y: number } {
  const gain = sensitivityGain(sensitivity);
  return {
    x: clamp01(0.5 + (point.x - 0.5) * gain),
    y: clamp01(0.5 + (point.y - 0.5) * gain),
  };
}

function isCalibrationData(value: unknown): value is GazeCalibrationData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GazeCalibrationData>;
  if (candidate.version !== 1 || !candidate.models || !Array.isArray(candidate.points)) {
    return false;
  }

  const modes: GazeTrackingMode[] = ['hybrid', 'head', 'eye'];
  return modes.every((mode) => {
    const model = candidate.models?.[mode];
    return Boolean(
      model &&
        model.featureCount === POLYNOMIAL_FEATURE_COUNT &&
        Array.isArray(model.coefficientsX) &&
        model.coefficientsX.length === POLYNOMIAL_FEATURE_COUNT &&
        Array.isArray(model.coefficientsY) &&
        model.coefficientsY.length === POLYNOMIAL_FEATURE_COUNT
    );
  });
}

export function loadGazeCalibration(): GazeCalibrationData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCalibrationData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function hasSavedGazeCalibration(): boolean {
  return loadGazeCalibration() !== null;
}

const GAZE_AUTOSTART_DISMISSED_KEY = 'accessbridge_gaze_autostart_dismissed_v1';

export function dismissGazeAutoStart(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GAZE_AUTOSTART_DISMISSED_KEY, '1');
  } catch {
    // Ignore.
  }
}

export function clearGazeAutoStartDismissal(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(GAZE_AUTOSTART_DISMISSED_KEY);
  } catch {
    // Ignore.
  }
}

export function saveGazeCalibration(data: GazeCalibrationData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota/privacy-mode errors.
  }
}

export function clearGazeCalibration(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
