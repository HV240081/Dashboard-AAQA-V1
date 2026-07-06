import React, { useMemo, useRef, useState } from 'react';
import { useData } from '../contexts/useData';
import { CommunityCorte, CommunityAdesco, AdescoParticipant } from '../types';
import {
  MapPin,
  Calendar,
  Users,
  Target,
  Plus,
  ChevronLeft,
  Building,
  Trash2,
  Edit2,
  UserPlus,
  GraduationCap,
  X,
  Upload,
} from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import EditableText from './EditableText';

interface CommunityCortesModuleProps {
  userData?: any;
}

const normalizeDateValue = (value?: string | Date | null) => {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  const text = String(value).trim();
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (text.includes('T')) return text.split('T')[0];
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString().split('T')[0];
};

const tempId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const CommunityCortesModule: React.FC<CommunityCortesModuleProps> = ({ userData }) => {
  const { data, updateCommunityCortes, deleteCommunityCorte, uploadCommunityCortesExcel } = useData();
  const cortes = data.communityCortes || [];
  const availableEditionYears = useMemo(() => {
    const years = Array.isArray(data.availableYears) ? data.availableYears : [];
    const filtered = years
      .filter(year => Number(year) >= 2018 && Number(year) <= 2100)
      .sort((a, b) => b - a);
    return filtered.length > 0
      ? filtered
      : Array.from({ length: 2100 - 2018 + 1 }, (_, i) => 2018 + i).reverse();
  }, [data.availableYears]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { canEditFormative } = usePermissions();
  const canEditCortes = canEditFormative('cortes');

  const [selectedEditionYear, setSelectedEditionYear] = useState<number>(2025);
  const [selectedCorteId, setSelectedCorteId] = useState<string | null>(null);
  const [selectedAdescoId, setSelectedAdescoId] = useState<string | null>(null);
  const [isCreatingCorte, setIsCreatingCorte] = useState(false);
  const [isCreatingAdesco, setIsCreatingAdesco] = useState(false);
  const [isEditingCorteDetails, setIsEditingCorteDetails] = useState(false);
  const [editingAdescoId, setEditingAdescoId] = useState<string | null>(null);
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [isUploadingBulk, setIsUploadingBulk] = useState(false);

  const [corteForm, setCorteForm] = useState<Partial<CommunityCorte>>({
    name: '',
    year: 2025,
    startDate: '',
    endDate: '',
    location: '',
    allyName: '',
    status: 'Planificacion' as any,
  });

  const [editCorteForm, setEditCorteForm] = useState<Partial<CommunityCorte>>({});
  const [adescoForm, setAdescoForm] = useState<Partial<CommunityAdesco>>({
    year: 2025,
    name: '',
    participantsCount: 0,
    graduatesCount: 0,
    femaleCount: 0,
    maleCount: 0,
  });
  const [editAdescoForm, setEditAdescoForm] = useState<Partial<CommunityAdesco>>({});

  const [newParticipantForm, setNewParticipantForm] = useState<any>({
    name: '',
    role: '',
    phone: '',
    district: '',
    department: '',
    gender: 'M',
  });
  const [editParticipantForm, setEditParticipantForm] = useState<any>({});

  const visibleCortes = useMemo(
    () => cortes.filter(corte => Number(corte.year || selectedEditionYear) === selectedEditionYear),
    [cortes, selectedEditionYear]
  );

  const selectedCorte = useMemo(
    () => cortes.find(c => c.id === selectedCorteId),
    [cortes, selectedCorteId]
  );
  const visibleSelectedCorte = useMemo(
    () => visibleCortes.find(c => c.id === selectedCorteId),
    [visibleCortes, selectedCorteId]
  );
  const activeCorte = visibleSelectedCorte || selectedCorte;

  const statusColors: Record<string, string> = {
    'Planificacion': 'bg-slate-100 text-slate-700 border-slate-200',
    'Planificación': 'bg-slate-100 text-slate-700 border-slate-200',
    'En Curso': 'bg-blue-50 text-blue-700 border-blue-200',
    'Finalizado': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  const formatMetrics = (corte: CommunityCorte) => {
    const totalAdescos = corte.adescos?.length || 0;
    const totalParticipants = (corte.adescos || []).reduce((acc, ad) => acc + (ad.participantsCount || 0), 0);
    const totalGraduates = (corte.adescos || []).reduce((acc, ad) => acc + (ad.graduatesCount || 0), 0);
    const gradRate = totalParticipants > 0 ? (totalGraduates / totalParticipants) * 100 : 0;
    return { totalAdescos, totalParticipants, totalGraduates, gradRate };
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBulk(true);
    try {
      const result = await uploadCommunityCortesExcel(file);
      const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
      if (warnings.length > 0) {
        alert(`Carga completada con observaciones:\n\n${warnings.join('\n')}`);
      } else {
        alert(result?.message || 'Cortes comunitarios y ADESCOS importados correctamente.');
      }
    } finally {
      setIsUploadingBulk(false);
      e.target.value = '';
    }
  };

  const handleCreateCorte = (e: React.FormEvent) => {
    e.preventDefault();
    const newCorte: CommunityCorte = {
      id: tempId('corte'),
      name: corteForm.name || 'Sin nombre',
      year: Number(corteForm.year || selectedEditionYear || 2025),
      startDate: normalizeDateValue(corteForm.startDate),
      endDate: normalizeDateValue(corteForm.endDate),
      location: corteForm.location || '',
      allyName: corteForm.allyName || '',
      status: (corteForm.status as any) || 'Planificacion',
      adescos: [],
    };

    updateCommunityCortes([...cortes, newCorte]);
    setIsCreatingCorte(false);
    setCorteForm({
      name: '',
      year: selectedEditionYear,
      startDate: '',
      endDate: '',
      location: '',
      allyName: '',
      status: 'Planificacion' as any,
    });
  };

  const handleDeleteCorte = (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este corte? Esta acción no se puede deshacer.')) return;
    deleteCommunityCorte(id)
      .then(() => {
        if (selectedCorteId === id) setSelectedCorteId(null);
      });
  };

  const handleEditCorteSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCorteId) return;
    const updatedCortes = cortes.map(corte => {
      if (corte.id !== selectedCorteId) return corte;
      return {
        ...corte,
        name: editCorteForm.name || corte.name,
        year: Number(editCorteForm.year || corte.year || selectedEditionYear),
        startDate: normalizeDateValue(editCorteForm.startDate || corte.startDate),
        endDate: normalizeDateValue(editCorteForm.endDate || corte.endDate),
        location: editCorteForm.location || corte.location,
        allyName: editCorteForm.allyName || corte.allyName,
        status: (editCorteForm.status as any) || corte.status,
      };
    });
    updateCommunityCortes(updatedCortes);
    setIsEditingCorteDetails(false);
  };

  const handleCreateAdesco = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCorteId || !activeCorte) return;
    const year = Number(adescoForm.year || selectedEditionYear || activeCorte.year || 2025);
    const newAdesco: CommunityAdesco = {
      id: tempId('adesco'),
      year,
      name: adescoForm.name || 'ADESCO Sin nombre',
      participantsCount: Number(adescoForm.participantsCount || 0),
      graduatesCount: Number(adescoForm.graduatesCount || 0),
      femaleCount: Number(adescoForm.femaleCount || 0),
      maleCount: Number(adescoForm.maleCount || 0),
      participants: [],
    };

    const updatedCortes = cortes.map(corte => {
      if (corte.id !== selectedCorteId) return corte;
      return { ...corte, adescos: [...(corte.adescos || []), newAdesco] };
    });

    updateCommunityCortes(updatedCortes);
    setIsCreatingAdesco(false);
    setAdescoForm({
      year,
      name: '',
      participantsCount: 0,
      graduatesCount: 0,
      femaleCount: 0,
      maleCount: 0,
    });
  };

  const handleDeleteAdesco = (corteId: string, adescoId: string) => {
    if (!confirm('¿Eliminar esta ADESCO?')) return;
    const updatedCortes = cortes.map(corte => {
      if (corte.id !== corteId) return corte;
      return { ...corte, adescos: (corte.adescos || []).filter(a => a.id !== adescoId) };
    });
    updateCommunityCortes(updatedCortes);
    if (selectedAdescoId === adescoId) setSelectedAdescoId(null);
  };

  const handleEditAdescoSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCorteId || !editingAdescoId) return;
    const updatedCortes = cortes.map(corte => {
      if (corte.id !== selectedCorteId) return corte;
      return {
        ...corte,
        adescos: (corte.adescos || []).map(adesco => {
          if (adesco.id !== editingAdescoId) return adesco;
          return {
            ...adesco,
            name: editAdescoForm.name || adesco.name,
            year: Number(editAdescoForm.year || adesco.year || selectedEditionYear),
            participantsCount: Number(editAdescoForm.participantsCount || adesco.participantsCount || 0),
            graduatesCount: Number(editAdescoForm.graduatesCount || adesco.graduatesCount || 0),
            femaleCount: Number(editAdescoForm.femaleCount || adesco.femaleCount || 0),
            maleCount: Number(editAdescoForm.maleCount || adesco.maleCount || 0),
          };
        }),
      };
    });
    updateCommunityCortes(updatedCortes);
    setEditingAdescoId(null);
    setEditAdescoForm({});
  };

  const handleAddParticipantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCorteId || !selectedAdescoId) return;
    const updatedCortes = cortes.map(corte => {
      if (corte.id !== selectedCorteId) return corte;
      return {
        ...corte,
        adescos: (corte.adescos || []).map(adesco => {
          if (adesco.id !== selectedAdescoId) return adesco;
          const newPart: AdescoParticipant = {
            id: tempId('part'),
            name: newParticipantForm.name || 'Sin nombre',
            role: newParticipantForm.role || '',
            phone: newParticipantForm.phone || '',
            district: newParticipantForm.district || '',
            department: newParticipantForm.department || '',
            gender: newParticipantForm.gender || 'M',
          };
          const participants = [...(adesco.participants || []), newPart];
          return {
            ...adesco,
            participants,
            participantsCount: participants.length,
            maleCount: participants.filter(p => p.gender === 'M').length,
            femaleCount: participants.filter(p => p.gender === 'F').length,
          };
        }),
      };
    });
    updateCommunityCortes(updatedCortes);
    setIsAddingParticipant(false);
    setNewParticipantForm({ name: '', role: '', phone: '', district: '', department: '', gender: 'M' });
  };

  const handleSaveParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCorteId || !selectedAdescoId || !editingParticipantId) return;
    const updatedCortes = cortes.map(corte => {
      if (corte.id !== selectedCorteId) return corte;
      return {
        ...corte,
        adescos: (corte.adescos || []).map(adesco => {
          if (adesco.id !== selectedAdescoId) return adesco;
          const updatedParticipants = (adesco.participants || []).map(part => {
            if (part.id !== editingParticipantId) return part;
            return {
              ...part,
              name: editParticipantForm.name || part.name,
              role: editParticipantForm.role || part.role,
              phone: editParticipantForm.phone || part.phone,
              district: editParticipantForm.district || part.district,
              department: editParticipantForm.department || part.department,
              gender: editParticipantForm.gender || part.gender,
            };
          });
          return {
            ...adesco,
            participants: updatedParticipants,
            participantsCount: updatedParticipants.length,
            maleCount: updatedParticipants.filter(p => p.gender === 'M').length,
            femaleCount: updatedParticipants.filter(p => p.gender === 'F').length,
          };
        }),
      };
    });
    updateCommunityCortes(updatedCortes);
    setEditingParticipantId(null);
    setEditParticipantForm({});
  };

  const handleDeleteParticipant = (participantId: string) => {
    if (!selectedCorteId || !selectedAdescoId) return;
    if (!confirm('¿Eliminar este participante?')) return;
    const updatedCortes = cortes.map(corte => {
      if (corte.id !== selectedCorteId) return corte;
      return {
        ...corte,
        adescos: (corte.adescos || []).map(adesco => {
          if (adesco.id !== selectedAdescoId) return adesco;
          const updatedParticipants = (adesco.participants || []).filter(part => part.id !== participantId);
          return {
            ...adesco,
            participants: updatedParticipants,
            participantsCount: updatedParticipants.length,
            maleCount: updatedParticipants.filter(p => p.gender === 'M').length,
            femaleCount: updatedParticipants.filter(p => p.gender === 'F').length,
          };
        }),
      };
    });
    updateCommunityCortes(updatedCortes);
  };

  const handleOpenAdescoModal = (adesco: CommunityAdesco) => {
    if (!selectedCorte) return;
    setSelectedAdescoId(adesco.id);
    setIsAddingParticipant(false);
    setEditingParticipantId(null);
  };

  const renderDetail = () => {
    if (!activeCorte) return null;
    const metrics = formatMetrics(activeCorte);
    const corteAdescos = (activeCorte.adescos || []).filter(adesco => Number(adesco.year || activeCorte.year) === selectedEditionYear);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
        <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
          <button
            onClick={() => setSelectedCorteId(null)}
            className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          {isEditingCorteDetails ? (
            <form onSubmit={handleEditCorteSave} className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre del Corte</label>
                  <input type="text" value={editCorteForm.name || ''} onChange={e => setEditCorteForm({ ...editCorteForm, name: e.target.value })} className="w-full p-2 border border-slate-300 rounded text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Edicion</label>
                  <select value={editCorteForm.year || activeCorte.year || selectedEditionYear} onChange={e => setEditCorteForm({ ...editCorteForm, year: parseInt(e.target.value, 10) })} className="w-full p-2 border border-slate-300 rounded text-sm bg-white">
                    {availableEditionYears.map(year => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Aliado / Coordinador</label>
                  <input type="text" value={editCorteForm.allyName || ''} onChange={e => setEditCorteForm({ ...editCorteForm, allyName: e.target.value })} className="w-full p-2 border border-slate-300 rounded text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Lugar de Formacion</label>
                  <input type="text" value={editCorteForm.location || ''} onChange={e => setEditCorteForm({ ...editCorteForm, location: e.target.value })} className="w-full p-2 border border-slate-300 rounded text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha Inicio</label>
                  <input type="date" value={editCorteForm.startDate || ''} onChange={e => setEditCorteForm({ ...editCorteForm, startDate: e.target.value })} className="w-full p-2 border border-slate-300 rounded text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha Fin</label>
                  <input type="date" value={editCorteForm.endDate || ''} onChange={e => setEditCorteForm({ ...editCorteForm, endDate: e.target.value })} className="w-full p-2 border border-slate-300 rounded text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Estado</label>
                  <select value={editCorteForm.status || 'Planificacion'} onChange={e => setEditCorteForm({ ...editCorteForm, status: e.target.value as any })} className="w-full p-2 border border-slate-300 rounded text-sm bg-white">
                    <option value="Planificacion">Planificacion</option>
                    <option value="En Curso">En Curso</option>
                    <option value="Finalizado">Finalizado</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setIsEditingCorteDetails(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded text-sm font-medium">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded text-sm font-medium hover:bg-slate-800">Guardar Cambios</button>
              </div>
            </form>
          ) : (
            <div className="flex-1 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-slate-900">{activeCorte.name}</h2>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${statusColors[activeCorte.status] || statusColors['Planificacion']}`}>{activeCorte.status}</span>
                  {canEditCortes && (
                    <button onClick={() => { setEditCorteForm({ ...activeCorte }); setIsEditingCorteDetails(true); }} className="p-1 text-slate-400 hover:text-brand-yellow hover:bg-slate-100 rounded transition-colors" title="Editar Corte">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-500 flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {activeCorte.location}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {activeCorte.startDate} a {activeCorte.endDate}</span>
                  <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5" /> {activeCorte.allyName}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-brand-yellow font-mono">{metrics.totalAdescos}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-1">Total ADESCOS</p>
            </div>
            <Building className="w-8 h-8 text-yellow-100" />
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-slate-800 font-mono">{metrics.totalParticipants}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-1">Inscritos</p>
            </div>
            <Users className="w-8 h-8 text-blue-100" />
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-emerald-600 font-mono">{metrics.totalGraduates}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-1">Formados</p>
            </div>
            <GraduationCap className="w-8 h-8 text-emerald-100" />
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-slate-800 font-mono">{metrics.gradRate.toFixed(1)}%</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-1">Tasa Graduacion</p>
            </div>
            <Target className="w-8 h-8 text-slate-100" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-3 justify-between items-center">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <EditableText category="dc" idKey="adescos_title" defaultText="ADESCOS Participantes" />
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Edicion</span>
              <select value={selectedEditionYear} onChange={e => setSelectedEditionYear(parseInt(e.target.value, 10))} className="w-28 p-1.5 border border-slate-300 rounded text-xs bg-white">
                {availableEditionYears.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
            {canEditCortes && (
              <button onClick={() => { setIsCreatingAdesco(!isCreatingAdesco); setAdescoForm(prev => ({ ...prev, year: selectedEditionYear })); }} className="px-3 py-1.5 bg-brand-yellow hover:brightness-110 text-slate-900 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Agregar ADESCO
              </button>
            )}
          </div>

          {isCreatingAdesco && canEditCortes && (
            <div className="p-4 bg-yellow-50/50 border-b border-yellow-100">
              <form onSubmit={handleCreateAdesco} className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre de ADESCO</label>
                  <input required type="text" value={adescoForm.name || ''} onChange={e => setAdescoForm({ ...adescoForm, name: e.target.value })} className="w-full p-2 border border-slate-300 rounded text-sm bg-white" placeholder="Ej: ADESCO El Progreso" />
                </div>
                <div className="w-28">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Edicion</label>
                  <select required value={adescoForm.year || selectedEditionYear} onChange={e => setAdescoForm({ ...adescoForm, year: parseInt(e.target.value, 10) })} className="w-full p-2 border border-slate-300 rounded text-sm bg-white">
                    {availableEditionYears.map(year => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Inscritos</label>
                  <input required type="number" min="0" value={adescoForm.participantsCount || 0} onChange={e => setAdescoForm({ ...adescoForm, participantsCount: parseInt(e.target.value, 10) || 0 })} className="w-full p-2 border border-slate-300 rounded text-sm bg-white" />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Graduados</label>
                  <input required type="number" min="0" value={adescoForm.graduatesCount || 0} onChange={e => setAdescoForm({ ...adescoForm, graduatesCount: parseInt(e.target.value, 10) || 0 })} className="w-full p-2 border border-slate-300 rounded text-sm bg-white" />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Hombres</label>
                  <input required type="number" min="0" value={adescoForm.maleCount || 0} onChange={e => setAdescoForm({ ...adescoForm, maleCount: parseInt(e.target.value, 10) || 0 })} className="w-full p-2 border border-slate-300 rounded text-sm bg-white" />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Mujeres</label>
                  <input required type="number" min="0" value={adescoForm.femaleCount || 0} onChange={e => setAdescoForm({ ...adescoForm, femaleCount: parseInt(e.target.value, 10) || 0 })} className="w-full p-2 border border-slate-300 rounded text-sm bg-white" />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsCreatingAdesco(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded text-sm font-medium">Cancelar</button>
                  <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded text-sm font-medium hover:bg-slate-800">Guardar</button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                  <th className="p-4">ADESCO</th>
                  <th className="p-4 text-center">Edicion</th>
                  <th className="p-4 text-center">Inscritos</th>
                  <th className="p-4 text-center">Formados</th>
                  <th className="p-4 text-center">Retencion</th>
                  <th className="p-4 text-center">Genero (H/M)</th>
                  {canEditCortes && <th className="p-4 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="text-sm">
                {corteAdescos.length === 0 ? (
                  <tr>
                    <td colSpan={canEditCortes ? 7 : 6} className="p-8 text-center text-slate-400">
                      No hay ADESCOS registradas en este corte.
                    </td>
                  </tr>
                ) : (
                  corteAdescos.map(adesco => {
                    if (editingAdescoId === adesco.id) {
                      return (
                        <tr key={adesco.id} className="border-b border-yellow-100 bg-yellow-50/30">
                          <td className="p-2">
                            <input required type="text" value={editAdescoForm.name || ''} onChange={e => setEditAdescoForm({ ...editAdescoForm, name: e.target.value })} className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white font-medium" />
                          </td>
                          <td className="p-2 text-center">
                            <select value={editAdescoForm.year || adesco.year || selectedEditionYear} onChange={e => setEditAdescoForm({ ...editAdescoForm, year: parseInt(e.target.value, 10) })} className="w-24 p-1.5 border border-slate-300 rounded text-sm bg-white text-center">
                              {availableEditionYears.map(year => <option key={year} value={year}>{year}</option>)}
                            </select>
                          </td>
                          <td className="p-2 text-center">
                            <input required type="number" min="0" value={editAdescoForm.participantsCount || 0} onChange={e => setEditAdescoForm({ ...editAdescoForm, participantsCount: parseInt(e.target.value, 10) || 0 })} className="w-20 p-1.5 border border-slate-300 rounded text-sm text-center bg-white font-mono" />
                          </td>
                          <td className="p-2 text-center">
                            <input required type="number" min="0" value={editAdescoForm.graduatesCount || 0} onChange={e => setEditAdescoForm({ ...editAdescoForm, graduatesCount: parseInt(e.target.value, 10) || 0 })} className="w-20 p-1.5 border border-slate-300 rounded text-sm text-center bg-white font-mono text-emerald-600 font-bold" />
                          </td>
                          <td className="p-2 text-center">
                            <span className="text-xs text-slate-400 font-semibold font-mono">Calculado</span>
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <input required type="number" min="0" value={editAdescoForm.maleCount || 0} onChange={e => setEditAdescoForm({ ...editAdescoForm, maleCount: parseInt(e.target.value, 10) || 0 })} className="w-12 p-1 border border-slate-300 rounded text-xs text-center text-blue-600 bg-white font-mono" placeholder="H" />
                              <span className="text-slate-400">/</span>
                              <input required type="number" min="0" value={editAdescoForm.femaleCount || 0} onChange={e => setEditAdescoForm({ ...editAdescoForm, femaleCount: parseInt(e.target.value, 10) || 0 })} className="w-12 p-1 border border-slate-300 rounded text-xs text-center text-pink-600 bg-white font-mono" placeholder="M" />
                            </div>
                          </td>
                          <td className="p-2 text-right">
                            <div className="flex gap-1 justify-end">
                              <button onClick={handleEditAdescoSave} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-sm">OK</button>
                              <button onClick={() => setEditingAdescoId(null)} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded text-xs font-medium">X</button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={adesco.id} onClick={() => handleOpenAdescoModal(adesco)} className="border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer">
                        <td className="p-4 font-medium text-slate-900">
                          {adesco.name}
                          <div className="text-[10px] text-slate-400 font-mono mt-1">Edicion {adesco.year || selectedEditionYear}</div>
                        </td>
                        <td className="p-4 text-center text-slate-600 font-mono">{adesco.year || selectedEditionYear}</td>
                        <td className="p-4 text-center text-slate-600 font-mono">{adesco.participantsCount}</td>
                        <td className="p-4 text-center text-emerald-600 font-mono font-bold">{adesco.graduatesCount}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${(adesco.graduatesCount / (adesco.participantsCount || 1)) >= 0.8 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {((adesco.graduatesCount / (adesco.participantsCount || 1)) * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="p-4 text-center text-slate-500 font-mono text-xs">
                          <span className="text-blue-600">{adesco.maleCount}</span> / <span className="text-pink-600">{adesco.femaleCount}</span>
                        </td>
                        {canEditCortes && (
                          <td className="p-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <button onClick={e => { e.stopPropagation(); setEditAdescoForm({ ...adesco }); setEditingAdescoId(adesco.id); }} className="p-1.5 text-slate-400 hover:text-brand-yellow hover:bg-slate-100 rounded transition-colors" title="Editar ADESCO">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={e => { e.stopPropagation(); handleDeleteAdesco(activeCorte.id, adesco.id); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Eliminar ADESCO">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedAdescoId && activeCorte && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              {(() => {
                const adesco = activeCorte.adescos.find(a => a.id === selectedAdescoId);
                if (!adesco) return null;
                const participants = adesco.participants || [];
                return (
                  <>
                    <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">Participantes de {adesco.name}</h2>
                        <p className="text-sm text-slate-500 mt-1">
                          {(participants.length > 0)
                            ? 'Detalle de inscritos en este corte.'
                            : 'Aún no hay participantes registrados. Agregue personas manualmente.'}
                        </p>
                      </div>
                      <div className="flex items-center">
                        {canEditCortes && (
                          <button onClick={() => setIsAddingParticipant(!isAddingParticipant)} className="px-3 py-1.5 bg-brand-yellow hover:brightness-110 text-slate-900 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors mr-4">
                            <Plus className="w-3.5 h-3.5" /> Agregar Persona
                          </button>
                        )}
                        <button onClick={() => { setSelectedAdescoId(null); setIsAddingParticipant(false); }} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition-colors">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                      {isAddingParticipant && canEditCortes && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-4 animate-in fade-in slide-in-from-top-2">
                          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide mb-3">Nuevo Participante</h4>
                          <form onSubmit={handleAddParticipantSubmit} className="flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-[200px]">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre Completo</label>
                              <input required type="text" value={newParticipantForm.name} onChange={e => setNewParticipantForm({ ...newParticipantForm, name: e.target.value })} className="w-full p-2 border border-slate-300 rounded text-sm bg-white" placeholder="Ej: Maria Perez" />
                            </div>
                            <div className="w-40">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cargo</label>
                              <input type="text" value={newParticipantForm.role} onChange={e => setNewParticipantForm({ ...newParticipantForm, role: e.target.value })} className="w-full p-2 border border-slate-300 rounded text-sm bg-white" placeholder="Ej: Vocal" />
                            </div>
                            <div className="w-36">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Contacto</label>
                              <input type="text" value={newParticipantForm.phone} onChange={e => setNewParticipantForm({ ...newParticipantForm, phone: e.target.value })} className="w-full p-2 border border-slate-300 rounded text-sm bg-white" placeholder="Ej: 7123-4567" />
                            </div>
                            <div className="w-32">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Distrito</label>
                              <input type="text" value={newParticipantForm.district} onChange={e => setNewParticipantForm({ ...newParticipantForm, district: e.target.value })} className="w-full p-2 border border-slate-300 rounded text-sm bg-white" placeholder="Distrito" />
                            </div>
                            <div className="w-32">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Departamento</label>
                              <input type="text" value={newParticipantForm.department} onChange={e => setNewParticipantForm({ ...newParticipantForm, department: e.target.value })} className="w-full p-2 border border-slate-300 rounded text-sm bg-white" placeholder="Departamento" />
                            </div>
                            <div className="w-28">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Genero</label>
                              <select value={newParticipantForm.gender} onChange={e => setNewParticipantForm({ ...newParticipantForm, gender: e.target.value })} className="w-full p-2 border border-slate-300 rounded text-sm bg-white">
                                <option value="M">Hombre</option>
                                <option value="F">Mujer</option>
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => setIsAddingParticipant(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded text-sm font-medium">Cancelar</button>
                              <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded text-sm font-medium hover:bg-slate-800">Agregar</button>
                            </div>
                          </form>
                        </div>
                      )}

                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                                <th className="p-4">Nombre Completo</th>
                                <th className="p-4">Cargo</th>
                                <th className="p-4">Contacto</th>
                                <th className="p-4">Distrito</th>
                                <th className="p-4">Departamento</th>
                                <th className="p-4">Genero</th>
                                {canEditCortes && <th className="p-4 text-right">Acciones</th>}
                              </tr>
                            </thead>
                            <tbody className="text-sm">
                              {participants.length === 0 ? (
                                <tr>
                                  <td colSpan={canEditCortes ? 7 : 6} className="p-8 text-center text-slate-400">
                                    <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                    No hay inscritos en esta ADESCO.
                                  </td>
                                </tr>
                              ) : (
                                participants.map(part => {
                                  if (editingParticipantId === part.id) {
                                    return (
                                      <tr key={part.id} className="border-b border-yellow-100 bg-yellow-50/30">
                                        <td className="p-2">
                                          <input type="text" value={editParticipantForm.name || ''} onChange={e => setEditParticipantForm({ ...editParticipantForm, name: e.target.value })} className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white font-medium" />
                                        </td>
                                        <td className="p-2">
                                          <input type="text" value={editParticipantForm.role || ''} onChange={e => setEditParticipantForm({ ...editParticipantForm, role: e.target.value })} className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white" />
                                        </td>
                                        <td className="p-2">
                                          <input type="text" value={editParticipantForm.phone || ''} onChange={e => setEditParticipantForm({ ...editParticipantForm, phone: e.target.value })} className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white font-mono" />
                                        </td>
                                        <td className="p-2">
                                          <input type="text" value={editParticipantForm.district || ''} onChange={e => setEditParticipantForm({ ...editParticipantForm, district: e.target.value })} className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white" />
                                        </td>
                                        <td className="p-2">
                                          <input type="text" value={editParticipantForm.department || ''} onChange={e => setEditParticipantForm({ ...editParticipantForm, department: e.target.value })} className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white" />
                                        </td>
                                        <td className="p-2">
                                          <select value={editParticipantForm.gender || 'M'} onChange={e => setEditParticipantForm({ ...editParticipantForm, gender: e.target.value })} className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white font-semibold">
                                            <option value="M">Hombre</option>
                                            <option value="F">Mujer</option>
                                          </select>
                                        </td>
                                        <td className="p-2 text-right">
                                          <div className="flex gap-1 justify-end">
                                            <button onClick={handleSaveParticipant} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-sm">OK</button>
                                            <button onClick={() => setEditingParticipantId(null)} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded text-xs font-medium">X</button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  }

                                  return (
                                    <tr key={part.id} className="border-b border-slate-100 hover:bg-slate-50">
                                      <td className="p-4 font-medium text-slate-900">{part.name}</td>
                                      <td className="p-4 text-slate-600">{part.role || '-'}</td>
                                      <td className="p-4 text-slate-600">{part.phone || '-'}</td>
                                      <td className="p-4 text-slate-600">{part.district || '-'}</td>
                                      <td className="p-4 text-slate-600">{part.department || '-'}</td>
                                      <td className="p-4 text-slate-600">{part.gender || '-'}</td>
                                      {canEditCortes && (
                                        <td className="p-4 text-right">
                                          <div className="flex gap-2 justify-end">
                                            <button onClick={() => { setEditParticipantForm({ ...part }); setEditingParticipantId(part.id); }} className="p-1.5 text-slate-400 hover:text-brand-yellow hover:bg-slate-100 rounded transition-colors" title="Editar Participante">
                                              <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteParticipant(part.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Eliminar Participante">
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleBulkUpload}
      />

      {isCreatingCorte && canEditCortes && (
        <div className="bg-white p-6 rounded-xl border border-yellow-200 shadow-sm animate-in fade-in slide-in-from-top-2">
          <h4 className="font-bold text-slate-800 mb-4">Informacion del Nuevo Corte</h4>
          <form onSubmit={handleCreateCorte} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre del Corte</label>
              <input required type="text" value={corteForm.name || ''} onChange={e => setCorteForm({ ...corteForm, name: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" placeholder="Ej: Corte Zona Oriental 2025" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Edicion</label>
              <select required value={corteForm.year || selectedEditionYear} onChange={e => setCorteForm({ ...corteForm, year: parseInt(e.target.value, 10) })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white">
                {availableEditionYears.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Aliado / Coordinador</label>
              <input type="text" value={corteForm.allyName || ''} onChange={e => setCorteForm({ ...corteForm, allyName: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" placeholder="Ej: FUSALMO" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Lugar de Formacion</label>
              <input type="text" value={corteForm.location || ''} onChange={e => setCorteForm({ ...corteForm, location: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" placeholder="Ej: Centro Comunitario X" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha Inicio</label>
              <input type="date" value={corteForm.startDate || ''} onChange={e => setCorteForm({ ...corteForm, startDate: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha Fin</label>
              <input type="date" value={corteForm.endDate || ''} onChange={e => setCorteForm({ ...corteForm, endDate: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Estado</label>
              <select value={corteForm.status || 'Planificacion'} onChange={e => setCorteForm({ ...corteForm, status: e.target.value as any })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white">
                <option value="Planificacion">Planificacion</option>
                <option value="En Curso">En Curso</option>
                <option value="Finalizado">Finalizado</option>
              </select>
            </div>
            <div className="col-span-full flex justify-end gap-3 mt-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setIsCreatingCorte(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm transition-colors">Cancelar</button>
              <button type="submit" className="px-5 py-2.5 bg-slate-900 text-white rounded-lg font-bold text-sm shadow-sm hover:bg-slate-800 transition-colors">Guardar Corte</button>
            </div>
          </form>
        </div>
      )}

      {selectedCorteId ? (
        renderDetail()
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Edicion</span>
              <select value={selectedEditionYear} onChange={e => setSelectedEditionYear(parseInt(e.target.value, 10))} className="w-28 p-1.5 border border-slate-300 rounded text-xs bg-white">
                {availableEditionYears.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              {canEditCortes && (
                <button onClick={() => setIsCreatingCorte(!isCreatingCorte)} className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Nuevo Corte
                </button>
              )}
              {canEditCortes && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingBulk}
                  className="px-3 py-1.5 bg-brand-yellow hover:brightness-110 text-slate-900 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-60"
                >
                  <Upload className="w-3.5 h-3.5" /> {isUploadingBulk ? 'Subiendo...' : 'Cargar Excel'}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {visibleCortes.map(corte => {
              const metrics = formatMetrics(corte);
              return (
                <div key={corte.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group flex flex-col cursor-pointer" onClick={() => setSelectedCorteId(corte.id)}>
                  <div className="p-5 border-b border-slate-100 flex-grow">
                    <div className="flex justify-between items-start mb-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusColors[corte.status] || statusColors['Planificacion']}`}>{corte.status}</span>
                      {canEditCortes && (
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteCorte(corte.id); }} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 text-base leading-tight mb-2 line-clamp-2 group-hover:text-brand-yellow transition-colors">{corte.name}</h4>
                    <div className="space-y-1.5 mt-4 text-xs text-slate-500">
                      <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> <span className="line-clamp-1">{corte.location || 'Sin lugar asignado'}</span></div>
                      <div className="flex items-center gap-2"><Building className="w-3.5 h-3.5" /> <span className="line-clamp-1">{corte.allyName || 'Sin aliado asignado'}</span></div>
                      <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> <span>{corte.startDate || '-'} / {corte.endDate || '-'}</span></div>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 shrink-0 grid grid-cols-3 gap-2 divide-x divide-slate-200 text-center">
                    <div>
                      <p className="text-lg font-bold text-slate-700 font-mono leading-none mb-1">{metrics.totalAdescos}</p>
                      <p className="text-[9px] font-bold uppercase text-slate-400">Adescos</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-700 font-mono leading-none mb-1">{metrics.totalParticipants}</p>
                      <p className="text-[9px] font-bold uppercase text-slate-400">Inscritos</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-emerald-600 font-mono leading-none mb-1">{metrics.totalGraduates}</p>
                      <p className="text-[9px] font-bold uppercase text-slate-400">Formados</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {visibleCortes.length === 0 && (
              <div className="col-span-full py-12 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-slate-600 font-semibold mb-1">No hay cortes formativos registrados en esta edicion.</h4>
                <p className="text-sm text-slate-400">Los cortes te permiten agrupar la formacion de multiples ADESCOS bajo un mismo proceso.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityCortesModule;
export { CommunityCortesModule };
