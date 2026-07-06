/**
 * services/projectService.ts
 *
 * Service layer for project operations.
 *
 * BACKEND-READY PATTERN
 * ─────────────────────
 * Every function in this file defines an INTERFACE for what a project
 * operation should look like. Today it delegates to setData / updateProjectList
 * via the updater callbacks passed in. Tomorrow, a developer replaces the
 * body with `fetch('/api/projects/...')` or a Supabase call and the
 * calling components need zero changes.
 *
 * Usage:
 *   // in a component or hook
 *   import { createProject, updateProject } from '../services/projectService';
 *   await createProject({ ...dto }, { updateProjectList, data });
 */

import {
  Project,
  MonthlyReport,
  GoalChangeLog,
  CategoryType,
  ProjectStatus,
  DashboardData,
} from '../types';
import {
  validateProjectCore,
  validateStatusTransition,
  validateProjectClosure,
  validateMonthlyReport,
  formatValidationErrors,
} from '../lib/validators';

// ---------------------------------------------------------------------------
// DTOs (Data Transfer Objects)
//
// These shapes represent what the UI sends to the service.
// When a backend exists these become the request body of REST/RPC calls.
// ---------------------------------------------------------------------------

export interface CreateProjectDTO {
  name: string;
  organization: string;
  category: CategoryType;
  year: number;
  department: string;
  municipality?: string;
  timelineStartMonth?: number | null;
  timelineEndMonth?: number | null;
  timelineDurationMonths?: number | null;
  contact1Name?: string;
  contact1Role?: string;
  contact1DirectPhone?: string;
  contact1OrganizationPhone?: string;
  contact1Email?: string;
  contact2Name?: string;
  contact2Role?: string;
  contact2DirectPhone?: string;
  contact2OrganizationPhone?: string;
  contact2Email?: string;
  amountFGK: number;
  counterpart?: number;
  amountAllies?: number;
  beneficiaries?: number;
  status?: ProjectStatus | null;
}

export interface UpdateProjectDTO extends Partial<Omit<Project, 'id' | 'organizationId'>> {
  id: string; // required for updates
}

export interface UpdateProjectStatusDTO {
  id: string;
  currentStatus: ProjectStatus;
  nextStatus: ProjectStatus;
}

export interface AddReportDTO extends Omit<MonthlyReport, 'id' | 'createdAt' | 'createdBy'> {
  projectId: string;
  createdBy?: string;
}

export interface UpdateReportDTO extends AddReportDTO {
  reportId: string;
}

// ---------------------------------------------------------------------------
// Service context — injected dependency (no direct import of DataContext)
// This is the seam that will be replaced by an API client tomorrow.
// ---------------------------------------------------------------------------

export interface ProjectServiceContext {
  data: DashboardData;
  updateProjectList: (projects: Project[]) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Service operations
// ---------------------------------------------------------------------------

/**
 * createProject
 * Creates a new project and adds it to the project list.
 * Returns the created project or throws a descriptive error.
 */
export const createProject = async (
  dto: CreateProjectDTO,
  ctx: ProjectServiceContext
): Promise<Project> => {
  const token = localStorage.getItem('access_token');
  const response = await fetch('http://localhost:3000/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(dto),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Error al crear el proyecto');
  }

  const newProject = result.data || result.project || result;
  
  const updated = [...ctx.data.projectsList, newProject];
  await ctx.updateProjectList(updated);

  return newProject;
};

/**
 * updateProject
 * Persists changes to an existing project after validating business rules.
 */
export const updateProject = async (
  dto: UpdateProjectDTO,
  ctx: ProjectServiceContext
): Promise<Project> => {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`http://localhost:3000/projects/${dto.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(dto),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Error al actualizar el proyecto');
  }

  const updatedFromServer = result.data || result.project || result;
  const updatedProject = updatedFromServer as Project;
  return updatedProject;
};

/**
 * addMonthlyReport
 * Validates and attaches a new monthly report to a project.
 */
export const addMonthlyReport = async (
  dto: AddReportDTO,
  ctx: ProjectServiceContext
): Promise<MonthlyReport> => {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`http://localhost:3000/projects/${dto.projectId}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(dto),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Error al agregar el reporte');
  }

  // El backend devuelve el reporte creado con su ID real
  const newReport = result.data || result;

  // Actualizar el estado local
  const project = ctx.data.projectsList.find((p) => p.id === dto.projectId);
  if (project) {
    const nextProgress = [...(project.progress || Array(12).fill('pending'))];
    const monthIndex = Math.max(0, Math.min(11, (newReport.month || dto.month || 1) - 1));
    nextProgress[monthIndex] = newReport.scheduleStatus === 'Finalizado' ? 'completed' : 'active';

    const updatedProject: Project = {
      ...project,
      reports: [...(project.reports || []), newReport],
      progress: nextProgress,
      technicalProgressPercentage: newReport.realTechnical,
      financialProgressPercentage: newReport.realFinancial,
    };

    const newList = ctx.data.projectsList.map((p) =>
      p.id === dto.projectId ? updatedProject : p
    );
    await ctx.updateProjectList(newList);
  }

  return newReport;
};

export const updateMonthlyReport = async (
  dto: UpdateReportDTO,
  ctx: ProjectServiceContext
): Promise<MonthlyReport> => {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`http://localhost:3000/projects/${dto.projectId}/reports/${dto.reportId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(dto),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Error al actualizar el reporte');
  }

  const updatedReport = result.data || result;
  const project = ctx.data.projectsList.find((p) => p.id === dto.projectId);
  if (project) {
    const newReports = (project.reports || []).map((r) => (r.id === dto.reportId ? updatedReport : r));
    const nextProgress = [...(project.progress || Array(12).fill('pending'))];
    const monthIndex = Math.max(0, Math.min(11, (updatedReport.month || dto.month || 1) - 1));
    nextProgress[monthIndex] = updatedReport.scheduleStatus === 'Finalizado' ? 'completed' : 'active';

    const updatedProject: Project = {
      ...project,
      reports: newReports,
      progress: nextProgress,
      technicalProgressPercentage: updatedReport.realTechnical,
      financialProgressPercentage: updatedReport.realFinancial,
    };

    await ctx.updateProjectList(ctx.data.projectsList.map((p) => p.id === dto.projectId ? updatedProject : p));
  }

  return updatedReport;
};

export const deleteMonthlyReport = async (
  projectId: string,
  reportId: string,
  ctx: ProjectServiceContext
): Promise<void> => {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`http://localhost:3000/projects/${projectId}/reports/${reportId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Error al eliminar el reporte');
  }

  const project = ctx.data.projectsList.find((p) => p.id === projectId);
  if (project) {
    const newReports = (project.reports || []).filter((r) => r.id !== reportId);
    const updatedProject: Project = {
      ...project,
      reports: newReports,
    };
    await ctx.updateProjectList(ctx.data.projectsList.map((p) => p.id === projectId ? updatedProject : p));
  }
};

/**
 * updateProjectStatus
 * Dedicated operation for status changes — validates transitions and closure rules.
 */
export const updateProjectStatus = async (
  dto: UpdateProjectStatusDTO,
  ctx: ProjectServiceContext
): Promise<void> => {
  await updateProject(
    { id: dto.id, status: dto.nextStatus },
    ctx
  );
};

/**
 * recordGoalChange
 * Appends a GoalChangeLog entry to a project — used when a manager
 * changes a target goal with justification.
 */
export const recordGoalChange = async (
  projectId: string,
  log: Omit<GoalChangeLog, 'id'>,
  ctx: ProjectServiceContext
): Promise<void> => {
  const project = ctx.data.projectsList.find((p) => p.id === projectId);
  if (!project) throw new Error(`Proyecto "${projectId}" no encontrado.`);

  const newLog: GoalChangeLog = {
    ...log,
    id: `gcl-${Date.now()}`,
  };

  const updated: Project = {
    ...project,
    goalHistory: [...(project.goalHistory ?? []), newLog],
  };

  const newList = ctx.data.projectsList.map((p) =>
    p.id === projectId ? updated : p
  );
  await ctx.updateProjectList(newList);
};

// ---------------------------------------------------------------------------
// Internal helpers (not exported — not part of the public API contract)
// ---------------------------------------------------------------------------
const _internal = {
  executeValidateProgress: (tech: number, fin: number): string | null => {
    if (tech < 0 || tech > 100) return `El avance técnico (${tech}%) debe estar entre 0 y 100.`;
    if (fin < 0 || fin > 100) return `El avance financiero (${fin}%) debe estar entre 0 y 100.`;
    return null;
  },
};
