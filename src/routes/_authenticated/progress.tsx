import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { computeFitnessLevel, LEVEL_LABEL } from "@/lib/fitness-level";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Progress — Your Fitness Friend" },
      {
        name: "description",
        content:
          "Track your form score trends, total workouts, and fitness level progression over time with detailed charts.",
      },
      { property: "og:title", content: "Progress — Your Fitness Friend" },
      { property: "og:description", content: "Form score trends, workout history, and fitness level progression." },
      { property: "og:url", content: "https://your-fit-buddy-07.lovable.app/progress" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://your-fit-buddy-07.lovable.app/progress" }],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const { data: scores } = useQuery({
    queryKey: ["scores-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("form_scores").select("*").order("created_at", { ascending: true }).limit(100);
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

  const avg = scores && scores.length > 0
    ? Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length) : null;
  const level = computeFitnessLevel({ avgScore: avg, workoutCount: workoutCount ?? 0 });

  const chartData = (scores ?? []).map((s, i) => ({
    i: i + 1,
    score: s.score,
    date: new Date(s.created_at).toLocaleDateString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl tracking-wider">PROGRESS</h1>
        <p className="text-sm text-muted-foreground">Your training over time.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-neon/40 bg-card p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Current Level</p>
          <p className="neon-text mt-2 font-display text-3xl">{LEVEL_LABEL[level]}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Avg Form Score</p>
          <p className="mt-2 font-display text-3xl">{avg ?? "—"}<span className="text-lg text-muted-foreground">/100</span></p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Total Workouts</p>
          <p className="mt-2 font-display text-3xl">{workoutCount ?? 0}</p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-xl">Form Score Over Time</h2>
        {chartData.length > 1 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="oklch(0.28 0.006 240)" strokeDasharray="3 3" />
                <XAxis dataKey="i" stroke="oklch(0.68 0.01 240)" />
                <YAxis domain={[0, 100]} stroke="oklch(0.68 0.01 240)" />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.21 0.006 240)",
                    border: "1px solid oklch(0.28 0.006 240)",
                    borderRadius: 8,
                  }}
                />
                <Line type="monotone" dataKey="score" stroke="oklch(0.86 0.22 140)" strokeWidth={2} dot={{ fill: "oklch(0.86 0.22 140)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Not enough data yet. Run a Form Coach session to start tracking your progress.
          </p>
        )}
      </section>
    </div>
  );
}
