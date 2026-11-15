# Hands-Free Setup

AccessBridge can run gaze and voice control without touching a mouse or keyboard after setup. The app supports automatic startup, automatic 9-point calibration, dwell or blink clicking, voice commands, and browser-permission recovery.

## Quick start

1. Install Google Chrome or Microsoft Edge.
2. Start the app:

   ```powershell
   npm run dev
   ```

3. In another terminal, launch the hands-free browser profile:

   ```powershell
   npm run hands-free
   ```

   Or run the script directly:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\launch-hands-free.ps1
   ```

4. Allow camera and microphone access when the onboarding screen asks. With the hands-free launcher, the browser permission prompt is auto-accepted.
5. Run the 9-point calibration. Each point is captured automatically after the gaze remains steady for 1.2 seconds. No click or key press is needed. If a point does not begin capturing, glance away and back to the dot.

## Automatic start

Gaze control starts automatically when either condition is true:

- A calibration is already saved in this browser.
- The app is opened with `?autostart=gaze`, for example:

  ```text
  http://localhost:3000/?autostart=gaze
  ```

The hands-free launcher uses this URL by default. If the URL requests autostart and no calibration is saved, the app starts the camera and opens the calibration wizard automatically. To force a fresh calibration, reset calibration in the Gaze & Head Control panel or clear the site's local storage.

## Click activation

Open **Gaze & Head Control** to choose:

- **Dwell**: hold gaze on an element for the dwell time.
- **Blink**: deliberately close both eyes for 400-700 ms.
- **Both**: either dwell or a deliberate blink activates the element under the reticle.

The dwell slider is disabled while **Blink** is selected. Short natural blinks are ignored.

## Voice commands

Enable **Voice commands** in the Gaze & Head Control panel. Chrome or Edge and microphone permission are required.

| Command | Action |
| --- | --- |
| `"click"` or `"select"` | Activate the element under the gaze reticle |
| `"scroll down"` / `"scroll up"` | Scroll the page |
| `"calibrate"` | Start hands-free calibration, starting gaze control first if needed |
| `"pause"` | Pause gaze control |
| `"resume"` | Resume gaze control |

Voice recognition restarts automatically after browser timeouts or temporary errors. If microphone permission is denied, the command listener reports the error and the panel shows when it needs attention.

## Browser permission options

### Option A: hands-free launcher (recommended)

The script launches Chrome or Edge with a dedicated profile and these flags:

```text
--use-fake-ui-for-media-stream
--autoplay-policy=no-user-gesture-required
```

`--use-fake-ui-for-media-stream` auto-accepts camera and microphone permission prompts. It does **not** fake the camera or microphone; real devices are still used. Do not use `--use-fake-device-for-media-stream` for accessibility use because that replaces the real camera with a test pattern.

The dedicated profile is stored at:

```text
%LOCALAPPDATA%\AccessBridge\HandsFreeProfile
```

### Option B: pre-approve the site in Chrome or Edge

1. Open the app in Chrome or Edge.
2. Select the site controls icon next to the address bar.
3. Set **Camera** and **Microphone** to **Allow**.
4. Reload the page.

Browser-wide defaults are available at:

- `chrome://settings/content/camera`
- `chrome://settings/content/microphone`
- `edge://settings/content/camera`
- `edge://settings/content/microphone`

### Option C: native wrapper

If AccessBridge is hosted in Electron, WebView2, Tauri, or another embedded browser, the wrapper must grant camera and microphone permissions:

- **Electron**: handle `session.setPermissionRequestHandler` and allow `media` for the app origin.
- **WebView2**: handle `CoreWebView2.PermissionRequested` and allow `Camera` and `Microphone`.
- **Tauri/other**: grant media capture to the webview or the hosted origin through the platform permission API.

The app still detects native or browser prompts and resumes gaze control automatically after access is granted.

## Permission status and recovery

While the browser permission dialog is open, the app:

- Pauses dwell clicking, blink clicking, and edge scrolling.
- Shows a high-contrast banner: **"Browser permission popup active — press Tab + Enter or ask an assistant to click 'Allow' to continue hands-free."**
- Resumes automatically when the prompt closes or the camera/microphone becomes available.

If the prompt is missed, press `Tab` until **Allow** is focused, then press `Enter`, or ask an assistant to click it.

## Troubleshooting

- **Camera does not start**: check that no other app is using the camera, then reopen the hands-free launcher. The panel reports permission denied, no camera, camera busy, or model-load errors.
- **No face detected**: center the face in the webcam, improve front lighting, and keep the head inside the frame.
- **Voice commands do not start**: use Chrome or Edge, allow microphone access, and make sure another app is not holding the microphone.
- **Calibration does not advance**: keep the gaze steady on the highlighted dot for 1.2 seconds. If the face is lost, the capture timer resets.
- **Gaze clicks the wrong place**: recalibrate and consider Hybrid tracking mode. Increase smoothing if the reticle jitters.
- **Permission banner remains visible**: focus the browser window and use `Tab` to reach the prompt's **Allow** button. The banner clears when the permission request settles.

## Verification

Run:

```powershell
npm run lint
npm run build
```

Then launch with `npm run hands-free`, complete calibration, and test dwell, blink, and voice commands. Camera and microphone hardware behavior must be verified manually.
