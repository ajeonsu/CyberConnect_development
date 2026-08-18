'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bot, ExternalLink, Loader2 } from 'lucide-react';
import type { Language } from '@/lib/data';
import { isAiDevUiEnabled } from '@/lib/ai-dev/uiFlag';
import {
  getAiDevCatalogAction,
  getAiDevRunAction,
  startAiDevRunAction,
  type AiDevRunPublic,
} from '@/lib/api/client';
import { ApiError } from '@/lib/api/http';

interface Props {
  projectId: string;
  taskId: string;
  language: Language;
  taskTitle?: string;
}

function ciLabel(status: string, language: Language): string {
  const ja = language === 'ja';
  switch (status) {
    case 'success':
      return ja ? '検出したCI / Checksは成功（Merge可否ではありません）' : 'Detected CI / checks succeeded (not a merge approval)';
    case 'failure':
      return ja ? '検出したCI / Checksは失敗' : 'Detected CI / checks failed';
    case 'pending':
      return ja ? '検出したCI / Checksは実行中' : 'Detected CI / checks pending';
    case 'none':
      return ja ? 'CI / Checks未検出' : 'No CI / checks detected';
    default:
      return ja ? 'CI状態不明' : 'CI status unknown';
  }
}

function runStatusLabel(status: string, language: Language): string {
  const ja = language === 'ja';
  switch (status) {
    case 'starting':
      return ja ? '起動中' : 'Starting';
    case 'running':
      return ja ? 'Agent実行中' : 'Agent running';
    case 'awaiting_review':
      return ja ? 'PR確認待ち' : 'Awaiting review';
    case 'merged':
      return ja ? 'Merge検知' : 'Merged';
    case 'failed':
      return ja ? '失敗' : 'Failed';
    case 'cancelled':
      return ja ? 'キャンセル' : 'Cancelled';
    default:
      return status;
  }
}

function prStateLabel(state: string): string {
  if (state === 'draft') return 'Draft';
  if (state === 'open') return 'Open';
  if (state === 'merged') return 'Merged';
  if (state === 'closed') return 'Closed';
  return state;
}

export function TaskAiDevPanel({ projectId, taskId, language, taskTitle }: Props) {
  const t = (en: string, ja: string) => (language === 'ja' ? ja : en);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [canStart, setCanStart] = useState(false);
  const [repos, setRepos] = useState<AiDevCatalogResponseRepos>([]);
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [runs, setRuns] = useState<AiDevRunPublic[]>([]);

  const load = useCallback(async () => {
    if (!isAiDevUiEnabled() || !projectId || !taskId) return;
    try {
      const catalog = await getAiDevCatalogAction(projectId, taskId);
      setEnabled(catalog.enabled);
      setCanStart(catalog.canStart);
      setRepos(catalog.repos);
      setRuns(catalog.runs ?? []);
      setSelectedRepoId((prev) => prev || catalog.repos[0]?.id || '');
      setError('');
    } catch (err) {
      setEnabled(false);
      setError(err instanceof ApiError ? err.message : t('Failed to load AI implementation status.', 'AI実装状態の取得に失敗しました。'));
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId, language]);

  useEffect(() => {
    if (!isAiDevUiEnabled()) {
      setLoading(false);
      return;
    }
    void load();
  }, [load]);

  const latest = runs[0];
  const active = latest && (latest.status === 'starting' || latest.status === 'running' || latest.status === 'awaiting_review');

  useEffect(() => {
    if (!active || !latest) return;
    const timer = window.setInterval(async () => {
      try {
        const { run } = await getAiDevRunAction(latest.id, projectId);
        setRuns((prev) => [run, ...prev.filter((item) => item.id !== run.id)]);
      } catch {
        /* ignore poll errors */
      }
    }, 15000);
    return () => window.clearInterval(timer);
  }, [active, latest?.id, projectId]);

  if (!isAiDevUiEnabled()) return null;
  if (loading) {
    return (
      <div className="rounded-xl border border-surface-700 bg-surface-900/60 p-4">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {t('Loading AI implementation…', 'AI実装を読み込み中…')}
        </div>
      </div>
    );
  }
  if (!enabled) return null;

  const selected = repos.find((r) => r.id === selectedRepoId) ?? repos[0];

  const start = async () => {
    if (!canStart || !selected || starting) return;
    setStarting(true);
    setError('');
    try {
      const { run } = await startAiDevRunAction(projectId, taskId, selected.id);
      setRuns((prev) => [run, ...prev.filter((item) => item.id !== run.id)]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('Failed to start AI implementation.', 'AI実装の開始に失敗しました。'));
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="rounded-xl border border-surface-700 bg-surface-900/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Bot className="w-4 h-4 text-brand-400" />
        <h3 className="text-sm font-medium text-white">{t('AI implementation', 'AI実装')}</h3>
      </div>

      {taskTitle ? (
        <p className="text-xs text-gray-400 line-clamp-2">{taskTitle}</p>
      ) : null}

      {selected ? (
        <div className="text-xs text-gray-300 space-y-1">
          <div>
            <span className="text-gray-500">{t('Repository', 'Repository')}: </span>
            {repos.length > 1 ? (
              <select
                className="rounded-lg border border-surface-700 bg-surface-800 px-2 py-1 text-xs text-white"
                value={selected.id}
                disabled={!canStart || Boolean(active) || starting}
                onChange={(e) => setSelectedRepoId(e.target.value)}
              >
                {repos.map((repo) => (
                  <option key={repo.id} value={repo.id}>
                    {repo.githubOwner}/{repo.githubRepo}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-mono">
                {selected.githubOwner}/{selected.githubRepo}
              </span>
            )}
          </div>
          <div>
            <span className="text-gray-500">{t('Base branch', 'Base branch')}: </span>
            <span className="font-mono">{selected.defaultBaseBranch}</span>
          </div>
        </div>
      ) : null}

      {canStart && !active ? (
        <button
          type="button"
          onClick={() => void start()}
          disabled={starting || !selected}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs px-3 py-1.5"
        >
          {starting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
          {t('Start AI implementation', 'AI実装を開始')}
        </button>
      ) : null}

      {latest ? (
        <div className="rounded-lg border border-surface-700 bg-surface-950/50 p-3 space-y-2 text-xs text-gray-300">
          <div>
            <span className="text-gray-500">{t('Status', '状態')}: </span>
            {runStatusLabel(latest.status, language)}
          </div>
          <div>
            <span className="text-gray-500">{t('Started', '開始')}: </span>
            {new Date(latest.startedAt).toLocaleString()}
          </div>
          {latest.prUrl ? (
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={latest.prUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-brand-300 hover:text-brand-200"
              >
                PR #{latest.prNumber ?? ''} <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-gray-500">{prStateLabel(latest.prState)}</span>
            </div>
          ) : (
            <div className="text-gray-500">{t('Pull request not linked yet.', 'PRはまだ紐付いていません。')}</div>
          )}
          <div>{ciLabel(latest.ciStatus, language)}</div>
          {latest.prUrl ? (
            <a
              href={`${latest.prUrl}/checks`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-gray-400 hover:text-white"
            >
              {t('Open checks on GitHub', 'GitHubでChecksを開く')} <ExternalLink className="w-3 h-3" />
            </a>
          ) : null}
          {latest.status === 'awaiting_review' || latest.prUrl ? (
            <p className="text-amber-200/90">
              {t('Review the PR on GitHub and merge it there if it looks correct.', 'GitHubで内容を確認し、問題なければGitHub上でMergeしてください。')}
            </p>
          ) : null}
          {latest.errorMessage ? <p className="text-red-400">{latest.errorMessage}</p> : null}
        </div>
      ) : (
        <p className="text-xs text-gray-500">{t('No AI implementation has been started for this task.', 'このタスクのAI実装はまだ開始されていません。')}</p>
      )}

      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

type AiDevCatalogResponseRepos = Array<{
  id: string;
  githubOwner: string;
  githubRepo: string;
  defaultBaseBranch: string;
}>;
