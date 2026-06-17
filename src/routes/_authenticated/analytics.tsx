import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  caloriesForWorkout,
  currentStreak,
  dailyActivity,
  muscleStats,
  mostTrained,
  recoveryScore,
  totalCalories,
  totalTrainingMinutes,
  totalVolume,
  undertrained,
  weeklyConsistency,
  type WorkoutRow,
} from "@/lib/analytics";
import { MuscleHeatmap } from "@/components/MuscleHeatmap";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Activity, Flame, Heart, Timer, TrendingUp, Trophy, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Your Fitness Friend" }] }),
  component: AnalyticsPage,
});

const RECOVERY_STYLES: Record<string, { color: string; bg: string }> = {
  rested: { color: "text-emerald-400", bg: "border-emerald-400/40 bg-emerald-500/10" },
  ready: { color: "text-neon", bg: "border-neon/40 bg-neon/10" },
  fatigued: { color: "text-amber-400", bg: "border-amber-400/40 bg-amber-500/10" },
  overtraining: { color: "text-red-400", bg: "border-red-500/40 bg-red-500/10" },
};

function AnalyticsPage() {
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
    queryKey: ["workouts-analytics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("workouts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      return (data ?? []) as WorkoutRow[];
    },
  });

  const rows = workouts ?? [];
  const bodyweight = profile?.weight_kg ?? null;

  const stats = muscleStats(rows);
  const recovery = recoveryScore(rows);
  const recStyle = RECOVERY_STYLES[recovery.status];
  const weekly = weeklyConsistency(rows);
  const streak = currentStreak(rows);
  const totalCal = totalCalories(rows, bodyweight);
  const totalMin = Math.round(totalTrainingMinutes(rows));
  const volume = totalVolume(rows);

  const last14 = dailyActivity(rows, 14).map((d) => ({
    day: d.date.slice(5),
    sets: d.sets,
  }));

  const muscleBars = stats.map((s) => ({ muscle: s.muscle, sets: s.sets }));
  const weak = undertrained(stats);
  const heavy = mostTrained(stats);

  // last set's calorie estimate as a hint
  const lastWorkout = rows[0];
  const lastCalories = lastWorkout ? caloriesForWorkout(lastWorkout, bodyweight) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl tracking-wider">
          TRAINING <span className="neon-text">ANALYTICS</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Volume, consistency, muscle balance, and recovery — all in one place.
        </p>
      </div>

      {/* Stat grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Stat icon={Activity} label="Total Workouts" value={String(rows.length)} sub={`${totalMin} min trained`} />
        <Stat icon={Flame} label="Calories Burned" value={`${totalCal}`} sub={lastCalories ? `Last set ~${lastCalories} kcal` : "Log weight for accuracy"} />
        <Stat icon={TrendingUp} label="Weekly Consistency" value={`${weekly}%`} sub="Active days / 7" accent />
        <Stat icon={Trophy} label="Current Streak" value={`${streak}d`} sub="Keep it going" accent />
      </div>

      {/* Recovery */}
      <section className={`rounded-xl border p-6 ${recStyle.bg}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Recovery Score</p>
            <p className={`mt-1 font-display text-5xl ${recStyle.color}`}>{recovery.score}</p>
            <p className={`mt-1 font-display text-sm uppercase tracking-widest ${recStyle.color}`}>
              {recovery.status}
            </p>
          </div>
          <Heart className={`h-10 w-10 ${recStyle.color}`} />
        </div>
        <p className="mt-3 text-sm">{recovery.message}</p>
        {recovery.status === "overtraining" && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            <AlertTriangle className="h-4 w-4" />
            Suggested: rest 24–48h or do light mobility work.
          </div>
        )}
      </section>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Training Volume — Last 14 Days" icon={Timer}>
          {last14.some((d) => d.sets > 0) ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last14}>
                  <CartesianGrid stroke="oklch(0.28 0.006 240)" strokeDasharray="3 3" />
                  <XAxis dataKey="day" stroke="oklch(0.68 0.01 240)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="oklch(0.68 0.01 240)" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.21 0.006 240)",
                      border: "1px solid oklch(0.28 0.006 240)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="sets" fill="oklch(0.86 0.22 140)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Log some workouts to see your trend.</p>
          )}
        </ChartCard>

        <ChartCard title="Sets per Muscle Group" icon={Activity}>
          {muscleBars.some((b) => b.sets > 0) ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={muscleBars} layout="vertical">
                  <CartesianGrid stroke="oklch(0.28 0.006 240)" strokeDasharray="3 3" />
                  <XAxis type="number" stroke="oklch(0.68 0.01 240)" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="muscle" type="category" stroke="oklch(0.68 0.01 240)" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.21 0.006 240)",
                      border: "1px solid oklch(0.28 0.006 240)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="sets" fill="oklch(0.86 0.22 140)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No sets recorded yet.</p>
          )}
        </ChartCard>
      </div>

      {/* Heatmap */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 font-display text-2xl tracking-wide">Muscle Heatmap</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Brighter = more sets trained. Use this to balance your weekly split.
        </p>
        <MuscleHeatmap stats={stats} />
      </section>

      {/* Balance */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Most Trained</p>
          <ul className="mt-2 space-y-2">
            {heavy.map((s) => (
              <li key={s.muscle} className="flex items-center justify-between rounded-md bg-background/50 px-3 py-2">
                <span className="font-medium">{s.muscle}</span>
                <span className="text-sm text-neon">{s.sets} sets · {s.sessions} sessions</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-6">
          <p className="text-xs uppercase tracking-widest text-amber-400">Undertrained — give these focus</p>
          <ul className="mt-2 space-y-2">
            {weak.map((s) => (
              <li key={s.muscle} className="flex items-center justify-between rounded-md bg-background/50 px-3 py-2">
                <span className="font-medium">{s.muscle}</span>
                <span className="text-sm text-amber-400">{s.sets} sets</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {volume > 0 && (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Lifetime training volume:{" "}
          <span className="neon-text font-display text-lg">
            {Math.round(volume).toLocaleString()} kg
          </span>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon, label, value, sub, accent,
}: { icon: React.ElementType; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border bg-card p-5 ${accent ? "border-neon/40" : "border-border"}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className={`h-5 w-5 ${accent ? "text-neon" : "text-muted-foreground"}`} />
      </div>
      <p className={`font-display text-3xl ${accent ? "neon-text" : ""}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-neon" />
        <h2 className="font-display text-lg tracking-wide">{title}</h2>
      </div>
      {children}
    </div>
  );
}
