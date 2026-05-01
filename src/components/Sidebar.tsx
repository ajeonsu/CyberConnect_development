'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import type { UserRole, UserProfile, SheetTab, Project, TeamMembership } from '@/types';
import {
  ChevronLeft, ChevronRight, LogOut, FolderOpen, ArrowLeft, BarChart3,
  FileText, Server, ShieldCheck, Monitor, Puzzle, CheckSquare,
  FlaskConical, Plug, ListTodo, GanttChart, Calendar, Building2, UserRound,
  ChevronDown, Check,
} from 'lucide-react';
import { getLocalizedProjectName, getLocalizedTabName, type Language } from '@/lib/data';
import { WorkspaceInfoModal } from '@/components/WorkspaceInfoModal';

type WorkspaceScope = 'team' | 'personal';

interface Props {
  role: UserRole;
  user: UserProfile;
  activeTabId: string;
  visibleTabs: SheetTab[];
  onTabChange: (tabId: string) => void;
  workspaceScope?: WorkspaceScope;
  onWorkspaceScopeChange?: (scope: WorkspaceScope) => void;
  teamMemberships?: TeamMembership[];
  onSwitchTeam?: (teamSlug: string) => void;
  onLogout: () => void;
  activeProject: Project | null;
  onBackToProjects: () => void;
  getTabRowCount: (tabId: string) => number;
  showAdminDashboard: boolean;
  language: Language;
  onUpdatePersonalProfile: (updates: { name: string; department: string }) => Promise<void>;
  onUpdateCurrentTeam: (updates: { name?: string }) => Promise<void>;
  onRegenerateCurrentTeamInviteCode: () => Promise<string>;
}

const iconMap: Record<string, typeof FileText> = {
  FileText, Server, ShieldCheck, Monitor, Puzzle, CheckSquare,
  FlaskConical, Plug, ListTodo, GanttChart, Calendar,
};

const roleColors: Record<string, string> = {
  admin: 'bg-red-600',
  pm: 'bg-brand-600',
  dev: 'bg-emerald-600',
  client: 'bg-amber-600',
  personal: 'bg-indigo-600',
};

export function Sidebar({
  role,
  user,
  activeTabId,
  visibleTabs,
  onTabChange,
  workspaceScope,
  onWorkspaceScopeChange,
  teamMemberships = [],
  onSwitchTeam,
  onLogout,
  activeProject,
  onBackToProjects,
  getTabRowCount,
  showAdminDashboard,
  language,
  onUpdatePersonalProfile,
  onUpdateCurrentTeam,
  onRegenerateCurrentTeamInviteCode,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [showWorkspaceInfoModal, setShowWorkspaceInfoModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // URL-Based Scope State
  const activeScope: WorkspaceScope = pathname.startsWith('/personal') ? 'personal' : 'team';
  
  const activeRole = user.activeWorkspaceRole || role;
  /** Path segment for this layout (must match URL). */
  const routeRole = role;

  const currentTeam = teamMemberships.find(m => m.team?.slug === user.activeTeamSlug)?.team 
    || teamMemberships[0]?.team;
  const currentTeamMembership = teamMemberships.find(m => m.team?.slug === user.activeTeamSlug)
    || teamMemberships.find(m => m.team?.slug === currentTeam?.slug);
  const currentTeamName = currentTeam?.name || 'Main Team';
  const currentTeamSlug = currentTeam?.slug || user.activeTeamSlug || 'my-team';

  const pathTeamSlug = !pathname.startsWith('/personal') ? pathname.split('/').filter(Boolean)[0] : undefined;
  const membershipForSlug =
    teamMemberships.find(m => m.team?.slug === user.activeTeamSlug) ||
    teamMemberships.find(m => m.team?.slug === pathTeamSlug);
  const roleLine =
    activeScope === 'personal'
      ? 'Personal'
      : membershipForSlug?.team?.owner_id === user.id
        ? 'Owner'
        : membershipForSlug?.role === 'admin'
          ? 'Company Admin'
          : 'Team member';
  const canSeeInviteCode = activeScope === 'team' && currentTeamMembership?.role === 'admin';

  // Handle outside click for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowWorkspaceDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTeam = (slug: string) => {
    setShowWorkspaceDropdown(false);
    if (activeScope === 'team' && user.activeTeamSlug === slug) return;
    if (onSwitchTeam) {
      onSwitchTeam(slug);
    } else {
      router.push(`/switch-role?team=${slug}`);
    }
  };

  const handleSelectPersonal = () => {
    setShowWorkspaceDropdown(false);
    if (activeScope === 'personal') return;
    router.push('/personal/dashboard');
  };

  const projectBasePath = activeScope === 'personal' ? '/personal' : `/${currentTeamSlug}/${routeRole}`;
  /** Role dashboards live at /[slug]/[role]/dashboard; there is no /projects index route for pm/dev/client. */
  const projectBackHref =
    activeScope === 'personal' ? '/personal/dashboard' : `${projectBasePath}/dashboard`;

  return (
    <div className="w-60 bg-surface-900 border-r border-surface-700 flex flex-col transition-all duration-200 shrink-0 relative">
      <div className="p-4 flex items-center gap-3 border-b border-surface-700 relative" ref={dropdownRef}>
        <div 
          onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
          className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
        >
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${activeScope === 'personal' ? 'from-emerald-500 to-emerald-700' : 'from-brand-500 to-brand-700'} flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform`}>
            {activeScope === 'personal' ? <UserRound className="w-4 h-4 text-white" /> : <Building2 className="w-4 h-4 text-white" />}
          </div>
          <button
            type="button"
            onClick={() => setShowWorkspaceInfoModal(true)}
            className="min-w-0 flex-1 text-left"
          >
            <h2 className="text-white font-semibold text-sm truncate flex items-center gap-1.5">
              {activeScope === 'personal' ? 'Personal Space' : currentTeamName}
            </h2>
            <p className="text-gray-500 text-[10px] truncate">{activeScope === 'personal' ? 'Individual' : 'Professional'}</p>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
          className="text-gray-500 hover:text-gray-300 transition-colors shrink-0"
        >
          <ChevronDown className={`w-3 h-3 transition-transform ${showWorkspaceDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showWorkspaceDropdown && (
          <div className="absolute top-[calc(100%-8px)] left-4 right-4 z-50 mt-2 py-1.5 bg-surface-800 border border-surface-700 rounded-xl shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="px-2 pb-1.5 mb-1.5 border-b border-surface-700/50">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2">Workspaces</p>
            </div>
            <button
              onClick={handleSelectPersonal}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-700/50 transition-colors ${activeScope === 'personal' ? 'text-brand-400' : 'text-gray-300'}`}
            >
              <div className={`w-6 h-6 rounded flex items-center justify-center ${activeScope === 'personal' ? 'bg-emerald-500/20' : 'bg-surface-700'}`}>
                <UserRound className={`w-3.5 h-3.5 ${activeScope === 'personal' ? 'text-emerald-400' : 'text-gray-400'}`} />
              </div>
              <span className="text-xs font-medium flex-1">Personal Space</span>
              {activeScope === 'personal' && <Check className="w-3.5 h-3.5" />}
            </button>
            {teamMemberships.length === 0 && activeScope === 'team' && (
              <div className="px-3 py-2 text-xs text-gray-500 italic">No teams found</div>
            )}

            {teamMemberships.map(m => (
              <button
                key={m.team_id}
                onClick={() => handleSelectTeam(m.team?.slug || 'my-team')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-700/50 transition-colors ${activeScope === 'team' && user.activeTeamSlug === m.team?.slug ? 'text-brand-400' : 'text-gray-300'}`}
              >
                <div className={`w-6 h-6 rounded flex items-center justify-center ${activeScope === 'team' && user.activeTeamSlug === m.team?.slug ? 'bg-brand-500/20' : 'bg-surface-700'}`}>
                  <Building2 className={`w-3.5 h-3.5 ${activeScope === 'team' && user.activeTeamSlug === m.team?.slug ? 'text-brand-400' : 'text-gray-400'}`} />
                </div>
                <span className="text-xs font-medium flex-1 truncate">{m.team?.name || 'Unnamed Team'}</span>
                {activeScope === 'team' && user.activeTeamSlug === m.team?.slug && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-2.5 border-b border-surface-700">
        <div className="flex items-center gap-2.5">
          <div className={`w-6 h-6 rounded-full ${roleColors[activeRole] || 'bg-surface-700'} flex items-center justify-center shrink-0 shadow-inner`}>
            <span className="text-white text-[9px] font-bold">{user.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-gray-300 text-xs font-medium truncate">{user.name}</p>
            <p className="text-gray-600 text-[10px] truncate uppercase tracking-tight">{roleLine}</p>
          </div>
        </div>
      </div>

      {activeProject && (
        <div className="px-2 pt-2">
          <Link
            href={projectBackHref}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all bg-surface-800 border border-surface-700 hover:border-brand-500/30 group"
          >
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${activeProject.color} flex items-center justify-center shrink-0`}>
              <FolderOpen className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-gray-500">Project</div>
              <div className="text-xs font-medium text-white truncate">{getLocalizedProjectName(activeProject, language)}</div>
            </div>
            <ArrowLeft className="w-3.5 h-3.5 text-gray-600 group-hover:text-brand-400 transition-colors" />
          </Link>
        </div>
      )}

      <WorkspaceInfoModal
        open={showWorkspaceInfoModal}
        scope={activeScope}
        user={user}
        team={currentTeam ?? null}
        canSeeInviteCode={canSeeInviteCode}
        onClose={() => setShowWorkspaceInfoModal(false)}
        onSavePersonal={onUpdatePersonalProfile}
        onSaveTeam={onUpdateCurrentTeam}
        onRegenerateInvite={onRegenerateCurrentTeamInviteCode}
      />

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {routeRole === 'admin' && !showAdminDashboard && (
          <Link
            href={`${projectBasePath}/dashboard`}
            className={`flex items-center gap-2 px-3 py-3 mb-2 rounded-lg border transition-all ${
              pathname === `${projectBasePath}/dashboard`
                ? 'bg-brand-600/15 border-brand-500/30 text-brand-300'
                : 'bg-transparent border-transparent text-gray-400 hover:bg-surface-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium">Admin Dashboard</div>
              <p className="text-[10px] text-gray-500">Global overview</p>
            </div>
          </Link>
        )}

        {activeProject ? (
          visibleTabs.map(tab => {
            const Icon = iconMap[tab.icon] ?? FileText;
            const isActive = activeTabId === tab.id;
            const count = tab.isSpecialView ? null : getTabRowCount(tab.id);

            return (
              <Link
                key={tab.id}
                href={`${projectBasePath}/projects/${activeProject.id}/${tab.id}`}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                  isActive
                    ? 'bg-brand-600/15 text-brand-300'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-surface-800'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand-400' : ''}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">{getLocalizedTabName(tab, language)}</div>
                </div>
                {count !== null && count > 0 && (
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-brand-500/20 text-brand-300' : 'bg-surface-800 text-gray-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })
        ) : (
          <div className="px-3 py-8 text-center">
            <FolderOpen className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">
              {pathname === projectBackHref ? 'Management overview' : 'Select a project'}
            </p>
            <p className="text-gray-600 text-xs mt-0.5">プロジェクトを選択</p>
          </div>
        )}
      </nav>

      <div className="p-2 border-t border-surface-700 space-y-0.5">
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="text-xs">Logout</span>
        </button>
      </div>
    </div>
  );
}
