import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, TrendingUp, Calendar, ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/records")({
  head: () => ({
    meta: [
      { title: "Personal Records — Your Fitness Friend" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RecordsPage,
});

interface PR {
  id: string;
  exercise_name: string;
  record_type: "heaviest_weight" | "max_reps" | "max_volume";
  value: number;
  weight_kg: number | null;
  reps: number | null;
  achieved_at: string;
}

const TYPE_LABEL: Record<PR["record_type"], string> = {
  heaviest_weight: "Heaviest weight",
  max_reps: "Most reps",
  max_volume: "Max volume",
};

function RecordsPage() {
  const [selected, setSelected] = useState<string | null>(null);

  const { data: prs } = useQuery({
    queryKey: ["personal-records"],
    queryFn: async () => {
      const { data } = await supabase
        .from("personal_records")
        .select("*")
        .order("achieved_at", { ascending: false });
      return (data ?? []) as unknown as PR[];
    },
  });

  // Latest PR per (exercise, type)
  const latest = useMemo(() => {
    const map = new Map<string, PR>();
    for (const p of prs ?? []) {
      const key = `${p.exercise_name}::${p.record_type}`;
      const existing = map.get(key);
      if (!existing || p.value > existing.value) map.set(key, p);
    }
    return Array.from(map.values()).sort((a, b) => a.exercise_name.localeCompare(b.exercise_name));
  }, [prs]);

  // Group latest by exercise
  const byExercise = useMemo(() => {
    const m = new Map<string, PR[]>();
    for (const p of latest) {
      const arr = m.get(p.exercise_name) ?? [];
      arr.push(p);
      m.set(p.exercise_name, arr);
    }
    return Array.from(m.entries());
  }, [latest]);

  // Progression history for selected
  const history = useMemo(() => {
    if (!selected) return [];
    return (prs ?? [])
      .filter((p) => p.exercise_name === selected)
      .sort((a, b) => new Date(a.achieved_at).getTime() - new Date(b.achieved_at).getTime());
  }, [prs, selected]);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Personal Records</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your heaviest lifts, biggest rep sets, and volume bests — auto-detected.</p>
      </div>

      {byExercise.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No PRs yet. Complete a few sets in <Link to="/workouts" className="text-neon hover:underline">Workouts</Link> to start tracking.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {byExercise.map(([name, exPRs]) => (
            <button
              key={name}
              onClick={() => setSelected(name)}
              className="card-hover rounded-2xl border border-border bg-card p-5 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-widest text-neon">{name}</p>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight">{exPRs[0].exercise_name}</h3>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-neon/10 ring-1 ring-neon/30">
                  <Trophy className="h-4 w-4 text-neon" />
                </div>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {exPRs.map((p) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{TYPE_LABEL[p.record_type]}</span>
                    <span className="font-semibold tabular-nums">{formatValue(p)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                <TrendingUp className="h-3 w-3" /> View progression
              </p>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm md:items-center" onClick={() => setSelected(null)}>
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight">{selected}</h2>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Progression</p>
            <ul className="space-y-2">
              {history.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3">
                  <div>
                    <p className="text-sm font-medium">{TYPE_LABEL[p.record_type]}</p>
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {new Date(p.achieved_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-neon">{formatValue(p)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function formatValue(p: PR): string {
  if (p.record_type === "heaviest_weight") return `${p.weight_kg ?? p.value} kg × ${p.reps ?? "—"}`;
  if (p.record_type === "max_reps") return `${p.reps ?? p.value} reps${p.weight_kg ? ` @ ${p.weight_kg}kg` : ""}`;
  return `${Math.round(p.value)} kg`;
}
