import React, { useState } from 'react';
import { Star, ShieldCheck, LayoutGrid } from 'lucide-react';
import { useData } from '../contexts/useData';
import { CategoryType } from '../types';
import EditableText from './EditableText';
import { usePermissions } from '../hooks/usePermissions';

interface ProgramEdition2025Props {
    userData?: any;
}

const ProgramEdition2025: React.FC<ProgramEdition2025Props> = ({ userData }) => {
    const { data } = useData();
    const permissions = usePermissions();

    const activeEditionYears = Array.from(new Set((data.editions || [])
        .map((edition) => edition.year)
        .filter((year) => typeof year === 'number' && !Number.isNaN(year))))
        .sort((a, b) => b - a);
    const latestYear = data.editions.find((edition) => edition.isCurrent)?.year
        || (activeEditionYears.length > 0 ? activeEditionYears[0] : new Date().getFullYear());

    const projectsCurrent = data.projectsList.filter(p => p.year === latestYear);

    const getStats = (cat: CategoryType) => {
        const catProjects = projectsCurrent.filter(p => p.category === cat);
        const investment = catProjects.reduce((sum, p) => sum + (Number(p.amountFGK) || 0), 0);
        const count = cat === 'FIS'
            ? catProjects.length
            : new Set(catProjects.map(p => p.organization)).size;
        return { count, investment };
    };

    const stats = {
        ong: getStats('ONG'),
        fis: getStats('FIS'),
        community: getStats('Community')
    };
    const canViewONG = permissions.canViewCategory('ONG');
    const canViewFIS = permissions.canViewCategory('FIS');
    const canViewCommunity = permissions.canViewCategory('Community');

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', {
        style: 'currency', currency: 'USD', maximumFractionDigits: 0
    }).format(val);

    const Card = ({ 
        category, 
        idPrefix,
        title, 
        icon, 
        catStats, 
        colorClass, 
        bgColor, 
        countLabel 
    }: { 
        category: string;
        idPrefix: string;
        title: string;
        icon: React.ReactNode;
        catStats: { count: number; investment: number };
        colorClass: string;
        bgColor: string;
        countLabel: string;
    }) => (
        <div className={`bg-slate-50 rounded-xl border border-slate-200 p-6 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all`}>
            <div className={`absolute top-0 left-0 w-1.5 h-full ${bgColor} group-hover:w-2 transition-all`}></div>
            <div className="space-y-4 relative z-10 w-full pl-2">
                <div className="flex items-center gap-3">
                    <div className={`bg-${colorClass}/10 p-2 rounded-lg border border-${colorClass}/20 text-${colorClass}`}>
                        {icon}
                    </div>
                    <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wider">
                        <EditableText 
                            category="global" 
                            idKey={`editionCurrent_${idPrefix}_title`} 
                            defaultText={title} 
                        />
                    </h3>
                </div>

                <div>
                    <p className={`text-5xl font-bold text-slate-800 tracking-tight transition-colors`}>{catStats.count}</p>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mt-1">
                        <EditableText 
                            category="global" 
                            idKey={`editionCurrent_${idPrefix}_count_label`} 
                            defaultText={countLabel} 
                        />
                    </p>
                </div>

                <div className="pt-4 border-t border-slate-200 mt-2">
                    <p className={`text-[10px] font-bold text-${colorClass} uppercase tracking-widest mb-1`}>
                        <EditableText 
                            category="global" 
                            idKey={`editionCurrent_${idPrefix}_inv_label`} 
                            defaultText={`Inversión ${latestYear}`}
                        />
                    </p>
                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(catStats.investment)}</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm relative overflow-hidden">
            <div className="mb-8 relative z-10 border-b border-slate-100 pb-4 flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-8 bg-brand-blue rounded-full"></div>
                        <h2 className="text-3xl font-display font-bold text-slate-800 tracking-tight">
                            <EditableText 
                                category="global" 
                                idKey="editionCurrent_main_title" 
                                defaultText="Edición Vigente" 
                            /> <span className="text-brand-blue">{latestYear}</span>
                        </h2>
                    </div>
                    <p className="text-sm text-slate-500 mt-2 font-semibold tracking-widest uppercase ml-5">
                        <EditableText 
                            category="global" 
                            idKey="editionCurrent_main_description" 
                            defaultText={`Proyectos en ejecución actual (Fondos otorgados ${latestYear})`} 
                        />
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                {canViewONG && <Card
                    category="ong"
                    idPrefix="ong"
                    title="Categoría ONG"
                    icon={<Star className="w-5 h-5" />}
                    catStats={stats.ong}
                    colorClass="brand-red"
                    bgColor="gradient-ong"
                    countLabel="Org. Apoyadas"
                />}
                {canViewFIS && <Card
                    category="fis"
                    idPrefix="fis"
                    title="Emprendimiento"
                    icon={<ShieldCheck className="w-5 h-5" />}
                    catStats={stats.fis}
                    colorClass="brand-green"
                    bgColor="gradient-emprendimiento"
                    countLabel="Carpetas Activas"
                />}
                {canViewCommunity && <Card
                    category="community"
                    idPrefix="com"
                    title="Desarrollo Comunitario"
                    icon={<LayoutGrid className="w-5 h-5" />}
                    catStats={stats.community}
                    colorClass="brand-lightgreen"
                    bgColor="gradient-comunidad"
                    countLabel="Org. Locales"
                />}
            </div>
        </div>
    );
};

export default ProgramEdition2025;
