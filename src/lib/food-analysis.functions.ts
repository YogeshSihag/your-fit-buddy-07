import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  imageDataUrl: z.string().startsWith("data:image/").max(8_000_000),
});

export interface AnalyzedIngredient {
  name: string;
  grams: number;
  per100: { kcal: number; p: number; c: number; f: number };
}

export interface FoodAnalysis {
  dish_name: string;
  confidence: number; // 0-100
  serving_g: number;
  totals: { kcal: number; p: number; c: number; f: number };
  ingredients: AnalyzedIngredient[];
  notes: string;
}

function clamp(n: any, min: number, max: number, fb = 0): number {
  const v = Number(n);
  if (!isFinite(v)) return fb;
  return Math.max(min, Math.min(max, v));
}

export const analyzeFood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<FoodAnalysis> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured");

    const systemPrompt = `You are an expert nutritionist and food vision model. Identify the dish in the image and break it down into its main ingredients with realistic gram estimates.

Return STRICT JSON only with this exact shape:
{
  "dish_name": "concise dish name",
  "confidence": integer 0-100,
  "serving_g": integer total grams in the serving shown,
  "totals": { "kcal": int, "p": grams protein, "c": grams carbs, "f": grams fat },
  "ingredients": [
    { "name": "ingredient name", "grams": int, "per100": { "kcal": int, "p": num, "c": num, "f": num } }
  ],
  "notes": "one short sentence with caveats or assumptions"
}

Rules:
- 3 to 10 ingredients. Use common English names ("Chicken Breast (cooked)", "Basmati Rice (cooked)", "Olive Oil", "Paneer", etc).
- per100 values are per 100 g of that ingredient, not per serving.
- totals must roughly equal the sum across ingredients (within 15%).
- If multiple items on the plate, treat the largest item as the dish but include side ingredients.
- If the image does NOT show food: dish_name "Unknown", confidence 0, serving_g 0, totals all 0, ingredients [].
- Be realistic with portion sizes; do not invent extreme values.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: [
            { type: "text", text: "Identify this meal and break it down. Respond ONLY with the JSON object." },
            { type: "image_url", image_url: { url: data.imageDataUrl } },
          ] },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("[AI food] error", res.status, txt);
      if (res.status === 429) throw new Error("Rate limited. Try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
      throw new Error("AI analysis failed. Please try again.");
    }

    const json = await res.json();
    const content: string = json.choices?.[0]?.message?.content ?? "{}";
    let obj: any = {};
    try { obj = JSON.parse(content); } catch { obj = {}; }

    const ingredients: AnalyzedIngredient[] = Array.isArray(obj.ingredients)
      ? obj.ingredients.slice(0, 12).map((i: any) => ({
          name: String(i?.name ?? "Ingredient").slice(0, 60),
          grams: Math.round(clamp(i?.grams, 1, 1500, 50)),
          per100: {
            kcal: Math.round(clamp(i?.per100?.kcal, 0, 950, 100)),
            p: Number(clamp(i?.per100?.p, 0, 100, 5).toFixed(1)),
            c: Number(clamp(i?.per100?.c, 0, 100, 10).toFixed(1)),
            f: Number(clamp(i?.per100?.f, 0, 100, 5).toFixed(1)),
          },
        }))
      : [];

    // Recompute totals from ingredient breakdown for consistency
    const t = ingredients.reduce(
      (a, i) => ({
        kcal: a.kcal + (i.per100.kcal * i.grams) / 100,
        p: a.p + (i.per100.p * i.grams) / 100,
        c: a.c + (i.per100.c * i.grams) / 100,
        f: a.f + (i.per100.f * i.grams) / 100,
      }),
      { kcal: 0, p: 0, c: 0, f: 0 },
    );

    return {
      dish_name: String(obj.dish_name ?? "Unknown Dish").slice(0, 80),
      confidence: Math.round(clamp(obj.confidence, 0, 100, 0)),
      serving_g: Math.round(clamp(obj.serving_g, 0, 3000, ingredients.reduce((a, i) => a + i.grams, 0))),
      totals: {
        kcal: Math.round(t.kcal),
        p: Number(t.p.toFixed(1)),
        c: Number(t.c.toFixed(1)),
        f: Number(t.f.toFixed(1)),
      },
      ingredients,
      notes: String(obj.notes ?? "").slice(0, 200),
    };
  });
