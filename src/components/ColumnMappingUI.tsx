import { useState, useMemo } from 'react';
import { ChevronRight, X, Loader } from 'lucide-react';
import type { SheetTab, SheetRow, ImportValidationPreview } from '@/types';
import { validateAndMapImportRows } from '@/actions/rows';

interface Props {
  tab: SheetTab;
  projectId: string;
  excelColumns: string[];
  excelRows: Record<string, unknown>[];
  onBack: () => void;
  onMappingComplete: (result: ImportValidationPreview) => void;
  onClose: () => void;
}

export function ColumnMappingUI({
  tab,
  projectId,
  excelColumns,
  excelRows,
  onBack,
  onMappingComplete,
  onClose,
}: Props) {
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');

  const sheetColumns = useMemo(() => {
    return tab.columns.map(c => ({
      key: c.key,
      label: c.label,
      type: c.type,
    }));
  }, [tab]);

  // Try to auto-match columns by name similarity
  const suggestMapping = () => {
    const mapping: Record<string, string> = {};
    excelColumns.forEach(excelCol => {
      const excelLower = excelCol.toLowerCase();
      const match = sheetColumns.find(
        sc => sc.key.toLowerCase() === excelLower || sc.label.toLowerCase() === excelLower
      );
      if (match) {
        mapping[excelCol] = match.key;
      }
    });
    setColumnMapping(mapping);
  };

  const handleMapColumn = (excelCol: string, sheetColKey: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [excelCol]: sheetColKey,
    }));
  };

  const handleUnmapColumn = (excelCol: string) => {
    setColumnMapping(prev => {
      const next = { ...prev };
      delete next[excelCol];
      return next;
    });
  };

  const handleValidateAndContinue = async () => {
    setValidating(true);
    setError('');
    
    try {
      // Convert excelRows to plain objects (XLSX objects have methods that can't be serialized)
      const plainRows = excelRows.map(row => JSON.parse(JSON.stringify(row)));
      
      const result = await validateAndMapImportRows(
        projectId,
        tab.id,
        plainRows,
        columnMapping
      );

      onMappingComplete({
        allRows: result.allRows,
        previewRows: result.previewRows,
        conflicts: result.conflicts,
        columnMapping,
        totalRows: result.totalRows,
        duplicateCount: result.duplicateCount,
      });
    } catch (err: any) {
      setError(err.message || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const mappedCount = Object.keys(columnMapping).length;
  const allMapped = mappedCount === excelColumns.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-surface-700">
          <div>
            <h2 className="text-lg font-semibold text-white">Map Columns</h2>
            <p className="text-xs text-gray-500">Connect file columns to sheet fields, then review the full file before upload</p>
          </div>
          <button onClick={onBack} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-surface-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* File Columns */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">File Columns</h3>
              <div className="space-y-2">
                {excelColumns.map(col => (
                  <div
                    key={col}
                    className="p-2 bg-surface-800 rounded border border-surface-700 text-xs text-gray-300"
                  >
                    {col}
                  </div>
                ))}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center">
              <ChevronRight className="w-5 h-5 text-brand-500" />
            </div>

            {/* Sheet Columns */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Sheet Columns</h3>
              <div className="space-y-2">
                {sheetColumns.map(col => (
                  <div
                    key={col.key}
                    className="p-2 bg-surface-800 rounded border border-surface-700 text-xs text-gray-300"
                  >
                    {col.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mapping Controls */}
          <div className="border-t border-surface-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300">
                Mapping: {mappedCount} / {excelColumns.length}
              </h3>
              <button
                onClick={suggestMapping}
                className="text-xs px-3 py-1.5 bg-surface-800 hover:bg-surface-700 text-gray-300 rounded transition-colors"
              >
                Auto-Suggest
              </button>
            </div>

            <div className="space-y-3">
              {excelColumns.map(excelCol => {
                const sheetColKey = columnMapping[excelCol];
                const sheetCol = sheetColumns.find(c => c.key === sheetColKey);
                
                return (
                  <div key={excelCol} className="flex items-center gap-2">
                    <div className="flex-1 p-2 bg-surface-800 rounded border border-surface-700 text-xs text-gray-300 truncate">
                      {excelCol}
                    </div>
                    <select
                      value={sheetColKey || ''}
                      onChange={e => {
                        if (e.target.value) {
                          handleMapColumn(excelCol, e.target.value);
                        } else {
                          handleUnmapColumn(excelCol);
                        }
                      }}
                      className="flex-1 bg-surface-800 border border-surface-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    >
                      <option value="">— Not Mapped (skip) —</option>
                      {sheetColumns.map(col => (
                        <option key={col.key} value={col.key}>
                          {col.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data Preview */}
          <div className="border-t border-surface-700 mt-6 pt-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Preview (first 3 rows)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-surface-700">
                    {excelColumns.map(col => (
                      <th
                        key={col}
                        className="px-2 py-2 text-left text-gray-400 font-medium whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {excelRows.slice(0, 3).map((row, idx) => (
                    <tr key={idx} className="border-b border-surface-800 hover:bg-surface-800/50">
                      {excelColumns.map(col => (
                        <td key={`${idx}-${col}`} className="px-2 py-2 text-gray-400 truncate max-w-xs">
                          {String(row[col] ?? '')}
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
            ← Back
          </button>
          <button
            onClick={handleValidateAndContinue}
            disabled={mappedCount === 0 || validating}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-all"
          >
            {validating ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                Preview Import →
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
