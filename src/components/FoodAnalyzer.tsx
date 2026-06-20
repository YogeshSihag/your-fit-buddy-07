import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Camera, Upload, X, Plus, Minus, Trash2, Sparkles, Search,
  RefreshCw, ChefHat, Loader2,
} from "lucide-react";
import { analyzeFood, type AnalyzedIngredient, type FoodAnalysis } from "@/lib/food-analysis.functions";
import { searchIngredients, findIngredient, INGREDIENTS } from "@/lib/food-database";
import { openCamera, stopStream } from "@/lib/camera";
import { supabase } from "@/integrations/supabase/client";

type Meal = "breakfast" | "lunch" | "dinner" | "snack";

interface Props {
  open: boolean;
  date: string;
  defaultMeal: Meal;
  onClose: () => void;
  onLogged: () => void;
}

export function FoodAnalyzer({ open, date, defaultMeal, onClose, onLogged }: Props) {
  const run = useServerFn(analyzeFood);
  const [stage, setStage] = useState<"capture" | "analyzing" | "edit">("capture");
  const [imageData, setImageData] = useState<string | null>(null);
  const [dishName, setDishName] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [notes, setNotes] = useState("");
  const [ingredients, setIngredients] = useState<AnalyzedIngredient[]>([]);
  const [meal, setMeal] = useState<Meal>(defaultMeal);
  const [logging, setLogging] = useState(false);

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camOn, setCamOn] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStage("capture"); setImageData(null);
      setIngredients([]); setDishName(""); setConfidence(0); setNotes("");
      setMeal(defaultMeal);
    } else {
      stopCam();
    }
    return () => stopCam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function stopCam() {
    stopStream(streamRef.current);
    streamRef.current = null;
    setCamOn(false);
  }

  async function startCamera() {
    try {
      const s = await openCamera("environment");
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play().catch(() => {});
      }
      setCamOn(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start camera");
    }
  }

  function snap() {
    const v = videoRef.current;
    if (!v || v.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    const w = Math.min(v.videoWidth, 1024);
    const scale = w / v.videoWidth;
    canvas.width = w;
    canvas.height = Math.round(v.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.85);
    setImageData(data);
    stopCam();
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image"); return; }
    if (file.size > 6 * 1024 * 1024) { toast.error("Image too large (max 6 MB)"); return; }
    // Resize via canvas to keep payload small
    const img = new Image();
    const url = URL.createObjectURL(file);
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("Bad image")); img.src = url; });
    const maxW = 1024;
    const scale = Math.min(1, maxW / img.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    setImageData(canvas.toDataURL("image/jpeg", 0.85));
  }

  async function analyze() {
    if (!imageData) return;
    setStage("analyzing");
    try {
      const result = await run({ data: { imageDataUrl: imageData } }) as FoodAnalysis;
      if (!result.ingredients.length) {
        toast.error("Couldn't identify food in the image. Try another photo.");
        setStage("capture");
        return;
      }
      setDishName(result.dish_name);
      setConfidence(result.confidence);
      setNotes(result.notes);
      setIngredients(result.ingredients);
      setStage("edit");
    } catch (e: any) {
      toast.error(e?.message ?? "Analysis failed");
      setStage("capture");
    }
  }

  // Totals derived from ingredient list (single source of truth)
  const totals = ingredients.reduce(
    (a, i) => ({
      kcal: a.kcal + (i.per100.kcal * i.grams) / 100,
      p: a.p + (i.per100.p * i.grams) / 100,
      c: a.c + (i.per100.c * i.grams) / 100,
      f: a.f + (i.per100.f * i.grams) / 100,
    }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  );

  function updateGrams(idx: number, g: number) {
    setIngredients((prev) => prev.map((it, i) => (i === idx ? { ...it, grams: Math.max(0, Math.round(g)) } : it)));
  }
  function bump(idx: number, delta: number) {
    setIngredients((prev) => prev.map((it, i) => (i === idx ? { ...it, grams: Math.max(0, it.grams + delta) } : it)));
  }
  function remove(idx: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  }
  function addFromDb(name: string) {
    const ref = findIngredient(name);
    if (!ref) return;
    setIngredients((prev) => [...prev, { name: ref.name, grams: ref.serving_g, per100: ref.per100 }]);
  }

  async function logMeal() {
    if (ingredients.length === 0) { toast.error("Nothing to log"); return; }
    setLogging(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("nutrition_entries").insert({
        user_id: user.id,
        meal,
        logged_on: date,
        food_name: dishName || "Analyzed meal",
        quantity: `${Math.round(ingredients.reduce((a, i) => a + i.grams, 0))} g`,
        calories: Math.round(totals.kcal),
        protein_g: Number(totals.p.toFixed(1)),
        carbs_g: Number(totals.c.toFixed(1)),
        fat_g: Number(totals.f.toFixed(1)),
      });
      if (error) throw error;
      toast.success(`Logged ${dishName} (${Math.round(totals.kcal)} kcal)`);
      onLogged();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not log meal");
    } finally {
      setLogging(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm md:items-center md:p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-border bg-card md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-neon" />
            <h2 className="text-lg font-bold">AI Food Analyzer</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {stage === "capture" && (
            <CaptureStage
              imageData={imageData}
              camOn={camOn}
              videoRef={videoRef}
              onStartCamera={startCamera}
              onSnap={snap}
              onFile={handleFile}
              onClear={() => setImageData(null)}
            />
          )}

          {stage === "analyzing" && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-neon" />
              <p className="font-semibold">Analyzing your meal…</p>
              <p className="text-sm text-muted-foreground">Identifying ingredients and estimating nutrition</p>
            </div>
          )}

          {stage === "edit" && (
            <EditStage
              imageData={imageData}
              dishName={dishName} setDishName={setDishName}
              confidence={confidence}
              notes={notes}
              ingredients={ingredients}
              totals={totals}
              onUpdate={updateGrams}
              onBump={bump}
              onRemove={remove}
              onAdd={addFromDb}
            />
          )}
        </div>

        {stage === "capture" && (
          <div className="border-t border-border bg-background/40 px-5 py-3">
            <button
              onClick={analyze}
              disabled={!imageData}
              className="neon-btn w-full rounded-md py-3 text-sm font-semibold disabled:opacity-40"
            >
              <Sparkles className="mr-1.5 inline h-4 w-4" /> Analyze with AI
            </button>
          </div>
        )}

        {stage === "edit" && (
          <div className="border-t border-border bg-background/40 px-5 py-3">
            <div className="mb-2 flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Log as</span>
              <select value={meal} onChange={(e) => setMeal(e.target.value as Meal)}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs">
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
              <button onClick={() => setStage("capture")}
                className="ml-auto inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
                <RefreshCw className="h-3 w-3" /> Re-analyze
              </button>
            </div>
            <button onClick={logMeal} disabled={logging}
              className="neon-btn w-full rounded-md py-3 text-sm font-semibold disabled:opacity-40">
              {logging ? "Logging…" : `Log ${Math.round(totals.kcal)} kcal to ${meal}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CaptureStage({
  imageData, camOn, videoRef, onStartCamera, onSnap, onFile, onClear,
}: {
  imageData: string | null;
  camOn: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onStartCamera: () => void;
  onSnap: () => void;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-4">
      {imageData ? (
        <div className="relative overflow-hidden rounded-xl border border-border">
          <img src={imageData} alt="Meal" className="w-full" />
          <button onClick={onClear} aria-label="Clear"
            className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-black">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : camOn ? (
        <div className="relative overflow-hidden rounded-xl border border-border bg-black">
          <video ref={videoRef} playsInline muted className="w-full" />
          <button onClick={onSnap}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-neon px-5 py-2.5 text-sm font-semibold text-background shadow-lg">
            Capture
          </button>
        </div>
      ) : (
        <div className="grid place-items-center rounded-xl border border-dashed border-border bg-background/40 py-10 text-center">
          <ChefHat className="mb-2 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Take or upload a photo of your meal</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button onClick={onStartCamera}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-neon/40 bg-neon/5 px-3 py-2.5 text-sm font-medium text-neon hover:bg-neon/10">
          <Camera className="h-4 w-4" /> {camOn ? "Restart" : "Take photo"}
        </button>
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-sm font-medium hover:bg-background">
          <Upload className="h-4 w-4" /> Upload
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
        </label>
      </div>
    </div>
  );
}

function EditStage({
  imageData, dishName, setDishName, confidence, notes, ingredients, totals,
  onUpdate, onBump, onRemove, onAdd,
}: {
  imageData: string | null;
  dishName: string;
  setDishName: (v: string) => void;
  confidence: number;
  notes: string;
  ingredients: AnalyzedIngredient[];
  totals: { kcal: number; p: number; c: number; f: number };
  onUpdate: (i: number, g: number) => void;
  onBump: (i: number, d: number) => void;
  onRemove: (i: number) => void;
  onAdd: (name: string) => void;
}) {
  const [q, setQ] = useState("");
  const results = q.trim() ? searchIngredients(q, 8) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        {imageData && (
          <img src={imageData} alt="" className="h-20 w-20 flex-shrink-0 rounded-lg border border-border object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <input
            value={dishName} onChange={(e) => setDishName(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-base font-semibold"
          />
          <div className="mt-1 flex items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-full border border-neon/30 bg-neon/5 px-2 py-0.5 text-neon">
              <Sparkles className="h-3 w-3" /> AI · {confidence}% sure
            </span>
            {notes && <span className="truncate text-muted-foreground">{notes}</span>}
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-4 gap-2 rounded-xl border border-border bg-background/40 p-3 text-center">
        <Stat label="kcal" value={Math.round(totals.kcal)} />
        <Stat label="P g" value={totals.p.toFixed(1)} />
        <Stat label="C g" value={totals.c.toFixed(1)} />
        <Stat label="F g" value={totals.f.toFixed(1)} />
      </div>

      {/* Ingredients */}
      <div>
        <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Ingredients</p>
        <ul className="space-y-2">
          {ingredients.map((it, idx) => {
            const kcal = Math.round((it.per100.kcal * it.grams) / 100);
            return (
              <li key={idx} className="rounded-lg border border-border bg-background/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate font-medium">{it.name}</p>
                  <button onClick={() => onRemove(idx)} aria-label="Remove"
                    className="rounded-md p-1 text-muted-foreground hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => onBump(idx, -10)} aria-label="Less"
                    className="rounded-md border border-border bg-card p-1.5 hover:bg-background">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex items-center gap-1">
                    <input type="number" inputMode="numeric" value={it.grams}
                      onChange={(e) => onUpdate(idx, Number(e.target.value) || 0)}
                      className="w-20 rounded-md border border-input bg-background px-2 py-1 text-center text-sm tabular-nums" />
                    <span className="text-xs text-muted-foreground">g</span>
                  </div>
                  <button onClick={() => onBump(idx, 10)} aria-label="More"
                    className="rounded-md border border-border bg-card p-1.5 hover:bg-background">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">{kcal} kcal</span>
                </div>
              </li>
            );
          })}
          {ingredients.length === 0 && (
            <li className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              No ingredients. Add one below.
            </li>
          )}
        </ul>
      </div>

      {/* Add ingredient */}
      <div>
        <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Add ingredient</p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${INGREDIENTS.length}+ ingredients`}
            className="w-full rounded-md border border-input bg-background pl-8 pr-2 py-2 text-sm"
          />
        </div>
        {results.length > 0 && (
          <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto rounded-md border border-border bg-background/40 p-1">
            {results.map((r) => (
              <li key={r.name}>
                <button onClick={() => { onAdd(r.name); setQ(""); }}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-card">
                  <span className="min-w-0 truncate">{r.name}</span>
                  <span className="text-[11px] text-muted-foreground">{r.per100.kcal} kcal/100g · {r.serving_g}g</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}
