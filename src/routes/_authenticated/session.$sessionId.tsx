import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Check, Plus, Trash2, ArrowLeft, Square, Trophy, AlertTriangle, Youtube,
  Timer as TimerIcon, Clock, X,
} from "lucide-react";
import {
  addSetToSession, detectAndRecordPRs, endSession,
  fetchPreviousSets, demoSearchUrl, type NewPR,
} from "@/lib/workout-helpers";
import { RestTimer } from "@/components/RestTimer";
import { ALL_EXERCISES } from "@/lib/exercises";

export const Route = createFileRoute("/_authenticated/session/$sessionId")({
  head: ({ params }) => ({
    meta: [
      { title: "Active Workout — Your Fitness Friend" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: `https://your-fit-buddy-07.lovable.app/session/${params.sessionId}` }],
  }),
  component: SessionPage,
});

interface SetRow {
  id: string;
  exercise_name: string;
  muscle_group: string | null;
  set_index: number;
  weight_kg: number | null;
  reps: number | null;
  completed: boolean;
}

interface SessionRow {
  id: string;
  name: string;
  started_at: string;
  ended_at: string | null;
  duration_sec: number | null;
}

function SessionPage() {
  const { sessionId } = Route.useParams();
  const qc = useQueryClient();
  const router = useRouter();
  const [restSec, setRestSec] = useState<number | null>(null);
  const [restKey, setRestKey] = useState(0);
  const [celebratingPR, setCelebratingPR] = useState<NewPR[] | null>(null);
  const [showSummary, setShowSummary] = useState<null | Awaited<ReturnType<typeof endSession>>>(null);
  const [pickExercise, setPickExercise] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const { data: session } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      const { data } = await supabase
        .from("workout_sessions").select("*").eq("id", sessionId).single();
      return data as unknown as SessionRow | null;
    },
  });

  const { data: sets } = useQuery({
    queryKey: ["session-sets", sessionId],
    queryFn: async () => {
      const { data } = await supabase
        .from("workout_sets").select("*").eq("session_id", sessionId).order("set_index");
      return (data ?? []) as unknown as SetRow[];
    },
    refetchInterval: 0,
  });

  const { data: lowScores } = useQuery({
    queryKey: ["recent-low-scores"],
    queryFn: async () => {
      const { data } = await supabase
        .from("form_scores")
        .select("exercise_name, score, indicator, created_at, mistakes")
        .order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  // Group sets by exercise (preserving insertion order)
  const grouped = useMemo(() => {
    const map = new Map<string, SetRow[]>();
    for (const s of sets ?? []) {
      const arr = map.get(s.exercise_name) ?? [];
      arr.push(s);
      map.set(s.exercise_name, arr);
    }
    return Array.from(map.entries());
  }, [sets]);

  // Previous-session sets for comparison, per exercise
  const { data: previousByExercise } = useQuery({
    queryKey: ["session-previous", sessionId, grouped.map(([n]) => n).join("|")],
    enabled: grouped.length > 0,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {} as Record<string, { weight_kg: number | null; reps: number | null; set_index: number }[]>;
      const result: Record<string, { weight_kg: number | null; reps: number | null; set_index: number }[]> = {};
      await Promise.all(grouped.map(async ([name]) => {
        result[name] = await fetchPreviousSets({ userId: user.id, exerciseName: name, beforeSessionId: sessionId });
      }));
      return result;
    },
  });

  const startRest = (s: number) => { setRestSec(s); setRestKey((k) => k + 1); };

  const updateSet = async (id: string, patch: Partial<SetRow>) => {
    await supabase.from("workout_sets").update(patch as any).eq("id", id);
    qc.invalidateQueries({ queryKey: ["session-sets", sessionId] });
  };

  const toggleComplete = async (s: SetRow) => {
    const willComplete = !s.completed;
    await supabase.from("workout_sets").update({ completed: willComplete }).eq("id", s.id);
    qc.invalidateQueries({ queryKey: ["session-sets", sessionId] });

    if (willComplete) {
      startRest(90);
      // PR detection
      const { data: { user } } = await supabase.auth.getUser();
      if (user && (s.weight_kg || s.reps)) {
        const prs = await detectAndRecordPRs({
          userId: user.id,
          exerciseName: s.exercise_name,
          weight: s.weight_kg,
          reps: s.reps,
          sessionId,
          setId: s.id,
        });
        if (prs.length > 0) {
          setCelebratingPR(prs);
          toast.success(`🏆 New PR on ${s.exercise_name}!`);
          qc.invalidateQueries({ queryKey: ["personal-records"] });
        }
      }
    }
  };

  const removeSet = async (id: string) => {
    await supabase.from("workout_sets").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["session-sets", sessionId] });
  };

  const addSet = async (exerciseName: string, muscle: string | null) => {
    const currentSets = (sets ?? []).filter((x) => x.exercise_name === exerciseName);
    const next = currentSets.length + 1;
    // Carry over previous set's weight/reps as a default
    const last = currentSets[currentSets.length - 1];
    await addSetToSession({
      sessionId,
      exerciseName,
      muscleGroup: muscle ?? undefined,
      setIndex: next,
      weight: last?.weight_kg ?? null,
      reps: last?.reps ?? null,
    });
    qc.invalidateQueries({ queryKey: ["session-sets", sessionId] });
  };

  const addExercise = async () => {
    if (!pickExercise) return;
    const ex = ALL_EXERCISES.find((e) => e.name === pickExercise);
    await addSetToSession({
      sessionId,
      exerciseName: pickExercise,
      muscleGroup: ex?.muscle ?? "Full Body",
      setIndex: 1,
    });
    setPickExercise("");
    qc.invalidateQueries({ queryKey: ["session-sets", sessionId] });
  };

  const finishWorkout = async () => {
    const summary = await endSession(sessionId);
    setShowSummary(summary);
    qc.invalidateQueries({ queryKey: ["sessions-history"] });
    qc.invalidateQueries({ queryKey: ["workouts-dashboard"] });
  };

  if (!session) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const startedAt = new Date(session.started_at).getTime();
  const elapsed = session.ended_at
    ? (session.duration_sec ?? 0) * 1000
    : Math.max(0, now - startedAt);
  const elapsedMin = Math.floor(elapsed / 60000);
  const elapsedSec = Math.floor((elapsed % 60000) / 1000);

  const completedSets = (sets ?? []).filter((s) => s.completed);
  const totalVolume = completedSets.reduce((a, s) => a + (s.reps ?? 0) * (Number(s.weight_kg) || 0), 0);

  // Injury prevention warnings: aggregate low form scores from recent sessions
  const warnings = warningsFromScores(lowScores ?? [], grouped.map(([n]) => n));

  return (
    <div className="space-y-5 pb-32">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/workouts" className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{session.name}</h1>
            <p className="text-xs text-muted-foreground">
              Started {new Date(session.started_at).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm tabular-nums">
            <Clock className="h-4 w-4 text-neon" />
            {elapsedMin}:{elapsedSec.toString().padStart(2, "0")}
          </div>
          {!session.ended_at ? (
            <button onClick={finishWorkout} className="neon-btn inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm">
              <Square className="h-3.5 w-3.5" /> Finish workout
            </button>
          ) : (
            <span className="rounded-full border border-neon/40 bg-neon/10 px-3 py-1 text-xs text-neon">Completed</span>
          )}
        </div>
      </div>

      {/* Live stats strip */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-3 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Sets done</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{completedSets.length}<span className="text-sm text-muted-foreground">/{sets?.length ?? 0}</span></p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Exercises</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{grouped.length}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Volume</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{Math.round(totalVolume)}<span className="text-sm text-muted-foreground"> kg</span></p>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-300">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-widest">
            <AlertTriangle className="h-3.5 w-3.5" /> Injury prevention
          </div>
          <ul className="space-y-1 text-sm">
            {warnings.map((w, i) => <li key={i}>• {w}</li>)}
          </ul>
        </div>
      )}

      {/* Exercises */}
      <div className="space-y-4">
        {grouped.length === 0 && (
          <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No exercises yet. Add your first exercise below.
          </p>
        )}
        {grouped.map(([exerciseName, exerciseSets]) => {
          const muscle = exerciseSets[0]?.muscle_group ?? null;
          const prev = previousByExercise?.[exerciseName] ?? [];
          return (
            <div key={exerciseName} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold tracking-tight">{exerciseName}</h3>
                  <p className="text-xs text-muted-foreground">{muscle}</p>
                </div>
                <a
                  href={demoSearchUrl(exerciseName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground hover:text-red-400"
                >
                  <Youtube className="h-3.5 w-3.5" /> Demo
                </a>
              </div>

              {/* Header row */}
              <div className="mt-4 grid grid-cols-[28px_1fr_1fr_1fr_36px_36px] gap-2 px-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                <span>Set</span>
                <span>Previous</span>
                <span>Weight kg</span>
                <span>Reps</span>
                <span></span>
                <span></span>
              </div>
              <ul className="mt-1 space-y-1.5">
                {exerciseSets.map((s, i) => {
                  const p = prev[i];
                  const prevText = p
                    ? `${p.weight_kg ?? "—"}kg × ${p.reps ?? "—"}`
                    : "—";
                  return (
                    <li
                      key={s.id}
                      className={`grid grid-cols-[28px_1fr_1fr_1fr_36px_36px] items-center gap-2 rounded-lg border px-1.5 py-2 text-sm transition-colors ${
                        s.completed ? "border-neon/40 bg-neon/5" : "border-border bg-background/50"
                      }`}
                    >
                      <span className="text-center text-xs font-semibold text-muted-foreground">{s.set_index}</span>
                      <span className="truncate text-xs text-muted-foreground">{prevText}</span>
                      <input
                        type="number" inputMode="decimal" min={0} step={0.5}
                        value={s.weight_kg ?? ""}
                        onChange={(e) => updateSet(s.id, { weight_kg: e.target.value === "" ? null : Number(e.target.value) })}
                        placeholder="0"
                        className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm tabular-nums"
                      />
                      <input
                        type="number" inputMode="numeric" min={0}
                        value={s.reps ?? ""}
                        onChange={(e) => updateSet(s.id, { reps: e.target.value === "" ? null : Number(e.target.value) })}
                        placeholder="0"
                        className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm tabular-nums"
                      />
                      <button
                        onClick={() => toggleComplete(s)}
                        aria-label={s.completed ? "Mark incomplete" : "Mark complete"}
                        className={`grid h-8 w-8 place-items-center rounded-md border transition-colors ${
                          s.completed ? "border-neon bg-neon text-neon-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeSet(s.id)}
                        aria-label="Delete set"
                        className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <button
                onClick={() => addSet(exerciseName, muscle)}
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-background py-2 text-xs text-muted-foreground hover:border-neon/40 hover:text-neon"
              >
                <Plus className="h-3.5 w-3.5" /> Add set
              </button>
            </div>
          );
        })}
      </div>

      {/* Add exercise */}
      {!session.ended_at && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">Add exercise</p>
          <div className="flex gap-2">
            <select
              value={pickExercise}
              onChange={(e) => setPickExercise(e.target.value)}
              className="flex-1 rounded-md border border-input bg-background px-2 py-2 text-sm"
            >
              <option value="">Choose an exercise…</option>
              {ALL_EXERCISES.map((e) => (
                <option key={e.name} value={e.name}>{e.name} — {e.muscle}</option>
              ))}
            </select>
            <button onClick={addExercise} className="neon-btn rounded-md px-4 py-2 text-sm">Add</button>
          </div>
        </div>
      )}

      {/* Quick rest timer buttons (also auto-triggered on set complete) */}
      {!session.ended_at && (
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-border bg-card p-3">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><TimerIcon className="h-3.5 w-3.5" /> Rest:</span>
          {[30, 60, 90, 120].map((s) => (
            <button key={s} onClick={() => startRest(s)} className="rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-neon/40 hover:text-neon">
              {s < 60 ? `${s}s` : `${s / 60}m`}
            </button>
          ))}
        </div>
      )}

      {restSec !== null && (
        <RestTimer
          key={restKey}
          seconds={restSec}
          onClose={() => setRestSec(null)}
        />
      )}

      {celebratingPR && <PRCelebration prs={celebratingPR} onClose={() => setCelebratingPR(null)} />}
      {showSummary && (
        <SummaryModal summary={showSummary} sessionId={sessionId} onClose={() => { setShowSummary(null); router.navigate({ to: "/workouts" }); }} />
      )}
    </div>
  );
}

function warningsFromScores(scores: any[], currentExercises: string[]): string[] {
  const out: string[] = [];
  for (const name of currentExercises) {
    const recent = scores.filter((s) => s.exercise_name === name).slice(0, 4);
    if (recent.length >= 2) {
      const avg = recent.reduce((a, s) => a + (s.score ?? 0), 0) / recent.length;
      const reds = recent.filter((s) => s.indicator === "red").length;
      if (avg < 55 || reds >= 2) {
        out.push(`${name}: form scores trending low. Lower the weight and focus on control.`);
      }
    }
  }
  if (out.length === 0 && scores.length > 0) {
    // surface a global cue from latest red mistake
    const red = scores.find((s) => s.indicator === "red" && Array.isArray(s.mistakes) && s.mistakes.length > 0);
    if (red?.mistakes?.[0]) {
      out.push(`Last session flagged: "${red.mistakes[0].cue}" on ${red.exercise_name}. Watch your ${red.mistakes[0].bodyPart}.`);
    }
  }
  return out.slice(0, 3);
}

function PRCelebration({ prs, onClose }: { prs: NewPR[]; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center p-6">
      <div className="pointer-events-auto animate-in fade-in slide-in-from-top-4 rounded-2xl border border-neon bg-card p-5 shadow-2xl ring-2 ring-neon/40">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 animate-pulse place-items-center rounded-xl bg-neon/15 ring-1 ring-neon/40">
            <Trophy className="h-6 w-6 text-neon" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-neon">New personal record</p>
            <p className="font-semibold">{prs[0].exercise_name}</p>
            <p className="text-xs text-muted-foreground">
              {prs.map((p) => prLabel(p)).join(" · ")}
            </p>
          </div>
          <button onClick={onClose} className="ml-2 rounded-full p-1 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}

function prLabel(p: NewPR) {
  if (p.record_type === "heaviest_weight") return `Heaviest ${p.weight_kg}kg`;
  if (p.record_type === "max_reps") return `Most reps ${p.reps}`;
  return `Volume ${Math.round(p.value)}kg`;
}

function SummaryModal({
  summary, sessionId, onClose,
}: { summary: { durationSec: number; exercises: number; totalSets: number; totalReps: number; totalVolume: number }; sessionId: string; onClose: () => void }) {
  const { data: prs } = useQuery({
    queryKey: ["session-prs", sessionId],
    queryFn: async () => {
      const { data } = await supabase.from("personal_records").select("*").eq("session_id", sessionId);
      return data ?? [];
    },
  });
  const { data: avgScore } = useQuery({
    queryKey: ["recent-form-avg"],
    queryFn: async () => {
      const { data } = await supabase.from("form_scores").select("score").order("created_at", { ascending: false }).limit(10);
      if (!data?.length) return null;
      return Math.round(data.reduce((a, s) => a + (s.score ?? 0), 0) / data.length);
    },
  });
  const min = Math.floor(summary.durationSec / 60);
  const sec = summary.durationSec % 60;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-neon/40 bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-neon/15 ring-1 ring-neon/40">
            <Trophy className="h-7 w-7 text-neon" />
          </div>
          <h2 className="mt-3 text-2xl font-bold">Workout complete</h2>
          <p className="text-sm text-muted-foreground">Nice work — here's how you did.</p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 text-center">
          <SummaryStat label="Duration" value={`${min}:${sec.toString().padStart(2, "0")}`} />
          <SummaryStat label="Exercises" value={String(summary.exercises)} />
          <SummaryStat label="Sets" value={String(summary.totalSets)} />
          <SummaryStat label="Reps" value={String(summary.totalReps)} />
          <SummaryStat label="Volume" value={`${Math.round(summary.totalVolume)} kg`} />
          <SummaryStat label="Avg form" value={avgScore != null ? String(avgScore) : "—"} />
        </div>
        {prs && prs.length > 0 && (
          <div className="mt-4 rounded-xl border border-neon/40 bg-neon/5 p-3">
            <p className="text-xs font-medium uppercase tracking-widest text-neon">{prs.length} new PR{prs.length > 1 ? "s" : ""}</p>
            <ul className="mt-1 space-y-1 text-sm">
              {prs.slice(0, 5).map((p: any) => (
                <li key={p.id}>🏆 {p.exercise_name} — {prLabel(p as NewPR)}</li>
              ))}
            </ul>
          </div>
        )}
        <button onClick={onClose} className="neon-btn mt-5 w-full rounded-md py-2.5 text-sm">Done</button>
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
