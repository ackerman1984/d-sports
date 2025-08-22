'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import PhotoUpload from '@/components/ui/PhotoUpload';
import AnotadorHistorial from './AnotadorHistorial';

interface Anotador {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  foto_url?: string;
  codigo_acceso: string;
  activo: boolean;
  created_at: string;
  liga_id: string;
}

export default function AnotadorManagement() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'anotadores' | 'historial'>('anotadores');
  const [anotadores, setAnotadores] = useState<Anotador[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAnotador, setEditingAnotador] = useState<Anotador | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    foto_url: '',
    codigo_acceso: ''
  });

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchAnotadores();
    }
  }, [session]);

  const fetchAnotadores = async () => {
    try {
      console.log('Fetching anotadores...');
      const response = await fetch('/api/admin/anotadores');
      console.log('Fetch anotadores response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Anotadores data received:', data);
        setAnotadores(data.anotadores || []);
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        setError(`Error cargando anotadores: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Fetch anotadores error:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const generateAccessCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submit started');
    setSaving(true);
    setError('');
    setSuccess('');
    
    console.log('Form data being sent:', {
      ...formData,
      foto_url: formData.foto_url ? `${formData.foto_url.substring(0, 50)}...` : 'No photo'
    });

    try {
      const url = editingAnotador 
        ? `/api/admin/anotadores/${editingAnotador.id}`
        : '/api/admin/anotadores';
      
      const method = editingAnotador ? 'PUT' : 'POST';

      const dataToSend = formData;

      console.log('Making API call to:', url, 'with method:', method);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      console.log('API response status:', response.status);
      const data = await response.json();
      console.log('API response data:', data);

      if (response.ok) {
        setSuccess(editingAnotador ? 'Anotador actualizado exitosamente' : 'Anotador registrado exitosamente');
        setShowForm(false);
        setEditingAnotador(null);
        setFormData({ nombre: '', telefono: '', email: '', foto_url: '', codigo_acceso: '' });
        
        // Refrescar la lista de anotadores para mostrar el nuevo
        await fetchAnotadores();
        
        // Limpiar mensajes después de 3 segundos
        setTimeout(() => {
          setSuccess('');
          setError('');
        }, 3000);
      } else {
        console.error('Error response:', data);
        setError(data.error || 'Error al guardar anotador');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Error de conexión: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (anotador: Anotador) => {
    setEditingAnotador(anotador);
    setFormData({
      nombre: anotador.nombre,
      telefono: anotador.telefono || '',
      email: anotador.email || '',
      foto_url: anotador.foto_url || '',
      codigo_acceso: anotador.codigo_acceso || ''
    });
    setShowForm(true);
  };

  const handleToggleActive = async (anotadorId: string, activo: boolean) => {
    try {
      const response = await fetch(`/api/admin/anotadores/${anotadorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activo: !activo }),
      });

      if (response.ok) {
        fetchAnotadores();
        setSuccess('Estado del anotador actualizado');
      } else {
        setError('Error actualizando estado');
      }
    } catch (error) {
      setError('Error de conexión');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Código copiado al portapapeles');
  };

  if (session?.user?.role !== 'admin') {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Acceso Denegado</h2>
        <p className="text-gray-600 mt-2">Solo los administradores pueden acceder a esta funcionalidad.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Anotadores</h2>
          <p className="text-gray-600 mt-1">Registra y gestiona los anotadores de la liga</p>
        </div>
        {activeTab === 'anotadores' && (
          <button
            onClick={() => {
              setShowForm(true);
              setEditingAnotador(null);
              setFormData({ nombre: '', telefono: '', email: '', foto_url: '', codigo_acceso: '' });
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            ➕ Nuevo Anotador
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('anotadores')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'anotadores'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            👥 Anotadores ({anotadores.length})
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'historial'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📋 Historial de Anotaciones
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'anotadores' ? (
        <div>
          {/* Mensajes */}
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

          {/* Formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">
              {editingAnotador ? 'Editar Anotador' : 'Nuevo Anotador'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre del anotador"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono de Contacto
                </label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: +1 555-123-4567"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Opcional - Para contacto del administrador
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email de Contacto
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="anotador@email.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Opcional - Para notificaciones y contacto
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código de Acceso {editingAnotador ? '' : '(Opcional)'}
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={formData.codigo_acceso}
                    onChange={(e) => setFormData({ ...formData, codigo_acceso: e.target.value.toUpperCase() })}
                    className="flex-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={editingAnotador ? "Código actual" : "Ej: ANOT001 (se genera automático si está vacío)"}
                    maxLength={20}
                  />
                  {!editingAnotador && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, codigo_acceso: generateAccessCode() })}
                      className="bg-gray-500 text-white px-3 py-2 rounded-md hover:bg-gray-600 text-sm"
                    >
                      🎲 Generar
                    </button>
                  )}
                </div>
                {!editingAnotador && (
                  <p className="text-xs text-gray-500 mt-1">
                    El anotador usará SOLO este código para acceder al sistema (sin email ni contraseña)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Foto (Opcional)
                </label>
                <PhotoUpload
                  currentPhoto={formData.foto_url}
                  onPhotoChange={(url) => {
                    console.log('PhotoUpload onPhotoChange called with:', url ? url.substring(0, 50) + '...' : null);
                    setFormData({ ...formData, foto_url: url || '' });
                    console.log('FormData updated, foto_url length:', url ? url.length : 0);
                  }}
                  className="w-full"
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingAnotador(null);
                    setFormData({ nombre: '', telefono: '', email: '', foto_url: '', codigo_acceso: '' });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : (editingAnotador ? 'Actualizar' : 'Registrar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de anotadores */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : anotadores.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-gray-400 text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay anotadores registrados
          </h3>
          <p className="text-gray-500">
            Registra tu primer anotador para comenzar.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {anotadores.map((anotador) => (
              <li key={anotador.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-12 w-12">
                      {anotador.foto_url ? (
                        <img
                          className="h-12 w-12 rounded-full object-cover"
                          src={anotador.foto_url}
                          alt={anotador.nombre}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-gray-600 font-bold text-lg">
                            {anotador.nombre.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {anotador.nombre}
                      </div>
                      <div className="text-sm text-gray-500">
                        {anotador.telefono && anotador.email ? (
                          <>📞 {anotador.telefono} • 📧 {anotador.email}</>
                        ) : anotador.telefono ? (
                          `📞 ${anotador.telefono}`
                        ) : anotador.email ? (
                          `📧 ${anotador.email}`
                        ) : (
                          'Anotador de la liga'
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        Registrado: {new Date(anotador.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {/* Código de acceso */}
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Código de Acceso</div>
                      <div className="flex items-center space-x-2">
                        <span className="bg-gray-100 px-3 py-1 rounded font-mono text-sm">
                          {anotador.codigo_acceso}
                        </span>
                        <button
                          onClick={() => copyToClipboard(anotador.codigo_acceso)}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                          title="Copiar código"
                        >
                          📋
                        </button>
                      </div>
                    </div>

                    {/* Estado */}
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Estado</div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        anotador.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {anotador.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    {/* Acciones */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(anotador)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleToggleActive(anotador.id, anotador.activo)}
                        className={`text-sm ${
                          anotador.activo 
                            ? 'text-red-600 hover:text-red-800' 
                            : 'text-green-600 hover:text-green-800'
                        }`}
                      >
                        {anotador.activo ? '🚫 Desactivar' : '✅ Activar'}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
        </div>
      ) : (
        <AnotadorHistorial />
      )}
    </div>
  );
}