import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../contexts/useData';
import { FisParticipant, ParticipantGender } from '../types';
import { 
    Users, 
    Search, 
    Filter, 
    FileSpreadsheet, 
    Plus, 
    Edit2, 
    Trash2, 
    Download, 
    CheckCircle, 
    XCircle, 
    Clock, 
    AlertCircle,
    Calendar,
    ChevronDown,
    MapPin,
    UserPlus,
    Upload,
    ChevronLeft,
    ChevronRight,
    TrendingUp
} from 'lucide-react';
import { useCountUp } from '../hooks/useCountUp';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { usePermissions } from '../hooks/usePermissions';
import EditableText from './EditableText';

export const FisIncubadoraModule: React.FC = () => {
    const { data, updateFisParticipants, deleteFisParticipant, uploadFisParticipantsExcel } = useData();
    const participants = data.fisParticipants || [];
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- FILTERS STATE ---
    const [selectedYear, setSelectedYear] = useState<number | 'Global'>('Global');
    const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // --- MODALS STATE ---
    const [editingParticipant, setEditingParticipant] = useState<FisParticipant | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isUploadingBulk, setIsUploadingBulk] = useState(false);

    // --- PERMISSIONS ---
    const { canEditFormative } = usePermissions();
    const canEditIncubadora = canEditFormative('fis');

    // --- COMPUTATIONS ---
    const filteredParticipants = useMemo(() => {
        return participants.filter(p => {
            const matchesYear = selectedYear === 'Global' || p.year === selectedYear;
            const matchesStatus = selectedStatus === 'Todos' || p.status === selectedStatus;
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                p.ventureName.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesYear && matchesStatus && matchesSearch;
        });
    }, [participants, selectedYear, selectedStatus, searchTerm]);

    const paginatedParticipants = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredParticipants.slice(start, start + itemsPerPage);
    }, [filteredParticipants, currentPage]);

    const pageCount = Math.ceil(filteredParticipants.length / itemsPerPage);

    const stats = useMemo(() => {
        const total = filteredParticipants.length;
        const graduated = filteredParticipants.filter(p => p.status === 'graduado').length;
        const formatting = filteredParticipants.filter(p => p.status === 'en formación').length;
        const enrolled = filteredParticipants.filter(p => p.status === 'inscrito').length;
        
        const genderData = [
            { name: 'Mujeres', value: filteredParticipants.filter(p => p.gender === 'F').length, color: '#0857C3' },
            { name: 'Hombres', value: filteredParticipants.filter(p => p.gender === 'M').length, color: '#E59440' }
        ];

        return { total, graduated, formatting, enrolled, genderData };
    }, [filteredParticipants]);

    // Animated numbers
    const animTotal = useCountUp(stats.total, 1000);
    const animGrad = useCountUp(stats.graduated, 1000);
    const animForm = useCountUp(stats.formatting, 1000);

    // --- HANDLERS ---
    const handleSaveParticipant = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        
        const pData: Partial<FisParticipant> = {
            name: formData.get('name') as string,
            year: parseInt(formData.get('year') as string),
            gender: formData.get('gender') as any,
            age: parseInt(formData.get('age') as string),
            ventureName: formData.get('ventureName') as string,
            department: formData.get('department') as string,
            status: formData.get('status') as any,
            observations: formData.get('observations') as string,
            program: 'Incubadora FGK'
        };

        if (editingParticipant) {
            const updated = participants.map(p => p.id === editingParticipant.id ? { ...p, ...pData } : p);
            await updateFisParticipants(updated as FisParticipant[]);
            setEditingParticipant(null);
        } else {
            const newParticipant: FisParticipant = {
                id: `fp-${Date.now()}`,
                ...pData as any
            };
            await updateFisParticipants([...participants, newParticipant]);
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Eliminar este participante de forma permanente?')) {
            await deleteFisParticipant(id);
        }
    };

    const handleImportSimulate = () => {
        setIsImporting(true);
        // In reality, this would open a file picker and process the Excel
        setTimeout(() => {
            alert('Módulo de Carga Masiva: Esta función simulará la importación de datos desde Excel. En una fase posterior se integrará con una librería de lectura de Excel (XLSX).');
            setIsImporting(false);
        }, 500);
    };

    const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingBulk(true);
        try {
            await uploadFisParticipantsExcel(file);
        } finally {
            setIsUploadingBulk(false);
            e.target.value = '';
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'graduado': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'en formación': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'inscrito': return 'bg-slate-100 text-slate-700 border-slate-200';
            case 'retiro': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Header & Main Stats */}
            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group">
                    <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                    <EditableText 
                                        category="fis" 
                                        idKey="incubator_impact_title" 
                                        defaultText="Impacto Incubadora" 
                                        className="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                            /> (Nacional)
                        </p>
                        <div className="flex items-baseline gap-4 mt-2">
                             <h4 className="text-4xl font-black text-slate-800 tracking-tighter tabular-nums">{animTotal}</h4>
                             <p className="text-xs font-bold text-slate-500 uppercase">
                                <EditableText 
                                    category="fis" 
                                    idKey="incubator_total_label" 
                                    defaultText="Inscritos Totales" 
                                    className="text-xs font-bold text-slate-500 uppercase"
                                />
                             </p>
                        </div>
                    </div>
                    <div className="bg-brand-green/10 p-4 rounded-2xl text-brand-green group-hover:bg-brand-green group-hover:text-white transition-all duration-500">
                        <Users size={32} />
                    </div>
                </div>

                <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-4">
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <EditableText 
                                category="fis" 
                                idKey="process_status_title" 
                                defaultText="Estado del Proceso" 
                                className="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                            />
                        </h5>
                        <TrendingUp size={16} className="text-slate-300" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                            <p className="text-lg font-black text-slate-800 tabular-nums">{animGrad}</p>
                            <p className="text-[9px] font-bold text-emerald-600 uppercase">
                                <EditableText category="fis" idKey="status_graduated" defaultText="Graduados" />
                            </p>
                        </div>
                        <div className="text-center border-x border-slate-100 px-2">
                            <p className="text-lg font-black text-slate-800 tabular-nums">{animForm}</p>
                            <p className="text-[9px] font-bold text-blue-600 uppercase">
                                <EditableText category="fis" idKey="status_in_process" defaultText="En Proceso" />
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-black text-slate-800 tabular-nums">{stats.enrolled}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">
                                <EditableText category="fis" idKey="status_enrolled" defaultText="Solo Reg." />
                            </p>
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-64 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 text-center">
                        <EditableText category="fis" idKey="gender_label" defaultText="Género" />
                    </h5>
                    <div className="h-16 w-full">
                         <ResponsiveContainer width="100%" height="100%">
                             <PieChart>
                                 <Pie
                                     data={stats.genderData}
                                     cx="50%"
                                     cy="50%"
                                     innerRadius={20}
                                     outerRadius={30}
                                     paddingAngle={2}
                                     dataKey="value"
                                     stroke="none"
                                     animationDuration={1000}
                                 >
                                     {stats.genderData.map((entry, index) => (
                                         <Cell key={`cell-${index}`} fill={entry.color} />
                                     ))}
                                 </Pie>
                             </PieChart>
                         </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-2">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#0857C3]"></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">F: {stats.genderData[0].value} <span className="opacity-60">({stats.total > 0 ? (stats.genderData[0].value / stats.total * 100).toFixed(0) : 0}%)</span></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#E59440]"></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">M: {stats.genderData[1].value} <span className="opacity-60">({stats.total > 0 ? (stats.genderData[1].value / stats.total * 100).toFixed(0) : 0}%)</span></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter & Actions Bar */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                        <Calendar size={14} className="text-slate-400" />
                        <select 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(e.target.value === 'Global' ? 'Global' : parseInt(e.target.value))}
                            className="text-xs font-bold text-slate-700 focus:outline-none bg-transparent"
                        >
                            <option value="Global">Todos los años</option>
                            {Array.from({ length: 2025 - 2018 + 1 }, (_, i) => 2025 - i).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                        <Filter size={14} className="text-slate-400" />
                        <select 
                            value={selectedStatus} 
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="text-xs font-bold text-slate-700 focus:outline-none bg-transparent"
                        >
                            <option value="Todos">Todos los Estados</option>
                            <option value="inscrito">Inscrito</option>
                            <option value="en formación">En Formación</option>
                            <option value="graduado">Graduado</option>
                            <option value="retiro">Retiro</option>
                        </select>
                    </div>

                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar participante..."
                            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green/40 outline-none w-full sm:w-64 transition-all shadow-sm"
                        />
                    </div>
                </div>

                <div className="flex gap-2">
                    {canEditIncubadora && (
                        <>
                            <button 
                                 onClick={() => fileInputRef.current?.click()}
                                 disabled={isUploadingBulk}
                                 className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <FileSpreadsheet size={16} className="text-emerald-600" />
                                {isUploadingBulk ? 'Subiendo...' : 'Cargar Excel'}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                className="hidden"
                                onChange={handleBulkUpload}
                            />
                            <button 
                                onClick={() => { setEditingParticipant(null); setIsCreating(true); }}
                                className="flex items-center gap-2 bg-brand-green text-white hover:brightness-110 px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-brand-green/20 transition-all"
                            >
                                <UserPlus size={16} />
                                Nueva Alta
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                                <th className="p-4 pl-6">Participante</th>
                                <th className="p-4">Departamento</th>
                                <th className="p-4">Organización / Emprendimiento</th>
                                <th className="p-4">Edad / G</th>
                                <th className="p-4">Estado</th>
                                <th className="p-4 pr-6 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {paginatedParticipants.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-40">
                                            <Search size={48} className="text-slate-300" />
                                            <p className="font-bold text-slate-500 tracking-wide uppercase text-xs">No se encontraron resultados</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedParticipants.map((p) => (
                                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-4 pl-6">
                                            <p className="font-bold text-slate-800">{p.name}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                <MapPin size={10} /> {p.department}
                                            </p>
                                        </td>
                                        <td className="p-4 font-semibold text-slate-600 truncate max-w-[180px]">
                                            {p.ventureName}
                                        </td>
                                        <td className="p-4 text-xs font-bold text-slate-500">
                                            {p.age} años <span className="mx-1 opacity-20">|</span> {p.gender}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(p.status)}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="p-4 pr-6 text-right">
                                            {canEditIncubadora && (
                                                <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => setEditingParticipant(p)}
                                                        className="p-2 text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 rounded-lg transition-all"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(p.id)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pageCount > 1 && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Mostrando <span className="text-slate-700">{Math.min(filteredParticipants.length, itemsPerPage)}</span> de <span className="text-slate-700">{filteredParticipants.length}</span> registros
                        </p>
                        <div className="flex items-center gap-1">
                            <button 
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                                className="p-2 border border-slate-200 rounded-lg bg-white disabled:opacity-30 hover:bg-slate-50 transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-xs font-bold px-4 text-slate-700">Página {currentPage} de {pageCount}</span>
                            <button 
                                disabled={currentPage === pageCount}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="p-2 border border-slate-200 rounded-lg bg-white disabled:opacity-30 hover:bg-slate-50 transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal: Create / Edit */}
            {(isCreating || editingParticipant) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-slate-50 px-8 py-6 border-b border-slate-200 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">
                                    {editingParticipant ? 'Editar Registro' : 'Nueva Alta de Participante'}
                                </h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                                    Módulo Incubadora FGK {selectedYear}
                                </p>
                            </div>
                            <button 
                                onClick={() => { setIsCreating(false); setEditingParticipant(null); }}
                                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                            >
                                <XCircle size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveParticipant} className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-full">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nombre Completo</label>
                                    <input 
                                        name="name"
                                        required 
                                        defaultValue={editingParticipant?.name}
                                        placeholder="Ej: Ana María Martínez"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Género</label>
                                    <select 
                                        name="gender"
                                        required 
                                        defaultValue={editingParticipant?.gender || 'F'}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                                    >
                                        <option value="F">Femenino (F)</option>
                                        <option value="M">Masculino (M)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Edad</label>
                                    <input 
                                        name="age"
                                        type="number"
                                        required 
                                        min="16" max="99"
                                        defaultValue={editingParticipant?.age || 25}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Organización / Emprendimiento</label>
                                    <input 
                                        name="ventureName"
                                        required 
                                        defaultValue={editingParticipant?.ventureName}
                                        placeholder="Nombre del negocio"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Departamento</label>
                                    <input 
                                        name="department"
                                        required 
                                        defaultValue={editingParticipant?.department}
                                        placeholder="Ej: San Salvador"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Estado</label>
                                    <select 
                                        name="status"
                                        required 
                                        defaultValue={editingParticipant?.status || 'inscrito'}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                                    >
                                        <option value="inscrito">Inscrito</option>
                                        <option value="en formación">En Formación</option>
                                        <option value="graduado">Graduado</option>
                                        <option value="retiro">Retiro</option>
                                    </select>
                                </div>

                                <div className="col-span-full">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Observaciones</label>
                                    <textarea 
                                        name="observations"
                                        rows={3}
                                        defaultValue={editingParticipant?.observations}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-green/20 outline-none transition-all resize-none"
                                    />
                                </div>

                                <input
                                    type="hidden"
                                    name="year"
                                    value={editingParticipant?.year || (selectedYear === 'Global' ? new Date().getFullYear() : selectedYear)}
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-10">
                                <button 
                                    type="button" 
                                    onClick={() => { setIsCreating(false); setEditingParticipant(null); }}
                                    className="px-6 py-3 text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 rounded-xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    className="px-10 py-3 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all"
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
