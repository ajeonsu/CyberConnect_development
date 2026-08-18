-- ================================================================================
-- AI Development Core — Phase 1-A PoC
-- ADDITIVE ONLY. Do NOT run on Production until a human reviews this file.
--
-- Creates three new tables. Does not ALTER / DROP / TRUNCATE / UPDATE existing
-- tables or rows (teams, projects, task_rows, extras, github_repos, etc.).
--
-- Intended target: Staging Supabase project `cyberconnect-dev` only.
-- ================================================================================

-- ---------- ai_dev_repos (per-project allowlist; not a copy of task data) ----------
CREATE TABLE IF NOT EXISTS public.ai_dev_repos (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  team_id uuid NOT NULL,
  project_id uuid NOT NULL,
  github_owner text NOT NULL,
  github_repo text NOT NULL,
  installation_id bigint NOT NULL,
  default_base_branch text NOT NULL,
  allowed_base_branches text[] NOT NULL,
  denied_branches text[] NOT NULL DEFAULT '{}'::text[],
  enabled boolean NOT NULL DEFAULT true,
  cursor_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_dev_repos_pkey PRIMARY KEY (id),
  CONSTRAINT ai_dev_repos_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE CASCADE,
  CONSTRAINT ai_dev_repos_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects (id) ON DELETE CASCADE,
  CONSTRAINT ai_dev_repos_unique_project_repo UNIQUE (project_id, github_owner, github_repo),
  CONSTRAINT ai_dev_repos_allowed_not_empty CHECK (cardinality(allowed_base_branches) > 0),
  CONSTRAINT ai_dev_repos_default_in_allowed CHECK (default_base_branch = ANY (allowed_base_branches))
);

COMMENT ON TABLE public.ai_dev_repos IS
  'AI Development allowlist. New table only; does not modify projects.github_repos.';

CREATE INDEX IF NOT EXISTS idx_ai_dev_repos_project ON public.ai_dev_repos (project_id);
CREATE INDEX IF NOT EXISTS idx_ai_dev_repos_team ON public.ai_dev_repos (team_id);
CREATE INDEX IF NOT EXISTS idx_ai_dev_repos_installation ON public.ai_dev_repos (installation_id);

DROP TRIGGER IF EXISTS trg_ai_dev_repos_updated_at ON public.ai_dev_repos;
CREATE TRIGGER trg_ai_dev_repos_updated_at
  BEFORE UPDATE ON public.ai_dev_repos
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ---------- ai_dev_runs (references existing tasks by task_id only) ----------
CREATE TABLE IF NOT EXISTS public.ai_dev_runs (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  team_id uuid NOT NULL,
  project_id uuid NOT NULL,
  task_id uuid NOT NULL,
  ai_dev_repo_id uuid NOT NULL,
  github_owner text NOT NULL,
  github_repo text NOT NULL,
  base_branch text NOT NULL,
  base_sha text NOT NULL,
  cursor_agent_id text NULL,
  cursor_agent_url text NULL,
  cursor_branch_name text NULL,
  status text NOT NULL,
  pr_number integer NULL,
  pr_url text NULL,
  pr_state text NOT NULL DEFAULT 'unknown',
  pr_head_sha text NULL,
  ci_status text NOT NULL DEFAULT 'unknown',
  ci_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_code text NULL,
  error_message text NULL,
  prompt_version text NOT NULL,
  prompt_hash text NULL,
  started_by uuid NOT NULL,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone NULL,
  last_reconciled_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_dev_runs_pkey PRIMARY KEY (id),
  CONSTRAINT ai_dev_runs_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE CASCADE,
  CONSTRAINT ai_dev_runs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects (id) ON DELETE CASCADE,
  CONSTRAINT ai_dev_runs_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task_rows (id) ON DELETE CASCADE,
  CONSTRAINT ai_dev_runs_repo_id_fkey FOREIGN KEY (ai_dev_repo_id) REFERENCES public.ai_dev_repos (id) ON DELETE RESTRICT,
  CONSTRAINT ai_dev_runs_started_by_fkey FOREIGN KEY (started_by) REFERENCES public.profiles (id) ON DELETE RESTRICT,
  CONSTRAINT ai_dev_runs_status_check CHECK (
    status = ANY (ARRAY[
      'starting'::text,
      'running'::text,
      'awaiting_review'::text,
      'merged'::text,
      'failed'::text,
      'cancelled'::text
    ])
  ),
  CONSTRAINT ai_dev_runs_pr_state_check CHECK (
    pr_state = ANY (ARRAY[
      'unknown'::text,
      'draft'::text,
      'open'::text,
      'merged'::text,
      'closed'::text
    ])
  ),
  CONSTRAINT ai_dev_runs_ci_status_check CHECK (
    ci_status = ANY (ARRAY[
      'unknown'::text,
      'none'::text,
      'pending'::text,
      'success'::text,
      'failure'::text
    ])
  )
);

COMMENT ON TABLE public.ai_dev_runs IS
  'AI Development runs. References task_rows by FK only; never copies or rewrites task data.';

CREATE INDEX IF NOT EXISTS idx_ai_dev_runs_project_created ON public.ai_dev_runs (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_dev_runs_task_created ON public.ai_dev_runs (task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_dev_runs_team_created ON public.ai_dev_runs (team_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_dev_runs_cursor_agent_id
  ON public.ai_dev_runs (cursor_agent_id)
  WHERE cursor_agent_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_dev_runs_one_active_per_task
  ON public.ai_dev_runs (task_id)
  WHERE status IN ('starting', 'running', 'awaiting_review');

DROP TRIGGER IF EXISTS trg_ai_dev_runs_updated_at ON public.ai_dev_runs;
CREATE TRIGGER trg_ai_dev_runs_updated_at
  BEFORE UPDATE ON public.ai_dev_runs
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ---------- ai_dev_events (append-only audit for AI runs) ----------
CREATE TABLE IF NOT EXISTS public.ai_dev_events (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  run_id uuid NOT NULL,
  team_id uuid NOT NULL,
  event_type text NOT NULL,
  actor_profile_id uuid NULL,
  idempotency_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_dev_events_pkey PRIMARY KEY (id),
  CONSTRAINT ai_dev_events_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.ai_dev_runs (id) ON DELETE CASCADE,
  CONSTRAINT ai_dev_events_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE CASCADE,
  CONSTRAINT ai_dev_events_actor_fkey FOREIGN KEY (actor_profile_id) REFERENCES public.profiles (id) ON DELETE SET NULL,
  CONSTRAINT ai_dev_events_idempotency_key_unique UNIQUE (idempotency_key)
);

COMMENT ON TABLE public.ai_dev_events IS
  'AI Development audit events. Do not store prompts, secrets, or source code.';

CREATE INDEX IF NOT EXISTS idx_ai_dev_events_run_created ON public.ai_dev_events (run_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_dev_events_team_created ON public.ai_dev_events (team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_dev_events_type ON public.ai_dev_events (event_type);
