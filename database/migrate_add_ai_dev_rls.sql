-- ================================================================================
-- AI Development Core — Phase 1-A PoC RLS
-- ADDITIVE ONLY. Enables RLS on the three new tables.
-- Does not DROP or replace existing policies on teams / projects / task_rows.
-- Run AFTER database/migrate_add_ai_dev.sql on Staging only.
-- ================================================================================

ALTER TABLE public.ai_dev_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_dev_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_dev_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_dev_repos select: project members" ON public.ai_dev_repos;
CREATE POLICY "ai_dev_repos select: project members"
  ON public.ai_dev_repos
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (user_can_access_project(project_id));

DROP POLICY IF EXISTS "ai_dev_runs select: project members" ON public.ai_dev_runs;
CREATE POLICY "ai_dev_runs select: project members"
  ON public.ai_dev_runs
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (user_can_access_project(project_id));

DROP POLICY IF EXISTS "ai_dev_events select: project members" ON public.ai_dev_events;
CREATE POLICY "ai_dev_events select: project members"
  ON public.ai_dev_events
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.ai_dev_runs r
      WHERE r.id = ai_dev_events.run_id
        AND user_can_access_project(r.project_id)
    )
  );

-- Writes go through the Next.js API with the service role after RBAC checks.
-- authenticated has SELECT only.

GRANT SELECT ON public.ai_dev_repos TO authenticated;
GRANT SELECT ON public.ai_dev_runs TO authenticated;
GRANT SELECT ON public.ai_dev_events TO authenticated;
