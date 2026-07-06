// src/components/EditableText.tsx

import React, { useState, useEffect } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import { useData } from '../contexts/useData';
import { usePermissions } from '../hooks/usePermissions';

interface EditableTextProps {
  idKey: string;
  category: string;
  defaultText: string;
  className?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  scope?: 'default' | 'project-detail';
}

const EditableText: React.FC<EditableTextProps> = ({ 
  idKey, 
  category, 
  defaultText, 
  className = '', 
  multiline = false,
  rows = 3,
  maxLength,
  placeholder = '',
  scope = 'default'
}) => {
  const { textosEditables, updateText, isLoading, lastUpdated, updatedBy } = useData() as any;
  const [isEditing, setIsEditing] = useState(false);
  
  // Resolve actual text from context (prioriza textosEditables sobre textContent)
  const currentText = textosEditables?.[`${category}.${idKey}`] || defaultText;
  const [value, setValue] = useState(currentText);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync value when currentText changes
  useEffect(() => {
    setValue(currentText);
    setError(null);
  }, [currentText]);

  const { canEditText, canEditProjectDetailText } = usePermissions() as any;
  const hasPermission = scope === 'project-detail'
    ? canEditProjectDetailText()
    : canEditText(category);

  // Validar longitud máxima
  const validateValue = (text: string): boolean => {
    if (maxLength && text.length > maxLength) {
      setError(`El texto no puede exceder ${maxLength} caracteres`);
      return false;
    }
    setError(null);
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    validateValue(newValue);
  };

  const handleSave = async () => {
    // Validar antes de guardar
    if (!validateValue(value)) {
      return;
    }

    // No guardar si no hay cambios
    if (value === currentText) {
      setIsEditing(false);
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      await updateText(category, idKey, value);
      setIsEditing(false);
    } catch (error) {
      console.error('Error al guardar texto', error);
      setError('Error al guardar el texto. Intente nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(currentText);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Modo edición
  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 relative bg-white p-3 border border-blue-200 rounded-md shadow-sm z-10 w-full animate-in fade-in zoom-in-95">
        {multiline ? (
          <textarea 
            value={value} 
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className={`w-full bg-white border border-slate-300 outline-none p-2 rounded focus:ring-2 focus:ring-brand-blue/50 text-slate-900 text-sm ${error ? 'border-red-300' : ''}`}
            rows={rows}
            maxLength={maxLength}
            placeholder={placeholder}
            autoFocus
          />
        ) : (
          <input 
            type="text" 
            value={value} 
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className={`w-full bg-white border border-slate-300 outline-none px-2 py-1 rounded focus:ring-2 focus:ring-brand-blue/50 text-slate-900 text-sm font-medium ${error ? 'border-red-300' : ''}`}
            maxLength={maxLength}
            placeholder={placeholder}
            autoFocus
          />
        )}
        
        {error && (
          <p className="text-xs text-red-500 -mt-1">{error}</p>
        )}
        
        <div className="flex justify-end gap-1">
          <button 
            onClick={handleCancel} 
            disabled={isSaving} 
            className="p-1 text-slate-400 hover:text-red-500 transition-colors bg-slate-100 rounded"
            title="Cancelar"
          >
            <X size={14} />
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving || !!error} 
            className={`p-1 text-brand-blue hover:text-white hover:bg-brand-blue transition-colors bg-blue-50 rounded ${(isSaving || error) ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Guardar"
          >
            {isSaving ? (
              <span className="w-3 h-3 border-2 border-brand-blue border-t-transparent rounded-full animate-spin block"></span>
            ) : (
              <Check size={14} />
            )}
          </button>
        </div>
      </div>
    );
  }

  // Estado de carga
  if (isLoading) {
    return <span className={`${className} opacity-60`}>{defaultText}</span>;
  }

  // Modo visualización
  return (
    <div className="group relative inline-flex items-center w-auto hover:ring-1 hover:ring-current/30 px-1 -mx-1 rounded transition-all cursor-text">
      <span className={className}>{currentText}</span>
      
      {hasPermission && (
        <button 
          onClick={() => setIsEditing(true)} 
          className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-700 hover:text-brand-blue bg-white shadow-sm border border-slate-300 rounded-md"
          title="Editar Texto"
        >
          <Edit2 size={14} strokeWidth={2.5} />
        </button>
      )}
      
      {/* Tooltip con información de última actualización */}
      {lastUpdated && (
        <span className="hidden group-hover:inline-block absolute -bottom-6 left-0 text-[10px] text-slate-400 whitespace-nowrap bg-white px-1 rounded shadow-sm z-10">
          Última edición: {new Date(lastUpdated).toLocaleDateString()}
          {updatedBy && ` por ${updatedBy}`}
        </span>
      )}
    </div>
  );
};

export default EditableText;

