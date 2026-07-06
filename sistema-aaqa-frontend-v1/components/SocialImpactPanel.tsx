import React from 'react';
import { useCountUp } from '../hooks/useCountUp';
import { HeartHandshake, FolderCheck, Building, Users } from 'lucide-react';
import EditableText from './EditableText';

const SocialImpactPanel: React.FC = () => {
  const animatedInv = useCountUp(24.8, 1200);
  const animatedProjects = useCountUp(142, 1000);
  const animatedOrgs = useCountUp(89, 1000);
  const animatedBen = useCountUp(3.2, 1200);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* 1. Inversión Social Total */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex items-start space-x-4">
        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
          <HeartHandshake size={24} />
        </div>
        <div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">
            <EditableText 
              category="global" 
              idKey="social_impact_inv_label" 
              defaultText="Inversión Social Total" 
            />
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">${animatedInv.toFixed(1)}M</h3>
        </div>
      </div>

      {/* 2. Proyectos Ejecutados */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex items-start space-x-4">
        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
          <FolderCheck size={24} />
        </div>
        <div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">
            <EditableText 
              category="global" 
              idKey="social_impact_projects_label" 
              defaultText="Proyectos Ejecutados" 
            />
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{animatedProjects}</h3>
        </div>
      </div>

      {/* 3. Organizaciones Apoyadas */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex items-start space-x-4">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
          <Building size={24} />
        </div>
        <div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">
            <EditableText 
              category="global" 
              idKey="social_impact_orgs_label" 
              defaultText="Org. Apoyadas" 
            />
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{animatedOrgs}</h3>
        </div>
      </div>

      {/* 4. Beneficiarios Acumulados */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex items-start space-x-4">
        <div className="p-3 bg-rose-100 text-rose-600 rounded-lg">
          <Users size={24} />
        </div>
        <div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">
            <EditableText 
              category="global" 
              idKey="social_impact_ben_label" 
              defaultText="Beneficiarios Acum." 
            />
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{animatedBen.toFixed(1)}M</h3>
          <p className="text-[10px] text-slate-400 mt-1 leading-tight italic">
            <EditableText 
              category="global" 
              idKey="social_impact_info_text" 
              defaultText="Dato acumulado histórico validado." 
            />
          </p>
        </div>
      </div>

    </div>
  );
};

export default SocialImpactPanel;