import { useEffect, useState } from 'react';
import { Camera, Mic, ShieldAlert } from 'lucide-react';
import {
  PERMISSION_PROMPT_BANNER_TEXT,
  getPermissionPromptSnapshot,
  subscribePermissionPrompt,
  type PermissionPromptSnapshot,
} from '../engines/browserPermissions';

export function BrowserPermissionBanner() {
  const [snapshot, setSnapshot] = useState<PermissionPromptSnapshot>(() =>
    getPermissionPromptSnapshot()
  );

  useEffect(() => subscribePermissionPrompt(setSnapshot), []);

  if (!snapshot.active) return null;

  const requestingCamera = snapshot.permissions.includes('camera');
  const requestingMicrophone = snapshot.permissions.includes('microphone');
  const requestingLabel =
    requestingCamera && requestingMicrophone
      ? 'camera and microphone'
      : requestingCamera
        ? 'camera'
        : 'microphone';

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      data-gaze-ignore="true"
      className="pointer-events-none fixed inset-x-0 top-3 z-[98] flex justify-center px-3"
    >
      <div className="pointer-events-auto w-full max-w-3xl rounded-xl border-4 border-yellow-300 bg-black p-4 text-white shadow-2xl">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-yellow-300" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-snug sm:text-base">
              {PERMISSION_PROMPT_BANNER_TEXT}
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-200">
              <span className="inline-flex items-center gap-1">
                {requestingCamera && <Camera className="h-3.5 w-3.5" aria-hidden="true" />}
                {requestingMicrophone && <Mic className="h-3.5 w-3.5" aria-hidden="true" />}
                Waiting for {requestingLabel} permission.
              </span>
              <span>Gaze clicking is paused until the popup closes.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
