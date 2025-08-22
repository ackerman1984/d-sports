'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import PhotoUpload from '@/components/ui/PhotoUpload';

interface AnotadorProfile {
  id: string;
  email: string;
  nombre: string;
  telefono?: string;
  fotoUrl?: string;
}

export default function AnotadorProfileManagement() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<AnotadorProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    fotoUrl: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/profile');
      const data = await response.json();

      if (response.ok) {
        setProfile(data.profile);
        setFormData({
          nombre: data.profile.nombre || '',
          telefono: data.profile.telefono || '',
          fotoUrl: data.profile.fotoUrl || '',
        });
      } else {
        setError(data.error || 'Error al cargar el perfil');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!formData.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          telefono: formData.telefono,
          fotoUrl: formData.fotoUrl,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setProfile(data.profile);
        setIsEditing(false);
        setSuccess('Perfil actualizado correctamente');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Error al actualizar el perfil');
      }
    } catch (error) {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    if (profile) {
      setFormData({
        nombre: profile.nombre || '',
        telefono: profile.telefono || '',
        fotoUrl: profile.fotoUrl || '',
      });
    }
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded mb-4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-red-600">No se pudo cargar la información del perfil.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Mi Perfil - Anotador</h1>
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

          {/* Vista de solo lectura */}
          {!isEditing && (
            <div className="space-y-6">
              <div className="flex items-center space-x-6">
                {profile.fotoUrl ? (
                  <img
                    src={profile.fotoUrl}
                    alt="Foto de perfil"
                    className="w-24 h-24 object-cover rounded-full border-4 border-gray-200"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-500 text-2xl font-bold">
                      {profile.nombre?.charAt(0)?.toUpperCase() || 'A'}
                    </span>
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{profile.nombre}</h2>
                  <p className="text-gray-600">{profile.email}</p>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      📝 Anotador
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <p className="text-gray-900">
                    {profile.telefono || 'No especificado'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Liga
                  </label>
                  <p className="text-gray-900">
                    Liga actual
                  </p>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  ✏️ Editar Perfil
                </button>
              </div>
            </div>
          )}

          {/* Vista de edición */}
          {isEditing && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre Completo *
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
                    placeholder="+1234567890"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
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
                  onClick={handleUpdateProfile}
                  disabled={saving}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? '⏳ Guardando...' : '✅ Guardar Cambios'}
                </button>
                <button
                  onClick={resetForm}
                  disabled={saving}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}