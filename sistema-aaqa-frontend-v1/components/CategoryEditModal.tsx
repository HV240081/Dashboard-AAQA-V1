import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Save, Plus, FileSpreadsheet, Upload, RefreshCw, CheckCircle } from 'lucide-react';
import { useData } from '../contexts/useData';
import { useNavigate } from 'react-router-dom';
import { Project, CategoryType } from '../types';

interface ManualParticipantDraft {
    name: string;
    age: number;
    gender: 'M' | 'F';
    phone: string;
    email: string;
    role: string;
    status: 'enrolled' | 'graduated' | 'dropped' | 'in_progress';
    department: string;
}

interface ProjectContactDraft {
    name: string;
    role: string;
    directPhone: string;
    organizationPhone: string;
    email: string;
}

const MONTH_OPTIONS = [
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

const computeDurationMonths = (startMonth?: number | null, endMonth?: number | null) => {
    if (!startMonth || !endMonth) return 0;
    return endMonth >= startMonth
        ? endMonth - startMonth + 1
        : (12 - startMonth + 1) + endMonth;
};

const cleanNumericInput = (value: string) => value.replace(/^0+(?=\d)/, '');

interface CategoryEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    category?: CategoryType;
    defaultYear?: number;
}

const CategoryEditModal: React.FC<CategoryEditModalProps> = ({ isOpen, onClose, category = 'ONG', defaultYear = 2025 }) => {
    const { data, updateProjectList, uploadExcel } = useData();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'manual' | 'excel'>('manual');
    
    // Excel State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [uploadMessage, setUploadMessage] = useState('');
    const [uploadMessageType, setUploadMessageType] = useState<'success' | 'error'>('success');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [participantsDraft, setParticipantsDraft] = useState<ManualParticipantDraft[]>([]);

    const initialParticipantDraft: ManualParticipantDraft = {
        name: '',
        age: 0,
        gender: 'F',
        phone: '',
        email: '',
        role: '',
        status: 'enrolled',
        department: 'San Salvador'
    };
    const [participantForm, setParticipantForm] = useState<ManualParticipantDraft>(initialParticipantDraft);

    // Manual Form State
    const initialProjectState: Project = {
        id: '',
        organizationId: '',
        category: category as CategoryType,
        name: '',
        organization: '',
        department: 'San Salvador',
        municipality: '',
        timelineStartMonth: null,
        timelineEndMonth: null,
        amountFGK: 0,
        counterpart: 0,
        amountAllies: 0,
        allyName: '',
        allies: [],
        beneficiaries: 0,
        status: null,
        year: defaultYear,
        progress: Array(12).fill('pending'),
        trainingDetails: {
            hasTraining: false,
            year: defaultYear,
            participants: [],
            totalEnrolled: 0,
            totalGraduated: 0
        },
        technicalProgressPercentage: 0,
        financialProgressPercentage: 0,
        photos: [],
        reports: [],
        goalHistory: [],
        contact1Name: '',
        contact1Role: '',
        contact1DirectPhone: '',
        contact1OrganizationPhone: '',
        contact1Email: '',
        contact2Name: '',
        contact2Role: '',
        contact2DirectPhone: '',
        contact2OrganizationPhone: '',
        contact2Email: ''
    };

    const [newProject, setNewProject] = useState<Project>(initialProjectState);

    const closeAndGoToCategory = () => {
        onClose();
        navigate(`/category/${category}`);
    };

    const formatUploadIssues = (result: any) => {
        const messages: string[] = [];
        const projectErrors = result?.results?.proyectos?.errors || result?.results?.reportes?.errors || result?.errors || [];
        const warnings = result?.warnings || [];

        const normalizeItem = (item: any) => {
            if (!item) return null;
            if (typeof item === 'string') return item;
            if (item.error) {
                const projectLabel =
                    item?.row?.projectName ||
                    item?.row?.Nombre_Proyecto ||
                    item?.row?.['Nombre del Proyecto'] ||
                    item?.row?.project ||
                    item?.row?.nombre_proyecto ||
                    item?.row?.nombre ||
                    item?.row?.projectName ||
                    item?.project ||
                    item?.projectName ||
                    item?.project_name ||
                    '';
                return projectLabel ? `${projectLabel}: ${item.error}` : item.error;
            }
            return item.message || item.warning || null;
        };

        projectErrors.forEach((item: any) => {
            const message = normalizeItem(item);
            if (message) messages.push(message);
        });
        warnings.forEach((item: any) => {
            const message = normalizeItem(item);
            if (message) messages.push(message);
        });

        return messages.filter(Boolean);
    };

    const availableYears = useMemo(() => {
        const startYear = category === 'ONG' ? 2009 : 2018;
        const endYear = 2100;
        const loadedYears = (data.editions?.length ? data.editions.map(edition => edition.year) : data.availableYears || [])
            .filter((year): year is number => typeof year === 'number' && year >= startYear && year <= endYear);

        const uniqueYears = Array.from(new Set(loadedYears))
            .filter((year): year is number => typeof year === 'number' && !Number.isNaN(year))
            .sort((a, b) => b - a);

        return uniqueYears.length > 0 ? uniqueYears : [defaultYear];
    }, [category, data.editions, data.availableYears, defaultYear]);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            const fallbackYear = availableYears.includes(defaultYear) ? defaultYear : (availableYears[0] || defaultYear);
            setNewProject(prev => ({
                ...prev,
                category: category as CategoryType, // Ensure category matches current view
                year: fallbackYear,
                timelineStartMonth: null,
                timelineEndMonth: null,
                status: null,
                trainingDetails: { ...prev.trainingDetails, year: fallbackYear }
            }));
            setParticipantForm(initialParticipantDraft);
            setParticipantsDraft([]);
            setActiveTab('manual');
            setUploadSuccess(false);
        }
    }, [isOpen, category, defaultYear, availableYears]);

    if (!isOpen) return null;

    // --- HANDLERS ---

    const handleManualChange = (field: keyof Project, value: any) => {
        setNewProject(prev => ({ ...prev, [field]: value }));
    };

    const handleParticipantChange = (field: keyof ManualParticipantDraft, value: any) => {
        setParticipantForm(prev => ({ ...prev, [field]: value }));
    };

    const handleAddParticipant = () => {
        if (!participantForm.name.trim()) {
            alert('Ingrese el nombre del participante.');
            return;
        }

        setParticipantsDraft(prev => [
            ...prev,
            {
                ...participantForm,
                age: Number(participantForm.age) || 0,
                department: participantForm.department || newProject.department || 'San Salvador',
            }
        ]);
        setParticipantForm({
            ...initialParticipantDraft,
            department: newProject.department || 'San Salvador'
        });
    };

    const handleRemoveParticipant = (index: number) => {
        setParticipantsDraft(prev => prev.filter((_, i) => i !== index));
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const autoParticipants = [...participantsDraft];
        if (participantForm.name.trim()) {
            autoParticipants.push({
                ...participantForm,
                age: Number(participantForm.age) || 0,
                department: participantForm.department || newProject.department || 'San Salvador',
            });
        }

        const startMonth = newProject.timelineStartMonth ? Number(newProject.timelineStartMonth) : null;
        const endMonth = newProject.timelineEndMonth ? Number(newProject.timelineEndMonth) : null;
        const durationMonths = computeDurationMonths(startMonth, endMonth);
        if (!(newProject.allyName || '').trim()) {
            alert('Ingrese el Nombre del Aliado para crear el proyecto.');
            return;
        }

        const projectToAdd = {
            ...newProject,
            id: '',
            organizationId: '',
            timelineStartMonth: startMonth,
            timelineEndMonth: endMonth,
            timelineDurationMonths: durationMonths,
            contact1Name: newProject.contact1Name || '',
            contact1Role: newProject.contact1Role || '',
            contact1DirectPhone: newProject.contact1DirectPhone || '',
            contact1OrganizationPhone: newProject.contact1OrganizationPhone || '',
            contact1Email: newProject.contact1Email || '',
            contact2Name: newProject.contact2Name || '',
            contact2Role: newProject.contact2Role || '',
            contact2DirectPhone: newProject.contact2DirectPhone || '',
            contact2OrganizationPhone: newProject.contact2OrganizationPhone || '',
            contact2Email: newProject.contact2Email || '',
            allyName: (newProject.allyName || '').trim(),
            trainingDetails: {
                hasTraining: autoParticipants.length > 0,
                year: newProject.year,
                trainingType: newProject.category === 'Community'
                    ? 'Talleres comunitarios'
                    : newProject.category === 'FIS'
                        ? 'Incubadora FGK'
                        : 'Talleres Formativos ONG',
                trainedOrganization: newProject.organization,
                totalEnrolled: autoParticipants.length,
                totalGraduated: autoParticipants.filter(p => p.status === 'graduated').length,
                participants: autoParticipants.map((participant) => ({
                    name: participant.name,
                    age: participant.age,
                    gender: participant.gender,
                    phone: participant.phone,
                    email: participant.email,
                    role: participant.role,
                    status: participant.status,
                    department: participant.department || newProject.department || 'San Salvador'
                }))
            }
        };
        await updateProjectList([...data.projectsList, projectToAdd]);
        setNewProject(initialProjectState);
        setParticipantsDraft([]);
        setParticipantForm(initialParticipantDraft);
        closeAndGoToCategory();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadSuccess(false);
        setUploadMessage('');
        
        try {
            const result = await uploadExcel(file, category as CategoryType, defaultYear);
            const issues = formatUploadIssues(result);
            if (issues.length > 0) {
                const message = issues.join('\n');
                setUploadMessageType('error');
                setUploadMessage(message);
                setUploadSuccess(false);
                alert(`❌ ${message}`);
            } else {
                setUploadSuccess(true);
                setUploadMessageType('success');
                setUploadMessage(result?.message || '¡Carga exitosa!');
                setTimeout(() => {
                    closeAndGoToCategory();
                }, 1500);
            }
        } catch (error) {
            console.error("Upload failed", error);
            const message =
                (error as any)?.response?.data?.message ||
                (error as any)?.message ||
                'No se pudo procesar el archivo. Revise la plantilla e intente nuevamente.';
            setUploadMessageType('error');
            setUploadMessage(Array.isArray(message) ? message.join('\n') : message);
            alert(`❌ ${Array.isArray(message) ? message.join('\n') : message}`);
        } finally {
            setIsUploading(false);
        }
    };

    // Derived Data for Suggestions
    const existingYears = availableYears;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Cargar / Actualizar Proyectos</h2>
                        <p className="text-xs text-slate-500">Gestión de datos para la categoría <span className="font-bold">{category}</span></p>
                    </div>
                    <button onClick={closeAndGoToCategory} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                    <button 
                        onClick={() => setActiveTab('manual')}
                        className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${activeTab === 'manual' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                    >
                        <Plus className="w-4 h-4" />
                        Registro Manual
                    </button>
                    <button 
                        onClick={() => setActiveTab('excel')}
                        className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${activeTab === 'excel' ? 'bg-white text-emerald-600 border-b-2 border-emerald-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Carga Masiva (Excel)
                    </button>
                </div>
                
                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">

                    {/* --- TAB: MANUAL --- */}
                    {activeTab === 'manual' && (
                        <form onSubmit={handleManualSubmit} className="space-y-5">
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex gap-3">
                                <div className="text-blue-600 shrink-0 mt-0.5"><Plus className="w-5 h-5" /></div>
                                <p className="text-xs text-blue-800 leading-relaxed">
                                    Utilice este formulario para registrar un nuevo proyecto individualmente. 
                                    Si ingresa un año nuevo (ej. 2026), el sistema creará automáticamente la edición en el filtro.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Nombre del Proyecto</label>
                                    <input 
                                        type="text" 
                                        required
                                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                        value={newProject.name}
                                        onChange={e => handleManualChange('name', e.target.value)}
                                        placeholder="Ej: Programa de Becas..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Organización Ejecutora</label>
                                    <input 
                                        type="text" 
                                        required
                                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                        value={newProject.organization}
                                        onChange={e => handleManualChange('organization', e.target.value)}
                                        placeholder="Ej: FUSALMO..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Categoría</label>
                                    <input 
                                        type="text" 
                                        readOnly
                                        className="w-full p-2 border border-slate-200 rounded text-sm bg-slate-100 text-slate-600"
                                        value={newProject.category}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">Edición (Año)</label>
                                    <select
                                        required
                                        className="w-full p-2 border border-blue-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-900 bg-white"
                                        value={newProject.year}
                                        onChange={e => handleManualChange('year', parseInt(e.target.value, 10))}
                                    >
                                        {existingYears.map(y => <option key={y} value={y}>{y}</option>)}
                                        {!existingYears.includes(defaultYear) && <option value={defaultYear}>{defaultYear}</option>}
                                    </select>
                                    <p className="text-[10px] text-slate-400 mt-1">Seleccione una edición disponible.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Departamento</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                        value={newProject.department}
                                        onChange={e => handleManualChange('department', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Mes de Inicio</label>
                                    <select
                                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                        value={newProject.timelineStartMonth ?? ''}
                                        onChange={e => handleManualChange('timelineStartMonth' as keyof Project, e.target.value ? parseInt(e.target.value, 10) : null)}
                                    >
                                        <option value="">Sin definir</option>
                                        {MONTH_OPTIONS.map(month => (
                                            <option key={month.value} value={month.value}>{month.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Mes Final</label>
                                    <select
                                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                        value={newProject.timelineEndMonth ?? ''}
                                        onChange={e => handleManualChange('timelineEndMonth' as keyof Project, e.target.value ? parseInt(e.target.value, 10) : null)}
                                    >
                                        <option value="">Sin definir</option>
                                        {MONTH_OPTIONS.map(month => (
                                            <option key={month.value} value={month.value}>{month.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400 -mt-2">
                                Duración calculada automáticamente: {computeDurationMonths(newProject.timelineStartMonth, newProject.timelineEndMonth)} mes(es)
                            </p>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Estado del Proyecto</label>
                                <select
                                    className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                    value={newProject.status || ''}
                                    onChange={e => handleManualChange('status' as keyof Project, e.target.value || null)}
                                >
                                    <option value="">Sin definir</option>
                                    <option value="Activo">Activo</option>
                                    <option value="En Ejecución">En Ejecución</option>
                                    <option value="En Cierre">En Cierre</option>
                                    <option value="Suspendido">Suspendido</option>
                                    <option value="Finalizado">Finalizado</option>
                                </select>
                                <p className="text-[10px] text-slate-400 mt-1">Opcional. Puede dejarse vacío.</p>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Representante / Contacto 1</h3>
                                    <p className="text-[10px] text-slate-500">Opcional. Puede dejarlo vacío si el proyecto no tiene contacto registrado.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-slate-300 rounded text-sm"
                                            value={newProject.contact1Name || ''}
                                            onChange={e => handleManualChange('contact1Name' as keyof Project, e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Cargo</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-slate-300 rounded text-sm"
                                            value={newProject.contact1Role || ''}
                                            onChange={e => handleManualChange('contact1Role' as keyof Project, e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Teléfono directo</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-slate-300 rounded text-sm"
                                            value={newProject.contact1DirectPhone || ''}
                                            onChange={e => handleManualChange('contact1DirectPhone' as keyof Project, e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Teléfono de la organización</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-slate-300 rounded text-sm"
                                            value={newProject.contact1OrganizationPhone || ''}
                                            onChange={e => handleManualChange('contact1OrganizationPhone' as keyof Project, e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Correo electrónico</label>
                                        <input
                                            type="email"
                                            className="w-full p-2 border border-slate-300 rounded text-sm"
                                            value={newProject.contact1Email || ''}
                                            onChange={e => handleManualChange('contact1Email' as keyof Project, e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Representante / Contacto 2</h3>
                                    <p className="text-[10px] text-slate-500">Opcional. Puede dejarlo vacío si no aplica.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-slate-300 rounded text-sm"
                                            value={newProject.contact2Name || ''}
                                            onChange={e => handleManualChange('contact2Name' as keyof Project, e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Cargo</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-slate-300 rounded text-sm"
                                            value={newProject.contact2Role || ''}
                                            onChange={e => handleManualChange('contact2Role' as keyof Project, e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Teléfono directo</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-slate-300 rounded text-sm"
                                            value={newProject.contact2DirectPhone || ''}
                                            onChange={e => handleManualChange('contact2DirectPhone' as keyof Project, e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Teléfono de la organización</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-slate-300 rounded text-sm"
                                            value={newProject.contact2OrganizationPhone || ''}
                                            onChange={e => handleManualChange('contact2OrganizationPhone' as keyof Project, e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Correo electrónico</label>
                                        <input
                                            type="email"
                                            className="w-full p-2 border border-slate-300 rounded text-sm"
                                            value={newProject.contact2Email || ''}
                                            onChange={e => handleManualChange('contact2Email' as keyof Project, e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Municipio</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                        value={newProject.municipality || ''}
                                        onChange={e => handleManualChange('municipality', e.target.value)}
                                        placeholder="Ej: San Salvador"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Beneficiarios Indirectos</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                        value={(newProject as any).indirectBeneficiaries || 0}
                                        onChange={e => handleManualChange('indirectBeneficiaries' as keyof Project, parseInt(cleanNumericInput(e.target.value) || '0', 10) || 0)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 border-t border-slate-200 pt-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Inversión FGK</label>
                                    <input 
                                        type="text"
                                        inputMode="numeric"
                                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                        value={newProject.amountFGK}
                                        onChange={e => handleManualChange('amountFGK', parseFloat(cleanNumericInput(e.target.value) || '0') || 0)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Contrapartida</label>
                                    <input 
                                        type="text"
                                        inputMode="numeric"
                                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                        value={newProject.counterpart}
                                        onChange={e => handleManualChange('counterpart', parseFloat(cleanNumericInput(e.target.value) || '0') || 0)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Fondos Aliados</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                        value={newProject.amountAllies}
                                        onChange={e => handleManualChange('amountAllies', parseFloat(cleanNumericInput(e.target.value) || '0') || 0)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Nombre del Aliado *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                        value={newProject.allyName || ''}
                                        onChange={e => handleManualChange('allyName' as keyof Project, e.target.value)}
                                        placeholder="Ej: Fundación Aliada"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Beneficiarios</label>
                                    <input 
                                        type="text"
                                        inputMode="numeric"
                                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                        value={newProject.beneficiaries}
                                        onChange={e => handleManualChange('beneficiaries', parseInt(cleanNumericInput(e.target.value) || '0', 10) || 0)}
                                    />
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">Participantes del proyecto</h3>
                                        <p className="text-[10px] text-slate-500">Agregue uno por uno. Se guardarán junto con el proyecto.</p>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                        {participantsDraft.length} registrados
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">¿Cuál es el nombre completo?</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: María Fernanda López"
                                            className="w-full p-2 border border-slate-300 rounded text-sm"
                                            value={participantForm.name}
                                            onChange={e => handleParticipantChange('name', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">¿Qué edad tiene?</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="Ej: 27"
                                            className="w-full p-2 border border-slate-300 rounded text-sm"
                                            value={participantForm.age}
                                            onChange={e => handleParticipantChange('age', parseInt(cleanNumericInput(e.target.value) || '0', 10) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">¿Cuál es su género?</label>
                                        <select
                                            className="w-full p-2 border border-slate-300 rounded text-sm bg-white"
                                            value={participantForm.gender}
                                            onChange={e => handleParticipantChange('gender', e.target.value as 'M' | 'F')}
                                        >
                                            <option value="F">Femenino</option>
                                            <option value="M">Masculino</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">¿En qué departamento participa?</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: San Salvador"
                                            className="w-full p-2 border border-slate-300 rounded text-sm"
                                            value={participantForm.department}
                                            onChange={e => handleParticipantChange('department', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">¿Cuál es su teléfono?</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: 7123-4567"
                                            className="w-full p-2 border border-slate-300 rounded text-sm"
                                            value={participantForm.phone}
                                            onChange={e => handleParticipantChange('phone', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">¿Cuál es su correo?</label>
                                        <input
                                            type="email"
                                            placeholder="Ej: nombre@correo.com"
                                            className="w-full p-2 border border-slate-300 rounded text-sm"
                                            value={participantForm.email}
                                            onChange={e => handleParticipantChange('email', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">¿Cuál es su rol o cargo?</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: Coordinadora"
                                            className="w-full p-2 border border-slate-300 rounded text-sm"
                                            value={participantForm.role}
                                            onChange={e => handleParticipantChange('role', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">¿Cuál es su estado?</label>
                                        <select
                                            className="w-full p-2 border border-slate-300 rounded text-sm bg-white"
                                            value={participantForm.status}
                                            onChange={e => handleParticipantChange('status', e.target.value as ManualParticipantDraft['status'])}
                                        >
                                            <option value="enrolled">Inscrito</option>
                                            <option value="in_progress">En formación</option>
                                            <option value="graduated">Graduado</option>
                                            <option value="dropped">Retiro</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleAddParticipant}
                                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800"
                                    >
                                        Agregar participante
                                    </button>
                                </div>

                                {participantsDraft.length > 0 && (
                                    <div className="space-y-2">
                                        {participantsDraft.map((participant, index) => (
                                            <div key={`${participant.name}-${index}`} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">{participant.name}</p>
                                                    <p className="text-[10px] text-slate-500">
                                                        {participant.age} años | {participant.gender === 'F' ? 'F' : 'M'} | {participant.role || 'Sin rol'}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveParticipant(index)}
                                                    className="text-xs font-bold text-red-600 hover:text-red-700"
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                                <button 
                                    type="button"
                                    onClick={closeAndGoToCategory}
                                    className="px-4 py-2 text-slate-600 font-semibold text-sm hover:bg-slate-100 rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg flex items-center gap-2 shadow-sm"
                                >
                                    <Save className="w-4 h-4" />
                                    Guardar Proyecto
                                </button>
                            </div>
                        </form>
                    )}

                    {/* --- TAB: EXCEL --- */}
                    {activeTab === 'excel' && (
                        <div className="flex flex-col items-center justify-center h-full py-6 space-y-6">
                            <div className="text-center max-w-sm">
                                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <FileSpreadsheet className="w-7 h-7" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-1">Carga Masiva de Datos</h3>
                                <p className="text-xs text-slate-500">
                                    Suba un archivo Excel (.xlsx) para actualizar o crear registros. 
                                    El sistema detectará automáticamente las ediciones (años) incluidas en el archivo.
                                </p>
                                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                                    Los campos <span className="font-semibold">Estado</span>, <span className="font-semibold">Mes_Inicio</span>, <span className="font-semibold">Mes_Final</span> y los dos bloques de contacto son opcionales.
                                </p>
                            </div>

                            <div className="w-full max-w-sm space-y-3">
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
                                        className="w-full py-8 border-2 border-dashed border-emerald-300 bg-emerald-50 hover:bg-emerald-100 rounded-xl flex flex-col items-center justify-center transition-all group cursor-pointer"
                                    >
                                        <Upload className="w-8 h-8 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                                        <span className="text-sm font-bold text-emerald-800">Click para subir Excel</span>
                                        <span className="text-[10px] text-emerald-600 mt-1">Plantilla Oficial AAQA</span>
                                    </button>
                                )}

                                {isUploading && (
                                    <div className="w-full py-8 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-xl">
                                        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                                        <span className="text-sm font-bold text-slate-600">Procesando registros...</span>
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
                                    <div className="w-full py-6 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col items-center justify-center gap-2">
                                        <CheckCircle className="w-8 h-8 text-emerald-600" />
                                        <span className="text-sm font-bold text-emerald-800">¡Carga Exitosa!</span>
                                        <span className="text-xs text-emerald-600">Actualizando dashboard...</span>
                                    </div>
                                )}

                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default CategoryEditModal;

