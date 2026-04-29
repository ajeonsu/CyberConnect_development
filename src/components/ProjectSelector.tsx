import { useState } from 'react';
import type { Project, UserRole, AccountKind } from '@/types';
import { FolderOpen, Plus, Circle, Pause, CheckCircle, X, Sparkles, UserPlus, Trash2 } from 'lucide-react';
import { getUserName, getProfilesByRole, getAssignableTeamProfiles } from '@/lib/data';
import { UpgradeModal } from './UpgradeModal';

const statusIcon: Record<Project['status'], { icon: typeof Circle; color: string; label: string }> = {
  active: { icon: Circle, color: 'text-emerald-400', label: 'Active' },
  completed: { icon: CheckCircle, color: 'text-brand-400', label: 'Completed' },
  on_hold: { icon: Pause, color: 'text-amber-400', label: 'On Hold' },
};

export function ProjectDashboard({
  projects,
  onSelectProject,
  mode = 'team',
  getTaskStats,
  onPersonalCreateProject,
  onUpgrade,
  onDeleteProject,
  onUpdateProject,
  userRole,
  accountKind,
}: {
  projects: Project[];
  onSelectProject: (id: string) => void;
  mode?: 'team' | 'personal';
  getTaskStats?: (projectId: string) => { total: number; done: number; inProgress: number; notStarted: number };
  onPersonalCreateProject?: (fields: { name: string; description: string }) => void;
  onUpgrade?: (teamName: string) => Promise<void>;
  onDeleteProject?: (projectId: string) => void;
  onUpdateProject?: (projectId: string, updates: Partial<Project>) => void;
  userRole?: UserRole;
  accountKind?: AccountKind;
}) {
  const [showModal, setShowModal] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showDeleteConfirmFor, setShowDeleteConfirmFor] = useState<string | null>(null);
  const [inviteFor, setInviteFor] = useState<{ projectId: string; role: 'pm' | 'dev' | 'client' } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const title = mode === 'personal' ? 'Your workspace' : 'Projects / プロジェクト';
  const subtitle =
    mode === 'personal'
      ? 'Create projects and track task progress here'
      : 'Select a project to manage requirements';

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !onPersonalCreateProject) return;
    
    setIsCreating(true);
    try {
      await onPersonalCreateProject({ name: newName.trim(), description: newDesc.trim() });
      setNewName('');
      setNewDesc('');
      setShowModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create project. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const showCreateButton = mode === 'personal' || (mode === 'team' && (userRole === 'admin' || userRole === 'pm'));
  const isTeam = accountKind === 'team';
  const isAdmin = userRole === 'admin';

  const handleInviteClick = (e: React.MouseEvent, projectId: string, role: 'pm' | 'dev' | 'client') => {
    e.stopPropagation();
    if (!isTeam) {
      setShowUpgrade(true);
    } else if (isAdmin) {
      setInviteFor({ projectId, role });
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8 text-white">
      <div className="max-w-4xl w-full animate-fade-in">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-gray-500 mt-1">{subtitle}</p>
            {mode === 'personal' && (
              <p className="text-emerald-500/80 text-xs mt-2">Personal space — managed by your private account.</p>
            )}
          </div>
          {mode === 'personal' && !isTeam && (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowUpgrade(true)}
                className="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 text-gray-300 rounded-xl text-xs font-bold transition-all border border-surface-700 active:scale-95"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Invite
              </button>
              <button 
                onClick={() => setShowUpgrade(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-brand-600/20 group active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                Go Team — Upgrade
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(project => {
            const st = statusIcon[project.status];
            const StIcon = st.icon;
            const stats = getTaskStats?.(project.id);
            const progress = stats && stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
            const canDelete = mode === 'personal' || userRole === 'admin';

            return (
              <div key={project.id} className="group relative">
                <div
                  className="w-full bg-surface-900 border border-surface-700 rounded-2xl p-5 text-left hover:border-brand-500/50 hover:bg-surface-850 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3 cursor-pointer" onClick={() => onSelectProject(project.id)}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${project.color} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                        <FolderOpen className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-sm group-hover:text-brand-300 transition-colors">{project.name}</h3>
                        <p className="text-gray-500 text-[10px]">{project.name_ja}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs ${st.color}`}>
                      <StIcon className="w-3 h-3" />
                      <span>{st.label}</span>
                    </div>
                  </div>

                  <p className="text-gray-400 text-sm mb-4 leading-relaxed line-clamp-2">{project.description}</p>

                  {stats && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-gray-500">Task Progress</span>
                        <span className="text-gray-400 font-medium">
                          {stats.done}/{stats.total} ({progress}%)
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-brand-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-surface-700 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">PM</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-300">{getUserName(project.pm_id || '')}</span>
                        {(!isTeam || isAdmin) && (
                          <button 
                            onClick={(e) => handleInviteClick(e, project.id, 'pm')}
                            className="text-[10px] text-gray-400 hover:text-white px-2 py-0.5 rounded bg-surface-800 border border-surface-700 transition-colors"
                          >
                            Invite
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">DEVS</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">
                          {(project.assignedDevIds || []).length > 0
                            ? (project.assignedDevIds || []).map(id => getUserName(id)).join(', ')
                            : 'None'
                          }
                        </span>
                        {(!isTeam || isAdmin) && (
                          <button 
                            onClick={(e) => handleInviteClick(e, project.id, 'dev')}
                            className="text-[10px] text-gray-400 hover:text-white px-2 py-0.5 rounded bg-surface-800 border border-surface-700 transition-colors"
                          >
                            Invite
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">CLIENT</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-300">{project.client}</span>
                        {(!isTeam || isAdmin) && (
                          <button 
                            onClick={(e) => handleInviteClick(e, project.id, 'client')}
                            className="text-[10px] text-gray-400 hover:text-white px-2 py-0.5 rounded bg-surface-800 border border-surface-700 transition-colors"
                          >
                            Invite
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-2">
                      {canDelete && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowDeleteConfirmFor(project.id); }}
                          className="text-xs text-rose-400 hover:text-white px-3 py-1 rounded bg-surface-800 border border-surface-700 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="absolute inset-0 rounded-2xl ring-2 ring-brand-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            );
          })}

          {showCreateButton && onPersonalCreateProject && (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="group bg-surface-900/50 border-2 border-dashed border-surface-700 rounded-2xl p-5 text-left hover:border-emerald-500/40 hover:bg-surface-850/50 transition-all duration-200 flex flex-col items-center justify-center min-h-[180px]"
            >
              <div className="w-10 h-10 rounded-xl bg-surface-800 border border-surface-700 flex items-center justify-center mb-3 group-hover:border-emerald-500/30 transition-colors">
                <Plus className="w-5 h-5 text-gray-500 group-hover:text-emerald-400" />
              </div>
              <span className="text-gray-500 text-sm font-medium group-hover:text-gray-300">New project</span>
              <span className="text-gray-600 text-xs mt-0.5">新規プロジェクト</span>
            </button>
          )}
        </div>
      </div>

      {showModal && onPersonalCreateProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">New project</h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-surface-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitNew} className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Project name</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required
                  placeholder="My roadmap"
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Description</label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={3}
                  placeholder="What are you building?"
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={!newName.trim() || isCreating}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Plus className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create project'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirmFor && (
        <DeleteConfirmModal
          project={projects.find(p => p.id === showDeleteConfirmFor)!}
          onClose={() => setShowDeleteConfirmFor(null)}
          onConfirm={(id) => {
            if (onDeleteProject) onDeleteProject(id);
            setShowDeleteConfirmFor(null);
          }}
        />
      )}

      {inviteFor && (
        <InviteModal
          initialRole={inviteFor.role}
          onClose={() => setInviteFor(null)}
          onInvite={(emails, role) => {
            if (onUpdateProject) {
              const resolved = emails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
              const updates: Partial<Project> = {};
              const addDevIds: string[] = [];
              const assignable = getAssignableTeamProfiles();
              const clients = getProfilesByRole('client');

              for (const em of resolved) {
                const u = assignable.find(p => p.email.toLowerCase() === em) || 
                          clients.find(p => p.email.toLowerCase() === em);
                if (!u) continue;
                if (role === 'pm') updates.pm_id = u.id;
                else if (role === 'dev') addDevIds.push(u.id);
                else if (role === 'client') updates.client_id = u.id;
              }

              if (addDevIds.length > 0) {
                const proj = projects.find(p => p.id === inviteFor.projectId);
                const merged = Array.from(new Set([...(proj?.assignedDevIds ?? []), ...addDevIds]));
                updates.assignedDevIds = merged;
              }

              onUpdateProject(inviteFor.projectId, updates);
              setInviteFor(null);
            }
          }}
        />
      )}

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} onUpgrade={onUpgrade || (async () => {})} />}
    </div>
  );
}

function InviteModal({ initialRole, onClose, onInvite }: { initialRole?: 'pm' | 'dev' | 'client'; onClose: () => void; onInvite: (emails: string, role: 'pm' | 'dev' | 'client') => void }) {
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState<'pm' | 'dev' | 'client'>(initialRole || 'dev');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onInvite(emails, role);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md p-6 animate-fade-in shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Invite to project</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-gray-400 mb-3">Enter comma-separated emails to invite. For demo emails use @gmail.com addresses.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Emails</label>
            <input value={emails} onChange={e => setEmails(e.target.value)} placeholder="angel@gmail.com, aj@gmail.com"
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Role</label>
            <select value={role} onChange={e => setRole(e.target.value as 'pm' | 'dev' | 'client')} className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-gray-200">
              <option value="developer">Developer</option>
              <option value="pm">Project Manager</option>
              <option value="client">Client</option>
            </select>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="text-sm px-3 py-2 rounded bg-surface-800 border border-surface-700 text-gray-300">Cancel</button>
            <button type="submit" className="text-sm px-3 py-2 rounded bg-brand-600 text-white">Invite</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ project, onClose, onConfirm }: { project: Project; onClose: () => void; onConfirm: (id: string) => void }) {
  const [word, setWord] = useState('');
  const [nameConfirm, setNameConfirm] = useState('');
  const canConfirm = word.trim().toLowerCase() === 'delete' && nameConfirm.trim() === project.name;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canConfirm) onConfirm(project.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md p-6 animate-fade-in shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">Delete project</h3>
          <p className="text-sm text-gray-400 mt-2">This will permanently delete the project and its data. To confirm, type <span className="font-mono text-sm">delete</span> and the project name <span className="font-medium">{project.name}</span>.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Type "delete"</label>
            <input value={word} onChange={e => setWord(e.target.value)} className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-gray-200" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Project name</label>
            <input value={nameConfirm} onChange={e => setNameConfirm(e.target.value)} placeholder={project.name} className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-gray-200" />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="text-sm px-3 py-2 rounded bg-surface-800 border border-surface-700 text-gray-300">Cancel</button>
            <button type="submit" disabled={!canConfirm} className={`text-sm px-3 py-2 rounded ${canConfirm ? 'bg-rose-500 text-white' : 'bg-surface-800 text-gray-400'}`}>Delete</button>
          </div>
        </form>
      </div>
    </div>
  );
}
