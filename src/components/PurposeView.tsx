import type { Project } from '@/types';
import { FileText, Calendar, Building, Target, User } from 'lucide-react';
import { getUserName } from '@/lib/data';

interface Props {
  project: Project;
}

export function PurposeView({ project }: Props) {
  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-3xl mx-auto animate-fade-in space-y-6">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${project.color} flex items-center justify-center`}>
            <FileText className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            <p className="text-gray-500">{project.name_ja}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoCard
            icon={User}
            label="Project Manager"
            labelJa="プロジェクトマネージャー"
            value={getUserName(project.pm_id || '')}
          />
          <InfoCard
            icon={Building}
            label="Client"
            labelJa="クライアント"
            value={project.client}
          />
          <InfoCard
            icon={Calendar}
            label="Created"
            labelJa="作成日"
            value={project.created_at}
          />
          <InfoCard
            icon={Target}
            label="Status"
            labelJa="ステータス"
            value={project.status === 'active' ? 'Active' : project.status === 'completed' ? 'Completed' : 'On Hold'}
            valueColor={project.status === 'active' ? 'text-emerald-400' : project.status === 'on_hold' ? 'text-amber-400' : 'text-brand-400'}
          />
        </div>

        {project.background && (
          <Section title="Background" titleJa="背景">
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{project.background}</p>
            {project.background_ja && <p className="text-gray-500 text-sm mt-2 leading-relaxed whitespace-pre-wrap">{project.background_ja}</p>}
          </Section>
        )}

        {project.purpose && (
          <Section title="The Purpose" titleJa="目的">
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{project.purpose}</p>
            {project.purpose_ja && <p className="text-gray-500 text-sm mt-2 leading-relaxed whitespace-pre-wrap">{project.purpose_ja}</p>}
          </Section>
        )}

        {project.dev_period && (
          <Section title="Development Period" titleJa="開発期間">
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{project.dev_period}</p>
          </Section>
        )}

        {project.description && (
          <Section title="Description" titleJa="概要">
            <p className="text-gray-300 text-sm">{project.description}</p>
            <p className="text-gray-500 text-sm mt-1">{project.description_ja}</p>
          </Section>
        )}
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, labelJa, value, valueColor = 'text-white' }: {
  icon: typeof FileText; label: string; labelJa: string; value: string; valueColor?: string;
}) {
  return (
    <div className="bg-surface-900 border border-surface-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-gray-500" />
        <span className="text-xs text-gray-500">{label} / {labelJa}</span>
      </div>
      <p className={`text-sm font-medium ${valueColor}`}>{value}</p>
    </div>
  );
}

function Section({ title, titleJa, children }: { title: string; titleJa: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-900 border border-surface-700 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-white mb-1">{title}</h2>
      <p className="text-xs text-gray-500 mb-3">{titleJa}</p>
      {children}
    </div>
  );
}
