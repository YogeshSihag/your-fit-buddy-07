import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeForm, type AnalysisResult, type FormIndicator } from "@/lib/form-analysis.functions";
import { EXERCISES, MUSCLE_GROUPS, type MuscleGroup } from "@/lib/exercises";
import {
  Camera,
  CameraOff,
  Loader2,
  RotateCcw,
  StopCircle,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  beep,
  getStoredFacing,
  openCamera,
  setStoredFacing,
  stopStream,
  vibrate,
  type FacingMode,
} from "@/lib/camera";

export const Route = createFileRoute("/_authenticated/analyze")({
  head: () => ({
    meta: [
      { title: "AI Form Coach — Your Fitness Friend" },
      {
        name: "description",
        content:
          "Turn on your camera and get real-time AI form analysis, corrective cues, and a 0–100 form score for every exercise.",
      },
      { property: "og:title", content: "AI Form Coach — Your Fitness Friend" },
      { property: "og:description", content: "Real-time camera-based form analysis with corrective cues for every set." },
      { property: "og:url", content: "https://your-fit-buddy-07.lovable.app/analyze" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://your-fit-buddy-07.lovable.app/analyze" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Your Fitness Friend — AI Form Coach",
          applicationCategory: "HealthApplication",
          operatingSystem: "Web",
          url: "https://your-fit-buddy-07.lovable.app/analyze",
          description:
            "AI-powered form analysis tool that grades exercise technique in real time using your device camera.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
  component: AnalyzePage,
});

interface ScoreEntry extends AnalysisResult {
  at: number;
}

const INDICATOR_STYLES: Record<FormIndicator, { ring: string; bg: string; text: string; label: string; Icon: React.ElementType }> = {
  green: {
    ring: "ring-emerald-400",
    bg: "bg-emerald-500/15 border-emerald-400/50",
    text: "text-emerald-400",
    label: "EXCELLENT",
    Icon: CheckCircle2,
  },
  yellow: {
    ring: "ring-amber-400",
    bg: "bg-amber-500/15 border-amber-400/50",
    text: "text-amber-400",
    label: "ADJUST",
    Icon: AlertTriangle,
  },
  red: {
    ring: "ring-red-500",
    bg: "bg-red-500/15 border-red-500/50",
    text: "text-red-400",
    label: "FIX FORM",
    Icon: AlertCircle,
  },
};

function AnalyzePage() {
  const [muscle, setMuscle] = useState<MuscleGroup>("Chest");
  const [exercise, setExercise] = useState(EXERCISES.Chest[0].name);
  const [streaming, setStreaming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ScoreEntry[]>([]);
  const [facing, setFacing] = useState<FacingMode>("user");
  const [alertsOn, setAlertsOn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<"unknown" | "granted" | "denied" | "prompt">("unknown");
  const [setEnded, setSetEnded] = useState<{ entries: ScoreEntry[] } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runAnalyze = useServerFn(analyzeForm);
  const qc = useQueryClient();

  // load preferred camera + permission state
  useEffect(() => {
    setFacing(getStoredFacing());
    if (typeof navigator !== "undefined" && "permissions" in navigator) {
      navigator.permissions
        ?.query({ name: "camera" as PermissionName })
        .then((p) => setPermissionState(p.state as typeof permissionState))
        .catch(() => setPermissionState("unknown"));
    }
  }, []);

  useEffect(() => {
    setExercise(EXERCISES[muscle][0].name);
  }, [muscle]);

  useEffect(() => () => stopAll(), []);

  // Latest indicator drives realtime alerts
  const latest = results[0];
  useEffect(() => {
    if (!latest || !alertsOn) return;
    if (latest.indicator === "red") {
      beep(330, 180);
      vibrate([60, 40, 60]);
    } else if (latest.indicator === "yellow") {
      beep(660, 90);
    }
  }, [latest, alertsOn]);

  const stopAll = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreaming(false);
  };

  const startCamera = async (nextFacing: FacingMode = facing) => {
    setError(null);
    try {
      stopStream(streamRef.current);
      const stream = await openCamera(nextFacing);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setFacing(nextFacing);
      setStoredFacing(nextFacing);
      setStreaming(true);
      setPermissionState("granted");
      if (!intervalRef.current) {
        intervalRef.current = setInterval(captureAndAnalyze, 4000);
      }
    } catch (e: any) {
      const msg = e?.message ?? "Camera unavailable";
      setError(msg);
      setStreaming(false);
      if (msg.toLowerCase().includes("denied")) setPermissionState("denied");
      toast.error(msg);
    }
  };

  const switchCamera = async () => {
    const next: FacingMode = facing === "user" ? "environment" : "user";
    if (streaming) {
      await startCamera(next);
    } else {
      setFacing(next);
      setStoredFacing(next);
    }
  };

  const endSet = () => {
    if (results.length > 0) setSetEnded({ entries: [...results] });
    stopAll();
  };

  const startNewSet = () => {
    setSetEnded(null);
    setResults([]);
    void startCamera();
  };

  const captureAndAnalyze = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    if (busy) return;
    setBusy(true);
    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // mirror front camera frame so AI sees what user sees
      if (facing === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      const result = await runAnalyze({ data: { exerciseName: exercise, imageDataUrl: dataUrl } });
      setResults((prev) => [{ ...result, at: Date.now() }, ...prev].slice(0, 12));
      qc.invalidateQueries({ queryKey: ["scores-recent"] });
      qc.invalidateQueries({ queryKey: ["scores-all"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  };

  const indicator = latest?.indicator ?? "green";
  const style = INDICATOR_STYLES[indicator];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl tracking-wider">
          FORM <span className="neon-text">COACH</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Position the camera so your full body is visible. We snapshot a frame every 4s and grade your form in real time.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="muscle-group" className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Muscle Group</label>
          <select
            id="muscle-group"
            value={muscle}
            onChange={(e) => setMuscle(e.target.value as MuscleGroup)}
            disabled={streaming}
            className="w-full rounded-md border border-input bg-card px-4 py-2.5 text-sm"
          >
            {MUSCLE_GROUPS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="exercise" className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Exercise</label>
          <select
            id="exercise"
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
            disabled={streaming}
            className="w-full rounded-md border border-input bg-card px-4 py-2.5 text-sm"
          >
            {EXERCISES[muscle].map((e) => <option key={e.name}>{e.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Camera frame */}
        <div
          className={`relative aspect-video overflow-hidden rounded-2xl border bg-black transition-all ${
            streaming ? `ring-2 ${style.ring} ${INDICATOR_STYLES[indicator].bg.split(" ")[1]}` : "border-border"
          }`}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            className={`h-full w-full object-cover ${facing === "user" ? "scale-x-[-1]" : ""}`}
          />

          {streaming && (
            <>
              {/* Top-left: traffic light */}
              <div className={`absolute left-3 top-3 flex items-center gap-2 rounded-full border px-3 py-1 backdrop-blur ${style.bg}`}>
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${
                  indicator === "green" ? "bg-emerald-400" :
                  indicator === "yellow" ? "bg-amber-400" : "bg-red-500"
                } animate-pulse`} />
                <span className={`text-xs font-display tracking-widest ${style.text}`}>{style.label}</span>
                {latest && <span className="text-xs text-foreground/80">{latest.score}</span>}
              </div>

              {/* Top-right: status chips */}
              <div className="absolute right-3 top-3 flex items-center gap-2">
                <span className="rounded-full bg-background/80 px-3 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                  {facing === "user" ? "Front" : "Rear"}
                </span>
                {busy && (
                  <span className="flex items-center gap-1 rounded-full bg-background/80 px-3 py-1 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin text-neon" /> Analyzing
                  </span>
                )}
              </div>

              {/* Bottom: live mistakes */}
              {latest && latest.mistakes.length > 0 && (
                <div className="absolute inset-x-3 bottom-3 space-y-1.5">
                  {latest.mistakes.slice(0, 3).map((m, i) => {
                    const s = INDICATOR_STYLES[m.severity];
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs backdrop-blur ${s.bg}`}
                      >
                        <s.Icon className={`h-3.5 w-3.5 shrink-0 ${s.text}`} />
                        <span className="font-medium text-foreground">{m.cue}</span>
                        {m.bodyPart && (
                          <span className="ml-auto rounded-full bg-background/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {m.bodyPart}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Camera switch */}
              <button
                onClick={switchCamera}
                aria-label="Switch camera"
                className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/80 text-foreground backdrop-blur transition-colors hover:bg-background"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </>
          )}

          {!streaming && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 p-6 text-center">
              {error ? (
                <>
                  <CameraOff className="h-12 w-12 text-red-400" />
                  <p className="max-w-xs text-sm text-red-300">{error}</p>
                  {permissionState === "denied" && (
                    <p className="max-w-xs text-xs text-muted-foreground">
                      Open your browser site settings and allow camera access, then try again.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <Camera className="h-12 w-12 text-neon" />
                  <p className="max-w-xs text-sm text-muted-foreground">
                    Camera off. Tap Start to begin analyzing your form.
                  </p>
                </>
              )}
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {!streaming ? (
            <div className="space-y-2">
              <button
                onClick={() => startCamera()}
                className="neon-btn flex w-full items-center justify-center gap-2 rounded-md py-3 font-display text-lg tracking-wider"
              >
                <Camera className="h-5 w-5" /> START
              </button>
              <button
                onClick={switchCamera}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <RotateCcw className="h-4 w-4" /> Use {facing === "user" ? "rear" : "front"} camera
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={endSet}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-destructive py-3 font-display text-lg tracking-wider text-destructive hover:bg-destructive/10"
              >
                <StopCircle className="h-5 w-5" /> END SET
              </button>
              <div className="flex gap-2">
                <button
                  onClick={switchCamera}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border bg-card py-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-4 w-4" /> Flip
                </button>
                <button
                  onClick={() => setAlertsOn((v) => !v)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md border py-2 text-xs ${
                    alertsOn ? "border-neon/40 text-neon" : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {alertsOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  {alertsOn ? "Alerts on" : "Muted"}
                </button>
              </div>
            </div>
          )}

          {latest && (
            <div className={`rounded-xl border p-5 ${style.bg}`}>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Form Accuracy</p>
              <div className="my-2 flex items-baseline gap-2">
                <p className={`font-display text-5xl ${style.text}`}>
                  {latest.score}
                  <span className="text-xl text-muted-foreground">/100</span>
                </p>
              </div>
              {/* meter */}
              <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-background/60">
                <div
                  className={`h-full transition-all ${
                    indicator === "green" ? "bg-emerald-400" :
                    indicator === "yellow" ? "bg-amber-400" : "bg-red-500"
                  }`}
                  style={{ width: `${latest.score}%` }}
                />
              </div>
              <p className="text-sm">{latest.feedback}</p>
              {latest.mistakes.length === 0 && latest.tips.length === 0 && (
                <p className="mt-3 text-xs text-emerald-400">Clean rep — keep going!</p>
              )}
              {latest.tips.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Improve your score</p>
                  <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                    {latest.tips.map((t, i) => <li key={i}>• {t}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {results.length > 1 && (
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-3 text-xl">Session Scores</h2>
          <div className="flex flex-wrap gap-2">
            {results.map((r, i) => {
              const s = INDICATOR_STYLES[r.indicator];
              return (
                <div key={i} className={`rounded-md border px-3 py-2 text-sm ${s.bg}`}>
                  <span className={`font-display text-lg ${s.text}`}>{r.score}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {new Date(r.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {setEnded && (
        <SetSummary
          exercise={exercise}
          entries={setEnded.entries}
          onClose={() => setSetEnded(null)}
          onRestart={startNewSet}
        />
      )}
    </div>
  );
}

function SetSummary({
  exercise,
  entries,
  onClose,
  onRestart,
}: {
  exercise: string;
  entries: ScoreEntry[];
  onClose: () => void;
  onRestart: () => void;
}) {
  const avg = Math.round(entries.reduce((s, e) => s + e.score, 0) / entries.length);
  const best = entries.reduce((b, e) => (e.score > b ? e.score : b), 0);
  const commonMistakes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) for (const m of e.mistakes) counts.set(m.cue, (counts.get(m.cue) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [entries]);
  const allTips = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const e of entries) for (const t of e.tips) {
      if (!seen.has(t)) { seen.add(t); out.push(t); if (out.length >= 4) break; }
    }
    return out;
  }, [entries]);
  const indicator: FormIndicator = avg >= 80 ? "green" : avg >= 55 ? "yellow" : "red";
  const style = INDICATOR_STYLES[indicator];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur md:items-center">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Set Summary · {exercise}</p>
        <h2 className="font-display text-3xl tracking-wider">
          {entries.length} REP{entries.length === 1 ? "" : "S"} ANALYZED
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className={`rounded-xl border p-4 ${style.bg}`}>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Average</p>
            <p className={`font-display text-3xl ${style.text}`}>{avg}<span className="text-base text-muted-foreground">/100</span></p>
          </div>
          <div className="rounded-xl border border-neon/40 bg-card p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Best Rep</p>
            <p className="neon-text font-display text-3xl">{best}<span className="text-base text-muted-foreground">/100</span></p>
          </div>
        </div>

        {commonMistakes.length > 0 && (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Most common mistakes</p>
            <ul className="mt-1 space-y-1 text-sm">
              {commonMistakes.map(([cue, n]) => (
                <li key={cue} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                  <span>{cue}</span>
                  <span className="text-xs text-muted-foreground">×{n}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {allTips.length > 0 && (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Personalized tips</p>
            <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
              {allTips.map((t, i) => <li key={i}>• {t}</li>)}
            </ul>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-border bg-background py-2.5 text-sm hover:bg-secondary"
          >
            Close
          </button>
          <button
            onClick={onRestart}
            className="neon-btn flex-1 rounded-md py-2.5 font-display tracking-wider"
          >
            NEW SET
          </button>
        </div>
      </div>
    </div>
  );
}
