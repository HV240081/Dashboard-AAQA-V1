/**
 * hooks/useProjectActions.ts
 *
 * React hook that connects UI components to the service layer.
 *
 * BACKEND-READY PATTERN
 * ─────────────────────
 * Components import THIS hook — not DataContext, not the service directly.
 * The hook is the only place that knows about DataContext.
 * When a backend is added, only this file needs to change (add loading
 * states, real API calls, etc.). Components remain untouched.
 *
 * Usage in a component:
 *   const { createProject, updateProject, addReport, isLoading, error } = useProjectActions();
 *   await createProject({ name: 'Mi Proyecto', ... });
 */

import { useState, useCallback } from 'react';
import { useData } from '../contexts/useData';
import {
  createProject,
  updateProject,
  addMonthlyReport,
  updateMonthlyReport,
  deleteMonthlyReport,
  updateProjectStatus,
  recordGoalChange,
  CreateProjectDTO,
  UpdateProjectDTO,
  UpdateProjectStatusDTO,
  AddReportDTO,
  UpdateReportDTO,
} from '../services/projectService';
import { GoalChangeLog, Project, MonthlyReport } from '../types';

// ---------------------------------------------------------------------------
// Hook return type — explicit contract for consuming components
// ---------------------------------------------------------------------------

export interface ProjectActions {
  // Mutations
  createProject: (dto: CreateProjectDTO) => Promise<Project>;
  updateProject: (dto: UpdateProjectDTO) => Promise<Project>;
  addReport: (dto: AddReportDTO) => Promise<MonthlyReport>;
  updateReport: (dto: UpdateReportDTO) => Promise<MonthlyReport>;
  deleteReport: (projectId: string, reportId: string) => Promise<void>;
  updateStatus: (dto: UpdateProjectStatusDTO) => Promise<void>;
  recordGoalChange: (
    projectId: string,
    log: Omit<GoalChangeLog, 'id'>
  ) => Promise<void>;

  // Utilities
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  refreshData?: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

export const useProjectActions = (): ProjectActions => {
  const { data, updateProjectList, refreshData } = useData();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shared context passed to every service function
  const ctx = { data, updateProjectList };

  /**
   * Generic async wrapper:
   * - sets loading state
   * - catches errors and surfaces them as `error` state
   * - returns the result or null on failure
   * 
   * When a real async API is added, the body of each action below will
   * use `await fetch(...)` instead of the sync service call, and the
   * loading state management here will handle it automatically.
   */
  const run = useCallback(
    async <T>(fn: () => Promise<T> | T): Promise<T> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fn();
        return result;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error desconocido.';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [data, updateProjectList]
  );

  return {
    createProject: (dto) => run(() => createProject(dto, ctx)),
    updateProject: (dto) => run(() => updateProject(dto, ctx)),
    addReport: (dto) => run(() => addMonthlyReport(dto, ctx)),
    updateReport: (dto) => run(() => updateMonthlyReport(dto, ctx)),
    deleteReport: (projectId, reportId) => run(() => deleteMonthlyReport(projectId, reportId, ctx)),
    updateStatus: (dto) => run(() => updateProjectStatus(dto, ctx)),
    recordGoalChange: (projectId, log) =>
      run(() => recordGoalChange(projectId, log, ctx)),

    isLoading,
    error,
    clearError: () => setError(null),
    refreshData,
  };
};
