'use server'

import { createClient } from '@/lib/supabase-server'

export interface GlobalTaskStats {
  total: number;
  done: number;
  inProgress: number;
  blocked: number;
  notStarted: number;
}

/**
 * Fetches aggregated task statistics across all projects authorized for the user.
 * Bypasses client-side state for the initial dashboard load.
 */
export async function getGlobalTaskStats(): Promise<GlobalTaskStats> {
  const supabase = await createClient()

  // Note: RLS handles filtering projects and tasks based on user access automatically.
  // We explicitly select relevant columns to count and group by.
  const { data, error } = await supabase
    .from('task_rows')
    .select('status');

  if (error) {
    console.error('Error in getGlobalTaskStats:', error);
    return { total: 0, done: 0, inProgress: 0, blocked: 0, notStarted: 0 };
  }

  const rows = Array.isArray(data) ? data : []

  const stats = {
    total: rows.length,
    done: 0,
    inProgress: 0,
    blocked: 0,
    notStarted: 0,
  };

  rows.forEach(row => {
    const s = row.status;
    if (s === 'Done' || s === '完了') stats.done++;
    else if (s === 'In progress' || s === '進行中') stats.inProgress++;
    else if (s === 'Blocked' || s === 'ブロック中') stats.blocked++;
    else if (s === 'Not started' || s === '未着手') stats.notStarted++;
  });

  return stats;
}
