import { Eye, AlertTriangle, X } from 'lucide-react';
import type { SheetTab, ImportPreviewRow } from '@/types';
import { translate, type Language } from '@/lib/data';

const rowStyles: Record<ImportPreviewRow['previewStatus'], string> = {
  pass: 'bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/20',
  duplicate: 'bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/20',
  conflict: 'bg-red-500/10 hover:bg-red-500/15 border-red-500/20',
  duplicate_in_file: 'bg-orange-500/10 hover:bg-orange-500/15 border-orange-500/20',
  merge: 'bg-violet-500/10 hover:bg-violet-500/15 border-violet-500/25',
  no_match: 'bg-slate-600/15 hover:bg-slate-600/20 border-slate-500/20',
};

interface Props {
  tab: SheetTab;
  rows: ImportPreviewRow[];
  totalRows: number;
  /** Rows that will actually be inserted on Continue (no duplicates / conflicts / duplicate-in-file). */
  rowsToImportCount: number;
  duplicateCount: number;
  conflictCount: number;
  /** Merge-by-code preview: rows whose code is missing on the sheet. */
  noMatchCount?: number;
  mergeIntoExistingByCode?: boolean;
  language?: Language;
  onBack: () => void;
  onContinue: () => void;
  onClose: () => void;
}

export function ImportPreviewModal({
  tab,
  rows,
  totalRows,
  rowsToImportCount,
  duplicateCount,
  conflictCount,
  noMatchCount = 0,
  mergeIntoExistingByCode = false,
  language = 'en',
  onBack,
  onContinue,
  onClose,
}: Props) {
  const mergeRowCount = rows.filter((r) => r.previewStatus === 'merge').length;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-surface-700">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-brand-400" />
              Preview Import
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Review the full file below before continuing the batch upload.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-surface-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          <div
            className={`grid gap-4 ${mergeIntoExistingByCode ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6' : 'grid-cols-4'}`}
          >
            <div className="p-4 bg-surface-800 rounded-lg border border-surface-700">
              <p className="text-xs text-gray-500 mb-1">{translate('Rows in File', language)}</p>
              <p className="text-2xl font-semibold text-white">{totalRows}</p>
            </div>
            <div className="p-4 bg-surface-800 rounded-lg border border-surface-700">
              <p className="text-xs text-gray-500 mb-1">{translate('Ready to import', language)}</p>
              <p className="text-2xl font-semibold text-emerald-400">{rowsToImportCount}</p>
            </div>
            {mergeIntoExistingByCode && (
              <div className="p-4 bg-surface-800 rounded-lg border border-violet-500/30">
                <p className="text-xs text-gray-500 mb-1">{translate('Rows to update (merge)', language)}</p>
                <p className="text-2xl font-semibold text-violet-300">{mergeRowCount}</p>
              </div>
            )}
            <div className="p-4 bg-surface-800 rounded-lg border border-surface-700">
              <p className="text-xs text-gray-500 mb-1">{translate('Duplicates', language)}</p>
              <p className="text-2xl font-semibold text-amber-400">{duplicateCount}</p>
            </div>
            <div className="p-4 bg-surface-800 rounded-lg border border-surface-700">
              <p className="text-xs text-gray-500 mb-1">Conflicts</p>
              <p className="text-2xl font-semibold text-red-400">{conflictCount}</p>
            </div>
            {mergeIntoExistingByCode && (
              <div className="p-4 bg-surface-800 rounded-lg border border-slate-600/50">
                <p className="text-xs text-gray-500 mb-1">{translate('No matching code in sheet', language)}</p>
                <p className="text-2xl font-semibold text-slate-400">{noMatchCount}</p>
              </div>
            )}
          </div>

          {mergeIntoExistingByCode && (
            <div className="p-4 rounded-lg border border-violet-500/25 bg-violet-500/10 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-violet-300 mt-0.5 shrink-0" />
              <p className="text-xs text-violet-100/90">
                {translate(
                  'Merge mode: rows with a green/purple highlight update existing records; grey rows have no matching code and will be skipped.',
                  language
                )}
              </p>
            </div>
          )}

          {conflictCount > 0 && (
            <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-200">Conflicts detected</p>
                <p className="text-xs text-amber-100/80 mt-1">
                  You will choose how to handle duplicate rows after you continue.
                </p>
              </div>
            </div>
          )}

          <div className="border border-surface-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-700 bg-surface-950/60 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-200">All Rows</h3>
                <p className="text-xs text-gray-500">{tab.name} data from the uploaded file</p>
              </div>
              <p className="text-xs text-gray-500">Scroll to inspect every row</p>
            </div>

            <div className="overflow-auto max-h-[52vh]">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-surface-900">
                  <tr className="border-b border-surface-700">
                    <th className="px-3 py-2 text-left text-gray-500 font-medium sticky left-0 bg-surface-900 z-20">#</th>
                    {tab.columns.map(column => (
                      <th key={column.key} className="px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`border-b border-surface-800 transition-colors ${rowStyles[row.previewStatus]}`}
                    >
                      <td className="px-3 py-2 text-gray-500 sticky left-0 bg-inherit z-10 whitespace-nowrap">
                        {idx + 1}
                      </td>
                      {tab.columns.map(column => (
                        <td key={`${row.id}-${column.key}`} className="px-3 py-2 text-gray-300 whitespace-nowrap max-w-xs truncate">
                          {String(row[column.key] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="border-t border-surface-700 p-6 flex items-center justify-between bg-surface-950/50">
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            Back to Import
          </button>
          <button
            onClick={onContinue}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium text-sm transition-all"
          >
            Continue Upload →
          </button>
        </div>
      </div>
    </div>
  );
}