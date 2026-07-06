// src/components/ProjectProgressMatrix.tsx - COMPLETO MEJORADO

import React, { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { Project, ProgressStatus, ProjectStatus } from '../types';

interface ProjectProgressMatrixProps {
    projects: Project[];
    isEditable?: boolean;
    onUpdateProjects?: (updatedProjects: Project[]) => void;
    title?: React.ReactNode;
    compactMonthsOnly?: boolean;
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const getMonthName = (m: number) => MONTHS[m - 1] || '';

const getMonthNumber = (value: any): number => {
    if (value === null || value === undefined || value === '') return 1;
    const raw = value.toString().trim().toLowerCase();
    const numeric = parseInt(raw, 10);
    if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 12) return numeric;
    const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const monthMap: Record<string, number> = {
        enero: 1, ene: 1,
        febrero: 2, feb: 2,
        marzo: 3, mar: 3,
        abril: 4, abr: 4,
        mayo: 5, may: 5,
        junio: 6, jun: 6,
        julio: 7, jul: 7,
        agosto: 8, ago: 8,
        septiembre: 9, setiembre: 9, sep: 9, sept: 9,
        octubre: 10, oct: 10,
        noviembre: 11, nov: 11,
        diciembre: 12, dic: 12,
    };
    return monthMap[normalized] || 1;
};

const addMonths = (year: number, month: number, offset: number) => new Date(year, month - 1 + offset, 1);

const formatMonthYear = (date: Date) => `${getMonthName(date.getMonth() + 1)} ${date.getFullYear()}`;

const getDurationMonths = (startMonth?: number | null, endMonth?: number | null, fallback?: number | null) => {
    if (startMonth && endMonth) {
        return endMonth > startMonth
            ? endMonth - startMonth + 1
            : (12 - startMonth + 1) + endMonth;
    }
    return fallback ? Math.max(1, Math.min(12, fallback)) : 0;
};

interface TimelineSlot {
    calendarLabel: string;
    calendarMonth: number;
    calendarYear: number;
    isActive: boolean;
}

const buildTimelineSlots = (project: Project): TimelineSlot[] => {
    const startMonth = project.timelineStartMonth ?? null;
    const durationMonths = getDurationMonths(project.timelineStartMonth, project.timelineEndMonth, project.timelineDurationMonths);
    const startYear = project.year || new Date().getFullYear();

    return Array.from({ length: 12 }, (_, idx) => {
        const date = addMonths(startYear, startMonth || 1, idx);
        return {
            calendarLabel: formatMonthYear(date),
            calendarMonth: date.getMonth() + 1,
            calendarYear: date.getFullYear(),
            isActive: !!startMonth && idx < durationMonths,
        };
    });
};

const buildCompactTimelineSlots = (project: Project): TimelineSlot[] => {
    const startMonth = project.timelineStartMonth ?? null;
    const durationMonths = getDurationMonths(project.timelineStartMonth, project.timelineEndMonth, project.timelineDurationMonths);

    if (!startMonth || durationMonths <= 0) {
        return buildTimelineSlots(project);
    }

    const startYear = project.year || new Date().getFullYear();
    return Array.from({ length: durationMonths }, (_, idx) => {
        const date = addMonths(startYear, startMonth, idx);
        return {
            calendarLabel: formatMonthYear(date),
            calendarMonth: date.getMonth() + 1,
            calendarYear: date.getFullYear(),
            isActive: true,
        };
    });
};

const getTechnicalProgress = (project: Project): number => {
    const statusToScore = (status: any) => {
        const normalized = (status ?? '').toString().trim().toLowerCase();
        if (normalized === 'completed' || normalized.includes('finaliz') || normalized.includes('complet')) return 100;
        if (normalized === 'active' || normalized.includes('proceso') || normalized.includes('ejec') || normalized.includes('avance') || normalized.includes('tiempo')) return 50;
        return 0;
    };

    const reports = Array.isArray((project as any).reports) ? (project as any).reports : [];
    if (reports.length > 0) {
        const startMonth = project.timelineStartMonth || 1;
        const durationMonths = getDurationMonths(project.timelineStartMonth, project.timelineEndMonth, project.timelineDurationMonths) || 12;
        const startYear = project.year || new Date().getFullYear();
        const timelineSlots = Array.from({ length: durationMonths }, (_, idx) => {
            const date = addMonths(startYear, startMonth, idx);
            return { month: date.getMonth() + 1, year: date.getFullYear() };
        });

        const scores = timelineSlots.map((slot) => {
            const report = [...reports].reverse().find((item: any) => {
                const reportMonth = parseInt(String(item.month || item.mes || 0), 10) || 0;
                const reportYear = parseInt(String(item.year || item.año || 0), 10) || 0;
                return reportMonth === slot.month && reportYear === slot.year;
            });
            return statusToScore(report?.scheduleStatus);
        });

        return Number((scores.reduce((sum, value) => sum + value, 0) / Math.max(1, timelineSlots.length)).toFixed(2));
    }

    const activities = Array.isArray(project.activities) ? project.activities : [];
    const durationMonths = getDurationMonths(project.timelineStartMonth, project.timelineEndMonth, project.timelineDurationMonths);
    if (activities.length > 0) {
        const grouped = new Map<number, ProgressStatus[]>();
        activities.forEach((activity) => {
            const month = getMonthNumber(activity.month);
            const list = grouped.get(month) || [];
            list.push((activity.status === 'completed' || activity.status === 'active' || activity.status === 'pending') ? activity.status : 'pending');
            grouped.set(month, list);
        });

        if (!project.timelineStartMonth) {
            const monthScores = Array.from(grouped.values()).map((list) => {
                if (!list.length) return 0;
                const completedCount = list.filter((status) => status === 'completed').length;
                const activeCount = list.filter((status) => status === 'active').length;
                return ((completedCount + (activeCount * 0.5)) / Math.max(1, list.length)) * 100;
            });
            return Number((monthScores.reduce((sum, value) => sum + value, 0) / Math.max(1, monthScores.length)).toFixed(2));
        }

        const monthSequence = Array.from({ length: durationMonths }, (_, idx) => {
            const startMonth = project.timelineStartMonth || 1;
            return ((startMonth - 1 + idx) % 12) + 1;
        });

        const monthlyScores = monthSequence.map((month) => {
            const list = grouped.get(month) || [];
            if (list.length === 0) return 0;
            const completedCount = list.filter((status) => status === 'completed').length;
            const activeCount = list.filter((status) => status === 'active').length;
            return ((completedCount + (activeCount * 0.5)) / Math.max(1, list.length)) * 100;
        });

        return Number((monthlyScores.reduce((sum, value) => sum + value, 0) / Math.max(1, durationMonths)).toFixed(2));
    }
    const technical = Number(project.technicalProgressPercentage || 0);
    return Math.max(0, Math.min(100, Number((technical || 0).toFixed(2))));
};

const STATUS_CONFIG: Record<ProgressStatus, { label: string; color: string; bg: string; border: string }> = {
    'pending': { 
        label: 'No Iniciado', 
        color: 'text-slate-500', 
        bg: 'bg-slate-100',
        border: 'border-slate-200'
    },
    'active': { 
        label: 'En Ejecución', 
        color: 'text-emerald-600', 
        bg: 'bg-emerald-100',
        border: 'border-emerald-300'
    },
    'completed': { 
        label: 'Finalizado', 
        color: 'text-blue-600', 
        bg: 'bg-blue-100',
        border: 'border-blue-300'
    },
};

const STATUS_ORDER: ProgressStatus[] = ['pending', 'active', 'completed'];

const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; bg: string; text: string; border: string }> = {
    'Activo': { label: 'Activo', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
    'En Ejecución': { label: 'En Ejecución', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    'En Cierre': { label: 'En Cierre', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
    'Suspendido': { label: 'Suspendido', bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
    'Finalizado': { label: 'Finalizado', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
};

const ProjectProgressMatrix: React.FC<ProjectProgressMatrixProps> = ({ 
    projects, 
    isEditable = false,
    onUpdateProjects,
    title = "Cronograma de Actividades",
    compactMonthsOnly = false
}) => {
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

    const toggleProjectExpand = (projectId: string) => {
        const newExpanded = new Set(expandedProjects);
        if (newExpanded.has(projectId)) {
            newExpanded.delete(projectId);
        } else {
            newExpanded.add(projectId);
        }
        setExpandedProjects(newExpanded);
    };

    const toggleStatus = (projectIndex: number, monthIndex: number, customSlot?: TimelineSlot) => {
        if (!isEditable || !onUpdateProjects) return;

        const project = projects[projectIndex];
        const newProgress = [...(project.progress || Array(12).fill('pending'))];
        
        const currentStatus = newProgress[monthIndex];
        const currentIndex = STATUS_ORDER.indexOf(currentStatus);
        const nextStatus = STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length];

        newProgress[monthIndex] = nextStatus;

        const timelineSlots = buildTimelineSlots(project);
        const slot = customSlot || timelineSlots[monthIndex];
        const targetMonth = slot?.calendarMonth || (monthIndex + 1);
        const targetYear = slot?.calendarYear || project.year || new Date().getFullYear();
        const nextActivities = (project.activities || []).map((activity) => {
            const activityMonth = Math.max(1, Math.min(12, parseInt(String(activity.month || 1), 10) || 1));
            if (activityMonth !== targetMonth) return activity;
            return { ...activity, status: nextStatus };
        });

        const nextReports = [...(((project as any).reports) || [])];
        const reportIndex = nextReports.findIndex((item: any) => {
            const reportMonth = parseInt(String(item.month || item.mes || 0), 10) || 0;
            const reportYear = parseInt(String(item.year || item.año || 0), 10) || 0;
            return reportMonth === targetMonth && reportYear === targetYear;
        });

        const baseReport = reportIndex !== -1 ? nextReports[reportIndex] : null;
        const updatedReport = {
            id: baseReport?.id || `rep-${project.id}-${targetYear}-${String(targetMonth).padStart(2, '0')}`,
            month: targetMonth,
            year: targetYear,
            realTechnical: nextStatus === 'completed' ? 100 : nextStatus === 'active' ? 50 : 0,
            realFinancial: Number(baseReport?.realFinancial || 0),
            metaFinancial: Number(baseReport?.metaFinancial || 0),
            scheduleStatus: nextStatus,
            observations: baseReport?.observations || '',
            photos: Array.isArray(baseReport?.photos) ? baseReport.photos : [],
            createdBy: baseReport?.createdBy || 'Sistema',
            createdAt: baseReport?.createdAt || new Date().toISOString(),
        };

        if (reportIndex !== -1) {
            nextReports[reportIndex] = updatedReport;
        } else {
            nextReports.push(updatedReport);
        }

        const updatedProject = { ...project, progress: newProgress, activities: nextActivities, reports: nextReports };
        const updatedProjects = [...projects];
        updatedProjects[projectIndex] = updatedProject;

        onUpdateProjects(updatedProjects);
    };

    const normalizeStatus = (status?: ProgressStatus | string) => {
        const normalized = (status ?? '').toString().trim().toLowerCase();
        if (normalized === 'completed' || normalized === 'active' || normalized === 'pending') return normalized as ProgressStatus;
        if (normalized.includes('finaliz')) return 'completed';
        if (normalized.includes('proceso') || normalized.includes('ejec') || normalized.includes('avance') || normalized.includes('tiempo')) return 'active';
        return 'pending';
    };

    const getProgressColor = (percentage: number): string => {
        if (percentage >= 80) return 'bg-emerald-500';
        if (percentage >= 50) return 'bg-blue-500';
        if (percentage >= 25) return 'bg-amber-500';
        return 'bg-slate-400';
    };

    const getDerivedMonthStatus = (project: Project, monthIndex: number, slot: TimelineSlot): ProgressStatus => {
        if (!slot.isActive) return 'pending';

        const reports = Array.isArray((project as any).reports) ? (project as any).reports : [];
        if (reports.length > 0) {
            const matchingReport = [...reports].reverse().find((item: any) => {
                const reportMonth = parseInt(String(item.month || item.mes || 0), 10) || 0;
                const reportYear = parseInt(String(item.year || item.año || 0), 10) || 0;
                return reportMonth === slot.calendarMonth && reportYear === slot.calendarYear;
            });
            if (matchingReport) {
                return normalizeStatus(matchingReport.scheduleStatus);
            }
        }

        const activities = Array.isArray(project.activities) ? project.activities : [];
        const monthActivities = activities.filter((activity) => {
            const month = Math.max(1, Math.min(12, parseInt(String(activity.month || 1), 10) || 1));
            return month === slot.calendarMonth;
        });

        if (monthActivities.length === 0) {
            return 'pending';
        }

        const statuses = monthActivities.map((item) => normalizeStatus(item.status));
        if (statuses.every((status) => status === 'completed')) return 'completed';
        if (statuses.some((status) => status === 'completed' || status === 'active')) return 'active';
        return 'pending';
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {compactMonthsOnly ? (
            <div className="p-2">
                    {(() => {
                        const firstProject = projects[0];
                        const timelineSlots = firstProject ? buildCompactTimelineSlots(firstProject) : [];
                        return (
                            <>
                                <div className="grid grid-cols-3 gap-2">
                                    {timelineSlots.map((slot, mIdx) => {
                                        const status = firstProject ? getDerivedMonthStatus(firstProject, mIdx, slot) : 'pending';
                                        const progressHint = firstProject ? getTechnicalProgress(firstProject) : 0;
                                        const slotClass = !slot.isActive
                                            ? 'bg-slate-50 border-slate-200'
                                            : status === 'completed'
                                                ? 'bg-blue-50 border-blue-200'
                                                : status === 'active'
                                                    ? 'bg-emerald-50 border-emerald-200'
                                                    : 'bg-slate-50 border-slate-200';
                                        const labelClass = !slot.isActive
                                            ? 'text-slate-300'
                                            : status === 'completed'
                                                ? 'text-blue-700'
                                                : status === 'active'
                                                    ? 'text-emerald-700'
                                                    : 'text-slate-500';
                                        const barClass = !slot.isActive
                                            ? 'bg-slate-300'
                                            : status === 'completed'
                                                ? 'bg-blue-500'
                                                : status === 'active'
                                                    ? 'bg-emerald-500'
                                                    : 'bg-slate-300';
                                            return (
                                                <div
                                                key={mIdx}
                                                className={`relative h-18 rounded-xl border px-2 py-2 text-left transition-all duration-200 ${slot.isActive ? 'cursor-default' : 'cursor-not-allowed opacity-35 grayscale'} ${slotClass}`}
                                                title={slot.calendarLabel}
                                            >
                                                <div className="flex h-full flex-col items-center justify-center text-center">
                                                    <div className={`text-[12px] font-semibold leading-tight ${labelClass}`}>
                                                        <div>{getMonthName(slot.calendarMonth)}</div>
                                                        <div>{slot.calendarYear}</div>
                                                    </div>
                                                </div>
                                                <div className={`absolute left-1/2 bottom-2 -translate-x-1/2 w-8 h-1 rounded-full overflow-hidden ${slot.isActive ? 'bg-white/70' : 'bg-slate-200'}`}>
                                                    <div
                                                        className={`h-full rounded-full ${barClass}`}
                                                        style={{ width: status === 'completed' ? '100%' : status === 'active' ? '100%' : progressHint > 0 ? '45%' : '0%' }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                                    <div className="inline-flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-slate-300"></span>
                                        <span>Sin reporte</span>
                                    </div>
                                    <div className="inline-flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                        <span>En proceso</span>
                                    </div>
                                    <div className="inline-flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                        <span>Finalizado</span>
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </div>
            ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-3 text-left min-w-[250px] text-xs font-bold text-slate-600 uppercase tracking-wide sticky left-0 bg-slate-50 z-10">
                                Proyecto
                            </th>
                            {MONTHS.map((m, idx) => (
                                <th key={m} className="p-2 text-center text-xs font-bold text-slate-500 w-20">
                                    <div className="flex flex-col items-center leading-tight">
                                        <span>Mes {idx + 1}</span>
                                        <span className="text-[10px] font-semibold text-slate-400">{m}</span>
                                    </div>
                                </th>
                            ))}
                            <th className="p-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wide w-24">
                                Progreso
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {projects.map((project, pIdx) => {
                            const progressPercent = getTechnicalProgress(project);
                            const timelineSlots = buildTimelineSlots(project);
                            const isExpanded = expandedProjects.has(project.id);
                            
                            return (
                                <React.Fragment key={project.id}>
                                    <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => toggleProjectExpand(project.id)}>
                                        <td className="p-3 sticky left-0 bg-white border-r border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <button className="p-0.5">
                                                    {isExpanded ? (
                                                        <ChevronUp className="w-4 h-4 text-slate-400" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4 text-slate-400" />
                                                    )}
                                                </button>
                                                <div>
                                                    <div className="font-bold text-slate-800 text-sm">{project.name}</div>
                                                    <div className="text-[10px] text-slate-400">{project.organization}</div>
                                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                                        {project.timelineStartMonth ? `${getMonthName(project.timelineStartMonth)} ${project.year} · ${getDurationMonths(project.timelineStartMonth, project.timelineEndMonth, project.timelineDurationMonths)} meses` : 'Sin mes definido'}
                                                    </div>
                                                    <div className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${PROJECT_STATUS_CONFIG[project.status]?.bg || 'bg-slate-100'} ${PROJECT_STATUS_CONFIG[project.status]?.text || 'text-slate-700'} ${PROJECT_STATUS_CONFIG[project.status]?.border || 'border-slate-200'}`}>
                                                        {PROJECT_STATUS_CONFIG[project.status]?.label || project.status}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        {timelineSlots.map((slot, mIdx) => {
                                            const status = getDerivedMonthStatus(project, mIdx, slot);
                                            const config = STATUS_CONFIG[status];
                                            const progressHint = getTechnicalProgress(project);
                                            const highlightClass = !slot.isActive
                                                ? 'bg-slate-50'
                                                : status === 'completed'
                                                    ? 'bg-blue-50 border-blue-200'
                                                    : status === 'active'
                                                        ? 'bg-emerald-50 border-emerald-200'
                                                        : 'bg-slate-50 border-slate-200';
                                            const labelClass = !slot.isActive
                                                ? 'text-slate-300'
                                                : status === 'completed'
                                                    ? 'text-blue-700'
                                                    : status === 'active'
                                                        ? 'text-emerald-700'
                                                        : 'text-slate-500';
                                            const barClass = !slot.isActive
                                                ? 'bg-slate-300'
                                                : status === 'completed'
                                                    ? 'bg-blue-500'
                                                    : status === 'active'
                                                        ? 'bg-emerald-500'
                                                        : 'bg-slate-300';
                                            
                                            return (
                                                <td 
                                                    key={mIdx} 
                                                    className="p-1 text-center h-20"
                                                >
                                                    <div 
                                                        className={`w-full h-16 rounded-xl border transition-all duration-200 relative overflow-hidden ${slot.isActive ? 'cursor-default' : 'cursor-not-allowed opacity-35 grayscale'} ${highlightClass} ${slot.isActive ? config.border : 'border-slate-200'}`}
                                                    title={`${config.label} - ${slot.calendarLabel}`}
                                                >
                                                        <div className="h-full flex flex-col items-center justify-center px-2 py-2">
                                                            <div className={`text-sm font-semibold leading-tight ${labelClass}`}>
                                                                <div>{getMonthName(slot.calendarMonth)}</div>
                                                                <div>{slot.calendarYear}</div>
                                                            </div>
                                                        </div>
                                                        <div className="absolute left-1/2 bottom-2 -translate-x-1/2 w-8 h-1 rounded-full overflow-hidden bg-white/70">
                                                            <div
                                                                className={`h-full rounded-full ${barClass}`}
                                                                style={{ width: status === 'completed' ? '100%' : status === 'active' ? '100%' : progressHint > 0 ? '45%' : '0%' }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        <td className="p-2 text-center">
                                            <div className="flex items-center gap-1">
                                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(progressPercent)}`}
                                                        style={{ width: `${progressPercent}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-600 w-8">{progressPercent}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                </React.Fragment>
                            );
                        })}
                        {projects.length === 0 && (
                            <tr>
                                <td colSpan={14} className="p-8 text-center text-slate-400 text-sm">
                                    No hay proyectos para mostrar
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            )}

        </div>
    );
};

export default ProjectProgressMatrix;

