import { EXERCISES, MUSCLE_GROUPS, type MuscleGroup } from "./exercises";

export interface WorkoutRow {
  id: string;
  created_at: string;
  muscle_group: string;
  exercise_name: string;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  duration_min: number | null;
}

// MET-based calorie estimate per set (~45s of work).
// Assumes ~6 MET for moderate weight training.
export function caloriesForWorkout(w: WorkoutRow, bodyweightKg: number | null): number {
  const bw = bodyweightKg && bodyweightKg > 0 ? bodyweightKg : 70;
  const sets = w.sets ?? 0;
  const minutes = w.duration_min ?? sets * 0.75; // ~45s/set
  // kcal = MET * 3.5 * weight(kg) / 200 * minutes
  return Math.round((6 * 3.5 * bw / 200) * minutes);
}

export function totalCalories(rows: WorkoutRow[], bodyweightKg: number | null): number {
  return rows.reduce((s, r) => s + caloriesForWorkout(r, bodyweightKg), 0);
}

export function totalVolume(rows: WorkoutRow[]): number {
  // kg lifted = sets * reps * weight
  return rows.reduce((s, r) => s + (r.sets ?? 0) * (r.reps ?? 0) * (r.weight_kg ?? 0), 0);
}

export function totalTrainingMinutes(rows: WorkoutRow[]): number {
  return rows.reduce((s, r) => s + (r.duration_min ?? (r.sets ?? 0) * 0.75), 0);
}

export interface MuscleStats {
  muscle: MuscleGroup;
  sets: number;
  volume: number;
  sessions: number; // distinct days
  intensity: number; // 0..1 for heatmap
}

export function muscleStats(rows: WorkoutRow[]): MuscleStats[] {
  const byMuscle = new Map<MuscleGroup, { sets: number; volume: number; days: Set<string> }>();
  for (const m of MUSCLE_GROUPS) byMuscle.set(m, { sets: 0, volume: 0, days: new Set() });

  for (const r of rows) {
    const m = r.muscle_group as MuscleGroup;
    const bucket = byMuscle.get(m);
    if (!bucket) continue;
    bucket.sets += r.sets ?? 0;
    bucket.volume += (r.sets ?? 0) * (r.reps ?? 0) * (r.weight_kg ?? 0);
    bucket.days.add(new Date(r.created_at).toISOString().slice(0, 10));
  }

  const maxSets = Math.max(1, ...Array.from(byMuscle.values()).map((b) => b.sets));
  return MUSCLE_GROUPS.map((m) => {
    const b = byMuscle.get(m)!;
    return {
      muscle: m,
      sets: b.sets,
      volume: b.volume,
      sessions: b.days.size,
      intensity: b.sets / maxSets,
    };
  });
}

export interface DayActivity { date: string; sets: number; workouts: number; }

export function dailyActivity(rows: WorkoutRow[], days: number): DayActivity[] {
  const map = new Map<string, { sets: number; workouts: number }>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    map.set(d.toISOString().slice(0, 10), { sets: 0, workouts: 0 });
  }
  for (const r of rows) {
    const key = new Date(r.created_at).toISOString().slice(0, 10);
    const b = map.get(key);
    if (!b) continue;
    b.sets += r.sets ?? 0;
    b.workouts += 1;
  }
  return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }));
}

export function weeklyConsistency(rows: WorkoutRow[]): number {
  // % of last 7 days that have at least one workout
  const last7 = dailyActivity(rows, 7);
  const active = last7.filter((d) => d.workouts > 0).length;
  return Math.round((active / 7) * 100);
}

export function currentStreak(rows: WorkoutRow[]): number {
  const days = new Set(rows.map((r) => new Date(r.created_at).toISOString().slice(0, 10)));
  let streak = 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  // allow today empty: start from today, walk back
  // if today empty, start from yesterday
  if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  while (days.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export interface RecoveryAssessment {
  score: number; // 0-100, higher = more recovered
  status: "rested" | "ready" | "fatigued" | "overtraining";
  message: string;
}

export function recoveryScore(rows: WorkoutRow[]): RecoveryAssessment {
  // Look at last 7 days. Score drops with high frequency + same muscles consecutively.
  const last7 = dailyActivity(rows, 7);
  const activeDays = last7.filter((d) => d.workouts > 0).length;
  const totalSets = last7.reduce((s, d) => s + d.sets, 0);

  // Consecutive same-muscle training in last 3 days
  const last3 = rows.filter((r) => {
    const age = Date.now() - new Date(r.created_at).getTime();
    return age < 3 * 24 * 3600 * 1000;
  });
  const last3Muscles = new Set(last3.map((r) => r.muscle_group));
  const repeatPenalty = last3.length > 0 && last3Muscles.size <= 1 ? 25 : 0;

  let score = 100;
  if (activeDays >= 6) score -= 30;
  else if (activeDays >= 5) score -= 15;
  if (totalSets > 60) score -= 20;
  else if (totalSets > 40) score -= 10;
  score -= repeatPenalty;
  score = Math.max(0, Math.min(100, score));

  let status: RecoveryAssessment["status"];
  let message: string;
  if (score >= 80) {
    status = "rested";
    message = "Well recovered — train hard today.";
  } else if (score >= 60) {
    status = "ready";
    message = "Good to go. Keep intensity moderate to high.";
  } else if (score >= 35) {
    status = "fatigued";
    message = "Fatigue building. Consider a lighter session or new muscle group.";
  } else {
    status = "overtraining";
    message = "High overtraining risk. Take a rest day.";
  }
  return { score, status, message };
}

export function undertrained(stats: MuscleStats[]): MuscleStats[] {
  return [...stats].sort((a, b) => a.sets - b.sets).slice(0, 3);
}

export function mostTrained(stats: MuscleStats[]): MuscleStats[] {
  return [...stats].sort((a, b) => b.sets - a.sets).slice(0, 3);
}

export function exerciseList() {
  return Object.values(EXERCISES).flat();
}
