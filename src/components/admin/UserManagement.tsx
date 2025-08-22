'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  telefono?: string;
  role: 'admin' | 'anotador' | 'jugador';
  equipos?: { nombre: string };
  numero_casaca?: number;
  activo: boolean;
  created_at: string;
}

interface CreateUserFormData {
  email: string;
  password: string;
  nombre: string;
  telefono: string;
  role: 'anotador' | 'jugador';
  equipoId: string;
  numeroCasaca: string;
}

export default function UserManagement() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<Usuario[]>([]);
  const [allUsers, setAllUsers] = useState<Usuario[]>([]); // Para mantener conteos estables
  const [equipos, setEquipos] = useState<{id: string; nombre: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'all' | 'jugador' | 'anotador'>('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState<CreateUserFormData>({
    email: '',
    password: '',
    nombre: '',
    telefono: '',
    role: 'jugador',
    equipoId: '',
    numeroCasaca: '',
  });

  useEffect(() => {
    fetchAllUsers();
    fetchEquipos();
  }, []);

  useEffect(() => {
    // Filtrar localmente cuando cambie el rol seleccionado
    filterUsers();
  }, [selectedRole, allUsers]);

  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (selectedRole === 'all') {
      setUsers(allUsers);
    } else {
      setUsers(allUsers.filter(user => user.role === selectedRole));
    }
  };

  const fetchEquipos = async () => {
    try {
      const response = await fetch(`/api/equipos?ligaId=${session?.user?.ligaId}`);
      if (response.ok) {
        const data = await response.json();
        setEquipos(data.equipos || []);
      }
    } catch (error) {
      console.error('Error fetching equipos:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          numeroCasaca: formData.numeroCasaca ? parseInt(formData.numeroCasaca) : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error creating user');
        return;
      }

      const roleText = formData.role === 'anotador' ? 'Anotador' : 'Jugador';
      setSuccess(`${roleText} ${formData.nombre} creado exitosamente. ${formData.role === 'anotador' ? `Credenciales: ${formData.email} / ${formData.password}` : ''}`);
      setFormData({
        email: '',
        password: '',
        nombre: '',
        telefono: '',
        role: 'jugador',
        equipoId: '',
        numeroCasaca: '',
      });
      setShowCreateForm(false);
      fetchAllUsers();
    } catch (error) {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      anotador: 'bg-blue-100 text-blue-800',
      jugador: 'bg-green-100 text-green-800',
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (session?.user?.role !== 'admin') {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Acceso Denegado</h2>
        <p className="text-gray-600 mt-2">Solo los administradores pueden acceder a esta página.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">👥 Gestión de Usuarios</h1>
          <p className="text-slate-400 mt-2">Crea y gestiona jugadores y anotadores</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center justify-center py-3 px-6 border border-transparent rounded-xl shadow-lg text-base font-bold text-white bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all duration-300 transform hover:scale-105"
        >
          <span className="mr-2">{showCreateForm ? '❌' : '➕'}</span>
          {showCreateForm ? 'Cancelar' : 'Crear Usuario'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 text-red-300 rounded-xl backdrop-blur-sm">
          <div className="flex items-center">
            <span className="text-red-400 mr-3 text-lg">⚠️</span>
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 text-green-300 rounded-xl backdrop-blur-sm">
          <div className="flex items-center">
            <span className="text-green-400 mr-3 text-lg">✅</span>
            {success}
          </div>
        </div>
      )}

      {showCreateForm && (
        <div className="mb-8 bg-slate-800/90 backdrop-blur-sm p-8 border border-slate-600 rounded-2xl shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">✨ Crear Nuevo Usuario</h2>
          
          {formData.role === 'anotador' && (
            <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/50 rounded-xl backdrop-blur-sm">
              <div className="flex items-center">
                <div className="text-blue-400 mr-3 text-lg">ℹ️</div>
                <div className="text-sm text-blue-300">
                  <p className="font-semibold mb-1">Creación de Anotador</p>
                  <p>El anotador recibirá estas credenciales para hacer login. Compártelas de forma segura.</p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleCreateUser} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-base font-semibold text-white mb-3">👥 Tipo de Usuario</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'anotador' | 'jugador' })}
                  className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base focus:outline-none focus:border-blue-500 focus:bg-slate-600 transition-all duration-300"
                >
                  <option value="jugador" className="bg-slate-700 text-white">⚾ Jugador</option>
                  <option value="anotador" className="bg-slate-700 text-white">📝 Anotador</option>
                </select>
              </div>

              <div>
                <label className="block text-base font-semibold text-white mb-3">👤 Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Nombre del usuario"
                  className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-slate-600 transition-all duration-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-base font-semibold text-white mb-3">📧 Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="usuario@email.com"
                  className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-slate-600 transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-base font-semibold text-white mb-3">🔒 Contraseña</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-slate-600 transition-all duration-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-base font-semibold text-white mb-3">📱 Teléfono</label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="+1 234 567 890"
                className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-slate-600 transition-all duration-300"
              />
            </div>

            {formData.role === 'jugador' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-base font-semibold text-white mb-3">⚾ Equipo</label>
                  <select
                    required
                    value={formData.equipoId}
                    onChange={(e) => setFormData({ ...formData, equipoId: e.target.value })}
                    className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base focus:outline-none focus:border-blue-500 focus:bg-slate-600 transition-all duration-300"
                  >
                    <option value="" className="bg-slate-700 text-white">Seleccionar equipo</option>
                    {equipos.map((equipo) => (
                      <option key={equipo.id} value={equipo.id} className="bg-slate-700 text-white">
                        {equipo.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-base font-semibold text-white mb-3">🔢 Número de Camiseta</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="99"
                    value={formData.numeroCasaca}
                    onChange={(e) => setFormData({ ...formData, numeroCasaca: e.target.value })}
                    placeholder="1-99"
                    className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-slate-600 transition-all duration-300"
                  />
                </div>
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white bg-gradient-to-r from-green-600 via-green-700 to-green-800 hover:from-green-700 hover:via-green-800 hover:to-green-900 focus:outline-none focus:ring-4 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Creando...
                  </>
                ) : (
                  <>
                    <span className="mr-2">✨</span>
                    Crear {formData.role === 'anotador' ? 'Anotador' : 'Jugador'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="flex space-x-4">
            <button
              onClick={() => setSelectedRole('all')}
              className={`px-4 py-2 rounded-md ${selectedRole === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Todos ({allUsers.length})
            </button>
            <button
              onClick={() => setSelectedRole('jugador')}
              className={`px-4 py-2 rounded-md ${selectedRole === 'jugador' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Jugadores ({allUsers.filter(u => u.role === 'jugador').length})
            </button>
            <button
              onClick={() => setSelectedRole('anotador')}
              className={`px-4 py-2 rounded-md ${selectedRole === 'anotador' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Anotadores ({allUsers.filter(u => u.role === 'anotador').length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Equipo/Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registro
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.nombre}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      {user.telefono && (
                        <div className="text-sm text-gray-500">{user.telefono}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadge(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.role === 'jugador' && user.equipos && (
                      <div>
                        <div className="text-sm text-gray-900">{user.equipos.nombre}</div>
                        <div className="text-sm text-gray-500">#{user.numero_casaca}</div>
                      </div>
                    )}
                    {user.role === 'anotador' && (
                      <div className="text-sm text-gray-500">Anotador oficial</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {users.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              No se encontraron usuarios
            </div>
          )}
          
          {loading && (
            <div className="text-center py-8 text-gray-500">
              Cargando usuarios...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}