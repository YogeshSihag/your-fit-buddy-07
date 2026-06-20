import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Apple, Coffee, Soup, UtensilsCrossed, Cookie, Plus, Trash2,
  Flame, Target, TrendingUp, Settings as SettingsIcon, Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { FoodAnalyzer } from "@/components/FoodAnalyzer";

export const Route = createFileRoute("/_authenticated/nutrition")({
  head: () => ({
    meta: [
      { title: "Nutrition & Calories — Your Fitness Friend" },
      { name: "description", content: "Log meals, track macros, and hit your daily calorie goal." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://your-fit-buddy-07.lovable.app/nutrition" }],
  }),
  component: NutritionPage,
});

type Meal = "breakfast" | "lunch" | "dinner" | "snack";
type GoalType = "weight_loss" | "muscle_gain" | "maintenance";

interface Entry {
  id: string;
  meal: Meal;
  food_name: string;
  quantity: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  logged_on: string;
}

interface Goals {
  goal_type: GoalType;
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

const MEALS: { key: Meal; label: string; Icon: React.ElementType }[] = [
  { key: "breakfast", label: "Breakfast", Icon: Coffee },
  { key: "lunch", label: "Lunch", Icon: Soup },
  { key: "dinner", label: "Dinner", Icon: UtensilsCrossed },
  { key: "snack", label: "Snacks", Icon: Cookie },
];

const GOAL_PRESETS: Record<GoalType, Omit<Goals, "goal_type">> = {
  weight_loss: { daily_calories: 1800, protein_g: 150, carbs_g: 180, fat_g: 60 },
  muscle_gain: { daily_calories: 2800, protein_g: 180, carbs_g: 340, fat_g: 80 },
  maintenance: { daily_calories: 2200, protein_g: 150, carbs_g: 250, fat_g: 70 },
};

function today() { return new Date().toISOString().slice(0, 10); }

function NutritionPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState<string>(today());
  const [showGoals, setShowGoals] = useState(false);
  const [showAnalyzer, setShowAnalyzer] = useState(false);

  const { data: goals } = useQuery({
    queryKey: ["nutrition-goals"],
    queryFn: async (): Promise<Goals> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { goal_type: "maintenance", ...GOAL_PRESETS.maintenance };
      const { data } = await supabase.from("nutrition_goals").select("*").eq("user_id", user.id).maybeSingle();
      if (!data) return { goal_type: "maintenance", ...GOAL_PRESETS.maintenance };
      return data as Goals;
    },
  });

  const { data: entries } = useQuery({
    queryKey: ["nutrition-entries", date],
    queryFn: async (): Promise<Entry[]> => {
      const { data } = await supabase
        .from("nutrition_entries").select("*").eq("logged_on", date).order("created_at");
      return (data ?? []) as Entry[];
    },
  });

  const { data: weekRows } = useQuery({
    queryKey: ["nutrition-week"],
    queryFn: async () => {
      const since = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
      const { data } = await supabase
        .from("nutrition_entries").select("calories, logged_on").gte("logged_on", since);
      return data ?? [];
    },
  });

  const totals = useMemo(() => {
    const t = { cal: 0, p: 0, c: 0, f: 0 };
    for (const e of entries ?? []) {
      t.cal += Number(e.calories) || 0;
      t.p += Number(e.protein_g) || 0;
      t.c += Number(e.carbs_g) || 0;
      t.f += Number(e.fat_g) || 0;
    }
    return t;
  }, [entries]);

  const weeklyChart = useMemo(() => {
    const out: { date: string; calories: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const cals = (weekRows ?? []).filter((r) => r.logged_on === d).reduce((a, r) => a + (Number(r.calories) || 0), 0);
      out.push({ date: d.slice(5), calories: Math.round(cals) });
    }
    return out;
  }, [weekRows]);

  const goal = goals?.daily_calories ?? 2200;
  const remaining = goal - totals.cal;
  const pct = Math.min(100, Math.round((totals.cal / Math.max(1, goal)) * 100));

  const addEntry = async (meal: Meal, payload: Omit<Entry, "id" | "logged_on" | "meal">) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("nutrition_entries").insert({
      user_id: user.id, meal, logged_on: date, ...payload,
    });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["nutrition-entries", date] });
    qc.invalidateQueries({ queryKey: ["nutrition-week"] });
  };

  const removeEntry = async (id: string) => {
    await supabase.from("nutrition_entries").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["nutrition-entries", date] });
    qc.invalidateQueries({ queryKey: ["nutrition-week"] });
  };

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Apple className="h-6 w-6 text-neon" /> Nutrition
          </h1>
          <p className="text-sm text-muted-foreground">Track meals, macros, and your daily calorie goal.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-input bg-card px-3 py-2 text-sm"
          />
          <button
            onClick={() => setShowAnalyzer(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-neon/40 bg-neon/10 px-3 py-2 text-sm font-medium text-neon hover:bg-neon/15"
          >
            <Sparkles className="h-4 w-4" /> Analyze meal
          </button>
          <button
            onClick={() => setShowGoals(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <SettingsIcon className="h-4 w-4" /> Goals
          </button>
        </div>
      </div>

      {/* Calorie ring + macros */}
      <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Calories today</p>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="font-display text-4xl tabular-nums">{Math.round(totals.cal)}</p>
            <p className="text-sm text-muted-foreground">/ {goal} kcal</p>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-background/60">
            <div
              className={`h-full transition-all ${remaining < 0 ? "bg-red-500" : "bg-neon"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className={`mt-2 text-sm ${remaining < 0 ? "text-red-400" : "text-muted-foreground"}`}>
            {remaining >= 0 ? `${remaining} kcal remaining` : `${-remaining} kcal over goal`}
          </p>
          <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-neon/30 bg-neon/5 px-2.5 py-1 text-[10px] uppercase tracking-widest text-neon">
            <Target className="h-3 w-3" /> {(goals?.goal_type ?? "maintenance").replace("_", " ")}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <MacroCard label="Protein" value={totals.p} goal={goals?.protein_g ?? 150} unit="g" color="bg-emerald-400" />
          <MacroCard label="Carbs" value={totals.c} goal={goals?.carbs_g ?? 250} unit="g" color="bg-amber-400" />
          <MacroCard label="Fat" value={totals.f} goal={goals?.fat_g ?? 70} unit="g" color="bg-rose-400" />
        </div>
      </div>

      {/* Weekly trends */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-neon" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Last 7 days</h2>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer>
            <BarChart data={weeklyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.006 240)" />
              <XAxis dataKey="date" stroke="oklch(0.7 0.01 240)" fontSize={11} />
              <YAxis stroke="oklch(0.7 0.01 240)" fontSize={11} />
              <Tooltip contentStyle={{ background: "oklch(0.18 0.006 240)", border: "1px solid oklch(0.3 0.006 240)", borderRadius: 8 }} />
              <Bar dataKey="calories" fill="oklch(0.85 0.22 140)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Meals */}
      <div className="grid gap-4 md:grid-cols-2">
        {MEALS.map((m) => (
          <MealCard
            key={m.key}
            meal={m.key}
            label={m.label}
            Icon={m.Icon}
            entries={(entries ?? []).filter((e) => e.meal === m.key)}
            onAdd={addEntry}
            onRemove={removeEntry}
          />
        ))}
      </div>

      {showGoals && <GoalsModal current={goals} onClose={() => setShowGoals(false)} />}
    </div>
  );
}

function MacroCard({ label, value, goal, unit, color }: { label: string; value: number; goal: number; unit: string; color: string }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, goal)) * 100));
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{Math.round(value)}<span className="text-xs text-muted-foreground"> / {goal}{unit}</span></p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-background/60">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MealCard({
  meal, label, Icon, entries, onAdd, onRemove,
}: {
  meal: Meal; label: string; Icon: React.ElementType;
  entries: Entry[];
  onAdd: (m: Meal, p: Omit<Entry, "id" | "logged_on" | "meal">) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ food_name: "", quantity: "", calories: "", protein_g: "", carbs_g: "", fat_g: "" });
  const total = entries.reduce((a, e) => a + (Number(e.calories) || 0), 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.food_name.trim()) { toast.error("Enter a food name"); return; }
    await onAdd(meal, {
      food_name: form.food_name.trim(),
      quantity: form.quantity.trim() || null,
      calories: Number(form.calories) || 0,
      protein_g: Number(form.protein_g) || 0,
      carbs_g: Number(form.carbs_g) || 0,
      fat_g: Number(form.fat_g) || 0,
    });
    setForm({ food_name: "", quantity: "", calories: "", protein_g: "", carbs_g: "", fat_g: "" });
    setOpen(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-neon/10 ring-1 ring-neon/30">
            <Icon className="h-4 w-4 text-neon" />
          </div>
          <div>
            <p className="font-semibold">{label}</p>
            <p className="text-xs text-muted-foreground">{Math.round(total)} kcal · {entries.length} item{entries.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md border border-neon/40 bg-neon/5 px-2.5 py-1.5 text-xs text-neon hover:bg-neon/10"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="mt-3 grid grid-cols-2 gap-2">
          <input className="col-span-2 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            placeholder="Food name" value={form.food_name} onChange={(e) => setForm({ ...form, food_name: e.target.value })} />
          <input className="col-span-2 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            placeholder="Quantity (e.g. 1 cup, 200g)" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <input type="number" inputMode="decimal" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            placeholder="Calories" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} />
          <input type="number" inputMode="decimal" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            placeholder="Protein (g)" value={form.protein_g} onChange={(e) => setForm({ ...form, protein_g: e.target.value })} />
          <input type="number" inputMode="decimal" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            placeholder="Carbs (g)" value={form.carbs_g} onChange={(e) => setForm({ ...form, carbs_g: e.target.value })} />
          <input type="number" inputMode="decimal" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            placeholder="Fat (g)" value={form.fat_g} onChange={(e) => setForm({ ...form, fat_g: e.target.value })} />
          <button type="submit" className="neon-btn col-span-2 rounded-md py-2 text-sm">Log food</button>
        </form>
      )}

      {entries.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{e.food_name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {e.quantity ? `${e.quantity} · ` : ""}{Math.round(e.calories)} kcal · P {Math.round(e.protein_g)}g · C {Math.round(e.carbs_g)}g · F {Math.round(e.fat_g)}g
                </p>
              </div>
              <button onClick={() => removeConfirm(e.id, onRemove)} aria-label="Delete"
                className="rounded-md p-1.5 text-muted-foreground hover:text-red-400">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function removeConfirm(id: string, onRemove: (id: string) => Promise<void>) {
  void onRemove(id);
}

function GoalsModal({ current, onClose }: { current: Goals | undefined; onClose: () => void }) {
  const qc = useQueryClient();
  const [goalType, setGoalType] = useState<GoalType>(current?.goal_type ?? "maintenance");
  const [vals, setVals] = useState({
    daily_calories: current?.daily_calories ?? 2200,
    protein_g: current?.protein_g ?? 150,
    carbs_g: current?.carbs_g ?? 250,
    fat_g: current?.fat_g ?? 70,
  });

  const applyPreset = (g: GoalType) => {
    setGoalType(g);
    setVals(GOAL_PRESETS[g]);
  };

  const save = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("nutrition_goals").upsert({
      user_id: user.id, goal_type: goalType, ...vals,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Goals saved");
    qc.invalidateQueries({ queryKey: ["nutrition-goals"] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-neon" />
          <h2 className="text-xl font-bold">Calorie & macro goals</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Choose a goal preset, then fine-tune the numbers.</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {(["weight_loss", "maintenance", "muscle_gain"] as GoalType[]).map((g) => (
            <button
              key={g}
              onClick={() => applyPreset(g)}
              className={`rounded-lg border px-2 py-2 text-xs font-medium capitalize transition-colors ${
                goalType === g ? "border-neon bg-neon/10 text-neon" : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {g.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            { key: "daily_calories", label: "Calories" },
            { key: "protein_g", label: "Protein (g)" },
            { key: "carbs_g", label: "Carbs (g)" },
            { key: "fat_g", label: "Fat (g)" },
          ].map((f) => (
            <label key={f.key} className="text-xs">
              <span className="text-muted-foreground">{f.label}</span>
              <input
                type="number"
                value={(vals as any)[f.key]}
                onChange={(e) => setVals({ ...vals, [f.key]: Number(e.target.value) || 0 })}
                className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm tabular-nums"
              />
            </label>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-md border border-border bg-background py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={save} className="neon-btn flex-1 rounded-md py-2 text-sm">Save</button>
        </div>
      </div>
    </div>
  );
}
