'use client';

import { useWorkspace } from '@/components/WorkspaceProvider';
import { AdminView } from '@/components/dashboard/views/AdminView';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { GlobalTaskStats } from '@/lib/dal/stats';
import type { Project } from '@/types';

interface Props {
  teamSlug: string;
  serverStats: GlobalTaskStats;
  initialProjects: Project[];
}

export default function AdminDashboardClient({ teamSlug, serverStats, initialProjects }: Props) {
  const router = useRouter();
  const { 
    visibleProjects, 
    sheetData, 
    handleUpdateProject, 
    handleAssignMember,
    handleRemoveMember,
    handleAddProject, 
    handleDeleteProject,
    isLoading
  } = useWorkspace();

  // If useWorkspace is loading, show initialProjects (from server).
  // Once loaded, use the real-time visibleProjects list from the provider.
  const displayProjects = isLoading ? initialProjects : visibleProjects;

  const handleSelectProject = useCallback((projectId: string) => {
    router.push(`/${teamSlug}/admin/projects/${projectId}/tasks`);
  }, [router, teamSlug]);

  const getSheetData = useCallback((projectId: string, sheetId: string) => {
    return sheetData[projectId]?.[sheetId] ?? [];
  }, [sheetData]);

  if (isLoading && initialProjects.length === 0) return null;

  return (
    <AdminView
      projects={displayProjects}
      getSheetData={getSheetData}
      onSelectProject={handleSelectProject}
      onUpdateProject={handleUpdateProject}
      onAssignMember={handleAssignMember}
      onRemoveMember={handleRemoveMember}
      onAddProject={handleAddProject}
      onDeleteProject={handleDeleteProject}
      serverStats={serverStats}
    />
  );
}
