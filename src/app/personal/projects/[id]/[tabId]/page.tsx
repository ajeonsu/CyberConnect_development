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
import type { SheetRow } from '@/types';

export default function PersonalProjectTabPage() {
  const params = useParams();
  const router = useRouter();
  const { 
    projects, 
    sheetData, 
    loggedInUser, 
    language,
    setLanguage,
    sheetLoadingProjects,
    refreshSheetData,
    getProjectById,
    refreshProject,
    updateSheetRow,
    updateSheetRowData,
    addSheetRow,
    deleteSheetRow,
    deleteSheetRows,
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

  const projectSheetRole = useMemo(
    () => getCurrentUserProjectSheetRole(loggedInUser?.id, activeProject, 'pm'),
    [loggedInUser?.id, activeProject]
  );

  const currentRows = useMemo(() => {
    return sheetData[projectId]?.[tabId] ?? [];
  }, [sheetData, projectId, tabId]);

  const registeredScreenCodes = useMemo(() => {
    const rows = sheetData[projectId]?.screen_list ?? [];
    return [...new Set(rows.map((r) => String(r.screen_code ?? '').trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [sheetData, projectId]);

  const registeredFunctionCodes = useMemo(() => {
    const rows = sheetData[projectId]?.function_list ?? [];
    return [...new Set(rows.map((r) => String(r.function_code ?? '').trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [sheetData, projectId]);

  const selectedRowSynced = useMemo(() => {
    if (!selectedRow) return null;
    return currentRows.find(r => r.id === selectedRow.id) ?? selectedRow;
  }, [selectedRow, currentRows]);

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
            project={activeProject}
            projectSheetRole={projectSheetRole}
            language={language}
            onSelectRow={(row) => {
              setShowAddRow(false);
              setSelectedRow(row);
            }}
            onUpdateRow={(rowId, key, value) => updateSheetRow(projectId, tabId, rowId, key, value)}
            onDeleteRow={(rowId) => deleteSheetRow(projectId, tabId, rowId)}
            onDeleteRows={(ids) => deleteSheetRows(projectId, tabId, ids)}
            onAddRow={() => {
              setSelectedRow(null);
              setShowAddRow(true);
            }}
            selectedRowId={selectedRow?.id ?? null}
          />
        </div>

        {selectedRowSynced && (
          <SheetRowDetail
            tab={activeTab}
            row={selectedRowSynced}
            project={activeProject}
            projectSheetRole={projectSheetRole}
            language={language}
            screenCodeOptions={registeredScreenCodes}
            functionCodeOptions={registeredFunctionCodes}
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
            project={activeProject}
            projectSheetRole={projectSheetRole}
            language={language}
            screenCodeOptions={registeredScreenCodes}
            functionCodeOptions={registeredFunctionCodes}
            onClose={() => setShowAddRow(false)}
            onSave={async (newRow) => {
              await addSheetRow(projectId, tabId, newRow);
              setShowAddRow(false);
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
