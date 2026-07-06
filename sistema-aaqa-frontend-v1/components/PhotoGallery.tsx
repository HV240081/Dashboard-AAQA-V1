// src/components/PhotoGallery.tsx

import React, { useState, useRef } from 'react';
import { X, Plus, Upload, Loader2, Trash2 } from 'lucide-react';

interface PhotoGalleryProps {
  photos: string[];
  onAddPhoto: (file: File) => Promise<string | null>;
  onRemovePhoto: (index: number) => void;
  canEdit?: boolean;
  title?: string;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  onAddPhoto,
  onRemovePhoto,
  canEdit = true,
  title = "Evidencia Fotográfica"
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten imágenes (JPG, PNG, WEBP, GIF)');
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar los 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const url = await onAddPhoto(file);
      if (url) {
        // Foto agregada exitosamente
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Error al subir la imagen');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
        <div className="w-2 h-2 bg-lime-600 rounded-full"></div>
        {title}
      </h3>

      {/* Grid de fotos */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
          {photos.map((photo, index) => (
            <div 
              key={index} 
              className="relative group rounded-lg overflow-hidden shadow-sm border border-slate-200 cursor-pointer"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img 
                src={photo} 
                alt={`Evidencia ${index + 1}`} 
                className="w-full h-32 object-cover hover:scale-105 transition-transform duration-500"
              />
              {canEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemovePhoto(index);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-red-600/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="h-40 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200 p-4 text-center mb-4">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-2">
            <Plus className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-xs">No hay fotos registradas</p>
          {canEdit && (
            <p className="text-[10px] text-slate-500 mt-1">Haz clic en "Subir nueva imagen" para agregar</p>
          )}
        </div>
      )}

      {/* Botón de subida */}
      {canEdit && (
        <>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-lime-300 rounded-lg text-lime-600 hover:bg-lime-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Subiendo imagen...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Subir nueva imagen
              </>
            )}
          </button>
          <p className="text-[10px] text-slate-400 mt-2 text-center">
            Formatos permitidos: JPG, PNG, WEBP, GIF (max 5MB)
          </p>
        </>
      )}

      {/* Modal para ver foto ampliada */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img 
              src={selectedPhoto} 
              alt="Vista ampliada" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;