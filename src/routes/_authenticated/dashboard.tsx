import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Camera, TrendingUp, Trophy } from "lucide-react";
import { computeFitnessLevel, LEVEL_LABEL } from "@/lib/fitness-level";
import { EXERCISES, MUSCLE_GROUPS } from "@/lib/exercises";
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
    queryKey: ["workouts-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("workouts").select("*").order("created_at", { ascending: false }).limit(5);
      return data ?? [];
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

  const { data: workoutCount } = useQuery({
    queryKey: ["workouts-count"],
    queryFn: async () => {
      const { count } = await supabase.from("workouts").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const avgScore = useMemo(() => {
    if (!scores || scores.length === 0) return null;
    return Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length);
  }, [scores]);

  const level = computeFitnessLevel({ avgScore, workoutCount: workoutCount ?? 0 });
  const latestScore = scores?.[0];

  // pick a random muscle group for recommendation
  const recMuscle = useMemo(() => MUSCLE_GROUPS[new Date().getDay() % MUSCLE_GROUPS.length], []);
  const recommendations = EXERCISES[recMuscle];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="font-display text-4xl tracking-wider">
          {profile?.name ?? "Athlete"}
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={Trophy} label="Fitness Level" value={LEVEL_LABEL[level]} accent />
        <StatCard
          icon={TrendingUp}
          label="Latest Form Score"
          value={latestScore ? `${latestScore.score}/100` : "—"}
          sub={latestScore?.exercise_name ?? "Try the Form Coach"}
        />
        <StatCard
          icon={Activity}
          label="Total Workouts"
          value={String(workoutCount ?? 0)}
          sub={`Avg form: ${avgScore ?? "—"}`}
        />
      </div>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl">Today's Pick: {recMuscle}</h2>
          <Link
            to="/workouts"
            className="text-sm text-neon hover:underline"
          >
            All workouts →
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {recommendations.map((ex) => (
            <div key={ex.name} className="rounded-lg border border-border bg-background/50 p-4">
              <h3 className="font-display text-lg tracking-wide">{ex.name}</h3>
              <p className="mt-1 text-sm text-neon">{ex.sets} × {ex.reps}</p>
              <p className="mt-2 text-xs text-muted-foreground">{ex.tip}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-2xl">Recent Workouts</h2>
          {workouts && workouts.length > 0 ? (
            <ul className="space-y-3">
              {workouts.map((w) => (
                <li key={w.id} className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{w.exercise_name}</p>
                    <p className="text-xs text-muted-foreground">{w.muscle_group} • {new Date(w.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm text-neon">{w.sets}×{w.reps}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No workouts yet. Log your first one!</p>
          )}
        </div>

        <Link
          to="/analyze"
          className="group flex flex-col items-start justify-between rounded-xl border border-neon/30 bg-card p-6 transition-all hover:neon-border"
        >
          <Camera className="mb-4 h-8 w-8 text-neon" />
          <div>
            <h2 className="text-2xl">Analyze your form</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Turn on your camera and let our AI coach score your form.
            </p>
          </div>
          <span className="mt-4 font-display tracking-wider text-neon">START SESSION →</span>
        </Link>
      </section>
    </div>
  );
}

function StatCard({
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
