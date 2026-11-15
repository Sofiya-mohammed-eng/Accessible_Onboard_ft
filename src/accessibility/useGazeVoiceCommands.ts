import { useEffect, useRef } from 'react';
import { startVoiceDictation, type VoiceInputSession } from '../engines/accessibilityEngine';
import {
  acquireMicrophone,
  microphoneOwner,
  releaseMicrophone,
  subscribeMicrophone,
  watchMicrophoneOwner,
} from '../engines/microphoneOwner';
import { beginPermissionPrompt } from '../engines/browserPermissions';
import { describeInteractiveElement, GazeControlEngine } from './gazeControlEngine';
import {
  gazeMayAnnounceListening,
  gazeRetryDelay,
  gazeVoiceWaitingStatus,
} from './gazeVoiceAvailability';
import { matchGazeVoiceCommand, type GazeVoiceCommand } from './gazeVoiceCommands';

export type GazeVoiceStatus = 'off' | 'starting' | 'listening' | 'waiting' | 'error';

interface UseGazeVoiceCommandsOptions {
  enabled: boolean;
  engine: GazeControlEngine;
  onCalibrate: () => void;
  onPause: () => void;
  onResume: () => void;
  onStatus: (status: GazeVoiceStatus, message: string) => void;
}

export function useGazeVoiceCommands({
  enabled,
  engine,
  onCalibrate,
  onPause,
  onResume,
  onStatus,
}: UseGazeVoiceCommandsOptions): void {
  const callbacksRef = useRef({ engine, onCalibrate, onPause, onResume, onStatus });
  callbacksRef.current = { engine, onCalibrate, onPause, onResume, onStatus };

  useEffect(() => {
    if (!enabled) {
      callbacksRef.current.onStatus('off', 'Voice commands are off.');
      return;
    }

    let cancelled = false;
    let restartAllowed = true;
    let restartTimer: number | null = null;
    let session: VoiceInputSession | null = null;
    let listenToken = 0;
    let ownRelease = false;

    const reportWaiting = () => {
      listenToken += 1;
      const waiting = gazeVoiceWaitingStatus();
      callbacksRef.current.onStatus(waiting.status, waiting.message);
    };

    const scheduleRestart = () => {
      const delay = gazeRetryDelay({
        cancelled,
        restartAllowed,
        retryPending: restartTimer !== null,
      });
      if (delay === null) return;
      restartTimer = window.setTimeout(() => {
        restartTimer = null;
        if (!cancelled && restartAllowed) void start();
      }, delay);
    };

    const executeCommand = (command: GazeVoiceCommand) => {
      const current = callbacksRef.current;

      switch (command) {
        case 'click': {
          const status = current.engine.getStatus();
          if (status === 'paused' || status === 'idle' || status === 'error') {
            current.onStatus(
              'listening',
              'Gaze control is paused. Say "resume" before using the click command.'
            );
            return;
          }
          if (status === 'initializing') {
            current.onStatus('listening', 'Gaze control is still starting. Try again in a moment.');
            return;
          }
          if (status === 'calibrating') {
            current.onStatus('listening', 'Calibration is open. Finish calibration before clicking.');
            return;
          }
          if (status === 'no-face') {
            current.onStatus(
              'listening',
              'No face is detected. Center your face in the camera before clicking.'
            );
            return;
          }
          const target = current.engine.clickAtGaze();
          current.onStatus(
            'listening',
            target
              ? `Clicked ${describeInteractiveElement(target)}.`
              : 'No interactive element is under the gaze reticle.'
          );
          return;
        }
        case 'scroll-down':
          window.scrollBy({
            top: Math.round(window.innerHeight * 0.85),
            left: 0,
            behavior: 'smooth',
          });
          current.onStatus('listening', 'Scrolling down.');
          return;
        case 'scroll-up':
          window.scrollBy({
            top: -Math.round(window.innerHeight * 0.85),
            left: 0,
            behavior: 'smooth',
          });
          current.onStatus('listening', 'Scrolling up.');
          return;
        case 'calibrate':
          current.onCalibrate();
          return;
        case 'pause':
          current.onPause();
          return;
        case 'resume':
          current.onResume();
          return;
      }
    };

    const start = async () => {
      if (cancelled || session?.isCurrent()) return;
      if (!acquireMicrophone('gaze')) {
        reportWaiting();
        return;
      }
      const token = listenToken;
      callbacksRef.current.onStatus(
        'starting',
        'Waiting for microphone permission and starting voice commands.'
      );

      const permissionRequest = await beginPermissionPrompt(['microphone']);
      if (cancelled || microphoneOwner() !== 'gaze') {
        permissionRequest.end();
        releaseMicrophone('gaze');
        return;
      }
      const settlePermission = () => permissionRequest.end();

      const nextSession = startVoiceDictation({
        owner: 'gaze',
        onStart: () => {
          settlePermission();
          if (!gazeMayAnnounceListening({
            callbackToken: token,
            activeToken: listenToken,
            owner: microphoneOwner(),
          })) return;
          callbacksRef.current.onStatus(
            'listening',
            'Voice commands listening. Say click, select, scroll down, scroll up, calibrate, pause, or resume.'
          );
        },
        onTranscript: (transcript, isFinal) => {
          if (cancelled || !isFinal) return;
          if (!gazeMayAnnounceListening({
            callbackToken: token,
            activeToken: listenToken,
            owner: microphoneOwner(),
          })) return;
          const command = matchGazeVoiceCommand(transcript);
          if (command) executeCommand(command);
        },
        onError: (message) => {
          settlePermission();
          if (cancelled || token !== listenToken) return;
          if (
            message.includes('permission was denied') ||
            message.includes('not supported') ||
            message.includes('Unable to start')
          ) {
            restartAllowed = false;
          }
          callbacksRef.current.onStatus('error', message);
        },
        onEnd: () => {
          settlePermission();
          if (cancelled || token !== listenToken) return;
          session = null;
          if (microphoneOwner() === 'gaze') {
            ownRelease = true;
            releaseMicrophone('gaze');
            ownRelease = false;
          }
          if (!restartAllowed) return;
          callbacksRef.current.onStatus('starting', 'Restarting voice commands.');
          scheduleRestart();
        },
      });

      if (cancelled || microphoneOwner() !== 'gaze') {
        settlePermission();
        nextSession?.stop();
        releaseMicrophone('gaze');
        return;
      }

      if (nextSession) {
        session = nextSession;
      } else {
        releaseMicrophone('gaze');
        restartAllowed = false;
        callbacksRef.current.onStatus(
          'error',
          'Voice commands could not start. Check microphone support and browser permission.'
        );
      }
    };

    const unsubscribe = subscribeMicrophone(() => {
      if (cancelled || session?.isCurrent()) return;
      scheduleRestart();
    });
    const unwatch = watchMicrophoneOwner(() => {
      if (cancelled || ownRelease || microphoneOwner() === 'gaze') return;
      if (session && !session.isCurrent()) session = null;
      reportWaiting();
    });
    void start();

    return () => {
      cancelled = true;
      unsubscribe();
      unwatch();
      if (restartTimer !== null) {
        window.clearTimeout(restartTimer);
        restartTimer = null;
      }
      session?.stop();
      session = null;
      releaseMicrophone('gaze');
    };
  }, [enabled, engine]);
}
