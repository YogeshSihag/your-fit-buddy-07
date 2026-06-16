import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EXERCISES, MUSCLE_GROUPS, type MuscleGroup } from "@/lib/exercises";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workouts")({
  head: () => ({ meta: [{ title: "Workouts — Your Fitness Friend" }] }),
  component: WorkoutsPage,
});

function WorkoutsPage() {
  const [active, setActive] = useState<MuscleGroup>("Chest");
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
    const { error } = await supabase.from("workouts").insert({
      user_id: user.id,
      muscle_group: active,
      exercise_name: ex.name,
      sets: ex.sets,
      reps: repsNum,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(`Logged ${ex.name}`);
      qc.invalidateQueries({ queryKey: ["workouts-all"] });
      qc.invalidateQueries({ queryKey: ["workouts-recent"] });
      qc.invalidateQueries({ queryKey: ["workouts-count"] });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl tracking-wider">WORKOUTS</h1>
        <p className="text-sm text-muted-foreground">Pick a muscle group and log your sets.</p>
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
            <button
              onClick={() => logWorkout(ex)}
              className="neon-btn mt-4 flex w-full items-center justify-center gap-1 rounded-md py-2 text-sm font-display tracking-wider"
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
                <span className="text-sm text-neon">{w.sets}×{w.reps}</span>
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
