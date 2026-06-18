import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward, Timer, X } from "lucide-react";

interface RestTimerProps {
  seconds: number;
  onComplete?: () => void;
  onClose?: () => void;
}

const PRESETS = [30, 60, 90, 120];

function playDing() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    o.type = "sine";
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    o.start();
    o.stop(ctx.currentTime + 0.65);
    // second beep
    const o2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    o2.connect(g2);
    g2.connect(ctx.destination);
    o2.frequency.value = 1175;
    o2.type = "sine";
    g2.gain.setValueAtTime(0.0001, ctx.currentTime + 0.25);
    g2.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.27);
    g2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.85);
    o2.start(ctx.currentTime + 0.25);
    o2.stop(ctx.currentTime + 0.9);
  } catch { /* noop */ }
}

export function RestTimer({ seconds, onComplete, onClose }: RestTimerProps) {
  const [total, setTotal] = useState(seconds);
  const [remaining, setRemaining] = useState(seconds);
  const [paused, setPaused] = useState(false);
  const [custom, setCustom] = useState("");
  const firedRef = useRef(false);

  useEffect(() => {
    setTotal(seconds);
    setRemaining(seconds);
    firedRef.current = false;
  }, [seconds]);

  useEffect(() => {
    if (paused || remaining <= 0) return;
    const i = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(i);
  }, [paused, remaining]);

  useEffect(() => {
    if (remaining === 0 && !firedRef.current) {
      firedRef.current = true;
      playDing();
      onComplete?.();
    }
  }, [remaining, onComplete]);

  const setPreset = (s: number) => {
    setTotal(s);
    setRemaining(s);
    firedRef.current = false;
    setPaused(false);
  };

  const pct = total > 0 ? (remaining / total) * 100 : 0;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const done = remaining === 0;

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 mx-auto w-full max-w-md px-4 md:bottom-4">
      <div className={`rounded-2xl border bg-card p-4 shadow-2xl backdrop-blur-xl ${done ? "border-neon ring-1 ring-neon/40" : "border-border"}`}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <Timer className="h-3.5 w-3.5" /> Rest Timer
          </div>
          <button onClick={onClose} aria-label="Close timer" className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-center">
          <div className={`text-5xl font-bold tracking-tight tabular-nums ${done ? "text-neon" : "text-foreground"}`}>
            {mins}:{secs.toString().padStart(2, "0")}
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className={`h-full transition-all ${done ? "bg-neon" : "bg-neon/70"}`} style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                total === p ? "border-neon bg-neon/10 text-neon" : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {p < 60 ? `${p}s` : `${p / 60}m`}
            </button>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const n = parseInt(custom);
              if (!isNaN(n) && n > 0) {
                setPreset(n);
                setCustom("");
              }
            }}
            className="flex items-center gap-1"
          >
            <input
              type="number"
              min={5}
              max={900}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="custom"
              className="w-20 rounded-md border border-input bg-background px-2 py-1 text-xs"
            />
            <button type="submit" className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
              Set
            </button>
          </form>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            onClick={() => setPaused((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:bg-secondary"
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={() => setPreset(total)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:bg-secondary"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
          <button
            onClick={() => { setRemaining(0); onClose?.(); }}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <SkipForward className="h-3.5 w-3.5" /> Skip
          </button>
        </div>
      </div>
    </div>
  );
}
