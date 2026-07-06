// src/components/FormativeImpactPanel.tsx - VERSIÓN CORREGIDA

import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/useData';
import {
    PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, Legend
} from 'recharts';
import { Users, GraduationCap, MapPin, Loader2 } from 'lucide-react';
import { exportService } from '../services/exportService';
import EditableText from './EditableText';

interface FormativeImpactPanelProps {
    userData?: any;
}

// Tipo para los datos de departamento
interface DepartmentData {
    [key: string]: number;
}

// Tipo para los datos de categoría
interface CategoryData {
    enrolled: number;
    graduated: number;
}

interface ByCategoryType {
    ong: CategoryData;
    community: CategoryData;
    fis: CategoryData;
}

interface FormativeData {
    totalEnrolled: number;
    totalGraduated: number;
    byGender: { M: number; F: number };
    byCategory: ByCategoryType;
    byDepartment: DepartmentData;
}

const FormativeImpactPanel: React.FC<FormativeImpactPanelProps> = ({ userData }) => {
    const { data, isLoading } = useData();

    if (isLoading || !data?.formative) {
        return (
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8 relative overflow-hidden">
                <div className="flex justify-center items-center h-64">
                    <div className="text-center">
                        <Loader2 className="w-10 h-10 text-brand-blue animate-spin mx-auto mb-4" />
                        <p className="text-slate-500">Cargando datos de formación...</p>
                    </div>
                </div>
            </div>
        );
    }

    const formative = data.formative;
    const totalEnrolled = formative.totalEnrolled || 0;
    const totalGraduated = formative.totalGraduated || 0;
    const totalDeserted = totalEnrolled - totalGraduated;
    const retentionRate = totalEnrolled > 0 ? (totalGraduated / totalEnrolled) * 100 : 0;

    const retentionData = [
        { name: 'Graduados', value: totalGraduated, color: '#5BA84A' },
        { name: 'Desertados', value: totalDeserted, color: '#D33E3E' }
    ];

    const categoryData = [
        { name: 'ONG', Inscritos: formative.byCategory?.ong?.enrolled || 0, Graduados: formative.byCategory?.ong?.graduated || 0 },
        { name: 'Comunidad', Inscritos: formative.byCategory?.community?.enrolled || 0, Graduados: formative.byCategory?.community?.graduated || 0 },
        { name: 'Emprendimiento', Inscritos: formative.byCategory?.fis?.enrolled || 0, Graduados: formative.byCategory?.fis?.graduated || 0 }
    ];

    const genderData = [
        { name: 'Mujeres', value: formative.byGender?.F || 0, color: '#0857C3' },
        { name: 'Hombres', value: formative.byGender?.M || 0, color: '#E59440' }
    ];

    const topDepartments = Object.entries(formative.byDepartment || {})
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

    // Tooltip formatter corregido para evitar errores de tipos de Recharts
    const tooltipFormatter = (value: any, name: any): [string, string] => {
        const numValue = typeof value === 'number' ? value : (value ? parseInt(value.toString()) : 0);
        return [`${numValue} personas`, name];
    };

    // Label formatter para el gráfico de retención
    const renderRetentionLabel = (props: any) => {
        const { cx, cy, midAngle = 0, outerRadius = 0, percent = 0 } = props;
        if (percent < 0.01) return null;
        const RADIAN = Math.PI / 180;
        const radius = outerRadius * 1.3;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        return (
            <text x={x} y={y} fill="#475569" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight={700}>
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    // Label formatter para el gráfico de género
    const renderGenderLabel = (props: any) => {
        const { cx, cy, midAngle = 0, outerRadius = 0, percent = 0 } = props;
        if (percent < 0.01) return null;
        const RADIAN = Math.PI / 180;
        const radius = outerRadius * 1.35;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        return (
            <text x={x} y={y} fill="#475569" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight={700}>
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8 relative overflow-hidden">
            
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 group">
                    <div className="bg-brand-blue/10 p-2 rounded-lg group-hover:bg-brand-blue group-hover:text-white transition-all duration-500">
                        <GraduationCap className="h-6 w-6" />
                    </div>
                    <h2 className="text-2xl font-display font-black text-slate-800 tracking-tight">
                        <EditableText 
                            category="global" 
                            idKey="formative_main_title" 
                            defaultText="Métricas de Formación e Impacto" 
                        />
                    </h2>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => exportService.downloadFormativeExcel()}
                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold hover:bg-purple-100 transition-colors"
                    >
                        📊 Exportar Excel
                    </button>
                </div>
            </div>

            {totalEnrolled === 0 && totalGraduated === 0 && (
                <div className="text-center py-12">
                    <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-600 mb-2">No hay datos de formación</h3>
                    <p className="text-sm text-slate-400">Los datos de formación se mostrarán aquí cuando haya participantes registrados.</p>
                </div>
            )}

            {(totalEnrolled > 0 || totalGraduated > 0) && (
                <>
                    <div className="flex flex-col sm:flex-row gap-6 mb-8 pb-8 border-b border-slate-100">
                        <div className="flex-1 executive-card p-6 flex items-center group">
                            <div className="kpi-icon-container bg-blue-50 border border-blue-100 p-4 rounded-2xl mr-5 text-brand-blue shadow-inner group-hover:bg-brand-blue group-hover:text-white transition-all duration-500">
                                <Users size={28} />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight mb-1">
                                    <EditableText 
                                        category="global" 
                                        idKey="formative_label_enrolled" 
                                        defaultText="Total Inscritos" 
                                    />
                                </div>
                                <p className="text-4xl font-black text-slate-800 tracking-tighter tabular-nums">{totalEnrolled}</p>
                            </div>
                        </div>

                        <div className="flex-1 executive-card p-6 flex items-center group">
                            <div className="kpi-icon-container bg-green-50 border border-green-100 p-4 rounded-2xl mr-5 text-brand-green shadow-inner group-hover:bg-brand-green group-hover:text-white transition-all duration-500">
                                <GraduationCap size={28} />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight mb-1">
                                    <EditableText 
                                        category="global" 
                                        idKey="formative_label_graduated" 
                                        defaultText="Total Graduados" 
                                    />
                                </div>
                                <div className="flex items-baseline gap-3">
                                    <p className="text-4xl font-black text-slate-800 tracking-tighter tabular-nums">{totalGraduated}</p>
                                    <span className="text-xs font-bold text-brand-green tracking-widest uppercase bg-green-50 px-2 py-1 rounded-lg border border-green-200/50 shadow-sm tabular-nums">
                                        {retentionRate.toFixed(1)}% <EditableText 
                                            category="global" 
                                            idKey="formative_label_success" 
                                            defaultText="Éxito" 
                                        />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* 1. Retention Donut */}
                        <div className="executive-card p-4 flex flex-col justify-between">
                            <h3 className="text-xs font-semibold text-slate-600 mb-3 text-center tracking-wide uppercase">
                                <EditableText 
                                    category="global" 
                                    idKey="formative_title_retention" 
                                    defaultText="Eficiencia de Retención" 
                                />
                            </h3>
                            <div className="h-36 relative flex-grow">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={retentionData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={34}
                                            outerRadius={52}
                                            paddingAngle={4}
                                            dataKey="value"
                                            stroke="none"
                                            label={renderRetentionLabel}
                                            labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                                        >
                                            {retentionData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip formatter={tooltipFormatter} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-center gap-4 mt-3 border-t border-slate-100 pt-2">
                                {retentionData.map(d => (
                                    <div key={d.name} className="flex items-center">
                                        <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: d.color }}></span>
                                        <span className="text-slate-600 text-xs font-semibold uppercase tracking-wider">{d.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. Program Comparison Bar Chart */}
                        <div className="executive-card p-6 flex flex-col justify-between">
                            <h3 className="text-sm font-semibold text-slate-600 mb-4 text-center tracking-wide uppercase">
                                <EditableText 
                                    category="global" 
                                    idKey="formative_title_performance" 
                                    defaultText="Rendimiento por Programa" 
                                />
                            </h3>
                            <div className="h-48 flex-grow">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={categoryData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <RechartsTooltip cursor={{ fill: '#f1f5f9' }} formatter={tooltipFormatter} />
                                        <Legend wrapperStyle={{ fontSize: '11px', color: '#64748b', fontWeight: 600, paddingTop: '10px' }} iconType="circle" />
                                        <Bar dataKey="Inscritos" fill="#e2e8f0" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="Inscritos" position="top" fill="#64748b" fontSize={10} fontWeight="bold" />
                                        </Bar>
                                        <Bar dataKey="Graduados" fill="#5BA84A" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="Graduados" position="top" fill="#5BA84A" fontSize={10} fontWeight="bold" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 3. Gender & Geo Distribution */}
                        <div className="flex flex-col gap-4">
                            {/* Gender Pie */}
                            <div className="executive-card p-4 flex-1 flex flex-col justify-between">
                                <h3 className="text-xs font-semibold text-slate-600 mb-2 text-center tracking-wide uppercase">
                                    <EditableText 
                                        category="global" 
                                        idKey="formative_title_gender" 
                                        defaultText="Distribución de Género" 
                                    />
                                </h3>
                                <div className="h-28 relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                                            <Pie
                                                data={genderData}
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={30}
                                                dataKey="value"
                                                label={renderGenderLabel}
                                                labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                                            >
                                                {genderData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip formatter={tooltipFormatter} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex justify-center gap-4 mt-2 mb-1 border-t border-slate-100 pt-2">
                                    {genderData.map(d => (
                                        <div key={d.name} className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: d.color }}></span>
                                            <span className="text-slate-600 text-[10px] font-semibold uppercase tracking-wider">{d.name}</span>
                                            <span className="text-xs font-bold">({d.value})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Geo Top Ranking */}
                            <div className="executive-card p-4">
                                <h3 className="text-xs font-semibold text-slate-600 mb-3 flex items-center tracking-wide uppercase">
                                    <MapPin size={16} className="mr-2 text-brand-red" />
                                    <EditableText 
                                        category="global" 
                                        idKey="formative_title_geo" 
                                        defaultText="Top Impacto por Depto." 
                                    />
                                </h3>
                                
                                {topDepartments.length > 0 ? (
                                    <ul className="space-y-1">
                                        {topDepartments.map((dept, i) => (
                                            <li key={dept.name} className="flex justify-between items-center text-xs pb-1.5 border-b border-slate-100 last:border-0 last:pb-0 group">
                                                <span className="text-slate-600 font-medium flex items-center gap-1">
                                                    {i + 1}. 
                                                    <span className="text-slate-800 font-semibold ml-1">{dept.name}</span>
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-brand-blue font-bold tracking-widest">
                                                        {dept.value} <EditableText 
                                                            category="global" 
                                                            idKey="formative_label_grad_unit" 
                                                            defaultText="grad." 
                                                        />
                                                    </span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-xs text-slate-400 text-center py-2">Sin datos geográficos</p>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default FormativeImpactPanel;
