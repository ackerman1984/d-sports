'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X } from 'lucide-react';

interface PhotoUploadDebugProps {
  onPhotoChange: (photoUrl: string | null) => void;
  currentPhoto?: string | null;
  onClose: () => void;
}

export default function PhotoUploadDebug({ onPhotoChange, currentPhoto, onClose }: PhotoUploadDebugProps) {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string) => {
    console.log(message);
    setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Manejar selección de archivo
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    addLog('handleFileSelect called');
    const file = event.target.files?.[0];
    if (!file) {
      addLog('No file selected');
      return;
    }

    addLog(`File selected: ${file.name}, size: ${file.size}`);

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      addLog('Invalid file type');
      alert('Por favor selecciona un archivo de imagen válido.');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      addLog('File too large');
      alert('La imagen es muy grande. El tamaño máximo es 5MB.');
      return;
    }

    addLog('Starting FileReader');
    const reader = new FileReader();
    
    reader.onload = () => {
      addLog('FileReader onload triggered');
      const imageData = reader.result as string;
      addLog(`Image data length: ${imageData.length}`);
      
      try {
        setSelectedImage(imageData);
        addLog('Selected image state set successfully');
      } catch (error) {
        addLog(`Error setting selected image: ${error}`);
      }
    };
    
    reader.onerror = () => {
      addLog('FileReader error');
      alert('Error leyendo el archivo. Intenta de nuevo.');
    };
    
    addLog('Calling readAsDataURL');
    reader.readAsDataURL(file);
  }, []);

  const closeModal = useCallback(() => {
    addLog('closeModal called');
    setIsModalOpen(false);
    onClose();
  }, [onClose]);

  const confirmPhoto = () => {
    addLog('confirmPhoto called');
    if (selectedImage) {
      onPhotoChange(selectedImage);
      addLog('Photo sent to parent');
    }
    closeModal();
  };

  return (
    <>
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            addLog('Backdrop clicked');
            if (e.target === e.currentTarget) {
              addLog('Closing modal due to backdrop click');
              closeModal();
            }
          }}
        >
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header del modal */}
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">
                DEBUG: {selectedImage ? 'Imagen Seleccionada' : 'Subir foto'}
              </h3>
              <button
                onClick={() => {
                  addLog('Close button clicked');
                  closeModal();
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto">
              {!selectedImage && (
                <div className="space-y-4">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      addLog('Upload button clicked');
                      fileInputRef.current?.click();
                    }}
                    className="w-full flex items-center justify-center space-x-2 p-4 border-2 border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
                  >
                    <Upload className="w-6 h-6" />
                    <span>Subir Archivo (DEBUG)</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      e.stopPropagation();
                      addLog('File input onChange triggered');
                      try {
                        handleFileSelect(e);
                      } catch (error) {
                        addLog(`Error in handleFileSelect: ${error}`);
                        alert('Error procesando la imagen: ' + error);
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      addLog('File input clicked');
                    }}
                    className="hidden"
                  />
                </div>
              )}

              {selectedImage && (
                <div className="text-center space-y-4">
                  <p className="text-green-600 font-bold">¡Imagen cargada exitosamente!</p>
                  <img 
                    src={selectedImage} 
                    alt="Preview" 
                    className="max-w-full h-auto max-h-64 mx-auto rounded-lg"
                  />
                  <div className="flex gap-4">
                    <button
                      onClick={confirmPhoto}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Usar Esta Foto
                    </button>
                    <button
                      onClick={() => {
                        addLog('Reset button clicked');
                        setSelectedImage(null);
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Elegir Otra
                    </button>
                  </div>
                </div>
              )}

              {/* Debug Log */}
              <div className="mt-6 p-3 bg-gray-100 rounded-lg">
                <h4 className="font-bold mb-2">Debug Log:</h4>
                <div className="text-xs max-h-32 overflow-y-auto">
                  {debugLog.map((log, index) => (
                    <div key={index} className="mb-1">{log}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}