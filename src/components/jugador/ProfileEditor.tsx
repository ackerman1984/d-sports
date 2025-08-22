'use client';

import { useState } from 'react';
import PhotoUpload from '@/components/ui/PhotoUpload';

interface ProfileEditorProps {
  profile: {
    nombre: string;
    telefono?: string;
    fotoUrl?: string;
    posicion?: string;
    email: string;
    numeroCasaca?: number | null;
    fechaNacimiento?: string;
  };
  onProfileUpdate: (updatedProfile: any) => Promise<void>;
  onClose: () => void;
}

const POSICIONES = [
  'Pitcher (P)',
  'Catcher (C)', 
  'Primera Base (1B)',
  'Segunda Base (2B)',
  'Tercera Base (3B)',
  'Shortstop (SS)',
  'Left Field (LF)',
  'Center Field (CF)',
  'Right Field (RF)',
  'Designated Hitter (DH)',
  'Utility Player'
];

export default function ProfileEditor({ profile, onProfileUpdate, onClose }: ProfileEditorProps) {
  const [formData, setFormData] = useState({
    nombre: profile.nombre || '',
    telefono: profile.telefono || '',
    fotoUrl: profile.fotoUrl || '',
    posicion: profile.posicion || '',
    email: profile.email || '',
    numeroCasaca: profile.numeroCasaca || '',
    fechaNacimiento: profile.fechaNacimiento || ''
  });
  
  // Debug log para verificar datos iniciales
  console.log('🔍 ProfileEditor inicializado con:', {
    fechaNacimiento: profile.fechaNacimiento,
    posicion: profile.posicion,
    formDataFecha: formData.fechaNacimiento,
    formDataPosicion: formData.posicion
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 handleSubmit ejecutado - inicio');
    console.log('📝 Datos del formulario:', formData);
    
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      console.log('📡 Enviando petición PUT a /api/jugador/profile');
      console.log('📦 Payload:', JSON.stringify(formData, null, 2));

      const response = await fetch('/api/jugador/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          email: formData.email,
          telefono: formData.telefono,
          fechaNacimiento: formData.fechaNacimiento,
          posicion: formData.posicion,
          fotoUrl: formData.fotoUrl,
          numeroCasaca: formData.numeroCasaca ? parseInt(formData.numeroCasaca) : null
        }),
      });

      console.log('📨 Respuesta recibida:', response.status, response.statusText);

      const data = await response.json();
      console.log('📋 Datos de respuesta:', data);

      if (!response.ok) {
        console.error('❌ Error en respuesta:', data);
        setError(data.error || 'Error al actualizar perfil');
        return;
      }

      console.log('✅ Actualización exitosa');
      setSuccess(true);
      
      // Pasar todos los datos actualizados al componente padre
      await onProfileUpdate({
        nombre: formData.nombre,
        email: formData.email,
        telefono: formData.telefono,
        fechaNacimiento: formData.fechaNacimiento,
        posicion: formData.posicion,
        fotoUrl: formData.fotoUrl,
        numeroCasaca: formData.numeroCasaca ? parseInt(formData.numeroCasaca) : null
      });
      
      setTimeout(() => {
        console.log('🔄 Cerrando modal');
        onClose();
      }, 1000);
      
    } catch (error) {
      console.error('💥 Error en fetch:', error);
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
      console.log('🏁 handleSubmit terminado');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg max-h-[95vh] overflow-y-auto border border-slate-600">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Editar Perfil</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors w-8 h-8 rounded-full hover:bg-slate-700 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 text-green-300 rounded-lg text-sm">
            ✅ Perfil actualizado exitosamente
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Foto de Perfil */}
          <div className="text-center">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Foto de Perfil
            </label>

            <PhotoUpload
              onPhotoChange={(photoUrl) => {
                setFormData({ ...formData, fotoUrl: photoUrl || '' });
              }}
              currentPhoto={formData.fotoUrl || undefined}
              size="lg"
            />
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Correo Electrónico *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="555-1234"
            />
          </div>

          {/* Número de Casaca */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Número de Casaca
            </label>
            <input
              type="number"
              min="1"
              max="99"
              value={formData.numeroCasaca}
              onChange={(e) => setFormData({ ...formData, numeroCasaca: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="1-99"
            />
          </div>

          {/* Fecha de Nacimiento */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              📅 Fecha de Nacimiento
            </label>
            <input
              type="date"
              value={formData.fechaNacimiento}
              onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Posición */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              ⚾ Posición
            </label>
            <select
              value={formData.posicion}
              onChange={(e) => setFormData({ ...formData, posicion: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Selecciona una posición</option>
              {POSICIONES.map((posicion) => (
                <option key={posicion} value={posicion}>
                  {posicion}
                </option>
              ))}
            </select>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-medium py-2 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              onClick={() => console.log('🔘 Botón Guardar clickeado')}
              className="flex-1 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-medium py-2 rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}