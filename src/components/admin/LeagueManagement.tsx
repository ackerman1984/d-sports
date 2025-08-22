'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Liga {
  id: string;
  nombre: string;
  codigo: string;
  subdominio: string;
  activa: boolean;
  created_at: string;
}

interface Equipo {
  id: string;
  nombre: string;
  color: string;
  activo: boolean;
  jugadoresCount?: number;
}

interface Temporada {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  activa: boolean;
}

export default function LeagueManagement() {
  const { data: session } = useSession();
  const [liga, setLiga] = useState<Liga | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados para formularios
  const [newTeam, setNewTeam] = useState({ nombre: '', color: '#FF6B35' });
  const [newSeason, setNewSeason] = useState({ nombre: '', fecha_inicio: '', fecha_fin: '' });
  const [showNewTeamForm, setShowNewTeamForm] = useState(false);
  const [showNewSeasonForm, setShowNewSeasonForm] = useState(false);

  useEffect(() => {
    if (session?.user?.ligaId) {
      fetchLeagueData();
    }
  }, [session]);

  const fetchLeagueData = async () => {
    try {
      const [ligaRes, equiposRes, temporadasRes] = await Promise.all([
        fetch(`/api/admin/liga`),
        fetch(`/api/admin/equipos`),
        fetch(`/api/admin/temporadas`),
      ]);

      if (ligaRes.ok) {
        const ligaData = await ligaRes.json();
        setLiga(ligaData.liga);
      }

      if (equiposRes.ok) {
        const equiposData = await equiposRes.json();
        setEquipos(equiposData.equipos || []);
      }

      if (temporadasRes.ok) {
        const temporadasData = await temporadasRes.json();
        setTemporadas(temporadasData.temporadas || []);
      }
    } catch (error) {
      setError('Error cargando datos de la liga');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/equipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeam),
      });

      if (response.ok) {
        setSuccess('Equipo creado exitosamente');
        setNewTeam({ nombre: '', color: '#FF6B35' });
        setShowNewTeamForm(false);
        fetchLeagueData();
      } else {
        const data = await response.json();
        setError(data.error || 'Error creando equipo');
      }
    } catch (error) {
      setError('Error de conexión');
    }
  };

  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/temporadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSeason),
      });

      if (response.ok) {
        setSuccess('Temporada creada exitosamente');
        setNewSeason({ nombre: '', fecha_inicio: '', fecha_fin: '' });
        setShowNewSeasonForm(false);
        fetchLeagueData();
      } else {
        const data = await response.json();
        setError(data.error || 'Error creando temporada');
      }
    } catch (error) {
      setError('Error de conexión');
    }
  };

  const toggleTeamStatus = async (equipoId: string, activo: boolean) => {
    try {
      const response = await fetch(`/api/admin/equipos/${equipoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !activo }),
      });

      if (response.ok) {
        setSuccess(`Equipo ${!activo ? 'activado' : 'desactivado'} exitosamente`);
        fetchLeagueData();
      }
    } catch (error) {
      setError('Error actualizando equipo');
    }
  };

  if (session?.user?.role !== 'admin') {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Acceso Denegado</h2>
        <p className="text-gray-600 mt-2">Solo los administradores pueden acceder a esta funcionalidad.</p>
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

  if (!liga) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-gray-600">Liga no encontrada</h2>
        <p className="text-gray-500 mt-2">No se pudo cargar la información de la liga.</p>
      </div>
    );
  }

  return (
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

      {/* Header de Liga */}
      <div className="bg-white rounded-lg shadow-lg mb-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-t-lg">
          <h1 className="text-3xl font-bold">{liga.nombre}</h1>
          <div className="mt-2 flex flex-wrap gap-4 text-blue-100">
            <span>Código: {liga.codigo}</span>
            <span>Subdominio: {liga.subdominio}</span>
            <span className={`px-2 py-1 rounded-full text-xs ${liga.activa ? 'bg-green-500' : 'bg-red-500'}`}>
              {liga.activa ? 'Activa' : 'Inactiva'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Resumen', icon: '📊' },
            { id: 'teams', name: 'Equipos', icon: '⚾' },
            { id: 'seasons', name: 'Temporadas', icon: '🗓️' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon} {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <span className="text-2xl">⚾</span>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Equipos</h3>
                <p className="text-2xl font-bold text-blue-600">{equipos.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <span className="text-2xl">🗓️</span>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Temporadas</h3>
                <p className="text-2xl font-bold text-green-600">{temporadas.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Jugadores</h3>
                <p className="text-2xl font-bold text-purple-600">
                  {equipos.reduce((total, equipo) => total + (equipo.jugadoresCount || 0), 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'teams' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Equipos</h2>
            <button
              onClick={() => setShowNewTeamForm(!showNewTeamForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              {showNewTeamForm ? 'Cancelar' : '+ Nuevo Equipo'}
            </button>
          </div>

          {showNewTeamForm && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="text-lg font-bold mb-4">Crear Nuevo Equipo</h3>
              <form onSubmit={handleCreateTeam} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre</label>
                  <input
                    type="text"
                    required
                    value={newTeam.nombre}
                    onChange={(e) => setNewTeam({ ...newTeam, nombre: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Color</label>
                  <input
                    type="color"
                    value={newTeam.color}
                    onChange={(e) => setNewTeam({ ...newTeam, color: e.target.value })}
                    className="mt-1 block w-full h-10 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  >
                    Crear Equipo
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {equipos.map((equipo) => (
              <div key={equipo.id} className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: equipo.color }}
                    ></div>
                    <h3 className="text-lg font-medium text-gray-900">{equipo.nombre}</h3>
                  </div>
                  <button
                    onClick={() => toggleTeamStatus(equipo.id, equipo.activo)}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      equipo.activo
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {equipo.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  Jugadores: {equipo.jugadoresCount || 0}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'seasons' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Temporadas</h2>
            <button
              onClick={() => setShowNewSeasonForm(!showNewSeasonForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              {showNewSeasonForm ? 'Cancelar' : '+ Nueva Temporada'}
            </button>
          </div>

          {showNewSeasonForm && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="text-lg font-bold mb-4">Crear Nueva Temporada</h3>
              <form onSubmit={handleCreateSeason} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre</label>
                  <input
                    type="text"
                    required
                    value={newSeason.nombre}
                    onChange={(e) => setNewSeason({ ...newSeason, nombre: e.target.value })}
                    placeholder="Temporada 2024"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha Inicio</label>
                  <input
                    type="date"
                    required
                    value={newSeason.fecha_inicio}
                    onChange={(e) => setNewSeason({ ...newSeason, fecha_inicio: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha Fin</label>
                  <input
                    type="date"
                    required
                    value={newSeason.fecha_fin}
                    onChange={(e) => setNewSeason({ ...newSeason, fecha_fin: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  >
                    Crear Temporada
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {temporadas.map((temporada) => (
              <div key={temporada.id} className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{temporada.nombre}</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(temporada.fecha_inicio).toLocaleDateString()} - {' '}
                      {new Date(temporada.fecha_fin).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    temporada.activa
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {temporada.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}