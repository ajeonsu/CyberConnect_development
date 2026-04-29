import { X, CheckCircle, AlertCircle } from 'lucide-react';
import type { SheetRow } from '@/types';

interface Props {
  successful: SheetRow[];
  failed: Array<{ rowData: Record<string, unknown>; reason: string }>;
  totalRows: number;
  duplicateCount: number;
  onClose: () => void;
}

export function ImportResults({ successful, failed, totalRows, duplicateCount, onClose }: Props) {
  const total = successful.length + failed.length;
  const successRate = totalRows > 0 ? Math.round((successful.length / totalRows) * 100) : 0;
  const otherNotUploadedCount = Math.max(totalRows - successful.length - duplicateCount, 0);
  const skippedRows = Math.max(totalRows - total, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-surface-700">
          <div>
            <h2 className="text-lg font-semibold text-white">Import Results</h2>
            <p className="text-xs text-gray-500 mt-1">
              {successful.length} uploaded of {totalRows} row(s)
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-surface-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-surface-800 rounded-lg border border-surface-700">
              <p className="text-xs text-gray-500 mb-1">Total Rows</p>
              <p className="text-2xl font-semibold text-white">{totalRows}</p>
            </div>
            <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
              <p className="text-xs text-gray-500 mb-1">Uploaded</p>
              <p className="text-2xl font-semibold text-emerald-400">{successful.length}</p>
            </div>
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
              <p className="text-xs text-gray-500 mb-1">Duplicates</p>
              <p className="text-2xl font-semibold text-red-400">{duplicateCount}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
              <p className="text-xs text-gray-500 mb-1">Not Uploaded</p>
              <p className="text-2xl font-semibold text-amber-400">{otherNotUploadedCount}</p>
            </div>
            <div className="p-4 bg-surface-800 rounded-lg border border-surface-700">
              <p className="text-xs text-gray-500 mb-1">Failed Validation</p>
              <p className="text-2xl font-semibold text-white">{failed.length}</p>
            </div>
          </div>

          {/* Success Rate Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-300">Success Rate</p>
              <p className="text-sm text-gray-500">{successRate}%</p>
            </div>
            <div className="w-full h-2 bg-surface-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${successRate === 100 ? 'bg-emerald-500' : successRate >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${successRate}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {otherNotUploadedCount > 0 || duplicateCount > 0
                ? `${duplicateCount} duplicate row(s) and ${otherNotUploadedCount} non-duplicate row(s) were not uploaded.`
                : 'All uploaded rows were processed.'}
            </p>
          </div>

          {/* Successful Rows */}
          {successful.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Imported Successfully ({successful.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {successful.map((row, idx) => (
                  <div key={idx} className="p-2 bg-surface-800 rounded text-xs text-gray-300">
                    <p className="truncate">
                      Row {idx + 1}: {Object.values(row).slice(0, 3).join(' • ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed Rows */}
          {failed.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Failed ({failed.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {failed.map((fail, idx) => (
                  <div key={idx} className="p-3 bg-red-500/10 rounded border border-red-500/30 text-xs">
                    <p className="text-red-300 font-medium mb-1">Row {idx + 1}</p>
                    <p className="text-red-400">{fail.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-surface-700 p-6 flex justify-end gap-2 bg-surface-950/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium text-sm transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
