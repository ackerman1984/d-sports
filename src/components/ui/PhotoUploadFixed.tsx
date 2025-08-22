'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Check, RotateCcw, Move, ZoomIn, ZoomOut, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Target } from 'lucide-react';

interface PhotoUploadProps {
  onPhotoChange: (photoUrl: string | null) => void;
  currentPhoto?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  required?: boolean;
}

const PHOTO_SIZES = {
  sm: { container: 'w-20 h-20', button: 'w-20 h-20' },
  md: { container: 'w-32 h-32', button: 'w-32 h-32' },
  lg: { container: 'w-48 h-48', button: 'w-48 h-48' }
};

export default function PhotoUploadFixed({ 
  onPhotoChange, 
  currentPhoto, 
  className = '', 
  size = 'md',
  required = false 
}: PhotoUploadProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUsingCamera, setIsUsingCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [cropSettings, setCropSettings] = useState({
    x: 0,
    y: 0,
    size: 100,
    zoom: 1
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sizes = PHOTO_SIZES[size];

  // Inicializar cámara
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      setStream(mediaStream);
      setIsUsingCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('No se pudo acceder a la cámara. Intenta subir un archivo.');
    }
  }, []);

  // Detener cámara
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsUsingCamera(false);
  }, [stream]);

  // Capturar foto desde cámara
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setSelectedImage(imageDataUrl);
    setIsAdjusting(true);
    stopCamera();
    
    // Configuración inicial para foto de cámara
    setCropSettings({
      x: 0,
      y: 0,
      size: 85,
      zoom: 1
    });
  }, [stopCamera]);

  // Procesar y redimensionar imagen con configuración personalizada
  const processImage = useCallback((imageData: string, customCrop?: typeof cropSettings): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return resolve(imageData);
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(imageData);

        const finalSize = 512; // Tamaño más grande para mejor calidad de identificación
        const crop = customCrop || cropSettings;
        
        // Calcular dimensiones basadas en la configuración
        const sourceSize = Math.min(img.width, img.height) * (crop.size / 100) * crop.zoom;
        const sourceX = (img.width / 2) + (crop.x * img.width / 200) - (sourceSize / 2);
        const sourceY = (img.height / 2) + (crop.y * img.height / 200) - (sourceSize / 2);
        
        // Configurar canvas final
        canvas.width = finalSize;
        canvas.height = finalSize;
        
        // Limpiar canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, finalSize, finalSize);
        
        // Dibujar imagen croppeada y redimensionada
        ctx.drawImage(
          img,
          Math.max(0, sourceX), 
          Math.max(0, sourceY), 
          Math.min(sourceSize, img.width - sourceX), 
          Math.min(sourceSize, img.height - sourceY),
          0, 0, finalSize, finalSize
        );
        
        // Mayor calidad para fotos de identificación
        const processedImage = canvas.toDataURL('image/jpeg', 0.85);
        const imageSizeKB = Math.round(processedImage.length / 1024);
        console.log('Processed image size:', imageSizeKB + 'KB');
        
        resolve(processedImage);
      };
      img.src = imageData;
    });
  }, [cropSettings]);

  // Manejar selección de archivo
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('File selected:', file.name);

    // Validaciones
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es muy grande. El tamaño máximo es 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      console.log('File reader loaded successfully');
      const rawImageData = reader.result as string;
      
      // Mostrar imagen sin procesar para permitir ajustes
      setSelectedImage(rawImageData);
      setIsAdjusting(true);
      
      // Configuración simple inicial
      setCropSettings({
        x: 0,
        y: 0,
        size: 85, // Tamaño fijo bueno para fotos de perfil
        zoom: 1   // Sin zoom, solo movimiento
      });
      
      console.log('Image loaded, ready for adjustment');
    };
    
    reader.onerror = () => {
      console.error('Error reading file');
      alert('Error leyendo el archivo. Intenta de nuevo.');
    };
    
    reader.readAsDataURL(file);
  }, []);

  // Cerrar modal y limpiar estados
  const closeModal = useCallback(() => {
    console.log('Closing modal');
    setIsModalOpen(false);
    setSelectedImage(null);
    setIsAdjusting(false);
    setCropSettings({ x: 0, y: 0, size: 100, zoom: 1 });
    stopCamera();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [stopCamera]);

  // Ajustar configuración de crop
  const adjustCrop = useCallback((adjustment: Partial<typeof cropSettings>) => {
    setCropSettings(prev => ({
      ...prev,
      ...adjustment
    }));
  }, []);

  // Procesar imagen final con ajustes
  const processAndConfirm = useCallback(async () => {
    if (!selectedImage) return;
    
    try {
      const finalImage = await processImage(selectedImage);
      onPhotoChange(finalImage);
      closeModal();
    } catch (error) {
      console.error('Error processing final image:', error);
      alert('Error procesando la imagen final. Intenta de nuevo.');
    }
  }, [selectedImage, processImage, onPhotoChange, closeModal]);

  // Confirmar foto seleccionada
  const confirmPhoto = useCallback(() => {
    if (selectedImage) {
      console.log('Photo confirmed, sending to parent');
      onPhotoChange(selectedImage);
    }
    closeModal();
  }, [selectedImage, onPhotoChange, closeModal]);

  // Eliminar foto actual
  const removePhoto = useCallback(() => {
    onPhotoChange(null);
  }, [onPhotoChange]);

  return (
    <>
      {/* Botón principal de foto */}
      <div className={`${sizes.container} ${className}`}>
        {currentPhoto ? (
          <div className="relative group">
            <img
              src={currentPhoto}
              alt="Foto de perfil"
              className={`${sizes.button} object-cover rounded-full border-2 border-gray-300`}
            />
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="p-1 bg-white rounded-full text-gray-800 hover:bg-gray-100"
                title="Cambiar foto"
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={removePhoto}
                className="p-1 bg-white rounded-full text-red-600 hover:bg-gray-100"
                title="Eliminar foto"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className={`${sizes.button} border-2 border-dashed border-gray-300 rounded-full flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors ${required ? 'border-red-300' : ''}`}
          >
            <Camera className="w-6 h-6 mb-1" />
            <span className="text-xs text-center">
              {required ? 'Foto*' : 'Foto'}
            </span>
          </button>
        )}
      </div>

      {/* Modal de captura/edición de foto */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Solo cerrar si no hay imagen seleccionada y no está ajustando
            if (e.target === e.currentTarget && !selectedImage && !isAdjusting) {
              closeModal();
            }
          }}
        >
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header del modal */}
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">
                {isAdjusting ? 'Ajustar foto' : selectedImage ? 'Vista previa' : 'Capturar o subir foto'}
              </h3>
              {!isAdjusting && (
                <button
                  onClick={closeModal}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="p-4 max-h-96 overflow-y-auto">
              {!selectedImage && !isUsingCamera && (
                /* Opciones iniciales */
                <div className="flex flex-col space-y-4">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex items-center justify-center space-x-2 p-4 border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50"
                  >
                    <Camera className="w-6 h-6" />
                    <span>Usar Cámara</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center justify-center space-x-2 p-4 border-2 border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
                  >
                    <Upload className="w-6 h-6" />
                    <span>Subir Archivo</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      e.stopPropagation();
                      handleFileSelect(e);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="hidden"
                  />
                </div>
              )}

              {isUsingCamera && (
                /* Vista de cámara */
                <div className="text-center">
                  <video
                    ref={videoRef}
                    className="w-full max-w-md mx-auto rounded-lg mb-4"
                    autoPlay
                    playsInline
                    muted
                  />
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={capturePhoto}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Capturar
                    </button>
                    <button
                      onClick={stopCamera}
                      className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {selectedImage && !isAdjusting && (
                /* Vista de confirmación final */
                <div className="text-center space-y-4">
                  <p className="text-sm text-gray-600">
                    Foto de identificación procesada y lista
                  </p>
                  <img 
                    src={selectedImage} 
                    alt="Preview" 
                    className="max-w-full h-auto max-h-64 mx-auto rounded-lg border"
                  />
                  
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={confirmPhoto}
                      className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Check className="w-4 h-4" />
                      <span>Usar Esta Foto</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedImage(null);
                      }}
                      className="flex items-center space-x-2 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Elegir Otra</span>
                    </button>
                  </div>
                </div>
              )}

              {selectedImage && isAdjusting && (
                /* Vista de ajuste de foto SIMPLIFICADA */
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-4">
                      Mueve la imagen para centrar mejor la foto
                    </p>
                    
                    {/* Preview con movimiento visual */}
                    <div className="relative inline-block bg-gray-100 rounded-lg p-4">
                      <div className="relative overflow-hidden rounded-lg border" style={{ width: '300px', height: '300px' }}>
                        <img 
                          src={selectedImage} 
                          alt="Ajustando" 
                          className="absolute min-w-full min-h-full object-cover"
                          style={{
                            transform: `translate(${-cropSettings.x}%, ${-cropSettings.y}%)`,
                            transformOrigin: 'center center'
                          }}
                        />
                        {/* Overlay más sutil */}
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute inset-4 border-2 border-blue-400 border-dashed rounded-full opacity-60"></div>
                          <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
                            Vista previa
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Controles ESTILO APP MÓVIL */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-center space-y-4">
                      <div className="flex items-center justify-center space-x-2">
                        <Move className="w-4 h-4 text-slate-600" />
                        <p className="text-sm font-medium text-slate-700">
                          Ajustar Posición
                        </p>
                      </div>
                      
                      <div className="text-xs text-slate-500 bg-white px-3 py-1 rounded-full inline-block">
                        X: {cropSettings.x}% • Y: {cropSettings.y}%
                      </div>
                      
                      {/* Controles en cruz estilo móvil */}
                      <div className="grid grid-cols-3 gap-3 max-w-40 mx-auto">
                        <div></div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            adjustCrop({ y: Math.max(cropSettings.y - 10, -30) });
                          }}
                          className="w-12 h-12 bg-white border-2 border-slate-300 rounded-full flex items-center justify-center text-slate-600 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition-all duration-200 shadow-sm active:scale-95"
                        >
                          <ArrowUp className="w-5 h-5" />
                        </button>
                        <div></div>
                        
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            adjustCrop({ x: Math.max(cropSettings.x - 10, -30) });
                          }}
                          className="w-12 h-12 bg-white border-2 border-slate-300 rounded-full flex items-center justify-center text-slate-600 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition-all duration-200 shadow-sm active:scale-95"
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            adjustCrop({ x: 0, y: 0 });
                          }}
                          className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-400 rounded-full flex items-center justify-center text-slate-700 hover:from-blue-100 hover:to-blue-200 hover:border-blue-500 hover:text-blue-700 transition-all duration-200 shadow-sm active:scale-95"
                        >
                          <Target className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            adjustCrop({ x: Math.min(cropSettings.x + 10, 30) });
                          }}
                          className="w-12 h-12 bg-white border-2 border-slate-300 rounded-full flex items-center justify-center text-slate-600 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition-all duration-200 shadow-sm active:scale-95"
                        >
                          <ArrowRight className="w-5 h-5" />
                        </button>
                        
                        <div></div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            adjustCrop({ y: Math.min(cropSettings.y + 10, 30) });
                          }}
                          className="w-12 h-12 bg-white border-2 border-slate-300 rounded-full flex items-center justify-center text-slate-600 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition-all duration-200 shadow-sm active:scale-95"
                        >
                          <ArrowDown className="w-5 h-5" />
                        </button>
                        <div></div>
                      </div>
                      
                      <p className="text-xs text-slate-500 mt-2">
                        Toca los botones para mover la imagen
                      </p>
                    </div>
                  </div>

                  {/* Botones de confirmación estilo app móvil */}
                  <div className="flex justify-center space-x-4 mt-6">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        processAndConfirm();
                      }}
                      className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 font-medium"
                    >
                      <Check className="w-5 h-5" />
                      <span>Guardar Foto</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsAdjusting(false);
                        setSelectedImage(null);
                      }}
                      className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-slate-400 to-slate-500 text-white rounded-2xl hover:from-slate-500 hover:to-slate-600 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 font-medium"
                    >
                      <X className="w-5 h-5" />
                      <span>Cancelar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Canvas oculto para procesamiento */}
          <canvas
            ref={canvasRef}
            className="hidden"
          />
        </div>
      )}
    </>
  );
}