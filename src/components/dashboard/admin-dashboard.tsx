"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  name?: string | null;
  email: string;
  role: string;
  ligaId?: string;
  ligaSubdominio?: string;
}

interface AdminDashboardProps {
  user: User;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    equipos: 0,
    jugadores: 0,
    juegosTemporada: 0,
    juegosPendientes: 0,
    anotadores: 0,
    temporadaActual: "Temporada 2025"
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user.ligaId) {
        console.log('❌ No liga ID found for user');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log('🔍 Fetching stats for liga:', user.ligaId);

        // Obtener estadísticas de equipos
        const equiposResponse = await fetch('/api/admin/equipos');
        const equiposData = await equiposResponse.json();
        const totalEquipos = equiposData.equipos?.length || 0;

        // Obtener estadísticas de jugadores
        const jugadoresResponse = await fetch('/api/admin/jugadores');
        const jugadoresData = await jugadoresResponse.json();
        const totalJugadores = jugadoresData.jugadores?.length || 0;

        // Obtener estadísticas de anotadores (usuarios con role 'anotador')
        const anotadoresResponse = await fetch('/api/admin/users?role=anotador');
        const anotadoresData = await anotadoresResponse.json();
        const totalAnotadores = anotadoresData.usuarios?.length || 0;

        // TODO: Implementar obtención de juegos cuando esté disponible
        // const juegosResponse = await fetch('/api/admin/juegos');
        // const juegosData = await juegosResponse.json();

        setStats({
          equipos: totalEquipos,
          jugadores: totalJugadores,
          juegosTemporada: 0, // TODO: Obtener de API cuando esté disponible
          juegosPendientes: 0, // TODO: Obtener de API cuando esté disponible
          anotadores: totalAnotadores,
          temporadaActual: "Temporada 2025"
        });

        console.log('✅ Stats updated:', {
          equipos: totalEquipos,
          jugadores: totalJugadores,
          anotadores: totalAnotadores
        });
      } catch (error) {
        console.error('❌ Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [user.ligaId]);

  const quickActions = [
    {
      title: "Gestionar Equipos",
      description: "Administrar equipos de la liga",
      icon: "👥",
      action: () => window.location.href = '/admin/equipos',
      color: "#a8c8ec" // pastel blue
    },
    {
      title: "Programar Juegos",
      description: "Generar calendario de juegos",
      icon: "🗓️",
      action: () => console.log("Programar juegos"),
      color: "#d68699" // pastel red
    },
    {
      title: "Gestionar Jugadores",
      description: "Administrar jugadores de la liga",
      icon: "🏃‍♂️",
      action: () => window.location.href = '/admin/jugadores',
      color: "#d68699" // pastel red
    },
    {
      title: "Gestionar Anotadores",
      description: "Crear credenciales para anotadores",
      icon: "📝",
      action: () => window.location.href = '/admin/anotadores',
      color: "#7a96b8" // pastel navy
    },
    {
      title: "Ver Estadísticas",
      description: "Revisar estadísticas de la liga",
      icon: "📊",
      action: () => console.log("Ver estadísticas"),
      color: "#9bacc4" // pastel gray
    }
  ];

  const recentActivity = [
    {
      action: "Nuevo jugador registrado",
      team: "Águilas Rojas",
      time: "Hace 2 horas",
      icon: "🏃‍♂️"
    },
    {
      action: "Juego completado",
      team: "Tigres vs Leones",
      time: "Hace 1 día",
      icon: "⚾"
    },
    {
      action: "Anotador creado",
      team: "Juan Pérez",
      time: "Hace 2 días",
      icon: "📝"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header con bienvenida */}
      <div className="p-8 rounded-xl text-white shadow-lg bg-gradient-to-r from-primary-500 via-accent-500 to-pastel-blue">
        <h2 className="text-3xl font-bold mb-3">
          Panel de Administración
        </h2>
        <p className="text-white/95 text-lg">
          Gestiona tu liga de béisbol - {stats.temporadaActual}
        </p>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border border-slate-600 shadow-xl bg-slate-800/80 backdrop-blur-sm hover:bg-slate-800/90 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-pastel-blue">Equipos</CardTitle>
            <div className="w-8 h-8 rounded-full bg-pastel-blue/20 flex items-center justify-center">
              <span className="text-xl">👥</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.equipos}</div>
            <p className="text-xs text-slate-300 mt-1">
              Activos en la liga
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-600 shadow-xl bg-slate-800/80 backdrop-blur-sm hover:bg-slate-800/90 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-pastel-red">Jugadores</CardTitle>
            <div className="w-8 h-8 rounded-full bg-pastel-red/20 flex items-center justify-center">
              <span className="text-xl">🏃‍♂️</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.jugadores}</div>
            <p className="text-xs text-slate-300 mt-1">
              Registrados total
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-600 shadow-xl bg-slate-800/80 backdrop-blur-sm hover:bg-slate-800/90 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-accent-500">Juegos</CardTitle>
            <div className="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center">
              <span className="text-xl">⚾</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.juegosTemporada}</div>
            <p className="text-xs text-slate-300 mt-1">
              En la temporada
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-600 shadow-xl bg-slate-800/80 backdrop-blur-sm hover:bg-slate-800/90 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-pastel-gray">Pendientes</CardTitle>
            <div className="w-8 h-8 rounded-full bg-pastel-gray/20 flex items-center justify-center">
              <span className="text-xl">⏳</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.juegosPendientes}</div>
            <p className="text-xs text-slate-300 mt-1">
              Juegos por jugar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Acciones rápidas */}
      <div>
        <h3 className="text-2xl font-bold mb-6 text-white">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => (
            <Card key={index} className="cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-slate-600 shadow-lg bg-slate-800/70 backdrop-blur-sm hover:bg-slate-800/90">
              <CardHeader className="text-center pb-4">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-slate-600"
                  style={{ backgroundColor: action.color + '30', backdropFilter: 'blur(10px)' }}
                >
                  <span className="text-3xl drop-shadow-lg">{action.icon}</span>
                </div>
                <CardTitle className="text-base font-bold text-white mb-2">{action.title}</CardTitle>
                <CardDescription className="text-sm text-slate-400 leading-relaxed">
                  {action.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  className="w-full text-white font-semibold hover:scale-105 transition-all duration-300 shadow-lg border-0"
                  style={{ 
                    background: `linear-gradient(135deg, ${action.color}E6, ${action.color}CC)`,
                    boxShadow: `0 4px 15px ${action.color}40`
                  }}
                  size="sm"
                  onClick={action.action}
                >
                  Acceder
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border border-slate-600 shadow-xl bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-pastel-blue/20 flex items-center justify-center">
                <span className="text-sm">📋</span>
              </div>
              Actividad Reciente
            </CardTitle>
            <CardDescription className="text-slate-400 ml-8">
              Últimos eventos en la liga
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-4 p-4 rounded-xl border border-slate-600/50 bg-slate-700/50 backdrop-blur-sm hover:bg-slate-700/70 transition-all duration-200">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-pastel-blue/20 border border-pastel-blue/30 shadow-sm">
                    <span className="text-xl">{activity.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white mb-1">{activity.action}</p>
                    <p className="text-xs text-slate-300">{activity.team}</p>
                  </div>
                  <span className="text-xs font-medium px-3 py-1 rounded-full text-slate-200 bg-slate-600/80 border border-slate-500">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-600 shadow-xl bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-accent-500/20 flex items-center justify-center">
                <span className="text-sm">📊</span>
              </div>
              Estado de la Liga
            </CardTitle>
            <CardDescription className="text-slate-400 ml-8">
              Información general de {stats.temporadaActual}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex justify-between items-center p-4 rounded-xl bg-slate-700/50 border border-slate-600/50">
                <span className="text-sm font-medium text-white">Progreso de temporada</span>
                <span className="text-sm font-bold px-4 py-2 rounded-full text-white bg-gradient-to-r from-accent-500 to-primary-500 shadow-lg">50%</span>
              </div>
              <div className="w-full rounded-full h-4 shadow-inner bg-slate-700/80 border border-slate-600/50 p-1">
                <div className="h-full rounded-full shadow-sm w-1/2 bg-gradient-to-r from-accent-500 to-secondary-500"></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="text-center p-4 rounded-xl bg-slate-700/60 border border-slate-600/50 hover:bg-slate-700/80 transition-all duration-200">
                  <p className="text-3xl font-bold text-success drop-shadow-sm">{stats.equipos}</p>
                  <p className="text-xs font-medium text-slate-300 mt-1">Equipos activos</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-slate-700/60 border border-slate-600/50 hover:bg-slate-700/80 transition-all duration-200">
                  <p className="text-3xl font-bold text-accent-500 drop-shadow-sm">{stats.anotadores}</p>
                  <p className="text-xs font-medium text-slate-300 mt-1">Anotadores</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}