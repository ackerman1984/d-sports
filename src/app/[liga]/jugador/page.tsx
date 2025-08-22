'use client';

import { useSession, signOut } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import ProfileEditor from '@/components/jugador/ProfileEditor';

interface JugadorProfile {
  id: string;
  email: string;
  nombre: string;
  telefono?: string;
  fotoUrl?: string;
  numeroCasaca?: number;
  equipoId?: string;
  posicion?: string;
  fechaNacimiento?: string;
  equipo?: {
    id: string;
    nombre: string;
    color: string;
  };
}

interface PlayerStats {
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

export default function JugadorPage() {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<JugadorProfile | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [showScoreMenu, setShowScoreMenu] = useState(false);
  const [activeScoreView, setActiveScoreView] = useState<'equipos' | 'global' | null>(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      console.log('📡 Haciendo fetch del perfil...');
      const response = await fetch('/api/jugador/profile');
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Datos recibidos del servidor:', {
          fechaNacimiento: data.profile.fechaNacimiento,
          posicion: data.profile.posicion,
          nombre: data.profile.nombre
        });
        setProfile(data.profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/jugador/estadisticas?jugadorId=${session?.user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.estadisticas);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
      fetchStats();
    }
  }, [session, fetchProfile, fetchStats]);

  const handleProfileUpdate = async (updatedData: Partial<JugadorProfile>) => {
    console.log('🔄 handleProfileUpdate llamado con:', updatedData);
    
    // Inmediatamente actualizar el estado local con los nuevos datos
    setProfile(prev => {
      const newProfile = prev ? {
        ...prev,
        ...updatedData
      } : null;
      console.log('🔄 Nuevo perfil local:', newProfile);
      return newProfile;
    });
    
    // Refrescar desde el servidor después de un momento para asegurar consistencia
    setTimeout(async () => {
      console.log('🔄 Refrescando desde servidor...');
      await fetchProfile();
    }, 500);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto" style={{ borderColor: '#619BF3' }}></div>
          <p className="mt-4 text-white">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'jugador') {
    redirect('/login');
  }

  const statsData = [
    { label: 'C', value: stats?.carreras || 0 },
    { label: 'H', value: stats?.hits || 0 },
    { label: 'JJ', value: stats?.juegosJugados || 0 },
    { label: 'BR', value: stats?.basesRobadas || 0 },
    { label: 'K', value: stats?.ponches || 0 },
    { label: 'BB', value: stats?.basePorBolas || 0 },
    { label: 'E', value: stats?.errores || 0 },
    { label: '-', value: 0 }
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header con información del jugador */}
      <div className="bg-gradient-to-r from-primary-500 via-accent-500 to-pastel-blue px-6 py-8 shadow-xl">
        {/* Botón de cerrar sesión */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-white/30 transition-all duration-200 flex items-center space-x-2 text-sm font-medium"
          >
            <span>🚪</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
        
        <div className="flex items-center space-x-6">
          {/* Avatar */}
          <div className="relative">
            {profile?.fotoUrl ? (
              <Image
                src={profile.fotoUrl}
                alt={profile.nombre || ''}
                width={96}
                height={96}
                unoptimized={true}
                className="rounded-full border-4 border-white/20 shadow-xl"
              />
            ) : (
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center border-4 border-white/20 shadow-xl backdrop-blur-sm">
                <span className="text-3xl font-bold text-white">
                  {profile?.nombre?.charAt(0).toUpperCase() || 'J'}
                </span>
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 bg-secondary-500 text-white text-sm px-3 py-1 rounded-full font-bold shadow-lg border-2 border-white">
              #{profile?.numeroCasaca || '42'}
            </div>
            {/* Botón Editar Perfil */}
            <button
              onClick={() => setShowProfileEditor(true)}
              className="absolute -top-2 -left-2 bg-primary-500 hover:bg-primary-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-colors"
              title="Editar Perfil"
            >
              ✏️
            </button>
          </div>

          {/* Info del jugador */}
          <div className="text-white">
            <h1 className="text-3xl font-bold text-white mb-2">{profile?.nombre || 'Nombre Jugador'}</h1>
            <div className="text-white/90 space-y-2 text-base">
              <div className="flex items-center">
                <span className="text-pastel-red font-semibold">Equipo:</span>
                <span className="ml-3 font-medium">{profile?.equipo?.nombre || 'Los Tigres'}</span>
              </div>
              <div className="flex items-center">
                <span className="text-pastel-blue font-semibold">Posición:</span>
                <span className="ml-3 font-medium">{profile?.posicion || 'No especificada'}</span>
              </div>
              <div className="flex items-center">
                <span className="text-xl">📞</span>
                <span className="ml-3">{profile?.telefono || 'No especificado'}</span>
              </div>
              <div className="flex items-center">
                <span className="text-xl">📧</span>
                <span className="ml-3">{profile?.email || session?.user?.email}</span>
              </div>
              <div className="flex items-center">
                <span className="text-xl">🎂</span>
                <span className="ml-3">
                  {profile?.fechaNacimiento ? new Date(profile.fechaNacimiento).toLocaleDateString() : 'No especificada'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="px-6 py-8">
        <h2 className="text-white text-2xl font-bold mb-6">Estadísticas</h2>
        
        <div className="grid grid-cols-4 gap-4 mb-8">
          {statsData.map((stat, index) => (
            <div key={index} className="bg-slate-800/80 border border-slate-600 rounded-xl p-4 text-center backdrop-blur-sm hover:bg-slate-800/90 transition-all duration-300">
              <div className="text-2xl font-bold text-white mb-2">
                {stat.value}
              </div>
              <div className="text-slate-300 text-sm font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Botón Más Info */}
        <button
          onClick={() => setShowMoreInfo(!showMoreInfo)}
          className="w-full bg-gradient-to-r from-accent-500 to-primary-500 hover:from-accent-600 hover:to-primary-600 text-white font-semibold py-4 rounded-xl mb-8 transition-all duration-300 shadow-lg"
        >
          Más Info
        </button>

        {/* Sección inferior */}
        <div className="space-y-6">
          {/* Calendario */}
          <div className="bg-slate-800/80 border border-slate-600 rounded-xl p-5 flex items-center backdrop-blur-sm hover:bg-slate-800/90 transition-all duration-300">
            <div className="w-12 h-12 bg-success/20 rounded-xl flex items-center justify-center mr-4 border border-success/30">
              <span className="text-2xl">📅</span>
            </div>
            <div>
              <div className="text-white font-semibold text-lg">Calendario</div>
              <div className="text-slate-400 text-sm">Ver partidos de la liga</div>
            </div>
          </div>

          {/* Score Menu */}
          <div className="bg-slate-800/80 border border-slate-600 rounded-xl overflow-hidden backdrop-blur-sm">
            <div 
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-700/80 transition-all duration-300"
              onClick={() => setShowScoreMenu(!showScoreMenu)}
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-accent-500/20 rounded-xl flex items-center justify-center mr-4 border border-accent-500/30">
                  <span className="text-2xl">📊</span>
                </div>
                <div>
                  <div className="text-white font-semibold text-lg">Score</div>
                  <div className="text-slate-400 text-sm">Ver estadísticas</div>
                </div>
              </div>
              <div className={`text-white transition-transform duration-300 ${showScoreMenu ? 'rotate-180' : ''}`}>
                ▼
              </div>
            </div>
            
            {/* Menú desplegable */}
            {showScoreMenu && (
              <div className="bg-slate-700/80 border-t border-slate-600">
                <button
                  onClick={() => {
                    setActiveScoreView(activeScoreView === 'equipos' ? null : 'equipos');
                    setShowScoreMenu(false);
                  }}
                  className="w-full text-left p-4 text-white hover:bg-slate-600/80 transition-colors border-b border-slate-600 font-medium"
                >
                  Score por Equipos
                </button>
                <button
                  onClick={() => {
                    setActiveScoreView(activeScoreView === 'global' ? null : 'global');
                    setShowScoreMenu(false);
                  }}
                  className="w-full text-left p-4 text-white hover:bg-slate-600/80 transition-colors font-medium"
                >
                  Score Global
                </button>
              </div>
            )}
          </div>

          {/* Botones Equipos y Jugadores */}
          <div className="grid grid-cols-2 gap-6">
            <button 
              onClick={() => window.location.href = '/poli/equipos'}
              className="bg-gradient-to-r from-pastel-red to-secondary-500 hover:from-pastel-red/90 hover:to-secondary-600 text-white font-semibold py-4 rounded-xl transition-all duration-300 shadow-lg"
            >
              Equipos
            </button>
            <button 
              onClick={() => window.location.href = '/poli/jugador/dashboard'}
              className="bg-gradient-to-r from-pastel-blue to-accent-500 hover:from-pastel-blue/90 hover:to-accent-600 text-white font-semibold py-4 rounded-xl transition-all duration-300 shadow-lg"
            >
              Jugadores
            </button>
          </div>
        </div>
      </div>

      {/* Vista de Score por Equipos */}
      {activeScoreView === 'equipos' && (
        <div className="px-6 py-6 bg-slate-800/80 border border-slate-600 mx-6 rounded-xl mb-8 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-bold text-lg">Score por Equipos</h3>
            <button 
              onClick={() => setActiveScoreView(null)}
              className="text-slate-400 hover:text-white transition-colors w-8 h-8 rounded-full hover:bg-slate-700 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
          <div className="space-y-4">
            {/* Ejemplo de scores por equipos */}
            <div className="flex justify-between items-center bg-slate-700/60 border border-slate-600 p-4 rounded-xl">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-secondary-500 rounded-full mr-3"></div>
                <span className="text-white font-medium">Tigres</span>
              </div>
              <div className="text-white font-bold text-lg">8 - 5</div>
              <div className="flex items-center">
                <span className="text-white font-medium">Leones</span>
                <div className="w-4 h-4 bg-accent-500 rounded-full ml-3"></div>
              </div>
            </div>
            <div className="flex justify-between items-center bg-slate-700/60 border border-slate-600 p-4 rounded-xl">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-accent-500 rounded-full mr-3"></div>
                <span className="text-white font-medium">Leones</span>
              </div>
              <div className="text-white font-bold text-lg">3 - 7</div>
              <div className="flex items-center">
                <span className="text-white font-medium">Tigres</span>
                <div className="w-4 h-4 bg-secondary-500 rounded-full ml-3"></div>
              </div>
            </div>
            <div className="flex justify-between items-center bg-slate-700/60 border border-slate-600 p-4 rounded-xl">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-secondary-500 rounded-full mr-3"></div>
                <span className="text-white font-medium">Tigres</span>
              </div>
              <div className="text-white font-bold text-lg">12 - 4</div>
              <div className="flex items-center">
                <span className="text-white font-medium">Leones</span>
                <div className="w-4 h-4 bg-accent-500 rounded-full ml-3"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vista de Score Global */}
      {activeScoreView === 'global' && (
        <div className="px-6 py-6 bg-slate-800/80 border border-slate-600 mx-6 rounded-xl mb-8 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-bold text-lg">Score Global</h3>
            <button 
              onClick={() => setActiveScoreView(null)}
              className="text-slate-400 hover:text-white transition-colors w-8 h-8 rounded-full hover:bg-slate-700 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
          <div className="space-y-6">
            {/* Estadísticas globales de la liga */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-700/60 border border-slate-600 p-4 rounded-xl text-center">
                <div className="text-3xl font-bold text-white">24</div>
                <div className="text-slate-300 text-sm font-medium mt-1">Total Juegos</div>
              </div>
              <div className="bg-slate-700/60 border border-slate-600 p-4 rounded-xl text-center">
                <div className="text-3xl font-bold text-white">148</div>
                <div className="text-slate-300 text-sm font-medium mt-1">Total Carreras</div>
              </div>
            </div>
            <div className="bg-slate-700/60 border border-slate-600 p-5 rounded-xl">
              <h4 className="text-white font-bold mb-4">Líderes de la Liga</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Más Hits:</span>
                  <span className="text-white font-semibold">Carlos Rodriguez (9)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Más Carreras:</span>
                  <span className="text-white font-semibold">Juan Pérez (8)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Home Runs:</span>
                  <span className="text-white font-semibold">Mario López (5)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mostrar información adicional si está expandido */}
      {showMoreInfo && (
        <div className="px-6 py-6 bg-slate-800/80 border border-slate-600 mx-6 rounded-xl mb-8 backdrop-blur-sm">
          <h3 className="text-white font-bold text-lg mb-4">Información Adicional</h3>
          <div className="text-slate-300 space-y-3">
            <div className="flex justify-between items-center">
              <span>Promedio de Bateo:</span>
              <span className="text-white font-semibold">{stats?.promedioBateo.toFixed(3) || '0.000'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Home Runs:</span>
              <span className="text-white font-semibold">{stats?.homeRuns || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Carreras Impulsadas:</span>
              <span className="text-white font-semibold">{stats?.impulsadas || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición de Perfil */}
      {showProfileEditor && profile && (
        <ProfileEditor
          profile={{
            nombre: profile.nombre,
            telefono: profile.telefono || '',
            fotoUrl: profile.fotoUrl || '',
            posicion: profile.posicion || '',
            email: profile.email || session?.user?.email || '',
            numeroCasaca: profile.numeroCasaca,
            fechaNacimiento: profile.fechaNacimiento || ''
          }}
          onProfileUpdate={handleProfileUpdate}
          onClose={() => setShowProfileEditor(false)}
        />
      )}
    </div>
  );
}