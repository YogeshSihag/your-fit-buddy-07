ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS weight_kg numeric;
ALTER TABLE public.form_scores ADD COLUMN IF NOT EXISTS mistakes jsonb;
ALTER TABLE public.form_scores ADD COLUMN IF NOT EXISTS indicator text;