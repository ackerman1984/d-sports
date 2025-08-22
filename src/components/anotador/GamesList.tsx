'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Game {
  id: string;
  fecha: string;
  fecha_programada: string;
  hora_programada: string;
  equipo_local: { nombre: string; id: string };
  equipo_visitante: { nombre: string; id: string };
  campo: { nombre: string; id: string | null };
  horario: { nombre: string; hora_inicio: string; id: string | null };
  estado: 'programado' | 'en_progreso' | 'finalizado';
  estado_para_anotador: 'disponible' | 'asignado_a_mi' | 'asignado_a_otro' | 'fuera_de_tiempo';
  puede_asignarse: boolean;
  puede_anotar: boolean;
  disponible_para_anotar: boolean;
  anotador_asignado?: {
    id: string;
    nombre: string;
  };
  historial_anotacion: {
    veces_editado: number;
    ultima_edicion: string | null;
    anotadores_que_editaron: string[];
    total_ediciones: number;
    tiene_estadisticas: boolean;
    detalle_ediciones: any[];
  };
  semana: number;
}

interface AnotadorSession {
  anotador: {
    id: string;
    nombre: string;
    email: string;
    liga: {
      id: string;
      nombre: string;
      codigo: string;
    };
  };
}

export default function GamesList() {
  const router = useRouter();
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [anotadorSession, setAnotadorSession] = useState<AnotadorSession | null>(null);
  const [currentFilter, setCurrentFilter] = useState<'todos' | 'mis_juegos' | 'disponibles' | 'proximos'>('todos');
  const [selectedGameInfo, setSelectedGameInfo] = useState<Game | null>(null);
  const [showGameModal, setShowGameModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnotadorSession();
  }, []);

  useEffect(() => {
    if (anotadorSession) {
      fetchJuegos();
    }
  }, [anotadorSession]);

  const fetchAnotadorSession = async () => {
    try {
      const response = await fetch('/api/anotador/session');
      if (response.ok) {
        const data = await response.json();
        setAnotadorSession(data.session);
      } else {
        router.push('/anotador/login');
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      router.push('/anotador/login');
    }
  };

  const fetchJuegos = async () => {
    try {
      const response = await fetch('/api/anotador/juegos-disponibles');
      if (response.ok) {
        const data = await response.json();
        
        // Usar todos los juegos con la nueva estructura
        const todosLosJuegos = data.todosLosJuegos || [];
        
        // Agrupar juegos por semanas basado en la fecha para mantener compatibilidad
        const juegosConSemana = todosLosJuegos.map((juego: any) => {
          const fechaJuego = new Date(juego.fecha);
          const ahora = new Date();
          const diffTime = fechaJuego.getTime() - ahora.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // Calcular semana basado en cuántos días faltan
          let semana = 1;
          if (diffDays > 7) semana = 2;
          if (diffDays > 14) semana = 3;
          if (diffDays > 21) semana = 4;
          
          return {
            ...juego,
            semana,
            fecha: juego.fecha_programada,
            hora: juego.hora_programada,
            lugar: juego.campo?.nombre || 'Campo Principal'
          };
        });
        
        setAllGames(juegosConSemana);
      } else {
        setError('Error cargando juegos');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleAnnotateGame = (gameId: string) => {
    router.push(`/anotador/juego/${gameId}`);
  };

  const handleAssignToGame = async (gameId: string) => {
    try {
      const response = await fetch('/api/anotador/asignar-juego', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ juegoId: gameId }),
      });

      if (response.ok) {
        // Actualizar el juego localmente
        setAllGames(prevGames => 
          prevGames.map(game => 
            game.id === gameId 
              ? { ...game, anotador_asignado: { id: anotadorSession!.anotador.id, nombre: anotadorSession!.anotador.nombre } }
              : game
          )
        );
      } else {
        const data = await response.json();
        setError(data.error || 'Error asignándose al juego');
      }
    } catch (error) {
      setError('Error de conexión');
    }
  };

  const getFilteredGames = () => {
    switch (currentFilter) {
      case 'mis_juegos':
        return allGames.filter(game => game.estado_para_anotador === 'asignado_a_mi');
      case 'disponibles':
        return allGames.filter(game => game.puede_asignarse);
      case 'proximos':
        const ahora = new Date();
        const unaSemana = 7 * 24 * 60 * 60 * 1000;
        return allGames.filter(game => {
          const fechaJuego = new Date(game.fecha);
          return fechaJuego.getTime() > ahora.getTime() && 
                 fechaJuego.getTime() <= ahora.getTime() + unaSemana;
        });
      default:
        return allGames;
    }
  };

  const handleShowGameInfo = (game: Game) => {
    setSelectedGameInfo(game);
    setShowGameModal(true);
  };

  const getStatusBadge = (estado: string) => {
    const colors = {
      programado: 'bg-yellow-500',
      en_progreso: 'bg-green-500',
      finalizado: 'bg-blue-500',
    };
    return colors[estado as keyof typeof colors] || 'bg-gray-500';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!anotadorSession) {
    return (
      <div className="text-center p-8 bg-gray-900 min-h-screen text-white">
        <h2 className="text-2xl font-bold text-red-600">Sesión Expirada</h2>
        <p className="text-gray-400 mt-2">Por favor, inicia sesión nuevamente.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Partidos</h1>
              <p className="mt-1 text-sm text-gray-300">
                Anotador: {anotadorSession.anotador.nombre} - {anotadorSession.anotador.liga.nombre}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-600 text-white">
                📝 Anotador
              </span>
              <button
                onClick={() => router.push('/anotador/dashboard')}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm"
              >
                ← Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mensajes */}
        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-700 text-red-100 rounded-lg">
            {error}
          </div>
        )}

        {/* Filtros de partidos */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'todos', label: '📋 Todos los partidos', count: allGames.length },
              { key: 'mis_juegos', label: '👤 Mis partidos', count: allGames.filter(g => g.estado_para_anotador === 'asignado_a_mi').length },
              { key: 'disponibles', label: '✋ Disponibles', count: allGames.filter(g => g.puede_asignarse).length },
              { key: 'proximos', label: '⏰ Próximos 7 días', count: (() => {
                const ahora = new Date();
                const unaSemana = 7 * 24 * 60 * 60 * 1000;
                return allGames.filter(game => {
                  const fechaJuego = new Date(game.fecha);
                  return fechaJuego.getTime() > ahora.getTime() && fechaJuego.getTime() <= ahora.getTime() + unaSemana;
                }).length;
              })() }
            ].map(filter => (
              <button
                key={filter.key}
                onClick={() => setCurrentFilter(filter.key as any)}
                className={`px-4 py-2 rounded-lg font-semibold ${
                  currentFilter === filter.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Partidos */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-6">
            {currentFilter === 'todos' && 'Todos los partidos'}
            {currentFilter === 'mis_juegos' && 'Mis partidos asignados'}
            {currentFilter === 'disponibles' && 'Partidos disponibles'}
            {currentFilter === 'proximos' && 'Próximos 7 días'}
          </h2>

          {getFilteredGames().length === 0 ? (
            <div className="bg-gray-800 rounded-lg shadow p-8 text-center">
              <div className="text-gray-400 text-6xl mb-4">⚾</div>
              <h3 className="text-lg font-medium text-white mb-2">
                No hay partidos programados
              </h3>
              <p className="text-gray-400">
                No hay partidos para esta semana.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {getFilteredGames().map((game) => (
                <div
                  key={game.id}
                  className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-gray-600 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-3">
                        <h3 className="text-xl font-bold text-white">
                          {game.equipo_visitante.nombre} vs {game.equipo_local.nombre}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getStatusBadge(game.estado)}`}>
                          {game.estado.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
                        <div className="flex items-center">
                          <span className="text-blue-400 mr-2">📅</span>
                          {formatDate(game.fecha)}
                        </div>
                        <div className="flex items-center">
                          <span className="text-green-400 mr-2">🕐</span>
                          {game.hora_programada}
                        </div>
                        <div className="flex items-center">
                          <span className="text-yellow-400 mr-2">📍</span>
                          {game.campo.nombre}
                        </div>
                      </div>

                      {game.anotador_asignado && (
                        <div className="mt-3 flex items-center">
                          <span className="text-purple-400 mr-2">👤</span>
                          <span className="text-sm text-gray-300">
                            Anotador: {game.anotador_asignado.nombre}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="ml-6 flex flex-col space-y-2">
                      {/* Indicador de historial */}
                      {game.historial_anotacion.tiene_estadisticas && (
                        <div className="text-xs text-gray-400 mb-2">
                          📊 Anotado {game.historial_anotacion.total_ediciones} veces
                          {game.historial_anotacion.veces_editado > 0 && ` (${game.historial_anotacion.veces_editado} ediciones)`}
                        </div>
                      )}
                      
                      {/* Botón principal según el estado */}
                      {game.puede_anotar ? (
                        <button
                          onClick={() => handleAnnotateGame(game.id)}
                          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold text-sm transition-colors"
                        >
                          📝 Anotar Partido
                        </button>
                      ) : game.puede_asignarse ? (
                        <button
                          onClick={() => handleAssignToGame(game.id)}
                          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold text-sm transition-colors"
                        >
                          ✋ Asignarme
                        </button>
                      ) : game.estado_para_anotador === 'fuera_de_tiempo' ? (
                        <div className="bg-yellow-600 text-white px-6 py-3 rounded-lg text-sm text-center">
                          🕐 Fuera de tiempo
                        </div>
                      ) : game.estado_para_anotador === 'asignado_a_otro' ? (
                        <div className="bg-gray-600 text-gray-300 px-6 py-3 rounded-lg text-sm text-center">
                          👤 Asignado a {game.anotador_asignado?.nombre || 'otro anotador'}
                        </div>
                      ) : (
                        <div className="bg-gray-600 text-gray-300 px-6 py-3 rounded-lg text-sm text-center">
                          ⏳ No disponible
                        </div>
                      )}
                      
                      {/* Botón de más información */}
                      <button
                        onClick={() => handleShowGameInfo(game)}
                        className="bg-gray-700 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-600 text-xs transition-colors"
                      >
                        ℹ️ Más información
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Información adicional */}
        <div className="mt-12 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">ℹ️ Información</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <p className="mb-2">• Solo puedes anotar partidos asignados a ti</p>
              <p className="mb-2">• <span className="text-blue-400">Ventana de asignación:</span> 2 días antes hasta 2 días después del juego</p>
            </div>
            <div>
              <p className="mb-2">• <span className="text-green-400">📝 Anotar:</span> Partido ya asignado a ti</p>
              <p className="mb-2">• <span className="text-blue-400">✋ Asignarme:</span> Partido disponible para asignarte</p>
              <p className="mb-2">• <span className="text-yellow-400">🕐 Fuera de tiempo:</span> Ventana de asignación cerrada</p>
            </div>
          </div>
        </div>
        
        {/* Modal de información detallada */}
        {showGameModal && selectedGameInfo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-white">
                    📋 Detalles del Partido
                  </h3>
                  <button
                    onClick={() => setShowGameModal(false)}
                    className="text-gray-400 hover:text-white text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                {/* Información básica */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-white mb-3">⚾ Enfrentamiento</h4>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-white mb-2">
                        {selectedGameInfo.equipo_visitante.nombre} vs {selectedGameInfo.equipo_local.nombre}
                      </div>
                      <div className="text-gray-300">
                        📅 {selectedGameInfo.fecha} • 🕐 {selectedGameInfo.hora_programada} • 🏟️ {selectedGameInfo.campo.nombre}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Estado y disponibilidad */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-white mb-3">📊 Estado del Partido</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-700 rounded-lg p-3">
                      <div className="text-sm text-gray-400">Estado</div>
                      <div className={`font-semibold ${selectedGameInfo.estado === 'finalizado' ? 'text-green-400' : selectedGameInfo.estado === 'en_progreso' ? 'text-yellow-400' : 'text-blue-400'}`}>
                        {selectedGameInfo.estado.replace('_', ' ').toUpperCase()}
                      </div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3">
                      <div className="text-sm text-gray-400">Disponibilidad</div>
                      <div className={`font-semibold ${selectedGameInfo.puede_anotar ? 'text-green-400' : selectedGameInfo.puede_asignarse ? 'text-blue-400' : 'text-gray-400'}`}>
                        {selectedGameInfo.puede_anotar ? '✅ Puedes anotar' : 
                         selectedGameInfo.puede_asignarse ? '✋ Puedes asignarte' : 
                         selectedGameInfo.estado_para_anotador === 'fuera_de_tiempo' ? '🕐 Fuera de tiempo' : 
                         '❌ No disponible'}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Historial de anotación */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-white mb-3">📈 Historial de Anotación</h4>
                  <div className="bg-gray-700 rounded-lg p-4">
                    {selectedGameInfo.historial_anotacion.tiene_estadisticas ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-blue-400">
                              {selectedGameInfo.historial_anotacion.total_ediciones}
                            </div>
                            <div className="text-xs text-gray-400">Veces anotado</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-yellow-400">
                              {selectedGameInfo.historial_anotacion.veces_editado}
                            </div>
                            <div className="text-xs text-gray-400">Ediciones</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-400">
                              {selectedGameInfo.historial_anotacion.anotadores_que_editaron.length}
                            </div>
                            <div className="text-xs text-gray-400">Anotadores</div>
                          </div>
                        </div>
                        
                        {selectedGameInfo.historial_anotacion.anotadores_que_editaron.length > 0 && (
                          <div>
                            <div className="text-sm text-gray-400 mb-2">Anotadores que han trabajado en este partido:</div>
                            <div className="flex flex-wrap gap-2">
                              {selectedGameInfo.historial_anotacion.anotadores_que_editaron.map((anotador, index) => (
                                <span key={index} className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
                                  👤 {anotador}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {selectedGameInfo.historial_anotacion.ultima_edicion && (
                          <div className="text-sm text-gray-400">
                            Última actividad: {new Date(selectedGameInfo.historial_anotacion.ultima_edicion).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-gray-400">
                        📝 Este partido aún no ha sido anotado
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Asignación actual */}
                {selectedGameInfo.anotador_asignado && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-white mb-3">👤 Anotador Asignado</h4>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-white font-semibold">
                        {selectedGameInfo.anotador_asignado.nombre}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {selectedGameInfo.anotador_asignado.id === anotadorSession?.anotador.id ? 
                          '✅ Eres tú' : '👥 Otro anotador'}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Botones de acción */}
                <div className="flex gap-3">
                  {selectedGameInfo.puede_anotar && (
                    <button
                      onClick={() => {
                        setShowGameModal(false);
                        handleAnnotateGame(selectedGameInfo.id);
                      }}
                      className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold transition-colors"
                    >
                      📝 Anotar Partido
                    </button>
                  )}
                  {selectedGameInfo.puede_asignarse && (
                    <button
                      onClick={() => {
                        setShowGameModal(false);
                        handleAssignToGame(selectedGameInfo.id);
                      }}
                      className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                    >
                      ✋ Asignarme
                    </button>
                  )}
                  <button
                    onClick={() => setShowGameModal(false)}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}