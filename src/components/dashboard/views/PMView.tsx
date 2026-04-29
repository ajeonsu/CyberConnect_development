import { useState } from 'react';
import type { Project, SheetRow } from '@/types';
import { FolderOpen, Plus, Circle, Pause, CheckCircle } from 'lucide-react';
import { getUserName, getLocalizedProjectName, translate, type Language } from '@/lib/data';
import { DashboardLanguageToggle } from '@/components/dashboard/DashboardLanguageToggle';

interface Props {
  projects: Project[];
  getTaskStats: (projectId: string) => { total: number; done: number; inProgress: number; notStarted: number };
  onSelectProject: (projectId: string) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

const statusMeta: Record<Project['status'], { icon: typeof Circle; color: string; labelKey: string }> = {
  active: { icon: Circle, color: 'text-emerald-400', labelKey: 'Active' },
  completed: { icon: CheckCircle, color: 'text-brand-400', labelKey: 'Completed' },
  on_hold: { icon: Pause, color: 'text-amber-400', labelKey: 'On Hold' },
};

export function PMView({ projects, getTaskStats, onSelectProject, language, onLanguageChange }: Props) {
  if (projects.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-950/20">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 bg-surface-900 rounded-3xl border border-surface-800 flex items-center justify-center mx-auto mb-6 shadow-xl">
            <FolderOpen className="w-10 h-10 text-gray-700" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{translate('No projects assigned as PM', language)}</h2>
          <p className="text-gray-500 max-w-sm mx-auto">
            {translate("You currently don't have any projects where you are assigned as the Project Manager.", language)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-10 bg-surface-950/20">
      <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{translate('Project Management', language)}</h1>
            <p className="text-gray-500 mt-1.5 flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
              {translate('Active Projects — Your assigned management dashboard', language)}
            </p>
          </div>
          <DashboardLanguageToggle language={language} onLanguageChange={onLanguageChange} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map(project => {
            const st = statusMeta[project.status];
            const StIcon = st.icon;
            const stats = getTaskStats(project.id);
            const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

            return (
              <div key={project.id} className="group relative" onClick={() => onSelectProject(project.id)}>
                <div className="h-full bg-surface-900/40 hover:bg-surface-900/60 backdrop-blur-sm border border-surface-800/60 rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-brand-500/5 hover:-translate-y-1 cursor-pointer">
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${project.color} flex items-center justify-center shadow-lg transition-transform group-hover:scale-105`}>
                        <FolderOpen className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg group-hover:text-brand-300 transition-colors leading-tight">{getLocalizedProjectName(project, language)}</h3>
                        <p className="text-gray-500 text-xs font-medium mt-0.5">{project.client}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-surface-950/40 ${st.color} border border-surface-800/60`}>
                      <StIcon className="w-2.5 h-2.5" />
                      <span>{translate(st.labelKey, language)}</span>
                    </div>
                  </div>

                  <p className="text-gray-400 text-sm mb-6 leading-relaxed line-clamp-2">{project.description}</p>

                  <div className="mb-6">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider mb-2">
                      <span className="text-gray-500">{translate('Overall Progress', language)}</span>
                      <span className="text-white">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-surface-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-brand-600 to-indigo-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-surface-950/20 p-3 rounded-xl border border-surface-800/40">
                      <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">{translate('Done', language)}</div>
                      <div className="text-white font-bold text-sm">{stats.done}</div>
                    </div>
                    <div className="bg-surface-950/20 p-3 rounded-xl border border-surface-800/40">
                      <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">{translate('In Dev', language)}</div>
                      <div className="text-amber-400 font-bold text-sm">{stats.inProgress}</div>
                    </div>
                    <div className="bg-surface-950/20 p-3 rounded-xl border border-surface-800/40">
                      <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">{translate('Pending', language)}</div>
                      <div className="text-gray-400 font-bold text-sm">{stats.notStarted}</div>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 rounded-2xl ring-2 ring-brand-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
