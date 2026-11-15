export type MediaPermissionName = 'camera' | 'microphone';

export type MediaPermissionState = PermissionState | 'unsupported';

export interface MediaPermissionStates {
  camera: MediaPermissionState;
  microphone: MediaPermissionState;
}

export interface PermissionPromptSnapshot {
  active: boolean;
  permissions: MediaPermissionName[];
}

export interface PermissionPromptRequest {
  active: boolean;
  states: Partial<Record<MediaPermissionName, MediaPermissionState>>;
  end: () => void;
}

export interface MediaAccessResult extends MediaPermissionStates {
  granted: boolean;
  partial: boolean;
}

export const PERMISSION_PROMPT_BANNER_TEXT =
  "Browser permission popup active — press Tab + Enter or ask an assistant to click 'Allow' to continue hands-free.";

let nextRequestId = 0;
const activeRequests = new Map<number, MediaPermissionName[]>();
const promptListeners = new Set<(snapshot: PermissionPromptSnapshot) => void>();

function buildSnapshot(): PermissionPromptSnapshot {
  const permissions = Array.from(new Set(Array.from(activeRequests.values()).flat()));
  return {
    active: permissions.length > 0,
    permissions,
  };
}

function emitPromptState(): void {
  const snapshot = buildSnapshot();
  promptListeners.forEach((listener) => notifyPromptListener(listener, snapshot));
}

function notifyPromptListener(
  listener: (snapshot: PermissionPromptSnapshot) => void,
  snapshot: PermissionPromptSnapshot
): void {
  try {
    listener(snapshot);
  } catch {
    // A broken listener should not leave a permission request stuck open.
  }
}

export function getPermissionPromptSnapshot(): PermissionPromptSnapshot {
  return buildSnapshot();
}

export function subscribePermissionPrompt(
  listener: (snapshot: PermissionPromptSnapshot) => void
): () => void {
  promptListeners.add(listener);
  notifyPromptListener(listener, buildSnapshot());
  return () => {
    promptListeners.delete(listener);
  };
}

export async function queryMediaPermissionState(
  name: MediaPermissionName
): Promise<MediaPermissionState> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return 'unsupported';
  }

  try {
    const status = await navigator.permissions.query({
      name,
    } as unknown as PermissionDescriptor);
    return status.state;
  } catch {
    return 'unsupported';
  }
}

export async function queryMediaPermissionStates(): Promise<MediaPermissionStates> {
  const [camera, microphone] = await Promise.all([
    queryMediaPermissionState('camera'),
    queryMediaPermissionState('microphone'),
  ]);
  return { camera, microphone };
}

export async function beginPermissionPrompt(
  permissions: MediaPermissionName[]
): Promise<PermissionPromptRequest> {
  const uniquePermissions = Array.from(new Set(permissions));
  const entries = await Promise.all(
    uniquePermissions.map(
      async (permission) => [permission, await queryMediaPermissionState(permission)] as const
    )
  );
  const states = Object.fromEntries(entries) as Partial<
    Record<MediaPermissionName, MediaPermissionState>
  >;
  const shouldActivate = uniquePermissions.some(
    (permission) => states[permission] === 'prompt'
  );

  if (!shouldActivate) {
    return {
      active: false,
      states,
      end: () => undefined,
    };
  }

  const requestId = nextRequestId;
  nextRequestId += 1;
  activeRequests.set(requestId, uniquePermissions);
  emitPromptState();

  let ended = false;
  return {
    active: true,
    states,
    end: () => {
      if (ended) return;
      ended = true;
      activeRequests.delete(requestId);
      emitPromptState();
    },
  };
}

export async function requestCameraAndMicrophoneAccess(): Promise<MediaAccessResult> {
  const supported =
    typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

  if (!supported) {
    return {
      camera: 'unsupported',
      microphone: 'unsupported',
      granted: false,
      partial: false,
    };
  }

  const promptRequest = await beginPermissionPrompt(['camera', 'microphone']);

  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  } catch {
    // The permission state queries below report whether either request succeeded.
  } finally {
    promptRequest.end();
  }

  const streamGranted = Boolean(
    stream &&
      stream.getVideoTracks().length > 0 &&
      stream.getAudioTracks().length > 0
  );
  stream?.getTracks().forEach((track) => track.stop());

  const states = await queryMediaPermissionStates();
  const granted =
    streamGranted || (states.camera === 'granted' && states.microphone === 'granted');
  const grantedCount =
    Number(states.camera === 'granted') + Number(states.microphone === 'granted');

  return {
    ...states,
    granted,
    partial: !granted && grantedCount === 1,
  };
}
