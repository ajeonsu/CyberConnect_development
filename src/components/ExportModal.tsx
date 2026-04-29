import { useState } from 'react';
import type { SheetTab, SheetRow } from '@/types';
import { X, FileText, Table, Download, Check } from 'lucide-react';

interface Props {
  tab: SheetTab;
  rows: SheetRow[];
  onClose: () => void;
}

export function ExportModal({ tab, rows, onClose }: Props) {
  const [format, setFormat] = useState<'pdf' | 'csv'>('csv');
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const handleExport = () => {
    setExporting(true);

    if (format === 'csv') {
      const headers = tab.columns.map(c => c.label);
      const csvRows = rows.map(r => tab.columns.map(c => r[c.key] ?? ''));
      const bom = '\uFEFF';
      const csvContent = bom + [headers, ...csvRows].map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tab.id}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }

    setTimeout(() => {
      setExporting(false);
      setExported(true);
      setTimeout(() => setExported(false), 2000);
    }, format === 'csv' ? 200 : 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md p-6 animate-fade-in shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Export: {tab.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{tab.nameJa}のエクスポート</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-surface-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Format / フォーマット</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat('csv')}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  format === 'csv' ? 'border-brand-500 bg-brand-500/10 text-brand-300' : 'border-surface-700 text-gray-400 hover:border-surface-200'
                }`}
              >
                <Table className="w-5 h-5" />
                <div className="text-left">
                  <div className="text-sm font-medium">CSV</div>
                  <div className="text-xs opacity-60">Spreadsheet</div>
                </div>
              </button>
              <button
                onClick={() => setFormat('pdf')}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  format === 'pdf' ? 'border-brand-500 bg-brand-500/10 text-brand-300' : 'border-surface-700 text-gray-400 hover:border-surface-200'
                }`}
              >
                <FileText className="w-5 h-5" />
                <div className="text-left">
                  <div className="text-sm font-medium">PDF</div>
                  <div className="text-xs opacity-60">Document</div>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-surface-800 rounded-xl p-4 border border-surface-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Columns</span>
              <span className="text-xs text-gray-500">{tab.columns.length} columns</span>
            </div>
            <div className="pt-2 mt-2 border-t border-surface-700">
              <span className="text-xs text-gray-500">{rows.length} rows will be exported</span>
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
              exported ? 'bg-emerald-600 text-white' : 'bg-brand-600 hover:bg-brand-500 text-white'
            } disabled:opacity-50`}
          >
            {exported ? (
              <><Check className="w-4 h-4" /> Exported Successfully!</>
            ) : exporting ? (
              'Exporting...'
            ) : (
              <><Download className="w-4 h-4" /> Export {format.toUpperCase()}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
