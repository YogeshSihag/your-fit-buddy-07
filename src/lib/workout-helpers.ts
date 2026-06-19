import { supabase } from "@/integrations/supabase/client";
import { ALL_EXERCISES } from "@/lib/exercises";

export interface TemplateExercise {
  exercise_name: string;
  muscle_group: string;
  sets: number;
  reps: number | string;
}

export type PRType = "heaviest_weight" | "max_reps" | "max_volume";

export interface NewPR {
  exercise_name: string;
  record_type: PRType;
  value: number;
  weight_kg: number | null;
  reps: number | null;
}

function muscleFor(exerciseName: string): string {
  const ex = ALL_EXERCISES.find((e) => e.name === exerciseName);
  return ex?.muscle ?? "Full Body";
}

/** Start a new session from a template (creates one workout_set row per planned set, completed=false). */
export async function startSessionFromTemplate(template: {
  id: string;
  name: string;
  exercises: TemplateExercise[];
}): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: session, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      template_id: template.id,
      name: template.name,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !session) throw error ?? new Error("Failed to start session");

  const rows: any[] = [];
  template.exercises.forEach((tex) => {
    const sets = Math.max(1, Number(tex.sets) || 1);
    for (let i = 1; i <= sets; i++) {
      rows.push({
        session_id: session.id,
        user_id: user.id,
        exercise_name: tex.exercise_name,
        muscle_group: tex.muscle_group ?? muscleFor(tex.exercise_name),
        set_index: i,
        weight_kg: null,
        reps: typeof tex.reps === "number" ? tex.reps : null,
        completed: false,
      });
    }
  });
  if (rows.length > 0) {
    await supabase.from("workout_sets").insert(rows);
  }
  return session.id;
}

export async function startEmptySession(name = "Quick Workout"): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({ user_id: user.id, name, started_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("Failed to start session");
  return data.id;
}

export async function addSetToSession(opts: {
  sessionId: string;
  exerciseName: string;
  muscleGroup?: string;
  setIndex: number;
  weight?: number | null;
  reps?: number | null;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return supabase.from("workout_sets").insert({
    session_id: opts.sessionId,
    user_id: user.id,
    exercise_name: opts.exerciseName,
    muscle_group: opts.muscleGroup ?? muscleFor(opts.exerciseName),
    set_index: opts.setIndex,
    weight_kg: opts.weight ?? null,
    reps: opts.reps ?? null,
    completed: false,
  });
}

/** Detect new PRs vs all prior workout_sets (excluding the new one). Returns PRs that were inserted. */
export async function detectAndRecordPRs(opts: {
  userId: string;
  exerciseName: string;
  weight: number | null;
  reps: number | null;
  sessionId: string;
  setId: string;
}): Promise<NewPR[]> {
  const { userId, exerciseName, weight, reps, sessionId, setId } = opts;

  // Look at all prior sets for this exercise (excluding this one)
  const { data: prior } = await supabase
    .from("workout_sets")
    .select("weight_kg, reps")
    .eq("user_id", userId)
    .eq("exercise_name", exerciseName)
    .eq("completed", true)
    .neq("id", setId);

  const newPRs: NewPR[] = [];
  const w = weight ?? 0;
  const r = reps ?? 0;
  const vol = w * r;

  const bestWeight = Math.max(0, ...(prior ?? []).map((p) => Number(p.weight_kg) || 0));
  const bestReps = Math.max(0, ...(prior ?? []).map((p) => Number(p.reps) || 0));
  const bestVol = Math.max(
    0,
    ...(prior ?? []).map((p) => (Number(p.weight_kg) || 0) * (Number(p.reps) || 0)),
  );

  if (w > 0 && w > bestWeight) {
    newPRs.push({ exercise_name: exerciseName, record_type: "heaviest_weight", value: w, weight_kg: w, reps: r || null });
  }
  if (r > 0 && r > bestReps) {
    newPRs.push({ exercise_name: exerciseName, record_type: "max_reps", value: r, weight_kg: w || null, reps: r });
  }
  if (vol > 0 && vol > bestVol) {
    newPRs.push({ exercise_name: exerciseName, record_type: "max_volume", value: vol, weight_kg: w || null, reps: r || null });
  }

  if (newPRs.length > 0) {
    await supabase.from("personal_records").insert(
      newPRs.map((pr) => ({
        user_id: userId,
        exercise_name: pr.exercise_name,
        record_type: pr.record_type,
        value: pr.value,
        weight_kg: pr.weight_kg,
        reps: pr.reps,
        session_id: sessionId,
      })),
    );
  }
  return newPRs;
}

/** Previous workout set for an exercise (most recent completed set, BEFORE this session). */
export async function fetchPreviousSets(opts: {
  userId: string;
  exerciseName: string;
  beforeSessionId: string;
}): Promise<{ weight_kg: number | null; reps: number | null; set_index: number; created_at: string }[]> {
  // Find the most recent prior session containing this exercise
  const { data: priors } = await supabase
    .from("workout_sets")
    .select("weight_kg, reps, set_index, session_id, created_at")
    .eq("user_id", opts.userId)
    .eq("exercise_name", opts.exerciseName)
    .eq("completed", true)
    .neq("session_id", opts.beforeSessionId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (!priors || priors.length === 0) return [];
  const prevSessionId = priors[0].session_id;
  return priors
    .filter((p) => p.session_id === prevSessionId)
    .sort((a, b) => a.set_index - b.set_index)
    .map(({ weight_kg, reps, set_index, created_at }) => ({ weight_kg, reps, set_index, created_at }));
}

export interface SessionSummary {
  durationSec: number;
  exercises: number;
  totalSets: number;
  totalReps: number;
  totalVolume: number;
  avgFormScore: number | null;
  caloriesBurned: number;
  isStrongestThisWeek: boolean;
  formImprovedVsPrevious: boolean;
}

export async function endSession(sessionId: string): Promise<SessionSummary> {
  const { data: session } = await supabase
    .from("workout_sessions")
    .select("started_at, user_id")
    .eq("id", sessionId)
    .single();
  const started = session?.started_at ? new Date(session.started_at).getTime() : Date.now();
  const endedAt = new Date();
  const durationSec = Math.max(0, Math.round((endedAt.getTime() - started) / 1000));

  await supabase
    .from("workout_sessions")
    .update({ ended_at: endedAt.toISOString(), duration_sec: durationSec })
    .eq("id", sessionId);

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("exercise_name, weight_kg, reps, completed")
    .eq("session_id", sessionId);
  const completed = (sets ?? []).filter((s) => s.completed);
  const exercises = new Set(completed.map((s) => s.exercise_name)).size;
  const totalSets = completed.length;
  const totalReps = completed.reduce((a, s) => a + (s.reps ?? 0), 0);
  const totalVolume = completed.reduce((a, s) => a + (s.reps ?? 0) * (Number(s.weight_kg) || 0), 0);

  const { data: { user } } = await supabase.auth.getUser();

  let bw = 70;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles").select("weight_kg").eq("id", user.id).maybeSingle();
    if (profile?.weight_kg) bw = Number(profile.weight_kg);
  }
  const minutes = Math.max(1, durationSec / 60);
  const caloriesBurned = Math.round((6 * 3.5 * bw / 200) * minutes);

  let avgFormScore: number | null = null;
  if (user) {
    const { data: scoresIn } = await supabase
      .from("form_scores").select("score")
      .eq("user_id", user.id)
      .gte("created_at", new Date(started).toISOString())
      .lte("created_at", endedAt.toISOString());
    if (scoresIn && scoresIn.length > 0) {
      avgFormScore = Math.round(scoresIn.reduce((a, s) => a + (s.score ?? 0), 0) / scoresIn.length);
    }
  }

  let isStrongestThisWeek = false;
  let formImprovedVsPrevious = false;
  if (user) {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: weekSessions } = await supabase
      .from("workout_sessions").select("id")
      .eq("user_id", user.id).gte("ended_at", weekAgo).neq("id", sessionId);
    if (weekSessions && weekSessions.length > 0) {
      const ids = weekSessions.map((s) => s.id);
      const { data: weekSets } = await supabase
        .from("workout_sets").select("session_id, weight_kg, reps")
        .in("session_id", ids).eq("completed", true);
      const byS = new Map<string, number>();
      for (const s of weekSets ?? []) {
        byS.set(s.session_id, (byS.get(s.session_id) ?? 0) + (s.reps ?? 0) * (Number(s.weight_kg) || 0));
      }
      const maxOther = Math.max(0, ...Array.from(byS.values()));
      isStrongestThisWeek = totalVolume > maxOther && totalVolume > 0;
    } else {
      isStrongestThisWeek = totalVolume > 0;
    }

    if (avgFormScore != null) {
      const prev = (await supabase
        .from("workout_sessions").select("started_at, ended_at")
        .eq("user_id", user.id)
        .lt("ended_at", new Date(started).toISOString())
        .order("ended_at", { ascending: false }).limit(1)).data?.[0];
      if (prev?.started_at && prev?.ended_at) {
        const { data: prevScores } = await supabase
          .from("form_scores").select("score")
          .eq("user_id", user.id)
          .gte("created_at", prev.started_at).lte("created_at", prev.ended_at);
        if (prevScores && prevScores.length > 0) {
          const prevAvg = prevScores.reduce((a, s) => a + (s.score ?? 0), 0) / prevScores.length;
          formImprovedVsPrevious = avgFormScore > prevAvg;
        }
      }
    }
  }

  if (user) {
    const byExercise = new Map<string, { reps: number; weight: number; sets: number; muscle: string }>();
    for (const s of completed) {
      const k = s.exercise_name;
      const prev = byExercise.get(k) ?? { reps: 0, weight: 0, sets: 0, muscle: muscleFor(k) };
      prev.sets += 1;
      prev.reps = Math.max(prev.reps, s.reps ?? 0);
      prev.weight = Math.max(prev.weight, Number(s.weight_kg) || 0);
      byExercise.set(k, prev);
    }
    if (byExercise.size > 0) {
      const rows = Array.from(byExercise.entries()).map(([name, v]) => ({
        user_id: user.id,
        muscle_group: v.muscle,
        exercise_name: name,
        sets: v.sets,
        reps: v.reps || null,
        weight_kg: v.weight || null,
        duration_min: Math.max(1, Math.round(durationSec / 60 / byExercise.size)),
      }));
      await supabase.from("workouts").insert(rows);
    }
  }

  return {
    durationSec, exercises, totalSets, totalReps, totalVolume,
    avgFormScore, caloriesBurned, isStrongestThisWeek, formImprovedVsPrevious,
  };
}

/** YouTube search URL for an exercise demo. */
export function demoSearchUrl(exerciseName: string): string {
  const q = encodeURIComponent(`${exerciseName} proper form tutorial`);
  return `https://www.youtube.com/results?search_query=${q}`;
}
