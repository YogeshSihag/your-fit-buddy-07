
CREATE TYPE public.meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
CREATE TYPE public.nutrition_goal_type AS ENUM ('weight_loss', 'muscle_gain', 'maintenance');

CREATE TABLE public.nutrition_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal meal_type NOT NULL,
  food_name TEXT NOT NULL,
  quantity TEXT,
  calories NUMERIC NOT NULL DEFAULT 0,
  protein_g NUMERIC NOT NULL DEFAULT 0,
  carbs_g NUMERIC NOT NULL DEFAULT 0,
  fat_g NUMERIC NOT NULL DEFAULT 0,
  logged_on DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX nutrition_entries_user_date_idx ON public.nutrition_entries (user_id, logged_on DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_entries TO authenticated;
GRANT ALL ON public.nutrition_entries TO service_role;
ALTER TABLE public.nutrition_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own nutrition entries"
  ON public.nutrition_entries FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_nutrition_entries_updated_at
  BEFORE UPDATE ON public.nutrition_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.nutrition_goals (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type nutrition_goal_type NOT NULL DEFAULT 'maintenance',
  daily_calories INTEGER NOT NULL DEFAULT 2200,
  protein_g INTEGER NOT NULL DEFAULT 150,
  carbs_g INTEGER NOT NULL DEFAULT 250,
  fat_g INTEGER NOT NULL DEFAULT 70,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_goals TO authenticated;
GRANT ALL ON public.nutrition_goals TO service_role;
ALTER TABLE public.nutrition_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own nutrition goals"
  ON public.nutrition_goals FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_nutrition_goals_updated_at
  BEFORE UPDATE ON public.nutrition_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
