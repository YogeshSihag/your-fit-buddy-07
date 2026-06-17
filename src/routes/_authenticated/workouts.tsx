import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EXERCISES, MUSCLE_GROUPS, type MuscleGroup } from "@/lib/exercises";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workouts")({
  head: () => ({
    meta: [
      { title: "Workouts — Your Fitness Friend" },
      {
        name: "description",
        content:
          "Log sets, reps, and weight across 150+ exercises. Build your workout history and fuel your progress analytics.",
      },
      { property: "og:title", content: "Workouts — Your Fitness Friend" },
      { property: "og:description", content: "Log sets, reps and weight for 150+ exercises and build your training history." },
      { property: "og:url", content: "https://your-fit-buddy-07.lovable.app/workouts" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://your-fit-buddy-07.lovable.app/workouts" }],
  }),
  component: WorkoutsPage,
});

function WorkoutsPage() {
  const [active, setActive] = useState<MuscleGroup>("Chest");
  const [weights, setWeights] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  const { data: history } = useQuery({
    queryKey: ["workouts-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("workouts").select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const logWorkout = async (ex: { name: string; sets: number; reps: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const repsNum = parseInt(ex.reps) || 0;
    const weightStr = weights[ex.name];
    const weightNum = weightStr ? parseFloat(weightStr) : null;
    const { error } = await supabase.from("workouts").insert({
      user_id: user.id,
      muscle_group: active,
      exercise_name: ex.name,
      sets: ex.sets,
      reps: repsNum,
      weight_kg: weightNum && weightNum > 0 ? weightNum : null,
      duration_min: Math.round(ex.sets * 0.75),
    });
    if (error) {
      console.error("Workout insert error:", error);
      toast.error("Failed to log workout. Please try again.");
    } else {
      toast.success(`Logged ${ex.name}${weightNum ? ` @ ${weightNum}kg` : ""}`);
      qc.invalidateQueries({ queryKey: ["workouts-all"] });
      qc.invalidateQueries({ queryKey: ["workouts-recent"] });
      qc.invalidateQueries({ queryKey: ["workouts-count"] });
      qc.invalidateQueries({ queryKey: ["workouts-analytics"] });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl tracking-wider">WORKOUTS</h1>
        <p className="text-sm text-muted-foreground">Pick a muscle group, add weight (optional), and log your sets.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {MUSCLE_GROUPS.map((m) => (
          <button
            key={m}
            onClick={() => setActive(m)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              active === m
                ? "border-neon bg-neon/10 text-neon"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {EXERCISES[active].map((ex) => (
          <div key={ex.name} className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-display text-xl tracking-wide">{ex.name}</h3>
            <p className="mt-1 text-neon">{ex.sets} sets × {ex.reps} reps</p>
            <p className="mt-2 text-sm text-muted-foreground">{ex.tip}</p>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                placeholder="Weight kg"
                value={weights[ex.name] ?? ""}
                onChange={(e) => setWeights((w) => ({ ...w, [ex.name]: e.target.value }))}
                className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <span className="text-xs text-muted-foreground">optional</span>
            </div>
            <button
              onClick={() => logWorkout(ex)}
              className="neon-btn mt-3 flex w-full items-center justify-center gap-1 rounded-md py-2 text-sm font-display tracking-wider"
            >
              <Plus className="h-4 w-4" /> LOG WORKOUT
            </button>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-2xl">Workout History</h2>
        {history && history.length > 0 ? (
          <div className="divide-y divide-border/40">
            {history.map((w) => (
              <div key={w.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{w.exercise_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {w.muscle_group} • {new Date(w.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="text-sm text-neon">
                  {w.sets}×{w.reps}{w.weight_kg ? ` @ ${w.weight_kg}kg` : ""}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No history yet — log your first workout above.</p>
        )}
      </section>
    </div>
  );
}
