'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, RotateCcw, Check } from 'lucide-react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

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

export default function PhotoUpload({ 
  onPhotoChange, 
  currentPhoto, 
  className = '', 
  size = 'md',
  required = false 
}: PhotoUploadProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isUsingCamera, setIsUsingCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

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

    // Configurar canvas al tamaño del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dibujar frame actual del video en canvas
    context.drawImage(video, 0, 0);

    // Convertir a base64
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setSelectedImage(imageDataUrl);
    stopCamera();

    // Configurar crop inicial
    const crop = centerCrop(
      makeAspectCrop({ unit: '%', width: 80 }, 1, video.videoWidth, video.videoHeight),
      video.videoWidth,
      video.videoHeight
    );
    setCrop(crop);
  }, [stopCamera]);

  // Manejar selección de archivo - SIMPLIFIED VERSION
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('File selected:', file.name);

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido.');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es muy grande. El tamaño máximo es 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      console.log('File reader loaded successfully');
      const imageData = reader.result as string;
      console.log('Setting selected image, length:', imageData.length);
      
      // Set image immediately without complex crop setup
      setSelectedImage(imageData);
      
      // Use setTimeout to ensure state is set before crop setup
      setTimeout(() => {
        const img = new Image();
        img.onload = () => {
          console.log('Image loaded for crop setup, dimensions:', img.width, 'x', img.height);
          try {
            const initialCrop = centerCrop(
              makeAspectCrop({ unit: '%', width: 80 }, 1, img.width, img.height),
              img.width,
              img.height
            );
            console.log('Crop configured:', initialCrop);
            setCrop(initialCrop);
            setCompletedCrop(initialCrop as unknown as PixelCrop);
          } catch (error) {
            console.error('Error configuring crop:', error);
            // Don't close modal on crop error, just use default
            setCrop({ unit: '%', width: 80, height: 80, x: 10, y: 10 });
          }
        };
        img.src = imageData;
      }, 100);
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
    setCrop(undefined);
    setCompletedCrop(undefined);
    stopCamera();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [stopCamera]);

  // Procesar imagen croppeada
  const processCroppedImage = useCallback(() => {
    console.log('processCroppedImage called');
    console.log('completedCrop:', completedCrop);
    console.log('imageRef.current:', imageRef.current);
    console.log('canvasRef.current:', canvasRef.current);
    
    if (!completedCrop || !imageRef.current || !canvasRef.current) {
      console.log('Missing required elements for processing');
      alert('Falta información para procesar la imagen. Asegúrate de hacer el recorte primero.');
      return;
    }

    const image = imageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.log('No canvas context available');
      alert('Error obteniendo contexto del canvas');
      return;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Configurar canvas para imagen final - tamaño máximo 400x400
    const maxSize = 400;
    let finalWidth = completedCrop.width;
    let finalHeight = completedCrop.height;
    
    if (finalWidth > maxSize || finalHeight > maxSize) {
      const ratio = Math.min(maxSize / finalWidth, maxSize / finalHeight);
      finalWidth *= ratio;
      finalHeight *= ratio;
    }
    
    canvas.width = finalWidth;
    canvas.height = finalHeight;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      finalWidth,
      finalHeight
    );

    // Convertir a base64 con menor calidad para reducir tamaño
    const croppedImageUrl = canvas.toDataURL('image/jpeg', 0.7);
    const imageSizeKB = Math.round(croppedImageUrl.length / 1024);
    console.log('Processed image size:', imageSizeKB + 'KB');
    console.log('Sending photo to parent:', croppedImageUrl.substring(0, 50) + '...');
    
    if (imageSizeKB > 1500) { // Advertir si es mayor a 1.5MB
      alert(`Imagen procesada: ${imageSizeKB}KB. Si es muy grande, puede fallar.`);
    }
    
    console.log('About to call onPhotoChange');
    onPhotoChange(croppedImageUrl);
    console.log('onPhotoChange called, now closing modal');
    closeModal();
    console.log('Modal closed');
  }, [completedCrop, onPhotoChange, closeModal]);

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
            // Solo cerrar si se hace click en el backdrop, no en el contenido
            if (e.target === e.currentTarget && !selectedImage) {
              console.log('Closing modal due to backdrop click (no image selected)');
              closeModal();
            }
          }}
        >
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header del modal */}
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">
                {selectedImage ? 'Ajustar foto' : 'Capturar o subir foto'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto">
              {!selectedImage && !isUsingCamera && (
                /* Opciones iniciales */
                <div className="flex flex-col space-y-4">
                  <button
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
                      console.log('Upload button clicked');
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
                      console.log('File input change triggered');
                      try {
                        handleFileSelect(e);
                      } catch (error) {
                        console.error('Error in handleFileSelect:', error);
                        alert('Error procesando la imagen: ' + error);
                      }
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

              {selectedImage && (
                /* Vista de edición/crop */
                <div>
                  <div className="mb-4 text-center">
                    <p className="text-sm text-gray-600 mb-2">Ajusta la imagen y presiona &quot;Usar Esta Foto&quot;</p>
                    <ReactCrop
                      crop={crop}
                      onChange={(_, percentCrop) => {
                        console.log('Crop changed:', percentCrop);
                        setCrop(percentCrop);
                      }}
                      onComplete={(c) => {
                        console.log('Crop completed:', c);
                        console.log('Crop dimensions:', c.width, 'x', c.height);
                        setCompletedCrop(c);
                      }}
                      aspect={1}
                      circularCrop
                    >
                      <img
                        ref={imageRef}
                        src={selectedImage}
                        className="max-w-full h-auto"
                        alt="Preview"
                        onLoad={(e) => {
                          console.log('Image element loaded in crop view');
                          const img = e.target as HTMLImageElement;
                          const { width, height } = img;
                          
                          // Crear un crop inicial centrado del 80% del tamaño de la imagen
                          const initialCrop = centerCrop(
                            makeAspectCrop(
                              { unit: '%', width: 80 },
                              1,
                              width,
                              height
                            ),
                            width,
                            height
                          );
                          
                          console.log('Setting initial crop:', initialCrop);
                          setCrop(initialCrop);
                          
                          // También establecer el completedCrop inmediatamente
                          const pixelCrop = {
                            unit: 'px' as const,
                            x: (initialCrop.x / 100) * width,
                            y: (initialCrop.y / 100) * height,
                            width: (initialCrop.width / 100) * width,
                            height: (initialCrop.height / 100) * height
                          };
                          console.log('Setting initial completed crop:', pixelCrop);
                          setCompletedCrop(pixelCrop);
                        }}
                        onError={() => console.error('Error loading image in crop view')}
                      />
                    </ReactCrop>
                  </div>

                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={processCroppedImage}
                      disabled={!completedCrop || !selectedImage}
                      className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check className="w-4 h-4" />
                      <span>Usar Esta Foto</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedImage(null);
                        setCrop(undefined);
                        setCompletedCrop(undefined);
                      }}
                      className="flex items-center space-x-2 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Tomar Otra</span>
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