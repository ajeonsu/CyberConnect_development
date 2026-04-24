'use client';

import { useWorkspace } from '@/components/WorkspaceProvider';
import { DevView } from '@/components/dashboard/views/DevView';
import { useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function DevDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const teamSlug = params.team_slug as string;

  const { 
    visibleProjects, 
    sheetData, 
    isLoading 
  } = useWorkspace();

  const handleSelectProject = useCallback((projectId: string) => {
    router.push(`/${teamSlug}/dev/projects/${projectId}/tasks`);
  }, [router, teamSlug]);

  if (isLoading) return null;

  return (
    <DevView
      projects={visibleProjects}
      sheetData={sheetData}
      onSelectProject={handleSelectProject}
      language="en"
    />
  );
}
