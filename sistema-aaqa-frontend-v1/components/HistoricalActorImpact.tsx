import React, { useState } from 'react';
import { ChevronRight, Heart, Users, Zap } from 'lucide-react';
import { useData } from '../contexts/useData';
import { useCountUp } from '../hooks/useCountUp';
import { CategoryType } from '../types';
import EditableText from './EditableText';
import { usePermissions } from '../hooks/usePermissions';

interface HistoricalActorImpactProps {
  onNavigate: (view: CategoryType) => void;
  userData?: any;
  selectedYear?: string;
}

const HistoricalActorImpact: React.FC<HistoricalActorImpactProps> = ({ onNavigate, userData, selectedYear = 'Global' }) => {
  const { data } = useData();
  const permissions = usePermissions();
  
  // Determinar visibilidad según el año seleccionado
  const isHistoricalOnlyONG = React.useMemo(() => {
    if (selectedYear === 'Global') return false;
    const yearInt = parseInt(selectedYear);
    return yearInt >= 2009 && yearInt <= 2017;
  }, [selectedYear]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  const animatedOngInv = useCountUp(data.categories.ong.investment, 1500);
  const animatedOngOrgs = useCountUp(data.categories.ong.orgs, 800);
  const animatedOngProjects = useCountUp(data.categories.ong.projects, 1000);

  const animatedComInv = useCountUp(data.categories.community.investment, 1500);
  const animatedComOrgs = useCountUp(data.categories.community.orgs, 800);
  const animatedComProjects = useCountUp(data.categories.community.projects, 1000);

  const animatedFisInv = useCountUp(data.categories.fis.investment, 1500);
  const animatedFisVentures = useCountUp(data.categories.fis.ventures || 0, 800);
  const animatedFisProjects = useCountUp(data.categories.fis.projects, 1000);
  const canViewONG = permissions.canViewCategory('ONG');
  const canViewCommunity = permissions.canViewCategory('Community');
  const canViewFIS = permissions.canViewCategory('FIS');

  const renderCard = (
    category: CategoryType,
    idPrefix: string,
    title: string,
    subtitle: string,
    icon: React.ReactNode,
    investment: number,
    countLabel: string,
    countValue: number,
    countValue2: { label: string; value: number } | null,
    colorClass: string,
    bgColor: string
  ) => {
    return (
      <div
        onClick={() => onNavigate(category)}
        className="text-left executive-card p-6 flex flex-col h-full group relative cursor-pointer"
      >
        <div className={`absolute top-0 left-0 w-1.5 h-full ${bgColor} opacity-80 group-hover:opacity-100 transition-opacity`}></div>
        
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">
              <EditableText 
                category="global" 
                idKey={`card_${idPrefix}_title`} 
                defaultText={title} 
              />
            </h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold mt-1">
              <EditableText 
                category="global" 
                idKey={`card_${idPrefix}_subtitle`} 
                defaultText={subtitle} 
              />
            </p>
          </div>
          {icon}
        </div>

        <div className="mb-6">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5 opacity-80">
            <EditableText 
                category="global" 
                idKey={`card_${idPrefix}_inv_label`} 
                defaultText="Inversión Histórica" 
              />
          </p>
          <p className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums">{formatCurrency(investment)}</p>
        </div>

        <div className="flex-grow space-y-4 w-full bg-slate-50/50 rounded-2xl p-5 border border-slate-100 transition-all group-hover:bg-white group-hover:shadow-inner group-hover:border-slate-200">
          <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              <EditableText 
                category="global" 
                idKey={`card_${idPrefix}_count1_label`} 
                defaultText={countLabel} 
              />
            </span>
            <span className={`text-lg font-black ${colorClass} tabular-nums`}>{countValue}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              <EditableText 
                category="global" 
                idKey={`card_${idPrefix}_count2_label`} 
                defaultText="Proyectos" 
              />
            </span>
            <span className="text-lg font-black text-brand-orange tabular-nums">{countValue2?.value || countValue}</span>
          </div>
          {countValue2 && category === 'FIS' && (
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                <EditableText 
                  category="global" 
                  idKey={`card_${idPrefix}_count3_label`} 
                  defaultText={countValue2.label} 
                />
              </span>
              <span className="text-lg font-black text-brand-teal tabular-nums">{countValue2.value}</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
            <EditableText 
                category="global" 
                idKey={`card_${idPrefix}_select`} 
                defaultText="Seleccionar" 
              />
          </span>
          <ChevronRight className={`w-5 h-5 transition-transform duration-300 group-hover:translate-x-1 ${colorClass}`} />
        </div>
      </div>
    );
  };

  return (
    <div className={`grid grid-cols-1 ${isHistoricalOnlyONG ? 'md:grid-cols-1 max-w-md mx-auto' : 'md:grid-cols-3'} gap-6`}>
      {canViewONG && renderCard(
        'ONG', 'ong', 'Categoría ONG', 'Impacto Humanitario',
        <Heart className="w-5 h-5 text-brand-red opacity-20 group-hover:opacity-100 transition-opacity" />,
        animatedOngInv, 'Organizaciones', animatedOngOrgs, { label: 'Proyectos', value: animatedOngProjects },
        'text-brand-red', 'gradient-ong'
      )}

      {!isHistoricalOnlyONG && canViewCommunity && renderCard(
        'Community', 'com', 'Desarrollo Comunitario', 'Impacto Territorial',
        <Users className="w-5 h-5 text-brand-yellow opacity-20 group-hover:opacity-100 transition-opacity" />,
        animatedComInv, 'ADESCOS', animatedComOrgs, { label: 'Proyectos', value: animatedComProjects },
        'text-brand-yellow', 'gradient-comunidad'
      )}

      {!isHistoricalOnlyONG && canViewFIS && renderCard(
        'FIS', 'fis', 'Emprendimiento Social', 'Impacto Económico',
        <Zap className="w-5 h-5 text-brand-green opacity-20 group-hover:opacity-100 transition-opacity" />,
        animatedFisInv, 'Emprendimientos', animatedFisVentures, { label: 'Proyectos', value: animatedFisProjects },
        'text-brand-green', 'gradient-emprendimiento'
      )}
    </div>
  );
};

export default HistoricalActorImpact;
