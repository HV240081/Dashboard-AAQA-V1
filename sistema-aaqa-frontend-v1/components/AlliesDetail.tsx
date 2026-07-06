import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Filter, Search, ChevronRight, Handshake, Building, Save } from 'lucide-react';
import { useData } from '../contexts/useData';
import { usePermissions } from '../hooks/usePermissions';
import { CategoryType, Project, AllyContribution } from '../types';

interface AlliesDetailProps {
    onBack: () => void;
}

// Helper interface for flattening the data
interface FlatAllyRecord extends AllyContribution {
    recordKey: string;
    projectIds: string;
    projectName: string;
    organization: string;
    category: CategoryType;
    amountFGK: number; // Project level FGK
    projectTotal: number; // Project level Total
}

const AlliesDetail: React.FC<AlliesDetailProps> = ({ onBack }) => {
    const { data, updateProjectList } = useData();
    const { canEditCategory } = usePermissions();
    
    // Filter States
    const [selectedAlly, setSelectedAlly] = useState<string>('Todos');
    const [selectedYear, setSelectedYear] = useState<string>('Todos');
    const [selectedOrg, setSelectedOrg] = useState<string>('Todos');
    const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
    const [searchTerm, setSearchTerm] = useState('');
    const [allyDrafts, setAllyDrafts] = useState<Record<string, { name?: string; amount?: string }>>({});
    const [savingRecords, setSavingRecords] = useState<Record<string, boolean>>({});
    const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
    const allyDraftsRef = useRef(allyDrafts);
    const projectsRef = useRef<Project[]>(data.projectsList || []);
    const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    useEffect(() => {
        allyDraftsRef.current = allyDrafts;
    }, [allyDrafts]);

    useEffect(() => {
        projectsRef.current = data.projectsList || [];
    }, [data.projectsList, allyDrafts]);

    useEffect(() => {
        return () => {
            Object.values(saveTimers.current).forEach(clearTimeout);
        };
    }, []);

    const parseMoneyInput = (value: string | number | undefined | null) => {
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
        const parsed = Number((value ?? '').toString().replace(/[^0-9.-]/g, ''));
        return Number.isFinite(parsed) ? parsed : 0;
    };

    // 1. Data Transformation: Flatten the structure (Projects -> Allies)
    const allAllyRecords: FlatAllyRecord[] = useMemo(() => {
        const records: FlatAllyRecord[] = [];
        
        data.projectsList.forEach(p => {
            if (p.allies && p.allies.length > 0) {
                const alliesTotal = p.allies.reduce((sum, ally) => {
                    const recordKey = `${p.id}::${ally.id || 'primary'}`;
                    const draft = allyDrafts[recordKey];
                    return sum + (draft?.amount !== undefined ? parseMoneyInput(draft.amount) : Number(ally.amount || 0));
                }, 0);
                const projectTotal = p.amountFGK + alliesTotal + p.counterpart;

                // If detailed allies exist, use them
                p.allies.forEach(ally => {
                    const recordKey = `${p.id}::${ally.id || 'primary'}`;
                    const draft = allyDrafts[recordKey] || {};
                    records.push({
                        ...ally,
                        recordKey,
                        name: draft.name !== undefined ? draft.name : ally.name,
                        amount: draft.amount !== undefined ? parseMoneyInput(draft.amount) : Number(ally.amount || 0),
                        projectIds: p.id,
                        projectName: p.name,
                        organization: p.organization,
                        category: p.category,
                        amountFGK: p.amountFGK,
                        projectTotal: projectTotal
                    });
                });
            } else if (p.amountAllies > 0) {
                // Fallback for legacy data without detailed allies array
                const projectTotal = p.amountFGK + p.amountAllies + p.counterpart;
                records.push({
                    id: `legacy-${p.id}`,
                    recordKey: `${p.id}::legacy-${p.id}`,
                    name: p.allyName || 'Aliado Genérico',
                    amount: p.amountAllies,
                    year: p.year,
                    note: 'Registro histórico consolidado',
                    projectIds: p.id,
                    projectName: p.name,
                    organization: p.organization,
                    category: p.category,
                    amountFGK: p.amountFGK,
                    projectTotal: projectTotal
                });
            }
        });
        return records;
    }, [data.projectsList, allyDrafts]);

    const persistAllyRecord = async (record: FlatAllyRecord) => {
        if (saveTimers.current[record.recordKey]) {
            clearTimeout(saveTimers.current[record.recordKey]);
            delete saveTimers.current[record.recordKey];
        }

        const draft = allyDraftsRef.current[record.recordKey] || {};
        const nextName = (draft.name !== undefined ? draft.name : record.name || '').trim();
        const nextAmount = parseMoneyInput(draft.amount !== undefined ? draft.amount : record.amount);

        if (!nextName) {
            setSaveErrors(prev => ({ ...prev, [record.recordKey]: 'Ingrese el nombre del aliado.' }));
            return;
        }

        setSavingRecords(prev => ({ ...prev, [record.recordKey]: true }));
        setSaveErrors(prev => {
            const next = { ...prev };
            delete next[record.recordKey];
            return next;
        });

        try {
            const currentProjects = projectsRef.current || [];
            const nextProjects = currentProjects.map((project) => {
                if (project.id !== record.projectIds) return project;

                const baseAllies = Array.isArray(project.allies) && project.allies.length > 0
                    ? project.allies
                    : [{
                        id: record.id.startsWith('legacy-') ? `ally-${project.id}` : record.id,
                        name: project.allyName || record.name,
                        amount: project.amountAllies || record.amount || 0,
                        year: record.year || project.year,
                    }];

                const allyIndex = baseAllies.findIndex((ally) => {
                    const allyKey = `${project.id}::${ally.id || 'primary'}`;
                    return ally.id === record.id || allyKey === record.recordKey || record.id === `legacy-${project.id}`;
                });
                const targetIndex = allyIndex >= 0 ? allyIndex : 0;

                const nextAllies = baseAllies.map((ally, index) => (
                    index === targetIndex
                        ? {
                            ...ally,
                            id: ally.id || `ally-${project.id}`,
                            name: nextName,
                            amount: nextAmount,
                            year: ally.year || record.year || project.year,
                        }
                        : ally
                ));

                const totalAllies = nextAllies.reduce((sum, ally) => sum + parseMoneyInput(ally.amount), 0);

                return {
                    ...project,
                    allyName: nextAllies[0]?.name || nextName,
                    amountAllies: totalAllies,
                    allies: nextAllies,
                };
            });

            await updateProjectList(nextProjects);
        } catch (error) {
            console.error('Error actualizando aliado:', error);
            const message = error instanceof Error ? error.message : 'No se pudo actualizar el aliado.';
            setSaveErrors(prev => ({ ...prev, [record.recordKey]: message }));
        } finally {
            setSavingRecords(prev => {
                const next = { ...prev };
                delete next[record.recordKey];
                return next;
            });
        }
    };

    const scheduleAllySave = (record: FlatAllyRecord) => {
        if (saveTimers.current[record.recordKey]) {
            clearTimeout(saveTimers.current[record.recordKey]);
        }

        saveTimers.current[record.recordKey] = setTimeout(() => {
            persistAllyRecord(record);
        }, 700);
    };

    const handleAllyDraftChange = (record: FlatAllyRecord, field: 'name' | 'amount', value: string) => {
        setAllyDrafts(prev => ({
            ...prev,
            [record.recordKey]: {
                ...(prev[record.recordKey] || {}),
                [field]: value,
            },
        }));
        scheduleAllySave(record);
    };

    // 2. Filtered List
    const filteredRecords = allAllyRecords.filter(r => {
        const matchAlly = selectedAlly === 'Todos' || r.name === selectedAlly;
        const matchYear = selectedYear === 'Todos' || r.year.toString() === selectedYear;
        const matchOrg = selectedOrg === 'Todos' || r.organization === selectedOrg;
        const matchCategory = selectedCategory === 'Todas' || r.category === selectedCategory;
        const matchSearch = r.projectName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            r.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            r.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchAlly && matchYear && matchOrg && matchCategory && matchSearch;
    });

    // 3. Unique Filter Values
    const availableAllies = Array.from(new Set(allAllyRecords.map(r => r.name))).sort();
    const availableYears = Array.from(new Set(allAllyRecords.map(r => r.year))).sort().reverse();
    const availableOrgs = Array.from(new Set(allAllyRecords.map(r => r.organization))).sort();
    const availableCategories = Array.from(new Set(allAllyRecords.map(r => r.category))).sort();

    // 4. Totals for Header
    const totalAlliesAmount = filteredRecords.reduce((sum, r) => {
        return sum + parseMoneyInput(allyDrafts[r.recordKey]?.amount ?? r.amount);
    }, 0);
    const uniqueAlliesCount = new Set(filteredRecords.map(r => allyDrafts[r.recordKey]?.name ?? r.name)).size;
    const uniqueOrgsCount = new Set(filteredRecords.map(r => r.organization)).size;

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    };

    const getCategoryLabel = (category: CategoryType | string) => {
        if (category === 'Community') return 'Desarrollo Comunitario';
        if (category === 'FIS') return 'Emprendimiento Social';
        return 'ONG';
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
            
            {/* Header & Breadcrumb */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    <span className="cursor-pointer hover:text-blue-600" onClick={onBack}>Volver</span>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-slate-900 font-bold">Detalle de Fondos de Aliados</span>
                </div>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                     <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <Handshake className="w-8 h-8 text-emerald-600" />
                            Gestión de Fondos Aliados
                        </h1>
                        <p className="text-slate-500 mt-1">Desglose detallado de aportes externos por proyecto y edición.</p>
                    </div>
                </div>
            </div>

            {/* Top Cards Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-100 flex flex-col justify-between">
                    <p className="text-xs font-bold text-emerald-700 uppercase mb-2">Monto Total Filtrado</p>
                    <p className="text-3xl font-bold text-emerald-900">{formatCurrency(totalAlliesAmount)}</p>
                 </div>
                 <div className="bg-white rounded-xl p-6 border border-slate-200 flex items-center gap-4 shadow-sm">
                    <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                        <Handshake className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-900">{uniqueAlliesCount}</p>
                        <p className="text-xs text-slate-500 uppercase font-bold">Aliados Identificados</p>
                    </div>
                 </div>
                 <div className="bg-white rounded-xl p-6 border border-slate-200 flex items-center gap-4 shadow-sm">
                    <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
                        <Building className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-900">{uniqueOrgsCount}</p>
                        <p className="text-xs text-slate-500 uppercase font-bold">Orgs. Beneficiadas</p>
                    </div>
                 </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                     {/* Ally Filter */}
                     <div className="relative">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Aliado</label>
                        <select 
                            className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold py-2 pl-3 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            value={selectedAlly}
                            onChange={(e) => setSelectedAlly(e.target.value)}
                        >
                            <option value="Todos">Todos los Aliados</option>
                            {availableAllies.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        <Filter className="absolute right-2.5 bottom-2.5 w-3 h-3 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Year Filter */}
                    <div className="relative">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Edición</label>
                        <select 
                            className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold py-2 pl-3 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                        >
                            <option value="Todos">Todas las Ediciones</option>
                            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <Filter className="absolute right-2.5 bottom-2.5 w-3 h-3 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Org Filter */}
                     <div className="relative">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">ONG Beneficiada</label>
                        <select 
                            className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold py-2 pl-3 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            value={selectedOrg}
                            onChange={(e) => setSelectedOrg(e.target.value)}
                        >
                            <option value="Todos">Todas las ONGs</option>
                            {availableOrgs.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <Filter className="absolute right-2.5 bottom-2.5 w-3 h-3 text-slate-400 pointer-events-none" />
                    </div>

                     {/* Category Filter */}
                     <div className="relative">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Categoría</label>
                        <select 
                            className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold py-2 pl-3 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="Todas">Todas las Cat.</option>
                            {availableCategories.map(c => <option key={c} value={c}>{getCategoryLabel(c)}</option>)}
                        </select>
                        <Filter className="absolute right-2.5 bottom-2.5 w-3 h-3 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Buscar</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="Buscar..." 
                                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Search className="absolute left-2.5 top-2.5 w-3 h-3 text-slate-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-xs tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Nombre del Aliado</th>
                                <th className="px-6 py-4">ONG / Proyecto Beneficiado</th>
                                <th className="px-6 py-4">Categoría</th>
                                <th className="px-6 py-4 text-center">Edición</th>
                                <th className="px-6 py-4 text-right text-emerald-700">Aporte Aliado</th>
                                <th className="px-6 py-4 text-right text-blue-700">Aporte FGK</th>
                                <th className="px-6 py-4 text-right text-slate-800">Total Proyecto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRecords.length > 0 ? (
                                filteredRecords.map((record, idx) => {
                                    const draft = allyDrafts[record.recordKey] || {};
                                    const displayName = draft.name ?? record.name ?? '';
                                    const amountInput = draft.amount ?? String(record.amount ?? 0);
                                    const displayAmount = parseMoneyInput(amountInput);
                                    const displayTotal = record.projectTotal - Number(record.amount || 0) + displayAmount;
                                    const canEditRecord = canEditCategory(record.category);

                                    return (
                                    <tr key={record.recordKey || `${record.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex items-start gap-2">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0">
                                                    {(displayName || 'A')[0]}
                                                </div>
                                                {canEditRecord ? (
                                                    <div className="min-w-[240px] flex-1">
                                                        <input
                                                            type="text"
                                                            value={displayName}
                                                            onChange={(e) => handleAllyDraftChange(record, 'name', e.target.value)}
                                                            onBlur={() => persistAllyRecord(record)}
                                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                                                            placeholder="Nombre del aliado"
                                                        />
                                                        <div className="mt-1 min-h-[16px] text-[11px]">
                                                            {savingRecords[record.recordKey] ? (
                                                                <span className="inline-flex items-center gap-1 text-emerald-600">
                                                                    <Save className="w-3 h-3" />
                                                                    Guardando...
                                                                </span>
                                                            ) : saveErrors[record.recordKey] ? (
                                                                <span className="text-red-600">{saveErrors[record.recordKey]}</span>
                                                            ) : (
                                                                <span className="text-slate-400">Editable</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="font-bold text-slate-800">{displayName}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-700">{record.organization}</span>
                                                <span className="text-xs text-slate-400">{record.projectName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">{getCategoryLabel(record.category)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-mono text-slate-600">{record.year}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right bg-emerald-50/30 align-top">
                                            {canEditRecord ? (
                                                <div className="flex justify-end">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={amountInput}
                                                        onChange={(e) => handleAllyDraftChange(record, 'amount', e.target.value)}
                                                        onBlur={() => persistAllyRecord(record)}
                                                        className="w-32 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-right font-mono text-sm font-bold text-emerald-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                                                    />
                                                </div>
                                            ) : (
                                                <span className="font-mono font-bold text-emerald-700">{formatCurrency(displayAmount)}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-mono font-medium text-blue-600">{formatCurrency(record.amountFGK)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right bg-slate-50/50">
                                            <span className="font-mono font-bold text-slate-800">
                                                {formatCurrency(displayTotal)}
                                            </span>
                                        </td>
                                    </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                        No se encontraron registros de aliados con los filtros seleccionados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-xs text-slate-500 flex justify-between">
                        <span>Mostrando {filteredRecords.length} registros de aliados</span>
                        <span>* Datos consolidados desde Perfiles de Proyecto</span>
                </div>
            </div>
        </div>
    );
};

export default AlliesDetail;
