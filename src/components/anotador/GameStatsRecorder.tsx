'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Jugador {
  id: string;
  nombre: string;
  numeroCasaca: number;
  equipoId: string;
}

interface Equipo {
  id: string;
  nombre: string;
  jugadores: Jugador[];
}

interface Juego {
  id: string;
  fecha: string;
  estado: 'programado' | 'en_progreso' | 'finalizado' | 'suspendido';
  equipoLocal: Equipo;
  equipoVisitante: Equipo;
  marcadorLocal: number;
  marcadorVisitante: number;
}

interface EstadisticaJugador {
  jugadorId: string;
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

export default function GameStatsRecorder({ juegoId }: { juegoId: string }) {
  const { data: session } = useSession();
  const [juego, setJuego] = useState<Juego | null>(null);
  const [estadisticas, setEstadisticas] = useState<Map<string, EstadisticaJugador>>(new Map());
  const [selectedTeam, setSelectedTeam] = useState<'local' | 'visitante'>('local');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (juegoId) {
      fetchGameData();
    }
  }, [juegoId]);

  const fetchGameData = async () => {
    try {
      const response = await fetch(`/api/juegos/${juegoId}/stats`);
      if (response.ok) {
        const data = await response.json();
        setJuego(data.juego);
        
        // Inicializar estadísticas
        const statsMap = new Map();
        [...data.juego.equipoLocal.jugadores, ...data.juego.equipoVisitante.jugadores].forEach(jugador => {
          const existingStats = data.estadisticas?.find((stat: {jugadorId: string}) => stat.jugadorId === jugador.id);
          statsMap.set(jugador.id, existingStats || {
            jugadorId: jugador.id,
            turnos: 0,
            hits: 0,
            carreras: 0,
            impulsadas: 0,
            homeRuns: 0,
            basesRobadas: 0,
            ponches: 0,
            basePorBolas: 0,
            errores: 0,
          });
        });
        setEstadisticas(statsMap);
      } else {
        setError('Error cargando datos del juego');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const updateStat = (jugadorId: string, stat: keyof EstadisticaJugador, value: number) => {
    const newStats = new Map(estadisticas);
    const playerStats = newStats.get(jugadorId);
    if (playerStats && typeof playerStats[stat] === 'number') {
      newStats.set(jugadorId, {
        ...playerStats,
        [stat]: Math.max(0, value), // No valores negativos
      });
      setEstadisticas(newStats);
    }
  };

  const incrementStat = (jugadorId: string, stat: keyof EstadisticaJugador) => {
    const playerStats = estadisticas.get(jugadorId);
    if (playerStats && typeof playerStats[stat] === 'number') {
      updateStat(jugadorId, stat, (playerStats[stat] as number) + 1);
    }
  };

  const decrementStat = (jugadorId: string, stat: keyof EstadisticaJugador) => {
    const playerStats = estadisticas.get(jugadorId);
    if (playerStats && typeof playerStats[stat] === 'number') {
      updateStat(jugadorId, stat, Math.max(0, (playerStats[stat] as number) - 1));
    }
  };

  const saveStatistics = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const statsArray = Array.from(estadisticas.values());
      const response = await fetch(`/api/juegos/${juegoId}/stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estadisticas: statsArray,
        }),
      });

      if (response.ok) {
        setSuccess('Estadísticas guardadas exitosamente');
      } else {
        const data = await response.json();
        setError(data.error || 'Error guardando estadísticas');
      }
    } catch (error) {
      setError('Error de conexión al guardar');
    } finally {
      setSaving(false);
    }
  };

  const updateGameStatus = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/juegos/${juegoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estado: newStatus,
        }),
      });

      if (response.ok) {
        setJuego(prev => prev ? { ...prev, estado: newStatus as 'programado' | 'en_progreso' | 'finalizado' | 'suspendido' } : null);
        setSuccess(`Juego marcado como ${newStatus}`);
      }
    } catch (error) {
      setError('Error actualizando estado del juego');
    }
  };

  if (session?.user?.role !== 'anotador' && session?.user?.role !== 'admin') {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Acceso Denegado</h2>
        <p className="text-gray-600 mt-2">Solo los anotadores pueden acceder a esta funcionalidad.</p>
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

  if (!juego) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Juego no encontrado</h2>
        <p className="text-gray-600 mt-2">No se pudo cargar la información del juego.</p>
      </div>
    );
  }

  const currentTeam = selectedTeam === 'local' ? juego.equipoLocal : juego.equipoVisitante;

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header del juego */}
        <div className="bg-gradient-to-r from-green-600 to-green-800 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">
                {juego.equipoLocal.nombre} vs {juego.equipoVisitante.nombre}
              </h1>
              <p className="text-green-100">
                {new Date(juego.fecha).toLocaleDateString()} - {juego.estado.toUpperCase()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                {juego.marcadorLocal} - {juego.marcadorVisitante}
              </div>
            </div>
          </div>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="m-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="m-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        {/* Controles del juego */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-4">
            {juego.estado === 'programado' && (
              <button
                onClick={() => updateGameStatus('en_progreso')}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Iniciar Juego
              </button>
            )}
            {juego.estado === 'en_progreso' && (
              <>
                <button
                  onClick={() => updateGameStatus('finalizado')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Finalizar Juego
                </button>
                <button
                  onClick={() => updateGameStatus('suspendido')}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700"
                >
                  Suspender Juego
                </button>
              </>
            )}
            <button
              onClick={saveStatistics}
              disabled={saving}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Estadísticas'}
            </button>
          </div>
        </div>

        {/* Selector de equipo */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex space-x-4">
            <button
              onClick={() => setSelectedTeam('local')}
              className={`px-6 py-2 font-medium rounded-md ${
                selectedTeam === 'local'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {juego.equipoLocal.nombre} (Local)
            </button>
            <button
              onClick={() => setSelectedTeam('visitante')}
              className={`px-6 py-2 font-medium rounded-md ${
                selectedTeam === 'visitante'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {juego.equipoVisitante.nombre} (Visitante)
            </button>
          </div>
        </div>

        {/* Tabla de estadísticas */}
        <div className="p-4">
          <h3 className="text-xl font-bold mb-4">{currentTeam.nombre}</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jugador</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">TB</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">H</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">C</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">CI</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">HR</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">BR</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">K</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">BB</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">E</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentTeam.jugadores.map((jugador) => {
                  const stats = estadisticas.get(jugador.id);
                  if (!stats) return null;

                  return (
                    <tr key={jugador.id}>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          #{jugador.numeroCasaca} {jugador.nombre}
                        </div>
                      </td>
                      {(['turnos', 'hits', 'carreras', 'impulsadas', 'homeRuns', 'basesRobadas', 'ponches', 'basePorBolas', 'errores'] as const).map((stat) => (
                        <td key={stat} className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => decrementStat(jugador.id, stat)}
                              className="w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                              disabled={juego.estado === 'finalizado'}
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-medium">
                              {stats[stat]}
                            </span>
                            <button
                              onClick={() => incrementStat(jugador.id, stat)}
                              className="w-6 h-6 bg-green-500 text-white rounded-full text-xs hover:bg-green-600"
                              disabled={juego.estado === 'finalizado'}
                            >
                              +
                            </button>
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="mt-4 bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-700 mb-2">Leyenda:</h4>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-sm text-gray-600">
          <div>TB: Turnos al Bate</div>
          <div>H: Hits</div>
          <div>C: Carreras</div>
          <div>CI: Carreras Impulsadas</div>
          <div>HR: Home Runs</div>
          <div>BR: Bases Robadas</div>
          <div>K: Ponches</div>
          <div>BB: Base por Bolas</div>
          <div>E: Errores</div>
        </div>
      </div>
    </div>
  );
}