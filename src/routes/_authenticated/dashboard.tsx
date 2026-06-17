import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity, Camera, TrendingUp, Trophy, Flame, Play, ArrowRight, Calendar,
} from "lucide-react";
import { computeFitnessLevel, LEVEL_LABEL } from "@/lib/fitness-level";
import { EXERCISES, MUSCLE_GROUPS } from "@/lib/exercises";
import { currentStreak, dailyActivity, weeklyConsistency, type WorkoutRow } from "@/lib/analytics";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Your Fitness Friend" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const { data: workouts } = useQuery({
    queryKey: ["workouts-dashboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("workouts").select("*").order("created_at", { ascending: false }).limit(60);
      return (data ?? []) as WorkoutRow[];
    },
  });

  const { data: scores } = useQuery({
    queryKey: ["scores-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("form_scores").select("*").order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const rows = workouts ?? [];
  const avgScore = useMemo(() => {
    if (!scores || scores.length === 0) return null;
    return Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length);
  }, [scores]);

  const level = computeFitnessLevel({ avgScore, workoutCount: rows.length });
  const latestScore = scores?.[0];
  const streak = currentStreak(rows);
  const weekly = weeklyConsistency(rows);
  const last7 = dailyActivity(rows, 7);
  const lastWorkout = rows[0];

  // pick today's recommended muscle group rotating daily
  const recMuscle = useMemo(() => MUSCLE_GROUPS[new Date().getDay() % MUSCLE_GROUPS.length], []);
  const recommendations = EXERCISES[recMuscle].slice(0, 3);

  const firstName = (profile?.name ?? "Athlete").split(" ")[0];

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{greeting()}, welcome back</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">{firstName}</h1>
        </div>
        <span className="rounded-full border border-neon/30 bg-neon/10 px-3 py-1 text-xs font-medium text-neon">
          {LEVEL_LABEL[level]}
        </span>
      </div>

      {/* Top stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={Flame}
          label="Workout Streak"
          value={`${streak}`}
          sub={streak === 0 ? "Start one today" : streak === 1 ? "day · keep going" : "days in a row"}
          accent
        />
        <StatCard
          icon={Calendar}
          label="Weekly Progress"
          value={`${weekly}%`}
          sub="Active days · last 7"
        />
        <StatCard
          icon={TrendingUp}
          label="Latest Form"
          value={latestScore ? `${latestScore.score}` : "—"}
          sub={latestScore?.exercise_name ?? "Run a Form Coach session"}
        />
        <StatCard
          icon={Trophy}
          label="Total Workouts"
          value={`${rows.length}`}
          sub={avgScore ? `Avg form ${avgScore}` : "Log your first set"}
        />
      </div>

      {/* Today + Quick Start */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-neon">Today's Workout</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">{recMuscle} day</h2>
            </div>
            <Link
              to="/workouts"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              All workouts <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {recommendations.map((ex) => (
              <div key={ex.name} className="card-hover rounded-xl border border-border bg-background/40 p-4">
                <h3 className="text-sm font-semibold tracking-tight">{ex.name}</h3>
                <p className="mt-1 text-xs text-neon">{ex.sets} × {ex.reps}</p>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{ex.tip}</p>
              </div>
            ))}
          </div>
        </div>

        <Link
          to="/analyze"
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-neon/30 bg-card p-6 transition-all hover:border-neon/60"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-neon/10 via-transparent to-transparent" />
          <div className="relative">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-neon/15 ring-1 ring-neon/30">
              <Camera className="h-5 w-5 text-neon" />
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-tight">Form Analysis</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Turn on your camera. Get instant feedback every few seconds.
            </p>
          </div>
          <span className="relative mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-neon">
            <Play className="h-3.5 w-3.5" /> Start session
          </span>
        </Link>
      </section>

      {/* Quick Start + Recent */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Quick Start</h2>
            <Link to="/exercises" className="text-xs text-muted-foreground hover:text-foreground">Browse all →</Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {MUSCLE_GROUPS.slice(0, 6).map((m) => (
              <Link
                key={m}
                to="/workouts"
                className="card-hover rounded-lg border border-border bg-background/40 p-3 text-center text-sm font-medium hover:text-neon"
              >
                {m}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Recent Workout</h2>
            <Link to="/workouts" className="text-xs text-muted-foreground hover:text-foreground">History →</Link>
          </div>
          {lastWorkout ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-background/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{lastWorkout.exercise_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {lastWorkout.muscle_group} · {new Date(lastWorkout.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-sm text-neon">
                    {lastWorkout.sets}×{lastWorkout.reps}{lastWorkout.weight_kg ? ` · ${lastWorkout.weight_kg}kg` : ""}
                  </span>
                </div>
              </div>
              {/* 7-day mini bar */}
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Last 7 days</p>
                <div className="flex h-12 items-end gap-1">
                  {last7.map((d, i) => {
                    const max = Math.max(...last7.map((x) => x.sets), 1);
                    const h = d.sets > 0 ? Math.max(8, (d.sets / max) * 100) : 6;
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-sm ${d.sets > 0 ? "bg-neon/80" : "bg-secondary"}`}
                        style={{ height: `${h}%` }}
                        title={`${d.date}: ${d.sets} sets`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No workouts yet.{" "}
              <Link to="/workouts" className="text-neon hover:underline">Log your first set →</Link>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, sub, accent,
}: { icon: React.ElementType; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`card-hover rounded-2xl border bg-card p-5 ${accent ? "border-neon/30" : "border-border"}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent ? "text-neon" : "text-muted-foreground"}`} />
      </div>
      <p className={`text-3xl font-bold tracking-tight ${accent ? "text-neon" : ""}`}>{value}</p>
      {sub && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
