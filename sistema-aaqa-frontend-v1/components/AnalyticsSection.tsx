import React, { useState } from 'react';
import { useCountUp } from '../hooks/useCountUp';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  LabelList
} from 'recharts';
import { Search, ChevronDown, Filter } from 'lucide-react';

const dataByRegion = [
  { name: 'San Salvador', value: 45, projects: 12 },
  { name: 'La Libertad', value: 35, projects: 8 },
  { name: 'Santa Ana', value: 25, projects: 6 },
  { name: 'San Miguel', value: 20, projects: 5 },
  { name: 'Sonsonate', value: 15, projects: 4 },
  { name: 'Usulután', value: 10, projects: 3 },
];

const dataByYear = [
  { year: '2020', inversion: 1.2, proyectos: 20 },
  { year: '2021', inversion: 1.8, proyectos: 25 },
  { year: '2022', inversion: 2.1, proyectos: 32 },
  { year: '2023', inversion: 2.8, proyectos: 40 },
  { year: '2024', inversion: 3.5, proyectos: 45 },
  { year: '2025 (Est)', inversion: 4.2, proyectos: 55 },
];

const AnalyticsSection: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState('2024');

  // Animated Summary Metrics
  const animatedProgress = useCountUp(94, 1500);
  const animatedCost = useCountUp(12.5, 1200);


  return (
    <div>
      {/* Executive Filter Toolbar */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          
          {/* Filter Group: Period */}
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Periodo Fiscal</label>
            <div className="relative">
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-300 text-slate-700 py-2.5 px-3 pr-8 rounded-md leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
              >
                {Array.from({ length: 2025 - 2009 + 1 }, (_, i) => 2025 - i).map(y => (
                  <option key={y} value={y.toString()}>
                    {y} {y === 2025 ? '(En curso)' : y === 2024 ? '(Cerrado)' : ''}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>

          {/* Filter Group: Territory */}
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Territorio / Municipio</label>
            <div className="relative">
              <select className="w-full appearance-none bg-white border border-slate-300 text-slate-700 py-2.5 px-3 pr-8 rounded-md leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option>Todos los departamentos</option>
                <option>San Salvador</option>
                <option>La Libertad</option>
                <option>Santa Ana</option>
                <option>San Miguel</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>

          {/* Filter Group: Search */}
          <div className="flex-[2]">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Buscar Proyecto u Organización</label>
            <div className="relative">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-slate-400" />
               </div>
               <input 
                 type="text" 
                 placeholder="Ej: Educación Digital..." 
                 className="w-full bg-white border border-slate-300 text-slate-700 py-2.5 pl-10 pr-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400"
               />
            </div>
          </div>

          {/* Filter Action */}
          <div className="flex items-end">
             <button className="h-[42px] px-4 bg-white border border-slate-300 text-slate-600 rounded-md hover:bg-slate-50 hover:text-blue-600 transition-colors flex items-center gap-2">
                <Filter size={16} />
                <span className="text-sm font-medium">Más Filtros</span>
             </button>
          </div>

        </div>
      </div>

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Chart */}
        <div className="lg:col-span-2">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">
                Inversión y Cobertura: <span className="text-blue-600">Periodo {selectedYear}</span>
              </h3>
           </div>
           
           <div className="h-[350px] w-full bg-slate-50/30 rounded-lg border border-slate-100 p-2">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={dataByRegion} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{fontSize: 11, fill: '#64748b'}} />
                  <YAxis tick={{fontSize: 11, fill: '#64748b'}} />
                  <Tooltip 
                    cursor={{fill: '#f1f5f9'}} 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                  />
                  <Bar dataKey="value" fill="#1e3a8a" radius={[4, 4, 0, 0]} name="Inversión Ejecutada ($)" barSize={40} animationDuration={1000} animationBegin={200}>
                    <LabelList dataKey="value" position="top" fill="#64748b" fontSize={10} fontWeight={700} formatter={(val: number) => `$${(val / 1000).toFixed(0)}k`} />
                  </Bar>
                  <Bar dataKey="projects" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Proyectos Activos" barSize={40} animationDuration={1200} animationBegin={400}>
                    <LabelList dataKey="projects" position="top" fill="#64748b" fontSize={10} fontWeight={700} />
                  </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Secondary Info / Summary Panel in Analytics */}
        <div className="space-y-6">
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                <h4 className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-4">Resumen del Periodo</h4>
                <div className="space-y-4">
                    <div className="flex justify-between items-end border-b border-blue-200 pb-3">
                        <span className="text-slate-600 text-sm">Ejecución Presupuestaria</span>
                        <span className="text-lg font-bold text-blue-900 tabular-nums">{animatedProgress}%</span>
                    </div>
                     <div className="flex justify-between items-end border-b border-blue-200 pb-3">
                        <span className="text-slate-600 text-sm">Municipios Nuevos</span>
                        <span className="text-lg font-bold text-blue-900">+4</span>
                    </div>
                     <div className="flex justify-between items-end pb-1">
                        <span className="text-slate-600 text-sm">Costo por Beneficiario</span>
                        <span className="text-lg font-bold text-blue-900 tabular-nums">${animatedCost.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Evolución Comparativa</h4>
                <div className="h-[150px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dataByYear} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
                            <Line type="monotone" dataKey="inversion" stroke="#2563eb" strokeWidth={2} dot={{ r: 3, fill: '#2563eb' }} animationDuration={1500}>
                                <LabelList dataKey="inversion" position="top" fill="#64748b" fontSize={9} fontWeight="bold" formatter={(val: number) => `$${(val / 1000).toFixed(0)}k`} />
                            </Line>
                            <Tooltip />
                        </LineChart>
                     </ResponsiveContainer>
                </div>
                <p className="text-xs text-slate-400 mt-2 text-center">Tendencia de inversión últimos 5 años</p>
            </div>
        </div>

      </div>
    </div>
  );
};

export default AnalyticsSection;