import React, { useState, useRef, useEffect } from 'react';
import { Globe2, Settings, Home, LogOut, User, ChevronDown, History, CalendarPlus, Trash2, Check, X, Download, FileText, GraduationCap, FileSpreadsheet, BookOpen, UploadCloud, PencilLine } from 'lucide-react';
import { CategoryType } from '../types';
import EditableText from './EditableText';
import { useData } from '../contexts/useData';
import UsersPermissionsModal from './UsersPermissionsModal';
import { usePermissions } from '../hooks/usePermissions';

interface HeaderProps {
  onNavigateHome: () => void;
  onNavigateCategory: (category: CategoryType) => void;
  currentView: string;
  userNombre: string;
  userApellido: string;
  userRol: string;
  onLogout: () => void;
  onOpenDataModal?: () => void;
  onOpenAuditModal?: () => void;
  onDownloadSummaryExcel?: () => void;
  onDownloadSummaryPdf?: () => void;
  onDownloadFormativeExcel?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  onNavigateHome, 
  onNavigateCategory, 
  currentView,
  userNombre,
  userApellido,
  userRol,
  onLogout,
  onOpenDataModal,
  onOpenAuditModal,
  onDownloadSummaryExcel,
  onDownloadSummaryPdf,
  onDownloadFormativeExcel
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isEditionMenuOpen, setIsEditionMenuOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isUsersPermissionsOpen, setIsUsersPermissionsOpen] = useState(false);
  const [selectedNewYear, setSelectedNewYear] = useState<number | ''>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const editionMenuRef = useRef<HTMLDivElement>(null);
  
  const { data, createEdition, deleteEdition } = useData();
  const permissions = usePermissions();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (editionMenuRef.current && !editionMenuRef.current.contains(event.target as Node)) {
        setIsEditionMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const canManageEditions = userRol === 'ADMIN_General' || userRol === 'GERENTE';
  const canManageUsers = userRol === 'ADMIN_General' || userRol === 'GERENTE';
  const canAccessAllTemplates = userRol === 'ADMIN_General' || userRol === 'GERENTE';
  const canAccessCortesTemplates = userRol === 'FORMACION';
  const canAccessCommunityTemplates = userRol === 'TECNICO_PROYECTOS';
  const canViewONG = permissions.canViewCategory('ONG');
  const canViewCommunity = permissions.canViewCategory('Community');
  const canViewFIS = permissions.canViewCategory('FIS');
  const customTemplateAccess = (permissions.customEditableCategories || []).reduce((set, category) => {
    if (category === 'ONG') set.add('ong');
    if (category === 'DC' || category === 'Community') set.add('community');
    if (category === 'ES' || category === 'FIS') set.add('fis');
    if (category === 'formacion_dc' || category === 'Cortes') set.add('cortes');
    return set;
  }, new Set<string>());
  const templatesBaseUrl = 'http://localhost:3000/uploads/templates';
  const projectTemplateDetails = {
    uploadPlace: 'Se sube desde el botón Cargar / Actualizar Proyectos dentro de la categoría correspondiente.',
    requiredFields: [
      'Nombre_Proyecto',
      'Organización',
      'Año',
      'Departamento',
      'Municipio',
      'Inversión_FGK',
      'Contrapartida_Org',
      'Nombre_Aliado',
      'Fondos_Aliados',
      'Beneficiarios_Directos',
      'Beneficiarios_Indirectos',
    ],
    optionalFields: [
      'Estado',
      'Mes_Inicio',
      'Mes_Final',
      'Contacto 1',
      'Contacto 2',
      'Datos de participantes, si se van a cargar en la misma plantilla',
    ],
    rules: [
      'No escriba ID de proyecto ni ID de participante; el sistema los genera automáticamente.',
      'La edición indicada en Año debe existir en el sistema antes de subir el archivo.',
      'Nombre_Aliado es obligatorio y debe indicar el aliado que aporta los Fondos_Aliados; este dato se mostrará en el apartado de aliados.',
      'Si Mes_Inicio y Mes_Final quedan vacíos, el proyecto se crea, pero no podrá registrar seguimiento hasta definir su período.',
      'Los contactos son representantes del proyecto; si no hay datos, puede dejarlos vacíos.',
    ],
  };
  const trackingTemplateDetails = {
    uploadPlace: 'Se sube desde el botón Subir Reporte Mensual (Excel) en la vista de la categoría.',
    requiredFields: [
      'Nombre del Proyecto',
      'Mes del proyecto',
      'Actividad',
    ],
    optionalFields: [
      'Estado del mes',
      'Meta Financiera',
      'Observación breve',
    ],
    rules: [
      'El nombre del proyecto debe existir en la categoría desde donde se sube el archivo.',
      'El mes debe pertenecer al período real del proyecto, definido por Mes_Inicio y Mes_Final.',
      'El Estado del mes puede ser Pendiente, En Proceso o Finalizado. Si se deja vacío, se conserva el estado existente o queda Pendiente.',
      'La Meta Financiera es el monto ejecutado del mes; el acumulado no puede superar la Inversión FGK del proyecto.',
      'Puede poner el estado, la meta y la observación una sola vez por mes; las filas siguientes pueden traer solo actividades.',
    ],
  };
  const cortesTemplateDetails = {
    uploadPlace: 'Se sube desde el módulo de Cortes Formativos / ADESCOS.',
    requiredFields: [
      'Nombre del Corte',
      'Edición',
      'Nombre de ADESCO',
      'Nombre Completo',
    ],
    optionalFields: [
      'Aliado / Coordinador',
      'Lugar de Formación',
      'Fecha Inicio',
      'Fecha Fin',
      'Estado',
      'Edición ADESCO',
      'Inscritos',
      'Graduados',
      'Hombres',
      'Mujeres',
      'Cargo',
      'Contacto',
      'Distrito',
      'Departamento',
      'Género',
    ],
    rules: [
      'No escriba ID de corte, ADESCO ni participante; el sistema los genera automáticamente.',
      'La edición debe existir en el sistema antes de cargar el archivo.',
      'El sistema reconoce la plantilla por sus encabezados, aunque cambie el nombre de la hoja.',
      'Cada fila representa una persona participante dentro de una ADESCO y un corte.',
    ],
  };
  const templateCatalog = [
    {
      id: 'ong-projects',
      title: 'ONG - Proyectos y participantes',
      area: 'Carga masiva',
      fileName: 'plantilla_ong_proyectos_participantes_contactos.xlsx',
      ...projectTemplateDetails,
      description: 'Sirve para crear o actualizar proyectos ONG y cargar sus participantes. Los ID se generan automáticamente.',
      visibleFor: ['all', 'ong'],
    },
    {
      id: 'ong-tracking',
      title: 'ONG - Seguimiento mensual',
      area: 'Seguimiento',
      fileName: 'plantilla_seguimiento_mensual_ong.xlsx',
      ...trackingTemplateDetails,
      description: 'Sirve para reportar el avance mensual de proyectos ONG: mes, estado del mes, meta financiera, observación y actividades.',
      visibleFor: ['all', 'ong'],
    },
    {
      id: 'community-projects',
      title: 'Desarrollo Comunitario - Proyectos y participantes',
      area: 'Carga masiva',
      fileName: 'plantilla_desarrollo_comunitario_proyectos_participantes_contactos.xlsx',
      ...projectTemplateDetails,
      description: 'Sirve para cargar proyectos y participantes de Desarrollo Comunitario. También la utiliza Irvin para su área.',
      visibleFor: ['all', 'community'],
    },
    {
      id: 'community-tracking',
      title: 'Desarrollo Comunitario - Seguimiento mensual',
      area: 'Seguimiento',
      fileName: 'plantilla_seguimiento_mensual_desarrollo_comunitario.xlsx',
      ...trackingTemplateDetails,
      description: 'Sirve para registrar el seguimiento mensual de proyectos de Desarrollo Comunitario de forma masiva.',
      visibleFor: ['all', 'community'],
    },
    {
      id: 'fis-projects',
      title: 'Emprendimiento Social - Proyectos y participantes',
      area: 'Carga masiva',
      fileName: 'plantilla_emprendimiento_social_proyectos_participantes_contactos.xlsx',
      ...projectTemplateDetails,
      description: 'Sirve para cargar proyectos y participantes de Emprendimiento Social. Los ID se generan automáticamente.',
      visibleFor: ['all', 'fis'],
    },
    {
      id: 'fis-tracking',
      title: 'Emprendimiento Social - Seguimiento mensual',
      area: 'Seguimiento',
      fileName: 'plantilla_seguimiento_mensual_emprendimiento_social.xlsx',
      ...trackingTemplateDetails,
      description: 'Sirve para registrar el seguimiento mensual de proyectos de Emprendimiento Social de forma masiva.',
      visibleFor: ['all', 'fis'],
    },
    {
      id: 'cortes',
      title: 'Cortes Formativos / ADESCOS',
      area: 'Carga masiva',
      fileName: 'plantilla_carga_masiva_cortes_adescos.xlsx',
      ...cortesTemplateDetails,
      description: 'Sirve para cargar cortes formativos, ADESCOS y participantes. Esta plantilla corresponde al área de José Manuel.',
      visibleFor: ['all', 'cortes'],
    },
  ];
  const visibleTemplates = templateCatalog.filter((template) => {
    if (canAccessAllTemplates) return template.visibleFor.includes('all');
    if (permissions.isCustomUser) return template.visibleFor.some((key) => customTemplateAccess.has(key));
    if (canAccessCortesTemplates) return template.visibleFor.includes('cortes');
    if (canAccessCommunityTemplates) return template.visibleFor.includes('community');
    return false;
  });
  const roleTemplateNote = canAccessAllTemplates
    ? 'Tienes acceso a todas las plantillas porque puedes gestionar todas las áreas del sistema.'
    : permissions.isCustomUser
      ? 'Tienes acceso únicamente a las plantillas de las áreas asignadas a tu rol.'
    : canAccessCortesTemplates
      ? 'Tienes acceso únicamente a la plantilla de Cortes Formativos / ADESCOS.'
      : canAccessCommunityTemplates
        ? 'Tienes acceso únicamente a las plantillas de Desarrollo Comunitario.'
        : '';

  // Generar lista de años no utilizados entre el año actual y 2100
  const currentYear = new Date().getFullYear();
  const availableYearsToAdd = Array.from({ length: 2100 - currentYear + 1 }, (_, i) => currentYear + i)
    .filter(year => !data?.availableYears?.includes(year));
  const activeEditionYearsDesc = [...(data?.availableYears || [])].sort((a, b) => b - a);

  const handleAddEdition = async () => {
    if (!selectedNewYear) return;
    setIsProcessing(true);
    try {
        await createEdition(Number(selectedNewYear));
        alert(`Edición ${selectedNewYear} creada exitosamente.`);
        setSelectedNewYear('');
        setIsEditionMenuOpen(false);
    } catch (err: any) {
        alert(err.message || 'Error al crear edición');
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDeleteEdition = async (year: number) => {
    if (window.confirm(`¿Está seguro de eliminar la edición ${year}? Esto eliminará TODOS los proyectos y datos asociados a este año de forma permanente.`)) {
        setIsProcessing(true);
        try {
            await deleteEdition(year);
            alert(`Edición ${year} eliminada exitosamente.`);
        } catch (err: any) {
            alert(err.message || 'Error al eliminar edición');
        } finally {
            setIsProcessing(false);
        }
    }
  };

  const getRolColor = (rol: string) => {
    switch (rol) {
      case 'ADMIN_General':
        return 'bg-purple-100 text-purple-700';
      case 'DIRECTOR':
        return 'bg-red-100 text-red-700';
      case 'GERENTE':
        return 'bg-blue-100 text-blue-700';
      case 'FORMACION':
        return 'bg-green-100 text-green-700';
      case 'TECNICO_PROYECTOS':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getRolShortName = (rol: string) => {
    switch (rol) {
      case 'ADMIN_General':
        return 'ADMIN';
      case 'TECNICO_PROYECTOS':
        return 'TÉCNICO';
      default:
        return rol;
    }
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div onClick={onNavigateHome} className="flex items-center gap-4 hover:opacity-90 transition-opacity group text-left cursor-pointer">
              <div className="p-3 bg-brand-blue/10 rounded-xl border border-brand-blue/20 group-hover:bg-brand-blue/20 transition-all shrink-0">
                <Globe2 className="h-7 w-7 text-brand-blue" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-display font-bold text-slate-800 leading-tight tracking-tight">
                  <EditableText 
                    category="global" 
                    idKey="header_main_title" 
                    defaultText="Impacto Institucional" 
                  />
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium uppercase tracking-wide">
                  <EditableText 
                    category="global" 
                    idKey="header_organization_name" 
                    defaultText="FUNDACIÓN GLORIA KRIETE (AAQA)" 
                  />
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onNavigateHome}
                className="md:hidden p-2 bg-slate-100 rounded-full text-slate-500 hover:text-brand-blue transition-colors"
                title="Inicio"
              >
                <Home className="w-5 h-5" />
              </button>

              {onOpenAuditModal && (
                <button
                  onClick={onOpenAuditModal}
                  className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all group"
                  title="Bitácora de Cambios"
                >
                  <History className="w-4 h-4 text-slate-400 group-hover:text-brand-blue transition-colors" />
                  <span className="text-xs font-semibold text-slate-600 group-hover:text-brand-blue transition-colors">
                    <EditableText 
                      category="global" 
                      idKey="header_btn_audit" 
                      defaultText="Auditoría" 
                    />
                  </span>
                </button>
              )}

              {canManageUsers && (
                <button
                  onClick={() => setIsUsersPermissionsOpen(true)}
                  className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all group"
                  title="Usuarios y permisos"
                >
                  <Settings className="w-4 h-4 text-slate-400 group-hover:text-brand-blue transition-colors" />
                  <span className="text-xs font-semibold text-slate-600 group-hover:text-brand-blue transition-colors">
                    Usuarios y Permisos
                  </span>
                </button>
              )}

              {visibleTemplates.length > 0 && (
                <button
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all group"
                  title="Uso y descarga de plantillas"
                >
                  <FileSpreadsheet className="w-4 h-4 text-slate-400 group-hover:text-brand-blue transition-colors" />
                  <span className="text-xs font-semibold text-slate-600 group-hover:text-brand-blue transition-colors">
                    Plantillas
                  </span>
                </button>
              )}

              {/* Botón Gestión de Ediciones (Solo Geo/Violeta) */}
              {canManageEditions && (
                <div className="relative" ref={editionMenuRef}>
                  <button
                    onClick={() => setIsEditionMenuOpen(!isEditionMenuOpen)}
                    className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all group"
                    title="Gestión de Ediciones"
                  >
                    <CalendarPlus className="w-4 h-4 text-slate-400 group-hover:text-brand-blue transition-colors" />
                    <span className="text-xs font-semibold text-slate-600 group-hover:text-brand-blue transition-colors">
                      Ediciones
                    </span>
                  </button>

                  {isEditionMenuOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 pb-3 border-b border-slate-100">
                        <h4 className="text-sm font-bold text-slate-800">Agregar Nueva Edición</h4>
                        <p className="text-xs text-slate-500 mt-1">Seleccione un año no utilizado.</p>
                        
                        <div className="mt-3 flex gap-2">
                          <select 
                            value={selectedNewYear}
                            onChange={(e) => setSelectedNewYear(e.target.value === '' ? '' : Number(e.target.value))}
                            className="flex-1 p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-blue"
                          >
                            <option value="">-- Seleccionar --</option>
                            {availableYearsToAdd.map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                          <button
                            onClick={handleAddEdition}
                            disabled={!selectedNewYear || isProcessing}
                            className="p-2 bg-brand-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {isProcessing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div className="px-4 pt-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Ediciones Activas</h4>
                        <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                          {activeEditionYearsDesc.map(y => (
                            <div key={y} className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 group">
                              <span className="text-sm font-semibold text-slate-700">{y}</span>
                              <button
                                onClick={() => handleDeleteEdition(y)}
                                disabled={isProcessing}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                                title={`Eliminar edición ${y}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Menú de usuario desplegable */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-full border border-slate-200 shadow-sm hover:bg-slate-100 transition-all"
                >
                  <div className="h-7 w-7 rounded-full bg-brand-blue/20 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-brand-blue" />
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-semibold text-slate-700">
                      {userNombre} {userApellido}
                    </p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getRolColor(userRol)}`}>
                      {getRolShortName(userRol)}
                    </span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 border-b border-slate-100 sm:hidden">
                      <p className="text-sm font-semibold text-slate-700">
                        {userNombre} {userApellido}
                      </p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getRolColor(userRol)} inline-block mt-1`}>
                        {getRolShortName(userRol)}
                      </span>
                    </div>
                    {onDownloadSummaryExcel && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onDownloadSummaryExcel();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>
                          <EditableText 
                            category="global" 
                            idKey="btn_report_excel" 
                            defaultText="Resumen Ejecutivo (Excel)" 
                          />
                        </span>
                      </button>
                    )}
                    {onDownloadSummaryPdf && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onDownloadSummaryPdf();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-blue-700 hover:bg-blue-50 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        <span>
                          <EditableText 
                            category="global" 
                            idKey="btn_report_pdf" 
                            defaultText="Resumen Ejecutivo (PDF)" 
                          />
                        </span>
                      </button>
                    )}
                    {onDownloadFormativeExcel && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onDownloadFormativeExcel();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-purple-700 hover:bg-purple-50 transition-colors"
                      >
                        <GraduationCap className="w-4 h-4" />
                        <span>
                          <EditableText 
                            category="global" 
                            idKey="btn_report_formative" 
                            defaultText="Reporte Formativo (Excel)" 
                          />
                        </span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>
                        <EditableText 
                          category="global" 
                          idKey="header_btn_logout" 
                          defaultText="Cerrar sesión" 
                        />
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Global Navigation Menu */}
        <div className="bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center space-x-2 overflow-x-auto pt-2 scrollbar-hide">
              <button
                onClick={onNavigateHome}
                className={`whitespace-nowrap px-6 py-3 text-sm font-semibold uppercase tracking-wider transition-all border-b-2
                  ${currentView === 'HOME'
                    ? 'text-brand-blue border-brand-blue bg-blue-50/50'
                    : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700'}`}
              >
                <EditableText 
                  category="global" 
                  idKey="nav_inicio" 
                  defaultText="Inicio" 
                />
              </button>
              {canViewONG && (
              <button
                onClick={() => onNavigateCategory('ONG')}
                className={`whitespace-nowrap px-6 py-3 text-sm font-semibold uppercase tracking-wider transition-all border-b-2
                  ${currentView === 'ONG'
                    ? 'text-brand-red border-brand-red bg-red-50/50'
                    : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700'}`}
              >
                <EditableText 
                  category="global" 
                  idKey="nav_ong" 
                  defaultText="Categoría ONG" 
                />
              </button>
              )}
              {canViewCommunity && (
              <button
                onClick={() => onNavigateCategory('Community')}
                className={`whitespace-nowrap px-6 py-3 text-sm font-semibold uppercase tracking-wider transition-all border-b-2
                  ${currentView === 'Community'
                    ? 'text-brand-yellow border-brand-yellow bg-yellow-50/50'
                    : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700'}`}
              >
                <EditableText 
                  category="global" 
                  idKey="nav_dc" 
                  defaultText="Desarrollo Comunitario" 
                />
              </button>
              )}
              {canViewFIS && (
              <button
                onClick={() => onNavigateCategory('FIS')}
                className={`whitespace-nowrap px-6 py-3 text-sm font-semibold uppercase tracking-wider transition-all border-b-2
                  ${currentView === 'FIS'
                    ? 'text-brand-green border-brand-green bg-green-50/50'
                    : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700'}`}
              >
                <EditableText 
                  category="global" 
                  idKey="nav_es" 
                  defaultText="Emprendimiento Social" 
                />
              </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-brand-blue mb-2">
                  <BookOpen className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-widest">Seguimiento y uso de plantillas</span>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900">Plantillas disponibles para tu rol</h2>
                <p className="text-sm text-slate-600 mt-2 max-w-3xl">
                  Aquí puedes descargar los Excel oficiales para carga masiva y seguimiento. Usa estas plantillas como base, conserva los encabezados y luego súbelas desde el apartado correspondiente del sistema.
                </p>
                {roleTemplateNote && (
                  <p className="text-xs font-semibold text-slate-500 mt-2">{roleTemplateNote}</p>
                )}
              </div>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex items-center gap-2 mb-2 text-blue-700">
                    <Download className="w-4 h-4" />
                    <h3 className="font-bold text-sm">1. Descarga</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Selecciona la plantilla que necesitas según el área. Cada archivo ya trae la estructura que el sistema espera leer.
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <div className="flex items-center gap-2 mb-2 text-emerald-700">
                    <PencilLine className="w-4 h-4" />
                    <h3 className="font-bold text-sm">2. Completa</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Llena solo los campos solicitados. No escribas ID manuales: el sistema los crea automáticamente cuando carga los datos.
                  </p>
                </div>
                <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-4">
                  <div className="flex items-center gap-2 mb-2 text-orange-700">
                    <UploadCloud className="w-4 h-4" />
                    <h3 className="font-bold text-sm">3. Sube</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Sube el Excel desde carga masiva. Si solo necesitas corregir un dato puntual, usa el registro o edición manual del módulo.
                  </p>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">Archivos para descargar</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Cada plantilla incluye ejemplos para guiar el llenado. Puedes reemplazar los ejemplos por los datos reales antes de subirla.
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {visibleTemplates.map((template) => (
                    <div key={template.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                            {template.area}
                          </span>
                          <h4 className="text-base font-bold text-slate-900">{template.title}</h4>
                        </div>
                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">{template.description}</p>
                        <p className="text-xs text-slate-400 mt-1 break-all">{template.fileName}</p>
                        <div className="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-3">
                          <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700 mb-1">Dónde se usa</p>
                            <p className="text-xs text-slate-600 leading-relaxed">{template.uploadPlace}</p>
                          </div>
                          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 mb-2">Campos obligatorios</p>
                            <div className="flex flex-wrap gap-1.5">
                              {template.requiredFields.map((field) => (
                                <span key={field} className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 border border-emerald-100">
                                  {field}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-2">Campos opcionales</p>
                            <div className="flex flex-wrap gap-1.5">
                              {template.optionalFields.map((field) => (
                                <span key={field} className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 border border-slate-200">
                                  {field}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/60 p-3">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700 mb-2">Reglas importantes</p>
                          <ul className="space-y-1">
                            {template.rules.map((rule) => (
                              <li key={rule} className="text-xs text-slate-700 leading-relaxed flex gap-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                                <span>{rule}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <a
                        href={`${templatesBaseUrl}/${template.fileName}`}
                        download={template.fileName}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-blue text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm shrink-0"
                      >
                        <Download className="w-4 h-4" />
                        Descargar Excel
                      </a>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Uso recomendado</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600 leading-relaxed">
                  <p>
                    <span className="font-bold text-slate-800">Carga masiva:</span> úsala cuando tengas varios proyectos, participantes, cortes o seguimientos en un mismo archivo. Es la forma más rápida para actualizar mucha información.
                  </p>
                  <p>
                    <span className="font-bold text-slate-800">Registro manual:</span> úsalo cuando necesites crear o ajustar un solo registro. Es más directo para correcciones puntuales y evita volver a preparar un Excel completo.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      <UsersPermissionsModal
        isOpen={isUsersPermissionsOpen}
        onClose={() => setIsUsersPermissionsOpen(false)}
      />
    </>
  );
};

export default Header;
