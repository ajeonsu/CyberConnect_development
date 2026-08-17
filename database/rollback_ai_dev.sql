-- ================================================================================
-- ROLLBACK for AI Development Phase 1-A tables ONLY.
-- Drops the three new tables created by migrate_add_ai_dev.sql.
-- Does not touch teams, projects, task_rows, or any existing data.
--
-- Do NOT run unless a human explicitly chooses to remove the PoC tables.
-- ================================================================================

DROP TABLE IF EXISTS public.ai_dev_events;
DROP TABLE IF EXISTS public.ai_dev_runs;
DROP TABLE IF EXISTS public.ai_dev_repos;
