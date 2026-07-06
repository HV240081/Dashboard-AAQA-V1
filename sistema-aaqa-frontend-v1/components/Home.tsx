import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import Header from './Header';
import FinancialPanel from './FinancialPanel';
import HistoricalActorImpact from './HistoricalActorImpact';
import FormativeImpactPanel from './FormativeImpactPanel';
import ProgramEdition2025 from './ProgramEdition2025';
import CategoryDetail from './CategoryDetail';
import ProjectProfile from './ProjectProfile';
import AlliesDetail from './AlliesDetail';
import DataManagementModal from './DataManagementModal';
import AuditLogModal from './AuditLogModal';
import { DataProvider } from '../contexts/DataContext';
import { useData } from '../contexts/useData';
import { CategoryType } from '../types';
import { exportService } from '../services/exportService';
import EditableText from './EditableText';
import { usePermissions } from '../hooks/usePermissions';

const slugifyProjectName = (value: string) =>
    (value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

interface UserData {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  roles: string[];
  temporal: boolean;
  editableCategories: string[];
  viewableCategories: string[];
  canEditAll: boolean;
  canOnlyView: boolean;
}

interface HomeProps {
  userData: UserData;
  onLogout: () => void;
}

export const SYSTEM_VERSION = "v1.0.0";
export const SYSTEM_ENV = "Producción";

const AppContent: React.FC<HomeProps> = ({ userData, onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isDataModalOpen, setIsDataModalOpen] = useState(false);
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
    const { 
        data,
        selectedYear, 
        setSelectedYear, 
        selectedFormativeYear, 
        setSelectedFormativeYear 
    } = useData();

    const { isAdminOrManager } = usePermissions();
    const activeEditionYears = Array.from(new Set((data.editions || [])
        .map((edition) => edition.year)
        .filter((year) => typeof year === 'number' && !Number.isNaN(year))))
        .sort((a, b) => b - a);
    const globalEditionYears = activeEditionYears.length > 0
        ? activeEditionYears
        : Array.from({ length: 2100 - 2009 + 1 }, (_, i) => 2009 + i).sort((a, b) => b - a);
    const formativeEditionYears = (activeEditionYears.length > 0
        ? activeEditionYears
        : Array.from({ length: 2100 - 2018 + 1 }, (_, i) => 2018 + i))
        .filter((year) => year >= 2018)
        .sort((a, b) => b - a);
    const currentEditionYear = data.editions.find((edition) => edition.isCurrent)?.year
        || (activeEditionYears.length > 0 ? activeEditionYears[0] : new Date().getFullYear());

    const canAccessDataModal = isAdminOrManager;
    const canAccessAuditModal = isAdminOrManager;

    // Determinar la vista actual para el Header basándose en la ruta
    const getCurrentView = () => {
        const path = location.pathname;
        if (path === '/' || path === '/home') return 'HOME';
        if (path.startsWith('/category/')) {
            const cat = path.split('/')[2];
            return cat.toUpperCase();
        }
        if (path.startsWith('/project/')) return 'PROJECT_PROFILE';
        if (path === '/allies') return 'ALLIES_DETAIL';
        return 'HOME';
    };

    return (
        <div className="min-h-screen bg-corporate-50 text-slate-800 pb-20 font-sans selection:bg-brand-blue selection:text-white">
            <Header
                onNavigateHome={() => navigate('/')}
                onNavigateCategory={(cat) => navigate(`/category/${cat}`)}
                currentView={getCurrentView()}
                userNombre={userData.nombre}
                userApellido={userData.apellido}
                userRol={userData.roles[0]}
                onLogout={onLogout}
                onOpenDataModal={canAccessDataModal ? () => setIsDataModalOpen(true) : undefined}
                onOpenAuditModal={canAccessAuditModal ? () => setIsAuditModalOpen(true) : undefined}
                onDownloadSummaryExcel={() => exportService.downloadSummaryExcel()}
                onDownloadSummaryPdf={() => exportService.downloadSummaryPdf()}
                onDownloadFormativeExcel={() => exportService.downloadFormativeExcel()}
            />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
                <Routes>
                    <Route path="/" element={
                        <div className="space-y-12 animate-in fade-in duration-500">

                            <section aria-label="Visión Institucional Histórica">
                                <div className="mb-6 border-b border-slate-200 pb-4">
                                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                                        <EditableText category="global" idKey="main_title" defaultText="Visión Institucional" />
                                    </h2>
                                    <p className="text-sm text-brand-blue mt-2 font-semibold tracking-wide uppercase opacity-80">
                                        <EditableText category="global" idKey="global_subtitle" defaultText="Consolidado Acumulado (Global)" />
                                    </p>
                                </div>
                                <FinancialPanel onViewAllies={() => navigate('/allies')} userData={userData} />
                            </section>

                            <section aria-label="Impacto por Categoría">
                                {/* Filtro Cronológico debajo de la información Global */}
                                <div className="flex bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8 items-center gap-4 overflow-x-auto shadow-inner">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                        <EditableText category="global" idKey="cycle_label" defaultText="Ciclo de Ejecución:" />
                                    </span>
                                    {['Global', ...globalEditionYears.map(y => y.toString())].map(year => (
                                        <button
                                            key={year}
                                            onClick={() => setSelectedYear(year)}
                                            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                                                selectedYear === year 
                                                ? 'bg-brand-blue text-white shadow-md ring-1 ring-brand-blue ring-offset-2 ring-offset-slate-50' 
                                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:border-brand-blue/30'
                                            }`}
                                        >
                                            {year}
                                        </button>
                                    ))}
                                </div>

                                <div className="mb-6 border-b border-slate-200 pb-2">
                                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                                        <EditableText category="global" idKey="category_title" defaultText="Impacto por Categoría" /> {selectedYear !== 'Global' ? `(${selectedYear})` : ''}
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1">
                                        <EditableText category="global" idKey="category_desc" defaultText="Avance, finanzas y metas por rama estratégica de inversión." />
                                    </p>
                                </div>
                                <HistoricalActorImpact 
                                    onNavigate={(cat) => navigate(`/category/${cat}`)} 
                                    userData={userData} 
                                    selectedYear={selectedYear}
                                />
                            </section>

                            <section aria-label={`Edición Vigente ${currentEditionYear}`}>
                                <ProgramEdition2025 userData={userData} />
                            </section>

                            <section aria-label="Impacto Formativo y Desarrollo">
                                <div className="mb-6 border-b border-slate-200 pb-2">
                                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                                        <EditableText category="global" idKey="formative_title" defaultText="Formación y Desarrollo" />
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1">
                                        <EditableText category="global" idKey="formative_desc" defaultText="Eficiencia educativa y alcance demográfico por programa." />
                                    </p>
                                </div>

                                {/* Filtro específico para Formación (2018-2025) */}
                                <div className="flex bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8 items-center gap-4 overflow-x-auto shadow-inner">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                        <EditableText category="global" idKey="formative_cycle_label" defaultText="Ciclo Formativo:" />
                                    </span>
                                    {['Global', ...formativeEditionYears.map(y => y.toString())].map(year => (
                                        <button
                                            key={year}
                                            onClick={() => setSelectedFormativeYear(year)}
                                            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                                                selectedFormativeYear === year 
                                                ? 'bg-brand-blue text-white shadow-md ring-1 ring-brand-blue ring-offset-2 ring-offset-slate-50' 
                                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:border-brand-blue/30'
                                            }`}
                                        >
                                            {year}
                                        </button>
                                    ))}
                                </div>
                                <FormativeImpactPanel userData={userData} />
                            </section>
                        </div>
                    } />

                    <Route path="/category/:categoryId" element={<CategoryRouteWrapper navigate={navigate} userData={userData} />} />
                    <Route path="/project/:projectSlug" element={<ProjectRouteWrapper navigate={navigate} userData={userData} />} />
                    <Route path="/allies" element={<AlliesDetail onBack={() => navigate(-1)} />} />
                </Routes>
            </main>

            <footer className="max-w-7xl mx-auto px-4 py-8 text-center border-t border-slate-200 mt-12 bg-white rounded-t-3xl shadow-sm">
                <div className="flex flex-col items-center justify-center space-y-2">
                    <p className="text-slate-600 text-xs font-bold tracking-widest uppercase">
                        <EditableText category="global" idKey="footer_system_name" defaultText="Sistema AAQA – Gestión e Impacto" />
                    </p>
                    <p className="text-slate-400 text-[10px] font-semibold tracking-widest uppercase">
                        Fundación Gloria Kriete &bull; &copy; {new Date().getFullYear()}
                    </p>
                </div>
            </footer>

            <DataManagementModal 
                isOpen={isDataModalOpen} 
                onClose={() => setIsDataModalOpen(false)} 
                userData={userData} 
            />

            <AuditLogModal 
                isOpen={isAuditModalOpen} 
                onClose={() => setIsAuditModalOpen(false)} 
                userData={userData} 
            />
        </div>
    );
};

// Wrappers para manejar los parámetros de la URL y pasarlos a los componentes existentes
const CategoryRouteWrapper: React.FC<{navigate: any, userData: any}> = ({ navigate, userData }) => {
    const { categoryId } = useParams<{categoryId: string}>();
    const { canViewCategory } = usePermissions();

    if (!categoryId || !canViewCategory(categoryId)) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-16 text-center">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Acceso no disponible</h2>
                <p className="text-slate-500 mb-6">Tu rol no tiene asignada esta categoría.</p>
                <button
                    onClick={() => navigate('/')}
                    className="px-5 py-2 rounded-lg bg-brand-blue text-white font-bold hover:bg-blue-700"
                >
                    Volver al inicio
                </button>
            </div>
        );
    }

    return (
        <CategoryDetail
            category={categoryId as CategoryType}
            onBack={() => navigate('/')}
            onSelectProject={(slug) => navigate(`/project/${slug}`)}
            onViewAllies={() => navigate('/allies')}
            userData={userData}
        />
    );
};

const ProjectRouteWrapper: React.FC<{navigate: any, userData: any}> = ({ navigate, userData }) => {
    const { projectSlug } = useParams<{projectSlug: string}>();
    const { data } = useData();
    const resolvedProject = (data?.projectsList || []).find(p => slugifyProjectName(p.name) === projectSlug) || (data?.projectsList || []).find(p => p.id === projectSlug);

    if (!resolvedProject) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
                Proyecto no encontrado.
            </div>
        );
    }
    return (
        <ProjectProfile
            projectId={resolvedProject.id}
            onBack={() => navigate(-1)}
            userData={userData}
        />
    );
};

const Home: React.FC<HomeProps> = ({ userData, onLogout }) => {
    return (
        <DataProvider>
            <AppContent userData={userData} onLogout={onLogout} />
        </DataProvider>
    );
};

export default Home;
