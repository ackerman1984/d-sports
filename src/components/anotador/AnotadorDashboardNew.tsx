'use client';

import { useState, useEffect } from 'react';

interface Juego {
  id: string;
  fecha: string;
  fecha_programada?: string;
  hora_programada?: string;
  estado: 'programado' | 'confirmado' | 'en_progreso' | 'finalizado' | 'pospuesto' | 'cancelado';
  equipo_local: { id: string; nombre: string };
  equipo_visitante: { id: string; nombre: string };
  marcador_local: number;
  marcador_visitante: number;
  disponible_para_anotar?: boolean;
  campo?: { id: string; nombre: string };
  horario?: { id: string; nombre: string; hora_inicio: string; hora_fin: string };
  anotador_asignado?: {
    id: string;
    nombre: string;
  };
}

interface AnotadorSession {
  anotador: {
    id: string;
    nombre: string;
    email: string;
    liga_id: string;
    liga: {
      id: string;
      nombre: string;
      codigo: string;
    };
  };
}

export default function AnotadorDashboardNew() {
  const [anotadorSession, setAnotadorSession] = useState<AnotadorSession | null>(null);
  const [juegosDisponibles, setJuegosDisponibles] = useState<Juego[]>([]);
  const [misJuegos, setMisJuegos] = useState<Juego[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
        // Redirigir al login si no hay sesión
        window.location.href = '/anotador/login';
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      window.location.href = '/anotador/login';
    }
  };

  const fetchJuegos = async () => {
    try {
      const response = await fetch('/api/anotador/juegos-disponibles');
      if (response.ok) {
        const data = await response.json();
        setJuegosDisponibles(data.juegosDisponibles || []);
        setMisJuegos(data.misJuegos || []);
      } else {
        setError('Error cargando juegos');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const asignarseAJuego = async (juegoId: string) => {
    try {
      const response = await fetch('/api/anotador/asignar-juego', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ juegoId }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Te has asignado al juego exitosamente');
        fetchJuegos(); // Refrescar la lista
      } else {
        setError(data.error || 'Error asignándose al juego');
      }
    } catch (error) {
      setError('Error de conexión');
    }
  };

  const iniciarAnotacion = (juegoId: string) => {
    window.location.href = `/anotador/juego/${juegoId}`;
  };

  const cerrarSesion = async () => {
    try {
      await fetch('/api/anotador/logout', { method: 'POST' });
      window.location.href = '/anotador/login';
    } catch (error) {
      console.error('Error cerrando sesión:', error);
      window.location.href = '/anotador/login';
    }
  };

  const getEstadoBadge = (estado: string) => {
    const colors = {
      programado: 'bg-yellow-100 text-yellow-800',
      confirmado: 'bg-blue-100 text-blue-800',
      en_progreso: 'bg-green-100 text-green-800',
      finalizado: 'bg-gray-100 text-gray-800',
      pospuesto: 'bg-orange-100 text-orange-800',
      cancelado: 'bg-red-100 text-red-800',
    };
    return colors[estado as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!anotadorSession) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Sesión Expirada</h2>
        <p className="text-gray-600 mt-2">Por favor, inicia sesión nuevamente.</p>
        <button
          onClick={() => window.location.href = '/anotador/login'}
          className="mt-4 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
        >
          Ir al Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Panel de Anotador
              </h1>
              <p className="mt-1 text-sm text-green-100">
                {anotadorSession.anotador.nombre} - {anotadorSession.anotador.liga.nombre}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                📝 Anotador
              </span>
              <button
                onClick={cerrarSesion}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* Mis Juegos Asignados */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            🎯 Mis Juegos Asignados ({misJuegos.length})
          </h2>
          
          {misJuegos.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <div className="text-gray-400 text-6xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tienes juegos asignados aún
              </h3>
              <p className="text-gray-500">
                Selecciona un juego disponible de la lista de abajo para comenzar a anotar.
              </p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {misJuegos.map((juego) => (
                  <li key={juego.id}>
                    <div className="px-4 py-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium text-gray-900">
                            {juego.equipo_local.nombre} vs {juego.equipo_visitante.nombre}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoBadge(juego.estado)}`}>
                            {juego.estado.toUpperCase()}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <span>
                            📅 {new Date(juego.fecha).toLocaleDateString('es-ES', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {juego.estado === 'finalizado' && (
                            <span className="ml-4 font-medium">
                              Resultado: {juego.marcador_local} - {juego.marcador_visitante}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex space-x-2">
                        <button
                          onClick={() => iniciarAnotacion(juego.id)}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm"
                        >
                          {juego.estado === 'programado' ? '▶️ Iniciar' : 
                           juego.estado === 'en_progreso' ? '📝 Continuar' : 
                           '👁️ Ver Estadísticas'}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Juegos Disponibles */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            📋 Juegos Disponibles ({juegosDisponibles.length})
          </h2>
          
          {juegosDisponibles.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <div className="text-gray-400 text-6xl mb-4">🏆</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay juegos disponibles
              </h3>
              <p className="text-gray-500">
                Todos los juegos ya tienen anotador asignado o no hay juegos programados.
              </p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {juegosDisponibles.map((juego) => (
                  <li key={juego.id}>
                    <div className="px-4 py-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium text-gray-900">
                            {juego.equipo_local.nombre} vs {juego.equipo_visitante.nombre}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoBadge(juego.estado)}`}>
                            {juego.estado.toUpperCase()}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center text-sm text-gray-500">
                            <span>
                              📅 {new Date(juego.fecha).toLocaleDateString('es-ES', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {juego.campo && (
                              <span className="ml-4">
                                📍 {juego.campo.nombre}
                              </span>
                            )}
                            {juego.horario && (
                              <span className="ml-4">
                                🕐 {juego.horario.hora_inicio} - {juego.horario.hora_fin}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center">
                            <span className="text-green-600 font-medium text-sm">
                              🆓 Sin anotador asignado
                            </span>
                            {juego.disponible_para_anotar === false && (
                              <span className="ml-4 text-orange-600 font-medium text-sm">
                                🔒 Disponible 2 días antes del partido
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        <button
                          onClick={() => asignarseAJuego(juego.id)}
                          disabled={juego.disponible_para_anotar === false}
                          className={`px-4 py-2 rounded-md text-sm ${
                            juego.disponible_para_anotar === false
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {juego.disponible_para_anotar === false ? '🔒 Bloqueado' : '✋ Asignarme'}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Estadísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-bold">✅</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Juegos Completados
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {misJuegos.filter(j => j.estado === 'finalizado').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-bold">📋</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Juegos Asignados
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {misJuegos.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-bold">🔄</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      En Progreso
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {misJuegos.filter(j => j.estado === 'en_progreso').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}