'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useThemeClasses } from '@/components/providers/theme-provider';
import { teamsAPI, Team, Player } from '@/lib/api/teams';
import toast from 'react-hot-toast';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  UsersIcon,
  SwatchIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

// Types are now imported from API

interface TeamManagementProps {
  onBack?: () => void;
}

export default function TeamManagement({ onBack }: TeamManagementProps) {
  const { data: session } = useSession();
  const themeClasses = useThemeClasses();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [showEditTeam, setShowEditTeam] = useState(false);
  const [teamPlayers, setTeamPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAddPlayer, setShowAddPlayer] = useState(false);

  // Estados del formulario
  const [teamForm, setTeamForm] = useState({
    nombre: '',
    color: '#619BF3',
    logo_url: ''
  });

  const [playerForm, setPlayerForm] = useState({
    nombre: '',
    numero_casaca: '',
    posicion: '',
    foto_url: ''
  });

  useEffect(() => {
    if (session?.user?.ligaId) {
      fetchTeams();
    }
  }, [session]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!session?.user?.ligaId) {
        throw new Error('No liga ID found in session');
      }

      const teamsData = await teamsAPI.getTeamsByLiga(session.user.ligaId);
      setTeams(teamsData);
    } catch (error) {
      console.error('Error loading teams:', error);
      setError(error instanceof Error ? error.message : 'Error cargando equipos');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamPlayers = async (teamId: string) => {
    try {
      const playersData = await teamsAPI.getTeamPlayers(teamId);
      setTeamPlayers(playersData);
    } catch (error) {
      console.error('Error loading team players:', error);
      setError(error instanceof Error ? error.message : 'Error cargando jugadores');
    }
  };

  const handleAddTeam = async () => {
    try {
      if (!session?.user?.ligaId) {
        throw new Error('No liga ID found in session');
      }

      console.log('Creating team with data:', {
        ...teamForm,
        liga_id: session.user.ligaId,
        activo: true
      });

      const newTeam = await teamsAPI.createTeam({
        ...teamForm,
        liga_id: session.user.ligaId,
        activo: true
      });
      
      console.log('Team created successfully:', newTeam);
      
      setTeams([...teams, newTeam]);
      setTeamForm({ nombre: '', color: '#619BF3', logo_url: '' });
      setShowAddTeam(false);
      setError(null);
    } catch (error) {
      console.error('Error creating team:', error);
      // Los errores ya son mostrados por toast en la API
    }
  };

  const handleEditTeam = async () => {
    if (!selectedTeam) return;
    
    try {
      const updatedTeam = await teamsAPI.updateTeam(selectedTeam.id, teamForm);
      
      setTeams(teams.map(team => 
        team.id === selectedTeam.id 
          ? { ...team, ...updatedTeam }
          : team
      ));
      
      setShowEditTeam(false);
      setSelectedTeam(null);
      setError(null);
    } catch (error) {
      console.error('Error updating team:', error);
      setError(error instanceof Error ? error.message : 'Error actualizando equipo');
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este equipo?')) return;
    
    try {
      await teamsAPI.deleteTeam(teamId);
      setTeams(teams.filter(team => team.id !== teamId));
      setError(null);
    } catch (error) {
      console.error('Error deleting team:', error);
      setError(error instanceof Error ? error.message : 'Error eliminando equipo');
    }
  };

  const openEditTeam = (team: Team) => {
    setSelectedTeam(team);
    setTeamForm({
      nombre: team.nombre,
      color: team.color,
      logo_url: team.logo_url || ''
    });
    setShowEditTeam(true);
  };

  const openTeamDetail = (team: Team) => {
    setSelectedTeam(team);
    fetchTeamPlayers(team.id);
  };

  const handleAddPlayer = async () => {
    if (!selectedTeam) return;
    
    try {
      const newPlayer = await teamsAPI.createPlayer({
        ...playerForm,
        numero_casaca: parseInt(playerForm.numero_casaca),
        equipo_id: selectedTeam.id,
        activo: true
      });
      
      setTeamPlayers([...teamPlayers, newPlayer]);
      setPlayerForm({ nombre: '', numero_casaca: '', posicion: '', foto_url: '' });
      setShowAddPlayer(false);
      setError(null);
    } catch (error) {
      console.error('Error creating player:', error);
      // Los errores ya son mostrados por toast en la API
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este jugador?')) return;
    
    try {
      await teamsAPI.deletePlayer(playerId);
      setTeamPlayers(teamPlayers.filter(player => player.id !== playerId));
      setError(null);
    } catch (error) {
      console.error('Error deleting player:', error);
      setError(error instanceof Error ? error.message : 'Error eliminando jugador');
    }
  };

  // Vista de detalle de equipo
  if (selectedTeam && !showEditTeam) {
    return (
      <div className="space-y-6">
        {/* Header con botón de regreso */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSelectedTeam(null)}
              className={`p-2 rounded-lg ${themeClasses.btnSecondary} hover:scale-105 transition-transform`}
            >
              <ChevronRightIcon className="w-5 h-5 rotate-180" />
            </button>
            <div className="flex items-center space-x-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg"
                style={{ backgroundColor: selectedTeam.color }}
              >
                {selectedTeam.nombre.charAt(0)}
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${themeClasses.text}`}>
                  {selectedTeam.nombre}
                </h2>
                <p className={`${themeClasses.textMuted}`}>
                  {teamPlayers.length} jugadores activos
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => openEditTeam(selectedTeam)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${themeClasses.btnSecondary} hover:scale-105`}
            >
              <PencilIcon className="w-5 h-5 mr-2" />
              Editar Equipo
            </button>
          </div>
        </div>

        {/* Lista de jugadores */}
        <div className={`${themeClasses.card} rounded-xl shadow-xl p-6`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-xl font-semibold ${themeClasses.text}`}>
              Jugadores del Equipo
            </h3>
            <button
              onClick={() => setShowAddPlayer(true)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${themeClasses.btnPrimary} hover:scale-105`}
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Agregar Jugador
            </button>
          </div>

          <div className="grid gap-4">
            {teamPlayers.map((player) => (
              <div 
                key={player.id}
                className={`p-4 rounded-lg ${themeClasses.surface} border ${themeClasses.border} hover:scale-[1.02] transition-transform`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-lg"
                      style={{ backgroundColor: selectedTeam.color }}
                    >
                      {player.numero_casaca}
                    </div>
                    <div>
                      <h4 className={`font-semibold ${themeClasses.text}`}>
                        {player.nombre}
                      </h4>
                      <p className={`text-sm ${themeClasses.textMuted}`}>
                        {player.posicion || 'Sin posición asignada'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      className={`p-2 rounded-lg ${themeClasses.btnSecondary} hover:scale-105 transition-transform`}
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePlayer(player.id)}
                      className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white hover:scale-105 transition-all"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-3xl font-bold ${themeClasses.text}`}>
            🏆 Gestión de Equipos
          </h2>
          <p className={`mt-2 ${themeClasses.textMuted}`}>
            Administra los equipos de tu liga, jugadores y configuraciones
          </p>
        </div>
        
        <button
          onClick={() => setShowAddTeam(true)}
          className={`px-6 py-3 rounded-xl font-semibold transition-all ${themeClasses.btnPrimary} hover:scale-105 shadow-lg hover:shadow-xl`}
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Nuevo Equipo
        </button>
      </div>

      {/* Grid de equipos */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`${themeClasses.card} rounded-xl p-6 shadow-lg animate-pulse`}>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-gray-300 rounded-xl"></div>
                <div className="h-6 bg-gray-300 rounded w-3/4"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div 
              key={team.id}
              className={`${themeClasses.card} rounded-xl shadow-xl border ${themeClasses.border} hover:scale-105 transition-all duration-200 cursor-pointer group`}
              onClick={() => openTeamDetail(team)}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div 
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: team.color }}
                  >
                    {team.nombre.charAt(0)}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditTeam(team);
                      }}
                      className={`p-2 rounded-lg ${themeClasses.btnSecondary} hover:scale-105 transition-transform opacity-0 group-hover:opacity-100`}
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTeam(team.id);
                      }}
                      className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white hover:scale-105 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h3 className={`text-xl font-bold ${themeClasses.text} group-hover:text-accent-500 transition-colors`}>
                    {team.nombre}
                  </h3>
                  
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <UsersIcon className="w-4 h-4" />
                      <span className={themeClasses.textMuted}>{team.jugadores_count} jugadores</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <SwatchIcon className="w-4 h-4" />
                      <div 
                        className="w-4 h-4 rounded border-2 border-white shadow-sm"
                        style={{ backgroundColor: team.color }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      team.activo 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {team.activo ? '● Activo' : '○ Inactivo'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Agregar Equipo */}
      {showAddTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${themeClasses.card} rounded-xl p-6 max-w-md w-full shadow-2xl`}>
            <h3 className={`text-xl font-bold ${themeClasses.text} mb-6`}>
              Crear Nuevo Equipo
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                  Nombre del Equipo *
                </label>
                <input
                  type="text"
                  value={teamForm.nombre}
                  onChange={(e) => setTeamForm({ ...teamForm, nombre: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${themeClasses.input}`}
                  placeholder="Ej. Águilas Azules"
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                  Color del Equipo
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={teamForm.color}
                    onChange={(e) => setTeamForm({ ...teamForm, color: e.target.value })}
                    className="w-12 h-10 rounded border"
                  />
                  <input
                    type="text"
                    value={teamForm.color}
                    onChange={(e) => setTeamForm({ ...teamForm, color: e.target.value })}
                    className={`flex-1 px-4 py-2 rounded-lg border ${themeClasses.input}`}
                    placeholder="#619BF3"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowAddTeam(false)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium ${themeClasses.btnSecondary}`}
              >
                Cancelar
              </button>
              <button
                onClick={handleAddTeam}
                disabled={!teamForm.nombre.trim()}
                className={`flex-1 px-4 py-2 rounded-lg font-medium ${themeClasses.btnPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Crear Equipo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Equipo */}
      {showEditTeam && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${themeClasses.card} rounded-xl p-6 max-w-md w-full shadow-2xl`}>
            <h3 className={`text-xl font-bold ${themeClasses.text} mb-6`}>
              Editar Equipo
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                  Nombre del Equipo *
                </label>
                <input
                  type="text"
                  value={teamForm.nombre}
                  onChange={(e) => setTeamForm({ ...teamForm, nombre: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${themeClasses.input}`}
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                  Color del Equipo
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={teamForm.color}
                    onChange={(e) => setTeamForm({ ...teamForm, color: e.target.value })}
                    className="w-12 h-10 rounded border"
                  />
                  <input
                    type="text"
                    value={teamForm.color}
                    onChange={(e) => setTeamForm({ ...teamForm, color: e.target.value })}
                    className={`flex-1 px-4 py-2 rounded-lg border ${themeClasses.input}`}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowEditTeam(false);
                  setSelectedTeam(null);
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium ${themeClasses.btnSecondary}`}
              >
                Cancelar
              </button>
              <button
                onClick={handleEditTeam}
                disabled={!teamForm.nombre.trim()}
                className={`flex-1 px-4 py-2 rounded-lg font-medium ${themeClasses.btnPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agregar Jugador */}
      {showAddPlayer && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${themeClasses.card} rounded-xl p-6 max-w-md w-full shadow-2xl`}>
            <h3 className={`text-xl font-bold ${themeClasses.text} mb-6`}>
              Agregar Jugador a {selectedTeam.nombre}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                  Nombre del Jugador *
                </label>
                <input
                  type="text"
                  value={playerForm.nombre}
                  onChange={(e) => setPlayerForm({ ...playerForm, nombre: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${themeClasses.input}`}
                  placeholder="Ej. Carlos Rodriguez"
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                  Número de Casaca *
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={playerForm.numero_casaca}
                  onChange={(e) => setPlayerForm({ ...playerForm, numero_casaca: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${themeClasses.input}`}
                  placeholder="1-99"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                  Posición
                </label>
                <select
                  value={playerForm.posicion}
                  onChange={(e) => setPlayerForm({ ...playerForm, posicion: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${themeClasses.input}`}
                >
                  <option value="">Seleccionar posición</option>
                  <option value="Pitcher">Pitcher (P)</option>
                  <option value="Catcher">Catcher (C)</option>
                  <option value="First Base">Primera Base (1B)</option>
                  <option value="Second Base">Segunda Base (2B)</option>
                  <option value="Third Base">Tercera Base (3B)</option>
                  <option value="Shortstop">Shortstop (SS)</option>
                  <option value="Left Field">Jardín Izquierdo (LF)</option>
                  <option value="Center Field">Jardín Central (CF)</option>
                  <option value="Right Field">Jardín Derecho (RF)</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowAddPlayer(false);
                  setPlayerForm({ nombre: '', numero_casaca: '', posicion: '', foto_url: '' });
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium ${themeClasses.btnSecondary}`}
              >
                Cancelar
              </button>
              <button
                onClick={handleAddPlayer}
                disabled={!playerForm.nombre.trim() || !playerForm.numero_casaca}
                className={`flex-1 px-4 py-2 rounded-lg font-medium ${themeClasses.btnPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Agregar Jugador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className="bg-red-500 text-white px-6 py-4 rounded-lg shadow-xl flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-medium">Error</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="flex-shrink-0 ml-4 text-white hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}