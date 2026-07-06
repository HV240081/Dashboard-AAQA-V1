import React, { useState } from 'react';
import { TrendingUp, CheckCircle2, Building2, Users2, FileHeart, ChevronRight } from 'lucide-react';
import { useData } from '../contexts/useData';
import { useCountUp } from '../hooks/useCountUp';
import EditableText from './EditableText';

interface FinancialPanelProps {
    onViewAllies: () => void;
    userData?: any;
}

const FinancialPanel: React.FC<FinancialPanelProps> = ({ onViewAllies, userData }) => {
    const { data } = useData();

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(val);
    };
    
    const formatInt = (val: number) => {
        return new Intl.NumberFormat('en-US').format(val);
    };

    const totalImpactActual = data.financials.fgk + data.financials.aliados + data.financials.contrapartida;
    
    const animatedImpact = useCountUp(totalImpactActual, 1500);
    const animatedFGK = useCountUp(data.financials.fgk, 1200);
    const animatedAliados = useCountUp(data.financials.aliados, 1200);
    const animatedContra = useCountUp(data.financials.contrapartida, 1200);
    const animatedProjects = useCountUp(data.impact.projects, 1000);
    const animatedOrgs = useCountUp(data.impact.orgs, 1000);
    const animatedBen = useCountUp(data.impact.beneficiaries, 1000);
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="executive-card p-6 flex flex-col justify-between h-full relative group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-blue rounded-l-xl opacity-80"></div>
                    <div>
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-widest pl-2 mb-2">
                            <EditableText 
                                category="global" 
                                idKey="label_fgk_total" 
                                defaultText="Aporte FGK Total Histórico" 
                            />
                        </div>
                        <div className="flex items-baseline gap-1 mt-2 pl-2">
                            <span className="text-xl text-slate-400 font-bold">$</span>
                            <span className="text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-800 tabular-nums">
                                {formatCurrency(animatedFGK).split('.')[0]}
                            </span>
                            <span className="text-lg font-bold text-slate-500">.{formatCurrency(data.financials.fgk).split('.')[1]}</span>
                        </div>
                    </div>
                </div>

                <div 
                    onClick={onViewAllies}
                    className="executive-card p-6 flex flex-col justify-between h-full relative cursor-pointer hover:border-brand-green/30 transition-all group"
                >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-green rounded-l-xl opacity-80"></div>
                    
                    <div className="flex justify-between items-start pl-2">
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">
                            <EditableText 
                                category="global" 
                                idKey="label_aliados_total" 
                                defaultText="Aporte Aliados Total" 
                            />
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-1.5 rounded-full group-hover:bg-brand-green/10 transition-colors shadow-sm">
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-green group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </div>
                    
                    <div className="flex items-baseline gap-1 mt-1 pl-2">
                        <span className="text-xl text-slate-400 font-bold">$</span>
                        <span className="text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-800 tabular-nums">
                            {formatCurrency(animatedAliados).split('.')[0]}
                        </span>
                        <span className="text-lg font-bold text-slate-500">.{formatCurrency(data.financials.aliados).split('.')[1]}</span>
                    </div>
                    <div className="text-[10px] text-brand-green mt-3 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-y-0 translate-y-2 text-right font-bold tracking-widest uppercase">
                        <EditableText 
                            category="global" 
                            idKey="label_explorar_carteras" 
                            defaultText="Explorar Carteras →" 
                        />
                    </div>
                </div>

                <div className="executive-card p-6 flex flex-col justify-between h-full relative group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-red rounded-l-xl opacity-80"></div>
                    
                    <div className="flex justify-between items-start pl-2">
                        <div className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-2">
                            <EditableText 
                                category="global" 
                                idKey="label_contrapartida_org" 
                                defaultText="Contrapartida Org." 
                            />
                        </div>
                        <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded font-mono whitespace-nowrap">
                            <EditableText 
                                category="global" 
                                idKey="label_estimado" 
                                defaultText="Estimado" 
                            />
                        </span>
                    </div>
                    
                    <div className="flex items-baseline gap-1 mt-1 pl-2">
                        <span className="text-xl text-slate-400 font-medium">$</span>
                        <span className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-800 tabular-nums">
                            {formatCurrency(animatedContra).split('.')[0]}
                        </span>
                        <span className="text-lg font-medium text-slate-500">.{formatCurrency(data.financials.contrapartida).split('.')[1]}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-3 font-medium tracking-wide pl-2">
                        <EditableText 
                            category="global" 
                            idKey="label_efectivo_especie" 
                            defaultText="Efectivo + Especie" 
                        />
                    </div>
                </div>
            </div>

            <div className="rounded-2xl p-8 bg-brand-blue text-white shadow-xl relative overflow-hidden group border border-blue-400/30">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors duration-1000"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-2 opacity-80">
                            <EditableText 
                                category="global" 
                                idKey="label_impacto_acumulado" 
                                defaultText="Impacto Financiero Acumulado Total" 
                            />
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl text-blue-200 font-bold">$</span>
                            <span className="text-5xl md:text-6xl font-extrabold tracking-tighter text-white tabular-nums">
                                {formatCurrency(animatedImpact).split('.')[0]}
                            </span>
                            <span className="text-2xl font-bold text-blue-200">.{formatCurrency(totalImpactActual).split('.')[1]}</span>
                        </div>
                    </div>
                    
                    <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl px-5 py-4 flex items-center gap-3 shrink-0 shadow-2xl transition-transform hover:scale-105 duration-500">
                        <CheckCircle2 className="text-white h-5 w-5 animate-pulse" />
                        <span className="text-xs font-bold text-white tracking-widest uppercase">
                            <EditableText 
                                category="global" 
                                idKey="label_inversion_auditada" 
                                defaultText="Inversión Auditada 2025" 
                            />
                        </span>
                    </div>
                </div>
                <div className="absolute -bottom-16 -right-16 text-white opacity-5 pointer-events-none group-hover:opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-1000 ease-out">
                    <TrendingUp size={300} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="executive-card p-5 group">
                    <div className="flex items-center gap-4">
                        <div className="kpi-icon-container p-3 bg-brand-blue/10 border border-brand-blue/20 rounded-xl text-brand-blue shadow-inner group-hover:bg-brand-blue group-hover:text-white transition-all duration-500">
                            <FileHeart size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-slate-800 tracking-tight tabular-nums">{formatInt(animatedProjects)}</p>
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-tight">
                                <EditableText 
                                    category="global" 
                                    idKey="label_proyectos_historicos" 
                                    defaultText="Proyectos Históricos" 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="executive-card p-5 group">
                    <div className="flex items-center gap-4">
                        <div className="kpi-icon-container p-3 bg-brand-orange/10 border border-brand-orange/20 rounded-xl text-brand-orange shadow-inner group-hover:bg-brand-orange group-hover:text-white transition-all duration-500">
                            <Building2 size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-slate-800 tracking-tight tabular-nums">{formatInt(animatedOrgs)}</p>
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-tight">
                                <EditableText 
                                    category="global" 
                                    idKey="label_org_aliadas" 
                                    defaultText="Org. Aliadas" 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="executive-card p-5 group">
                    <div className="flex items-center gap-4">
                        <div className="kpi-icon-container p-3 bg-brand-green/10 border border-brand-green/20 rounded-xl text-brand-green shadow-inner group-hover:bg-brand-green group-hover:text-white transition-all duration-500">
                            <Users2 size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-slate-800 tracking-tight tabular-nums">{formatInt(animatedBen)}</p>
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-tight">
                                <EditableText 
                                    category="global" 
                                    idKey="label_beneficiarios_est" 
                                    defaultText="Beneficiarios Est." 
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancialPanel;
