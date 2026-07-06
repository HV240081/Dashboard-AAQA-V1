// src/components/DocumentUploader.tsx - COMPLETO MEJORADO

import React, { useRef, useState } from 'react';
import { FileText, Upload, X, Loader2, FileIcon, FileSpreadsheet, FileImage, CheckCircle, Plus } from 'lucide-react';

interface DocumentInfo {
  id: string;
  name: string;
  url: string;
  type: string;
}

interface DocumentUploaderProps {
  documents: DocumentInfo[];
  onUpload: (file: File, type: string) => Promise<string | null>;
  onRemove: (id: string) => void;
  canEdit?: boolean;
  title: string;
  type: 'carta_finalizacion' | 'control_cambio' | 'otro';
  accept?: string;
  multiple?: boolean;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  documents,
  onUpload,
  onRemove,
  canEdit = true,
  title,
  type,
  accept = ".pdf,.xlsx,.xls,.doc,.docx,.csv",
  multiple = true
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-5 h-5 text-red-500" />;
    if (ext === 'xlsx' || ext === 'xls') return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
    if (ext === 'doc' || ext === 'docx') return <FileText className="w-5 h-5 text-blue-600" />;
    if (ext === 'csv') return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') return <FileImage className="w-5 h-5 text-purple-500" />;
    return <FileIcon className="w-5 h-5 text-slate-500" />;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    
    for (const file of files) {
      try {
        const url = await onUpload(file, type);
        if (url) {
          setUploadSuccess(file.name);
          setTimeout(() => setUploadSuccess(null), 2000);
        }
      } catch (error) {
        console.error('Error uploading document:', error);
        alert(`Error al subir ${file.name}`);
      }
    }
    
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {title}
        </label>
        {canEdit && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium flex items-center gap-1 px-2 py-1 rounded-lg transition-colors"
          >
            {isUploading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
            {isUploading ? 'Subiendo...' : 'Agregar documento'}
          </button>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleFileSelect}
      />

      {documents.length > 0 ? (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {documents.map((doc) => (
            <div 
              key={doc.id} 
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 group hover:bg-slate-100 transition-colors"
            >
              <a 
                href={doc.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 flex-1 hover:underline cursor-pointer"
              >
                {getFileIcon(doc.name)}
                <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">
                  {doc.name}
                </span>
              </a>
              {canEdit && (
                <button
                  onClick={() => onRemove(doc.id)}
                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="Eliminar"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/30 text-center hover:border-blue-300 transition-colors">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-400">No hay documentos adjuntos</p>
          {canEdit && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 text-xs text-blue-500 hover:text-blue-600 font-medium"
            >
              + Subir documento
            </button>
          )}
          <p className="text-[10px] text-slate-400 mt-2">
            Formatos: PDF, Excel, Word, CSV
          </p>
        </div>
      )}
      
      {uploadSuccess && (
        <div className="text-xs text-green-600 bg-green-50 p-2 rounded-lg text-center animate-in fade-in">
          ✓ {uploadSuccess} subido correctamente
        </div>
      )}
    </div>
  );
};

export default DocumentUploader;