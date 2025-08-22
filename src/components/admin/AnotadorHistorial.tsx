'use client';

import { useState, useEffect } from 'react';

interface HistorialItem {
  id: string;
  anotador: {
    id: string;
    nombre: string;
    email: string;
  };
  juego: {
    id: string;
    fecha: string;
    estado: string;
    equipos: string;
  };
  fecha_asignacion: string;
  fecha_completado?: string;
  notas?: string;
  estado: 'asignado' | 'completado';
}

export default function AnotadorHistorial() {
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistorial();
  }, []);

  const fetchHistorial = async () => {
    try {
      const response = await fetch('/api/admin/anotadores/historial');
      if (response.ok) {
        const data = await response.json();
        setHistorial(data.historial || []);
      } else {
        setError('Error cargando historial');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const colors = {
      asignado: 'bg-yellow-100 text-yellow-800',
      completado: 'bg-green-100 text-green-800',
    };
    return colors[estado as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getJuegoEstadoBadge = (estado: string) => {
    const colors = {
      programado: 'bg-blue-100 text-blue-800',
      en_progreso: 'bg-orange-100 text-orange-800',
      finalizado: 'bg-green-100 text-green-800',
      suspendido: 'bg-red-100 text-red-800',
    };
    return colors[estado as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          📋 Historial de Anotaciones ({historial.length})
        </h3>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {historial.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Sin historial de anotaciones
          </h3>
          <p className="text-gray-500">
            Cuando los anotadores se asignen a juegos, aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {historial.map((item) => (
              <li key={item.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          📝 {item.anotador.nombre}
                        </h4>
                        <div className="flex space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoBadge(item.estado)}`}>
                            {item.estado === 'asignado' ? '⏳ Asignado' : '✅ Completado'}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getJuegoEstadoBadge(item.juego.estado)}`}>
                            {item.juego.estado.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-900 font-medium mb-1">
                            🏆 {item.juego.equipos}
                          </p>
                          <p className="text-xs text-gray-500">
                            📅 {new Date(item.juego.fecha).toLocaleDateString('es-ES', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            <span className="font-medium">Asignado:</span> {new Date(item.fecha_asignacion).toLocaleDateString('es-ES', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {item.fecha_completado && (
                            <p className="text-xs text-gray-500">
                              <span className="font-medium">Completado:</span> {new Date(item.fecha_completado).toLocaleDateString('es-ES', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          )}
                        </div>
                      </div>

                      {item.notas && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                          <span className="font-medium">Notas:</span> {item.notas}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}