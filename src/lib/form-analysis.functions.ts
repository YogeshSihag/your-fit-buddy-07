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

interface AnalysisResult {
  score: number;
  feedback: string;
  tips: string[];
}

export const analyzeForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }): Promise<AnalysisResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured");

    const systemPrompt = `You are an expert fitness form coach. Analyze the user's exercise form from the provided image.
Return JSON with: score (integer 0-100, 100 = perfect form), feedback (one concise sentence overall assessment), tips (array of 2-4 short actionable improvement tips).
Score generously but honestly. If no person is visible, return score 0 and explain.`;

    const userPrompt = `Exercise being performed: ${data.exerciseName}. Analyze the form and respond ONLY in this exact JSON shape: {"score": number, "feedback": string, "tips": string[]}`;

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
      if (res.status === 429) throw new Error("Rate limited. Try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
      throw new Error(`AI error: ${txt.slice(0, 200)}`);
    }

    const json = await res.json();
    const content: string = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: AnalysisResult;
    try {
      const obj = JSON.parse(content);
      parsed = {
        score: Math.max(0, Math.min(100, Math.round(Number(obj.score) || 0))),
        feedback: String(obj.feedback ?? "No feedback available"),
        tips: Array.isArray(obj.tips) ? obj.tips.slice(0, 5).map(String) : [],
      };
    } catch {
      parsed = { score: 0, feedback: "Could not analyze image", tips: [] };
    }

    // Persist
    await context.supabase.from("form_scores").insert({
      user_id: context.userId,
      exercise_name: data.exerciseName,
      score: parsed.score,
      feedback: parsed.feedback + (parsed.tips.length ? " | Tips: " + parsed.tips.join("; ") : ""),
    });

    return parsed;
  });
