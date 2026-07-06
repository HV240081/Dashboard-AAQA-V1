// src/components/ParticipantForm.tsx

import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Save, Mail, Phone } from 'lucide-react';
import { TrainingParticipant } from '../types';

interface ParticipantFormProps {
  participants: TrainingParticipant[];
  onAddParticipant: (participant: Omit<TrainingParticipant, 'id'>) => void;
  onUpdateParticipant: (id: string, participant: Partial<TrainingParticipant>) => void;
  onRemoveParticipant: (id: string) => void;
  canEdit?: boolean;
}

const ParticipantForm: React.FC<ParticipantFormProps> = ({
  participants,
  onAddParticipant,
  onUpdateParticipant,
  onRemoveParticipant,
  canEdit = true
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newParticipant, setNewParticipant] = useState({
    name: '',
    role: '',
    phone: '',
    email: '',
    age: '',
    gender: 'M' as 'M' | 'F'
  });

  const handleAdd = () => {
    if (!newParticipant.name.trim()) {
      alert('El nombre del participante es requerido');
      return;
    }
    
    onAddParticipant({
      name: newParticipant.name,
      role: newParticipant.role || undefined,
      phone: newParticipant.phone || undefined,
      email: newParticipant.email || undefined,
      age: newParticipant.age ? parseInt(newParticipant.age) : undefined,
      gender: newParticipant.gender,
      status: 'enrolled'
    });
    
    setNewParticipant({ name: '', role: '', phone: '', email: '', age: '', gender: 'M' });
    setIsAdding(false);
  };

  const handleUpdate = (id: string, field: keyof TrainingParticipant, value: any) => {
    onUpdateParticipant(id, { [field]: value });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'graduated':
        return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">Graduado</span>;
      case 'en_formacion':
      case 'in_progress':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">En Proceso</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">Inscrito</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Listado de Participantes ({participants.length})
        </p>
        {canEdit && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-xs flex items-center gap-1 font-bold text-lime-600 hover:text-lime-700 transition-colors"
          >
            <Plus className="w-3 h-3" /> Agregar participante
          </button>
        )}
      </div>

      {/* Formulario de adición */}
      {isAdding && canEdit && (
        <div className="bg-lime-50 p-4 rounded-lg border border-lime-200 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Nombre completo *"
              value={newParticipant.name}
              onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
              className="col-span-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
            />
            <input
              type="text"
              placeholder="Rol / Cargo"
              value={newParticipant.role}
              onChange={(e) => setNewParticipant({ ...newParticipant, role: e.target.value })}
              className="p-2 border border-slate-300 rounded-lg text-sm"
            />
            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="Teléfono"
                value={newParticipant.phone}
                onChange={(e) => setNewParticipant({ ...newParticipant, phone: e.target.value })}
                className="flex-1 p-2 border border-slate-300 rounded-lg text-sm"
              />
              <Phone className="w-4 h-4 text-slate-400 self-center" />
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Email"
                value={newParticipant.email}
                onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
                className="flex-1 p-2 border border-slate-300 rounded-lg text-sm"
              />
              <Mail className="w-4 h-4 text-slate-400 self-center" />
            </div>
            <input
              type="number"
              placeholder="Edad"
              value={newParticipant.age}
              onChange={(e) => setNewParticipant({ ...newParticipant, age: e.target.value })}
              className="p-2 border border-slate-300 rounded-lg text-sm"
            />
            <select
              value={newParticipant.gender}
              onChange={(e) => setNewParticipant({ ...newParticipant, gender: e.target.value as 'M' | 'F' })}
              className="p-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 text-xs bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors"
            >
              Guardar participante
            </button>
          </div>
        </div>
      )}

      {/* Tabla de participantes */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="p-3">Nombre Completo</th>
              <th className="p-3">Rol / Cargo</th>
              <th className="p-3 hidden md:table-cell">Contacto</th>
              <th className="p-3 hidden sm:table-cell">Edad</th>
              <th className="p-3 hidden sm:table-cell">Género</th>
              <th className="p-3 hidden lg:table-cell">Estado</th>
              {canEdit && <th className="p-3 text-center w-16">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {participants.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 7 : 6} className="p-8 text-center text-slate-400 italic">
                  No hay participantes registrados
                </td>
              </tr>
            ) : (
              participants.map((p) => (
                <tr key={p.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="p-3">
                    {editingId === p.id ? (
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => handleUpdate(p.id, 'name', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900"
                      />
                    ) : (
                      <span className="font-medium text-slate-800">{p.name}</span>
                    )}
                  </td>
                  <td className="p-3">
                    {editingId === p.id ? (
                      <input
                        type="text"
                        value={p.role || ''}
                        onChange={(e) => handleUpdate(p.id, 'role', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900"
                      />
                    ) : (
                      <span className="text-slate-600">{p.role || '-'}</span>
                    )}
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    {editingId === p.id ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          placeholder="Teléfono"
                          value={p.phone || ''}
                          onChange={(e) => {
                            const newPhone = e.target.value;
                            handleUpdate(p.id, 'phone', newPhone);
                          }}
                          className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 text-xs"
                        />
                        <input
                          type="email"
                          placeholder="Email"
                          value={p.email || ''}
                          onChange={(e) => {
                            const newEmail = e.target.value;
                            handleUpdate(p.id, 'email', newEmail);
                          }}
                          className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 text-xs"
                        />
                      </div>
                    ) : (
                      <div>
                        {p.phone && (
                          <div className="text-slate-500 text-xs flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {p.phone}
                          </div>
                        )}
                        {p.email && (
                          <div className="text-slate-500 text-xs truncate max-w-[150px] flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" /> {p.email}
                          </div>
                        )}
                        {!p.phone && !p.email && '-'}
                      </div>
                    )}
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    {editingId === p.id ? (
                      <input
                        type="number"
                        value={p.age || ''}
                        onChange={(e) => handleUpdate(p.id, 'age', parseInt(e.target.value) || undefined)}
                        className="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-slate-900"
                      />
                    ) : (
                      <span className="text-slate-500">{p.age || '-'}</span>
                    )}
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    {editingId === p.id ? (
                      <select
                        value={p.gender || 'M'}
                        onChange={(e) => handleUpdate(p.id, 'gender', e.target.value as 'M' | 'F')}
                        className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-900"
                      >
                        <option value="M">M</option>
                        <option value="F">F</option>
                      </select>
                    ) : (
                      <span className="text-slate-500">{p.gender === 'F' ? 'Femenino' : 'Masculino'}</span>
                    )}
                  </td>
                  <td className="p-3 hidden lg:table-cell">
                    {getStatusBadge(p.status)}
                  </td>
                  {canEdit && (
                    <td className="p-3 text-center">
                      {editingId === p.id ? (
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Guardar cambios"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => setEditingId(p.id)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onRemoveParticipant(p.id)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {participants.length > 0 && (
        <div className="text-right">
          <p className="text-xs text-slate-400">
            Total: <span className="font-bold text-slate-700">{participants.length}</span> personas
          </p>
        </div>
      )}
    </div>
  );
};

export default ParticipantForm;