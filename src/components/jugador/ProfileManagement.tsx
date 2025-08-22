'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import PhotoUpload from '@/components/ui/PhotoUpload';
import { useJugadorProfile } from '@/hooks/useJugadorProfile';


interface Equipo {
  id: string;
  nombre: string;
  color: string;
}

export default function ProfileManagement() {
  const { data: session, update: updateSession } = useSession();
  const { profile, loading, error: profileError, updateProfile } = useJugadorProfile();
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    fechaNacimiento: '',
    fotoUrl: '',
    numeroCasaca: '',
    equipoId: '',
    posicion: '',
  });

  // Actualizar formData cuando el perfil cambie
  useEffect(() => {
    if (profile) {
      const newFormData = {
        nombre: profile.nombre || '',
        telefono: profile.telefono || '',
        fechaNacimiento: profile.fechaNacimiento || '',
        fotoUrl: profile.fotoUrl || '',
        numeroCasaca: profile.numeroCasaca?.toString() || '',
        equipoId: profile.equipoId || '',
        posicion: profile.posicion || '',
      };
      console.log('🔄 Actualizando formData con perfil:', newFormData);
      setFormData(newFormData);
    }
  }, [profile]);

  // Sincronizar errores
  useEffect(() => {
    if (profileError) {
      setError(profileError);
    }
  }, [profileError]);

  const fetchEquipos = useCallback(async () => {
    try {
      const response = await fetch(`/api/equipos?ligaId=${session?.user?.ligaId}`);
      if (response.ok) {
        const data = await response.json();
        setEquipos(data.equipos || []);
      }
    } catch (error) {
      console.error('Error fetching equipos:', error);
    }
  }, [session?.user?.ligaId]);

  useEffect(() => {
    if (session?.user) {
      fetchEquipos();
    }
  }, [session, fetchEquipos]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updateData = {
        nombre: formData.nombre,
        telefono: formData.telefono,
        fechaNacimiento: formData.fechaNacimiento,
        fotoUrl: formData.fotoUrl,
        numeroCasaca: formData.numeroCasaca ? parseInt(formData.numeroCasaca) : undefined,
        equipoId: formData.equipoId,
        email: profile?.email, // Mantener email actual
        posicion: formData.posicion || 'No especificada' // Usar posición del formulario
      };
      
      console.log('📤 Datos a actualizar:', updateData);

      const success = await updateProfile(updateData);
      
      if (success) {
        setSuccess('Perfil actualizado exitosamente');
        setIsEditing(false);

        // Actualizar la sesión si el nombre cambió
        if (formData.nombre !== session?.user?.name) {
          await updateSession({
            ...session,
            user: {
              ...session?.user,
              name: formData.nombre,
            },
          });
        }
      } else {
        // El error ya se setea en el hook
        setError('Error actualizando el perfil');
      }
    } catch (error) {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      const resetFormData = {
        nombre: profile.nombre || '',
        telefono: profile.telefono || '',
        fechaNacimiento: profile.fechaNacimiento || '',
        fotoUrl: profile.fotoUrl || '',
        numeroCasaca: profile.numeroCasaca?.toString() || '',
        equipoId: profile.equipoId || '',
        posicion: profile.posicion || '',
      };
      console.log('❌ Cancelando edición, restaurando datos:', resetFormData);
      setFormData(resetFormData);
    }
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  if (session?.user?.role !== 'jugador') {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-gray-600">Perfil de Jugador</h2>
        <p className="text-gray-500 mt-2">Esta funcionalidad es solo para jugadores.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Error</h2>
        <p className="text-gray-600 mt-2">No se pudo cargar el perfil del jugador.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-8">
          <div className="flex items-center space-x-6">
            <div className="relative">
              {profile.fotoUrl ? (
                <Image
                  src={profile.fotoUrl}
                  alt={profile.nombre}
                  width={100}
                  height={100}
                  className="rounded-full border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                  <span className="text-3xl font-bold text-blue-600">
                    {profile.nombre.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="text-white">
              <h1 className="text-3xl font-bold">{profile.nombre}</h1>
              <p className="text-blue-100">{profile.email}</p>
              {profile.equipo && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white bg-opacity-20 text-white">
                    {profile.equipo.nombre} • #{profile.numeroCasaca}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {success}
            </div>
          )}

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Información del Perfil</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Editar Perfil
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Nacimiento
                  </label>
                  <input
                    type="date"
                    value={formData.fechaNacimiento}
                    onChange={(e) => {
                      console.log('🎂 Cambiando fecha de nacimiento:', e.target.value);
                      setFormData({ ...formData, fechaNacimiento: e.target.value });
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Posición
                  </label>
                  <select
                    value={formData.posicion}
                    onChange={(e) => {
                      console.log('⚾ Cambiando posición:', e.target.value);
                      setFormData({ ...formData, posicion: e.target.value });
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecciona una posición</option>
                    <option value="Pitcher (P)">Pitcher (P)</option>
                    <option value="Catcher (C)">Catcher (C)</option>
                    <option value="Primera Base (1B)">Primera Base (1B)</option>
                    <option value="Segunda Base (2B)">Segunda Base (2B)</option>
                    <option value="Tercera Base (3B)">Tercera Base (3B)</option>
                    <option value="Shortstop (SS)">Shortstop (SS)</option>
                    <option value="Left Field (LF)">Left Field (LF)</option>
                    <option value="Center Field (CF)">Center Field (CF)</option>
                    <option value="Right Field (RF)">Right Field (RF)</option>
                    <option value="Designated Hitter (DH)">Designated Hitter (DH)</option>
                    <option value="Utility Player">Utility Player</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Equipo
                  </label>
                  <select
                    value={formData.equipoId}
                    onChange={(e) => setFormData({ ...formData, equipoId: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={session?.user?.role === 'jugador'} // Solo admin puede cambiar equipo
                  >
                    <option value="">Sin equipo asignado</option>
                    {equipos.map((equipo) => (
                      <option key={equipo.id} value={equipo.id}>
                        {equipo.nombre}
                      </option>
                    ))}
                  </select>
                  {session?.user?.role === 'jugador' && (
                    <p className="text-sm text-gray-500 mt-1">
                      Solo el administrador puede cambiar tu equipo
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Camiseta
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={formData.numeroCasaca}
                    onChange={(e) => setFormData({ ...formData, numeroCasaca: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    disabled={session?.user?.role === 'jugador'} // Solo admin puede cambiar número
                  />
                  {session?.user?.role === 'jugador' && (
                    <p className="text-sm text-gray-500 mt-1">
                      Solo el administrador puede cambiar tu número
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Foto de Perfil
                  </label>
                  <div className="flex justify-center">
                    <PhotoUpload
                      onPhotoChange={(photo) => setFormData({ ...formData, fotoUrl: photo || '' })}
                      currentPhoto={formData.fotoUrl}
                      size="lg"
                    />
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Email</h3>
                  <p className="mt-1 text-sm text-gray-900">{profile.email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Teléfono</h3>
                  <p className="mt-1 text-sm text-gray-900">{profile.telefono || 'No especificado'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Fecha de Nacimiento</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {profile.fechaNacimiento 
                      ? new Date(profile.fechaNacimiento).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long', 
                          day: 'numeric'
                        })
                      : 'No especificada'
                    }
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Posición</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {profile.posicion || 'No especificada'}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Equipo</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {profile.equipo ? profile.equipo.nombre : 'Sin equipo asignado'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    (Solo el administrador puede cambiar el equipo)
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Número de Camiseta</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {profile.numeroCasaca ? `#${profile.numeroCasaca}` : 'No asignado'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    (Solo el administrador puede cambiar el número)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}