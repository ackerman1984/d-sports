'use client';

import { useState, useEffect } from 'react';

interface PlayerStats {
  id: string;
  nombre: string;
  numero_casaca: number;
  equipo_nombre: string;
  equipo_id: string;
  juegos_jugados: number;
  turnos: number;
  hits: number;
  carreras: number;
  impulsadas: number;
  home_runs: number;
  bases_robadas: number;
  ponches: number;
  base_por_bolas: number;
  errores: number;
  promedio_bateo: number;
}

interface GlobalStatsProps {
  ligaId: string;
  temporadaId?: string;
}

export default function GlobalStats({ ligaId, temporadaId }: GlobalStatsProps) {
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<keyof PlayerStats>('promedio_bateo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchStats();
  }, [ligaId, temporadaId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const url = `/api/stats/global?liga_id=${ligaId}${temporadaId ? `&temporada_id=${temporadaId}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Error cargando estadísticas');
      }
      
      const data = await response.json();
      setStats(data.estadisticas || []);
    } catch (error) {
      setError('Error cargando estadísticas');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof PlayerStats) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const filteredAndSortedStats = stats
    .filter(player => 
      player.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.equipo_nombre.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      const numA = Number(aValue) || 0;
      const numB = Number(bValue) || 0;
      return sortOrder === 'asc' ? numA - numB : numB - numA;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Cargando estadísticas...</span>
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
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            📊 Estadísticas Globales ({filteredAndSortedStats.length} jugadores)
          </h3>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Buscar jugador o equipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={fetchStats}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de estadísticas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[
                  { key: 'nombre', label: 'Jugador' },
                  { key: 'numero_casaca', label: '#' },
                  { key: 'equipo_nombre', label: 'Equipo' },
                  { key: 'juegos_jugados', label: 'JJ' },
                  { key: 'promedio_bateo', label: 'AVG' },
                  { key: 'turnos', label: 'AB' },
                  { key: 'hits', label: 'H' },
                  { key: 'carreras', label: 'C' },
                  { key: 'impulsadas', label: 'CI' },
                  { key: 'home_runs', label: 'HR' },
                  { key: 'bases_robadas', label: 'SB' },
                  { key: 'ponches', label: 'K' },
                  { key: 'base_por_bolas', label: 'BB' },
                  { key: 'errores', label: 'E' }
                ].map((column) => (
                  <th
                    key={column.key}
                    onClick={() => handleSort(column.key as keyof PlayerStats)}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center">
                      {column.label}
                      {sortBy === column.key && (
                        <span className="ml-1">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedStats.map((player, index) => (
                <tr key={player.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{player.nombre}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {player.numero_casaca}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {player.equipo_nombre}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {player.bases_robadas}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {player.ponches}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {player.base_por_bolas}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {player.errores}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredAndSortedStats.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          No se encontraron estadísticas para los filtros seleccionados.
        </div>
      )}
    </div>
  );
}