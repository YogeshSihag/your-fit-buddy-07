export type FitnessLevel = "beginner" | "intermediate" | "advanced";

export function computeFitnessLevel(opts: {
  avgScore: number | null;
  workoutCount: number;
}): FitnessLevel {
  const { avgScore, workoutCount } = opts;
  if (workoutCount >= 20 && (avgScore ?? 0) >= 80) return "advanced";
  if (workoutCount >= 8 && (avgScore ?? 0) >= 65) return "intermediate";
  return "beginner";
}

export const LEVEL_LABEL: Record<FitnessLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};
