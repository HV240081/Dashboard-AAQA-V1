import React, { createContext, useState, ReactNode, useEffect } from 'react';
import {
    DashboardData,
    Project,
    OrganizationProfile,
    ProjectExecution,
    SystemEdition,
    MonthlyReport,
    CommunityCorte,
    FisParticipant,
    CategoryType,
} from '../types';

// ==============================================
// API BASE URL
// ==============================================
const API_URL = 'http://localhost:3000';

// ==============================================
// TIPOS PARA EL CONTEXTO
// ==============================================
interface DataContextType {
    data: DashboardData;
    isLoading: boolean;
    error: string | null;
    updateData: (newData: DashboardData) => void;
    deleteProject: (projectId: string) => Promise<void>;
    updateProjectList: (newProjects: Project[]) => Promise<void>;
    updateCommunityCortes: (newCortes: CommunityCorte[]) => Promise<void>;
    deleteCommunityCorte: (corteId: string) => Promise<void>;
    updateFisParticipants: (newParticipants: FisParticipant[]) => Promise<void>;
    deleteFisParticipant: (participantId: string) => Promise<void>;
    uploadCommunityCortesExcel: (file: File) => Promise<void>;
    uploadFisParticipantsExcel: (file: File) => Promise<void>;
    uploadExcel: (file: File, category?: CategoryType, year?: number, options?: { overwriteExisting?: boolean }) => Promise<any>;
    resetData: () => void;
    refreshData: () => Promise<void>;
    updateFinancials: (financials: { fgk: number; aliados: number; contrapartida: number }) => Promise<void>;
    updateFormative: (formative: any) => Promise<void>;
    updateCategories: (categories: any) => Promise<void>;
    updateCurrentEdition: (edition: any) => Promise<void>;
    clearError: () => void;
    selectedYear: string;
    setSelectedYear: (year: string) => void;
    selectedFormativeYear: string;
    setSelectedFormativeYear: (year: string) => void;
    textosEditables: Record<string, string>;
    updateText: (category: string, key: string, value: string) => Promise<void>;
    createEdition: (year: number) => Promise<{ success: boolean }>;
    deleteEdition: (year: number) => Promise<{ success: boolean }>;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

// ==============================================
// ESTADO INICIAL VACÍO
// ==============================================
const INITIAL_DATA: DashboardData = {
    editions: [],
    masterOrganizations: [],
    annualExecutions: [],
    projectsList: [],
    communityCortes: [],
    fisParticipants: [],
    financials: { fgk: 0, aliados: 0, contrapartida: 0 },
    impact: { projects: 0, orgs: 0, beneficiaries: 0 },
    formative: {
        totalEnrolled: 0,
        totalGraduated: 0,
        retentionRate: 0,
        byGender: { M: 0, F: 0 },
        byCategory: {
            ong: { enrolled: 0, graduated: 0 },
            community: { enrolled: 0, graduated: 0 },
            fis: { enrolled: 0, graduated: 0 }
        },
        byDepartment: {}
    },
    categories: {
        ong: { investment: 0, orgs: 0, projects: 0 },
        community: { investment: 0, orgs: 0, projects: 0 },
        fis: { investment: 0, ventures: 0, projects: 0 }
    },
    currentEdition2025: { ong: 0, fis: 0, community: 0 },
    lastUpdated: new Date().toLocaleDateString('es-SV'),
    updatedBy: 'Sistema'
};

// ==============================================
// FUNCIÓN PARA OBTENER HEADERS CON TOKEN
// ==============================================
const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
};

// ==============================================
// PROVIDER
// ==============================================
export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [data, setData] = useState<DashboardData>(INITIAL_DATA);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<string>('Global');
    const [selectedFormativeYear, setSelectedFormativeYear] = useState<string>('Global');
    const [textosEditables, setTextosEditables] = useState<Record<string, string>>({});

    const clearError = () => setError(null);

    // ==============================================
    // FUNCIÓN PRINCIPAL: CARGAR TODOS LOS DATOS
    // ==============================================
    const loadAllData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            console.log(`🔄 Cargando datos desde API para el año: ${selectedYear}`);
            const queryParams = selectedYear !== 'Global' ? `?year=${selectedYear}` : '';
            const cacheSuffix = queryParams ? `${queryParams}&t=${Date.now()}` : `?t=${Date.now()}`;

            // 1. Cargar datos globales (financials + impact)
            // Estos KPI deben permanecer en acumulado histórico, sin depender del filtro anual.
            const globalResponse = await fetch(`${API_URL}/dashboard/global?t=${Date.now()}`, {
                headers: getAuthHeaders(),
                cache: 'no-store',
            });

            if (!globalResponse.ok) {
                throw new Error(`Error cargando datos globales: ${globalResponse.status}`);
            }

            const globalData = await globalResponse.json();
            console.log('✅ Datos globales cargados:', globalData);

            // 2. Cargar datos por categoría
            const categoriesResponse = await fetch(`${API_URL}/dashboard/categories${cacheSuffix}`, {
                headers: getAuthHeaders(),
                cache: 'no-store',
            });

            if (!categoriesResponse.ok) {
                throw new Error(`Error cargando categorías: ${categoriesResponse.status}`);
            }

            const categoriesData = await categoriesResponse.json();

            // 3. Cargar datos de formación (usando su propio año seleccionado)
            const formativeQuery = selectedFormativeYear !== 'Global' ? `?year=${selectedFormativeYear}` : '';
            const formativeCacheSuffix = formativeQuery ? `${formativeQuery}&t=${Date.now()}` : `?t=${Date.now()}`;
            const formativeResponse = await fetch(`${API_URL}/dashboard/formative${formativeCacheSuffix}`, {
                headers: getAuthHeaders(),
                cache: 'no-store',
            });

            if (!formativeResponse.ok) {
                throw new Error(`Error cargando datos formativos: ${formativeResponse.status}`);
            }

            const formativeData = await formativeResponse.json();
            console.log('✅ Datos formativos cargados:', formativeData);

            // 4. Cargar proyectos - Siempre traer TODOS sin filtrar por año
            // El filtrado por año se hace en el frontend al mostrar, no al cargar
            const projectsResponse = await fetch(`${API_URL}/dashboard/projects?t=${Date.now()}`, {
                headers: getAuthHeaders(),
                cache: 'no-store',
            });

            if (!projectsResponse.ok) {
                throw new Error(`Error cargando proyectos: ${projectsResponse.status}`);
            }

            const projectsData = await projectsResponse.json();

            // 5. Cargar ediciones
            let editionsData: SystemEdition[] = [];
            try {
                const editionsResponse = await fetch(`${API_URL}/dashboard/editions`, {
                    headers: getAuthHeaders(),
                });

                if (editionsResponse.ok) {
                    editionsData = await editionsResponse.json();
                } else {
                    console.warn(`⚠️ Ediciones no disponibles: ${editionsResponse.status}`);
                }
            } catch (err) {
                console.warn('⚠️ No se pudieron cargar las ediciones, usando respaldo local.', err);
            }

            // 6. Cargar cortes comunitarios
            let cortesData: CommunityCorte[] = [];
            try {
                const cortesResponse = await fetch(`${API_URL}/dashboard/community/cortes`, {
                    headers: getAuthHeaders(),
                });

                if (cortesResponse.ok) {
                    cortesData = await cortesResponse.json();
                } else {
                    console.warn(`⚠️ Cortes comunitarios no disponibles: ${cortesResponse.status}`);
                }
            } catch (err) {
                console.warn('⚠️ No se pudieron cargar los cortes comunitarios, usando lista vacía.', err);
            }

            // 7. Cargar participantes incubadora
            let fisData: FisParticipant[] = [];
            try {
                const fisResponse = await fetch(`${API_URL}/dashboard/fis/participants`, {
                    headers: getAuthHeaders(),
                });

                if (fisResponse.ok) {
                    fisData = await fisResponse.json();
                } else {
                    console.warn(`⚠️ Participantes incubadora no disponibles: ${fisResponse.status}`);
                }
            } catch (err) {
                console.warn('⚠️ No se pudieron cargar los participantes incubadora, usando lista vacía.', err);
            }

            // 8. Cargar textos asegurando evitar el cache del navegador web
            try {
                const textRes = await fetch(`${API_URL}/dashboard/text-content?t=${Date.now()}`, {
                    headers: getAuthHeaders(),
                    cache: 'no-store'
                });
                if (textRes.ok) setTextosEditables(await textRes.json());
            } catch (err) {
                console.log('Error cargando textos', err);
            }

            // 9. Cargar años disponibles
            let availableYears: number[] = [];
            try {
                const yearsRes = await fetch(`${API_URL}/dashboard/available-years`, {
                    headers: getAuthHeaders(),
                });
                if (yearsRes.ok) availableYears = await yearsRes.json();
            } catch (err) {
                console.log('Error cargando años', err);
            }

            availableYears = Array.from(new Set([...(availableYears || [])]))
                .filter((year: number) => !Number.isNaN(year) && year >= 2009 && year <= 2100)
                .sort((a: number, b: number) => b - a);

            // Calcular currentEdition2025 (proyectos del año 2025)
            const projects2025 = projectsData.filter((p: Project) => p.year === 2025);
            const currentEdition2025 = {
                ong: projects2025.filter((p: Project) => p.category === 'ONG').length,
                fis: projects2025.filter((p: Project) => p.category === 'FIS').length,
                community: projects2025.filter((p: Project) => p.category === 'Community').length,
            };

            // Construir el objeto DashboardData completo
            const dashboardData: DashboardData = {
                editions: editionsData,
                masterOrganizations: [],
                annualExecutions: [],
                projectsList: projectsData,
                communityCortes: cortesData,
                fisParticipants: fisData,
                // Usar datos financieros e impacto del backend (respetan el filtro de año seleccionado)
                financials: globalData.financials || { fgk: 0, aliados: 0, contrapartida: 0 },
                availableYears: availableYears,
                impact: globalData.impact || { projects: 0, orgs: 0, beneficiaries: 0 },
                formative: {
                    totalEnrolled: formativeData.totalEnrolled || 0,
                    totalGraduated: formativeData.totalGraduated || 0,
                    retentionRate: formativeData.retentionRate || 0,
                    byGender: formativeData.byGender || { M: 0, F: 0 },
                    byCategory: formativeData.byCategory || {
                        ong: { enrolled: 0, graduated: 0 },
                        community: { enrolled: 0, graduated: 0 },
                        fis: { enrolled: 0, graduated: 0 },
                    },
                    byDepartment: formativeData.byDepartment || {},
                },
                categories: {
                    ong: {
                        investment: categoriesData.ong?.investment || 0,
                        orgs: categoriesData.ong?.orgs || 0,
                        projects: categoriesData.ong?.projects || 0,
                    },
                    community: {
                        investment: categoriesData.community?.investment || 0,
                        orgs: categoriesData.community?.orgs || 0,
                        projects: categoriesData.community?.projects || 0,
                    },
                    fis: {
                        investment: categoriesData.fis?.investment || 0,
                        ventures: categoriesData.fis?.ventures || 0,
                        projects: categoriesData.fis?.projects || 0,
                    },
                },
                currentEdition2025,
                lastUpdated: new Date().toLocaleString('es-SV'),
                updatedBy: 'API',
            };

            setData(dashboardData);
            console.log('✅ Todos los datos cargados correctamente');

        } catch (err) {
            console.error('❌ Error loading data from API:', err);
            setError(err instanceof Error ? err.message : 'Error desconocido al cargar datos');
        } finally {
            setIsLoading(false);
        }
    };

    // ==============================================
    // REFRESCAR DATOS (recargar todo)
    // ==============================================
    const refreshData = async () => {
        await loadAllData();
    };

    // ==============================================
    // ACTUALIZAR DATOS FINANCIEROS (FinancialPanel)
    // ==============================================
    const updateFinancials = async (financials: { fgk: number; aliados: number; contrapartida: number }) => {
        try {
            console.log('📡 Enviando updateFinancials:', financials);
            const response = await fetch(`${API_URL}/dashboard/financials`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(financials),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Error actualizando datos financieros: ${response.status}`);
            }

            console.log('✅ updateFinancials exitoso:', result);
            await refreshData();
        } catch (err) {
            console.error('Error updating financials:', err);
            const errorMessage = err instanceof Error ? err.message : 'Error al actualizar datos financieros';
            setError(errorMessage);
            alert(`❌ ${errorMessage}`);
            throw err;
        }
    };

    // ==============================================
    // ACTUALIZAR DATOS FORMATIVOS (FormativeImpactPanel)
    // ==============================================
    const updateFormative = async (formative: any) => {
        try {
            const response = await fetch(`${API_URL}/dashboard/formative`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(formative),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Error actualizando datos formativos: ${response.status}`);
            }

            console.log('✅ updateFormative exitoso:', result);
            await refreshData();
        } catch (err) {
            console.error('Error updating formative:', err);
            const errorMessage = err instanceof Error ? err.message : 'Error al actualizar datos formativos';
            setError(errorMessage);
            alert(`❌ ${errorMessage}`);
            throw err;
        }
    };

    // ==============================================
    // ACTUALIZAR CATEGORÍAS (HistoricalActorImpact)
    // ==============================================
    const updateCategories = async (categories: any) => {
        try {
            const response = await fetch(`${API_URL}/dashboard/categories`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(categories),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Error actualizando categorías: ${response.status}`);
            }

            console.log('✅ updateCategories exitoso:', result);
            await refreshData();
        } catch (err) {
            console.error('Error updating categories:', err);
            const errorMessage = err instanceof Error ? err.message : 'Error al actualizar categorías';
            setError(errorMessage);
            alert(`❌ ${errorMessage}`);
            throw err;
        }
    };

    // ==============================================
    // ACTUALIZAR EDICIÓN VIGENTE (ProgramEdition2025)
    // ==============================================
    const updateCurrentEdition = async (edition: any) => {
        try {
            const response = await fetch(`${API_URL}/dashboard/current-edition`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(edition),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Error actualizando edición vigente: ${response.status}`);
            }

            console.log('✅ updateCurrentEdition exitoso:', result);
            await refreshData();
        } catch (err) {
            console.error('Error updating current edition:', err);
            const errorMessage = err instanceof Error ? err.message : 'Error al actualizar edición vigente';
            setError(errorMessage);
            alert(`❌ ${errorMessage}`);
            throw err;
        }
    };

    // ==============================================
    // ACTUALIZAR LISTA DE PROYECTOS (CREAR/ACTUALIZAR)
    // ==============================================
    const updateProjectList = async (newProjects: Project[]) => {
        try {
            // Actualización optimista: reflejar cambios en la UI de inmediato
            setData(prev => ({ ...prev, projectsList: newProjects }));

            // Detectar cuáles proyectos realmente cambiaron para no hacer 30 peticiones
            const modifiedProjects = newProjects.filter(newP => {
                const oldP = data.projectsList.find(p => p.id === newP.id);
                if (!oldP) return true; // Es un proyecto nuevo
                return JSON.stringify(oldP) !== JSON.stringify(newP); // Fue editado
            });

            if (modifiedProjects.length === 0) return; // Nada que guardar

            for (const project of modifiedProjects) {
                const existingProject = data.projectsList.find(p => p.id === project.id);

                const url = existingProject
                    ? `${API_URL}/projects/${project.id}`
                    : `${API_URL}/projects`;

                const method = existingProject ? 'PUT' : 'POST';
                console.log(`📡 ${method} ${url} - Proyecto: ${project.name}`);

                const response = await fetch(url, {
                    method,
                    headers: getAuthHeaders(),
                    body: JSON.stringify(project),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || `Error ${response.status}: No se pudo guardar el proyecto`);
                }
            }

            // Una vez terminadas las guardadas silenciosas, refrescamos en background
            await loadAllData();
        } catch (err) {
            console.error('Error updating project list:', err);
            const errorMessage = err instanceof Error ? err.message : 'Error al actualizar lista de proyectos';
            setError(errorMessage);
            alert(`❌ ${errorMessage}`);
            // Revertir cambos si hay error
            refreshData();
            throw err;
        }
    };

    // ==============================================
    // ELIMINAR PROYECTO
    // ==============================================
    const deleteProject = async (projectId: string) => {
        try {
            const response = await fetch(`${API_URL}/projects/${projectId}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || 'Error al eliminar el proyecto');
            }

            await refreshData();
        } catch (err) {
            console.error('Error deleting project:', err);
            const errorMessage = err instanceof Error ? err.message : 'Error al eliminar el proyecto';
            setError(errorMessage);
            alert(`❌ ${errorMessage}`);
            throw err;
        }
    };

    // ==============================================
    // ACTUALIZAR CORTES COMUNITARIOS
    // ==============================================
    const updateCommunityCortes = async (newCortes: CommunityCorte[]) => {
        try {
            const response = await fetch(`${API_URL}/dashboard/community/cortes`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ cortes: newCortes }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Error actualizando cortes: ${response.status}`);
            }

            console.log('✅ updateCommunityCortes exitoso:', result);
            await refreshData();

        } catch (err) {
            console.error('Error updating community cortes:', err);
            const errorMessage = err instanceof Error ? err.message : 'Error al actualizar cortes comunitarios';
            setError(errorMessage);
            alert(`❌ ${errorMessage}`);
            throw err;
        }
    };

    const deleteCommunityCorte = async (corteId: string) => {
        try {
            const response = await fetch(`${API_URL}/dashboard/community/cortes/${encodeURIComponent(corteId)}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Error eliminando corte: ${response.status}`);
            }

            console.log('✅ deleteCommunityCorte exitoso:', result);
            await refreshData();
        } catch (err) {
            console.error('Error deleting community corte:', err);
            const errorMessage = err instanceof Error ? err.message : 'Error al eliminar corte comunitario';
            setError(errorMessage);
            alert(`❌ ${errorMessage}`);
            throw err;
        }
    };

    // ==============================================
    // ACTUALIZAR PARTICIPANTES INCUBADORA
    // ==============================================
    const updateFisParticipants = async (newParticipants: FisParticipant[]) => {
        try {
            const response = await fetch(`${API_URL}/dashboard/fis/participants`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ participants: newParticipants }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Error actualizando participantes: ${response.status}`);
            }

            console.log('✅ updateFisParticipants exitoso:', result);
            await refreshData();

        } catch (err) {
            console.error('Error updating FIS participants:', err);
            const errorMessage = err instanceof Error ? err.message : 'Error al actualizar participantes incubadora';
            setError(errorMessage);
            alert(`❌ ${errorMessage}`);
            throw err;
        }
    };

    const deleteFisParticipant = async (participantId: string) => {
        try {
            const filteredParticipants = data.fisParticipants.filter(p => p.id !== participantId);
            if (filteredParticipants.length === data.fisParticipants.length) {
                throw new Error('No se encontró el participante para eliminar.');
            }

            await updateFisParticipants(filteredParticipants);
            console.log('✅ deleteFisParticipant exitoso (vía actualización de lista)');
        } catch (err) {
            console.error('Error deleting FIS participant:', err);
            const errorMessage = err instanceof Error ? err.message : 'Error al eliminar participante incubadora';
            setError(errorMessage);
            alert(`❌ ${errorMessage}`);
            throw err;
        }
    };

    const uploadCommunityCortesExcel = async (file: File): Promise<any> => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('access_token');
            console.log('📡 Subiendo archivo Excel de Cortes Formativos...');

            const response = await fetch(`${API_URL}/upload/community/cortes-excel`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Error subiendo archivo de Cortes Formativos: ${response.status}`);
            }

            console.log('✅ uploadCommunityCortesExcel exitoso:', result);
            await refreshData();
            return result;
        } catch (err) {
            console.error('Error uploading community cortes Excel:', err);
            const errorMessage = err instanceof Error ? err.message : 'Error al subir archivo de Cortes Formativos';
            setError(errorMessage);
            alert(`❌ ${errorMessage}`);
            throw err;
        }
    };

    const uploadFisParticipantsExcel = async (file: File): Promise<void> => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('access_token');
            console.log('📡 Subiendo archivo Excel de Emprendimiento Social...');

            const response = await fetch(`${API_URL}/upload/fis/participants-excel`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Error subiendo archivo de Emprendimiento Social: ${response.status}`);
            }

            console.log('✅ uploadFisParticipantsExcel exitoso:', result);
            await refreshData();
        } catch (err) {
            console.error('Error uploading FIS participants Excel:', err);
            const errorMessage = err instanceof Error ? err.message : 'Error al subir archivo de Emprendimiento Social';
            setError(errorMessage);
            alert(`❌ ${errorMessage}`);
            throw err;
        }
    };

    // ==============================================
    // SUBIR ARCHIVO EXCEL
    // ==============================================
    const uploadExcel = async (file: File, category?: CategoryType, year?: number, options?: { overwriteExisting?: boolean }): Promise<any> => {
        const formData = new FormData();
        formData.append('file', file);
        if (category) {
            formData.append('category', category);
        }
        if (year) {
            formData.append('year', String(year));
        }
        if (options?.overwriteExisting) {
            formData.append('overwriteExisting', 'true');
        }

        try {
            const token = localStorage.getItem('access_token');
            console.log('📡 Subiendo archivo Excel...');

            const response = await fetch(`${API_URL}/upload/excel`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Error subiendo archivo: ${response.status}`);
            }

            console.log('✅ Upload Excel exitoso:', result);
            await refreshData();
            return result;

        } catch (err) {
            console.error('Error uploading Excel:', err);
            const errorMessage = err instanceof Error ? err.message : 'Error al subir archivo Excel';
            setError(errorMessage);
            alert(`❌ ${errorMessage}`);
            throw err;
        }
    };

    // ==============================================
    // ACTUALIZAR DATOS MANUALMENTE (para DataManagementModal)
    // ==============================================
    const updateData = async (newData: DashboardData) => {
        try {
            await updateFinancials(newData.financials);
            await updateCategories(newData.categories);
            await updateFormative(newData.formative);
            await updateCurrentEdition(newData.currentEdition2025);
            await refreshData();
        } catch (err) {
            console.error('Error updating data:', err);
            const errorMessage = err instanceof Error ? err.message : 'Error al actualizar datos';
            setError(errorMessage);
            alert(`❌ ${errorMessage}`);
            throw err;
        }
    };

    // ==============================================
    // RESETEAR DATOS (solo para desarrollo)
    // ==============================================
    const resetData = () => {
        refreshData();
    };

    // ==============================================
    // ACTUALIZAR TEXTO CMS
    // ==============================================
    const updateText = async (category: string, key: string, value: string) => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/dashboard/text-content`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ category, key, value }),
            });

            if (!response.ok) {
                throw new Error(`Error actualizando el texto: ${response.status}`);
            }
            
            // Actualización local inmediata para tiempo real
            setTextosEditables(prev => ({ ...prev, [`${category}.${key}`]: value }));
            
        } catch (err) {
            console.error('Error al actualizar texto', err);
        } finally {
            setIsLoading(false);
        }
    };

    // ==============================================
    // EFECTO INICIAL: CARGAR DATOS AL MONTAR
    // ==============================================
    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            loadAllData();
        } else {
            setIsLoading(false);
        }
    }, [selectedYear, selectedFormativeYear]);

    const createEdition = async (year: number) => {
        try {
            const response = await fetch(`${API_URL}/dashboard/editions`, {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ year }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al crear la edición');
            }

            // Recargar datos para ver la nueva edición
            await refreshData();
            return { success: true };
        } catch (err: any) {
            console.error('Error creating edition:', err);
            throw err;
        }
    };

    const deleteEdition = async (year: number) => {
        try {
            const response = await fetch(`${API_URL}/dashboard/editions/${year}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al eliminar la edición');
            }

            // Si el año que se eliminó estaba seleccionado, cambiar a Global
            if (selectedYear === year.toString()) {
                setSelectedYear('Global');
            }

            await refreshData();
            return { success: true };
        } catch (err: any) {
            console.error('Error deleting edition:', err);
            throw err;
        }
    };

    return (
        <DataContext.Provider
            value={{
                data,
                isLoading,
                error,
                clearError,
                updateData,
                updateProjectList,
                deleteProject,
                updateCommunityCortes,
                deleteCommunityCorte,
                updateFisParticipants,
                deleteFisParticipant,
                uploadCommunityCortesExcel,
                uploadFisParticipantsExcel,
                uploadExcel,
                resetData,
                createEdition,
                deleteEdition,
                refreshData,

                updateFinancials,
                updateFormative,
                updateCategories,
                updateCurrentEdition,
                selectedYear,
                setSelectedYear,
                selectedFormativeYear,
                setSelectedFormativeYear,
                textosEditables,
                updateText
            }}
        >
            {children}
        </DataContext.Provider>
    );
};
