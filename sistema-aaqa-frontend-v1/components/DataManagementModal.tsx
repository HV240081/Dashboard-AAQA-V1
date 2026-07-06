import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Save, FileSpreadsheet, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { useData } from '../contexts/useData';
import { DashboardData } from '../types';
import * as XLSX from 'xlsx';

interface DataManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    userData?: any;
}

const DataManagementModal: React.FC<DataManagementModalProps> = ({ isOpen, onClose, userData }) => {
    const { data, updateData, uploadExcel, resetData } = useData();
    const currentEditionLabel = data.editions.find(edition => edition.isCurrent)?.year
        || (data.editions.length > 0 ? data.editions.map(edition => edition.year).sort((a, b) => b - a)[0] : 2025);
    const [activeTab, setActiveTab] = useState<'manual' | 'excel'>('manual');
    const [formData, setFormData] = useState<DashboardData>(data);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [uploadMessage, setUploadMessage] = useState('');
    const [uploadMessageType, setUploadMessageType] = useState<'success' | 'error'>('success');
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Verificar si el usuario puede editar (Geo: ADMIN_General, Violeta: GERENTE)
    const canEdit = userData?.canEditAll || 
                    userData?.roles?.includes('ADMIN_General') || 
                    userData?.roles?.includes('GERENTE');

    // Si no puede editar, cerrar modal
    if (!canEdit) {
        if (isOpen) onClose();
        return null;
    }

    // Sync form data when modal opens
    useEffect(() => {
        if (isOpen) setFormData(data);
    }, [isOpen, data]);

    if (!isOpen) return null;

    const handleInputChange = (section: keyof DashboardData, field: string, value: string, subSection?: string) => {
        const numValue = parseFloat(value) || 0;

        setFormData(prev => {
            if (section === 'categories' && subSection) {
                return {
                    ...prev,
                    categories: {
                        ...prev.categories,
                        [subSection]: {
                            ...(prev.categories as any)[subSection],
                            [field]: numValue
                        }
                    }
                };
            }
            if (section === 'formative' && subSection) {
                const newByCategory = {
                    ...prev.formative.byCategory,
                    [subSection]: {
                        ...(prev.formative.byCategory as any)[subSection],
                        [field]: numValue
                    }
                };
                const totalEnrolled = newByCategory.ong.enrolled + newByCategory.community.enrolled + newByCategory.fis.enrolled;
                const totalGraduated = newByCategory.ong.graduated + newByCategory.community.graduated + newByCategory.fis.graduated;
                return {
                    ...prev,
                    formative: {
                        ...prev.formative,
                        byCategory: newByCategory,
                        totalEnrolled,
                        totalGraduated,
                        retentionRate: totalEnrolled > 0 ? (totalGraduated / totalEnrolled) * 100 : 0
                    }
                };
            }
            if (section === 'currentEdition2025' || section === 'financials' || section === 'impact' || section === 'formative') {
                return {
                    ...prev,
                    [section]: {
                        ...(prev as any)[section],
                        [field]: numValue
                    }
                };
            }
            return prev;
        });
    };

    const handleManualSave = async () => {
        setIsSaving(true);
        try {
            await updateData(formData);
            onClose();
        } catch (error) {
            console.error('Error saving data:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadSuccess(false);
        setUploadMessage('');

        try {
            const result = await uploadExcel(file);
            setUploadSuccess(true);
            setUploadMessageType('success');
            setUploadMessage(result?.message || '¡Datos actualizados correctamente!');
            if (result?.warnings?.length) {
                setUploadMessage([result.message, ...result.warnings].filter(Boolean).join('\n'));
            }
            setTimeout(() => {
                onClose();
                setUploadSuccess(false);
            }, 1500);
        } catch (error) {
            console.error("Upload failed", error);
            const message =
                (error as any)?.response?.data?.message ||
                (error as any)?.message ||
                'No se pudo procesar el archivo. Revise la plantilla e intente nuevamente.';
            setUploadMessageType('error');
            setUploadMessage(Array.isArray(message) ? message.join('\n') : message);
        } finally {
            setIsUploading(false);
        }
    };

    const downloadTemplate = () => {
        if (!data?.projectsList) {
            alert("No hay datos para generar la plantilla.");
            return;
        }

        const proyectsData = data.projectsList.map(p => ({
            "ID_Proyecto": p.id,
            "Categoría": p.category,
            "Año / Edición": p.year,
            "Nombre del Proyecto": p.name,
            "Organización": p.organization,
            "Departamento": p.department,
            "Municipio": p.municipality || '',
            "Estado": p.status,
            "Inversión FGK (USD)": p.amountFGK,
            "Fondos Aliados (USD)": p.amountAllies,
            "Contrapartida (USD)": (p.counterpart || 0) + ((p.communityCounterpart?.materialsAmount || 0) + (p.communityCounterpart?.laborAmount || 0)),
            "Beneficiarios Directos": p.beneficiaries,
            "Beneficiarios Indirectos": p.indirectBeneficiaries || 0,
            "Progreso Técnico (%)": p.technicalProgressPercentage || 0,
            "Progreso Financiero (%)": p.financialProgressPercentage || 0,
        }));

        const formativoData: any[] = [];
        data.projectsList.forEach(p => {
            if (p.trainingDetails?.participants && p.trainingDetails.participants.length > 0) {
                p.trainingDetails.participants.forEach(part => {
                    formativoData.push({
                        "ID_Proyecto_Referencia": p.id,
                        "Categoría": p.category,
                        "Año / Edición": p.year,
                        "Organización": p.organization,
                        "Programa Formativo": p.trainingDetails?.trainingType || "General",
                        "Nombre Participante": part.name,
                        "Edad": part.age || 'N/A',
                        "Género": part.gender === 'M' ? 'Hombre' : part.gender === 'F' ? 'Mujer' : 'N/A',
                        "Departamento": p.department,
                        "Estado Formación": part.status || 'Graduado'
                    });
                });
            }
        });

        const reportosData: any[] = [];
        data.projectsList.forEach(p => {
            if (p.reports && p.reports.length > 0) {
                p.reports.forEach(r => {
                    reportosData.push({
                        "ID_Proyecto_Referencia": p.id,
                        "Nombre del Proyecto": p.name,
                        "Año / Edición": p.year,
                        "Mes Reporte": r.month,
                        "Año Reporte": r.year,
                        "Avance Técnico Real (%)": r.realTechnical,
                        "Avance Financiero Real (%)": r.realFinancial,
                        "Meta Financiera": r.metaFinancial ?? r.expectedFinancial ?? '',
                        "Estado Cronograma": r.scheduleStatus || 'En Tiempo',
                        "Observaciones": r.observations || ''
                    });
                });
            }
        });

        const activitiesData: any[] = [];
        data.projectsList.forEach(p => {
            if (p.activities && p.activities.length > 0) {
                p.activities.forEach((activity, idx) => {
                    activitiesData.push({
                        "ID_Proyecto_Referencia": p.id,
                        "Nombre del Proyecto": p.name,
                        "Actividad": activity.name || `Actividad ${idx + 1}`,
                        "Mes del Proyecto": activity.month || 1,
                        "Estado": activity.status === 'completed' ? 'Finalizado' : activity.status === 'active' ? 'En ejecución' : 'Pendiente',
                        "Observaciones": (activity.observations || activity.note || '').toString(),
                    });
                });
            }
        });

        const wb = XLSX.utils.book_new();
        const wsProyectos = XLSX.utils.json_to_sheet(proyectsData);
        XLSX.utils.book_append_sheet(wb, wsProyectos, "Proyectos");
        const wsFormativo = XLSX.utils.json_to_sheet(formativoData.length ? formativoData : [{ "Nota": "No hay participantes registrados" }]);
        XLSX.utils.book_append_sheet(wb, wsFormativo, "Formativo");
        const wsActividades = XLSX.utils.json_to_sheet(activitiesData.length ? activitiesData : [{ "Nota": "No hay actividades registradas" }]);
        XLSX.utils.book_append_sheet(wb, wsActividades, "Cronograma de Actividades");
        const wsReportes = XLSX.utils.json_to_sheet(reportosData.length ? reportosData : [{ "Nota": "No hay reportes registrados" }]);
        XLSX.utils.book_append_sheet(wb, wsReportes, "Reportes Mensuales");
        XLSX.writeFile(wb, "Base_Maestra_Sistema_AAQA.xlsx");
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Gestión de Datos - Sistema AAQA</h2>
                        <p className="text-xs text-slate-500">Panel de Administración de Información</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="flex border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('excel')}
                        className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${activeTab === 'excel' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Carga Masiva
                    </button>
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${activeTab === 'manual' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                    >
                        <Save className="w-4 h-4" />
                        Edición Manual
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {activeTab === 'excel' && (
                        <div className="flex flex-col items-center justify-center h-full space-y-8 py-10">
                            <div className="text-center max-w-md">
                                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileSpreadsheet className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Actualización por Archivo</h3>
                                <p className="text-sm text-slate-500">
                                    Suba el archivo Excel oficial para actualizar todos los indicadores del dashboard.
                                </p>
                            </div>

                            <div className="w-full max-w-md space-y-4">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept=".xlsx, .xls"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />

                                {!isUploading && !uploadSuccess && (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full py-4 border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 rounded-xl flex flex-col items-center justify-center transition-all group cursor-pointer"
                                    >
                                        <Upload className="w-8 h-8 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                                        <span className="text-sm font-bold text-blue-700">Click para subir Excel</span>
                                        <span className="text-xs text-blue-400 mt-1">Soporta .xlsx y .xls</span>
                                    </button>
                                )}

                                {isUploading && (
                                    <div className="w-full py-8 flex flex-col items-center justify-center">
                                        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                                        <span className="text-sm font-bold text-slate-600">Procesando archivo...</span>
                                    </div>
                                )}

                                {!!uploadMessage && !isUploading && (
                                    <div
                                        className={`w-full px-4 py-3 rounded-xl border text-sm whitespace-pre-line ${
                                            uploadMessageType === 'success'
                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                                : 'bg-rose-50 border-rose-200 text-rose-700'
                                        }`}
                                    >
                                        {uploadMessage}
                                    </div>
                                )}

                                {uploadSuccess && (
                                    <div className="w-full py-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-2">
                                        <AlertCircle className="w-5 h-5 text-emerald-600" />
                                        <span className="text-sm font-bold text-emerald-700">¡Datos actualizados correctamente!</span>
                                    </div>
                                )}

                                <div className="flex justify-center pt-4">
                                    <button
                                        onClick={downloadTemplate}
                                        className="text-slate-500 text-xs font-medium flex items-center gap-1 hover:text-blue-600 underline"
                                    >
                                        <Download className="w-3 h-3" />
                                        Descargar Plantilla Oficial
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'manual' && (
                        <div className="space-y-8">
                            <section className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                    Datos Financieros Globales (USD)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Aporte FGK Histórico</label>
                                        <input
                                            type="number"
                                            value={formData.financials.fgk}
                                            onChange={(e) => handleInputChange('financials', 'fgk', e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Aporte Aliados</label>
                                        <input
                                            type="number"
                                            value={formData.financials.aliados}
                                            onChange={(e) => handleInputChange('financials', 'aliados', e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Contrapartida (Estimada)</label>
                                        <input
                                            type="number"
                                            value={formData.financials.contrapartida}
                                            onChange={(e) => handleInputChange('financials', 'contrapartida', e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded text-sm font-mono focus:ring-2 focus:ring-slate-500 outline-none bg-white text-slate-900"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                                    Impacto General
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Total Proyectos</label>
                                        <input
                                            type="number"
                                            value={formData.impact.projects}
                                            onChange={(e) => handleInputChange('impact', 'projects', e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Org. Aliadas</label>
                                        <input
                                            type="number"
                                            value={formData.impact.orgs}
                                            onChange={(e) => handleInputChange('impact', 'orgs', e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Beneficiarios</label>
                                        <input
                                            type="number"
                                            value={formData.impact.beneficiaries}
                                            onChange={(e) => handleInputChange('impact', 'beneficiaries', e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                    Impacto Formativo
                                </h3>

                                <div className="grid grid-cols-3 gap-4 mb-2">
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">Programa</div>
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inscritos</div>
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Graduados</div>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4 items-center border-b border-slate-50 pb-2">
                                        <span className="text-xs font-bold text-slate-700 pl-1">Talleres Formativos ONG</span>
                                        <input type="number" value={formData.formative.byCategory.ong.enrolled} onChange={(e) => handleInputChange('formative', 'enrolled', e.target.value, 'ong')} className="w-full p-2 border border-slate-300 rounded text-sm font-mono bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        <input type="number" value={formData.formative.byCategory.ong.graduated} onChange={(e) => handleInputChange('formative', 'graduated', e.target.value, 'ong')} className="w-full p-2 border border-slate-300 rounded text-sm font-mono bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 items-center border-b border-slate-50 pb-2">
                                        <span className="text-xs font-bold text-slate-700 pl-1">Talleres comunitarios</span>
                                        <input type="number" value={formData.formative.byCategory.community.enrolled} onChange={(e) => handleInputChange('formative', 'enrolled', e.target.value, 'community')} className="w-full p-2 border border-slate-300 rounded text-sm font-mono bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        <input type="number" value={formData.formative.byCategory.community.graduated} onChange={(e) => handleInputChange('formative', 'graduated', e.target.value, 'community')} className="w-full p-2 border border-slate-300 rounded text-sm font-mono bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 items-center">
                                        <span className="text-xs font-bold text-slate-700 pl-1">Incubadora FGK</span>
                                        <input type="number" value={formData.formative.byCategory.fis.enrolled} onChange={(e) => handleInputChange('formative', 'enrolled', e.target.value, 'fis')} className="w-full p-2 border border-slate-300 rounded text-sm font-mono bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        <input type="number" value={formData.formative.byCategory.fis.graduated} onChange={(e) => handleInputChange('formative', 'graduated', e.target.value, 'fis')} className="w-full p-2 border border-slate-300 rounded text-sm font-mono bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-4 italic">
                                    *Nota: Las distribuciones de género y departamento se calculan automáticamente de los registros individuales.
                                </p>
                            </section>

                            <section className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                    Categorías Históricas
                                </h3>

                                <div className="grid grid-cols-3 gap-4 mb-2">
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">Categoría</div>
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inversión (USD)</div>
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cant. (Orgs/Proy)</div>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4 items-center border-b border-slate-50 pb-2">
                                        <span className="text-xs font-bold text-slate-700 pl-1">ONG</span>
                                        <input type="number" value={formData.categories.ong.investment} onChange={(e) => handleInputChange('categories', 'investment', e.target.value, 'ong')} className="w-full p-2 border border-slate-300 rounded text-sm font-mono bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                                        <input type="number" value={formData.categories.ong.orgs} onChange={(e) => handleInputChange('categories', 'orgs', e.target.value, 'ong')} className="w-full p-2 border border-slate-300 rounded text-sm font-mono bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 items-center border-b border-slate-50 pb-2">
                                        <span className="text-xs font-bold text-slate-700 pl-1">Desarrollo Comunitario</span>
                                        <input type="number" value={formData.categories.community.investment} onChange={(e) => handleInputChange('categories', 'investment', e.target.value, 'community')} className="w-full p-2 border border-slate-300 rounded text-sm font-mono bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                                        <input type="number" value={formData.categories.community.orgs} onChange={(e) => handleInputChange('categories', 'orgs', e.target.value, 'community')} className="w-full p-2 border border-slate-300 rounded text-sm font-mono bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 items-center">
                                        <span className="text-xs font-bold text-slate-700 pl-1">Emprendimiento</span>
                                        <input type="number" value={formData.categories.fis.investment} onChange={(e) => handleInputChange('categories', 'investment', e.target.value, 'fis')} className="w-full p-2 border border-slate-300 rounded text-sm font-mono bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                                        <input type="number" value={formData.categories.fis.ventures} onChange={(e) => handleInputChange('categories', 'ventures', e.target.value, 'fis')} className="w-full p-2 border border-slate-300 rounded text-sm font-mono bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                </div>
                            </section>

                            <section className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                    Edición Vigente {currentEditionLabel} (Conteos)
                                </h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">ONG</label>
                                        <input
                                            type="number"
                                            value={formData.currentEdition2025.ong}
                                            onChange={(e) => handleInputChange('currentEdition2025', 'ong', e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Emprendimiento</label>
                                        <input
                                            type="number"
                                            value={formData.currentEdition2025.fis}
                                            onChange={(e) => handleInputChange('currentEdition2025', 'fis', e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Comunitario</label>
                                        <input
                                            type="number"
                                            value={formData.currentEdition2025.community}
                                            onChange={(e) => handleInputChange('currentEdition2025', 'community', e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded text-sm bg-white text-slate-900"
                                        />
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center">
                    <button
                        onClick={resetData}
                        className="text-xs text-red-500 font-medium hover:underline"
                    >
                        Resetear a Valores Originales
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 font-semibold text-sm hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        {activeTab === 'manual' && (
                            <button
                                onClick={handleManualSave}
                                disabled={isSaving}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                Guardar Cambios
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataManagementModal;
