'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface PlayerStatsSummary {
  carreras: number;
  hits: number;
  errores: number;
  ponches: number;
  basesRobadas: number;
  basePorBolas: number;
  juegosJugados: number;
  turnos: number;
  homeRuns: number;
  impulsadas: number;
  promedioBateo: number;
}

export default function PlayerStatsSummary() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<PlayerStatsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session?.user) {
      fetchPlayerStats();
    }
  }, [session]);

  const fetchPlayerStats = async () => {
    try {
      const response = await fetch(`/api/jugador/estadisticas?jugadorId=${session?.user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.estadisticas);
      } else {
        setError('Error cargando las estadísticas');
      }
    } catch (error) {
      console.error('Error fetching player stats:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="text-center">
                <div className="h-8 bg-gray-300 rounded mb-2"></div>
                <div className="h-4 bg-gray-300 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Estadísticas Principales</h2>
        <div className="text-center py-8">
          <p className="text-gray-500">{error || 'No se encontraron estadísticas'}</p>
          <p className="text-sm text-gray-400 mt-2">
            Las estadísticas aparecerán cuando hayas jugado al menos un juego
          </p>
        </div>
      </div>
    );
  }

  const statItems = [
    {
      label: 'C',
      fullLabel: 'Carreras',
      value: stats.carreras,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: '🏃'
    },
    {
      label: 'H',
      fullLabel: 'Hits',
      value: stats.hits,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      icon: '⚾'
    },
    {
      label: 'JJ',
      fullLabel: 'Juegos Jugados',
      value: stats.juegosJugados,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      icon: '🎯'
    },
    {
      label: 'E',
      fullLabel: 'Errores',
      value: stats.errores,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: '❌'
    },
    {
      label: 'K',
      fullLabel: 'Ponches',
      value: stats.ponches,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      icon: '🚫'
    },
    {
      label: 'BR',
      fullLabel: 'Bases Robadas',
      value: stats.basesRobadas,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      icon: '💨'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Estadísticas Principales</h2>
      
      {/* Estadísticas principales */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {statItems.map((stat, index) => (
          <div
            key={index}
            className={`${stat.bgColor} ${stat.borderColor} border rounded-xl p-4 text-center hover:shadow-lg transition-all duration-200 hover:scale-105 group`}
            title={stat.fullLabel}
          >
            <div className="text-2xl mb-2 group-hover:animate-bounce">
              {stat.icon}
            </div>
            <div className={`text-3xl font-bold ${stat.color} mb-2`}>
              {stat.value}
            </div>
            <div className="text-sm text-gray-600 font-semibold mb-1">
              {stat.label}
            </div>
            <div className="text-xs text-gray-500">
              {stat.fullLabel}
            </div>
          </div>
        ))}
      </div>

      {/* Métricas adicionales */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Métricas de Rendimiento</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">
              {stats.promedioBateo.toFixed(3)}
            </div>
            <div className="text-sm text-gray-600">Promedio de Bateo</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">
              {stats.homeRuns}
            </div>
            <div className="text-sm text-gray-600">Home Runs</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-purple-600">
              {stats.impulsadas}
            </div>
            <div className="text-sm text-gray-600">Carreras Impulsadas</div>
          </div>
        </div>
      </div>
    </div>
  );
}