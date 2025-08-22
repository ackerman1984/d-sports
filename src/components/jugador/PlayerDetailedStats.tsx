'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface JuegoStats {
  juegoId: string;
  fecha: string;
  equipoLocal: string;
  equipoVisitante: string;
  turnos: number;
  hits: number;
  carreras: number;
  impulsadas: number;
  homeRuns: number;
  basesRobadas: number;
  ponches: number;
  basePorBolas: number;
  errores: number;
}

interface DetailedStats {
  totalTurnos: number;
  totalHits: number;
  totalCarreras: number;
  totalImpulsadas: number;
  totalHomeRuns: number;
  totalBasesRobadas: number;
  totalPonches: number;
  totalBasePorBolas: number;
  totalErrores: number;
  promedioBateo: number;
  porcentajeEmbasado: number;
  juegosPorJuego: JuegoStats[];
}

export default function PlayerDetailedStats() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DetailedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    if (session?.user) {
      fetchDetailedStats();
    }
  }, [session]);

  const fetchDetailedStats = async () => {
    try {
      const response = await fetch(`/api/jugador/estadisticas/detalladas?jugadorId=${session?.user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.estadisticas);
      } else {
        setError('Error cargando las estadísticas detalladas');
      }
    } catch (error) {
      console.error('Error fetching detailed stats:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-300 rounded w-64"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Estadísticas Detalladas</h3>
        </div>
        <div className="p-6 text-center">
          <p className="text-gray-500">{error || 'No se encontraron estadísticas detalladas'}</p>
        </div>
      </div>
    );
  }

  const sections = [
    { id: 'overview', name: 'Resumen General', icon: '📊' },
    { id: 'batting', name: 'Bateo', icon: '🏏' },
    { id: 'fielding', name: 'Defensa', icon: '🥎' },
    { id: 'games', name: 'Por Juego', icon: '📅' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header con botón para expandir/colapsar */}
      <div 
        className="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Estadísticas Detalladas
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {isExpanded ? 'Ocultar' : 'Ver más'}
            </span>
            {isExpanded ? (
              <ChevronUpIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Contenido expandible */}
      {isExpanded && (
        <div className="p-6">
          {/* Navegación de secciones */}
          <div className="flex flex-wrap gap-2 mb-6">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{section.icon}</span>
                <span>{section.name}</span>
              </button>
            ))}
          </div>

          {/* Contenido de las secciones */}
          {activeSection === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Bateo General</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-600">Turnos al Bate:</span>
                    <span className="font-medium">{stats.totalTurnos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-600">Hits:</span>
                    <span className="font-medium">{stats.totalHits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-600">Promedio:</span>
                    <span className="font-medium">{stats.promedioBateo.toFixed(3)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">Anotación</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-green-600">Carreras:</span>
                    <span className="font-medium">{stats.totalCarreras}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-600">Impulsadas:</span>
                    <span className="font-medium">{stats.totalImpulsadas}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-600">Home Runs:</span>
                    <span className="font-medium">{stats.totalHomeRuns}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-800 mb-2">Base Running</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-purple-600">Bases Robadas:</span>
                    <span className="font-medium">{stats.totalBasesRobadas}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-purple-600">Bases por Bola:</span>
                    <span className="font-medium">{stats.totalBasePorBolas}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-purple-600">% Embasado:</span>
                    <span className="font-medium">{stats.porcentajeEmbasado.toFixed(3)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'batting' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalTurnos}</div>
                  <div className="text-sm text-blue-800">Turnos al Bate</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.totalHits}</div>
                  <div className="text-sm text-green-800">Hits</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.totalHomeRuns}</div>
                  <div className="text-sm text-yellow-800">Home Runs</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.totalPonches}</div>
                  <div className="text-sm text-red-800">Ponches</div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'fielding' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-red-600">{stats.totalErrores}</div>
                  <div className="text-sm text-red-800">Errores Totales</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {stats.juegosPorJuego.length - stats.totalErrores}
                  </div>
                  <div className="text-sm text-green-800">Juegos Sin Errores</div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'games' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VS</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">AB</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">H</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">R</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">RBI</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">HR</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">SO</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">BB</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">E</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.juegosPorJuego.map((juego, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(juego.fecha).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {juego.equipoLocal} vs {juego.equipoVisitante}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-900">{juego.turnos}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-900">{juego.hits}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-900">{juego.carreras}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-900">{juego.impulsadas}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-900">{juego.homeRuns}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-900">{juego.ponches}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-900">{juego.basePorBolas}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-900">{juego.errores}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {stats.juegosPorJuego.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No hay juegos registrados aún</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}