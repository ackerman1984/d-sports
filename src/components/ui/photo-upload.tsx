"use client";

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, X, User } from 'lucide-react';

interface PhotoUploadProps {
  currentPhotoUrl?: string;
  onPhotoUploaded: (photoUrl: string) => void;
  onPhotoRemoved?: () => void;
  userId?: string;
  playerName?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  optional?: boolean;
}

export function PhotoUpload({
  currentPhotoUrl,
  onPhotoUploaded,
  onPhotoRemoved,
  userId,
  playerName = 'jugador',
  disabled = false,
  size = 'md',
  optional = false
}: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const supabase = createClient();

  // Configuración de tamaños
  const sizeConfig = {
    sm: { container: 'w-16 h-16', text: 'text-xs' },
    md: { container: 'w-24 h-24', text: 'text-sm' },
    lg: { container: 'w-32 h-32', text: 'text-base' }
  };

  const validateFile = (file: File): string | null => {
    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return 'Solo se permiten archivos JPG, PNG o WEBP';
    }

    // Validar tamaño (5MB máximo)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return 'La imagen no puede ser mayor a 5MB';
    }

    return null;
  };

  const generateFileName = (file: File): string => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop();
    const sanitizedPlayerName = playerName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    
    return `${sanitizedPlayerName}_${userId || 'temp'}_${timestamp}_${randomStr}.${extension}`;
  };

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    const fileName = generateFileName(file);
    
    try {
      // Subir archivo al bucket
      const { data, error } = await supabase.storage
        .from('player-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading file:', error);
        throw new Error(`Error subiendo archivo: ${error.message}`);
      }

      // Generar URL pública
      const { data: urlData } = supabase.storage
        .from('player-photos')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }, [supabase, userId, playerName]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar archivo
    const validationError = validateFile(file);
    if (validationError) {
      toast({
        title: "Error en el archivo",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Crear preview local
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);

      // Subir archivo
      const photoUrl = await uploadFile(file);
      
      if (photoUrl) {
        // Limpiar preview local y usar URL real
        URL.revokeObjectURL(localPreview);
        setPreviewUrl(photoUrl);
        onPhotoUploaded(photoUrl);
        
        toast({
          title: "Foto subida",
          description: "La foto se subió correctamente",
        });
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      setPreviewUrl(currentPhotoUrl || null);
      
      toast({
        title: "Error al subir foto",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [validateFile, uploadFile, onPhotoUploaded, currentPhotoUrl, toast]);

  const handleRemovePhoto = useCallback(async () => {
    if (!previewUrl) return;

    try {
      setPreviewUrl(null);
      onPhotoRemoved?.();
      
      toast({
        title: "Foto eliminada",
        description: "La foto se eliminó correctamente",
      });
    } catch (error) {
      console.error('Error removing photo:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la foto",
        variant: "destructive",
      });
    }
  }, [previewUrl, onPhotoRemoved, toast]);

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <Label className={`${sizeConfig[size].text} font-medium`}>
        Foto de perfil {optional && <span className="text-gray-400">(opcional)</span>}
      </Label>
      
      <div className="flex items-center space-x-4">
        {/* Preview de la foto */}
        <div className={`${sizeConfig[size].container} rounded-full border-2 border-gray-300 overflow-hidden bg-gray-100 flex items-center justify-center relative`}>
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Vista previa"
              className="w-full h-full object-cover"
            />
          ) : (
            <User className={`${size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-8 h-8' : 'w-12 h-12'} text-gray-400`} />
          )}
          
          {isUploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={triggerFileSelect}
            disabled={disabled || isUploading}
            className="flex items-center space-x-2"
          >
            {previewUrl ? <Camera className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
            <span>{previewUrl ? 'Cambiar foto' : 'Subir foto'}</span>
          </Button>

          {previewUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemovePhoto}
              disabled={disabled || isUploading}
              className="flex items-center space-x-2 text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4" />
              <span>Quitar</span>
            </Button>
          )}
        </div>
      </div>

      {/* Input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Texto de ayuda */}
      <p className="text-xs text-gray-500">
        Formatos soportados: JPG, PNG, WEBP. Máximo 5MB.
      </p>
    </div>
  );
}