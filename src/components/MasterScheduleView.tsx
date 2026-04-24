import { Calendar, Clock } from 'lucide-react';

export function MasterScheduleView() {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-surface-800 border border-surface-700 flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-gray-600" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-1">Master Schedule</h2>
        <p className="text-sm text-gray-500 mb-1">マスタースケジュール</p>
        <p className="text-xs text-gray-600 max-w-sm mx-auto leading-relaxed mt-3">
          Gantt chart view with sprint timeline, milestones, and resource allocation.
          This will be rendered with an interactive chart library in the full version.
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs">
          <Clock className="w-3 h-3" />
          Coming in Full Version
        </div>
      </div>
    </div>
  );
}
