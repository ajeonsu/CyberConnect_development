import type { SheetTab, SheetRow, Project } from '@/types';
import {
  getProjectDevelopers,
  getTaskAssigneeProfileIdForProject,
  translate,
  getLocalizedCell,
  getLocalizedColumnLabel,
  getLocalizedTabName,
  type Language,
  type ProjectSheetRole,
  getClientRemarkColumnKeys,
  isTasksTab,
} from '@/lib/data';
import { X, Save } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Props {
  tab: SheetTab;
  row: SheetRow;
  project: Project | null;
  projectSheetRole: ProjectSheetRole;
  language: Language;
  onClose: () => void;
  onUpdate: (updates: Partial<SheetRow>) => void;
}

const readOnlyControlClass =
  'opacity-50 cursor-not-allowed bg-surface-850/80 border-surface-800 text-gray-400 pointer-events-none';

export function SheetRowDetail({
  tab,
  row,
  project,
  projectSheetRole,
  language,
  onClose,
  onUpdate,
}: Props) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const next: Record<string, unknown> = { ...row };
    if (isTasksTab(tab.id)) {
      const aid = getTaskAssigneeProfileIdForProject(row, project);
      next.assignee = aid ?? '';
      next.assignee_id = aid ?? null;
    }
    setFormData(next);
  }, [row, tab.id, project?.id, project?.workspace_type, (project?.assignedDevIds ?? []).join(',')]);

  const devNonTaskLock = projectSheetRole === 'dev' && !isTasksTab(tab.id);
  const clientRemarkKeys = getClientRemarkColumnKeys(tab.id);
  const clientRemarkOnly = projectSheetRole === 'client';
  const oppositeLanguage: Language = language === 'en' ? 'ja' : 'en';

  const showSave =
    !devNonTaskLock &&
    (!clientRemarkOnly || clientRemarkKeys.length > 0);

  const canEditField = (colKey: string) => {
    if (devNonTaskLock) return false;
    if (clientRemarkOnly) return clientRemarkKeys.includes(colKey);

    if (projectSheetRole === 'pm') return true;
    if (projectSheetRole === 'dev' && isTasksTab(tab.id)) {
      const c = tab.columns.find(c => c.key === colKey);
      // Assignee is read-only for developers
      if (c?.type === 'assignee') return false;
      return c?.editable ?? false;
    }
    return false;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSave) return;
    onUpdate(formData as SheetRow);
  };

  const codeCol = tab.columns.find(c => c.type === 'code');
  const codeValue = codeCol ? row[codeCol.key] : null;

  return (
    <div className="w-[420px] bg-surface-900 border-l border-surface-700 flex flex-col animate-slide-in shrink-0 h-full overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700 bg-surface-850/50">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-1.5 h-4 bg-brand-500 rounded-full shrink-0" />
          <span className="text-sm font-medium text-white truncate">
            {getLocalizedTabName(tab, language)}
          </span>
          {codeValue && (
            <span className="font-mono text-[10px] bg-surface-800 px-2 py-0.5 rounded text-brand-300 border border-surface-700 shrink-0">
              {String(codeValue)}
            </span>
          )}
          {(devNonTaskLock || (clientRemarkOnly && !showSave)) && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-800 text-gray-400 border border-surface-700 shrink-0">
              View only
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-surface-800 shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {tab.columns.map(col => {
            const value = String(formData[col.key] ?? '');
            const displayValue = getLocalizedCell(formData as SheetRow, col.key, language);
            const editable = canEditField(col.key);
            const lockedVisual = !editable && (clientRemarkOnly || devNonTaskLock);
            const readonlyDisplay =
              col.type === 'status' || col.type === 'select'
                ? translate(value, language)
                : displayValue || '';

            return (
              <div key={col.key}>
                <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-2">
                  <span className="flex flex-col">
                    <span>{getLocalizedColumnLabel(col, language)}</span>
                    <span className="text-[10px] text-gray-600">
                      {getLocalizedColumnLabel(col, oppositeLanguage)}
                    </span>
                  </span>
                  {editable && clientRemarkOnly && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Editable
                    </span>
                  )}
                </label>

                {editable && col.type === 'assignee' ? (
                  <select
                    value={value}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, [col.key]: e.target.value }))
                    }
                    className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  >
                    <option value="">{translate('Unassigned', language)}</option>
                    {getProjectDevelopers(project).map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                ) : editable && (col.type === 'status' || col.type === 'select') && col.options ? (
                  <select
                    value={value}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, [col.key]: e.target.value }))
                    }
                    className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  >
                    {col.options.map(o => (
                      <option key={o} value={o}>
                        {translate(o, language)}
                      </option>
                    ))}
                  </select>
                ) : editable && col.type === 'longtext' ? (
                  <textarea
                    value={value}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, [col.key]: e.target.value }))
                    }
                    rows={4}
                    className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-none"
                  />
                ) : editable && col.type !== 'code' ? (
                  <input
                    type={
                      col.type === 'number'
                        ? 'number'
                        : col.type === 'date'
                          ? 'date'
                          : 'text'
                    }
                    value={value}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, [col.key]: e.target.value }))
                    }
                    className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  />
                ) : lockedVisual && col.type === 'longtext' ? (
                  <textarea
                    disabled
                    readOnly
                    value={readonlyDisplay}
                    rows={4}
                    className={`w-full rounded-lg px-3 py-2 text-sm resize-none border ${readOnlyControlClass}`}
                  />
                ) : lockedVisual &&
                  (col.type === 'assignee' ||
                    col.type === 'status' ||
                    col.type === 'select') ? (
                  <select
                    disabled
                    value={value}
                    className={`w-full rounded-lg px-3 py-2 text-sm border ${readOnlyControlClass}`}
                  >
                    <option value={value}>
                      {col.type === 'assignee'
                        ? displayValue || translate('Unassigned', language)
                        : readonlyDisplay || '—'}
                    </option>
                  </select>
                ) : lockedVisual && col.type !== 'code' ? (
                  <input
                    disabled
                    readOnly
                    type={
                      col.type === 'number'
                        ? 'number'
                        : col.type === 'date'
                          ? 'date'
                          : 'text'
                    }
                    value={readonlyDisplay}
                    className={`w-full rounded-lg px-3 py-2 text-sm border ${readOnlyControlClass}`}
                  />
                ) : (
                  <p className="text-sm text-gray-300 bg-surface-850 rounded-lg px-3 py-2 border border-surface-800 whitespace-pre-wrap min-h-[36px] font-mono">
                    {col.type === 'status' || col.type === 'select' ? (
                      translate(value, language) || (
                        <span className="text-gray-600 italic">—</span>
                      )
                    ) : displayValue ? (
                      displayValue
                    ) : (
                      <span className="text-gray-600 italic">—</span>
                    )}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-5 border-t border-surface-700 bg-surface-900 flex items-center gap-3 shrink-0">
          {showSave ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg border border-surface-700 text-gray-300 hover:text-white hover:bg-surface-800 transition-all font-medium text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20 active:scale-95 text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                Save Changes
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2 rounded-lg border border-surface-700 text-gray-200 hover:text-white hover:bg-surface-800 transition-all font-medium text-xs"
            >
              Close
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
