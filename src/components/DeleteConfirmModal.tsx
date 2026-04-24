import { useState } from 'react';
import type { Project } from '@/types';
import { X, AlertTriangle, Loader } from 'lucide-react';

interface Props {
  project: Project;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void> | void;
}

export function DeleteConfirmModal({ project, onClose, onConfirm }: Props) {
  const [word, setWord] = useState('');
  const [nameConfirm, setNameConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  const canConfirm = word.trim().toLowerCase() === 'delete' && nameConfirm.trim() === project.name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConfirm) return;
    
    setIsDeleting(true);
    try {
      await onConfirm(project.id);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to delete project.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md p-6 animate-fade-in shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Delete Project</h3>
            <p className="text-xs text-gray-500">プロジェクトの削除</p>
          </div>
        </div>
        
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          This action is irreversible. It will permanently delete <span className="text-white font-bold">{project.name}</span> and all associated data.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5 ml-1">
              Type "delete" to confirm
            </label>
            <input 
              autoFocus
              value={word} 
              onChange={e => setWord(e.target.value)} 
              placeholder="delete"
              className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-rose-500/50 transition-colors" 
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5 ml-1">
              Project Name: <span className="text-gray-400 select-all font-mono">{project.name}</span>
            </label>
            <input 
              value={nameConfirm} 
              onChange={e => setNameConfirm(e.target.value)} 
              placeholder="Confirm project name"
              className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-rose-500/50 transition-colors" 
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-3 rounded-xl bg-surface-800 border border-surface-700 text-gray-300 font-bold text-sm hover:bg-surface-700 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={!canConfirm || isDeleting} 
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                canConfirm 
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20' 
                  : 'bg-surface-800 text-gray-600 cursor-not-allowed border border-surface-700'
              }`}
            >
              {isDeleting ? <Loader className="w-4 h-4 animate-spin" /> : 'Delete Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
