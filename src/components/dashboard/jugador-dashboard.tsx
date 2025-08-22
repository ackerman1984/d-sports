"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useJugadorProfile } from "@/hooks/useJugadorProfile";
import Image from "next/image";

interface User {
  id: string;
  name?: string | null;
  email: string;
  role: string;
  ligaId?: string;
  ligaSubdominio?: string;
}

interface EstadisticasJugador {
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

interface JugadorDashboardProps {
  user: User;
}

export function JugadorDashboard({ user }: JugadorDashboardProps) {
  const router = useRouter();
  const { profile, loading: profileLoading, error: profileError } = useJugadorProfile();
  const [estadisticas, setEstadisticas] = useState<EstadisticasJugador | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState('');

  useEffect(() => {
    fetchEstadisticas();
  }, []);

  const fetchEstadisticas = async () => {
    try {
      setLoadingStats(true);
      setStatsError('');
      
      // Obtener estadísticas del jugador
      const statsResponse = await fetch('/api/jugador/estadisticas');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setEstadisticas(statsData.estadisticas);
      } else {
        setStatsError('Error cargando estadísticas');
      }
      
    } catch (error) {
      console.error('Error fetching estadisticas:', error);
      setStatsError('Error cargando estadísticas');
    } finally {
      setLoadingStats(false);
    }
  };

  const loading = profileLoading || loadingStats;
  const error = profileError || statsError;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-8">
        <p>{error}</p>
        <Button onClick={() => {
          fetchEstadisticas();
        }} className="mt-4">
          Reintentar
        </Button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500 mb-4">No se encontró información del jugador</p>
        <Button onClick={() => router.push('/profile')} className="mt-4">
          Completar Perfil
        </Button>
      </div>
    );
  }

  // Calcular métricas adicionales
  const slugging = estadisticas && estadisticas.turnos > 0 
    ? ((estadisticas.hits - estadisticas.homeRuns) + (estadisticas.homeRuns * 4)) / estadisticas.turnos 
    : 0;
  const onBase = estadisticas && estadisticas.turnos > 0 
    ? (estadisticas.hits + estadisticas.basePorBolas) / (estadisticas.turnos + estadisticas.basePorBolas) 
    : 0;

  // Los próximos juegos deberían obtenerse de la API, por ahora mostrar mensaje
  const proximosJuegos: any[] = [];

  // El historial reciente debe obtenerse de la API de estadísticas detalladas
  const historialReciente: any[] = [];

  // Los logros pueden calcularse basados en las estadísticas reales
  const logrosRecientes: any[] = estadisticas ? [
    ...(estadisticas.homeRuns > 0 ? [{
      tipo: "⚾",
      titulo: `${estadisticas.homeRuns} Home Run${estadisticas.homeRuns > 1 ? 's' : ''} en la temporada`,
      descripcion: `Has conectado ${estadisticas.homeRuns} jonrón${estadisticas.homeRuns > 1 ? 'es' : ''} esta temporada`,
      fecha: "Temporada 2025"
    }] : []),
    ...(estadisticas.promedioBateo >= 0.300 ? [{
      tipo: "🏆",
      titulo: "¡Excelente Promedio!",
      descripcion: `Mantienes un promedio de .${Math.floor(estadisticas.promedioBateo * 1000)}`,
      fecha: "Temporada 2025"
    }] : []),
    ...(estadisticas.basesRobadas > 0 ? [{
      tipo: "🎯",
      titulo: "Velocidad en las bases",
      descripcion: `Has robado ${estadisticas.basesRobadas} base${estadisticas.basesRobadas > 1 ? 's' : ''} esta temporada`,
      fecha: "Temporada 2025"
    }] : [])
  ] : [];

  return (
    <div className="space-y-8">
      {/* Header del jugador */}
      <div className="bg-gradient-to-r from-primary-500 via-accent-500 to-pastel-blue p-8 rounded-xl text-white shadow-xl">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center shadow-lg border-2 border-white/30 overflow-hidden">
            {profile.fotoUrl ? (
              <Image
                src={profile.fotoUrl}
                alt={profile.nombre || ''}
                width={80}
                height={80}
                unoptimized={true}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span className="text-3xl">👤</span>
            )}
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-2">
              {profile.nombre} {profile.numeroCasaca ? `#${profile.numeroCasaca}` : ''}
            </h2>
            <p className="text-white/95 text-lg">
              {profile.posicion || 'Sin posición'} • {profile.equipo?.nombre || 'Sin equipo'}
            </p>
          </div>
        </div>
      </div>

      {/* Estadísticas principales */}
      <div>
        <h3 className="text-2xl font-bold mb-6 text-white">Mis Estadísticas - Temporada 2025</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <Card className="bg-slate-800/80 border border-slate-600 shadow-xl backdrop-blur-sm hover:bg-slate-800/90 transition-all duration-300">
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-2xl font-bold text-primary-500">
                {estadisticas?.promedioBateo?.toFixed(3) || '0.000'}
              </CardTitle>
              <CardDescription className="text-sm text-slate-300 font-medium">Promedio de Bateo</CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-800/80 border border-slate-600 shadow-xl backdrop-blur-sm hover:bg-slate-800/90 transition-all duration-300">
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-2xl font-bold text-success">
                {estadisticas?.homeRuns || 0}
              </CardTitle>
              <CardDescription className="text-sm text-slate-300 font-medium">Home Runs</CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-800/80 border border-slate-600 shadow-xl backdrop-blur-sm hover:bg-slate-800/90 transition-all duration-300">
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-2xl font-bold text-accent-500">
                {estadisticas?.impulsadas || 0}
              </CardTitle>
              <CardDescription className="text-sm text-slate-300 font-medium">Carreras Impulsadas</CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-800/80 border border-slate-600 shadow-xl backdrop-blur-sm hover:bg-slate-800/90 transition-all duration-300">
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-2xl font-bold text-warning">
                {estadisticas?.carreras || 0}
              </CardTitle>
              <CardDescription className="text-sm text-slate-300 font-medium">Carreras Anotadas</CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-800/80 border border-slate-600 shadow-xl backdrop-blur-sm hover:bg-slate-800/90 transition-all duration-300">
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-2xl font-bold text-pastel-blue">
                {estadisticas?.hits || 0}
              </CardTitle>
              <CardDescription className="text-sm text-slate-300 font-medium">Hits Totales</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Mensaje sobre estadísticas */}
      {estadisticas && estadisticas.juegosJugados === 0 && (
        <div>
          <Card className="bg-blue-900/30 border border-blue-500/30">
            <CardContent className="p-6 text-center">
              <div className="text-blue-300">
                <span className="text-3xl mb-4 block">📊</span>
                <p className="text-lg font-medium mb-2">Estadísticas en desarrollo</p>
                <p className="text-sm">Tus estadísticas de juego aparecerán aquí cuando participes en partidos oficiales</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Próximos juegos */}
      <div>
        <h3 className="text-2xl font-bold mb-6 text-white">Próximos Juegos</h3>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-500">
              <span className="text-4xl mb-4 block">📅</span>
              <p className="text-lg font-medium mb-2">No hay juegos programados</p>
              <p className="text-sm">Los próximos juegos aparecerán aquí cuando sean programados por el administrador</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid con información adicional */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Historial reciente */}
        <Card>
          <CardHeader>
            <CardTitle>Historial Reciente</CardTitle>
            <CardDescription>
              Tus últimas actuaciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-gray-500 py-8">
              <span className="text-4xl mb-4 block">📊</span>
              <p className="text-sm">No hay historial disponible</p>
              <p className="text-xs mt-2">Tus estadísticas de juegos aparecerán aquí después de participar en juegos</p>
            </div>
          </CardContent>
        </Card>

        {/* Logros y reconocimientos */}
        <Card>
          <CardHeader>
            <CardTitle>Logros Recientes</CardTitle>
            <CardDescription>
              Tus destacados más recientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {logrosRecientes.map((logro, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-accent/5">
                  <span className="text-xl">{logro.tipo}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{logro.titulo}</p>
                    <p className="text-xs text-foreground/60 mb-1">{logro.descripcion}</p>
                    <span className="text-xs text-primary">{logro.fecha}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas detalladas */}
      <Card>
        <CardHeader>
          <CardTitle>Estadísticas Detalladas</CardTitle>
          <CardDescription>
            Tu rendimiento completo en la temporada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center p-3 rounded-lg bg-accent/5">
              <p className="text-lg font-bold">{estadisticas?.juegosJugados || 0}</p>
              <p className="text-xs text-foreground/60">Juegos</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-accent/5">
              <p className="text-lg font-bold">{estadisticas?.turnos || 0}</p>
              <p className="text-xs text-foreground/60">Turnos</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-accent/5">
              <p className="text-lg font-bold">{estadisticas?.hits || 0}</p>
              <p className="text-xs text-foreground/60">Hits</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-accent/5">
              <p className="text-lg font-bold">{slugging.toFixed(3)}</p>
              <p className="text-xs text-foreground/60">Slugging</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-accent/5">
              <p className="text-lg font-bold">{onBase.toFixed(3)}</p>
              <p className="text-xs text-foreground/60">OBP</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-accent/5">
              <p className="text-lg font-bold">
                {(onBase + slugging).toFixed(3)}
              </p>
              <p className="text-xs text-foreground/60">OPS</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enlaces rápidos */}
      <Card>
        <CardHeader>
          <CardTitle>Enlaces Rápidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => router.push('/profile')}
            >
              <span className="mr-2">👤</span>
              Editar Perfil
            </Button>
            <Button variant="outline" className="justify-start" disabled>
              <span className="mr-2">👥</span>
              Mi Equipo
            </Button>
            <Button variant="outline" className="justify-start" disabled>
              <span className="mr-2">🏆</span>
              Rankings
            </Button>
            <Button variant="outline" className="justify-start" disabled>
              <span className="mr-2">📊</span>
              Comparar Stats
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}