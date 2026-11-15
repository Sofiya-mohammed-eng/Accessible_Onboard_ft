import type {
  FaceLandmarker,
  FaceLandmarkerResult,
  NormalizedLandmark,
} from '@mediapipe/tasks-vision';
import { OneEuroFilter2D } from './oneEuroFilter';
import {
  applySensitivity,
  clamp01,
  clearGazeCalibration,
  createCalibration,
  defaultGazeMap,
  loadGazeCalibration,
  mapWithModel,
  saveGazeCalibration,
} from './gazeCalibration';
import {
  EMPTY_GAZE_FEATURES,
  GazeCalibrationData,
  GazeCalibrationPoint,
  GazeEdgeScrollState,
  GazeErrorInfo,
  GazeFeatures,
  GazeFrame,
  GazeSample,
  GazeSettings,
  GazeStatus,
} from './gazeTypes';
import {
  IDLE_EDGE_SCROLL_STATE,
  clampEdgeScrollSpeed,
  clampViewportPoint,
  describeEdgeScroll,
  rampEdgeScrollVelocity,
  resolveEdgeScrollTarget,
} from './gazeEdgeScroll';
import { beginPermissionPrompt } from '../engines/browserPermissions';

const MEDIAPIPE_VERSION = '1.2.3';
const WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const FACE_LANDMARKER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const NEUTRAL_SAMPLE_COUNT = 12;
const HIT_RADIUS_PX = 40;
const STICKY_PADDING_PX = 64;
const TARGET_LEAVE_GRACE_MS = 240;
const FEATURE_HISTORY_SIZE = 90;
const CALIBRATION_SAMPLE_WINDOW = 14;

const EAR_CLOSED_THRESHOLD = 0.18;
const EAR_OPEN_THRESHOLD = 0.22;
const BLINK_MIN_CLOSED_MS = 400;
const BLINK_MAX_CLOSED_MS = 700;

const INTERACTIVE_SELECTOR = [
  'button',
  'a[href]',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const DEFAULT_SETTINGS: GazeSettings = {
  mode: 'hybrid',
  activationMode: 'both',
  dwellMs: 550,
  sensitivity: 0.78,
  smoothing: 0.28,
  edgeScrollSpeed: 500,
};

function clampDwell(value: number): number {
  return Math.min(1500, Math.max(300, Math.round(value)));
}

function clampUnit(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function subtractFeatures(features: GazeFeatures, baseline: GazeFeatures): GazeFeatures {
  return {
    headYaw: features.headYaw - baseline.headYaw,
    headPitch: features.headPitch - baseline.headPitch,
    eyeX: features.eyeX - baseline.eyeX,
    eyeY: features.eyeY - baseline.eyeY,
    faceScale: features.faceScale,
  };
}

function averageFeatures(features: GazeFeatures[]): GazeFeatures {
  if (features.length === 0) return { ...EMPTY_GAZE_FEATURES };
  const total = features.reduce(
    (accumulator, current) => ({
      headYaw: accumulator.headYaw + current.headYaw,
      headPitch: accumulator.headPitch + current.headPitch,
      eyeX: accumulator.eyeX + current.eyeX,
      eyeY: accumulator.eyeY + current.eyeY,
      faceScale: accumulator.faceScale + current.faceScale,
    }),
    { headYaw: 0, headPitch: 0, eyeX: 0, eyeY: 0, faceScale: 0 }
  );

  return {
    headYaw: total.headYaw / features.length,
    headPitch: total.headPitch / features.length,
    eyeX: total.eyeX / features.length,
    eyeY: total.eyeY / features.length,
    faceScale: total.faceScale / features.length,
  };
}

function mirroredX(landmark: NormalizedLandmark): number {
  return 1 - landmark.x;
}

function eyeOffset(
  landmarks: NormalizedLandmark[],
  irisIndices: number[],
  cornerA: number,
  cornerB: number,
  upperEyelid: number,
  lowerEyelid: number
): { x: number; y: number } {
  const irisPoints = irisIndices.map((index) => landmarks[index]);
  const irisX = irisPoints.reduce((sum, point) => sum + mirroredX(point), 0) / irisPoints.length;
  const irisY = irisPoints.reduce((sum, point) => sum + point.y, 0) / irisPoints.length;

  const cornerAX = mirroredX(landmarks[cornerA]);
  const cornerBX = mirroredX(landmarks[cornerB]);
  const horizontalCenter = (cornerAX + cornerBX) / 2;
  const halfWidth = Math.max(Math.abs(cornerAX - cornerBX) / 2, 0.003);

  const upperY = landmarks[upperEyelid].y;
  const lowerY = landmarks[lowerEyelid].y;
  const verticalCenter = (upperY + lowerY) / 2;
  const halfHeight = Math.max(Math.abs(lowerY - upperY) / 2, 0.004);

  return {
    x: Math.min(3, Math.max(-3, (irisX - horizontalCenter) / halfWidth)),
    y: Math.min(3, Math.max(-3, (irisY - verticalCenter) / halfHeight)),
  };
}

export function extractGazeFeatures(landmarks: NormalizedLandmark[]): GazeFeatures | null {
  if (landmarks.length < 478) return null;

  const noseTip = landmarks[1];
  const forehead = landmarks[10];
  const chin = landmarks[152];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];

  const faceWidth = Math.max(
    Math.hypot(mirroredX(rightCheek) - mirroredX(leftCheek), rightCheek.y - leftCheek.y),
    0.001
  );
  const faceHeight = Math.max(
    Math.hypot(forehead.x - chin.x, forehead.y - chin.y),
    0.001
  );

  const faceCenterX = (mirroredX(leftCheek) + mirroredX(rightCheek)) / 2;
  const faceCenterY = (forehead.y + chin.y) / 2;

  const headYaw = (mirroredX(noseTip) - faceCenterX) / faceWidth;
  const headPitch = (noseTip.y - faceCenterY) / faceHeight;

  const leftEye = eyeOffset(landmarks, [468, 469, 470, 471, 472], 33, 133, 159, 145);
  const rightEye = eyeOffset(landmarks, [473, 474, 475, 476, 477], 263, 362, 386, 374);

  return {
    headYaw,
    headPitch,
    eyeX: (leftEye.x + rightEye.x) / 2,
    eyeY: (leftEye.y + rightEye.y) / 2,
    faceScale: faceWidth,
  };
}

function landmarkDistance(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function eyeAspectRatioForEye(
  landmarks: NormalizedLandmark[],
  outerCorner: number,
  innerCorner: number,
  upperA: number,
  lowerA: number,
  upperB: number,
  lowerB: number
): number | null {
  const width = landmarkDistance(landmarks[outerCorner], landmarks[innerCorner]);
  if (width < 1e-6) return null;

  const heightA = landmarkDistance(landmarks[upperA], landmarks[lowerA]);
  const heightB = landmarkDistance(landmarks[upperB], landmarks[lowerB]);
  return (heightA + heightB) / (2 * width);
}

export function extractEyeAspectRatio(landmarks: NormalizedLandmark[]): number | null {
  if (landmarks.length < 387) return null;

  const left = eyeAspectRatioForEye(landmarks, 33, 133, 159, 145, 158, 153);
  const right = eyeAspectRatioForEye(landmarks, 263, 362, 386, 374, 385, 380);
  if (left === null && right === null) return null;
  if (left === null) return right;
  if (right === null) return left;
  return (left + right) / 2;
}

export function describeInteractiveElement(element: HTMLElement): string {
  const ariaLabel = element.getAttribute('aria-label')?.trim();
  if (ariaLabel) return ariaLabel;

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelText = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ');
    if (labelText) return labelText;
  }

  const text = (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
  if (text) return text.slice(0, 80);

  const title = element.getAttribute('title')?.trim();
  if (title) return title;

  const name = element.getAttribute('name')?.trim();
  if (name) return name;

  return element.tagName.toLowerCase();
}

function interactiveFromPoint(x: number, y: number): HTMLElement | null {
  const hit = document.elementFromPoint(x, y);
  if (!(hit instanceof Element)) return null;
  if (hit.closest('[data-gaze-ignore="true"]')) return null;

  const candidate = hit.closest(INTERACTIVE_SELECTOR);
  if (!(candidate instanceof HTMLElement)) return null;
  if (candidate.hasAttribute('disabled') || candidate.getAttribute('aria-disabled') === 'true') {
    return null;
  }
  if (candidate.getAttribute('aria-hidden') === 'true') return null;
  return candidate;
}

function pointerWithin(element: HTMLElement, x: number, y: number, padding: number): boolean {
  const rect = element.getBoundingClientRect();
  return (
    x >= rect.left - padding &&
    x <= rect.right + padding &&
    y >= rect.top - padding &&
    y <= rect.bottom + padding
  );
}

function findInteractiveElement(x: number, y: number): HTMLElement | null {
  if (typeof document === 'undefined') return null;

  const offsets = [
    [0, 0],
    [HIT_RADIUS_PX, 0],
    [-HIT_RADIUS_PX, 0],
    [0, HIT_RADIUS_PX],
    [0, -HIT_RADIUS_PX],
  ];
  let best: HTMLElement | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  const seen = new Set<HTMLElement>();

  for (const [offsetX, offsetY] of offsets) {
    const candidate = interactiveFromPoint(x + offsetX, y + offsetY);
    if (!candidate || seen.has(candidate) || !pointerWithin(candidate, x, y, HIT_RADIUS_PX)) {
      continue;
    }
    seen.add(candidate);
    const rect = candidate.getBoundingClientRect();
    const distance = Math.hypot(rect.left + rect.width / 2 - x, rect.top + rect.height / 2 - y);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return best;
}

function classifyCameraError(error: unknown): GazeErrorInfo {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return {
      code: 'permission-denied',
      message:
        'Camera permission was denied. Allow camera access for this site in your browser settings, then toggle gaze control on again.',
    };
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    return {
      code: 'no-camera',
      message:
        'No webcam was found. Connect a camera, make sure it is not disabled, then try again.',
    };
  }
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
    return {
      code: 'camera-busy',
      message:
        'The webcam is already in use by another app. Close the other app and try again.',
    };
  }
  return {
    code: 'unknown',
    message: 'The webcam could not be started. Check your camera connection and permissions.',
  };
}

export class GazeControlEngine {
  private settings: GazeSettings = { ...DEFAULT_SETTINGS };
  private calibration: GazeCalibrationData | null = null;
  private status: GazeStatus = 'idle';
  private error: GazeErrorInfo | null = null;

  private landmarker: FaceLandmarker | null = null;
  private delegate: 'GPU' | 'CPU' = 'GPU';
  private switchingDelegate = false;
  private emptyFaceFrames = 0;
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private frameCanvas: HTMLCanvasElement | null = null;
  private frameContext: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private scrollFrameId: number | null = null;
  private lastEdgeScrollAt = 0;
  private edgeScrollVelocity = 0;
  private edgeScrollState: GazeEdgeScrollState = { ...IDLE_EDGE_SCROLL_STATE };
  private running = false;
  private shouldRun = false;
  private startPromise: Promise<void> | null = null;
  private disposed = false;
  private lastVideoTime = -1;
  private lastProcessedAt = 0;

  private filter = new OneEuroFilter2D({ smoothing: DEFAULT_SETTINGS.smoothing });
  private neutral: GazeFeatures | null = null;
  private neutralSum: GazeFeatures = { ...EMPTY_GAZE_FEATURES };
  private neutralCount = 0;
  private featureHistory: GazeFeatures[] = [];

  private calibrationActive = false;
  private pendingCalibrationPoints: GazeCalibrationPoint[] = [];
  private interactionSuspended = false;

  private currentTarget: HTMLElement | null = null;
  private targetLeftAt = 0;
  private dwellStartedAt = 0;
  private dwellConsumed = false;

  private blinkClosed = false;
  private blinkStartedAt = 0;
  private blinkTriggered = false;

  private lastSample: GazeSample | null = null;
  private lastFrame: GazeFrame = {
    sample: null,
    faceDetected: false,
    dwellProgress: 0,
    target: null,
    targetLabel: null,
    edgeScroll: { ...IDLE_EDGE_SCROLL_STATE },
  };

  private readonly frameListeners = new Set<(frame: GazeFrame) => void>();
  private readonly statusListeners = new Set<(status: GazeStatus) => void>();
  private readonly errorListeners = new Set<(error: GazeErrorInfo | null) => void>();
  private readonly calibrationListeners = new Set<(data: GazeCalibrationData | null) => void>();
  private readonly dwellClickListeners = new Set<(target: HTMLElement) => void>();

  constructor(settings: Partial<GazeSettings> = {}) {
    this.updateSettings(settings);
    this.calibration = loadGazeCalibration();
  }

  onFrame(listener: (frame: GazeFrame) => void): () => void {
    this.frameListeners.add(listener);
    listener(this.lastFrame);
    return () => this.frameListeners.delete(listener);
  }

  onStatus(listener: (status: GazeStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  onError(listener: (error: GazeErrorInfo | null) => void): () => void {
    this.errorListeners.add(listener);
    listener(this.error);
    return () => this.errorListeners.delete(listener);
  }

  onCalibrationChange(listener: (data: GazeCalibrationData | null) => void): () => void {
    this.calibrationListeners.add(listener);
    listener(this.calibration);
    return () => this.calibrationListeners.delete(listener);
  }

  onDwellClick(listener: (target: HTMLElement) => void): () => void {
    this.dwellClickListeners.add(listener);
    return () => this.dwellClickListeners.delete(listener);
  }

  getStatus(): GazeStatus {
    return this.status;
  }

  getSettings(): GazeSettings {
    return { ...this.settings };
  }

  getCalibration(): GazeCalibrationData | null {
    return this.calibration;
  }

  getPendingCalibrationCount(): number {
    return this.pendingCalibrationPoints.length;
  }

  setCalibration(calibration: GazeCalibrationData | null): void {
    this.calibration = calibration;
    this.emitCalibration();
  }

  setInteractionSuspended(suspended: boolean): void {
    if (this.interactionSuspended === suspended) return;
    this.interactionSuspended = suspended;

    if (!suspended) return;

    this.resetDwellState();
    this.resetBlinkState();
    this.edgeScrollVelocity = 0;
    this.edgeScrollState = { ...IDLE_EDGE_SCROLL_STATE };
    this.emitFrame({
      sample: this.lastSample,
      faceDetected: Boolean(this.lastSample?.faceDetected),
      dwellProgress: 0,
      target: null,
      targetLabel: null,
      edgeScroll: { ...IDLE_EDGE_SCROLL_STATE },
    });
  }

  updateSettings(patch: Partial<GazeSettings>): void {
    const next = { ...this.settings, ...patch };
    next.mode = patch.mode ?? this.settings.mode;
    next.activationMode =
      patch.activationMode === 'dwell' ||
      patch.activationMode === 'blink' ||
      patch.activationMode === 'both'
        ? patch.activationMode
        : this.settings.activationMode;
    next.dwellMs = clampDwell(patch.dwellMs ?? this.settings.dwellMs);
    next.sensitivity = clampUnit(patch.sensitivity ?? this.settings.sensitivity, DEFAULT_SETTINGS.sensitivity);
    next.smoothing = clampUnit(patch.smoothing ?? this.settings.smoothing, DEFAULT_SETTINGS.smoothing);
    next.edgeScrollSpeed = clampEdgeScrollSpeed(
      patch.edgeScrollSpeed ?? this.settings.edgeScrollSpeed
    );

    if (next.edgeScrollSpeed === 0) {
      this.edgeScrollVelocity = 0;
      this.edgeScrollState = { ...IDLE_EDGE_SCROLL_STATE };
    }

    if (next.smoothing !== this.settings.smoothing) {
      this.filter = new OneEuroFilter2D({ smoothing: next.smoothing });
    }

    this.settings = next;
  }

  private setStatus(status: GazeStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  private setError(error: GazeErrorInfo | null): void {
    this.error = error;
    this.errorListeners.forEach((listener) => listener(error));
  }

  private emitCalibration(): void {
    this.calibrationListeners.forEach((listener) => listener(this.calibration));
  }

  private emitFrame(frame: GazeFrame): void {
    this.lastFrame = frame;
    this.frameListeners.forEach((listener) => listener(frame));
  }

  private emitDwellClick(target: HTMLElement): void {
    this.dwellClickListeners.forEach((listener) => listener(target));
  }

  private resetDwellState(): void {
    this.currentTarget = null;
    this.dwellStartedAt = 0;
    this.dwellConsumed = false;
    this.targetLeftAt = 0;
  }

  private resetBlinkState(): void {
    this.blinkClosed = false;
    this.blinkStartedAt = 0;
    this.blinkTriggered = false;
  }

  async start(): Promise<void> {
    if (this.disposed) return;
    this.shouldRun = true;
    if (this.running) return;
    if (this.startPromise) return this.startPromise;

    this.startPromise = this.boot()
      .catch((error: unknown) => {
        this.cleanupMedia();
        this.running = false;
        this.shouldRun = false;
        this.setStatus('error');
        this.setError(this.toStartupError(error));
      })
      .finally(() => {
        this.startPromise = null;
      });

    return this.startPromise;
  }

  private toStartupError(error: unknown): GazeErrorInfo {
    if (isGazeErrorInfo(error)) return error;
    if (error instanceof Error && error.message === 'unsupported') {
      return {
        code: 'unsupported',
        message:
          'This browser does not expose a webcam API. Try a recent version of Chrome, Edge, Firefox, or Safari.',
      };
    }
    return classifyCameraError(error);
  }

  private async boot(): Promise<void> {
    this.setError(null);
    this.setStatus('initializing');

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('unsupported');
    }

    if (!this.shouldRun) return;

    const permissionRequest = await beginPermissionPrompt(['camera']);
    if (!this.shouldRun) {
      permissionRequest.end();
      return;
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 60 },
        },
      });
    } finally {
      permissionRequest.end();
    }

    if (!stream) {
      throw new Error('The webcam could not be started. Check your camera connection and permissions.');
    }

    if (!this.shouldRun) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    this.stream = stream;
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('aria-hidden', 'true');
    // Keep the element in the viewport. Chrome will not decode frames for a
    // video parked off-screen, and MediaPipe then reports that no face exists.
    video.style.position = 'fixed';
    video.style.left = '0';
    video.style.top = '0';
    video.style.width = '160px';
    video.style.height = '120px';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    video.style.zIndex = '-1';
    video.srcObject = stream;
    document.body.appendChild(video);
    this.video = video;

    try {
      await video.play();
    } catch {
      // Some browsers resolve play() asynchronously; the frame loop checks readyState.
    }

    await this.waitForVideoFrame(video);
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      video.width = video.videoWidth;
      video.height = video.videoHeight;
    }
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = video.videoWidth || 640;
    frameCanvas.height = video.videoHeight || 480;
    this.frameCanvas = frameCanvas;
    this.frameContext = frameCanvas.getContext('2d', { willReadFrequently: true });

    if (!this.shouldRun) {
      this.cleanupMedia();
      return;
    }

    if (!this.landmarker) {
      try {
        this.landmarker = await this.createLandmarker();
      } catch {
        throw {
          code: 'model-load-failed',
          message:
            'The face-tracking model could not be loaded. Check your internet connection (the model is downloaded from MediaPipe on first use) and try again.',
        } satisfies GazeErrorInfo;
      }
    }

    if (!this.shouldRun) {
      this.cleanupMedia();
      return;
    }

    this.running = true;
    this.lastVideoTime = -1;
    this.lastProcessedAt = 0;
    this.filter.reset();
    this.featureHistory = [];
    this.resetDwellState();
    this.resetEdgeScroll();
    this.setStatus('tracking');
    this.loop();
    this.startScrollLoop();
  }

  private waitForVideoFrame(video: HTMLVideoElement): Promise<void> {
    if (video.videoWidth > 0 && video.readyState >= 2) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        video.removeEventListener('loadeddata', done);
        resolve();
      };
      video.addEventListener('loadeddata', done);
      window.setTimeout(done, 1500);
    });
  }

  private async createLandmarker(delegate: 'GPU' | 'CPU' = 'GPU'): Promise<FaceLandmarker> {
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
    const options = {
      baseOptions: {
        modelAssetPath: FACE_LANDMARKER_MODEL_URL,
        delegate,
      },
      runningMode: 'VIDEO' as const,
      numFaces: 1,
      minFaceDetectionConfidence: 0.35,
      minFacePresenceConfidence: 0.35,
      minTrackingConfidence: 0.35,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    };

    if (delegate === 'CPU') {
      return FaceLandmarker.createFromOptions(vision, options);
    }

    try {
      return await FaceLandmarker.createFromOptions(vision, options);
    } catch {
      this.delegate = 'CPU';
      return FaceLandmarker.createFromOptions(vision, {
        ...options,
        baseOptions: {
          ...options.baseOptions,
          delegate: 'CPU',
        },
      });
    }
  }

  private async fallbackToCpu(): Promise<void> {
    if (this.switchingDelegate || this.delegate === 'CPU' || this.disposed || !this.running) return;
    this.switchingDelegate = true;
    try {
      const next = await this.createLandmarker('CPU');
      if (!this.running || this.disposed) {
        next.close();
        return;
      }
      const previous = this.landmarker;
      this.landmarker = next;
      this.delegate = 'CPU';
      this.emptyFaceFrames = 0;
      try {
        previous?.close();
      } catch {
        // The GPU landmarker can already be unusable.
      }
    } catch {
      // Keep the current landmarker if the CPU model cannot be created.
    } finally {
      this.switchingDelegate = false;
    }
  }

  private loop = (): void => {
    if (!this.running || this.disposed) return;
    this.animationFrameId = window.requestAnimationFrame(this.loop);

    const video = this.video;
    const landmarker = this.landmarker;
    const canvas = this.frameCanvas;
    const context = this.frameContext;
    if (!video || !landmarker || !canvas || !context || video.readyState < 2) return;
    if (video.videoWidth < 2 || video.videoHeight < 2) return;

    const now = performance.now();
    if (now - this.lastProcessedAt < 28) return;
    if (video.currentTime === this.lastVideoTime) return;

    this.lastProcessedAt = now;
    this.lastVideoTime = video.currentTime;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    let result: FaceLandmarkerResult;
    try {
      result = landmarker.detectForVideo(canvas, Math.round(now));
    } catch {
      return;
    }

    this.handleLandmarkResult(result, now);
  };

  private resetEdgeScroll(): void {
    this.edgeScrollVelocity = 0;
    this.edgeScrollState = { ...IDLE_EDGE_SCROLL_STATE };
    this.lastEdgeScrollAt = 0;
  }

  private startScrollLoop(): void {
    if (this.scrollFrameId !== null) return;
    this.lastEdgeScrollAt = 0;
    this.scrollFrameId = window.requestAnimationFrame(this.scrollLoop);
  }

  private scrollLoop = (): void => {
    if (!this.running || this.disposed) {
      this.scrollFrameId = null;
      return;
    }
    this.scrollFrameId = window.requestAnimationFrame(this.scrollLoop);

    const now = performance.now();
    const dt =
      this.lastEdgeScrollAt === 0
        ? 1 / 60
        : Math.min(0.1, Math.max(0, (now - this.lastEdgeScrollAt) / 1000));
    this.lastEdgeScrollAt = now;

    if (this.interactionSuspended) {
      this.edgeScrollVelocity = 0;
      this.edgeScrollState = { ...IDLE_EDGE_SCROLL_STATE };
      return;
    }

    const sample = this.lastSample;
    const stale = !sample || now - sample.timestamp > 300;

    if (stale) {
      this.edgeScrollVelocity = 0;
      this.edgeScrollState = { ...IDLE_EDGE_SCROLL_STATE };
      return;
    }

    const viewportHeight = Math.max(1, window.innerHeight);
    const maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight
    );
    const canScrollUp = window.scrollY > 0.5;
    const canScrollDown = window.scrollY < maxScroll - 0.5;

    const target = resolveEdgeScrollTarget({
      screenY: sample.screenY,
      viewportHeight,
      speed: this.settings.edgeScrollSpeed,
      canScrollUp,
      canScrollDown,
      enabled: !this.calibrationActive && !this.interactionSuspended,
      previousZone: this.edgeScrollState.zone,
    });

    this.edgeScrollVelocity = rampEdgeScrollVelocity(
      this.edgeScrollVelocity,
      target.targetVelocity,
      dt
    );
    if (Math.abs(this.edgeScrollVelocity) < 0.5) {
      this.edgeScrollVelocity = 0;
    }

    if (this.edgeScrollVelocity !== 0) {
      const delta = Math.max(
        -80,
        Math.min(80, this.edgeScrollVelocity * dt)
      );
      try {
        window.scrollBy({
          top: delta,
          left: 0,
          behavior: 'instant' as ScrollBehavior,
        });
      } catch {
        window.scrollBy(0, delta);
      }
    }

    this.edgeScrollState = describeEdgeScroll(
      this.edgeScrollVelocity,
      this.settings.edgeScrollSpeed,
      target
    );
  };

  private updateBlinkDetection(ear: number, timestamp: number): void {
    if (
      this.settings.activationMode === 'dwell' ||
      this.calibrationActive ||
      this.interactionSuspended
    ) {
      this.resetBlinkState();
      return;
    }

    const closed = this.blinkClosed
      ? ear < EAR_OPEN_THRESHOLD
      : ear < EAR_CLOSED_THRESHOLD;

    if (!closed) {
      this.resetBlinkState();
      return;
    }

    if (!this.blinkClosed) {
      this.blinkClosed = true;
      this.blinkStartedAt = timestamp;
      this.blinkTriggered = false;
    }

    const closedFor = timestamp - this.blinkStartedAt;
    if (closedFor > BLINK_MAX_CLOSED_MS) {
      this.blinkTriggered = true;
      return;
    }
    if (this.blinkTriggered || closedFor < BLINK_MIN_CLOSED_MS) return;

    this.blinkTriggered = true;
    if (this.dwellConsumed && performance.now() - this.dwellStartedAt < 120) {
      return;
    }
    this.activateReticleTarget();
  }

  private activateReticleTarget(): HTMLElement | null {
    if (
      this.interactionSuspended ||
      this.calibrationActive ||
      !this.lastSample ||
      Math.abs(this.edgeScrollVelocity) > 4
    ) {
      return null;
    }

    const target = findInteractiveElement(
      this.lastSample.screenX,
      this.lastSample.screenY
    );
    if (!target) return null;

    this.currentTarget = target;
    this.dwellStartedAt = performance.now();
    this.dwellConsumed = true;
    this.triggerElementClick(target);
    this.emitDwellClick(target);
    return target;
  }

  private handleLandmarkResult(result: FaceLandmarkerResult, timestamp: number): void {
    const landmarks = result.faceLandmarks?.[0];

    if (!landmarks) {
      this.emptyFaceFrames += 1;
      if (
        this.delegate === 'GPU' &&
        !this.switchingDelegate &&
        this.emptyFaceFrames >= 40 &&
        (this.video?.videoWidth ?? 0) > 0
      ) {
        void this.fallbackToCpu();
      }
      if (!this.neutral) {
        this.neutralCount = 0;
        this.neutralSum = { ...EMPTY_GAZE_FEATURES };
      }
      if (this.status !== 'no-face') {
        this.setStatus('no-face');
        this.resetDwellState();
        this.resetBlinkState();
        this.resetEdgeScroll();
        this.lastSample = null;
        this.emitFrame({
          sample: null,
          faceDetected: false,
          dwellProgress: 0,
          target: null,
          targetLabel: null,
          edgeScroll: { ...IDLE_EDGE_SCROLL_STATE },
        });
      }
      return;
    }

    this.emptyFaceFrames = 0;
    if (this.status === 'no-face' || this.status === 'initializing') {
      this.setStatus(this.calibrationActive ? 'calibrating' : 'tracking');
    }

    const rawFeatures = extractGazeFeatures(landmarks);
    if (!rawFeatures) return;
    const ear = extractEyeAspectRatio(landmarks);

    if (!this.neutral) {
      this.neutralSum = {
        headYaw: this.neutralSum.headYaw + rawFeatures.headYaw,
        headPitch: this.neutralSum.headPitch + rawFeatures.headPitch,
        eyeX: this.neutralSum.eyeX + rawFeatures.eyeX,
        eyeY: this.neutralSum.eyeY + rawFeatures.eyeY,
        faceScale: this.neutralSum.faceScale + rawFeatures.faceScale,
      };
      this.neutralCount += 1;
      if (this.neutralCount >= NEUTRAL_SAMPLE_COUNT) {
        this.neutral = {
          headYaw: this.neutralSum.headYaw / this.neutralCount,
          headPitch: this.neutralSum.headPitch / this.neutralCount,
          eyeX: this.neutralSum.eyeX / this.neutralCount,
          eyeY: this.neutralSum.eyeY / this.neutralCount,
          faceScale: this.neutralSum.faceScale / this.neutralCount,
        };
      }
    }

    this.featureHistory.push(rawFeatures);
    if (this.featureHistory.length > FEATURE_HISTORY_SIZE) {
      this.featureHistory.shift();
    }

    const baseline = this.neutral ?? EMPTY_GAZE_FEATURES;
    const centeredFeatures = subtractFeatures(rawFeatures, baseline);
    const mode = this.settings.mode;

    let mapped: { x: number; y: number } | null = null;
    if (this.calibration) {
      mapped = mapWithModel(rawFeatures, mode, this.calibration.models[mode]);
    }
    if (!mapped) {
      mapped = defaultGazeMap(centeredFeatures, mode);
    }
    const adjusted = applySensitivity(mapped, this.settings.sensitivity);

    const filtered = this.filter.filter(adjusted.x, adjusted.y, timestamp);
    const viewportWidth = Math.max(1, window.innerWidth);
    const viewportHeight = Math.max(1, window.innerHeight);
    const bounded = clampViewportPoint(
      filtered.x,
      filtered.y,
      viewportWidth,
      viewportHeight
    );
    const screenX = bounded.x;
    const screenY = bounded.y;
    const xNorm = screenX / viewportWidth;
    const yNorm = screenY / viewportHeight;
    const inScrollZone =
      this.edgeScrollState.zone !== null && Math.abs(this.edgeScrollVelocity) > 12;

    let dwellProgress = 0;
    let target: HTMLElement | null = null;
    const dwellEnabled = this.settings.activationMode !== 'blink';

    if (!this.calibrationActive && !inScrollZone && !this.interactionSuspended) {
      target = findInteractiveElement(screenX, screenY);
      if (
        !target &&
        this.currentTarget?.isConnected &&
        pointerWithin(this.currentTarget, screenX, screenY, STICKY_PADDING_PX)
      ) {
        if (this.targetLeftAt === 0) this.targetLeftAt = timestamp;
        if (timestamp - this.targetLeftAt < TARGET_LEAVE_GRACE_MS) {
          target = this.currentTarget;
        }
      } else {
        this.targetLeftAt = 0;
      }

      if (target !== this.currentTarget) {
        this.currentTarget = target;
        this.dwellStartedAt = timestamp;
        this.dwellConsumed = false;
      }

      if (target && dwellEnabled && !this.dwellConsumed) {
        const elapsed = timestamp - this.dwellStartedAt;
        if (elapsed >= this.settings.dwellMs) {
          this.dwellConsumed = true;
          this.dwellStartedAt = timestamp;
          dwellProgress = 1;
          this.triggerElementClick(target);
          this.emitDwellClick(target);
        } else {
          dwellProgress = Math.max(0, Math.min(1, elapsed / this.settings.dwellMs));
        }
      }
    } else {
      this.resetDwellState();
      this.resetBlinkState();
    }

    const sample: GazeSample = {
      features: centeredFeatures,
      rawFeatures,
      xNorm,
      yNorm,
      screenX,
      screenY,
      faceDetected: true,
      timestamp,
    };
    this.lastSample = sample;

    if (ear !== null) {
      this.updateBlinkDetection(ear, timestamp);
    } else {
      this.resetBlinkState();
    }

    this.emitFrame({
      sample,
      faceDetected: true,
      dwellProgress,
      target,
      targetLabel: target ? describeInteractiveElement(target) : null,
      edgeScroll: this.edgeScrollState,
    });
  }

  private triggerElementClick(target: HTMLElement): void {
    if (!target.isConnected) return;
    try {
      target.focus({ preventScroll: true });
    } catch {
      // Some custom elements do not implement focus options.
    }
    try {
      target.click();
    } catch {
      target.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, view: window })
      );
    }
  }

  clickAtGaze(): HTMLElement | null {
    return this.activateReticleTarget();
  }

  recenter(): void {
    this.neutral = null;
    this.neutralSum = { ...EMPTY_GAZE_FEATURES };
    this.neutralCount = 0;
    this.featureHistory = [];
    this.filter.reset();
  }

  beginCalibration(): void {
    this.calibrationActive = true;
    this.pendingCalibrationPoints = [];
    this.resetDwellState();
    this.resetBlinkState();
    this.resetEdgeScroll();
    this.setStatus('calibrating');
    this.emitFrame({
      sample: this.lastSample,
      faceDetected: Boolean(this.lastSample?.faceDetected),
      dwellProgress: 0,
      target: null,
      targetLabel: null,
      edgeScroll: { ...IDLE_EDGE_SCROLL_STATE },
    });
  }

  captureCalibrationPoint(targetX: number, targetY: number): boolean {
    if (!this.calibrationActive) return false;
    const recent = this.featureHistory.slice(-CALIBRATION_SAMPLE_WINDOW);
    if (recent.length < 4) return false;

    this.pendingCalibrationPoints.push({
      targetX: clamp01(targetX),
      targetY: clamp01(targetY),
      features: averageFeatures(recent),
    });
    return true;
  }

  undoCalibrationPoint(): boolean {
    return Boolean(this.pendingCalibrationPoints.pop());
  }

  finishCalibration(): GazeCalibrationData | null {
    if (!this.calibrationActive || this.pendingCalibrationPoints.length < 5) {
      return null;
    }

    const calibration = createCalibration(this.pendingCalibrationPoints);
    this.calibration = calibration;
    saveGazeCalibration(calibration);
    this.pendingCalibrationPoints = [];
    this.calibrationActive = false;
    this.setStatus(this.running ? 'tracking' : 'paused');
    this.emitCalibration();
    return calibration;
  }

  cancelCalibration(): void {
    this.calibrationActive = false;
    this.pendingCalibrationPoints = [];
    this.setStatus(this.running ? 'tracking' : 'paused');
  }

  resetCalibration(): void {
    this.calibration = null;
    clearGazeCalibration();
    this.emitCalibration();
  }

  stop(): void {
    this.shouldRun = false;
    this.running = false;
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.scrollFrameId !== null) {
      window.cancelAnimationFrame(this.scrollFrameId);
      this.scrollFrameId = null;
    }
    this.cleanupMedia();
    this.resetDwellState();
    this.resetBlinkState();
    this.resetEdgeScroll();
    this.lastSample = null;
    this.setError(null);
    this.setStatus('paused');
    this.emitFrame({
      sample: null,
      faceDetected: false,
      dwellProgress: 0,
      target: null,
      targetLabel: null,
      edgeScroll: { ...IDLE_EDGE_SCROLL_STATE },
    });
  }

  private cleanupMedia(): void {
    if (this.video) {
      try {
        this.video.pause();
      } catch {
        // Ignore.
      }
      this.video.srcObject = null;
      this.video.remove();
      this.video = null;
    }
    this.frameCanvas = null;
    this.frameContext = null;
    this.emptyFaceFrames = 0;
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  dispose(): void {
    this.disposed = true;
    this.stop();
    if (this.landmarker) {
      try {
        this.landmarker.close();
      } catch {
        // Ignore.
      }
      this.landmarker = null;
    }
    this.frameListeners.clear();
    this.statusListeners.clear();
    this.errorListeners.clear();
    this.calibrationListeners.clear();
    this.dwellClickListeners.clear();
  }
}

function isGazeErrorInfo(value: unknown): value is GazeErrorInfo {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'code' in value &&
      'message' in value &&
      typeof (value as GazeErrorInfo).message === 'string'
  );
}
