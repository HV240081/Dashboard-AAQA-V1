import React, { useState } from 'react';
import { Filter, BarChart3, Info } from 'lucide-react';

// Data Mock representing Historical Accumulation (~9.3M Total)
const departmentData = [
    { id: 'SS', name: 'San Salvador', zone: 'Central', value: 3150000, percentage: 33.6 },
    { id: 'LL', name: 'La Libertad', zone: 'Central', value: 1520000, percentage: 16.2 },
    { id: 'SA', name: 'Santa Ana', zone: 'Occidente', value: 850000, percentage: 9.1 },
    { id: 'SM', name: 'San Miguel', zone: 'Oriente', value: 720000, percentage: 7.7 },
    { id: 'US', name: 'Usulután', zone: 'Oriente', value: 580000, percentage: 6.2 },
    // Aggregated data for logic, though specifically we show Top 5 + Rest
    { id: 'SO', name: 'Sonsonate', zone: 'Occidente', value: 420000, percentage: 4.5 },
    { id: 'CH', name: 'Chalatenango', zone: 'Central', value: 380000, percentage: 4.0 },
    { id: 'AH', name: 'Ahuachapán', zone: 'Occidente', value: 350000, percentage: 3.7 },
    { id: 'LP', name: 'La Paz', zone: 'Paracentral', value: 340000, percentage: 3.6 },
    { id: 'SV', name: 'San Vicente', zone: 'Paracentral', value: 290000, percentage: 3.1 },
    { id: 'CU', name: 'Cuscatlán', zone: 'Paracentral', value: 280000, percentage: 3.0 },
    { id: 'CA', name: 'Cabañas', zone: 'Paracentral', value: 210000, percentage: 2.2 },
    { id: 'MO', name: 'Morazán', zone: 'Oriente', value: 180000, percentage: 1.9 },
    { id: 'LU', name: 'La Unión', zone: 'Oriente', value: 103138, percentage: 1.1 },
];

const TerritorialDistributionMap: React.FC = () => {
    const [selectedZone, setSelectedZone] = useState('Todas');
    const [selectedCategory, setSelectedCategory] = useState('Todas');

    // Formatting currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(value);
    };

    // Filter logic
    const filteredData = departmentData.filter(dept => {
        if (selectedZone === 'Todas') return true;
        return dept.zone === selectedZone;
    });

    // Sort by value DESC
    const sortedData = [...filteredData].sort((a, b) => b.value - a.value);

    // Top 5 Logic
    const top5 = sortedData.slice(0, 5);
    const restOfCountry = sortedData.slice(5);

    const restValue = restOfCountry.reduce((acc, curr) => acc + curr.value, 0);
    const restPercentage = restOfCountry.reduce((acc, curr) => acc + curr.percentage, 0);

    // Determine max value for bar scaling (Top 1 is 100% width)
    const maxValue = top5.length > 0 ? top5[0].value : 0;

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

            {/* Header / Filters */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <BarChart3 className="text-blue-700 w-5 h-5" />
                    <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Ranking por Departamento</span>
                </div>

                <div className="flex gap-3">
                    {/* Zone Filter */}
                    <div className="relative">
                        <select
                            className="appearance-none bg-white border border-slate-300 text-slate-700 text-xs font-bold py-2 pl-3 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase tracking-wide"
                            value={selectedZone}
                            onChange={(e) => setSelectedZone(e.target.value)}
                        >
                            <option value="Todas">Toda la República</option>
                            <option value="Occidente">Zona Occidental</option>
                            <option value="Central">Zona Central</option>
                            <option value="Paracentral">Zona Paracentral</option>
                            <option value="Oriente">Zona Oriental</option>
                        </select>
                        <Filter className="absolute right-2.5 top-2.5 w-3 h-3 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Category Filter */}
                    <div className="relative">
                        <select
                            className="appearance-none bg-white border border-slate-300 text-slate-700 text-xs font-bold py-2 pl-3 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase tracking-wide"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="Todas">Todas las Categorías</option>
                            <option value="ONG">ONG</option>
                            <option value="Desarrollo Comunitario">Desarrollo Comunitario</option>
                            <option value="FIS">Emprendimiento</option>
                        </select>
                        <Filter className="absolute right-2.5 top-2.5 w-3 h-3 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left: Main Ranking (Top 5) */}
                <div className="lg:col-span-2 space-y-5">
                    <h3 className="text-sm font-bold text-slate-800 mb-4">Top 5 Departamentos (Mayor Inversión)</h3>

                    {top5.map((dept, index) => {
                        const widthPercentage = (dept.value / maxValue) * 100;
                        return (
                            <div key={dept.id} className="relative">
                                <div className="flex justify-between items-end mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-400 font-mono text-xs w-4">0{index + 1}</span>
                                        <span className="text-sm font-bold text-slate-800">{dept.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-sm font-bold text-blue-800">{formatCurrency(dept.value)}</span>
                                    </div>
                                </div>
                                {/* Bar Background */}
                                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                    {/* Filled Bar */}
                                    <div
                                        className="h-full bg-blue-600 rounded-full"
                                        style={{ width: `${widthPercentage}%` }}
                                    ></div>
                                </div>
                                {/* Percentage Label */}
                                <div className="text-right mt-1">
                                    <span className="text-[10px] font-medium text-slate-400">{dept.percentage}% del total</span>
                                </div>
                            </div>
                        );
                    })}

                    {/* Rest of Country Aggregation */}
                    {restValue > 0 && selectedZone === 'Todas' && (
                        <div className="relative pt-4 border-t border-slate-100 mt-4">
                            <div className="flex justify-between items-end mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-300 font-mono text-xs w-4">--</span>
                                    <span className="text-sm font-bold text-slate-500">Resto del País (9 Departamentos)</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-sm font-bold text-slate-600">{formatCurrency(restValue)}</span>
                                </div>
                            </div>
                            <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-slate-300 rounded-full"
                                    style={{ width: `${(restValue / maxValue) * 100}%` }}
                                ></div>
                            </div>
                            <div className="text-right mt-1">
                                <span className="text-[10px] font-medium text-slate-400">{restPercentage.toFixed(1)}% del total</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Summary Panel */}
                <div className="flex flex-col h-full bg-blue-50/50 rounded-lg p-6 border border-blue-100">
                    <div className="mb-6">
                        <h4 className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-2">Total Mapeado (Vista)</h4>
                        <p className="text-2xl font-bold text-slate-900">
                            {formatCurrency(top5.reduce((sum, item) => sum + item.value, 0) + (selectedZone === 'Todas' ? restValue : 0))}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Inversión acumulada en esta selección</p>
                    </div>

                    <div className="flex-grow space-y-4">
                        <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-100 shadow-sm">
                            <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                            <p className="text-xs text-slate-600 leading-relaxed">
                                <strong>San Salvador y La Libertad</strong> concentran el <span className="text-blue-700 font-bold">49.8%</span> de la inversión histórica debido a la densidad de proyectos de infraestructura social y sedes de organizaciones aliadas.
                            </p>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default TerritorialDistributionMap;