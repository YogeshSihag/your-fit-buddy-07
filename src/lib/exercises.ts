export type MuscleGroup =
  | "Chest" | "Back" | "Shoulders" | "Biceps" | "Triceps" | "Legs" | "Abs";

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "Chest", "Back", "Shoulders", "Biceps", "Triceps", "Legs", "Abs",
];

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  tip: string;
}

export const EXERCISES: Record<MuscleGroup, Exercise[]> = {
  Chest: [
    { name: "Push-Ups", sets: 4, reps: "10-15", tip: "Keep core tight, elbows ~45°." },
    { name: "Bench Press", sets: 4, reps: "8-10", tip: "Drive feet, retract scapula." },
    { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", tip: "Don't flare elbows." },
  ],
  Back: [
    { name: "Pull-Ups", sets: 4, reps: "6-10", tip: "Lead with chest, full hang." },
    { name: "Bent-Over Rows", sets: 4, reps: "8-10", tip: "Neutral spine, pull to hip." },
    { name: "Lat Pulldown", sets: 3, reps: "10-12", tip: "Squeeze shoulder blades down." },
  ],
  Shoulders: [
    { name: "Overhead Press", sets: 4, reps: "8-10", tip: "Brace abs, don't arch back." },
    { name: "Lateral Raises", sets: 3, reps: "12-15", tip: "Slight bend, lead with elbows." },
    { name: "Face Pulls", sets: 3, reps: "12-15", tip: "Pull to forehead, elbows high." },
  ],
  Biceps: [
    { name: "Barbell Curls", sets: 4, reps: "10-12", tip: "Elbows pinned to sides." },
    { name: "Hammer Curls", sets: 3, reps: "10-12", tip: "Neutral grip, no swing." },
    { name: "Incline Dumbbell Curls", sets: 3, reps: "10-12", tip: "Full stretch at bottom." },
  ],
  Triceps: [
    { name: "Close-Grip Push-Ups", sets: 3, reps: "10-15", tip: "Elbows tight to body." },
    { name: "Tricep Dips", sets: 3, reps: "8-12", tip: "Lean slightly forward." },
    { name: "Overhead Tricep Extension", sets: 3, reps: "10-12", tip: "Elbows pointing up." },
  ],
  Legs: [
    { name: "Squats", sets: 4, reps: "8-12", tip: "Knees track over toes, chest up." },
    { name: "Lunges", sets: 3, reps: "10/leg", tip: "Front knee 90°, push through heel." },
    { name: "Romanian Deadlifts", sets: 4, reps: "8-10", tip: "Hinge at hips, soft knees." },
  ],
  Abs: [
    { name: "Plank", sets: 3, reps: "45-60s", tip: "Straight line head to heel." },
    { name: "Hanging Leg Raises", sets: 3, reps: "8-12", tip: "Control, no swinging." },
    { name: "Bicycle Crunches", sets: 3, reps: "20", tip: "Slow, twist from core." },
  ],
};
