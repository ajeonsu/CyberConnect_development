export type UserRole = 'admin' | 'pm' | 'dev' | 'client';

export type AccountKind = 'team' | 'personal';

export interface Team {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  invite_code?: string;
}

export interface TeamMembership {
  team_id: string;
  profile_id: string;
  role: 'admin' | 'member';
  team?: Team;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  team_id?: string;
  team_role?: 'admin' | 'member';
  /** Team = company demo (role selection). Personal = isolated workspace. */
  accountKind?: AccountKind;
  activeWorkspaceRole?: string;
  activeTeamSlug?: string;
  avatar_url?: string;
  department?: string;
}

export interface SheetTab {
  id: string;
  name: string;
  nameJa: string;
  icon: string;
  visibleTo: UserRole[];
  columns: SheetColumn[];
  guestEditableColumns: string[];
  pmCanAddRows: boolean;
  isSpecialView?: boolean;
}

export interface SheetColumn {
  key: string;
  label: string;
  labelJa: string;
  width: number;
  type: 'text' | 'status' | 'select' | 'date' | 'number' | 'code' | 'assignee' | 'longtext';
  editable: boolean;
  options?: string[];
}

export interface SheetRow {
  id: string;
  [key: string]: string | number | boolean | null | undefined;
}

/** Workspace role on a project (from project_members / pm_id / client_id). Used for sheet RBAC. */
export interface ProjectMemberEntry {
  profile_id: string;
  workspace_role: string;
}

export interface Project {
  id: string;
  team_id?: string;
  name: string;
  name_ja: string;
  nameJa?: string; // Keep for static data compatibility
  client: string;
  pm_id: string | null;
  assignedDevIds: string[]; // From project_members join (workspace_role = dev)
  /** All project_members rows with roles (for resolving the current user project role). */
  projectMemberEntries?: ProjectMemberEntry[];
  client_id: string | null;
  description: string;
  description_ja: string;
  color: string;
  status: 'active' | 'completed' | 'on_hold';
  background: string;
  background_ja: string;
  purpose: string;
  purpose_ja: string;
  dev_period: string;
  workspace_type: AccountKind;
  owner_id: string | null;
  created_at: string;
}

export interface ExportOptions {
  format: 'pdf' | 'csv';
  columns: string[];
}
