'use client';

import { useSession, signOut } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useState, useEffect } from 'react';
import BackButton, { useAdminNavigation } from '@/components/ui/BackButton';
import UserManagement from '@/components/admin/UserManagement';
import LeagueManagement from '@/components/admin/LeagueManagement';
import TeamManagement from '@/components/admin/TeamManagement';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

interface DashboardStats {
  totalUsuarios: number;
  jugadoresActivos: number;
  anotadores: number;
  totalEquipos: number;
  juegosJugados: number;
  temporadaActiva: string;
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const { goBack } = useAdminNavigation();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<DashboardStats>({
    totalUsuarios: 0,
    jugadoresActivos: 0,
    anotadores: 0,
    totalEquipos: 0,
    juegosJugados: 0,
    temporadaActiva: 'N/A'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.ligaId) {
      fetchDashboardStats();
    }
  }, [session]);

  const fetchDashboardStats = async () => {
    try {
      // Simulamos datos por ahora, luego crearemos las APIs reales
      setStats({
        totalUsuarios: 12,
        jugadoresActivos: 8,
        anotadores: 2,
        totalEquipos: 4,
        juegosJugados: 0,
        temporadaActiva: 'Temporada 2024'
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header mejorado con estilo consistent */}
      <div className="bg-slate-800/90 backdrop-blur-sm shadow-2xl border-b border-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  ⚾
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    Panel de Administración
                  </h1>
                  <p className="mt-1 text-sm text-slate-300">
                    Bienvenido, {session.user.name}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Badge de rol */}
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg">
                <Cog6ToothIcon className="w-4 h-4 mr-1" />
                Administrador
              </span>

              {/* Botón logout */}
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 text-white px-6 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Botón de regreso para secciones no-overview */}
        {activeTab !== 'overview' && (
          <div className="mb-6">
            <BackButton 
              onClick={() => goBack(setActiveTab)}
              label="Volver al Resumen"
              variant="default"
            />
          </div>
        )}

        {/* Navigation Tabs mejoradas */}
        <div className="border-b border-slate-600 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Resumen', icon: '📊', desc: 'Estadísticas generales', color: 'from-blue-500 to-blue-600' },
              { id: 'league', name: 'Liga', icon: '🏆', desc: 'Gestión de liga y temporadas', color: 'from-yellow-500 to-orange-600' },
              { id: 'users', name: 'Usuarios', icon: '👥', desc: 'Jugadores y anotadores', color: 'from-green-500 to-green-600' },
              { id: 'teams', name: 'Equipos', icon: '⚾', desc: 'Gestión de equipos', color: 'from-purple-500 to-purple-600' },
              { id: 'games', name: 'Juegos', icon: '🎯', desc: 'Programar y gestionar juegos', color: 'from-red-500 to-red-600' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-all duration-200 rounded-t-lg ${
                  activeTab === tab.id
                    ? `border-blue-500 text-white bg-slate-700/50`
                    : `border-transparent text-slate-400 hover:text-white hover:border-slate-500`
                }`}
                title={tab.desc}
              >
                <span className="flex items-center space-x-2">
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.name}</span>
                </span>
                {activeTab === tab.id && (
                  <div className={`absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r ${tab.color} rounded-full`}></div>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Cards con estilo consistente */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Total Usuarios */}
              <div className="bg-slate-800/90 backdrop-blur-sm overflow-hidden shadow-2xl rounded-2xl border border-slate-600 hover:scale-105 transition-transform duration-200">
                <div className="p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-300 text-sm font-medium">👥 Usuarios Totales</p>
                      <p className="text-4xl font-bold">{loading ? '--' : stats.totalUsuarios}</p>
                    </div>
                    <div className="text-blue-400">
                      <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <span className="text-slate-400 text-xs">En toda la liga</span>
                    <div className="ml-auto">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Jugadores Activos */}
              <div className="bg-slate-800/90 backdrop-blur-sm overflow-hidden shadow-2xl rounded-2xl border border-slate-600 hover:scale-105 transition-transform duration-200">
                <div className="p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-300 text-sm font-medium">⚾ Jugadores Activos</p>
                      <p className="text-4xl font-bold">{loading ? '--' : stats.jugadoresActivos}</p>
                    </div>
                    <div className="text-green-400">
                      <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <span className="text-slate-400 text-xs">Listos para jugar</span>
                    <div className="ml-auto">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Equipos */}
              <div className="bg-slate-800/90 backdrop-blur-sm overflow-hidden shadow-2xl rounded-2xl border border-slate-600 hover:scale-105 transition-transform duration-200">
                <div className="p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-300 text-sm font-medium">🏆 Equipos</p>
                      <p className="text-3xl font-bold">{loading ? '--' : stats.totalEquipos}</p>
                    </div>
                    <div className="text-purple-400">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-slate-400 text-xs">En competencia</span>
                  </div>
                </div>
              </div>

              {/* Anotadores */}
              <div className="bg-slate-800/90 backdrop-blur-sm overflow-hidden shadow-2xl rounded-2xl border border-slate-600 hover:scale-105 transition-transform duration-200">
                <div className="p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-300 text-sm font-medium">📝 Anotadores</p>
                      <p className="text-3xl font-bold">{loading ? '--' : stats.anotadores}</p>
                    </div>
                    <div className="text-orange-400">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-slate-400 text-xs">Registrando estadísticas</span>
                  </div>
                </div>
              </div>

              {/* Juegos Jugados */}
              <div className="bg-slate-800/90 backdrop-blur-sm overflow-hidden shadow-2xl rounded-2xl border border-slate-600 hover:scale-105 transition-transform duration-200">
                <div className="p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-300 text-sm font-medium">🎯 Juegos Jugados</p>
                      <p className="text-3xl font-bold">{loading ? '--' : stats.juegosJugados}</p>
                    </div>
                    <div className="text-red-400">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-slate-400 text-xs">Esta temporada</span>
                  </div>
                </div>
              </div>

              {/* Temporada Actual */}
              <div className="bg-slate-800/90 backdrop-blur-sm overflow-hidden shadow-2xl rounded-2xl border border-slate-600 hover:scale-105 transition-transform duration-200">
                <div className="p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-300 text-sm font-medium">📅 Temporada Actual</p>
                      <p className="text-lg font-bold">{loading ? '--' : stats.temporadaActiva}</p>
                    </div>
                    <div className="text-indigo-400">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-slate-400 text-xs">En progreso</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-800/90 backdrop-blur-sm shadow-2xl rounded-2xl border border-slate-600 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">🚀 Acciones Rápidas</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button 
                  onClick={() => setActiveTab('users')}
                  className="flex flex-col items-center p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-all duration-300 group hover:scale-105"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xl mb-2 group-hover:from-blue-600 group-hover:to-blue-700 transition-all duration-300 shadow-lg">
                    👥
                  </div>
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white">Gestionar Usuarios</span>
                </button>
                
                <button 
                  onClick={() => setActiveTab('teams')}
                  className="flex flex-col items-center p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-all duration-300 group hover:scale-105"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-xl mb-2 group-hover:from-green-600 group-hover:to-green-700 transition-all duration-300 shadow-lg">
                    ⚾
                  </div>
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white">Ver Equipos</span>
                </button>
                
                <button 
                  onClick={() => setActiveTab('games')}
                  className="flex flex-col items-center p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-all duration-300 group hover:scale-105"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl mb-2 group-hover:from-purple-600 group-hover:to-purple-700 transition-all duration-300 shadow-lg">
                    🎯
                  </div>
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white">Programar Juego</span>
                </button>
                
                <button 
                  onClick={() => setActiveTab('league')}
                  className="flex flex-col items-center p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-all duration-300 group hover:scale-105"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white text-xl mb-2 group-hover:from-orange-600 group-hover:to-orange-700 transition-all duration-300 shadow-lg">
                    🏆
                  </div>
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white">Configurar Liga</span>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-slate-800/90 backdrop-blur-sm shadow-2xl rounded-2xl border border-slate-600 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">📈 Actividad Reciente</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-xl">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm shadow-lg">
                    ✓
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Liga creada exitosamente</p>
                    <p className="text-xs text-slate-400">Hace 2 horas</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-xl">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm shadow-lg">
                    👥
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">4 equipos configurados</p>
                    <p className="text-xs text-slate-400">Hace 1 hora</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-xl">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm shadow-lg">
                    🎯
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Listo para programar juegos</p>
                    <p className="text-xs text-slate-400">Ahora</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'league' && <LeagueManagement />}
        {activeTab === 'users' && <UserManagement />}
        
        {activeTab === 'teams' && <TeamManagement />}

        {activeTab === 'games' && (
          <div className="bg-slate-800/90 backdrop-blur-sm shadow-2xl rounded-2xl border border-slate-600 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">🎯 Gestión de Juegos</h3>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🚧</div>
              <h4 className="text-xl font-semibold text-white mb-2">Próximamente</h4>
              <p className="text-slate-300 mb-6">Aquí podrás programar y gestionar todos los juegos de tu liga.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                <div className="p-4 bg-slate-700/50 rounded-xl">
                  <div className="text-2xl mb-2">📅</div>
                  <p className="text-sm font-medium text-slate-300">Programar Juegos</p>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-xl">
                  <div className="text-2xl mb-2">⏱️</div>
                  <p className="text-sm font-medium text-slate-300">Control de Tiempo</p>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-xl">
                  <div className="text-2xl mb-2">📊</div>
                  <p className="text-sm font-medium text-slate-300">Registrar Puntuación</p>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-xl">
                  <div className="text-2xl mb-2">👨‍💼</div>
                  <p className="text-sm font-medium text-slate-300">Asignar Anotadores</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}