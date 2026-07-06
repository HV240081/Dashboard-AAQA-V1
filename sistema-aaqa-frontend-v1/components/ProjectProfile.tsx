import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Save, Building2, MapPin, Users, DollarSign, Activity, GraduationCap, Handshake, Plus, Trash2, Edit3, Home, Hammer, BrickWall, UserPlus, Image as ImageIcon, Upload, X, BarChart3, Camera, FileText, FileSpreadsheet, AlertTriangle, CheckCircle, Clock, AlertCircle, History, ChevronDown, Calendar } from 'lucide-react';
import { Project, AllyContribution, TrainingParticipant, CategoryType, MonthlyReport, GoalChangeLog, ProjectMonthComment, ProjectActivity } from '../types';
import { useData } from '../contexts/useData';
import ProjectProgressMatrix from './ProjectProgressMatrix';
import MonthlyReportModal from './MonthlyReportModal';
import * as XLSX from 'xlsx';

interface ProjectProfileProps {
    projectId: string;
    onBack: () => void;
}

const ProjectProfile: React.FC<ProjectProfileProps> = ({ projectId, onBack }) => {
    const { data, updateProjectList } = useData();
    
    // SAFE FIND LOGIC
    const projectFromList = useMemo(() => {
        if (!data?.projectsList || !Array.isArray(data.projectsList)) return undefined;
        return data.projectsList.find(p => p.id === projectId);
    }, [data?.projectsList, projectId]);

    const [detailedProject, setDetailedProject] = useState<Project | null>(null);

    // State for Editing Mode
    const [isEditing, setIsEditing] = useState(false);
    const [editedProject, setEditedProject] = useState<Project | null>(null);
    const [editedMonthComments, setEditedMonthComments] = useState<Record<number, ProjectMonthComment[]>>({});
    const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
    const [selectedActivityMonth, setSelectedActivityMonth] = useState<number>(1);
    const [newActivityDraft, setNewActivityDraft] = useState<{ name: string; status: ProjectActivity['status']; observations: string }>({
        name: '',
        status: 'pending',
        observations: '',
    });
    const [activityChecklistFilter, setActivityChecklistFilter] = useState<'all' | ProjectActivity['status']>('all');
    const [openActivityStatusMenuId, setOpenActivityStatusMenuId] = useState<string | null>(null);
    const [isActivityFilterMenuOpen, setIsActivityFilterMenuOpen] = useState(false);
    const [isAllActivitiesModalOpen, setIsAllActivitiesModalOpen] = useState(false);

    // State for New Report Modal
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isManualTrackingModalOpen, setIsManualTrackingModalOpen] = useState(false);
    const [newReport, setNewReport] = useState<MonthlyReport>({
        id: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        realTechnical: 0,
        realFinancial: 0,
        scheduleStatus: 'En Tiempo',
        observations: '',
        photos: [],
        createdAt: '',
        createdBy: ''
    });

    const project = detailedProject || projectFromList;

    // Initial Load & Hydration
    useEffect(() => {
        if (project) {
            // Deep copy to avoid mutating state directly
            const projectCopy = JSON.parse(JSON.stringify(project));
            
            // Initialize defaults to prevent undefined errors
            if (project.category === 'Community' && !projectCopy.communityCounterpart) {
                projectCopy.communityCounterpart = {
                    laborAmount: projectCopy.counterpart || 0,
                    materialsAmount: 0
                };
            }
            if (!projectCopy.trainingDetails) {
                 projectCopy.trainingDetails = {
                     hasTraining: false,
                     year: projectCopy.year,
                     trainedOrganization: projectCopy.organization,
                     participants: []
                 };
            }
            if (!projectCopy.progress) {
                projectCopy.progress = Array(12).fill('pending');
            }
            if (!projectCopy.photos) {
                projectCopy.photos = [];
            }
            if (!projectCopy.monthlyTrackingDocuments) {
                projectCopy.monthlyTrackingDocuments = [];
            }
            if (!projectCopy.reports) {
                projectCopy.reports = [];
            }
            if (!projectCopy.goalHistory) {
                projectCopy.goalHistory = [];
            }
            if (!projectCopy.monthComments) {
                projectCopy.monthComments = {};
            }
            if (projectCopy.metaFinancial === undefined) {
                projectCopy.metaFinancial = 0;
            }
            
            // Ensure numeric fields exist
            if (projectCopy.technicalProgressPercentage === undefined) projectCopy.technicalProgressPercentage = 0;
            if (projectCopy.financialProgressPercentage === undefined) projectCopy.financialProgressPercentage = 0;
            if (projectCopy.indirectBeneficiaries === undefined) projectCopy.indirectBeneficiaries = 0;

            setEditedProject(projectCopy);
            setEditedMonthComments(projectCopy.monthComments || {});
            setCommentDrafts({});
            setSelectedActivityMonth(projectCopy.timelineStartMonth || 1);
        }
    }, [project]);

    useEffect(() => {
        if (!projectFromList || isEditing) {
            return;
        }

        let cancelled = false;

        const refreshDetailedProject = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const response = await fetch(`http://localhost:3000/projects/${projectId}`, {
                    headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) return;

                const result = await response.json();
                const detail = (result?.data ?? result) as Project | null;
                if (!detail || cancelled) return;

                setDetailedProject(detail);
                setEditedProject(detail);
                setEditedMonthComments(detail.monthComments || {});
            } catch (error) {
                console.warn('No se pudo refrescar el detalle completo del proyecto', error);
            }
        };

        refreshDetailedProject();

        return () => {
            cancelled = true;
        };
    }, [projectFromList, isEditing, projectId]);

    useEffect(() => {
        if (!detailedProject) return;

        const detailedCopy = JSON.parse(JSON.stringify(detailedProject));
        setEditedProject(prev => {
            if (!prev) {
                return detailedCopy;
            }
            return {
                ...prev,
                ...detailedCopy,
                contact1Name: detailedCopy.contact1Name ?? prev.contact1Name ?? '',
                contact1Role: detailedCopy.contact1Role ?? prev.contact1Role ?? '',
                contact1DirectPhone: detailedCopy.contact1DirectPhone ?? prev.contact1DirectPhone ?? '',
                contact1OrganizationPhone: detailedCopy.contact1OrganizationPhone ?? prev.contact1OrganizationPhone ?? '',
                contact1Email: detailedCopy.contact1Email ?? prev.contact1Email ?? '',
                contact2Name: detailedCopy.contact2Name ?? prev.contact2Name ?? '',
                contact2Role: detailedCopy.contact2Role ?? prev.contact2Role ?? '',
                contact2DirectPhone: detailedCopy.contact2DirectPhone ?? prev.contact2DirectPhone ?? '',
                contact2OrganizationPhone: detailedCopy.contact2OrganizationPhone ?? prev.contact2OrganizationPhone ?? '',
                contact2Email: detailedCopy.contact2Email ?? prev.contact2Email ?? '',
            };
        });
    }, [detailedProject]);

    useEffect(() => {
        let cancelled = false;

        const fetchProjectDetails = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const response = await fetch(`http://localhost:3000/projects/${projectId}`, {
                    headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) return;

                const result = await response.json();
                const detail = (result?.data ?? result) as Project | null;
                if (!detail || cancelled) return;

                setDetailedProject(detail);
            } catch (error) {
                console.warn('No se pudo cargar el detalle completo del proyecto', error);
            }
        };

        fetchProjectDetails();

        return () => {
            cancelled = true;
        };
    }, [projectId]);

    // --- CRITICAL GUARD: Render nothing or error if project is missing ---
    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center h-64 p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-3">
                    <AlertTriangle className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Proyecto no encontrado</h2>
                <p className="text-slate-500 text-sm mt-1 mb-4">
                    El proyecto solicitado no existe en la base de datos o ha sido eliminado.
                </p>
                <button 
                    onClick={onBack}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition-colors"
                >
                    Volver al listado
                </button>
            </div>
        );
    }

    // SAFE ACCESS to variables (Only calculated if project exists)
    // Fallback to project values if editedProject is not yet set (during first render after mount)
    const activeData = editedProject || project;
    function getMonthNumber(value: any): number {
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
    }

    const parseMoneyLike = (value: any) => {
        if (value === null || value === undefined || value === '') return 0;
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
        const text = String(value).trim().replace(/\$/g, '').replace(/\s+/g, '').replace(/%/g, '');
        if (!text) return 0;
        let normalized = text;
        const hasComma = normalized.includes(',');
        const hasDot = normalized.includes('.');
        if (hasComma && hasDot) {
            if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
                normalized = normalized.replace(/\./g, '').replace(/,/g, '.');
            } else {
                normalized = normalized.replace(/,/g, '');
            }
        } else if (hasComma && !hasDot) {
            const commaCount = (normalized.match(/,/g) || []).length;
            const commaIndex = normalized.lastIndexOf(',');
            const decimals = normalized.length - commaIndex - 1;
            if (commaCount === 1 && decimals > 0 && decimals <= 2) {
                normalized = normalized.replace(/,/g, '.');
            } else {
                normalized = normalized.replace(/,/g, '');
            }
        } else {
            normalized = normalized.replace(/,/g, '');
        }
        const parsed = Number(normalized.replace(/[^0-9.-]/g, ''));
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const getMonthlyTechnicalPercent = (report: MonthlyReport) => {
        const value = (report?.scheduleStatus ?? '').toString().trim().toLowerCase();
        const durationMonths = Math.max(1, Math.min(12, activeData.timelineDurationMonths || 12));
        const monthlyWeight = 100 / durationMonths;
        if (value === 'completed' || value.includes('finaliz') || value.includes('complet')) {
            return Number(monthlyWeight.toFixed(2));
        }
        if (value === 'active' || value.includes('ejec') || value.includes('proceso') || value.includes('avance') || value.includes('tiempo')) {
            return Number((monthlyWeight * 0.5).toFixed(2));
        }
        return 0;
    };

    const getMonthlyFinancialPercent = (report: MonthlyReport) => {
        const baseInvestment = parseMoneyLike(activeData.amountFGK);
        const monthlyAmount = parseMoneyLike(report?.metaFinancial);
        if (baseInvestment <= 0 || monthlyAmount <= 0) return 0;
        return Math.max(0, Math.min(100, Number(((monthlyAmount / baseInvestment) * 100).toFixed(2))));
    };

    const technicalProgress = useMemo(() => {
        const statusToScore = (status?: any) => {
            const value = (status ?? '').toString().trim().toLowerCase();
            if (value === 'completed' || value.includes('finaliz') || value.includes('complet')) return 100;
            if (value === 'active' || value.includes('ejec') || value.includes('proceso') || value.includes('avance') || value.includes('tiempo')) return 50;
            return 0;
        };

        const reports = Array.isArray(activeData.reports) ? activeData.reports : [];
        const durationMonths = Math.max(1, Math.min(12, activeData.timelineDurationMonths || 12));
        const startMonth = activeData.timelineStartMonth || 1;
        const startYear = activeData.year || new Date().getFullYear();
        const timelineSlots = Array.from({ length: durationMonths }, (_, idx) => {
            const date = new Date(startYear, (startMonth - 1) + idx, 1);
            return { month: date.getMonth() + 1, year: date.getFullYear() };
        });

        if (reports.length > 0) {
            const activityList = Array.isArray(activeData.activities) ? activeData.activities : [];
            const groupedActivities = new Map<number, ProjectActivity[]>();
            activityList.forEach((activity) => {
                const month = getMonthNumber(activity.month);
                const list = groupedActivities.get(month) || [];
                list.push(activity);
                groupedActivities.set(month, list);
            });

            const monthScores = timelineSlots.map((slot) => {
                const monthActivities = groupedActivities.get(slot.month) || [];
                if (monthActivities.length > 0) {
                    const score = monthActivities.reduce((sum, activity) => sum + statusToScore(activity.status), 0) / Math.max(1, monthActivities.length);
                    return score;
                }
                const report = [...reports].reverse().find((item: any) => {
                    const reportMonth = parseInt(String(item.month || item.mes || 0), 10) || 0;
                    const reportYear = parseInt(String(item.year || item.año || 0), 10) || 0;
                    return reportMonth === slot.month && reportYear === slot.year;
                });
                return statusToScore(report?.scheduleStatus);
            });
            return Math.max(0, Math.min(100, Number((monthScores.reduce((sum, value) => sum + value, 0) / Math.max(1, timelineSlots.length)).toFixed(2))));
        }

        const activities = Array.isArray(activeData.activities) ? activeData.activities : [];
        if (activities.length > 0) {
            const grouped = new Map<number, ProjectActivity[]>();
            activities.forEach((activity) => {
                const month = getMonthNumber(activity.month);
                const list = grouped.get(month) || [];
                list.push(activity);
                grouped.set(month, list);
            });

            const monthSequence = timelineSlots.map((slot) => slot.month);
            const monthScores = monthSequence.map((month) => {
                const list = grouped.get(month) || [];
                if (list.length === 0) return 0;
                const completedCount = list.filter((item) => statusToScore(item.status) === 100).length;
                const activeCount = list.filter((item) => statusToScore(item.status) === 50).length;
                return ((completedCount + (activeCount * 0.5)) / Math.max(1, list.length)) * 100;
            });

            return Math.max(0, Math.min(100, Number((monthScores.reduce((sum, value) => sum + value, 0) / Math.max(1, timelineSlots.length)).toFixed(2))));
        }

        return Math.max(0, Math.min(100, Number(activeData.technicalProgressPercentage || 0)));
    }, [activeData.activities, activeData.reports, activeData.timelineDurationMonths, activeData.timelineStartMonth, activeData.technicalProgressPercentage, activeData.year]);

    const financialProgress = useMemo(() => {
        const reports = Array.isArray(activeData.reports) ? activeData.reports : [];
        const baseInvestment = parseMoneyLike(activeData.amountFGK);
        if (baseInvestment > 0) {
            const executedAmount = reports.reduce((sum, report) => sum + parseMoneyLike(report.metaFinancial), 0);
            if (executedAmount > 0) {
                return Math.min(100, Number(((executedAmount / baseInvestment) * 100).toFixed(2)));
            }
            const executedFromProject = parseMoneyLike(activeData.metaFinancial);
            if (executedFromProject > 0) {
                return Math.min(100, Number(((executedFromProject / baseInvestment) * 100).toFixed(2)));
            }
            return Math.max(0, Math.min(100, Number(activeData.financialProgressPercentage || 0)));
        }
        return Math.max(0, Math.min(100, Number(activeData.financialProgressPercentage || 0)));
    }, [activeData.amountFGK, activeData.financialProgressPercentage, activeData.metaFinancial, activeData.reports]);
    const toNumber = (value: any) => parseMoneyLike(value);
    const currentTotalInvestment = toNumber(activeData.amountFGK) +
                                   toNumber(activeData.amountAllies) +
                                   toNumber(activeData.counterpart);

    const isCommunity = project.category === 'Community';

    // Theme Helper
    const getTheme = (cat: CategoryType) => {
        switch (cat) {
            case 'ONG':
                return { text: 'text-orange-600', textDark: 'text-orange-800', bg: 'bg-orange-50', bgDark: 'bg-orange-600', border: 'border-orange-200', borderStrong: 'border-orange-500', ring: 'focus:ring-orange-500', hoverText: 'hover:text-orange-700', buttonPrimary: 'bg-orange-600 hover:bg-orange-700' };
            case 'Community':
                return { text: 'text-lime-700', textDark: 'text-lime-900', bg: 'bg-lime-50', bgDark: 'bg-lime-600', border: 'border-lime-200', borderStrong: 'border-lime-500', ring: 'focus:ring-lime-500', hoverText: 'hover:text-lime-800', buttonPrimary: 'bg-lime-600 hover:bg-lime-700' };
            case 'FIS':
                return { text: 'text-emerald-700', textDark: 'text-emerald-900', bg: 'bg-emerald-50', bgDark: 'bg-emerald-700', border: 'border-emerald-200', borderStrong: 'border-emerald-600', ring: 'focus:ring-emerald-500', hoverText: 'hover:text-emerald-800', buttonPrimary: 'bg-emerald-700 hover:bg-emerald-800' };
            default:
                return { text: 'text-blue-600', textDark: 'text-blue-900', bg: 'bg-blue-50', bgDark: 'bg-blue-600', border: 'border-blue-200', borderStrong: 'border-blue-500', ring: 'focus:ring-blue-500', hoverText: 'hover:text-blue-700', buttonPrimary: 'bg-blue-600 hover:bg-blue-700' };
        }
    };
    const theme = getTheme(project.category);
    
    // Formatters
    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    const formatInt = (val: number) => new Intl.NumberFormat('en-US').format(val);
    const formatPercent = (val: number) => `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(val) || 0)}%`;
    const monthOptions = [
        { value: 1, label: 'Enero' },
        { value: 2, label: 'Febrero' },
        { value: 3, label: 'Marzo' },
        { value: 4, label: 'Abril' },
        { value: 5, label: 'Mayo' },
        { value: 6, label: 'Junio' },
        { value: 7, label: 'Julio' },
        { value: 8, label: 'Agosto' },
        { value: 9, label: 'Septiembre' },
        { value: 10, label: 'Octubre' },
        { value: 11, label: 'Noviembre' },
        { value: 12, label: 'Diciembre' },
    ];
    const getMonthLabel = (month: any) => {
        const value = Number(month);
        return monthOptions.find((item) => item.value === value)?.label || `Mes ${value || '-'}`;
    };
    const trackingMetaHistory = useMemo(() => {
        const reports = Array.isArray(activeData.reports) ? [...activeData.reports] : [];
        return reports
            .map((report) => ({
                ...report,
                metaFinancialAmount: parseMoneyLike(report.metaFinancial),
            }))
            .filter((report) => report.metaFinancialAmount > 0)
            .sort((a, b) => {
                if ((b.year || 0) !== (a.year || 0)) return (b.year || 0) - (a.year || 0);
                return (b.month || 0) - (a.month || 0);
            })
            .map((report) => ({
                id: report.id,
                label: `${getMonthLabel(report.month)} ${report.year || activeData.year}`,
                amount: report.metaFinancialAmount,
            }));
    }, [activeData.reports, activeData.year]);

    const deriveDurationMonths = (startMonth?: number | null, endMonth?: number | null) => {
        if (!startMonth || !endMonth) return activeData.timelineDurationMonths || 12;
        return endMonth >= startMonth
            ? endMonth - startMonth + 1
            : (12 - startMonth + 1) + endMonth;
    };

    const updateTimelineMonth = (field: 'timelineStartMonth' | 'timelineEndMonth', value: number | null) => {
        setEditedProject(prev => {
            if (!prev) return prev;
            const nextStart = field === 'timelineStartMonth' ? value : (prev.timelineStartMonth ?? value);
            const nextEnd = field === 'timelineEndMonth' ? value : (prev.timelineEndMonth ?? value);
            return {
                ...prev,
                [field]: value,
                timelineDurationMonths: deriveDurationMonths(nextStart, nextEnd),
            };
        });
    };

    // ---- Handlers ----

    const handleSave = () => {
        if (!editedProject) return;
        if ((Number(editedProject.amountAllies) || 0) > 0 && !(editedProject.allyName || '').trim()) {
            alert('Ingrese el Nombre del Aliado cuando el proyecto tenga Fondo Aliados.');
            return;
        }
        persistProjectSnapshot(editedProject, true);
    };

    const handleChange = (field: keyof Project, value: any) => setEditedProject(prev => prev ? ({ ...prev, [field]: value }) : null);

    const handleProgressMatrixUpdate = (updatedProjects: Project[]) => {
        // Updates the Matrix schedule only
        const updated = updatedProjects[0];
        setEditedProject(prev => prev ? ({
            ...prev,
            progress: updated.progress,
            activities: updated.activities || prev.activities,
            reports: updated.reports || prev.reports,
        }) : null);
    };

    const normalizeActivityStatus = (status?: any): ProjectActivity['status'] => {
        const value = (status ?? '').toString().trim().toLowerCase();
        if (value === 'completed' || value.includes('finaliz') || value.includes('complet')) return 'completed';
        if (value.includes('ejec') || value.includes('proceso') || value.includes('active')) return 'active';
        return 'pending';
    };

    const recalculateProgressFromActivities = (activities: ProjectActivity[] = []) => {
        const nextProgress: ProjectActivity['status'][] = Array(12).fill('pending');
        const grouped = new Map<number, ProjectActivity[]>();

        activities.forEach((activity) => {
            const month = getMonthNumber(activity.month);
            const list = grouped.get(month) || [];
            list.push(activity);
            grouped.set(month, list);
        });

        grouped.forEach((list, month) => {
            const statuses = list.map((item) => normalizeActivityStatus(item.status));
            if (statuses.every((status) => status === 'completed')) {
                nextProgress[month - 1] = 'completed';
            } else if (statuses.some((status) => status === 'completed' || status === 'active')) {
                nextProgress[month - 1] = 'active';
            } else {
                nextProgress[month - 1] = 'pending';
            }
        });

        return nextProgress;
    };

    const deriveMonthStatusFromActivities = (activities: ProjectActivity[] = [], month: number): ProjectActivity['status'] => {
        const monthActivities = activities.filter((activity) => getMonthNumber(activity.month) === month);
        if (monthActivities.length === 0) return 'pending';
        const statuses = monthActivities.map((activity) => normalizeActivityStatus(activity.status));
        if (statuses.every((status) => status === 'completed')) return 'completed';
        if (statuses.some((status) => status === 'completed' || status === 'active')) return 'active';
        return 'pending';
    };

    const persistActivityChanges = (nextActivities: ProjectActivity[]) => {
        if (!editedProject) return;
        const nextProgress = recalculateProgressFromActivities(nextActivities);
        const activityMonths = Array.from(new Set(nextActivities.map((activity) => getMonthNumber(activity.month)).filter(Boolean)));
        const nextReports = (editedProject.reports || []).map((report) => {
            const month = Number(report.month || 0);
            if (!activityMonths.includes(month)) return report;
            const status = deriveMonthStatusFromActivities(nextActivities, month);
            const realTechnical = status === 'completed' ? 100 : status === 'active' ? 50 : 0;
            return {
                ...report,
                scheduleStatus: status,
                realTechnical,
            };
        });
        const nextProject: Project = {
            ...editedProject,
            activities: nextActivities,
            reports: nextReports,
            progress: nextProgress,
        };
        persistProjectSnapshot(nextProject, false);
    };

    const handleActivityFieldChange = (activityId: string, field: keyof ProjectActivity, value: any) => {
        if (!editedProject) return;
        const nextActivities = [...(editedProject.activities || [])].map((activity) =>
            activity.id === activityId ? { ...activity, [field]: value } : activity
        );
        persistActivityChanges(nextActivities);
    };

    const handleAddActivity = () => {
        if (!editedProject) return;
        const name = newActivityDraft.name.trim();
        if (!name) return;

        const month = selectedActivityMonth || editedProject.timelineStartMonth || 1;
        const nextActivities = [
            ...(editedProject.activities || []),
            {
                id: `act-${month}-${Date.now()}`,
                name,
                month,
                status: normalizeActivityStatus(newActivityDraft.status),
                observations: newActivityDraft.observations.trim(),
            } as ProjectActivity
        ];

        persistActivityChanges(nextActivities);
        setNewActivityDraft({
            name: '',
            status: 'pending',
            observations: '',
        });
    };

    const handleRemoveActivity = (activityId: string) => {
        if (!editedProject) return;
        const nextActivities = (editedProject.activities || []).filter((activity) => activity.id !== activityId);
        persistActivityChanges(nextActivities);
    };

    const handleDeleteMonthlyProgress = (report: MonthlyReport) => {
        if (!editedProject) return;

        const reportMonth = Number(report.month || 0);
        const reportYear = Number(report.year || activeData.year || project.year || new Date().getFullYear());
        const monthLabel = `${getMonthFullName(reportMonth)} ${reportYear}`;
        const confirmed = window.confirm(
            `¿Desea eliminar el seguimiento de ${monthLabel}? Se quitará el avance técnico, el avance financiero, la observación y las actividades registradas para ese mes.`
        );
        if (!confirmed) return;

        const nextReports = (editedProject.reports || []).filter((item) => {
            if (report.id && item.id === report.id) return false;
            const itemMonth = Number(item.month || 0);
            const itemYear = Number(item.year || activeData.year || project.year || 0);
            return !(itemMonth === reportMonth && itemYear === reportYear);
        });
        const nextActivities = (editedProject.activities || []).filter((activity) => {
            const activityMonth = getMonthNumber(activity.month ?? activity.mes ?? activity.monthRaw ?? activity.period);
            return activityMonth !== reportMonth;
        });

        const startMonth = editedProject.timelineStartMonth || activeData.timelineStartMonth || 1;
        const durationMonths = Math.max(1, Math.min(12, editedProject.timelineDurationMonths || activeData.timelineDurationMonths || 12));
        const startYear = editedProject.year || activeData.year || project.year || new Date().getFullYear();
        const timelineSlots = Array.from({ length: durationMonths }, (_, idx) => {
            const date = new Date(startYear, (startMonth - 1) + idx, 1);
            return { month: date.getMonth() + 1, year: date.getFullYear() };
        });

        const statusToScore = (status?: any) => {
            const normalized = (status ?? '').toString().trim().toLowerCase();
            if (normalized === 'completed' || normalized.includes('finaliz') || normalized.includes('complet')) return 100;
            if (normalized === 'active' || normalized.includes('ejec') || normalized.includes('proceso') || normalized.includes('avance') || normalized.includes('tiempo')) return 50;
            return 0;
        };

        const nextProgress = Array(12).fill('pending') as Project['progress'];
        const monthScores = timelineSlots.map((slot) => {
            const matchingReport = [...nextReports].reverse().find((item) => {
                const itemMonth = Number(item.month || 0);
                const itemYear = Number(item.year || activeData.year || project.year || 0);
                return itemMonth === slot.month && itemYear === slot.year;
            });
            if (matchingReport) {
                const status = normalizeActivityStatus(matchingReport.scheduleStatus);
                nextProgress[slot.month - 1] = status;
                return statusToScore(status);
            }

            const monthActivities = nextActivities.filter((activity) => {
                const activityMonth = getMonthNumber(activity.month ?? activity.mes ?? activity.monthRaw ?? activity.period);
                return activityMonth === slot.month;
            });
            if (monthActivities.length === 0) {
                nextProgress[slot.month - 1] = 'pending';
                return 0;
            }

            const monthStatus = deriveMonthStatusFromActivities(nextActivities, slot.month);
            nextProgress[slot.month - 1] = monthStatus;
            const score = monthActivities.reduce((sum, activity) => sum + statusToScore(activity.status), 0) / Math.max(1, monthActivities.length);
            return score;
        });

        const nextTechnicalProgress = Math.max(0, Math.min(100, Number((monthScores.reduce((sum, value) => sum + value, 0) / Math.max(1, timelineSlots.length)).toFixed(2))));
        const executedAmount = nextReports.reduce((sum, item) => sum + parseMoneyLike(item.metaFinancial), 0);
        const baseInvestment = parseMoneyLike(editedProject.amountFGK);
        const nextFinancialProgress = baseInvestment > 0
            ? Math.max(0, Math.min(100, Number(((executedAmount / baseInvestment) * 100).toFixed(2))))
            : 0;

        const nextMonthComments = { ...(editedProject.monthComments || {}) };
        delete nextMonthComments[reportMonth];
        const nextMonthObservations = { ...((editedProject as any).monthObservations || {}) };
        delete nextMonthObservations[reportMonth];

        const nextProject: Project = {
            ...editedProject,
            reports: nextReports,
            activities: nextActivities,
            progress: nextProgress,
            technicalProgressPercentage: nextTechnicalProgress,
            financialProgressPercentage: nextFinancialProgress,
            metaFinancial: executedAmount,
            monthComments: nextMonthComments,
            monthObservations: nextMonthObservations,
        };

        persistProjectSnapshot(nextProject, false);
        setEditedMonthComments(nextMonthComments);
        setSelectedReportId(nextReports[0]?.id || null);
    };

    const getMonthComments = (month: number) => {
        const source = isEditing ? editedMonthComments : (activeData.monthComments || {});
        return source[month] || [];
    };

    const handleUpdateCommentDraft = (month: number, value: string) => {
        setCommentDrafts(prev => ({
            ...prev,
            [month]: value
        }));
    };

    const handleAddMonthComment = (month: number) => {
        if (!editedProject) return;
        const draft = (commentDrafts[month] || '').trim();
        if (!draft) return;

        const nextComments = [...(editedMonthComments[month] || []), {
            id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            month,
            text: draft,
            author: 'Sistema',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }];

        const nextMap = {
            ...editedMonthComments,
            [month]: nextComments,
        };

        setEditedMonthComments(nextMap);
        const nextProject = {
            ...editedProject,
            monthComments: nextMap,
        };
        setEditedProject(nextProject);
        persistProjectSnapshot(nextProject, false);
        setCommentDrafts(prev => ({
            ...prev,
            [month]: ''
        }));
    };

    const handleRemoveMonthComment = (month: number, commentId: string) => {
        if (!editedProject) return;
        const nextComments = (editedMonthComments[month] || []).filter(comment => comment.id !== commentId);
        const nextMap = {
            ...editedMonthComments,
            [month]: nextComments,
        };
        if (nextComments.length === 0) {
            delete nextMap[month];
        }
        setEditedMonthComments(nextMap);
        const nextProject = {
            ...editedProject,
            monthComments: nextMap,
        };
        setEditedProject(nextProject);
        persistProjectSnapshot(nextProject, false);
    };

    const slugifySegment = (value: any) =>
        (value ?? '')
            .toString()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9._-]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .toLowerCase() || 'general';

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editedProject || !e.target.files?.length) return;

        try {
            const uploadedUrls: string[] = [];
            for (const file of Array.from(e.target.files)) {
                const url = await uploadProjectFile(file, 'evidence_photo');
                uploadedUrls.push(url);
            }

            const nextProject: Project = {
                ...editedProject,
                photos: [...(editedProject.photos || []), ...uploadedUrls]
            };

            persistProjectSnapshot(nextProject, false);
        } catch (error) {
            console.error('Error subiendo Evidencia Fotográfica:', error);
            alert('No se pudieron subir las imágenes.');
        } finally {
            e.target.value = '';
        }
    };

    const handleRemovePhoto = (index: number) => {
        if (!editedProject) return;
        const targetUrl = editedProject.photos?.[index];
        if (!targetUrl) return;
        deleteProjectFile(targetUrl)
            .then(() => {
                const nextProject = {
                    ...editedProject,
                    photos: editedProject.photos.filter((_, i) => i !== index)
                };
                persistProjectSnapshot(nextProject, false);
            })
            .catch((error) => {
                console.error('Error eliminando Evidencia Fotográfica:', error);
                alert('No se pudo eliminar la imagen.');
            });
    };

    const uploadProjectFile = async (file: File, resourceType: string) => {
        const formData = new FormData();
        const uploadCategory = slugifySegment(activeData?.category || project?.category);
        const uploadYear = String(activeData?.year || project?.year || 'sin-edicion');
        const uploadProjectName = slugifySegment(activeData?.name || project?.name || 'sin-proyecto');

        // Importante: primero se agregan los campos y al final el archivo,
        // para que Multer alcance a leer la metadata antes de guardar.
        formData.append('category', uploadCategory);
        formData.append('year', uploadYear);
        formData.append('projectName', uploadProjectName);
        formData.append('resourceType', slugifySegment(resourceType));
        formData.append('file', file);
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:3000/upload/media', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'No se pudo subir el archivo');
        }
        return result.url as string;
    };

    const deleteProjectFile = async (url: string) => {
        if (!url) return;
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:3000/upload/media/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ url }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.message || 'No se pudo eliminar el archivo');
        }
    };

    const normalizeText = (value: any) =>
        (value ?? '').toString().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    const normalizeHeader = (value: any) => normalizeText(value).replace(/\s+/g, ' ');

    const normalizeMonthValue = (value: any) => {
        const raw = (value ?? '').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const monthMap: Record<string, number> = {
            enero: 1, ene: 1,
            febrero: 2, feb: 2,
            marzo: 3, mar: 3,
            abril: 4, abr: 4,
            mayo: 5, may: 5,
            junio: 6, jun: 6,
            julio: 7, jul: 7,
            agosto: 8, ago: 8,
            septiembre: 9, sep: 9, set: 9,
            octubre: 10, oct: 10,
            noviembre: 11, nov: 11,
            diciembre: 12, dic: 12
        };
        const numeric = parseInt(raw, 10);
        if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 12) return numeric;
        return monthMap[raw] || 0;
    };

    const resolveProjectRelativeMonth = (rawValue: any, projectStartMonth: number) => {
        const rawText = (rawValue ?? '').toString().trim();
        const normalized = rawText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const namedMonth = normalizeMonthValue(rawText);

        const monthNameDetected = [
            'enero', 'ene',
            'febrero', 'feb',
            'marzo', 'mar',
            'abril', 'abr',
            'mayo', 'may',
            'junio', 'jun',
            'julio', 'jul',
            'agosto', 'ago',
            'septiembre', 'sep', 'set',
            'octubre', 'oct',
            'noviembre', 'nov',
            'diciembre', 'dic'
        ].some(token => normalized.includes(token));

        if (monthNameDetected && namedMonth > 0) {
            return namedMonth;
        }

        const numeric = parseInt(normalized.replace(/[^\d]/g, ''), 10);
        if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 12) {
            const base = Math.max(1, Math.min(12, projectStartMonth || 1));
            return ((base - 1 + (numeric - 1)) % 12) + 1;
        }

        return namedMonth;
    };

    const isIgnorableActivityLabel = (value: any) => {
        const text = normalizeText(value);
        return [
            '',
            'actividad',
            'actividades',
            'observaciones',
            'observacion',
            'estado',
            'mes',
            'mes del proyecto',
            'proyecto',
            'progreso',
            'acciones',
        ].includes(text);
    };

    const parseNumberLike = (value: any) => {
        if (value === null || value === undefined || value === '') return 0;
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
        const cleaned = value.toString().replace(/\$/g, '').replace(/\s+/g, '').replace(/,/g, '');
        const parsed = parseFloat(cleaned);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const findSheetByAliases = (sheetNames: string[], aliases: string[]) => {
        const normalizedAliases = aliases.map(alias => normalizeText(alias));
        return sheetNames.find(name => normalizedAliases.includes(normalizeText(name)));
    };

    const findHeaderRowIndex = (rows: any[][], requiredTokens: string[]) => {
        const normalizedTokens = requiredTokens.map(token => normalizeText(token));
        return rows.findIndex(row =>
            Array.isArray(row) &&
            row.some(cell => normalizedTokens.some(token => normalizeText(cell).includes(token)))
        );
    };

    const addDocumentUrl = async (field: 'completionLetter' | 'changeControlDocuments' | 'monthlyTrackingDocuments', files: FileList | File[]) => {
        if (!editedProject) return;
        const uploadedUrls: string[] = [];
        for (const file of Array.from(files)) {
            const url = await uploadProjectFile(file, field);
            uploadedUrls.push(url);
        }

        const nextProject: Project = { ...editedProject };
        if (field === 'completionLetter') {
            nextProject.completionLetter = uploadedUrls[0] || nextProject.completionLetter || '';
        } else if (field === 'changeControlDocuments') {
            nextProject.changeControlDocuments = [...(nextProject.changeControlDocuments || []), ...uploadedUrls];
        } else {
            nextProject.monthlyTrackingDocuments = [...(nextProject.monthlyTrackingDocuments || []), ...uploadedUrls];
        }
        persistProjectSnapshot(nextProject, false);
    };

    const removeDocumentUrl = (field: 'completionLetter' | 'changeControlDocuments' | 'monthlyTrackingDocuments', index = 0) => {
        if (!editedProject) return;
        const nextProject: Project = { ...editedProject };
        const targetUrl = field === 'completionLetter'
            ? editedProject.completionLetter
            : field === 'changeControlDocuments'
                ? editedProject.changeControlDocuments?.[index]
                : editedProject.monthlyTrackingDocuments?.[index];
        if (field === 'completionLetter') {
            nextProject.completionLetter = '';
        } else if (field === 'changeControlDocuments') {
            nextProject.changeControlDocuments = (nextProject.changeControlDocuments || []).filter((_, i) => i !== index);
        } else {
            nextProject.monthlyTrackingDocuments = (nextProject.monthlyTrackingDocuments || []).filter((_, i) => i !== index);
        }
        if (targetUrl) {
            deleteProjectFile((targetUrl || '').toString().split(',')[0])
                .then(() => persistProjectSnapshot(nextProject, false))
                .catch((error) => {
                    console.error('Error eliminando documento:', error);
                    alert('No se pudo eliminar el archivo.');
                });
        } else {
            persistProjectSnapshot(nextProject, false);
        }
    };

    const persistProjectSnapshot = (projectSnapshot: Project, shouldCloseEditor = true) => {
        let finalProject = { ...projectSnapshot };
        finalProject.monthComments = projectSnapshot.monthComments ?? editedMonthComments;

        const totalAllies = (projectSnapshot.allies || []).reduce((sum, ally) => sum + toNumber(ally.amount), 0);
        finalProject.amountAllies = totalAllies > 0 ? totalAllies : toNumber(projectSnapshot.amountAllies);

        if (isCommunity && projectSnapshot.communityCounterpart) {
            finalProject.counterpart = (projectSnapshot.communityCounterpart.laborAmount || 0) + (projectSnapshot.communityCounterpart.materialsAmount || 0);
        }

        const newList = [...data.projectsList];
        const idx = newList.findIndex(p => p.id === project.id);
        if (idx !== -1) {
            newList[idx] = finalProject;
            updateProjectList(newList);
            setEditedProject(finalProject);
            setDetailedProject(finalProject);
            if (shouldCloseEditor) {
                setIsEditing(false);
                setEditedMonthComments(finalProject.monthComments || {});
                setCommentDrafts({});
            }
        }
    };

    // --- NEW HANDLERS START ---
    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && editedProject) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditedProject({
                    ...editedProject,
                    organizationLogo: reader.result as string
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleTrainingDetailsChange = (field: string, value: any) => {
        if (!editedProject) return;
        setEditedProject({
            ...editedProject,
            trainingDetails: {
                ...editedProject.trainingDetails,
                [field]: value
            }
        });
    };

    const handleAddParticipant = () => {
        if (!editedProject) return;
        const newParticipant: TrainingParticipant = {
            id: `tp-${Date.now()}`,
            name: '',
            role: ''
        };
        setEditedProject({
            ...editedProject,
            trainingDetails: {
                ...editedProject.trainingDetails,
                participants: [...editedProject.trainingDetails.participants, newParticipant]
            }
        });
    };

    const handleUpdateParticipant = (id: string, field: keyof TrainingParticipant, value: string) => {
        if (!editedProject) return;
        const updatedParticipants = editedProject.trainingDetails.participants.map(p => 
            p.id === id ? { ...p, [field]: value } : p
        );
        setEditedProject({
            ...editedProject,
            trainingDetails: {
                ...editedProject.trainingDetails,
                participants: updatedParticipants
            }
        });
    };

    const handleRemoveParticipant = (id: string) => {
        if (!editedProject) return;
        const updatedParticipants = editedProject.trainingDetails.participants.filter(p => p.id !== id);
        setEditedProject({
            ...editedProject,
            trainingDetails: {
                ...editedProject.trainingDetails,
                participants: updatedParticipants
            }
        });
    };
    // --- NEW HANDLERS END ---
    
    // --- REPORT HANDLERS ---
    
    const handleOpenReportModal = () => {
        const today = new Date();
        setNewReport({
            id: '',
            month: today.getMonth() + 1,
            year: project.year,
            realTechnical: activeData.technicalProgressPercentage || 0,
            realFinancial: activeData.financialProgressPercentage || 0,
            expectedTechnical: 0,
            expectedFinancial: 0,
            scheduleStatus: 'En Tiempo',
            observations: '',
            photos: [],
            createdAt: '',
            createdBy: ''
        });
        setIsReportModalOpen(true);
    };

    const handleReportPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewReport(prev => ({
                    ...prev,
                    photos: [...(prev.photos || []), reader.result as string]
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const removeReportPhoto = (index: number) => {
        setNewReport(prev => ({
            ...prev,
            photos: (prev.photos || []).filter((_, i) => i !== index)
        }));
    };

    const handleSaveReport = () => {
        if (!editedProject) return;
        
        const timestamp = new Date().toISOString();
        const reportId = `rep-${Date.now()}`;
        
        const reportToSave: MonthlyReport = {
            ...newReport,
            id: reportId,
            metaFinancial: newReport.expectedFinancial,
            createdAt: timestamp,
            createdBy: 'Admin Actual' // In a real app this comes from auth
        };

        // Logic 4: Goal Change History
        
        const existingReportIndex = editedProject.reports.findIndex(r => r.month === reportToSave.month && r.year === reportToSave.year);
        let updatedReports = [...editedProject.reports];
        let newGoalHistory = [...editedProject.goalHistory];

        if (existingReportIndex !== -1) {
            const oldReport = updatedReports[existingReportIndex];
            
            // Check Technical Goal Change
            if (oldReport.expectedTechnical !== undefined && reportToSave.expectedTechnical !== undefined && oldReport.expectedTechnical !== reportToSave.expectedTechnical) {
                newGoalHistory.push({
                    id: `log-t-${Date.now()}`,
                    date: timestamp,
                    user: 'Admin Actual',
                    field: 'Technical',
                    monthYear: `${reportToSave.month}/${reportToSave.year}`,
                    oldValue: oldReport.expectedTechnical,
                    newValue: reportToSave.expectedTechnical,
                    reason: 'Actualización en reporte mensual'
                });
            }

            // Check Financial Goal Change
            if (oldReport.expectedFinancial !== undefined && reportToSave.expectedFinancial !== undefined && oldReport.expectedFinancial !== reportToSave.expectedFinancial) {
                newGoalHistory.push({
                    id: `log-f-${Date.now()}`,
                    date: timestamp,
                    user: 'Admin Actual',
                    field: 'Financial',
                    monthYear: `${reportToSave.month}/${reportToSave.year}`,
                    oldValue: oldReport.expectedFinancial,
                    newValue: reportToSave.expectedFinancial,
                    reason: 'Actualización en reporte mensual'
                });
            }

            updatedReports[existingReportIndex] = reportToSave;
        } else {
            updatedReports.push(reportToSave);
        }

        // Sort reports by date descending
        updatedReports.sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });

        // Update Project State (Also update the main progress bars)
        setEditedProject({
            ...editedProject,
            reports: updatedReports,
            goalHistory: newGoalHistory,
            technicalProgressPercentage: reportToSave.realTechnical,
            financialProgressPercentage: reportToSave.realFinancial
        });

        // Immediately persist to global state so it reflects in dashboard
        const finalProject = {
             ...editedProject,
            reports: updatedReports,
            goalHistory: newGoalHistory,
            technicalProgressPercentage: reportToSave.realTechnical,
            financialProgressPercentage: reportToSave.realFinancial
        };
        const newList = [...data.projectsList];
        const idx = newList.findIndex(p => p.id === project.id);
        if (idx !== -1) {
            newList[idx] = finalProject;
            updateProjectList(newList);
        }

        setIsReportModalOpen(false);
    };

    const handleSaveManualTracking = async (draft: { metaFinancial: number; reportMonth: number; scheduleStatus: 'pending' | 'active' | 'completed'; observations: string; activities: string[] }) => {
        if (!editedProject) return;

        if (activeData.amountFGK > 0 && draft.metaFinancial > activeData.amountFGK) {
            alert('La meta financiera no puede ser mayor que la Inversión FGK.');
            return;
        }

        const statusToScore = (status: any) => {
            const value = (status ?? '').toString().trim().toLowerCase();
            if (value === 'completed' || value.includes('finaliz') || value.includes('complet')) return 100;
            if (value === 'active' || value.includes('ejec') || value.includes('proceso') || value.includes('avance') || value.includes('tiempo')) return 50;
            return 0;
        };

        const startMonth = activeData.timelineStartMonth || 1;
        const durationMonths = Math.max(1, Math.min(12, activeData.timelineDurationMonths || 12));
        const startYear = activeData.year || project.year || new Date().getFullYear();
        const timelineSlots = Array.from({ length: durationMonths }, (_, idx) => {
            const date = new Date(startYear, (startMonth - 1) + idx, 1);
            return { month: date.getMonth() + 1, year: date.getFullYear() };
        });

        const existingReports = Array.isArray(editedProject.reports) ? editedProject.reports : [];
        const reportYear = timelineSlots.find((slot) => slot.month === draft.reportMonth)?.year || startYear;
        const reportScore = statusToScore(draft.scheduleStatus);
        const monthlyFinancialPercent = activeData.amountFGK > 0
            ? Math.min(100, Number(((draft.metaFinancial / activeData.amountFGK) * 100).toFixed(2)))
            : 0;
        const nextReports = existingReports.filter((report) => {
            const month = Number(report.month || (report as any).mes || 0);
            const year = Number(report.year || (report as any).año || 0);
            return !(month === draft.reportMonth && year === reportYear);
        });

        nextReports.push({
            id: `rep-manual-${project.id}-${reportYear}-${String(draft.reportMonth).padStart(2, '0')}`,
            month: draft.reportMonth,
            year: reportYear,
            realTechnical: reportScore,
            realFinancial: monthlyFinancialPercent,
            metaFinancial: draft.metaFinancial,
            scheduleStatus: draft.scheduleStatus,
            observations: draft.observations,
            photos: [],
            createdBy: 'Sistema',
            createdAt: new Date().toISOString(),
        } as MonthlyReport);

        nextReports.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
        });

        const executedAmount = nextReports.reduce((sum, report) => sum + (Number(report.metaFinancial || 0)), 0);
        if (activeData.amountFGK > 0 && executedAmount > activeData.amountFGK) {
            alert('La meta financiera acumulada no puede superar la Inversión FGK.');
            return;
        }

        const nextFinancialProgress = activeData.amountFGK > 0
            ? Math.min(100, Number(((executedAmount / activeData.amountFGK) * 100).toFixed(2)))
            : 0;

        const reportScores = timelineSlots.map((slot) => {
            const report = nextReports.find((item) => item.month === slot.month && item.year === slot.year);
            return statusToScore(report?.scheduleStatus);
        });
        const nextTechnicalProgress = Math.min(100, Number((reportScores.reduce((sum, value) => sum + value, 0) / Math.max(1, timelineSlots.length)).toFixed(2)));

        const nextProgress = Array(12).fill('pending') as Project['progress'];
        timelineSlots.forEach((slot, idx) => {
            const report = nextReports.find((item) => item.month === slot.month && item.year === slot.year);
            nextProgress[(slot.month || idx + 1) - 1] = (report?.scheduleStatus || 'pending') as any;
        });

        const normalizeActivityName = (value: string) => value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const existingActivities = Array.isArray(editedProject.activities) ? editedProject.activities : [];
        const existingMonthActivities = existingActivities.filter((activity) => getMonthNumber(activity.month) === draft.reportMonth);
        const uniqueActivities = Array.from(new Set((draft.activities || []).map((name) => name.trim()).filter(Boolean)));
        const nextMonthActivities = uniqueActivities.map((name, index) => {
            const existing = existingMonthActivities.find((activity) => normalizeActivityName(activity.name || '') === normalizeActivityName(name));
            return {
                id: existing?.id || `manual-${project.id}-${reportYear}-${String(draft.reportMonth).padStart(2, '0')}-${index + 1}`,
                name,
                month: draft.reportMonth,
                status: draft.scheduleStatus,
                observations: '',
                createdAt: existing?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            } as ProjectActivity;
        });
        const nextActivities = [
            ...existingActivities.filter((activity) => getMonthNumber(activity.month) !== draft.reportMonth),
            ...nextMonthActivities,
        ];

        const nextProject: Project = {
            ...editedProject,
            metaFinancial: draft.metaFinancial,
            reports: nextReports,
            activities: nextActivities,
            progress: nextProgress,
            financialProgressPercentage: nextFinancialProgress,
            technicalProgressPercentage: nextTechnicalProgress,
        };

        persistProjectSnapshot(nextProject, false);
        setIsManualTrackingModalOpen(false);
    };

    const getGoalStatusColor = (real: number, expected?: number) => {
        if (expected === undefined || expected === null) return 'bg-slate-100 text-slate-500';
        const diff = real - expected;
        if (diff >= 0) return 'bg-emerald-100 text-emerald-700'; // Green
        if (diff >= -10) return 'bg-yellow-100 text-yellow-700'; // Yellow
        return 'bg-red-100 text-red-700'; // Red
    };

    const getMonthName = (m?: number | null) => {
        if (!m) return '';
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return months[m - 1] || '';
    };

    const getMonthFullName = (m?: number | null) => {
        if (!m) return 'Sin definir';
        const months = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return months[m - 1] || '';
    };

    const getTimelineMonthNumbers = () => {
        const startMonth = activeData.timelineStartMonth || 1;
        const durationMonths = Math.max(1, Math.min(12, activeData.timelineDurationMonths || 12));
        return Array.from({ length: durationMonths }, (_, idx) => ((startMonth - 1 + idx) % 12) + 1);
    };
    const allowedTrackingMonths = getTimelineMonthNumbers();

    const getFileLabel = (url: string) => {
        const fileName = url.split('/').pop() || url;
        try {
            return decodeURIComponent(fileName);
        } catch {
            return fileName;
        }
    };

    // Sort reports for display - Safe check
    const sortedReports = useMemo(() => {
        if (!activeData.reports) return [];
        return [...activeData.reports].sort((a,b) => {
             if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });
    }, [activeData.reports]);

    const selectedMonthActivities = useMemo(() => {
        const month = selectedActivityMonth || activeData.timelineStartMonth || 1;
        const list = Array.isArray(activeData.activities) ? activeData.activities : [];
        return list
            .filter((activity) => {
                const activityMonth = getMonthNumber(activity.month ?? activity.mes ?? activity.monthRaw ?? activity.period);
                return activityMonth === month;
            })
            .slice()
            .sort((a, b) => {
                const aName = (a.name || '').toString();
                const bName = (b.name || '').toString();
                return aName.localeCompare(bName, 'es');
            });
    }, [activeData.activities, activeData.timelineStartMonth, selectedActivityMonth]);

    // NEW: State for dropdown selection
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

    // NEW: Effect to default select the latest report
    useEffect(() => {
        if (sortedReports.length > 0) {
            // Only update if current selection is invalid or null
            if (!selectedReportId || !sortedReports.find(r => r.id === selectedReportId)) {
                setSelectedReportId(sortedReports[0].id);
            }
        } else {
            setSelectedReportId(null);
        }
    }, [sortedReports, selectedReportId]);

    const currentReport = sortedReports.find(r => r.id === selectedReportId);
    const reportForSelectedMonth = useMemo(() => {
        if (!sortedReports.length) return null;
        const exact = sortedReports.find((report) => report.month === selectedActivityMonth && report.year === activeData.year);
        if (exact) return exact;
        return sortedReports.find((report) => report.month === selectedActivityMonth) || null;
    }, [sortedReports, selectedActivityMonth, activeData.year]);

    const selectedMonthObservationText = useMemo(() => {
        const values = [
            reportForSelectedMonth?.observations,
            ...selectedMonthActivities.map((activity) => activity.observations),
        ]
            .filter(Boolean)
            .flatMap((value) => value!.toString().split(/\r?\n/))
            .map((value) => value.trim())
            .filter(Boolean);

        return Array.from(new Set(values)).join('\n');
    }, [reportForSelectedMonth, selectedMonthActivities]);

    const manualTrackingMonthData = useMemo(() => {
        const map: Record<number, {
            metaFinancial?: number;
            status?: string;
            observations?: string;
            activities?: string[];
        }> = {};
        const activityList = Array.isArray(activeData.activities) ? activeData.activities : [];

        allowedTrackingMonths.forEach((month) => {
            const report = sortedReports.find((item) => Number(item.month) === month) || null;
            const monthActivities = activityList
                .filter((activity) => getMonthNumber(activity.month ?? activity.mes ?? activity.monthRaw ?? activity.period) === month)
                .slice()
                .sort((a, b) => (a.name || '').toString().localeCompare((b.name || '').toString(), 'es'));
            const observationValues = [
                report?.observations,
                ...monthActivities.map((activity) => activity.observations),
            ]
                .filter(Boolean)
                .flatMap((value) => value!.toString().split(/\r?\n/))
                .map((value) => value.trim())
                .filter(Boolean);

            map[month] = {
                metaFinancial: Number(report?.metaFinancial || 0),
                status: report?.scheduleStatus || 'pending',
                observations: Array.from(new Set(observationValues)).join('\n'),
                activities: monthActivities.map((activity) => activity.name).filter(Boolean),
            };
        });

        return map;
    }, [activeData.activities, allowedTrackingMonths, sortedReports]);

    const getReportStatusMeta = (status?: any) => {
        const normalized = (status ?? '').toString().trim().toLowerCase();
        if (normalized === 'completed' || normalized.includes('finaliz') || normalized.includes('complet')) {
            return { label: 'Finalizado', className: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500', accent: 'border-l-blue-500' };
        }
        if (normalized === 'active' || normalized.includes('ejec') || normalized.includes('proceso') || normalized.includes('avance') || normalized.includes('tiempo')) {
            return { label: 'En proceso', className: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', accent: 'border-l-emerald-500' };
        }
        return { label: 'Pendiente', className: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400', accent: 'border-l-slate-400' };
    };

    const activityStatusOptions = [
        { value: 'pending' as ProjectActivity['status'], label: 'Pendiente' },
        { value: 'active' as ProjectActivity['status'], label: 'En proceso' },
        { value: 'completed' as ProjectActivity['status'], label: 'Finalizado' },
    ];

    const activityStatusCounts = useMemo(() => {
        const counts: Record<'all' | ProjectActivity['status'], number> = {
            all: selectedMonthActivities.length,
            pending: 0,
            active: 0,
            completed: 0,
        };
        selectedMonthActivities.forEach((activity) => {
            counts[normalizeActivityStatus(activity.status)] += 1;
        });
        return counts;
    }, [selectedMonthActivities]);

    const checklistVisibleActivities = useMemo(() => {
        if (activityChecklistFilter === 'all') {
            return selectedMonthActivities;
        }
        return selectedMonthActivities.filter((activity) => normalizeActivityStatus(activity.status) === activityChecklistFilter);
    }, [activityChecklistFilter, selectedMonthActivities]);

    const allActivitiesByMonth = useMemo(() => {
        const source = Array.isArray(activeData.activities) ? activeData.activities : [];
        const timelineMonths = getTimelineMonthNumbers();
        const knownMonths = new Set(timelineMonths);
        const grouped = timelineMonths.map((month) => ({
            month,
            activities: source
                .filter((activity) => getMonthNumber(activity.month ?? activity.mes ?? activity.monthRaw ?? activity.period) === month)
                .slice()
                .sort((a, b) => (a.name || '').toString().localeCompare((b.name || '').toString(), 'es')),
        }));
        const extraMonths = Array.from(new Set(
            source
                .map((activity) => getMonthNumber(activity.month ?? activity.mes ?? activity.monthRaw ?? activity.period))
                .filter((month) => month && !knownMonths.has(month))
        ));
        extraMonths.forEach((month) => {
            grouped.push({
                month,
                activities: source
                    .filter((activity) => getMonthNumber(activity.month ?? activity.mes ?? activity.monthRaw ?? activity.period) === month)
                    .slice()
                    .sort((a, b) => (a.name || '').toString().localeCompare((b.name || '').toString(), 'es')),
            });
        });
        return grouped;
    }, [activeData.activities, activeData.timelineDurationMonths, activeData.timelineStartMonth]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-4 -mx-4 sm:-mx-6 lg:-mx-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <button onClick={onBack} className={`flex items-center gap-2 text-slate-500 ${theme.hoverText} transition-colors text-sm font-medium mb-1`}>
                        <ArrowLeft className="w-4 h-4" /> Volver
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-900 line-clamp-1">{project.name}</h1>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${
                            project.status === 'En Ejecución' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            project.status === 'Activo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            project.status === 'Finalizado' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                            {project.status}
                        </span>
                    </div>
                     <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                        {project.organizationLogo ? (
                            <img src={project.organizationLogo} alt="Logo" className="w-6 h-6 rounded-full object-cover border border-slate-200" />
                        ) : (
                            <span className={theme.text}><Building2 className="w-4 h-4" /></span>
                        )}
                        <span className="font-semibold">{project.organization}</span>
                        <span className="text-slate-300">|</span>
                        <span className={`font-semibold ${theme.text}`}>Edición {project.year}</span>
                    </div>
                </div>
                <div>
                    {isEditing ? (
                        <div className="flex gap-2">
                            <button onClick={() => { setIsEditing(false); setEditedProject(JSON.parse(JSON.stringify(project))); }} className="px-4 py-2 text-slate-600 font-semibold text-sm hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                            <button onClick={handleSave} className={`flex items-center gap-2 text-white px-6 py-2 rounded-lg shadow-sm transition-all text-sm font-semibold ${theme.buttonPrimary}`}><Save className="w-4 h-4" /> Guardar</button>
                        </div>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg shadow-sm transition-all text-sm font-semibold"><Edit3 className="w-4 h-4" /> Editar Datos</button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* General Info (Read/Edit) */}
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                     <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-6 flex items-center gap-2 border-b border-slate-100 pb-2">
                        <Activity className={`w-4 h-4 ${theme.text}`} /> Información General
                    </h3>
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="shrink-0 flex flex-col items-center space-y-2">
                             <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden relative group">
                                {activeData.organizationLogo ? <img src={activeData.organizationLogo} className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-slate-400" />}
                                {isEditing && <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><label className="cursor-pointer flex flex-col items-center text-white"><Upload className="w-5 h-5 mb-1" /><span className="text-[9px] font-bold">Subir</span><input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} /></label></div>}
                            </div>
                        </div>
                        <div className="flex-grow space-y-4">
                            <div><label className="block text-xs font-semibold text-slate-500 mb-1">Nombre del Proyecto</label>{isEditing ? <input type="text" value={activeData.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm outline-none bg-white text-slate-900" /> : <p className="text-sm font-medium text-slate-900">{project.name}</p>}</div>
                            <div><label className="block text-xs font-semibold text-slate-500 mb-1">Organización</label>{isEditing ? <input type="text" value={activeData.organization} onChange={(e) => handleChange('organization', e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm outline-none bg-white text-slate-900" /> : <p className="text-sm font-medium text-slate-900">{project.organization}</p>}</div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-semibold text-slate-500 mb-1">Departamento</label>{isEditing ? <input type="text" value={activeData.department} onChange={(e) => handleChange('department', e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm outline-none bg-white text-slate-900" /> : <p className="text-sm text-slate-900">{project.department}</p>}</div>
                                <div><label className="block text-xs font-semibold text-slate-500 mb-1">Municipio</label>{isEditing ? <input type="text" value={activeData.municipality || ''} onChange={(e) => handleChange('municipality', e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm outline-none bg-white text-slate-900" /> : <p className="text-sm text-slate-900">{project.municipality || '-'}</p>}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Mes de Inicio</label>
                                    {isEditing ? (
                                        <select
                                            value={activeData.timelineStartMonth ?? ''}
                                            onChange={(e) => updateTimelineMonth('timelineStartMonth', e.target.value ? parseInt(e.target.value, 10) : null)}
                                            className="w-full p-2 border border-slate-300 rounded text-sm outline-none bg-white text-slate-900"
                                        >
                                            <option value="">Sin definir</option>
                                            {monthOptions.map((month) => (
                                                <option key={month.value} value={month.value}>{month.label}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p className="text-sm text-slate-900">{getMonthFullName(activeData.timelineStartMonth ?? null)}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Mes Final</label>
                                    {isEditing ? (
                                        <select
                                            value={activeData.timelineEndMonth ?? ''}
                                            onChange={(e) => updateTimelineMonth('timelineEndMonth', e.target.value ? parseInt(e.target.value, 10) : null)}
                                            className="w-full p-2 border border-slate-300 rounded text-sm outline-none bg-white text-slate-900"
                                        >
                                            <option value="">Sin definir</option>
                                            {monthOptions.map((month) => (
                                                <option key={month.value} value={month.value}>{month.label}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p className="text-sm text-slate-900">{getMonthFullName(activeData.timelineEndMonth ?? null)}</p>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Beneficiarios Directos</label>
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            value={activeData.beneficiaries}
                                            onChange={(e) => handleChange('beneficiaries', parseInt(e.target.value) || 0)}
                                            className="w-full p-2 border border-slate-300 rounded text-sm outline-none bg-white text-slate-900"
                                        />
                                    ) : (
                                        <p className="text-sm font-medium text-slate-900">{formatInt(project.beneficiaries)}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Beneficiarios Indirectos</label>
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            value={activeData.indirectBeneficiaries}
                                            onChange={(e) => handleChange('indirectBeneficiaries', parseInt(e.target.value) || 0)}
                                            className="w-full p-2 border border-slate-300 rounded text-sm outline-none bg-white text-slate-900"
                                        />
                                    ) : (
                                        <p className="text-sm font-medium text-slate-900">{formatInt(project.indirectBeneficiaries || 0)}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Investment Info (Read/Edit) */}
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-6 flex items-center gap-2 border-b border-slate-100 pb-2">
                        <DollarSign className={`w-4 h-4 ${theme.text}`} /> Inversión
                    </h3>
                    <div className="space-y-4">
                        <div><label className="block text-xs font-semibold text-slate-500 mb-1">Inversión FGK</label>{isEditing ? <input type="number" value={activeData.amountFGK} onChange={(e) => handleChange('amountFGK', parseFloat(e.target.value) || 0)} className="w-full p-2 border border-slate-300 rounded text-sm text-right font-mono bg-white text-slate-900" /> : <p className="text-xl font-mono font-medium text-slate-900 text-right">{formatCurrency(project.amountFGK)}</p>}</div>
                        <div><label className="block text-xs font-semibold text-slate-500 mb-1">Contrapartida</label>{isEditing ? <input type="number" value={activeData.counterpart} onChange={(e) => handleChange('counterpart', parseFloat(e.target.value) || 0)} className="w-full p-2 border border-slate-300 rounded text-sm text-right font-mono bg-white text-slate-900" /> : <p className="text-xl font-mono font-medium text-slate-700 text-right">{formatCurrency(project.counterpart)}</p>}</div>
                        <div><label className="block text-xs font-semibold text-slate-500 mb-1">Fondo Aliados</label>{isEditing ? <input type="number" value={activeData.amountAllies} onChange={(e) => handleChange('amountAllies', parseFloat(e.target.value) || 0)} className="w-full p-2 border border-slate-300 rounded text-sm text-right font-mono bg-white text-slate-900" /> : <p className="text-xl font-mono font-medium text-slate-700 text-right">{formatCurrency(project.amountAllies)}</p>}</div>
                        <div className="border-t pt-4 flex justify-between items-end"><p className="text-sm font-bold text-slate-900 uppercase">Total</p><p className="text-2xl font-mono font-bold text-slate-900">{formatCurrency(currentTotalInvestment)}</p></div>
                    </div>
                </section>

                <section className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-6 flex items-center gap-2 border-b border-slate-100 pb-2">
                        <Users className={`w-4 h-4 ${theme.text}`} /> Representantes / Contactos
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/60">
                            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-4">Contacto 1</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="block text-[11px] font-semibold text-slate-500">Nombre</span>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={activeData.contact1Name || ''}
                                            onChange={(e) => handleChange('contact1Name', e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded text-sm outline-none bg-white text-slate-900"
                                        />
                                    ) : (
                                        <p className="text-slate-900">{activeData.contact1Name || '-'}</p>
                                    )}
                                </div>
                                <div>
                                    <span className="block text-[11px] font-semibold text-slate-500">Cargo</span>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={activeData.contact1Role || ''}
                                            onChange={(e) => handleChange('contact1Role', e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded text-sm outline-none bg-white text-slate-900"
                                        />
                                    ) : (
                                        <p className="text-slate-900">{activeData.contact1Role || '-'}</p>
                                    )}
                                </div>
                                <div>
                                    <span className="block text-[11px] font-semibold text-slate-500">Teléfono directo</span>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={activeData.contact1DirectPhone || ''}
                                            onChange={(e) => handleChange('contact1DirectPhone', e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded text-sm outline-none bg-white text-slate-900"
                                        />
                                    ) : (
                                        <p className="text-slate-900">{activeData.contact1DirectPhone || '-'}</p>
                                    )}
                                </div>
                                <div>
                                    <span className="block text-[11px] font-semibold text-slate-500">Teléfono de la organización</span>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={activeData.contact1OrganizationPhone || ''}
                                            onChange={(e) => handleChange('contact1OrganizationPhone', e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded text-sm outline-none bg-white text-slate-900"
                                        />
                                    ) : (
                                        <p className="text-slate-900">{activeData.contact1OrganizationPhone || '-'}</p>
                                    )}
                                </div>
                                <div className="md:col-span-2">
                                    <span className="block text-[11px] font-semibold text-slate-500">Correo electrónico</span>
                                    {isEditing ? (
                                        <input
                                            type="email"
                                            value={activeData.contact1Email || ''}
                                            onChange={(e) => handleChange('contact1Email', e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded text-sm outline-none bg-white text-slate-900"
                                        />
                                    ) : (
                                        <p className="text-slate-900 break-all">{activeData.contact1Email || '-'}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/60">
                            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-4">Contacto 2</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="block text-[11px] font-semibold text-slate-500">Nombre</span>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={activeData.contact2Name || ''}
                                            onChange={(e) => handleChange('contact2Name', e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded text-sm outline-none bg-white text-slate-900"
                                        />
                                    ) : (
                                        <p className="text-slate-900">{activeData.contact2Name || '-'}</p>
                                    )}
                                </div>
                                <div>
                                    <span className="block text-[11px] font-semibold text-slate-500">Cargo</span>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={activeData.contact2Role || ''}
                                            onChange={(e) => handleChange('contact2Role', e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded text-sm outline-none bg-white text-slate-900"
                                        />
                                    ) : (
                                        <p className="text-slate-900">{activeData.contact2Role || '-'}</p>
                                    )}
                                </div>
                                <div>
                                    <span className="block text-[11px] font-semibold text-slate-500">Teléfono directo</span>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={activeData.contact2DirectPhone || ''}
                                            onChange={(e) => handleChange('contact2DirectPhone', e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded text-sm outline-none bg-white text-slate-900"
                                        />
                                    ) : (
                                        <p className="text-slate-900">{activeData.contact2DirectPhone || '-'}</p>
                                    )}
                                </div>
                                <div>
                                    <span className="block text-[11px] font-semibold text-slate-500">Teléfono de la organización</span>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={activeData.contact2OrganizationPhone || ''}
                                            onChange={(e) => handleChange('contact2OrganizationPhone', e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded text-sm outline-none bg-white text-slate-900"
                                        />
                                    ) : (
                                        <p className="text-slate-900">{activeData.contact2OrganizationPhone || '-'}</p>
                                    )}
                                </div>
                                <div className="md:col-span-2">
                                    <span className="block text-[11px] font-semibold text-slate-500">Correo electrónico</span>
                                    {isEditing ? (
                                        <input
                                            type="email"
                                            value={activeData.contact2Email || ''}
                                            onChange={(e) => handleChange('contact2Email', e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded text-sm outline-none bg-white text-slate-900"
                                        />
                                    ) : (
                                        <p className="text-slate-900 break-all">{activeData.contact2Email || '-'}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

                {/* Matrix and Photos Container */}
                <section className="md:col-span-2 grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* LEFT COLUMN: MATRIX AND IMPACT */}
                        <div className="lg:col-span-2 space-y-6">
                            <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 border-b border-slate-100 pb-4">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                                            <History className={`w-4 h-4 ${theme.text}`} />
                                            Seguimiento mensual
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Cada mes se registra una sola vez con su estado general, avance y una observación breve. Ese registro alimenta el avance global.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={selectedActivityMonth}
                                            onChange={(e) => setSelectedActivityMonth(parseInt(e.target.value, 10) || 1)}
                                            className="min-w-[180px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
                                        >
                                            {getTimelineMonthNumbers().map((month) => (
                                                <option key={month} value={month}>
                                                    Mes {month} - {getMonthFullName(month)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Avance técnico acumulado</p>
                                        <p className="text-3xl font-bold text-blue-600">{formatPercent(technicalProgress)}</p>
                                        <p className="mt-2 text-[11px] text-slate-400">Basado en el seguimiento mensual.</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Ejecución financiera acumulada</p>
                                        <p className="text-3xl font-bold text-emerald-600">{formatPercent(financialProgress)}</p>
                                        <p className="mt-2 text-[11px] text-slate-400">Calculado contra la Inversión FGK.</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Estado del mes</p>
                                        {reportForSelectedMonth ? (
                                            (() => {
                                                const meta = getReportStatusMeta(reportForSelectedMonth.scheduleStatus);
                                                return (
                                                    <>
                                                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold ${meta.className}`}>
                                                            <span className={`w-2 h-2 rounded-full ${meta.dot}`}></span>
                                                            {meta.label}
                                                        </div>
                                                        <p className="mt-2 text-sm text-slate-700 font-medium">
                                                            {getMonthFullName(reportForSelectedMonth.month)} {reportForSelectedMonth.year}
                                                        </p>
                                                    </>
                                                );
                                            })()
                                        ) : (
                                            <p className="text-sm text-slate-400">Sin seguimiento registrado.</p>
                                        )}
                                    </div>
                                </div>

                            </section>

                            <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 border-b border-slate-100 pb-4">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                                                <Calendar className={`w-4 h-4 ${theme.text}`} />
                                                Actividades por período
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsAllActivitiesModalOpen(true);
                                                    setOpenActivityStatusMenuId(null);
                                                }}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                            >
                                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                                Ver todas las actividades
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Aquí se agrupan las actividades cargadas para el mes que estás viendo.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <select
                                            value={selectedActivityMonth}
                                            onChange={(e) => setSelectedActivityMonth(parseInt(e.target.value, 10) || 1)}
                                            className="min-w-[180px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
                                        >
                                            {getTimelineMonthNumbers().map((month) => (
                                                <option key={month} value={month}>
                                                    Mes {month} - {getMonthFullName(month)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                                            <div>
                                                <p className="text-xs font-semibold uppercase text-slate-500">
                                                    Mes {selectedActivityMonth} - {getMonthFullName(selectedActivityMonth)}
                                                </p>
                                                <p className="text-[11px] text-slate-400">
                                                    Haz clic en el estado de la actividad para cambiarlo.
                                                </p>
                                            </div>
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsActivityFilterMenuOpen(prev => !prev)}
                                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors ${
                                                        activityChecklistFilter === 'all'
                                                            ? 'border-slate-300 bg-slate-100 text-slate-700'
                                                            : `${getReportStatusMeta(activityChecklistFilter).className} border-l-4 ${getReportStatusMeta(activityChecklistFilter).accent}`
                                                    }`}
                                                >
                                                    {activityChecklistFilter === 'all'
                                                        ? 'Mostrar todo'
                                                        : getReportStatusMeta(activityChecklistFilter).label}
                                                    <ChevronDown className="w-3 h-3" />
                                                </button>
                                                {isActivityFilterMenuOpen && (
                                                    <div className="absolute right-0 top-full z-30 mt-1 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                                                        {([
                                                            { value: 'all' as const, label: 'Mostrar todo' },
                                                            ...activityStatusOptions,
                                                        ]).map((option) => {
                                                            const isAll = option.value === 'all';
                                                            const optionMeta = isAll ? null : getReportStatusMeta(option.value);
                                                            const selected = activityChecklistFilter === option.value;
                                                            return (
                                                                <button
                                                                    key={option.value}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setActivityChecklistFilter(option.value);
                                                                        setIsActivityFilterMenuOpen(false);
                                                                        setOpenActivityStatusMenuId(null);
                                                                    }}
                                                                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold transition-colors ${
                                                                        selected
                                                                            ? isAll
                                                                                ? 'bg-slate-100 text-slate-700'
                                                                                : optionMeta!.className
                                                                            : 'text-slate-600 hover:bg-slate-50'
                                                                    }`}
                                                                >
                                                                    <span className={`h-2 w-2 rounded-full ${isAll ? 'bg-slate-400' : optionMeta!.dot}`}></span>
                                                                    {option.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {checklistVisibleActivities.length > 0 ? (
                                                checklistVisibleActivities.map((activity) => {
                                                    const activityStatus = normalizeActivityStatus(activity.status || reportForSelectedMonth?.scheduleStatus);
                                                    const meta = getReportStatusMeta(activityStatus);
                                                    return (
                                                        <div key={activity.id} className="rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-semibold text-slate-800">{activity.name}</p>
                                                                </div>
                                                                <div className="relative shrink-0">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setOpenActivityStatusMenuId(prev => prev === activity.id ? null : activity.id)}
                                                                        className={`inline-flex items-center gap-1 rounded-md border border-l-4 px-2 py-1 text-[10px] font-bold transition-colors ${meta.className} ${meta.accent} ${
                                                                            'hover:brightness-95 cursor-pointer'
                                                                        }`}
                                                                        title="Cambiar estado"
                                                                    >
                                                                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`}></span>
                                                                        {meta.label}
                                                                        <ChevronDown className="w-3 h-3" />
                                                                    </button>
                                                                    {openActivityStatusMenuId === activity.id && (
                                                                        <div className="absolute right-0 top-full z-30 mt-1 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                                                                            {activityStatusOptions.map((option) => {
                                                                                const optionMeta = getReportStatusMeta(option.value);
                                                                                const isCurrent = activityStatus === option.value;
                                                                                return (
                                                                                    <button
                                                                                        key={option.value}
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            handleActivityFieldChange(activity.id, 'status', option.value);
                                                                                            setOpenActivityStatusMenuId(null);
                                                                                        }}
                                                                                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold transition-colors ${
                                                                                            isCurrent
                                                                                                ? `${optionMeta.className}`
                                                                                                : 'text-slate-600 hover:bg-slate-50'
                                                                                        }`}
                                                                                    >
                                                                                        <span className={`h-2 w-2 rounded-full ${optionMeta.dot}`}></span>
                                                                                        {option.label}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="mt-2">
                                                                {isEditing && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveActivity(activity.id)}
                                                                        className="self-start inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-100"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                        Eliminar actividad
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-400">
                                                    No hay actividades registradas con esta vista o filtro.
                                                </div>
                                            )}
                                        </div>
                                        {isEditing && (
                                            <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white p-3">
                                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">Agregar actividad al mes</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-2">
                                                    <input
                                                        type="text"
                                                        value={newActivityDraft.name}
                                                        onChange={(e) => setNewActivityDraft(prev => ({ ...prev, name: e.target.value }))}
                                                        placeholder="Nombre de la actividad"
                                                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-orange-500"
                                                    />
                                                    <select
                                                        value={newActivityDraft.status}
                                                        onChange={(e) => setNewActivityDraft(prev => ({ ...prev, status: e.target.value as ProjectActivity['status'] }))}
                                                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
                                                    >
                                                        {activityStatusOptions.map((option) => (
                                                            <option key={option.value} value={option.value}>{option.label}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={handleAddActivity}
                                                        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white ${theme.buttonPrimary}`}
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        Agregar
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                                        <p className="text-xs font-semibold uppercase text-slate-500 mb-3">Resumen del período</p>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                                                <span className="text-slate-600">Total de actividades</span>
                                                <span className="font-bold text-slate-900">{selectedMonthActivities.length}</span>
                                            </div>
                                            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                                                <span className="text-slate-600">Mes visible</span>
                                                <span className="font-bold text-slate-900">{getMonthFullName(selectedActivityMonth)}</span>
                                            </div>
                                            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                                                <span className="text-slate-600">Filtro</span>
                                                <span className="font-bold text-slate-900">
                                                    {activityChecklistFilter === 'all'
                                                        ? 'Mostrar todo'
                                                        : getReportStatusMeta(activityChecklistFilter).label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                                    <div className="flex items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-4">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Observación breve</p>
                                            <p className="text-[11px] text-slate-400">
                                                Mes {selectedActivityMonth} - {getMonthFullName(selectedActivityMonth)}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsManualTrackingModalOpen(true)}
                                            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white hover:bg-orange-700 transition-colors"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            Edición manual
                                        </button>
                                    </div>
                                    <div className="min-h-[96px] rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 whitespace-pre-wrap">
                                        {selectedMonthObservationText || 'Sin observaciones registradas.'}
                                    </div>
                                </div>
                            </section>

                            {/* NEW SECTION: FORMACIÓN */}
                            <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-6 flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <GraduationCap className={`w-4 h-4 ${theme.text}`} /> 
                                    Formación y Desarrollo
                                </h3>
                                
                                {/* Toggle / Status */}
                                <div className="mb-4">
                                     {isEditing ? (
                                         <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 rounded-lg border border-slate-200">
                                             <input 
                                                type="checkbox"
                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                checked={activeData.trainingDetails?.hasTraining}
                                                onChange={(e) => handleTrainingDetailsChange('hasTraining', e.target.checked)}
                                             />
                                             <span className="text-sm font-bold text-slate-700">Este proyecto participa en procesos formativos</span>
                                         </label>
                                     ) : (
                                         <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${
                                             project.trainingDetails?.hasTraining 
                                             ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                             : 'bg-slate-50 text-slate-500 border-slate-200'
                                         }`}>
                                             <span className={`w-2 h-2 rounded-full ${project.trainingDetails?.hasTraining ? 'bg-blue-500' : 'bg-slate-400'}`}></span>
                                             {project.trainingDetails?.hasTraining ? 'Participa en Formación' : 'No Registra Formación'}
                                         </div>
                                     )}
                                </div>

                                {/* Participants Table (Only if hasTraining) */}
                                {activeData.trainingDetails?.hasTraining && (
                                    <div className="space-y-4">
                                         <div className="flex justify-between items-center">
                                            <p className="text-xs font-semibold text-slate-500 uppercase">Listado de Participantes</p>
                                            {isEditing && (
                                                <button 
                                                    onClick={handleAddParticipant}
                                                    className={`text-xs flex items-center gap-1 font-bold ${theme.text} hover:underline`}
                                                >
                                                    <Plus className="w-3 h-3" /> Agregar
                                                </button>
                                            )}
                                         </div>

                                         {/* Table */}
                                         <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                                    <tr>
                                                        <th className="p-2">Nombre Completo</th>
                                                        <th className="p-2">Rol / Cargo</th>
                                                        {isEditing && <th className="p-2 text-center w-10"><Trash2 className="w-3 h-3" /></th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                     {activeData.trainingDetails.participants.map((p, idx) => (
                                                         <tr key={idx} className="group hover:bg-slate-50">
                                                             <td className="p-2">
                                                                 {isEditing ? (
                                                                     <input 
                                                                        type="text" 
                                                                        value={p.name} 
                                                                        onChange={(e) => handleUpdateParticipant(p.id, 'name', e.target.value)}
                                                                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-200 outline-none text-slate-900"
                                                                        placeholder="Nombre..."
                                                                     />
                                                                 ) : (
                                                                     <span className="font-medium text-slate-700">{p.name || '-'}</span>
                                                                 )}
                                                             </td>
                                                             <td className="p-2">
                                                                  {isEditing ? (
                                                                     <input 
                                                                        type="text" 
                                                                        value={p.role || ''} 
                                                                        onChange={(e) => handleUpdateParticipant(p.id, 'role', e.target.value)}
                                                                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-200 outline-none text-slate-900"
                                                                        placeholder="Cargo..."
                                                                     />
                                                                 ) : (
                                                                     <span className="text-slate-500">{p.role || '-'}</span>
                                                                 )}
                                                             </td>
                                                             {isEditing && (
                                                                 <td className="p-2 text-center">
                                                                     <button 
                                                                        onClick={() => handleRemoveParticipant(p.id)}
                                                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                                                     >
                                                                         <X className="w-3 h-3" />
                                                                     </button>
                                                                 </td>
                                                             )}
                                                         </tr>
                                                     ))}
                                                     {activeData.trainingDetails.participants.length === 0 && (
                                                         <tr>
                                                             <td colSpan={3} className="p-4 text-center text-slate-400 italic">
                                                                 No hay participantes registrados.
                                                             </td>
                                                         </tr>
                                                     )}
                                                </tbody>
                                            </table>
                                         </div>
                                         
                                         <div className="text-right">
                                             <p className="text-xs text-slate-400">Total: <span className="font-bold text-slate-700">{activeData.trainingDetails.participants.length}</span> personas</p>
                                         </div>
                                    </div>
                                )}
                            </section>

                        </div>

                        {/* RIGHT COLUMN: UPLOADS */}
                        <div className="space-y-6">
                            <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                                <div className="flex flex-col gap-2 mb-4 border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-2">
                                        <History className={`w-4 h-4 ${theme.text}`} />
                                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                                            Cronograma del proyecto (estado por mes)
                                        </h3>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Vista visual del estado de cada mes. Este bloque resume el cronograma y pinta el mes según el avance del seguimiento.
                                    </p>
                                </div>
                                <ProjectProgressMatrix 
                                    projects={[activeData]} 
                                    isEditable={isEditing} 
                                    onUpdateProjects={handleProgressMatrixUpdate}
                                    title="Cronograma del proyecto (estado por mes)"
                                    compactMonthsOnly
                                />
                            </section>

                            <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <History className={`w-4 h-4 ${theme.text}`} />
                                    Historial mensual
                                </h3>
                                <div className="overflow-x-auto rounded-lg border border-slate-200">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 text-slate-500 uppercase">
                                            <tr>
                                                <th className="p-2">Mes</th>
                                                <th className="p-2">Estado</th>
                                                <th className="p-2 text-right">Técnico</th>
                                                <th className="p-2 text-right">Financiero</th>
                                                <th className="p-2 text-center">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {sortedReports.length > 0 ? (
                                                sortedReports.slice(0, 6).map((report) => {
                                                    const meta = getReportStatusMeta(report.scheduleStatus);
                                                    return (
                                                        <tr key={report.id}>
                                                            <td className="p-2 text-slate-700">
                                                                {getMonthFullName(report.month)} {report.year}
                                                            </td>
                                                            <td className="p-2">
                                                                <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-full border text-[11px] font-bold ${meta.className}`}>
                                                                    <span className={`w-2 h-2 rounded-full ${meta.dot}`}></span>
                                                                    {meta.label}
                                                                </span>
                                                            </td>
                                                            <td className="p-2 text-right font-semibold text-slate-700 tabular-nums">{formatPercent(getMonthlyTechnicalPercent(report))}</td>
                                                            <td className="p-2 text-right font-semibold text-slate-700 tabular-nums">{formatPercent(getMonthlyFinancialPercent(report))}</td>
                                                            <td className="p-2 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteMonthlyProgress(report)}
                                                                    className="inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 p-1.5 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700"
                                                                    title={`Eliminar seguimiento de ${getMonthFullName(report.month)} ${report.year}`}
                                                                    aria-label={`Eliminar seguimiento de ${getMonthFullName(report.month)} ${report.year}`}
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="p-4 text-center text-slate-400">No hay reportes mensuales registrados.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <FileSpreadsheet className={`w-4 h-4 ${theme.text}`} />
                                    Archivos y documentos
                                </h3>

                                <div className="space-y-4">
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                        <p className="text-xs font-semibold text-slate-600 mb-1">Carta de finalización</p>
                                        <p className="text-[11px] text-slate-500 mb-2">Solo se admite PDF.</p>
                                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-slate-700 hover:bg-slate-100 transition-colors">
                                            <Upload className="w-4 h-4" />
                                            <span className="text-xs font-bold">Subir carta</span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept=".pdf"
                                                onChange={(e) => {
                                                    if (e.target.files?.length) {
                                                        addDocumentUrl('completionLetter', e.target.files);
                                                        e.target.value = '';
                                                    }
                                                }}
                                            />
                                        </label>
                                        <p className="text-[10px] text-slate-400 mt-1">Activa edición para cargar o quitar archivos.</p>
                                        {activeData.completionLetter ? (
                                            <div className="mt-3 flex items-center justify-between gap-2 rounded-md bg-white border border-slate-200 px-3 py-2">
                                                <a href={activeData.completionLetter.split(',')[0]} target="_blank" rel="noreferrer" className="text-xs text-slate-700 truncate hover:text-blue-600">
                                                    {getFileLabel(activeData.completionLetter.split(',')[0])}
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => removeDocumentUrl('completionLetter')}
                                                    className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200"
                                                    aria-label="Eliminar carta de finalización"
                                                    title="Eliminar carta de finalización"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    <span>Eliminar</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="mt-2 text-xs text-slate-400">No adjunta.</p>
                                        )}
                                    </div>

                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                        <p className="text-xs font-semibold text-slate-600 mb-1">Control de cambios</p>
                                        <p className="text-[11px] text-slate-500 mb-2">PDF, Excel o ambos. Puede subir varios archivos.</p>
                                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-3 text-amber-700 hover:bg-amber-100 transition-colors">
                                            <Upload className="w-4 h-4" />
                                            <span className="text-xs font-bold">Subir documentos</span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept=".pdf,.xlsx,.xls"
                                                multiple
                                                onChange={(e) => {
                                                    if (e.target.files?.length) {
                                                        addDocumentUrl('changeControlDocuments', e.target.files);
                                                        e.target.value = '';
                                                    }
                                                }}
                                            />
                                        </label>
                                        <p className="text-[10px] text-slate-400 mt-1">Activa edición para cargar o quitar archivos.</p>
                                        {(activeData.changeControlDocuments || []).length > 0 ? (
                                            <div className="mt-3 space-y-2">
                                                {(activeData.changeControlDocuments || []).map((url, index) => (
                                                    <div key={index} className="flex items-center justify-between gap-2 rounded-md bg-white border border-slate-200 px-3 py-2">
                                                        <a href={url} target="_blank" rel="noreferrer" className="text-xs text-slate-700 truncate hover:text-blue-600">
                                                            {getFileLabel(url)}
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeDocumentUrl('changeControlDocuments', index)}
                                                            className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200"
                                                            aria-label="Eliminar documento"
                                                            title="Eliminar documento"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            <span>Eliminar</span>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="mt-2 text-xs text-slate-400">Sin documentos.</p>
                                        )}
                                    </div>
                                </div>
                            </section>

                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <Camera className={`w-4 h-4 ${theme.text}`} />
                                    Evidencia Fotográfica
                                </h3>

                                <div className="space-y-4 overflow-y-auto max-h-[420px] pr-1 custom-scrollbar">
                                    {activeData.photos && activeData.photos.length > 0 ? (
                                        activeData.photos.map((photo, index) => (
                                            <div key={index} className="relative rounded-lg overflow-hidden shadow-sm border border-slate-100">
                                                <img
                                                    src={photo}
                                                    alt={`Evidencia ${index + 1}`}
                                                    className="w-full h-40 object-cover hover:scale-105 transition-transform duration-500"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemovePhoto(index)}
                                                    className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-red-600/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md transition-colors hover:bg-red-700 border border-white/70"
                                                    aria-label="Eliminar imagen"
                                                    title="Eliminar imagen"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    <span>Eliminar</span>
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="h-40 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200 p-4 text-center">
                                            <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                                            <p className="text-xs">No hay fotos registradas.</p>
                                        </div>
                                    )}

                                    <label className={`
                                       flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                                       ${theme.bg} ${theme.border} hover:bg-opacity-70
                                    `}>
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Plus className={`w-6 h-6 mb-1 ${theme.text}`} />
                                            <p className={`text-xs font-semibold ${theme.textDark}`}>Subir imágenes</p>
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" multiple onChange={handlePhotoUpload} />
                                    </label>
                                    <p className="text-[10px] text-slate-400 mt-1">Activa edición para cargar o quitar archivos.</p>
                                </div>
                            </div>
                        </div>

                </section>
                
            {isEditing && (
                <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 shadow-lg z-50 flex justify-end gap-4 animate-in slide-in-from-bottom-2">
                    <button onClick={() => { setIsEditing(false); setEditedProject(JSON.parse(JSON.stringify(project))); }} className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Cancelar Edición</button>
                    <button onClick={handleSave} className={`px-8 py-2 text-white font-bold rounded-lg shadow-md flex items-center gap-2 ${theme.buttonPrimary}`}><Save className="w-5 h-5" /> Guardar Todos los Cambios</button>
                </div>
            )}

            {isAllActivitiesModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[86vh] overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                                    Todas las actividades del proyecto
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Actividades agrupadas por mes. Haz clic en el estado para cambiarlo.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (editedProject) {
                                            persistProjectSnapshot(editedProject, false);
                                        }
                                        setIsAllActivitiesModalOpen(false);
                                        setOpenActivityStatusMenuId(null);
                                    }}
                                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white shadow-sm ${theme.buttonPrimary}`}
                                >
                                    <Save className="w-4 h-4" />
                                    Guardar cambios
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAllActivitiesModalOpen(false);
                                        setOpenActivityStatusMenuId(null);
                                    }}
                                    className="p-2 rounded-full hover:bg-slate-200 transition-colors"
                                    aria-label="Cerrar"
                                >
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[calc(86vh-78px)] space-y-4">
                            {allActivitiesByMonth.map(({ month, activities }) => (
                                <div key={month} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between gap-3 mb-3">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                                Mes {month} - {getMonthFullName(month)}
                                            </p>
                                            <p className="text-[11px] text-slate-400">
                                                {activities.length} actividad(es)
                                            </p>
                                        </div>
                                    </div>
                                    {activities.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {activities.map((activity) => {
                                                const activityStatus = normalizeActivityStatus(activity.status);
                                                const meta = getReportStatusMeta(activityStatus);
                                                return (
                                                    <div key={activity.id} className="rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <p className="text-sm font-semibold text-slate-800">{activity.name}</p>
                                                            <div className="relative shrink-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setOpenActivityStatusMenuId(prev => prev === `all-${activity.id}` ? null : `all-${activity.id}`)}
                                                                    className={`inline-flex items-center gap-1 rounded-md border border-l-4 px-2 py-1 text-[10px] font-bold transition-colors hover:brightness-95 cursor-pointer ${meta.className} ${meta.accent}`}
                                                                    title="Cambiar estado"
                                                                >
                                                                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`}></span>
                                                                    {meta.label}
                                                                    <ChevronDown className="w-3 h-3" />
                                                                </button>
                                                                {openActivityStatusMenuId === `all-${activity.id}` && (
                                                                    <div className="absolute right-0 top-full z-[90] mt-1 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                                                                        {activityStatusOptions.map((option) => {
                                                                            const optionMeta = getReportStatusMeta(option.value);
                                                                            const isCurrent = activityStatus === option.value;
                                                                            return (
                                                                                <button
                                                                                    key={option.value}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        handleActivityFieldChange(activity.id, 'status', option.value);
                                                                                        setOpenActivityStatusMenuId(null);
                                                                                    }}
                                                                                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold transition-colors ${
                                                                                        isCurrent
                                                                                            ? `${optionMeta.className}`
                                                                                            : 'text-slate-600 hover:bg-slate-50'
                                                                                    }`}
                                                                                >
                                                                                    <span className={`h-2 w-2 rounded-full ${optionMeta.dot}`}></span>
                                                                                    {option.label}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-5 text-center text-sm text-slate-400">
                                            No hay actividades registradas en este mes.
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* --- REPORT MODAL --- */}
            {isReportModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Nuevo Reporte Mensual</h3>
                            <button onClick={() => setIsReportModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Mes</label>
                                    <select 
                                        className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900"
                                        value={newReport.month}
                                        onChange={e => setNewReport({...newReport, month: parseInt(e.target.value)})}
                                    >
                                        {Array.from({length: 12}, (_, i) => (
                                            <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('es-ES', {month: 'long'})}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Año</label>
                                    <input 
                                        type="number" 
                                        className="w-full p-2 border border-slate-300 rounded text-sm bg-slate-100 text-slate-600 font-bold"
                                        value={newReport.year}
                                        readOnly
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                                <div>
                                    <label className="text-xs font-bold text-slate-800 mb-1 block">Avance Técnico Real (%)</label>
                                    <input 
                                        type="number" min="0" 
                                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                        value={newReport.realTechnical}
                                        onChange={e => setNewReport({...newReport, realTechnical: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-800 mb-1 block">Meta Técnica (%)</label>
                                    <input 
                                        type="number" min="0" 
                                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                        value={newReport.expectedTechnical || 0}
                                        onChange={e => setNewReport({...newReport, expectedTechnical: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-800 mb-1 block">Avance Financiero Real (%)</label>
                                    <input 
                                        type="number" min="0" 
                                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                        value={newReport.realFinancial}
                                        onChange={e => setNewReport({...newReport, realFinancial: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-800 mb-1 block">Meta Financiera (%)</label>
                                    <input 
                                        type="number" min="0" 
                                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                        value={newReport.expectedFinancial || 0}
                                        onChange={e => setNewReport({...newReport, expectedFinancial: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Estado del Cronograma</label>
                                <select 
                                    className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900"
                                    value={newReport.scheduleStatus}
                                    onChange={e => setNewReport({...newReport, scheduleStatus: e.target.value as any})}
                                >
                                    <option value="En Tiempo">En Tiempo</option>
                                    <option value="Retrasado">Retrasado</option>
                                    <option value="Adelantado">Adelantado</option>
                                    <option value="Finalizado">Finalizado</option>
                                </select>
                            </div>

                            <div>
                                <textarea 
                                    className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none bg-white text-slate-900"
                                    value={newReport.observations}
                                    onChange={e => setNewReport({...newReport, observations: e.target.value})}
                                    placeholder="Detalles relevantes del mes..."
                                />
                            </div>

                            {/* Photos Section in Modal */}
                            <div className="col-span-2 border-t border-slate-100 pt-3">
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Evidencia Fotográfica del Mes</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {newReport.photos?.map((photo, idx) => (
                                        <div key={idx} className="relative w-16 h-16 rounded overflow-hidden border border-slate-200 group">
                                            <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                                            <button onClick={() => removeReportPhoto(idx)} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white transition-opacity">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <label className="w-16 h-16 rounded border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors">
                                        <Plus className="w-5 h-5" />
                                        <input type="file" className="hidden" accept="image/*" onChange={handleReportPhotoUpload} />
                                    </label>
                                </div>
                                <p className="text-[10px] text-slate-400 italic">Puede subir múltiples imágenes.</p>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                             <button onClick={() => setIsReportModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">Cancelar</button>
                             <button onClick={handleSaveReport} className="px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 shadow-sm">Guardar Reporte</button>
                        </div>
                    </div>
                </div>
            )}

            {isManualTrackingModalOpen && (
                <MonthlyReportModal
                    isOpen={isManualTrackingModalOpen}
                    onClose={() => setIsManualTrackingModalOpen(false)}
                    onSave={handleSaveManualTracking}
                    projectYear={activeData.year}
                    investmentFgk={activeData.amountFGK || 0}
                    defaultMonth={selectedActivityMonth || activeData.timelineStartMonth || 1}
                    allowedMonths={allowedTrackingMonths}
                    initialMetaFinancial={Number(reportForSelectedMonth?.metaFinancial || 0)}
                    initialStatus={reportForSelectedMonth?.scheduleStatus || 'pending'}
                    initialObservations={selectedMonthObservationText}
                    initialActivities={selectedMonthActivities.map((activity) => activity.name).filter(Boolean)}
                    monthData={manualTrackingMonthData}
                />
            )}
        </div>
    );
};

export default ProjectProfile;




