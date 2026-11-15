import type { GazeActivationMode, GazeTrackingMode } from '../types/accessbridge';

export type GazeStatus =
  | 'idle'
  | 'initializing'
  | 'tracking'
  | 'no-face'
  | 'paused'
  | 'error'
  | 'calibrating';

export interface GazeFeatures {
  headYaw: number;
  headPitch: number;
  eyeX: number;
  eyeY: number;
  faceScale: number;
}

export const EMPTY_GAZE_FEATURES: GazeFeatures = {
  headYaw: 0,
  headPitch: 0,
  eyeX: 0,
  eyeY: 0,
  faceScale: 0,
};

export interface GazeSettings {
  mode: GazeTrackingMode;
  activationMode: GazeActivationMode;
  dwellMs: number;
  sensitivity: number;
  smoothing: number;
  edgeScrollSpeed: number;
}

export type GazeEdgeScrollZone = 'top' | 'bottom' | null;

export interface GazeEdgeScrollState {
  zone: GazeEdgeScrollZone;
  intensity: number;
  atLimit: boolean;
}

export interface GazeSample {
  /** Features after subtracting the user's neutral resting pose. */
  features: GazeFeatures;
  rawFeatures: GazeFeatures;
  xNorm: number;
  yNorm: number;
  screenX: number;
  screenY: number;
  faceDetected: boolean;
  timestamp: number;
}

export interface GazeCalibrationPoint {
  targetX: number;
  targetY: number;
  features: GazeFeatures;
}

export interface GazePolynomialModel {
  coefficientsX: number[];
  coefficientsY: number[];
  featureCount: number;
}

export interface GazeCalibrationData {
  version: 1;
  createdAt: string;
  points: GazeCalibrationPoint[];
  models: Record<GazeTrackingMode, GazePolynomialModel>;
}

export type GazeErrorCode =
  | 'permission-denied'
  | 'no-camera'
  | 'camera-busy'
  | 'model-load-failed'
  | 'unsupported'
  | 'unknown';

export interface GazeErrorInfo {
  code: GazeErrorCode;
  message: string;
}

export interface GazeFrame {
  sample: GazeSample | null;
  faceDetected: boolean;
  dwellProgress: number;
  target: HTMLElement | null;
  targetLabel: string | null;
  edgeScroll: GazeEdgeScrollState;
}

export interface GazeCalibrationPointTarget {
  id: string;
  label: string;
  xNorm: number;
  yNorm: number;
}
