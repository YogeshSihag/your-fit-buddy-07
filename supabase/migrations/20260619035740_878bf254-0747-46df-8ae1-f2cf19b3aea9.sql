DROP POLICY IF EXISTS "update own templates" ON public.workout_templates;
CREATE POLICY "update own templates" ON public.workout_templates
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND is_builtin = false)
  WITH CHECK (auth.uid() = user_id AND is_builtin = false);