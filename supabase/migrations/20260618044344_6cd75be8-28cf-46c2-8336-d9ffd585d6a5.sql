
-- =========================================================
-- Workout Templates
-- =========================================================
CREATE TABLE public.workout_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_builtin boolean NOT NULL DEFAULT false,
  is_favorite boolean NOT NULL DEFAULT false,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_templates TO authenticated;
GRANT ALL ON public.workout_templates TO service_role;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own or builtin templates" ON public.workout_templates
  FOR SELECT TO authenticated
  USING (is_builtin = true OR auth.uid() = user_id);
CREATE POLICY "insert own templates" ON public.workout_templates
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_builtin = false);
CREATE POLICY "update own templates" ON public.workout_templates
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own templates" ON public.workout_templates
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_workout_templates_updated_at
  BEFORE UPDATE ON public.workout_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- Workout Sessions
-- =========================================================
CREATE TABLE public.workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT 'Workout',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_sec integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own sessions all" ON public.workout_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_workout_sessions_updated_at
  BEFORE UPDATE ON public.workout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_workout_sessions_user_started ON public.workout_sessions(user_id, started_at DESC);

-- =========================================================
-- Workout Sets
-- =========================================================
CREATE TABLE public.workout_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name text NOT NULL,
  muscle_group text,
  set_index integer NOT NULL DEFAULT 1,
  weight_kg numeric,
  reps integer,
  completed boolean NOT NULL DEFAULT false,
  rest_sec integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sets TO authenticated;
GRANT ALL ON public.workout_sets TO service_role;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own sets all" ON public.workout_sets
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_workout_sets_session ON public.workout_sets(session_id, set_index);
CREATE INDEX idx_workout_sets_user_exercise ON public.workout_sets(user_id, exercise_name, created_at DESC);

-- =========================================================
-- Personal Records
-- =========================================================
CREATE TABLE public.personal_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name text NOT NULL,
  record_type text NOT NULL,           -- 'heaviest_weight' | 'max_reps' | 'max_volume' | 'max_1rm'
  value numeric NOT NULL,
  weight_kg numeric,
  reps integer,
  session_id uuid REFERENCES public.workout_sessions(id) ON DELETE SET NULL,
  achieved_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_records TO authenticated;
GRANT ALL ON public.personal_records TO service_role;
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own prs all" ON public.personal_records
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_personal_records_user_exercise ON public.personal_records(user_id, exercise_name, record_type, achieved_at DESC);

-- =========================================================
-- Seed built-in templates
-- =========================================================
INSERT INTO public.workout_templates (user_id, name, description, is_builtin, exercises) VALUES
(NULL, 'Push Day', 'Chest, shoulders, and triceps focused session.', true, '[
  {"exercise_name":"Bench Press","muscle_group":"Chest","sets":4,"reps":8},
  {"exercise_name":"Incline Dumbbell Press","muscle_group":"Chest","sets":3,"reps":10},
  {"exercise_name":"Overhead Press","muscle_group":"Shoulders","sets":3,"reps":8},
  {"exercise_name":"Lateral Raises","muscle_group":"Shoulders","sets":3,"reps":15},
  {"exercise_name":"Tricep Pushdowns","muscle_group":"Triceps","sets":3,"reps":12},
  {"exercise_name":"Overhead Tricep Extension","muscle_group":"Triceps","sets":3,"reps":12}
]'::jsonb),
(NULL, 'Pull Day', 'Back and biceps focused session.', true, '[
  {"exercise_name":"Deadlift","muscle_group":"Back","sets":4,"reps":5},
  {"exercise_name":"Pull-Ups","muscle_group":"Back","sets":3,"reps":8},
  {"exercise_name":"Barbell Rows","muscle_group":"Back","sets":3,"reps":10},
  {"exercise_name":"Lat Pulldowns","muscle_group":"Back","sets":3,"reps":12},
  {"exercise_name":"Barbell Curls","muscle_group":"Biceps","sets":3,"reps":10},
  {"exercise_name":"Hammer Curls","muscle_group":"Biceps","sets":3,"reps":12}
]'::jsonb),
(NULL, 'Leg Day', 'Quads, hamstrings, glutes, and calves.', true, '[
  {"exercise_name":"Squats","muscle_group":"Legs","sets":4,"reps":8},
  {"exercise_name":"Romanian Deadlift","muscle_group":"Legs","sets":3,"reps":10},
  {"exercise_name":"Leg Press","muscle_group":"Legs","sets":3,"reps":12},
  {"exercise_name":"Lunges","muscle_group":"Legs","sets":3,"reps":12},
  {"exercise_name":"Leg Curls","muscle_group":"Legs","sets":3,"reps":12},
  {"exercise_name":"Calf Raises","muscle_group":"Legs","sets":4,"reps":15}
]'::jsonb),
(NULL, 'Upper Lower Split — Upper', 'Upper body strength session.', true, '[
  {"exercise_name":"Bench Press","muscle_group":"Chest","sets":4,"reps":6},
  {"exercise_name":"Barbell Rows","muscle_group":"Back","sets":4,"reps":6},
  {"exercise_name":"Overhead Press","muscle_group":"Shoulders","sets":3,"reps":8},
  {"exercise_name":"Pull-Ups","muscle_group":"Back","sets":3,"reps":8},
  {"exercise_name":"Barbell Curls","muscle_group":"Biceps","sets":3,"reps":10},
  {"exercise_name":"Tricep Pushdowns","muscle_group":"Triceps","sets":3,"reps":10}
]'::jsonb),
(NULL, 'Arnold Split — Chest & Back', 'Classic Arnold split day one.', true, '[
  {"exercise_name":"Bench Press","muscle_group":"Chest","sets":4,"reps":8},
  {"exercise_name":"Incline Dumbbell Press","muscle_group":"Chest","sets":4,"reps":10},
  {"exercise_name":"Dumbbell Flyes","muscle_group":"Chest","sets":3,"reps":12},
  {"exercise_name":"Pull-Ups","muscle_group":"Back","sets":4,"reps":8},
  {"exercise_name":"Barbell Rows","muscle_group":"Back","sets":4,"reps":8},
  {"exercise_name":"Deadlift","muscle_group":"Back","sets":3,"reps":6}
]'::jsonb),
(NULL, 'Full Body', 'Complete body workout for all major muscle groups.', true, '[
  {"exercise_name":"Squats","muscle_group":"Legs","sets":3,"reps":8},
  {"exercise_name":"Bench Press","muscle_group":"Chest","sets":3,"reps":8},
  {"exercise_name":"Barbell Rows","muscle_group":"Back","sets":3,"reps":8},
  {"exercise_name":"Overhead Press","muscle_group":"Shoulders","sets":3,"reps":8},
  {"exercise_name":"Romanian Deadlift","muscle_group":"Legs","sets":3,"reps":10},
  {"exercise_name":"Plank","muscle_group":"Core","sets":3,"reps":1}
]'::jsonb),
(NULL, 'Chest & Triceps', 'Push-focused isolation day.', true, '[
  {"exercise_name":"Bench Press","muscle_group":"Chest","sets":4,"reps":8},
  {"exercise_name":"Incline Dumbbell Press","muscle_group":"Chest","sets":3,"reps":10},
  {"exercise_name":"Dumbbell Flyes","muscle_group":"Chest","sets":3,"reps":12},
  {"exercise_name":"Push-Ups","muscle_group":"Chest","sets":3,"reps":15},
  {"exercise_name":"Tricep Pushdowns","muscle_group":"Triceps","sets":4,"reps":12},
  {"exercise_name":"Overhead Tricep Extension","muscle_group":"Triceps","sets":3,"reps":12}
]'::jsonb),
(NULL, 'Back & Biceps', 'Pull-focused isolation day.', true, '[
  {"exercise_name":"Pull-Ups","muscle_group":"Back","sets":4,"reps":8},
  {"exercise_name":"Barbell Rows","muscle_group":"Back","sets":4,"reps":8},
  {"exercise_name":"Lat Pulldowns","muscle_group":"Back","sets":3,"reps":12},
  {"exercise_name":"Seated Cable Rows","muscle_group":"Back","sets":3,"reps":12},
  {"exercise_name":"Barbell Curls","muscle_group":"Biceps","sets":4,"reps":10},
  {"exercise_name":"Hammer Curls","muscle_group":"Biceps","sets":3,"reps":12}
]'::jsonb);

-- =========================================================
-- Backfill existing workouts into sessions + sets
-- =========================================================
DO $$
DECLARE r RECORD;
DECLARE new_session_id uuid;
DECLARE i integer;
BEGIN
  FOR r IN SELECT * FROM public.workouts ORDER BY created_at LOOP
    INSERT INTO public.workout_sessions(user_id, name, started_at, ended_at, duration_sec, notes)
    VALUES (
      r.user_id,
      COALESCE(r.muscle_group, 'Workout'),
      r.created_at,
      r.created_at + (COALESCE(r.duration_min, 0) || ' minutes')::interval,
      COALESCE(r.duration_min, 0) * 60,
      r.notes
    )
    RETURNING id INTO new_session_id;

    FOR i IN 1..GREATEST(COALESCE(r.sets, 1), 1) LOOP
      INSERT INTO public.workout_sets(session_id, user_id, exercise_name, muscle_group, set_index, weight_kg, reps, completed)
      VALUES (new_session_id, r.user_id, r.exercise_name, r.muscle_group, i, r.weight_kg, r.reps, true);
    END LOOP;
  END LOOP;
END $$;

-- =========================================================
-- Backfill personal records from migrated sets
-- =========================================================
INSERT INTO public.personal_records (user_id, exercise_name, record_type, value, weight_kg, reps, achieved_at)
SELECT DISTINCT ON (user_id, exercise_name)
  user_id, exercise_name, 'heaviest_weight', weight_kg, weight_kg, reps, created_at
FROM public.workout_sets
WHERE weight_kg IS NOT NULL AND weight_kg > 0
ORDER BY user_id, exercise_name, weight_kg DESC, created_at ASC;

INSERT INTO public.personal_records (user_id, exercise_name, record_type, value, weight_kg, reps, achieved_at)
SELECT DISTINCT ON (user_id, exercise_name)
  user_id, exercise_name, 'max_reps', reps, weight_kg, reps, created_at
FROM public.workout_sets
WHERE reps IS NOT NULL AND reps > 0
ORDER BY user_id, exercise_name, reps DESC, created_at ASC;
