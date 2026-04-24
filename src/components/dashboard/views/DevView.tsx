import { useState } from 'react';
import type { Project, SheetRow } from '@/types';
import { Code, CheckCircle, Clock, AlertTriangle, FileCode } from 'lucide-react';
import { getLocalizedCell, type Language } from '@/lib/data';

interface Props {
  projects: Project[];
  sheetData: Record<string, Record<string, SheetRow[]>>;
  onSelectProject: (projectId: string) => void;
  language: Language;
}

export function DevView({ projects, sheetData, onSelectProject, language }: Props) {
  if (projects.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-950/20">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 bg-surface-900 rounded-3xl border border-surface-800 flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Code className="w-10 h-10 text-gray-700" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">No developer assignments</h2>
          <p className="text-gray-500 max-w-sm mx-auto">
            You are not currently assigned to any team projects as a Developer.
          </p>
        </div>
      </div>
    );
  }

  const allAssignedTasks = projects.flatMap(p => {
    const tasks = sheetData[p.id]?.['tasks'] || [];
    return tasks.map(t => ({ ...t, projectName: p.name, projectId: p.id }));
  });

  const stats = {
    total: allAssignedTasks.length,
    done: allAssignedTasks.filter(t => (t as any).status === 'Done').length,
    inProgress: allAssignedTasks.filter(t => (t as any).status === 'In progress').length,
    blocked: allAssignedTasks.filter(t => (t as any).status === 'Blocked').length,
  };

  return (
    <div className="flex-1 overflow-auto p-10 bg-surface-950/20">
      <div className="max-w-6xl mx-auto animate-fade-in">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight">Developer Portal</h1>
          <p className="text-gray-500 mt-1.5 flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Engineering — Task oversight and assigned system components
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <StatMini label="Assigned Tasks" value={stats.total} icon={FileCode} color="text-brand-400" />
          <StatMini label="In Progress" value={stats.inProgress} icon={Clock} color="text-amber-400" />
          <StatMini label="Completed" value={stats.done} icon={CheckCircle} color="text-emerald-400" />
          <StatMini label="Blocked" value={stats.blocked} icon={AlertTriangle} color="text-rose-400" />
        </div>

        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">Assigned Projects</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {projects.map(project => (
            <div key={project.id} onClick={() => onSelectProject(project.id)} className="group relative cursor-pointer">
              <div className="bg-surface-900/40 border border-surface-800/60 rounded-2xl p-6 hover:bg-surface-900/60 transition-all shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${project.color} flex items-center justify-center shadow-lg transition-transform group-hover:scale-105`}>
                    <Code className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold group-hover:text-brand-300 transition-colors leading-tight">{project.name}</h3>
                    <p className="text-gray-500 text-xs font-medium mt-0.5">{project.client}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Primary Tech Stack</div>
                    <div className="flex flex-wrap gap-2">
                      {(sheetData[project.id]?.['tech_stack'] || []).slice(0, 4).map((tech, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-1 rounded bg-surface-800 border border-surface-700 text-gray-400">
                          {String(tech.tech_name || tech.category || 'Tool')}
                        </span>
                      ))}
                      {(sheetData[project.id]?.['tech_stack'] || []).length > 4 && (
                        <span className="text-[10px] text-gray-600">+{(sheetData[project.id]?.['tech_stack'] || []).length - 4} more</span>
                      )}
                      {(sheetData[project.id]?.['tech_stack'] || []).length === 0 && (
                        <span className="text-[10px] text-gray-600 italic">No stack defined yet</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 rounded-2xl ring-2 ring-brand-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatMini({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="bg-surface-900/60 border border-surface-800/60 rounded-2xl p-5 flex items-center gap-4">
      <div className={`p-2.5 rounded-xl bg-surface-950/40 border border-surface-800/60 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{label}</div>
        <div className="text-xl font-bold text-white leading-tight mt-0.5">{value}</div>
      </div>
    </div>
  );
}
