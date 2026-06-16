import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeForm } from "@/lib/form-analysis.functions";
import { EXERCISES, MUSCLE_GROUPS, type MuscleGroup } from "@/lib/exercises";
import { Camera, Loader2, StopCircle } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/analyze")({
  head: () => ({ meta: [{ title: "Form Coach — Your Fitness Friend" }] }),
  component: AnalyzePage,
});

interface ScoreEntry {
  score: number;
  feedback: string;
  tips: string[];
  at: number;
}

function AnalyzePage() {
  const [muscle, setMuscle] = useState<MuscleGroup>("Chest");
  const [exercise, setExercise] = useState(EXERCISES.Chest[0].name);
  const [streaming, setStreaming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ScoreEntry[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runAnalyze = useServerFn(analyzeForm);
  const qc = useQueryClient();

  useEffect(() => {
    setExercise(EXERCISES[muscle][0].name);
  }, [muscle]);

  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
      intervalRef.current = setInterval(captureAndAnalyze, 4000);
    } catch {
      toast.error("Could not access camera. Check permissions.");
    }
  };

  const stopCamera = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreaming(false);
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
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      const result = await runAnalyze({ data: { exerciseName: exercise, imageDataUrl: dataUrl } });
      setResults((prev) => [{ ...result, at: Date.now() }, ...prev].slice(0, 8));
      qc.invalidateQueries({ queryKey: ["scores-recent"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  };

  const latest = results[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl tracking-wider">FORM <span className="neon-text">COACH</span></h1>
        <p className="text-sm text-muted-foreground">
          Position the camera so your full body is visible. We'll snapshot a frame every few seconds.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Muscle Group</label>
          <select
            value={muscle}
            onChange={(e) => setMuscle(e.target.value as MuscleGroup)}
            disabled={streaming}
            className="w-full rounded-md border border-input bg-card px-4 py-2.5 text-sm"
          >
            {MUSCLE_GROUPS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Exercise</label>
          <select
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
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          {!streaming && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 text-center">
              <Camera className="h-12 w-12 text-neon" />
              <p className="max-w-xs text-sm text-muted-foreground">
                Camera off. Click Start to begin analyzing your form.
              </p>
            </div>
          )}
          {busy && streaming && (
            <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs">
              <Loader2 className="h-3 w-3 animate-spin text-neon" /> Analyzing...
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="space-y-4">
          {!streaming ? (
            <button
              onClick={startCamera}
              className="neon-btn flex w-full items-center justify-center gap-2 rounded-md py-3 font-display text-lg tracking-wider"
            >
              <Camera className="h-5 w-5" /> START
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-destructive py-3 font-display text-lg tracking-wider text-destructive hover:bg-destructive/10"
            >
              <StopCircle className="h-5 w-5" /> STOP
            </button>
          )}

          {latest && (
            <div className="rounded-xl border border-neon/40 bg-card p-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Latest Score</p>
              <p className="neon-text my-2 font-display text-5xl">{latest.score}<span className="text-xl text-muted-foreground">/100</span></p>
              <p className="text-sm">{latest.feedback}</p>
              {latest.tips.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {latest.tips.map((t, i) => <li key={i}>• {t}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {results.length > 1 && (
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-3 text-xl">Session Scores</h2>
          <div className="flex flex-wrap gap-2">
            {results.map((r, i) => (
              <div key={i} className="rounded-md border border-border bg-background/50 px-3 py-2 text-sm">
                <span className="neon-text font-display text-lg">{r.score}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {new Date(r.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
