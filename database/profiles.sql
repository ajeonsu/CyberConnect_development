-- =============================================================================
-- User profiles (referenced by projects.owner_id, team_members, project_members).
-- Run after auth exists if you use auth.users; id should match app login linkage.
-- =============================================================================

create table public.profiles (
  id uuid not null,
  email text not null,
  name text not null default ''::text,
  role text not null default 'dev'::text,
  constraint profiles_role_check check (role in ('admin', 'pm', 'dev', 'client')),
  status text not null default 'active'::text,
  avatar_url text null,
  department text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_email_key unique (email)
) TABLESPACE pg_default;

create trigger trg_profiles_updated_at before
update on profiles for each row
execute function set_updated_at ();
