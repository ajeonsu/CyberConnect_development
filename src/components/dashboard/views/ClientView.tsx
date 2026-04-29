import type { Project, SheetRow } from '@/types';
import { Users, CheckCircle, BarChart, MessageSquare } from 'lucide-react';
import { getLocalizedProjectName, translate, type Language } from '@/lib/data';
import { DashboardLanguageToggle } from '@/components/dashboard/DashboardLanguageToggle';

interface Props {
  projects: Project[];
  getTaskStats: (projectId: string) => { total: number; done: number; inProgress: number; notStarted: number };
  sheetData: Record<string, Record<string, SheetRow[]>>;
  onSelectProject: (projectId: string) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

function tasksVerifiedLine(done: number, total: number, language: Language) {
  if (language === 'ja') return `${total}件中${done}件のタスクを確認済み`;
  return `${done} of ${total} tasks verified`;
}

export function ClientView({ projects, getTaskStats, sheetData, onSelectProject, language, onLanguageChange }: Props) {
  if (projects.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-950/20">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 bg-surface-900 rounded-3xl border border-surface-800 flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Users className="w-10 h-10 text-gray-700" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{translate('No projects accessible', language)}</h2>
          <p className="text-gray-500 max-w-sm mx-auto">
            {translate('You are not currently listed as a client for any active projects.', language)}
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
            <h1 className="text-3xl font-bold text-white tracking-tight">{translate('Client Portal', language)}</h1>
            <p className="text-gray-500 mt-1.5 flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              {translate('Project Oversight — Transparency and progress tracking', language)}
            </p>
          </div>
          <DashboardLanguageToggle language={language} onLanguageChange={onLanguageChange} />
        </div>

        <div className="grid grid-cols-1 gap-6 mb-12">
          {projects.map(project => {
            const stats = getTaskStats(project.id);
            const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
            const recentRemarks = (sheetData[project.id]?.['tasks'] || [])
              .filter(t => t.remark || t.remark_ja)
              .slice(0, 3);

            return (
              <div key={project.id} onClick={() => onSelectProject(project.id)} className="group relative cursor-pointer">
                <div className="bg-surface-900/40 border border-surface-800/60 rounded-3xl p-8 hover:bg-surface-900/60 transition-all shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-5">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${project.color} flex items-center justify-center shadow-lg transition-transform group-hover:scale-105`}>
                        <Users className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-xl group-hover:text-brand-300 transition-colors leading-tight">{getLocalizedProjectName(project, language)}</h3>
                        <p className="text-gray-500 text-sm mt-0.5">{translate('Primary Stakeholder Dashboard', language)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8 bg-surface-950/40 px-6 py-4 rounded-2xl border border-surface-800/60">
                      <div className="text-center">
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">{translate('Status', language)}</div>
                        <div className="text-emerald-400 font-bold text-sm flex items-center gap-1.5 justify-center">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {translate('Healthy', language)}
                        </div>
                      </div>
                      <div className="w-px h-8 bg-surface-800" />
                      <div className="text-center">
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">{translate('Completion', language)}</div>
                        <div className="text-white font-bold text-sm">{progress}%</div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-8">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-3">
                      <span className="text-gray-500 flex items-center gap-2">
                        <BarChart className="w-3.5 h-3.5" />
                        {translate('Development Milestone Progress', language)}
                      </span>
                      <span className="text-white">{tasksVerifiedLine(stats.done, stats.total, language)}</span>
                    </div>
                    <div className="w-full h-3 bg-surface-800 rounded-full overflow-hidden border border-surface-700/50 p-0.5">
                      <div className="h-full bg-gradient-to-r from-brand-600 to-indigo-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  {recentRemarks.length > 0 && (
                    <div className="pt-6 border-t border-surface-800/60">
                      <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-4 flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {translate('Recent Stakeholder Feedback & Remarks', language)}
                      </div>
                      <div className="space-y-3">
                        {recentRemarks.map((task, idx) => (
                          <div key={idx} className="bg-surface-950/20 px-4 py-3 rounded-xl border border-surface-800/40 text-sm">
                            <span className="text-brand-400 font-mono text-[10px] mr-2">[{task.task_code || 'TASK'}]</span>
                            <span className="text-gray-300">{String(task.remark || task.remark_ja)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 rounded-3xl ring-2 ring-brand-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
