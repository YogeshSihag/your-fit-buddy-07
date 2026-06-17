import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { EXERCISES } from "@/lib/exercises";

const VALID_EXERCISE_NAMES = new Set(
  Object.values(EXERCISES).flat().map((e) => e.name),
);

const Input = z.object({
  exerciseName: z.string().min(1).max(100).refine(
    (n) => VALID_EXERCISE_NAMES.has(n),
    { message: "Invalid exercise name" },
  ),
  imageDataUrl: z.string().startsWith("data:image/"),
});

export type FormIndicator = "green" | "yellow" | "red";

export interface FormMistake {
  cue: string;       // short corrective cue, e.g. "Go deeper"
  bodyPart: string;  // e.g. "knees", "lower back"
  severity: FormIndicator;
}

export interface AnalysisResult {
  score: number;
  indicator: FormIndicator;
  feedback: string;
  mistakes: FormMistake[];
  tips: string[];
}

const VALID_INDICATORS: FormIndicator[] = ["green", "yellow", "red"];

function indicatorFromScore(s: number): FormIndicator {
  if (s >= 80) return "green";
  if (s >= 55) return "yellow";
  return "red";
}

export const analyzeForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }): Promise<AnalysisResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured");

    const systemPrompt = `You are an elite real-time fitness form coach. Analyze the user's exercise form from the provided still frame.

Return STRICT JSON with this exact shape:
{
  "score": integer 0-100,
  "indicator": "green" | "yellow" | "red",
  "feedback": "one short sentence overall assessment",
  "mistakes": [ { "cue": "short corrective cue", "bodyPart": "body part causing the issue", "severity": "green"|"yellow"|"red" } ],
  "tips": ["short actionable tip", ...]
}

Rules:
- indicator: green = excellent form (>=80), yellow = minor corrections (55-79), red = incorrect form (<55).
- mistakes: list EXERCISE-SPECIFIC errors visible in the frame. Examples by exercise:
  Squats -> "Go deeper", "Keep back straight", "Knees aligned with toes".
  Push-Ups -> "Lower chest further", "Keep body straight", "Don't flare elbows".
  Barbell Curls / Hammer Curls -> "Avoid swinging", "Keep elbows fixed".
  Overhead Press -> "Don't arch lower back", "Brace core".
  Lunges -> "Front knee 90°", "Don't let knee cave in".
  Plank -> "Hips too high", "Hips sagging".
- Each mistake.cue must be <= 6 words. Each mistake.bodyPart must be 1-3 words (e.g. "knees", "lower back", "elbows").
- 0-4 mistakes. If form is excellent, return an empty mistakes array.
- If no person is visible: score 0, indicator red, feedback explains, mistakes empty.
- tips: 1-3 short improvement tips (different from mistakes).`;

    const userPrompt = `Exercise: ${data.exerciseName}. Analyze form and respond ONLY with the JSON object.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("[AI] Unexpected error", res.status, txt);
      if (res.status === 429) throw new Error("Rate limited. Try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
      throw new Error("AI analysis failed. Please try again later.");
    }

    const json = await res.json();
    const content: string = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: AnalysisResult;
    try {
      const obj = JSON.parse(content);
      const score = Math.max(0, Math.min(100, Math.round(Number(obj.score) || 0)));
      const rawIndicator = typeof obj.indicator === "string" ? obj.indicator.toLowerCase() : "";
      const indicator: FormIndicator = (VALID_INDICATORS as string[]).includes(rawIndicator)
        ? (rawIndicator as FormIndicator)
        : indicatorFromScore(score);
      const mistakes: FormMistake[] = Array.isArray(obj.mistakes)
        ? obj.mistakes.slice(0, 4).map((m: any) => {
            const sev = typeof m?.severity === "string" ? m.severity.toLowerCase() : "";
            return {
              cue: String(m?.cue ?? "").slice(0, 60),
              bodyPart: String(m?.bodyPart ?? "").slice(0, 40),
              severity: (VALID_INDICATORS as string[]).includes(sev)
                ? (sev as FormIndicator)
                : indicator,
            };
          }).filter((m: FormMistake) => m.cue.length > 0)
        : [];
      parsed = {
        score,
        indicator,
        feedback: String(obj.feedback ?? "No feedback available").slice(0, 200),
        mistakes,
        tips: Array.isArray(obj.tips) ? obj.tips.slice(0, 4).map((t: any) => String(t).slice(0, 120)) : [],
      };
    } catch {
      parsed = { score: 0, indicator: "red", feedback: "Could not analyze image", mistakes: [], tips: [] };
    }

    // Persist
    await context.supabase.from("form_scores").insert({
      user_id: context.userId,
      exercise_name: data.exerciseName,
      score: parsed.score,
      indicator: parsed.indicator,
      mistakes: parsed.mistakes,
      feedback: parsed.feedback + (parsed.tips.length ? " | Tips: " + parsed.tips.join("; ") : ""),
    });

    return parsed;
  });
