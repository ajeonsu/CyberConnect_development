'use client';

import { useWorkspace } from '@/components/WorkspaceProvider';
import { AdminView } from '@/components/dashboard/views/AdminView';
import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { GlobalTaskStats } from '@/lib/dal/stats';
import type { Project } from '@/types';
import { isTeamAdminOrOwner, userSeesProjectAsPm } from '@/lib/data';

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
    isLoading,
    loggedInUser,
    teamMemberships,
  } = useWorkspace();

  const canAssignProjectRoles = useMemo(
    () => isTeamAdminOrOwner(loggedInUser?.id, teamSlug, teamMemberships),
    [loggedInUser?.id, teamSlug, teamMemberships]
  );

  const canDeleteProject = useCallback(
    (p: Project) => {
      if (canAssignProjectRoles) return true;
      return userSeesProjectAsPm(loggedInUser?.id ?? '', p);
    },
    [canAssignProjectRoles, loggedInUser?.id]
  );

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
      teamSlug={teamSlug}
      projects={displayProjects}
      getSheetData={getSheetData}
      onSelectProject={handleSelectProject}
      onUpdateProject={handleUpdateProject}
      onAssignMember={handleAssignMember}
      onRemoveMember={handleRemoveMember}
      onAddProject={handleAddProject}
      onDeleteProject={handleDeleteProject}
      serverStats={serverStats}
      canAssignProjectRoles={canAssignProjectRoles}
      canDeleteProject={canDeleteProject}
    />
  );
}
