'use client';

import { useParams, useRouter } from 'next/navigation';
import { useWorkspace } from '@/components/WorkspaceProvider';
import { Header } from '@/components/Header';
import { GenericSheet } from '@/components/GenericSheet';
import { SheetRowDetail } from '@/components/SheetRowDetail';
import { AddRowDrawer } from '@/components/AddRowDrawer';
import { ExportModal } from '@/components/ExportModal';
import { sheetTabs, getCurrentUserProjectSheetRole, getLocalizedProjectName } from '@/lib/data';
import { useMemo, useEffect, useState } from 'react';
import type { SheetRow, UserRole } from '@/types';

export default function ProjectTabPage() {
  const params = useParams();
  const router = useRouter();
  const { 
    projects, 
    sheetData, 
    loggedInUser, 
    language,
    setLanguage,
    sheetLoadingProjects,
    workspaceScope, 
    refreshSheetData,
    getProjectById,
    refreshProject,
    updateSheetRow,
    updateSheetRowData,
    addSheetRow,
    deleteSheetRow
  } = useWorkspace();

  const projectId = params.id as string;
  const tabId = params.tabId as string;

  const [selectedRow, setSelectedRow] = useState<SheetRow | null>(null);
  const [showAddRow, setShowAddRow] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [isFetchingProject, setIsFetchingProject] = useState(false);

  useEffect(() => {
    if (projectId) {
      const p = getProjectById(projectId);
      if (!p) {
        setIsFetchingProject(true);
        refreshProject(projectId).finally(() => setIsFetchingProject(false));
      }
      if (!sheetData[projectId] && !sheetLoadingProjects[projectId]) {
        refreshSheetData(projectId);
      }
    }
  }, [projectId, sheetData, sheetLoadingProjects, refreshSheetData, getProjectById, refreshProject]);

  const activeProject = useMemo(() => getProjectById(projectId), [getProjectById, projectId]);
  const activeTab = useMemo(() => sheetTabs.find(t => t.id === tabId), [tabId]);

  const platformRoleFromUrl: UserRole = useMemo(() => {
    const roleParam = params.role as string;
    if (roleParam === 'admin') return 'admin';
    if (roleParam === 'dev') return 'dev';
    return (roleParam as UserRole) || 'pm';
  }, [params.role]);

  const projectSheetRole = useMemo(
    () => getCurrentUserProjectSheetRole(loggedInUser?.id, activeProject, platformRoleFromUrl),
    [loggedInUser?.id, activeProject, platformRoleFromUrl]
  );

  const currentRows = useMemo(() => {
    return sheetData[projectId]?.[tabId] ?? [];
  }, [sheetData, projectId, tabId]);

  const isSheetLoading = !sheetData[projectId] || sheetLoadingProjects[projectId];

  if (isFetchingProject) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-950">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!activeProject || !activeTab || !loggedInUser) return null;

  if (isSheetLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-950">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Header
        projectSheetRole={projectSheetRole}
        tab={activeTab}
        totalRows={currentRows.length}
        projectName={getLocalizedProjectName(activeProject, language)}
        language={language}
        onLanguageChange={setLanguage}
        onExport={() => setShowExport(true)}
      />
      <div className="flex-1 flex flex-row overflow-hidden relative">
        <div className="flex-1 overflow-hidden relative">
          <GenericSheet
            tab={activeTab}
            rows={currentRows}
            projectSheetRole={projectSheetRole}
            language={language}
            onSelectRow={(row) => {
              setShowAddRow(false);
              setSelectedRow(row);
            }}
            onUpdateRow={(rowId, key, value) => updateSheetRow(projectId, tabId, rowId, key, value)}
            onDeleteRow={(rowId) => deleteSheetRow(projectId, tabId, rowId)}
            onAddRow={() => {
              setSelectedRow(null);
              setShowAddRow(true);
            }}
            selectedRowId={selectedRow?.id ?? null}
          />
        </div>

        {selectedRow && (
          <SheetRowDetail
            tab={activeTab}
            row={selectedRow}
            projectSheetRole={projectSheetRole}
            language={language}
            onClose={() => setSelectedRow(null)}
            onUpdate={async (updatedRow) => {
              await updateSheetRowData(projectId, tabId, updatedRow as SheetRow);
              setSelectedRow(null);
            }}
          />
        )}

        {showAddRow && (
          <AddRowDrawer
            tab={activeTab}
            projectId={projectId}
            language={language}
            onClose={() => setShowAddRow(false)}
            onSave={async (newRow) => {
              setShowAddRow(false);
              await addSheetRow(projectId, tabId, newRow);
            }}
          />
        )}
      </div>

      {showExport && (
        <ExportModal tab={activeTab} rows={currentRows} onClose={() => setShowExport(false)} />
      )}
    </>
  );
}
