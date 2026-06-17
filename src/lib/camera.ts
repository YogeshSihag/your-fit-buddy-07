export type FacingMode = "user" | "environment";

const STORAGE_KEY = "yff:cameraFacing";

export function getStoredFacing(): FacingMode {
  if (typeof window === "undefined") return "user";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "environment" ? "environment" : "user";
}

export function setStoredFacing(f: FacingMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, f);
}

export async function openCamera(facing: FacingMode): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Your browser doesn't support camera access.");
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facing }, width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
  } catch (e: any) {
    const name = e?.name ?? "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      throw new Error("Camera permission denied. Enable it in your browser settings.");
    }
    if (name === "NotFoundError" || name === "OverconstrainedError") {
      // Fall back to default camera
      try {
        return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch {
        throw new Error("No camera was found on this device.");
      }
    }
    if (name === "NotReadableError") {
      throw new Error("Camera is in use by another app. Close it and try again.");
    }
    throw new Error("Could not start camera. Please try again.");
  }
}

export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

// short beep using Web Audio API
let _ctx: AudioContext | null = null;
export function beep(frequency = 880, durationMs = 120) {
  if (typeof window === "undefined") return;
  try {
    _ctx ??= new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = _ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.value = 0.08;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      osc.disconnect();
      gain.disconnect();
    }, durationMs);
  } catch {
    /* ignore */
  }
}

export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
}
