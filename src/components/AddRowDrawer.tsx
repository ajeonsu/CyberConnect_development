import { useMemo, useState } from 'react';
import type { SheetTab, SheetRow, Project } from '@/types';
import { X, Save } from 'lucide-react';
import {
  getProjectDevelopers,
  generateCode,
  getBilingualRowFieldKey,
  getLocalizedColumnLabel,
  getLocalizedTabName,
  translate,
  type Language,
  type ProjectSheetRole,
  isTasksTab,
} from '@/lib/data';

interface Props {
  tab: SheetTab;
  projectId: string;
  project: Project | null;
  projectSheetRole: ProjectSheetRole;
  language: Language;
  onClose: () => void;
  onSave: (row: SheetRow) => void;
}

export function AddRowDrawer({ tab, projectId, project, projectSheetRole, language, onClose, onSave }: Props) {
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    tab.columns.forEach(c => {
      if (c.type === 'code') {
        const prefix = c.key === 'task_code' ? 'TSK' : c.key === 'screen_code' ? 'SCR' : c.key === 'function_code' ? 'FNC' : 'ITM';
        initial[c.key] = generateCode(prefix, projectId);
      } else if (c.type === 'status' && c.options?.length) {
        initial[c.key] = c.options[0];
      } else if (c.type === 'select' && c.options?.length) {
        initial[c.key] = c.options[0];
      } else {
        initial[c.key] = '';
      }

      const jaKey = getBilingualRowFieldKey(tab.id, c.key);
      if (jaKey) {
        initial[jaKey] = '';
      }
    });
    return initial;
  });

  const fieldSpecs = useMemo(() => {
    return tab.columns.map(col => ({
      col,
      jaKey: getBilingualRowFieldKey(tab.id, col.key),
    }));
  }, [tab]);

  const canEditField = (colKey: string) => {
    if (projectSheetRole === 'pm') return true;
    if (projectSheetRole === 'dev' && isTasksTab(tab.id)) {
      const c = tab.columns.find(c => c.key === colKey);
      return c?.editable ?? false;
    }
    return false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newRow = {
      ...formData,
      id: crypto.randomUUID(),
      project_id: projectId,
      created_at: new Date().toISOString()
    } as SheetRow;
    onSave(newRow);
  };

  const renderFieldControl = (col: SheetTab['columns'][number], value: string, jaKey?: string) => {
    const setValue = (nextValue: string) => {
      const key = jaKey ?? col.key;
      setFormData(prev => ({ ...prev, [key]: nextValue }));
    };

    const editable = canEditField(col.key);

    if (col.type === 'assignee') {
      return (
        <select
          value={value}
          onChange={e => setValue(e.target.value)}
          disabled={!editable}
          className={`w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${!editable ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <option value="">{translate('Unassigned', language)}</option>
          {getProjectDevelopers(project).map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      );
    }

    if (col.type === 'status' || col.type === 'select') {
      return (
        <select
          value={value}
          onChange={e => setValue(e.target.value)}
          disabled={!editable}
          className={`w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${!editable ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {(col.options ?? []).map(opt => (
            <option key={opt} value={opt}>{translate(opt, language)}</option>
          ))}
        </select>
      );
    }

    if (col.type === 'longtext') {
      return (
        <textarea
          rows={4}
          value={value}
          onChange={e => setValue(e.target.value)}
          disabled={!editable}
          className={`w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-none ${jaKey ? 'min-h-[100px]' : ''} ${!editable ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      );
    }

    return (
      <input
        type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
        value={value}
        onChange={e => setValue(e.target.value)}
        readOnly={col.type === 'code' || !editable}
        className={`w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${col.type === 'code' ? 'font-mono border-brand-500/30' : ''} ${!editable && col.type !== 'code' ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6" onClick={onClose}>
      <div
        className="w-full max-w-6xl max-h-[90vh] bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700 bg-surface-850/50">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 truncate">
            <span className="w-1.5 h-4 bg-brand-500 rounded-full shrink-0" />
            {translate('Add New', language)} {getLocalizedTabName(tab, language)}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-surface-800 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(90vh-64px)] overflow-hidden">
          <div className="overflow-y-auto p-5 custom-scrollbar space-y-4">
            {fieldSpecs.map(({ col, jaKey }) => {
              const value = formData[col.key] ?? '';
              const jaValue = jaKey ? (formData[jaKey] ?? '') : '';

              return (
                <div key={col.key} className="bg-surface-900 border border-surface-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="text-sm font-medium text-gray-200">
                        {getLocalizedColumnLabel(col, language)}
                      </div>
                      <div className="mt-0.5 text-[10px] text-gray-600 font-mono">
                        {col.key}
                      </div>
                    </div>
                    {jaKey && (
                      <span className="text-[10px] px-2 py-1 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20">
                        EN / JA
                      </span>
                    )}
                  </div>

                  {jaKey ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <div className="mb-1 text-[10px] uppercase tracking-widest text-gray-500">
                          English
                        </div>
                        {renderFieldControl(col, value)}
                      </div>
                      <div>
                        <div className="mb-1 text-[10px] uppercase tracking-widest text-gray-500">
                          Japanese
                        </div>
                        {renderFieldControl(col, jaValue, jaKey)}
                      </div>
                    </div>
                  ) : (
                    renderFieldControl(col, value)
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-5 border-t border-surface-700 bg-surface-900 flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-surface-700 text-gray-300 hover:text-white hover:bg-surface-800 transition-all font-medium text-xs"
            >
              {translate('Cancel', language)}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20 active:scale-95 text-xs"
            >
              <Save className="w-3.5 h-3.5" />
              {translate('Save Row', language)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
