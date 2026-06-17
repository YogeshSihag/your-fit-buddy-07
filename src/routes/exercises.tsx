import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ALL_EXERCISES, DIFFICULTIES, EQUIPMENT, MUSCLE_GROUPS,
  type Difficulty, type Equipment, type Exercise, type MuscleGroup,
} from "@/lib/exercises";
import {
  Search, Heart, Play, Dumbbell, ArrowLeft, Star, History, X, ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/exercises")({
  head: () => ({
    meta: [
      { title: "Exercise Library — Your Fitness Friend" },
      { name: "description", content: "Browse 150+ exercises across 12 muscle groups. Filter by difficulty and equipment, and start with AI form analysis." },
    ],
  }),
  component: ExerciseLibrary,
});

const FAVES_KEY = "yff:favorites";
const RECENT_KEY = "yff:recent";

function loadList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; }
}
function saveList(key: string, list: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(list));
}

function ExerciseLibrary() {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | "All">("All");
  const [difficulty, setDifficulty] = useState<Difficulty | "All">("All");
  const [equipment, setEquipment] = useState<Equipment | "All">("All");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [showFaves, setShowFaves] = useState(false);
  const [selected, setSelected] = useState<Exercise | null>(null);

  useEffect(() => {
    setFavorites(loadList(FAVES_KEY));
    setRecent(loadList(RECENT_KEY));
  }, []);

  const toggleFave = (name: string) => {
    const next = favorites.includes(name)
      ? favorites.filter((n) => n !== name)
      : [name, ...favorites];
    setFavorites(next);
    saveList(FAVES_KEY, next);
  };

  const markRecent = (name: string) => {
    const next = [name, ...recent.filter((n) => n !== name)].slice(0, 8);
    setRecent(next);
    saveList(RECENT_KEY, next);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_EXERCISES.filter((e) => {
      if (muscle !== "All" && e.muscle !== muscle) return false;
      if (difficulty !== "All" && e.difficulty !== difficulty) return false;
      if (equipment !== "All" && e.equipment !== equipment) return false;
      if (showFaves && !favorites.includes(e.name)) return false;
      if (q && !(e.name.toLowerCase().includes(q) || e.muscle.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [query, muscle, difficulty, equipment, favorites, showFaves]);

  const recentExercises = recent
    .map((n) => ALL_EXERCISES.find((e) => e.name === n))
    .filter(Boolean) as Exercise[];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3.5">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <Link to="/auth" className="neon-btn rounded-md px-3.5 py-2 text-sm">
            Sign in
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-5 py-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-neon">Library</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            {ALL_EXERCISES.length}+ exercises, fully detailed
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Instructions, common mistakes, and form tips for every move. Tap any exercise to start AI-coached form analysis.
          </p>
        </div>

        {/* Recently used */}
        {recentExercises.length > 0 && !showFaves && (
          <section>
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              <History className="h-3.5 w-3.5" /> Recently used
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {recentExercises.map((e) => (
                <button
                  key={e.name}
                  onClick={() => setSelected(e)}
                  className="shrink-0 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-foreground transition-colors hover:border-neon/40"
                >
                  {e.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Search + filters */}
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search exercises or muscle groups…"
              className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterSelect label="Muscle" value={muscle} onChange={(v) => setMuscle(v as any)}
              options={["All", ...MUSCLE_GROUPS]} />
            <FilterSelect label="Difficulty" value={difficulty} onChange={(v) => setDifficulty(v as any)}
              options={["All", ...DIFFICULTIES]} />
            <FilterSelect label="Equipment" value={equipment} onChange={(v) => setEquipment(v as any)}
              options={["All", ...EQUIPMENT]} />
            <button
              onClick={() => setShowFaves((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors ${
                showFaves ? "border-neon/40 bg-neon/10 text-neon" : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              <Star className={`h-3.5 w-3.5 ${showFaves ? "fill-neon" : ""}`} /> Favorites
              {favorites.length > 0 && (
                <span className="ml-0.5 rounded-full bg-background/60 px-1.5 text-[10px]">{favorites.length}</span>
              )}
            </button>
            {(query || muscle !== "All" || difficulty !== "All" || equipment !== "All" || showFaves) && (
              <button
                onClick={() => {
                  setQuery(""); setMuscle("All"); setDifficulty("All"); setEquipment("All"); setShowFaves(false);
                }}
                className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filtered.length}</span> exercises
        </div>

        {/* Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <ExerciseCard
              key={e.name}
              ex={e}
              favorite={favorites.includes(e.name)}
              onFave={() => toggleFave(e.name)}
              onOpen={() => setSelected(e)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              No exercises match your filters.
            </div>
          )}
        </div>
      </div>

      {selected && (
        <ExerciseModal
          ex={selected}
          favorite={favorites.includes(selected.name)}
          onFave={() => toggleFave(selected.name)}
          onClose={() => setSelected(null)}
          onStart={() => markRecent(selected.name)}
        />
      )}
    </div>
  );
}

function FilterSelect({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-sm outline-none capitalize"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

const DIFF_STYLES: Record<Difficulty, string> = {
  beginner: "bg-emerald-500/15 text-emerald-400 border-emerald-400/30",
  intermediate: "bg-amber-500/15 text-amber-400 border-amber-400/30",
  advanced: "bg-red-500/15 text-red-400 border-red-400/30",
};

function ExerciseCard({
  ex, favorite, onFave, onOpen,
}: { ex: Exercise; favorite: boolean; onFave: () => void; onOpen: () => void }) {
  return (
    <article
      onClick={onOpen}
      className="card-hover group flex cursor-pointer flex-col rounded-2xl border border-border bg-card p-5"
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-neon/10 ring-1 ring-neon/20">
          <Dumbbell className="h-5 w-5 text-neon" />
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onFave(); }}
          aria-label={favorite ? "Unfavorite" : "Favorite"}
          className={`rounded-full p-2 transition-colors ${favorite ? "text-neon" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Heart className={`h-4 w-4 ${favorite ? "fill-neon" : ""}`} />
        </button>
      </div>
      <h3 className="text-lg font-semibold tracking-tight">{ex.name}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{ex.muscle}{ex.secondary.length > 0 ? ` · ${ex.secondary.slice(0, 2).join(", ")}` : ""}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${DIFF_STYLES[ex.difficulty]}`}>
          {ex.difficulty}
        </span>
        <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          {ex.equipment}
        </span>
        <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          {ex.sets}×{ex.reps}
        </span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{ex.tip}</p>
      <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          Details <ChevronRight className="h-3 w-3" />
        </span>
        <Link
          to="/analyze"
          onClick={(e) => e.stopPropagation()}
          className="neon-btn inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs"
        >
          <Play className="h-3.5 w-3.5" /> Quick Start
        </Link>
      </div>
    </article>
  );
}

function ExerciseModal({
  ex, favorite, onFave, onClose, onStart,
}: { ex: Exercise; favorite: boolean; onFave: () => void; onClose: () => void; onStart: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-neon">{ex.muscle}</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">{ex.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{ex.tip}</p>
          </div>
          <button
            onClick={onFave}
            className={`rounded-full p-2 ${favorite ? "text-neon" : "text-muted-foreground hover:text-foreground"}`}
            aria-label="Favorite"
          >
            <Heart className={`h-5 w-5 ${favorite ? "fill-neon" : ""}`} />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${DIFF_STYLES[ex.difficulty]}`}>
            {ex.difficulty}
          </span>
          <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs uppercase tracking-wide text-muted-foreground">
            {ex.equipment}
          </span>
          <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs uppercase tracking-wide text-muted-foreground">
            {ex.sets} sets × {ex.reps}
          </span>
          {ex.secondary.map((s) => (
            <span key={s} className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
              + {s}
            </span>
          ))}
        </div>

        <Section title="Instructions">
          <ol className="space-y-2 text-sm">
            {ex.instructions.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-neon/15 text-[10px] font-semibold text-neon">{i + 1}</span>
                <span className="text-foreground/90">{step}</span>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Common Mistakes">
          <ul className="space-y-1.5 text-sm">
            {ex.mistakes.map((m, i) => (
              <li key={i} className="flex gap-2 text-muted-foreground"><span className="text-red-400">×</span>{m}</li>
            ))}
          </ul>
        </Section>

        <Section title="Form Correction Tips">
          <ul className="space-y-1.5 text-sm">
            {ex.tips.map((t, i) => (
              <li key={i} className="flex gap-2 text-muted-foreground"><span className="text-neon">✓</span>{t}</li>
            ))}
          </ul>
        </Section>

        <div className="mt-6 flex flex-wrap gap-3 border-t border-border/60 pt-5">
          <Link
            to="/analyze"
            onClick={onStart}
            className="neon-btn inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm"
          >
            <Play className="h-4 w-4" /> Start with Form Coach
          </Link>
          <Link
            to="/workouts"
            onClick={onStart}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground hover:bg-secondary"
          >
            Log workout
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}
