import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Play, Star, Copy, Trash2, History, Clock, Dumbbell, ChevronRight, Sparkles } from "lucide-react";
import {
  startSessionFromTemplate,
  startEmptySession,
  type TemplateExercise,
} from "@/lib/workout-helpers";
import { ALL_EXERCISES } from "@/lib/exercises";

export const Route = createFileRoute("/_authenticated/workouts")({
  head: () => ({
    meta: [
      { title: "Workouts — Your Fitness Friend" },
      { name: "description", content: "Start a workout from a template, track every set with weight and reps, and review your training history." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkoutsPage,
});

interface Template {
  id: string;
  name: string;
  description: string | null;
  is_builtin: boolean;
  is_favorite: boolean;
  exercises: TemplateExercise[];
}

function WorkoutsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"templates" | "history">("templates");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);

  const { data: templates } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("workout_templates")
        .select("*")
        .order("is_builtin", { ascending: true })
        .order("name");
      return (data ?? []) as unknown as Template[];
    },
  });

  const { data: history } = useQuery({
    queryKey: ["sessions-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("workout_sessions")
        .select("id, name, started_at, ended_at, duration_sec, workout_sets(count)")
        .order("started_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  const startTemplate = async (t: Template) => {
    try {
      const id = await startSessionFromTemplate(t);
      router.navigate({ to: "/session/$sessionId", params: { sessionId: id } });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to start");
    }
  };

  const startEmpty = async () => {
    try {
      const id = await startEmptySession();
      router.navigate({ to: "/session/$sessionId", params: { sessionId: id } });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to start");
    }
  };

  const toggleFavorite = async (t: Template) => {
    if (t.is_builtin) {
      // Duplicate built-in as a favorite under user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("workout_templates").insert({
        user_id: user.id,
        name: `${t.name} (Mine)`,
        description: t.description,
        is_favorite: true,
        exercises: t.exercises as any,
      });
      toast.success("Saved a personal copy");
    } else {
      await supabase.from("workout_templates").update({ is_favorite: !t.is_favorite }).eq("id", t.id);
    }
    qc.invalidateQueries({ queryKey: ["templates"] });
  };

  const duplicate = async (t: Template) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("workout_templates").insert({
      user_id: user.id,
      name: `${t.name} (Copy)`,
      description: t.description,
      exercises: t.exercises as any,
    });
    qc.invalidateQueries({ queryKey: ["templates"] });
    toast.success("Duplicated");
  };

  const remove = async (t: Template) => {
    if (t.is_builtin) return;
    if (!confirm(`Delete "${t.name}"?`)) return;
    await supabase.from("workout_templates").delete().eq("id", t.id);
    qc.invalidateQueries({ queryKey: ["templates"] });
  };

  const favorites = (templates ?? []).filter((t) => t.is_favorite);
  const builtins = (templates ?? []).filter((t) => t.is_builtin);
  const userTemplates = (templates ?? []).filter((t) => !t.is_builtin);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Workouts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Templates, set-by-set logging, and your history.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={startEmpty}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-secondary"
          >
            <Sparkles className="h-4 w-4" /> Quick start
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="neon-btn inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm"
          >
            <Plus className="h-4 w-4" /> New template
          </button>
        </div>
      </div>

      <div className="flex w-fit gap-1 rounded-full border border-border bg-card p-1">
        {(["templates", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
              tab === t ? "bg-neon/15 text-neon" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "templates" && (
        <div className="space-y-8">
          {favorites.length > 0 && (
            <Section title="Favorites" icon={<Star className="h-4 w-4 fill-neon text-neon" />}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {favorites.map((t) => (
                  <TemplateCard key={t.id} t={t} onStart={() => startTemplate(t)} onFav={() => toggleFavorite(t)} onDup={() => duplicate(t)} onDel={() => remove(t)} onEdit={() => setEditing(t)} />
                ))}
              </div>
            </Section>
          )}

          <Section title="Built-in Templates" icon={<Dumbbell className="h-4 w-4 text-neon" />}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {builtins.map((t) => (
                <TemplateCard key={t.id} t={t} onStart={() => startTemplate(t)} onFav={() => toggleFavorite(t)} onDup={() => duplicate(t)} onDel={() => remove(t)} onEdit={() => setEditing(t)} />
              ))}
            </div>
          </Section>

          <Section title="My Templates" icon={<Plus className="h-4 w-4 text-neon" />}>
            {userTemplates.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
                No custom templates yet. Duplicate a built-in or create your own.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {userTemplates.map((t) => (
                  <TemplateCard key={t.id} t={t} onStart={() => startTemplate(t)} onFav={() => toggleFavorite(t)} onDup={() => duplicate(t)} onDel={() => remove(t)} onEdit={() => setEditing(t)} />
                ))}
              </div>
            )}
          </Section>
        </div>
      )}

      {tab === "history" && (
        <div className="rounded-2xl border border-border bg-card p-2">
          {(history ?? []).length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">No workouts logged yet.</p>
          )}
          <ul className="divide-y divide-border/40">
            {(history ?? []).map((s: any) => {
              const date = new Date(s.started_at);
              const durMin = s.duration_sec ? Math.round(s.duration_sec / 60) : null;
              const setCount = s.workout_sets?.[0]?.count ?? 0;
              return (
                <li key={s.id}>
                  <Link
                    to="/session/$sessionId"
                    params={{ sessionId: s.id }}
                    className="flex items-center justify-between gap-3 rounded-xl p-4 transition-colors hover:bg-secondary/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {date.toLocaleString()} {durMin ? `· ${durMin} min` : "· in progress"} · {setCount} sets
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {(showCreate || editing) && (
        <TemplateEditor
          initial={editing}
          onClose={() => { setShowCreate(false); setEditing(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["templates"] }); setShowCreate(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}

function TemplateCard({
  t, onStart, onFav, onDup, onDel, onEdit,
}: { t: Template; onStart: () => void; onFav: () => void; onDup: () => void; onDel: () => void; onEdit: () => void }) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-neon/40">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold tracking-tight">{t.name}</h3>
          {t.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>}
        </div>
        <button onClick={onFav} aria-label="Favorite" className={t.is_favorite ? "text-neon" : "text-muted-foreground hover:text-foreground"}>
          <Star className={`h-4 w-4 ${t.is_favorite ? "fill-neon" : ""}`} />
        </button>
      </div>

      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
        {t.exercises.slice(0, 4).map((e, i) => (
          <li key={i} className="truncate">• {e.exercise_name} <span className="text-foreground/70">— {e.sets} × {e.reps}</span></li>
        ))}
        {t.exercises.length > 4 && <li className="text-foreground/60">+ {t.exercises.length - 4} more</li>}
      </ul>

      <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-3">
        <button onClick={onStart} className="neon-btn inline-flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs">
          <Play className="h-3.5 w-3.5" /> Start
        </button>
        <button onClick={onDup} aria-label="Duplicate" className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:text-foreground">
          <Copy className="h-3.5 w-3.5" />
        </button>
        {!t.is_builtin && (
          <>
            <button onClick={onEdit} aria-label="Edit" className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground">
              Edit
            </button>
            <button onClick={onDel} aria-label="Delete" className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:text-red-400">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function TemplateEditor({
  initial, onClose, onSaved,
}: { initial: Template | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [exercises, setExercises] = useState<TemplateExercise[]>(initial?.exercises ?? []);
  const [pick, setPick] = useState("");

  const add = () => {
    if (!pick) return;
    const ex = ALL_EXERCISES.find((e) => e.name === pick);
    setExercises((arr) => [...arr, {
      exercise_name: pick,
      muscle_group: ex?.muscle ?? "Full Body",
      sets: ex?.sets ?? 3,
      reps: ex?.reps ?? 10,
    }]);
    setPick("");
  };

  const save = async () => {
    if (!name.trim() || exercises.length === 0) {
      toast.error("Add a name and at least one exercise");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (initial) {
      await supabase.from("workout_templates").update({
        name: name.trim(),
        description: description.trim() || null,
        exercises: exercises as any,
      }).eq("id", initial.id);
    } else {
      await supabase.from("workout_templates").insert({
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        exercises: exercises as any,
      });
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold tracking-tight">{initial ? "Edit template" : "New template"}</h2>
        <div className="mt-4 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Template name e.g. My Push Day"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />

          <div className="rounded-xl border border-border bg-background/50 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">Exercises</p>
            {exercises.length === 0 && <p className="py-2 text-center text-xs text-muted-foreground">No exercises yet</p>}
            <ul className="space-y-2">
              {exercises.map((e, i) => (
                <li key={i} className="flex items-center gap-2 rounded-md border border-border bg-card p-2">
                  <span className="flex-1 truncate text-sm">{e.exercise_name}</span>
                  <input
                    type="number" min={1} value={e.sets}
                    onChange={(ev) => setExercises((arr) => arr.map((x, j) => j === i ? { ...x, sets: Number(ev.target.value) } : x))}
                    className="w-14 rounded-md border border-input bg-background px-2 py-1 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">×</span>
                  <input
                    value={String(e.reps)}
                    onChange={(ev) => setExercises((arr) => arr.map((x, j) => j === i ? { ...x, reps: ev.target.value } : x))}
                    className="w-14 rounded-md border border-input bg-background px-2 py-1 text-xs"
                  />
                  <button onClick={() => setExercises((arr) => arr.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <select
                value={pick}
                onChange={(e) => setPick(e.target.value)}
                className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              >
                <option value="">+ Add exercise…</option>
                {ALL_EXERCISES.map((e) => (
                  <option key={e.name} value={e.name}>{e.name} — {e.muscle}</option>
                ))}
              </select>
              <button onClick={add} className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-secondary">Add</button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-2 border-t border-border/60 pt-4">
          <button onClick={onClose} className="flex-1 rounded-md border border-border bg-background py-2 text-sm">Cancel</button>
          <button onClick={save} className="neon-btn flex-1 rounded-md py-2 text-sm">Save</button>
        </div>
      </div>
    </div>
  );
}
