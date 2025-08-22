'use client';

import { useState, useEffect } from 'react';

interface TeamStatsData {
  equipo_id: string;
  equipo_nombre: string;
  total_jugadores: number;
  totales: {
    turnos: number;
    hits: number;
    carreras: number;
    impulsadas: number;
    home_runs: number;
    bases_robadas: number;
    ponches: number;
    base_por_bolas: number;
    errores: number;
    juegos_jugados: number;
    promedio_bateo: number;
  };
}

interface PlayerStatsData {
  id: string;
  nombre: string;
  numero_casaca: number;
  turnos: number;
  hits: number;
  carreras: number;
  impulsadas: number;
  home_runs: number;
  bases_robadas: number;
  ponches: number;
  base_por_bolas: number;
  errores: number;
  juegos_jugados: number;
  promedio_bateo: number;
}

interface TeamStatsProps {
  ligaId: string;
  temporadaId?: string;
}

export default function TeamStats({ ligaId, temporadaId }: TeamStatsProps) {
  const [teamStats, setTeamStats] = useState<TeamStatsData[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStatsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTeamStats();
  }, [ligaId, temporadaId]);

  const fetchTeamStats = async () => {
    try {
      setLoading(true);
      const url = `/api/stats/by-team?liga_id=${ligaId}${temporadaId ? `&temporada_id=${temporadaId}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Error cargando estadísticas de equipos');
      }
      
      const data = await response.json();
      setTeamStats(data.equipos || []);
    } catch (error) {
      setError('Error cargando estadísticas de equipos');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerStats = async (equipoId: string) => {
    try {
      setLoadingPlayers(true);
      const url = `/api/stats/by-team?liga_id=${ligaId}&equipo_id=${equipoId}${temporadaId ? `&temporada_id=${temporadaId}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Error cargando estadísticas de jugadores');
      }
      
      const data = await response.json();
      setPlayerStats(data.estadisticas || []);
      setSelectedTeam(equipoId);
    } catch (error) {
      setError('Error cargando estadísticas de jugadores');
      console.error('Error:', error);
    } finally {
      setLoadingPlayers(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Cargando estadísticas de equipos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen por equipos */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            🏟️ Estadísticas por Equipos ({teamStats.length} equipos)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Equipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jugadores
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AVG Equipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Carreras
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  HR
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teamStats.map((team, index) => (
                <tr key={team.equipo_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{team.equipo_nombre}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {team.total_jugadores}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                    {team.totales.promedio_bateo.toFixed(3)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {team.totales.hits}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {team.totales.carreras}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {team.totales.home_runs}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => fetchPlayerStats(team.equipo_id)}
                      className="text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      Ver Jugadores
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Estadísticas de jugadores del equipo seleccionado */}
      {selectedTeam && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h4 className="text-lg font-semibold text-gray-900">
              👥 Jugadores - {teamStats.find(t => t.equipo_id === selectedTeam)?.equipo_nombre}
            </h4>
            <button
              onClick={() => setSelectedTeam(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          {loadingPlayers ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2">Cargando jugadores...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jugador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      JJ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      AVG
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      AB
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      H
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      C
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CI
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      HR
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {playerStats.map((player, index) => (
                    <tr key={player.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{player.nombre}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {player.numero_casaca}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        No especificada
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {player.juegos_jugados}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                        {player.promedio_bateo.toFixed(3)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {player.turnos}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {player.hits}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {player.carreras}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {player.impulsadas}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {player.home_runs}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {teamStats.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          No se encontraron equipos para esta liga.
        </div>
      )}
    </div>
  );
}