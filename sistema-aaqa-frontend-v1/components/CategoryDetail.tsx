// src/components/CategoryDetail.tsx

import React, { useState, useMemo } from 'react';
import { useCountUp } from '../hooks/useCountUp';
import { ChevronRight, Building2, Wallet, Users, GraduationCap, TrendingUp, Activity, Filter, Search, Calendar, Layers, UploadCloud, BarChart3, Heart, AlertTriangle, CheckCircle, Clock, FileWarning, FileSpreadsheet, Download, RefreshCw, X, Edit2, Save, Trash2 } from 'lucide-react';
import { useData } from '../contexts/useData';
import { CategoryType, MonthlyReport, ProjectActivity, ProjectMonthComment } from '../types';
import CategoryEditModal from './CategoryEditModal';
import { CommunityCortesModule } from './CommunityCortesModule';
import { FisIncubadoraModule } from './FisIncubadoraModule';
import { usePermissions } from '../hooks/usePermissions';
import EditableText from './EditableText';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { exportService } from '../services/exportService';

const EL_SALVADOR_DEPTS = [
    'Ahuachapán',
    'Cabañas',
    'Chalatenango',
    'Cuscatlán',
    'La Libertad',
    'La Paz',
    'La Unión',
    'Morazán',
    'San Miguel',
    'San Salvador',
    'San Vicente',
    'Santa Ana',
    'Sonsonate',
    'Usulután'
];

interface CategoryDetailProps {
    category: CategoryType;
    onBack: () => void;
    onSelectProject: (projectSlug: string) => void;
    onViewAllies: () => void;
    userData?: any;
}

const slugifyProjectName = (value: string) =>
    (value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const CategoryDetail: React.FC<CategoryDetailProps> = ({ category, onBack, onSelectProject, onViewAllies, userData }) => {
    const { data, updateProjectList, updateCategories, deleteProject, uploadExcel } = useData();

    // ==============================================
    // PERMISOS CENTRALIZADOS
    // ==============================================
    const { canEditCategory: checkCanEditCategory, canEditReports, canEditText } = usePermissions();
    const canEditCategory = checkCanEditCategory(category);
    const canEditReportsHere = canEditReports(category);
    const canEditTextHere = canEditText(category === 'Community' ? 'dc' : category.toLowerCase());

    // Categoría para textos editables (Community -> 'dc')
    const textCategory = category === 'Community' ? 'dc' : category.toLowerCase();

    // --- 1. DATA DIMENSION: EDITIONS ---
    const allCategoryProjects = useMemo(() => {
        if (!data?.projectsList) return [];
        return data.projectsList.filter(p => p.category === category);
    }, [data?.projectsList, category]);

    // Obtener años disponibles según la categoría
    const categoryDefaultYears = useMemo(() => {
        const startYear = category === 'ONG' ? 2009 : 2018;
        const endYear = 2025;
        return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
    }, [category]);

    const availableYears = useMemo(() => {
        const startYear = category === 'FIS' ? 2018 : (category === 'Community' ? 2018 : 2009);
        const loadedYears = data.availableYears?.filter(y => y >= startYear && y <= 2100) || [];
        return Array.from(new Set([...loadedYears, ...categoryDefaultYears]))
            .filter((year): year is number => typeof year === 'number' && !Number.isNaN(year))
            .sort((a, b) => b - a);
    }, [category, data.availableYears, categoryDefaultYears]);

    const currentSystemYear = data.editions.find(e => e.isCurrent)?.year || 2025;

    // --- 2. GLOBAL FILTER STATE ---
    const [selectedEdition, setSelectedEdition] = useState<string>('Global');
    const [selectedDept, setSelectedDept] = useState<string>('Todos');
    const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
    const [searchTerm, setSearchTerm] = useState('');

    // Inline Project Editing State
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<any | null>(null);

    // Participant Table State
    const [participantSearchTerm, setParticipantSearchTerm] = useState('');
    const [participantPage, setParticipantPage] = useState(1);
    const participantItemsPerPage = 10;
    
    // Inline Participant Editing State
    const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
    const [editParticipantData, setEditParticipantData] = useState<any | null>(null);
    
    // Dynamic projects list for editing based on the selected category in the form
    const projectsListForEdit = useMemo(() => {
        if (!data?.projectsList || !editParticipantData) return [];
        return data.projectsList.filter(proj => proj.category === editParticipantData.category);
    }, [data?.projectsList, editParticipantData?.category]);
    
    // --- NAVIGATION ARCHITECTURE ---
    const [activeMainTab, setActiveMainTab] = useState<'fondos' | 'formacion'>('fondos');
    const [activeFormativeSubTab, setActiveFormativeSubTab] = useState<'participantes' | 'cortes'>('participantes');

    // Modal State
    const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
    const [isReportUploadModalOpen, setIsReportUploadModalOpen] = useState(false);
    const [isUploadingReports, setIsUploadingReports] = useState(false);

    const isGlobalView = selectedEdition === 'Global';
    const displayYear = isGlobalView ? currentSystemYear : parseInt(selectedEdition);

    // --- THEME ENGINE ---
    const getTheme = (cat: CategoryType) => {
        switch (cat) {
            case 'ONG':
                return {
                    textTitle: 'text-brand-red',
                    bgLight: 'bg-red-50',
                    bgDark: 'bg-brand-red',
                    border: 'border-red-200',
                    borderStrong: 'border-brand-red',
                    textValue: 'text-slate-800',
                    iconColor: 'text-brand-red',
                    button: 'bg-brand-red hover:brightness-110 text-white'
                };
            case 'Community':
                return {
                    textTitle: 'text-brand-yellow',
                    bgLight: 'bg-yellow-50',
                    bgDark: 'bg-brand-yellow',
                    border: 'border-yellow-200',
                    borderStrong: 'border-brand-yellow',
                    textValue: 'text-slate-800',
                    iconColor: 'text-brand-yellow',
                    button: 'bg-brand-yellow hover:brightness-110 text-slate-900'
                };
            case 'FIS':
                return {
                    textTitle: 'text-brand-green',
                    bgLight: 'bg-green-50',
                    bgDark: 'bg-brand-green',
                    border: 'border-green-200',
                    borderStrong: 'border-brand-green',
                    textValue: 'text-slate-800',
                    iconColor: 'text-brand-green',
                    button: 'bg-brand-green hover:brightness-110 text-white'
                };
            default: return { textTitle: 'text-brand-blue', bgLight: 'bg-blue-50', bgDark: 'bg-brand-blue', border: 'border-blue-200', borderStrong: 'border-brand-blue', textValue: 'text-slate-800', iconColor: 'text-brand-blue', button: 'bg-brand-blue hover:brightness-110 text-white' };
        }
    };
    const theme = getTheme(category);
    const getCategoryTitle = (cat: CategoryType) => cat === 'ONG' ? 'ONG' : cat === 'Community' ? 'Desarrollo Comunitario' : 'Emprendimiento Social';

    const resolveProjectDepartment = (project: any) =>
        project.department || project.location?.department || project.projectDepartment || 'Sin Depto';
    
    const getFormativeSectionName = (cat: CategoryType) => {
        if (cat === 'ONG') return 'Talleres ONG';
        if (cat === 'Community') return 'Talleres comunitarios';
        return 'Incubadora FGK';
    };

    // --- COMPUTATIONS ---
    const historicalStats = useMemo(() => ({
        orgs: new Set(allCategoryProjects.map(p => p.organization)).size,
        projects: allCategoryProjects.length,
        fgk: allCategoryProjects.reduce((sum, p) => sum + p.amountFGK, 0),
        allies: allCategoryProjects.reduce((sum, p) => sum + p.amountAllies, 0),
        beneficiaries: allCategoryProjects.reduce((sum, p) => sum + p.beneficiaries, 0)
    }), [allCategoryProjects]);

    const historicalFormativeStats = useMemo(() => {
        const trainingProjects = allCategoryProjects.filter(p => p.trainingDetails?.hasTraining);
        return {
            orgs: new Set(trainingProjects.map(p => p.organization)).size,
            participants: trainingProjects.reduce((sum, p) => sum + (p.trainingDetails?.participants?.length || 0), 0)
        };
    }, [allCategoryProjects]);

    const editionProjects = useMemo(() => {
        if (isGlobalView) return allCategoryProjects;
        return allCategoryProjects.filter(p => p.year === displayYear);
    }, [allCategoryProjects, displayYear, isGlobalView]);

    const editionStats = useMemo(() => {
        let totalTechnicalProgress = 0;
        let totalWeightedFinancialProgress = 0;
        let totalAllies = 0;
        let totalCounterpart = 0;
        let totalBudget = 0;

        editionProjects.forEach(p => {
            const pTechProgress = p.technicalProgressPercentage || 0;
            const pFinProgress = p.financialProgressPercentage || 0;

            totalTechnicalProgress += pTechProgress;
            totalWeightedFinancialProgress += (p.amountFGK * (pFinProgress / 100));
            totalBudget += p.amountFGK;

            totalAllies += p.amountAllies;
            totalCounterpart += (p.counterpart || 0) + (p.communityCounterpart?.materialsAmount || 0) + (p.communityCounterpart?.laborAmount || 0);
        });

        const trainingProjects = editionProjects.filter(p => p.trainingDetails?.hasTraining);

        return {
            orgs: new Set(editionProjects.map(p => p.organization)).size,
            fgk: editionProjects.reduce((sum, p) => sum + p.amountFGK, 0),
            allies: totalAllies,
            counterpart: totalCounterpart,
            totalInvestment: totalBudget + totalAllies + totalCounterpart,
            directBeneficiaries: editionProjects.reduce((sum, p) => sum + (p.beneficiaries || 0), 0),
            indirectBeneficiaries: editionProjects.reduce((sum, p) => sum + (p.indirectBeneficiaries || 0), 0),
            technicalProgress: editionProjects.length > 0 ? totalTechnicalProgress / editionProjects.length : 0,
            financialProgress: totalBudget > 0 ? (totalWeightedFinancialProgress / totalBudget) * 100 : 0,
            trainingOrgs: new Set(trainingProjects.map(p => p.organization)).size,
            trainingParticipants: trainingProjects.reduce((sum, p) => sum + (p.trainingDetails?.participants?.length || 0), 0)
        };
    }, [editionProjects]);

    const tableProjects = useMemo(() => {
        return editionProjects.filter(p => {
            const matchDept = selectedDept === 'Todos' || resolveProjectDepartment(p) === selectedDept;
            const matchStatus = selectedStatus === 'Todos' || normalizeProjectStatus(p.status) === normalizeProjectStatus(selectedStatus);
            const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.organization.toLowerCase().includes(searchTerm.toLowerCase());
            return matchDept && matchStatus && matchSearch;
        });
    }, [editionProjects, selectedDept, selectedStatus, searchTerm]);

    const availableDepts = Array.from(new Set(allCategoryProjects.map(p => resolveProjectDepartment(p)))).sort();
    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    const formatInt = (val: number) => new Intl.NumberFormat('en-US').format(val);
    const formatPercent = (val: number) => `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(val) || 0)}%`;
    const normalizeProjectStatus = (value: string) =>
        (value || '')
            .toString()
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

    const allCategoryParticipants = useMemo(() => {
        const list: any[] = [];
        editionProjects.forEach(p => {
            if (p.trainingDetails?.participants) {
                p.trainingDetails.participants.forEach(part => {
                    list.push({
                        ...part,
                        organizationName: (part as any).organizationName || p.organization,
                        projectName: p.name,
                        program: p.trainingDetails.trainingType || (p.category === 'Community' ? 'Desarrollo Comunitario' : p.category === 'FIS' ? 'Emprendimiento Social' : p.category),
                        category: p.category,
                        projectDepartment: (part as any).department || resolveProjectDepartment(p),
                        projectId: p.id,
                        projectYear: p.year
                    });
                });
            }
        });
        return list;
    }, [editionProjects]);

    const filteredParticipants = useMemo(() => {
        return allCategoryParticipants.filter(p =>
            p.name.toLowerCase().includes(participantSearchTerm.toLowerCase()) ||
            p.organizationName.toLowerCase().includes(participantSearchTerm.toLowerCase()) ||
            (p.role || '').toLowerCase().includes(participantSearchTerm.toLowerCase()) ||
            (p.program || '').toLowerCase().includes(participantSearchTerm.toLowerCase())
        );
    }, [allCategoryParticipants, participantSearchTerm]);

    const participantPageCount = Math.ceil(filteredParticipants.length / participantItemsPerPage);
    const paginatedParticipants = useMemo(() => {
        return filteredParticipants.slice(
            (participantPage - 1) * participantItemsPerPage,
            participantPage * participantItemsPerPage
        );
    }, [filteredParticipants, participantPage]);

    const participantStats = useMemo(() => {
        let male = 0;
        let female = 0;

        const ageRanges = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56+': 0 };
        const depts: Record<string, number> = {};

        filteredParticipants.forEach(p => {
            if (p.gender === 'M') male++;
            else if (p.gender === 'F') female++;

            if (p.age) {
                if (p.age <= 25) ageRanges['18-25']++;
                else if (p.age <= 35) ageRanges['26-35']++;
                else if (p.age <= 45) ageRanges['36-45']++;
                else if (p.age <= 55) ageRanges['46-55']++;
                else ageRanges['56+']++;
            }

            const dep = p.department || p.projectDepartment || 'Sin Depto';
            if (!depts[dep]) depts[dep] = 0;
            depts[dep]++;
        });

        const genderData = [
            { name: 'Mujeres', value: female, color: '#ec4899' },
            { name: 'Hombres', value: male, color: '#3b82f6' }
        ];

        const ageData = Object.entries(ageRanges).map(([name, value]) => ({ name, value }));
        const topDepts = Object.entries(depts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

        return { genderData, ageData, topDepts, total: filteredParticipants.length };
    }, [filteredParticipants]);

    const fundCompositionData = useMemo(() => {
        return [
            { name: 'Aporte FGK', value: editionStats.fgk, color: '#0ea5e9' },
            { name: 'Contrapartida Org', value: editionStats.counterpart, color: '#f59e0b' },
            { name: 'Fondos Aliados', value: editionStats.allies, color: '#10b981' }
        ].filter(d => d.value > 0);
    }, [editionStats]);

    // --- ANIMATIONS ---
    const animatedOrgs = useCountUp(editionStats.orgs, 800);
    const animatedFgk = useCountUp(editionStats.fgk, 1200);
    const animatedAllies = useCountUp(editionStats.allies, 1000);
    const animatedDirectBen = useCountUp(editionStats.directBeneficiaries, 1200);
    const animatedIndirectBen = useCountUp(editionStats.indirectBeneficiaries, 1200);
    const animatedTotalParticipants = useCountUp(participantStats.total, 1200);

    const animatedHistOrgs = useCountUp(historicalStats.orgs, 800);
    const animatedHistProjects = useCountUp(historicalStats.projects, 1000);
    const animatedHistFgk = useCountUp(historicalStats.fgk, 1200);
    const animatedHistAllies = useCountUp(historicalStats.allies, 1000);
    const animatedHistBeneficiaries = useCountUp(historicalStats.beneficiaries, 1200);
    const animatedHistFormativeOrgs = useCountUp(historicalFormativeStats.orgs, 800);
    const animatedHistFormativeParticipants = useCountUp(historicalFormativeStats.participants, 1000);

    // --- CSV EXPORT HANDLERS ---
    const handleParticipantExportCSV = () => {
        if (allCategoryParticipants.length === 0) return;
        const headers = ["Participante", "Edad", "Género", "Organización", "Programa", "Departamento"];
        const rows = filteredParticipants.map(p => [
            `"${p.name}"`,
            p.age || 'N/A',
            p.gender === 'M' ? 'Hombre' : p.gender === 'F' ? 'Mujer' : 'N/A',
            `"${p.organizationName}"`,
            `"${p.program}"`,
            `"${p.projectDepartment || 'Sin Depto'}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Participantes_${category}_${displayYear}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleProjectsExportCSV = () => {
        if (tableProjects.length === 0) return;
        const headers = ["Proyecto", "Organización", "Dpto", "Inversión FGK", "Aliados", "Contrapartida", "Total", "Beneficiarios", "Estado"];
        const rows = tableProjects.map(p => {
            const counterpart = (p.counterpart || 0) + (p.communityCounterpart?.materialsAmount || 0) + (p.communityCounterpart?.laborAmount || 0);
            const total = p.amountFGK + p.amountAllies + counterpart;
            return [
                `"${p.name}"`,
                `"${p.organization}"`,
                `"${resolveProjectDepartment(p)}"`,
                p.amountFGK,
                p.amountAllies,
                counterpart,
                total,
                p.beneficiaries,
                p.status
            ];
        });
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Proyectos_${category}_${displayYear}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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

    const normalizeText = (value: any) =>
        (value ?? '').toString().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    const normalizeHeader = (value: any) => normalizeText(value).replace(/\s+/g, ' ');

    const parseNumberLike = (value: any) => {
        if (value === null || value === undefined || value === '') return 0;
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
        const cleaned = value
            .toString()
            .replace(/\$/g, '')
            .replace(/\s+/g, '')
            .replace(/,/g, '');
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

    const handleBulkReportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingReports(true);
        try {
            const result = await uploadExcel(file, category, displayYear);
            setIsUploadingReports(false);
            setIsReportUploadModalOpen(false);
            const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
            alert(result?.message || `Seguimiento mensual procesado correctamente para la categoría ${category}.`);
            const partialErrors = [
                ...(result?.results?.actividades?.errors || []),
                ...(result?.results?.reportes?.errors || []),
            ];
            if (warnings.length > 0) {
                alert(warnings.join('\n'));
            } else if (partialErrors.length > 0) {
                const normalize = (text: any) => (text ?? '').toString().toLowerCase();
                const prioritizedError =
                    partialErrors.find((item: any) => normalize(item?.error).includes('período definido') || normalize(item?.error).includes('mes de inicio') || normalize(item?.error).includes('mes final')) ||
                    partialErrors.find((item: any) => normalize(item?.error).includes('supera la inversión fgk')) ||
                    partialErrors[0];
                const projectLabel =
                    prioritizedError?.row?.projectName ||
                    prioritizedError?.row?.['Nombre del Proyecto'] ||
                    prioritizedError?.row?.Nombre_Proyecto ||
                    prioritizedError?.row?.project ||
                    prioritizedError?.row?.proyecto ||
                    prioritizedError?.row?.nombre_proyecto ||
                    prioritizedError?.row?.proyecto_id ||
                    'un proyecto';
                const reason = prioritizedError?.error || 'No se pudo procesar el seguimiento.';
                const normalizedReason = normalize(reason);
                const normalizedProject = normalize(projectLabel);
                alert(
                    normalizedProject !== 'un proyecto' && normalizedReason.includes(normalizedProject)
                        ? reason
                        : `No se subió el seguimiento de ${projectLabel} porque ${reason}`
                );
            }
        } catch (error) {
            console.error('Error procesando seguimiento mensual:', error);
            alert('No se pudo procesar el archivo de seguimiento.');
        } finally {
            setIsUploadingReports(false);
            if (e.target) e.target.value = '';
        }
    };

    // --- PROJECT DELETE HELPER ---
    const handleDeleteProject = async (projectId: string) => {
        if (window.confirm("¿Está seguro de que desea borrar este proyecto? Esta acción no se puede deshacer.")) {
            try {
                await deleteProject(projectId);
            } catch (error) {
                console.error("Error al borrar el proyecto", error);
            }
        }
    };

    // --- INLINE PROJECT EDITING HELPERS ---
    const handleStartEdit = (project: any) => {
        setEditingProjectId(project.id);
        setEditFormData({
            id: project.id,
            name: project.name,
            organization: project.organization,
            department: resolveProjectDepartment(project),
            year: project.year,
            amountFGK: project.amountFGK,
            beneficiaries: project.beneficiaries,
            status: project.status ?? ''
        });
    };

    const handleCancelEdit = () => {
        setEditingProjectId(null);
        setEditFormData(null);
    };

    const handleSaveEdit = async () => {
        if (!editFormData || !editingProjectId) return;
        try {
            const newProjectsList = data.projectsList.map(p => {
                if (p.id === editingProjectId) {
                    return {
                        ...p,
                        name: editFormData.name,
                        organization: editFormData.organization,
                        department: editFormData.department,
                        year: Number(editFormData.year),
                        amountFGK: Number(editFormData.amountFGK),
                        beneficiaries: Number(editFormData.beneficiaries),
                        status: editFormData.status ? editFormData.status : null
                    };
                }
                return p;
            });
            
            await updateProjectList(newProjectsList);
            setEditingProjectId(null);
            setEditFormData(null);
        } catch (err) {
            console.error("Error al guardar cambios de forma manual:", err);
            alert("No se pudieron guardar los cambios manuales.");
        }
    };

    const handleEditFormChange = (field: string, value: any) => {
        setEditFormData(prev => prev ? { ...prev, [field]: value } : null);
    };

    // --- INLINE PARTICIPANT EDITING HELPERS ---
    const handleStartEditParticipant = (p: any) => {
        setEditingParticipantId(p.id);
        setEditParticipantData({
            id: p.id,
            name: p.name,
            age: p.age || '',
            gender: p.gender || 'M',
            projectId: p.projectId,
            category: p.category || category, // default to current page's category
            organizationName: p.organizationName || '',
            projectName: p.projectName || '',
            projectYear: p.projectYear,
            department: p.department || p.projectDepartment || 'San Salvador',
            status: p.status || 'enrolled',
            phone: p.phone || '',
            email: p.email || '',
            role: p.role || ''
        });
    };

    const handleCancelEditParticipant = () => {
        setEditingParticipantId(null);
        setEditParticipantData(null);
    };

    const handleEditParticipantChange = (field: string, value: any) => {
        setEditParticipantData(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleSaveEditParticipant = async () => {
        if (!editParticipantData || !editingParticipantId) return;
        try {
            const originalProject = data.projectsList.find(proj => 
                proj.trainingDetails?.participants?.some(part => part.id === editingParticipantId)
            );
            
            if (!originalProject) {
                alert("Proyecto original no encontrado para el participante.");
                return;
            }

            const updatedParticipant = {
                id: editingParticipantId,
                name: editParticipantData.name,
                age: editParticipantData.age ? Number(editParticipantData.age) : undefined,
                gender: editParticipantData.gender,
                phone: editParticipantData.phone || undefined,
                email: editParticipantData.email || undefined,
                role: editParticipantData.role || undefined,
                department: editParticipantData.department,
                status: editParticipantData.status
            };

            let newProjectsList = [...data.projectsList];

            if (originalProject.id !== editParticipantData.projectId) {
                const targetProject = data.projectsList.find(proj => proj.id === editParticipantData.projectId);
                if (!targetProject) {
                    alert("Proyecto destino no encontrado.");
                    return;
                }

                newProjectsList = newProjectsList.map(proj => {
                    if (proj.id === originalProject.id) {
                        return {
                            ...proj,
                            trainingDetails: {
                                ...proj.trainingDetails,
                                participants: (proj.trainingDetails.participants || []).filter(part => part.id !== editingParticipantId)
                            }
                        };
                    }
                    if (proj.id === targetProject.id) {
                        return {
                            ...proj,
                            trainingDetails: {
                                ...proj.trainingDetails,
                                hasTraining: true,
                                participants: [...(proj.trainingDetails.participants || []), updatedParticipant]
                            }
                        };
                    }
                    return proj;
                });
            } else {
                newProjectsList = newProjectsList.map(proj => {
                    if (proj.id === originalProject.id) {
                        return {
                            ...proj,
                            trainingDetails: {
                                ...proj.trainingDetails,
                                participants: (proj.trainingDetails.participants || []).map(part => 
                                    part.id === editingParticipantId ? updatedParticipant : part
                                )
                            }
                        };
                    }
                    return proj;
                });
            }

            await updateProjectList(newProjectsList);
            setEditingParticipantId(null);
            setEditParticipantData(null);
        } catch (err) {
            console.error("Error al guardar participante:", err);
            alert("No se pudieron guardar los cambios del participante.");
        }
    };

    const handleDeleteParticipant = async (participantId: string) => {
        if (window.confirm("¿Está seguro de que desea eliminar a este participante? Esta acción no se puede deshacer.")) {
            try {
                const originalProject = data.projectsList.find(proj => 
                    proj.trainingDetails?.participants?.some(part => part.id === participantId)
                );
                
                if (!originalProject) {
                    alert("Proyecto del participante no encontrado.");
                    return;
                }

                const newProjectsList = data.projectsList.map(proj => {
                    if (proj.id === originalProject.id) {
                        return {
                            ...proj,
                            trainingDetails: {
                                ...proj.trainingDetails,
                                participants: (proj.trainingDetails.participants || []).filter(part => part.id !== participantId)
                            }
                        };
                    }
                    return proj;
                });

                await updateProjectList(newProjectsList);
            } catch (error) {
                console.error("Error al borrar el participante", error);
            }
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

            {/* --- HEADER CON TEXTOS EDITABLES --- */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    <span className="cursor-pointer hover:text-blue-600" onClick={onBack}>Inicio</span>
                    <ChevronRight className="w-3 h-3" />
                    <span>Categorías</span>
                    <ChevronRight className="w-3 h-3" />
                    <span className={`font-bold ${theme.textTitle}`}>
                        <EditableText 
                            category={textCategory} 
                            idKey="main_title" 
                            defaultText={getCategoryTitle(category)} 
                            className={theme.textTitle}
                        />
                    </span>
                </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">
                            <EditableText 
                                category={textCategory} 
                                idKey="main_title" 
                                defaultText={getCategoryTitle(category)} 
                                className="text-3xl font-bold text-slate-900"
                            />
                        </h1>
                        <p className="text-slate-500">
                            <EditableText 
                                category={textCategory} 
                                idKey="subtitle" 
                                defaultText="Gestión de Impacto y Seguimiento por Edición" 
                                className="text-slate-500"
                            />
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Exportar Excel por categoría */}
                        <button
                            onClick={() => exportService.downloadCategoryExcel(category, displayYear)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-sm bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-sm hover:bg-emerald-100 transition-all"
                        >
                            <Download className="w-4 h-4" />
                            Exportar Excel
                        </button>

                        {/* BULK REPORT UPLOAD BUTTON - solo con permisos */}
                        {canEditReportsHere && (
                            <button
                                onClick={() => setIsReportUploadModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-sm bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all"
                            >
                                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                Subir Reporte Mensual (Excel)
                            </button>
                        )}

                        {/* DATA LOADER BUTTON - solo con permisos */}
                        {canEditCategory && (
                            <button
                                onClick={() => setIsLoadModalOpen(true)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-sm text-white font-semibold text-sm transition-all ${theme.button}`}
                            >
                                <UploadCloud className="w-4 h-4" />
                                Cargar / Actualizar Proyectos
                            </button>
                        )}

                        {/* GLOBAL EDITION FILTER */}
                        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2 px-2">
                                <Layers className="w-4 h-4 text-slate-400" />
                                <span className="text-xs font-bold text-slate-500 uppercase">Filtro de Edición:</span>
                            </div>
                            <div className="relative">
                                <select
                                    className={`appearance-none bg-slate-50 border font-bold py-2 pl-3 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm cursor-pointer ${theme.border} ${theme.textTitle}`}
                                    value={selectedEdition}
                                    onChange={(e) => setSelectedEdition(e.target.value)}
                                >
                                    <option value="Global">Global (Histórico)</option>
                                    {availableYears.map(y => (
                                        <option key={y} value={y}>Edición {y}</option>
                                    ))}
                                </select>
                                <Calendar className={`absolute right-2.5 top-2.5 w-4 h-4 pointer-events-none ${theme.textValue}`} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- BLOQUE 1: HISTÓRICO INSTITUCIONAL (GLOBAL) --- */}
            <section aria-label="Bloque 1: Histórico Global" className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${theme.bgDark}`}></div>
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className={`p-2 rounded-lg ${theme.bgLight}`}>
                        <Building2 className={`w-5 h-5 ${theme.iconColor}`} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                            <EditableText 
                                category={textCategory} 
                                idKey="historical_title" 
                                defaultText={`Visión Histórica - ${getCategoryTitle(category)}`} 
                                className="text-sm font-bold text-slate-800 uppercase tracking-wide"
                            />
                        </h2>
                        <p className="text-xs text-slate-500">
                            <EditableText 
                                category={textCategory} 
                                idKey="historical_desc" 
                                defaultText="Datos consolidados desde el inicio de operaciones en esta categoría" 
                                className="text-xs text-slate-500"
                            />
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-slate-800 tabular-nums">{animatedHistOrgs}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">Orgs. Apoyadas</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-slate-800 tabular-nums">{animatedHistProjects}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">Proyectos Totales</p>
                    </div>
                    <div className={`text-center p-4 rounded-lg border ${theme.bgLight} ${theme.border}`}>
                        <p className={`text-2xl font-bold ${theme.textValue} tabular-nums`}>{formatCurrency(animatedHistFgk)}</p>
                        <p className={`text-[10px] uppercase font-bold mt-1 opacity-70 ${theme.textValue}`}>Inversión FGK</p>
                    </div>
                    <div
                        onClick={onViewAllies}
                        className="text-center p-4 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-brand-blue/30 hover:shadow-sm transition-all group relative"
                        title="Ver detalle de aliados"
                    >
                        <p className="text-2xl font-bold text-slate-700 group-hover:text-brand-blue transition-colors tabular-nums">{formatCurrency(animatedHistAllies)}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold mt-1 flex justify-center items-center gap-1 group-hover:text-brand-blue transition-colors">
                            Fondos Aliados <ChevronRight className="w-3 h-3" />
                        </p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-slate-800 tabular-nums">{formatInt(animatedHistBeneficiaries)}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">Beneficiarios Est.</p>
                    </div>
                </div>
            </section>

            {/* --- BLOQUE 1.5: FORMACIÓN HISTÓRICA --- */}
            <section aria-label="Bloque 1.5: Formación Histórica" className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${theme.bgDark}`}></div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${theme.bgLight}`}>
                            <GraduationCap className={`w-6 h-6 ${theme.iconColor}`} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                <EditableText 
                                    category={textCategory} 
                                    idKey="historical_training_title" 
                                    defaultText="Formación Histórica" 
                                    className="text-base font-bold text-slate-900"
                                />
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                <EditableText 
                                    category={textCategory} 
                                    idKey="historical_training_desc" 
                                    defaultText="Impacto formativo global acumulado en esta categoría." 
                                    className="text-xs text-slate-500"
                                />
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-12 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-12">
                        <div className="text-center md:text-left">
                            <p className="text-2xl font-bold text-slate-800 tabular-nums">{animatedHistFormativeOrgs}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">
                                <EditableText 
                                    category={textCategory} 
                                    idKey="historical_training_orgs_label" 
                                    defaultText="Orgs. Formadas" 
                                    className="text-[10px] text-slate-400 uppercase font-bold"
                                />
                            </p>
                        </div>
                        <div className="text-center md:text-left">
                            <p className="text-2xl font-bold text-slate-800 tabular-nums">{animatedHistFormativeParticipants}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">
                                <EditableText 
                                    category={textCategory} 
                                    idKey="historical_training_parts_label" 
                                    defaultText="Participantes (Histórico)" 
                                    className="text-[10px] text-slate-400 uppercase font-bold"
                                />
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- SEPARATOR --- */}
            <div className="flex items-center gap-4">
                <div className="h-px bg-slate-200 flex-1"></div>
                <span className={`text-xs font-bold uppercase tracking-widest ${theme.textValue}`}>
                    {isGlobalView ? `Monitor: Edición Vigente ${displayYear}` : `Edición Actual - Detalle ${displayYear}`}
                </span>
                <div className="h-px bg-slate-200 flex-1"></div>
            </div>

            {/* --- BLOQUE 2: EDICIÓN SELECCIONADA --- */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                <section aria-label="Bloque 2.1: KPIs Edición" className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 ${theme.bgDark}`}></div>
                    <div className="flex items-center gap-2 mb-6 relative z-10">
                        <div className={`w-2 h-2 rounded-full ${theme.bgDark}`}></div>
                        <h3 className="text-sm font-bold text-slate-700 uppercase">
                            <EditableText 
                                category={textCategory} 
                                idKey="edition_kpis_title" 
                                defaultText="Indicadores Generales" 
                                className="text-sm font-bold text-slate-700 uppercase"
                            /> {displayYear}
                        </h3>
                        {isGlobalView && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded ml-2">Vista Monitor</span>}
                    </div>

                    <div className="space-y-6 relative z-10">
                        <div className="grid grid-cols-3 gap-6">
                            <div className="space-y-1">
                                <p className="text-xs text-slate-500 uppercase font-semibold">
                                    <EditableText 
                                        category={textCategory} 
                                        idKey="kpi_orgs_label" 
                                        defaultText="Orgs. Apoyadas" 
                                        className="text-xs text-slate-500 uppercase font-semibold"
                                    />
                                </p>
                                <p className="text-3xl font-bold text-slate-900 tabular-nums">{animatedOrgs}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-slate-500 uppercase font-semibold">
                                    <EditableText 
                                        category={textCategory} 
                                        idKey="kpi_fgk_label" 
                                        defaultText="Inversión FGK" 
                                        className="text-xs text-slate-500 uppercase font-semibold"
                                    />
                                </p>
                                <p className={`text-3xl font-bold ${theme.textValue} tabular-nums`}>{formatCurrency(animatedFgk)}</p>
                            </div>
                            <div onClick={onViewAllies} className="space-y-1 cursor-pointer group" title="Ver detalle de aliados">
                                <p className="text-xs text-slate-500 uppercase font-semibold group-hover:text-brand-blue flex items-center gap-1 transition-colors">
                                    <EditableText 
                                        category={textCategory} 
                                        idKey="kpi_allies_label" 
                                        defaultText="Fondos Aliados" 
                                        className="text-xs text-slate-500 uppercase font-semibold group-hover:text-brand-blue"
                                    /> <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </p>
                                <p className="text-3xl font-bold text-slate-600 group-hover:text-slate-900 transition-colors tabular-nums">{formatCurrency(animatedAllies)}</p>
                            </div>
                        </div>

                        <div className="border-t border-slate-100"></div>

                        <div className="grid grid-cols-3 gap-6">
                            <div className="flex items-start gap-3 col-span-2 sm:col-span-1">
                                <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                                    <Heart className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-800 tabular-nums">{formatInt(animatedDirectBen)}</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">
                                        <EditableText 
                                            category={textCategory} 
                                            idKey="kpi_direct_ben_label" 
                                            defaultText="Beneficiarios Directos" 
                                            className="text-[10px] text-slate-500 uppercase font-bold"
                                        />
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 col-span-2 sm:col-span-1">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-800 tabular-nums">{formatInt(animatedIndirectBen)}</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">
                                        <EditableText 
                                            category={textCategory} 
                                            idKey="kpi_indirect_ben_label" 
                                            defaultText="Beneficiarios Indirectos" 
                                            className="text-[10px] text-slate-500 uppercase font-bold"
                                        />
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Composición de Fondos */}
                <section aria-label="Bloque 2.1.5: Composición de Fondos" className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col relative overflow-hidden items-center text-center">
                    <h3 className="text-sm font-bold text-slate-700 uppercase mb-2 w-full text-left">
                        <EditableText 
                            category={textCategory} 
                            idKey="funds_composition_title" 
                            defaultText="Composición de Fondos" 
                            className="text-sm font-bold text-slate-700 uppercase"
                        />
                    </h3>
                    <div className="h-44 w-full mt-2 relative">
                        {editionStats.totalInvestment > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                                    <Pie
                                        data={fundCompositionData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={60}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                        label={({ cx, cy, midAngle, outerRadius, percent }) => {
                                            if (!percent || percent < 0.01 || midAngle == null) return null;
                                            const RADIAN = Math.PI / 180;
                                            const radius = (outerRadius ?? 0) * 1.3;
                                            const x = (cx ?? 0) + radius * Math.cos(-midAngle * RADIAN);
                                            const y = (cy ?? 0) + radius * Math.sin(-midAngle * RADIAN);
                                            return (
                                                <text x={x} y={y} fill="#475569" textAnchor={x > (cx ?? 0) ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight={700}>
                                                    {`${(percent * 100).toFixed(0)}%`}
                                                </text>
                                            );
                                        }}
                                        labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                                    >
                                        {fundCompositionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(value) => formatCurrency(Number(value))} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-xs text-slate-400">Sin fondos</div>
                        )}
                    </div>
                    {editionStats.totalInvestment > 0 && (
                        <div className="flex flex-col gap-1.5 mt-4 w-full text-left">
                            <div className="flex justify-between items-center text-[10px]"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sky-500"></div><span className="text-slate-600 font-bold">FGK</span></div><span className="font-mono text-slate-500 font-bold">{formatCurrency(editionStats.fgk)}</span></div>
                            <div className="flex justify-between items-center text-[10px]"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div><span className="text-slate-600 font-bold">Contrapartida</span></div><span className="font-mono text-slate-500 font-bold">{formatCurrency(editionStats.counterpart)}</span></div>
                            <div className="flex justify-between items-center text-[10px]"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-slate-600 font-bold">Aliados</span></div><span className="font-mono text-slate-500 font-bold">{formatCurrency(editionStats.allies)}</span></div>
                        </div>
                    )}
                </section>

                <section aria-label="Bloque 2.2: Avance Edición" className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between relative overflow-hidden">
                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2 text-slate-700">
                                <BarChart3 className={`w-4 h-4 ${theme.textTitle}`} />
                                <EditableText 
                                    category={textCategory} 
                                    idKey="progress_title" 
                                    defaultText="AVANCE" 
                                    className="text-sm font-bold uppercase tracking-wide"
                                /> {displayYear}
                            </h3>
                            <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">{isGlobalView ? 'Promedio Global' : 'Promedio Edición'}</span>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                                <span className="text-slate-600">
                                    <EditableText 
                                        category={textCategory} 
                                        idKey="progress_tech_label" 
                                        defaultText="Avance Técnico Global" 
                                        className="text-slate-600"
                                    />
                                </span>
                                <span className="text-slate-800">{formatPercent(editionStats.technicalProgress)}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden"><div className={`h-3 rounded-full transition-all duration-1000 ease-out ${theme.bgDark}`} style={{ width: `${editionStats.technicalProgress}%` }}></div></div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                                <span className="text-slate-600">
                                    <EditableText 
                                        category={textCategory} 
                                        idKey="progress_fin_label" 
                                        defaultText="Ejecución Financiera Global" 
                                        className="text-slate-600"
                                    />
                                </span>
                                <span className="text-slate-800">{formatPercent(editionStats.financialProgress)}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden"><div className="bg-brand-blue h-3 rounded-full transition-all duration-1000 ease-out" style={{ width: `${editionStats.financialProgress}%` }}></div></div>
                        </div>
                    </div>
                </section>
            </div>

            {/* --- TABS NAVIGATION --- */}
            <div className="flex border-b border-slate-200 mb-6 mt-8 overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveMainTab('fondos')} className={`px-8 py-3 font-bold text-xs uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeMainTab === 'fondos' ? `border-slate-800 text-slate-900 bg-slate-50/50` : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/30'}`}>
                    <EditableText 
                        category={textCategory} 
                        idKey="tab_funds" 
                        defaultText="Otorgamiento de Fondos" 
                        className="font-bold text-xs uppercase tracking-widest"
                    />
                </button>
                <button onClick={() => setActiveMainTab('formacion')} className={`px-8 py-3 font-bold text-xs uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeMainTab === 'formacion' ? `border-slate-800 text-slate-900 bg-slate-50/50` : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/30'}`}>
                    <EditableText 
                        category={textCategory} 
                        idKey="tab_formative" 
                        defaultText={getFormativeSectionName(category)} 
                        className="font-bold text-xs uppercase tracking-widest"
                    />
                </button>
            </div>

            {/* SUB-TABS: ONLY FOR FORMATIVE SECTION */}
            {activeMainTab === 'formacion' && (
                <div className="flex gap-2 mb-8 animate-in fade-in slide-in-from-top-2 duration-300">
                    <button onClick={() => setActiveFormativeSubTab('participantes')} className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${activeFormativeSubTab === 'participantes' ? 'bg-slate-900 text-white shadow-md ring-2 ring-slate-100' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}>Directorio de Participantes</button>
                    {category === 'Community' && (
                        <button onClick={() => setActiveFormativeSubTab('cortes')} className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${activeFormativeSubTab === 'cortes' ? 'bg-slate-900 text-white shadow-md ring-2 ring-slate-100' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}>Cortes Formativos</button>
                    )}
                </div>
            )}

            {/* --- BLOQUE 4: LISTADO DE PROYECTOS (FONDO) --- */}
            {activeMainTab === 'fondos' && (
                <section aria-label="Bloque 4: Listado de Proyectos" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col lg:flex-row gap-4 justify-between items-center">
                            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-slate-400" />
                                <EditableText 
                                    category={textCategory} 
                                    idKey="projects_list_title" 
                                    defaultText="Listado de Proyectos" 
                                    className="font-bold text-slate-700 text-sm uppercase tracking-wide"
                                />
                                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px]">{isGlobalView ? 'Global' : displayYear}</span>
                            </h3>
                            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                                <div className="relative">
                                    <select className="appearance-none bg-white border border-slate-300 text-slate-700 text-xs font-semibold py-2 pl-3 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400" value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
                                        <option value="Todos">Todos los Deptos.</option>
                                        {availableDepts.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                    <Filter className="absolute right-2.5 top-2.5 w-3 h-3 text-slate-400 pointer-events-none" />
                                </div>
                                <div className="relative">
                                    <select className="appearance-none bg-white border border-slate-300 text-slate-700 text-xs font-semibold py-2 pl-3 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                                        <option value="Todos">Todos los Estados</option>
                                        <option value="En Ejecución">En Ejecución</option>
                                        <option value="Activo">Activo</option>
                                        <option value="Finalizado">Finalizado</option>
                                        <option value="En Cierre">En Cierre</option>
                                        <option value="Suspendido">Suspendido</option>
                                    </select>
                                    <Filter className="absolute right-2.5 top-2.5 w-3 h-3 text-slate-400 pointer-events-none" />
                                </div>
                                <div className="relative w-full lg:w-48">
                                    <input type="text" placeholder="Buscar..." className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                    <Search className="absolute left-2.5 top-2.5 w-3 h-3 text-slate-400" />
                                </div>
                                <button onClick={handleProjectsExportCSV} className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 px-3 py-2 rounded-md font-bold text-xs transition-colors"><Download className="w-3.5 h-3.5" /> Exportar CSV</button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white text-slate-500 font-bold border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4">Nombre del Proyecto</th>
                                        <th className="px-6 py-4">Organización</th>
                                        <th className="px-6 py-4">Depto.</th>
                                        <th className="px-6 py-4 text-center">Edición</th>
                                        <th className="px-6 py-4 text-right">Monto FGK</th>
                                        <th className="px-6 py-4 text-center">Beneficiarios</th>
                                        <th className="px-6 py-4 text-center">Estado</th>
                                        {canEditCategory && <th className="px-6 py-4 text-center">Acciones</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {tableProjects.length > 0 ? (
                                        tableProjects.map(project => {
                                            const isEditing = editingProjectId === project.id;
                                            return (
                                                <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                                                    {isEditing ? (
                                                        <>
                                                            <td className="px-6 py-4">
                                                                <input
                                                                    type="text"
                                                                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold focus:ring-1 focus:ring-slate-400 outline-none"
                                                                    value={editFormData.name}
                                                                    onChange={e => handleEditFormChange('name', e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <input
                                                                    type="text"
                                                                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 focus:ring-1 focus:ring-slate-400 outline-none"
                                                                    value={editFormData.organization}
                                                                    onChange={e => handleEditFormChange('organization', e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <select
                                                                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 focus:ring-1 focus:ring-slate-400 outline-none"
                                                                    value={editFormData.department}
                                                                    onChange={e => handleEditFormChange('department', e.target.value)}
                                                                >
                                                                    {EL_SALVADOR_DEPTS.map(d => (
                                                                        <option key={d} value={d}>{d}</option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <input
                                                                    type="number"
                                                                    className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-xs text-center focus:ring-1 focus:ring-slate-400 outline-none font-mono font-bold"
                                                                    value={editFormData.year}
                                                                    onChange={e => handleEditFormChange('year', e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <input
                                                                    type="number"
                                                                    className="w-28 bg-white border border-slate-300 rounded px-2 py-1 text-xs text-right focus:ring-1 focus:ring-slate-400 outline-none font-mono font-medium"
                                                                    value={editFormData.amountFGK}
                                                                    onChange={e => handleEditFormChange('amountFGK', e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <input
                                                                    type="number"
                                                                    className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-xs text-center focus:ring-1 focus:ring-slate-400 outline-none font-medium"
                                                                    value={editFormData.beneficiaries}
                                                                    onChange={e => handleEditFormChange('beneficiaries', e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <select
                                                                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 focus:ring-1 focus:ring-slate-400 outline-none"
                                                                    value={editFormData.status ?? ''}
                                                                    onChange={e => handleEditFormChange('status', e.target.value)}
                                                                >
                                                                    <option value="">Sin estado</option>
                                                                    <option value="Activo">Activo</option>
                                                                    <option value="En Ejecución">En Ejecución</option>
                                                                    <option value="En Cierre">En Cierre</option>
                                                                    <option value="Finalizado">Finalizado</option>
                                                                    <option value="Suspendido">Suspendido</option>
                                                                </select>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <button
                                                                        onClick={handleSaveEdit}
                                                                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                                                        title="Guardar"
                                                                    >
                                                                        <Save className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={handleCancelEdit}
                                                                        className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                                                        title="Cancelar"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="px-6 py-4">
                                                                <button
                                                                    onClick={() => onSelectProject(slugifyProjectName(project.name))}
                                                                    className={`font-bold text-left hover:underline ${theme.textValue}`}
                                                                >
                                                                    {project.name}
                                                                </button>
                                                            </td>
                                                            <td className="px-6 py-4 text-slate-600">{project.organization}</td>
                                                            <td className="px-6 py-4 text-slate-600">{resolveProjectDepartment(project)}</td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-mono font-bold">
                                                                    {project.year}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-mono font-medium text-slate-700">
                                                                {formatCurrency(project.amountFGK)}
                                                            </td>
                                                            <td className="px-6 py-4 text-center text-slate-600">
                                                                {formatInt(project.beneficiaries)}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${normalizeProjectStatus(project.status) === 'activo' ? 'bg-emerald-100 text-emerald-800' : normalizeProjectStatus(project.status) === 'en cierre' ? 'bg-amber-100 text-amber-800' : normalizeProjectStatus(project.status) === 'finalizado' ? 'bg-blue-100 text-blue-800' : normalizeProjectStatus(project.status) === 'en ejecucion' ? 'bg-blue-50 text-blue-700' : normalizeProjectStatus(project.status) === 'suspendido' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'}`}>
                                                                    {project.status}
                                                                </span>
                                                            </td>
                                                            {canEditCategory && (
                                                                <td className="px-6 py-4 text-center">
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <button
                                                                            onClick={() => handleStartEdit(project)}
                                                                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition-all"
                                                                            title="Editar"
                                                                        >
                                                                            <Edit2 className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteProject(project.id)}
                                                                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded transition-all"
                                                                            title="Borrar"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            )}
                                                        </>
                                                    )}
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={canEditCategory ? 8 : 7} className="px-6 py-12 text-center text-slate-400">
                                                No se encontraron proyectos con los filtros seleccionados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 text-center">Mostrando {tableProjects.length} proyectos. Haga clic en el nombre para ver detalle completo.</div>
                    </div>
                </section>
            )}

            {/* --- BLOQUE 5: DETALLE DE PARTICIPANTES (FORMACION) --- */}
            {activeMainTab === 'formacion' && activeFormativeSubTab === 'participantes' && (
                <section aria-label="Bloque 5: Participantes" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {category === 'FIS' ? (
                        <FisIncubadoraModule />
                    ) : (
                        <div className="mt-0 pt-0">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">
                                        <EditableText 
                                            category={textCategory} 
                                            idKey="participants_title" 
                                            defaultText={`Directorio de Participantes (${getCategoryTitle(category)})`} 
                                            className="text-lg font-bold text-slate-800"
                                        />
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        <EditableText 
                                            category={textCategory} 
                                            idKey="participants_desc" 
                                            defaultText="Registro histórico de todas las formaciones en este programa." 
                                            className="text-sm text-slate-500"
                                        />
                                    </p>
                                </div>
                                <div className="mt-4 sm:mt-0 relative w-full sm:w-64">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input type="text" placeholder="Buscar por nombre u organización..." value={participantSearchTerm} onChange={(e) => { setParticipantSearchTerm(e.target.value); setParticipantPage(1); }} className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="mt-4 sm:mt-0 ml-0 sm:ml-4">
                                    <button onClick={handleParticipantExportCSV} className="flex items-center justify-center gap-1.5 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 px-4 py-2 rounded-lg font-bold text-xs transition-colors w-full sm:w-auto">
                                        <Download className="w-4 h-4" /> Exportar a CSV
                                    </button>
                                </div>
                            </div>

                            {participantStats.total > 0 && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col items-center">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider w-full text-center border-b border-slate-200 pb-2 mb-4">
                                            <EditableText 
                                                category={textCategory} 
                                                idKey="parts_gender_title" 
                                                defaultText="Distribución por Género" 
                                                className="text-xs font-bold text-slate-500 uppercase tracking-wider"
                                            />
                                        </h4>
                                        <div className="h-48 w-full relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={participantStats.genderData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={30}
                                                        outerRadius={45}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                        stroke="none"
                                                        label={({ cx, cy, midAngle, outerRadius, percent }) => {
                                                            if (!percent || percent < 0.01 || midAngle == null) return null;
                                                            const RADIAN = Math.PI / 180;
                                                            const radius = (outerRadius ?? 0) * 1.3;
                                                            const x = (cx ?? 0) + radius * Math.cos(-midAngle * RADIAN);
                                                            const y = (cy ?? 0) + radius * Math.sin(-midAngle * RADIAN);
                                                            return (
                                                                <text x={x} y={y} fill="#475569" textAnchor={x > (cx ?? 0) ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight={700}>
                                                                    {`${(percent * 100).toFixed(0)}%`}
                                                                </text>
                                                            );
                                                        }}
                                                        labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                                                    >
                                                        {participantStats.genderData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                                                    </Pie>
                                                    <RechartsTooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="flex gap-4 mt-2 border-t border-slate-200 w-full justify-center pt-3">
                                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-pink-500"></div><span className="text-xs text-slate-600 font-medium">Mujeres</span></div>
                                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span className="text-xs text-slate-600 font-medium">Hombres</span></div>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">{participantStats.total} Participantes Totales</p>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center border-b border-slate-200 pb-2 mb-4">
                                            <EditableText 
                                                category={textCategory} 
                                                idKey="parts_age_title" 
                                                defaultText="Grupos de Edad" 
                                                className="text-xs font-bold text-slate-500 uppercase tracking-wider"
                                            />
                                        </h4>
                                        <div className="h-48 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={participantStats.ageData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                                    <RechartsTooltip />
                                                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={30}>
                                                        <LabelList dataKey="value" position="top" fill="#64748b" fontSize={10} fontWeight="bold" />
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center border-b border-slate-200 pb-2 mb-4">Top 5 Regiones</h4>
                                        <div className="h-48 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={participantStats.topDepts} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                                    <XAxis type="number" hide />
                                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                                                    <RechartsTooltip />
                                                    <Bar dataKey="value" fill="#14b8a6" radius={[0, 4, 4, 0]} barSize={20}>
                                                        <LabelList dataKey="value" position="right" fill="#64748b" fontSize={10} fontWeight="bold" />
                                                        {participantStats.topDepts.map((_, index) => (<Cell key={`cell-${index}`} fill={theme.bgDark} />))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="overflow-x-auto rounded-xl border border-slate-200 ring-1 ring-slate-200 bg-white shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                        <th className="p-4 font-semibold border-b border-slate-200">Participante</th>
                                        <th className="p-4 font-semibold border-b border-slate-200 hidden sm:table-cell">Edad</th>
                                        <th className="p-4 font-semibold border-b border-slate-200 hidden sm:table-cell">Genero</th>
                                        <th className="p-4 font-semibold border-b border-slate-200">Organizacion</th>
                                        <th className="p-4 font-semibold border-b border-slate-200 hidden md:table-cell">Programa</th>
                                        <th className="p-4 font-semibold border-b border-slate-200 text-center">Edicion</th>
                                        <th className="p-4 font-semibold border-b border-slate-200 hidden lg:table-cell">Departamento</th>
                                        <th className="p-4 font-semibold border-b border-slate-200 text-center">Estado</th>
                                        {canEditCategory && <th className="p-4 font-semibold border-b border-slate-200 text-center">Accion</th>}
                                    </tr>
                                </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {paginatedParticipants.length > 0 ? (
                                            paginatedParticipants.map((p, idx) => (
                                                <tr
                                                    key={`${p.id}-${idx}`}
                                                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                                                    onClick={() => handleStartEditParticipant(p)}
                                                >
                                                    <td className="p-4">
                                                        <button className="font-medium text-slate-900 hover:text-blue-700 text-left">
                                                            {p.name || '-'}
                                                        </button>
                                                        {category === 'FIS' && (
                                                            <div className="mt-1 flex flex-wrap gap-2">
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                                                    {p.program === 'Community' ? 'Desarrollo Comunitario' : p.program === 'FIS' ? 'Emprendimiento Social' : p.program || 'ONG'}
                                                                </span>
                                                                {p.role && (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                                                                        {p.role}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-slate-500 hidden sm:table-cell">{p.age || '-'}</td>
                                                    <td className="p-4 text-slate-500 hidden sm:table-cell">{p.gender === 'F' ? 'Mujer' : p.gender === 'M' ? 'Hombre' : 'N/A'}</td>
                                                    <td className="p-4 font-medium text-slate-700">{p.organizationName || '-'}</td>
                                                    <td className="p-4 text-slate-500 hidden md:table-cell">
                                                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-semibold">
                                                            {p.program === 'Community' ? 'Desarrollo Comunitario' : p.program === 'FIS' ? 'Emprendimiento Social' : p.program}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-bold tabular-nums">
                                                            {p.projectYear || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-slate-500 hidden lg:table-cell">{p.department || p.projectDepartment || '-'}</td>
                                                    <td className="p-4 text-center">
                                                        {p.status === 'graduated' ? (
                                                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-xs font-bold">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>Graduado
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-1 rounded-md text-xs font-bold">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>En Formacion
                                                            </span>
                                                        )}
                                                    </td>
                                                    {canEditCategory && (
                                                        <td className="p-4 text-center">
                                                            <button
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    handleDeleteParticipant(p.id);
                                                                }}
                                                                className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded transition-all"
                                                                title="Borrar"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={canEditCategory ? 9 : 8} className="p-8 text-center text-slate-400">No se encontraron participantes.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {participantPageCount > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <p className="text-xs text-slate-500">Mostrando {(participantPage - 1) * participantItemsPerPage + 1} a {Math.min(participantPage * participantItemsPerPage, filteredParticipants.length)} de {filteredParticipants.length}</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => setParticipantPage(p => Math.max(1, p - 1))} disabled={participantPage === 1} className="px-3 py-1 border border-slate-200 rounded-md text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">Anterior</button>
                                        <button onClick={() => setParticipantPage(p => Math.min(participantPageCount, p + 1))} disabled={participantPage === participantPageCount} className="px-3 py-1 border border-slate-200 rounded-md text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">Siguiente</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </section>
            )}

            {editParticipantData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Detalle del participante</h2>
                                <p className="text-xs text-slate-500">{editParticipantData.id}</p>
                            </div>
                            <button onClick={handleCancelEditParticipant} className="p-2 hover:bg-slate-200 rounded-full transition-colors" title="Cerrar">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">ID_Participante</label>
                                    <input value={editParticipantData.id} disabled className="w-full p-2 border border-slate-200 rounded bg-slate-50 text-sm text-slate-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">ID_Proyecto_Referencia</label>
                                    <select
                                        value={editParticipantData.projectId}
                                        onChange={e => handleEditParticipantChange('projectId', e.target.value)}
                                        disabled={!canEditCategory}
                                        className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900 disabled:bg-slate-50"
                                    >
                                        {projectsListForEdit.map(proj => (
                                            <option key={proj.id} value={proj.id}>{proj.id}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Categoria</label>
                                    <select
                                        value={editParticipantData.category}
                                        onChange={e => {
                                            const newCat = e.target.value;
                                            const firstProject = data.projectsList.find(proj => proj.category === newCat);
                                            setEditParticipantData(prev => prev ? ({
                                                ...prev,
                                                category: newCat,
                                                projectId: firstProject?.id || prev.projectId
                                            }) : null);
                                        }}
                                        disabled={!canEditCategory}
                                        className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900 disabled:bg-slate-50"
                                    >
                                        <option value="ONG">ONG</option>
                                        <option value="Community">Desarrollo Comunitario</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Organizacion</label>
                                    <select
                                        value={editParticipantData.projectId}
                                        onChange={e => handleEditParticipantChange('projectId', e.target.value)}
                                        disabled={!canEditCategory}
                                        className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900 disabled:bg-slate-50"
                                    >
                                        {projectsListForEdit.map(proj => (
                                            <option key={proj.id} value={proj.id}>{proj.organization}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre_Participante</label>
                                    <input
                                        value={editParticipantData.name}
                                        onChange={e => handleEditParticipantChange('name', e.target.value)}
                                        disabled={!canEditCategory}
                                        className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900 disabled:bg-slate-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Edad</label>
                                    <input
                                        type="number"
                                        value={editParticipantData.age}
                                        onChange={e => handleEditParticipantChange('age', e.target.value)}
                                        disabled={!canEditCategory}
                                        className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900 disabled:bg-slate-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Genero</label>
                                    <select
                                        value={editParticipantData.gender}
                                        onChange={e => handleEditParticipantChange('gender', e.target.value)}
                                        disabled={!canEditCategory}
                                        className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900 disabled:bg-slate-50"
                                    >
                                        <option value="F">Mujer</option>
                                        <option value="M">Hombre</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Telefono</label>
                                    <input
                                        value={editParticipantData.phone}
                                        onChange={e => handleEditParticipantChange('phone', e.target.value)}
                                        disabled={!canEditCategory}
                                        className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900 disabled:bg-slate-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={editParticipantData.email}
                                        onChange={e => handleEditParticipantChange('email', e.target.value)}
                                        disabled={!canEditCategory}
                                        className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900 disabled:bg-slate-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Rol</label>
                                    <input
                                        value={editParticipantData.role}
                                        onChange={e => handleEditParticipantChange('role', e.target.value)}
                                        disabled={!canEditCategory}
                                        className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900 disabled:bg-slate-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Estado_Formacion</label>
                                    <select
                                        value={editParticipantData.status}
                                        onChange={e => handleEditParticipantChange('status', e.target.value)}
                                        disabled={!canEditCategory}
                                        className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900 disabled:bg-slate-50"
                                    >
                                        <option value="enrolled">En Formacion</option>
                                        <option value="in_progress">En curso</option>
                                        <option value="graduated">Graduado</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Departamento</label>
                                    <select
                                        value={editParticipantData.department}
                                        onChange={e => handleEditParticipantChange('department', e.target.value)}
                                        disabled={!canEditCategory}
                                        className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900 disabled:bg-slate-50"
                                    >
                                        {EL_SALVADOR_DEPTS.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Programa</label>
                                    <input
                                        value={(() => {
                                            const proj = data.projectsList.find(pr => pr.id === editParticipantData.projectId);
                                            return proj ? (proj.trainingDetails?.trainingType || (proj.category === 'Community' ? 'Desarrollo Comunitario' : proj.category === 'FIS' ? 'Emprendimiento Social' : proj.category)) : editParticipantData.program || '';
                                        })()}
                                        disabled
                                        className="w-full p-2 border border-slate-200 rounded bg-slate-50 text-sm text-slate-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
                            <button onClick={handleCancelEditParticipant} className="px-4 py-2 text-slate-600 font-semibold text-sm hover:bg-slate-100 rounded-lg transition-colors">
                                Cancelar
                            </button>
                            {canEditCategory && (
                                <button onClick={handleSaveEditParticipant} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors flex items-center gap-2">
                                    <Save className="w-4 h-4" />
                                    Guardar cambios
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- BLOQUE 6: CORTES FORMATIVOS (FORMACION) --- */}
            {activeMainTab === 'formacion' && activeFormativeSubTab === 'cortes' && category === 'Community' && (
                <section aria-label="Bloque 6: Cortes Formativos" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <CommunityCortesModule userData={userData} />
                </section>
            )}

            {/* MODALS */}
            <CategoryEditModal 
                isOpen={isLoadModalOpen} 
                onClose={() => setIsLoadModalOpen(false)} 
                category={category} 
                defaultYear={!isGlobalView ? parseInt(selectedEdition) : currentSystemYear} 
            />

            {isReportUploadModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Carga Masiva de Reportes</h2>
                                <p className="text-xs text-slate-500">Categoría: <span className="font-bold">{category}</span></p>
                            </div>
                            <button onClick={() => setIsReportUploadModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <div className="p-8 flex flex-col items-center justify-center space-y-6">
                            {!isUploadingReports ? (
                                <>
                                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                                        <FileSpreadsheet className="w-8 h-8" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm text-slate-600 mb-4">Suba un archivo Excel de seguimiento mensual. El sistema puede identificar y actualizar uno o varios proyectos de la categoría seleccionada en una sola carga.</p>
                                        <label className="inline-flex flex-col items-center justify-center w-full px-4 py-6 bg-white border-2 border-emerald-300 border-dashed rounded-lg cursor-pointer hover:bg-emerald-50 transition-colors">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <UploadCloud className="w-8 h-8 mb-3 text-emerald-500" />
                                                <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Clic para subir</span> o arrastre el archivo</p>
                                                <p className="text-xs text-gray-500">XLSX, XLS (Plantilla Oficial)</p>
                                            </div>
                                            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleBulkReportUpload} />
                                        </label>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center space-y-4 py-8">
                                    <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
                                    <p className="text-sm font-bold text-slate-700">Procesando reportes...</p>
                                    <p className="text-xs text-slate-500">Validando proyectos y actualizando indicadores.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoryDetail;







