"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AnotadorProfileManagement from "@/components/anotador/ProfileManagement";

interface User {
  id: string;
  name?: string | null;
  email: string;
  role: string;
  ligaId?: string;
  ligaSubdominio?: string;
}

interface AnotadorDashboardProps {
  user: User;
}

export function AnotadorDashboard({ user }: AnotadorDashboardProps) {
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'games' | 'profile'>('games');

  // Datos mock para demo
  const todayGames = [
    {
      id: "1",
      fecha: "2025-01-30",
      hora: "19:00",
      equipoLocal: "Águilas Rojas",
      equipoVisitante: "Tigres Azules",
      estado: "programado",
      estadio: "Campo Central"
    },
    {
      id: "2",
      fecha: "2025-01-30",
      hora: "21:00",
      equipoLocal: "Leones Dorados",
      equipoVisitante: "Panteras Negras",
      estado: "en_progreso",
      estadio: "Campo Norte"
    }
  ];

  const recentGames = [
    {
      id: "3",
      fecha: "2025-01-29",
      equipoLocal: "Águilas Rojas",
      equipoVisitante: "Leones Dorados",
      marcadorLocal: 7,
      marcadorVisitante: 4,
      estado: "finalizado"
    },
    {
      id: "4",
      fecha: "2025-01-28",
      equipoLocal: "Tigres Azules",
      equipoVisitante: "Panteras Negras",
      marcadorLocal: 3,
      marcadorVisitante: 8,
      estado: "finalizado"
    }
  ];

  const quickStats = {
    juegosAnotados: 15,
    partidosHoy: todayGames.length,
    enProgreso: todayGames.filter(g => g.estado === "en_progreso").length,
    completados: 28
  };

  const getGameStatusColor = (estado: string) => {
    switch (estado) {
      case "programado": return "bg-pastel-yellow";
      case "en_progreso": return "bg-pastel-green";
      case "finalizado": return "bg-pastel-blue";
      default: return "bg-gray-200";
    }
  };

  const getGameStatusText = (estado: string) => {
    switch (estado) {
      case "programado": return "Programado";
      case "en_progreso": return "En Progreso";
      case "finalizado": return "Finalizado";
      default: return estado;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header del anotador */}
      <div className="baseball-gradient p-6 rounded-lg text-white">
        <h2 className="text-2xl font-bold mb-2">
          Panel del Anotador
        </h2>
        <p className="text-white/90">
          Captura las estadísticas de los juegos en tiempo real
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('games')}
          className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'games'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🎮 Juegos
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          👤 Mi Perfil
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && <AnotadorProfileManagement />}
      
      {activeTab === 'games' && (
        <div className="space-y-8">
          {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoy</CardTitle>
            <span className="text-xl">📅</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quickStats.partidosHoy}</div>
            <p className="text-xs text-foreground/60">Partidos programados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Vivo</CardTitle>
            <span className="text-xl">🔴</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quickStats.enProgreso}</div>
            <p className="text-xs text-foreground/60">En progreso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anotados</CardTitle>
            <span className="text-xl">✅</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quickStats.juegosAnotados}</div>
            <p className="text-xs text-foreground/60">Por mí este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <span className="text-xl">⚾</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quickStats.completados}</div>
            <p className="text-xs text-foreground/60">Juegos completados</p>
          </CardContent>
        </Card>
      </div>

      {/* Juegos de hoy */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Juegos de Hoy</h3>
        <div className="grid gap-4">
          {todayGames.map((game) => (
            <Card key={game.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getGameStatusColor(game.estado)}`}></div>
                    <span className="text-sm font-medium">{getGameStatusText(game.estado)}</span>
                  </div>
                  <div className="text-sm text-foreground/60">
                    {game.hora} - {game.estadio}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <p className="font-semibold">{game.equipoLocal}</p>
                    <p className="text-sm text-foreground/60">Local</p>
                  </div>
                  <div className="text-center">
                    <span className="text-2xl font-bold">VS</span>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">{game.equipoVisitante}</p>
                    <p className="text-sm text-foreground/60">Visitante</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  {game.estado === "programado" && (
                    <Button className="flex-1" size="sm">
                      Iniciar Anotación
                    </Button>
                  )}
                  {game.estado === "en_progreso" && (
                    <Button className="flex-1" size="sm" variant="outline">
                      Continuar Anotando
                    </Button>
                  )}
                  <Button variant="ghost" size="sm">
                    Ver Detalles
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Juegos recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Juegos Recientes</CardTitle>
            <CardDescription>
              Últimos partidos anotados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentGames.map((game) => (
                <div key={game.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/5">
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {game.equipoLocal} vs {game.equipoVisitante}
                    </p>
                    <p className="text-xs text-foreground/60">{game.fecha}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">
                      {game.marcadorLocal} - {game.marcadorVisitante}
                    </p>
                    <span className="text-xs px-2 py-1 rounded-full bg-pastel-blue text-xs">
                      Finalizado
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Herramientas Rápidas</CardTitle>
            <CardDescription>
              Accesos directos para anotadores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <span className="mr-2">📊</span>
                Ver Estadísticas por Jugador
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <span className="mr-2">📋</span>
                Plantilla de Anotación
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <span className="mr-2">🗓️</span>
                Calendario de Juegos
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <span className="mr-2">📱</span>
                App Móvil de Anotación
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tips para anotadores */}
      <Card>
        <CardHeader>
          <CardTitle>Tips de Anotación</CardTitle>
          <CardDescription>
            Consejos para una anotación precisa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-pastel-blue/10">
              <h4 className="font-medium mb-2">⚾ Estadísticas Básicas</h4>
              <p className="text-sm text-foreground/70">
                Asegúrate de capturar turnos, hits, carreras e impulsadas para cada jugador.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-pastel-green/10">
              <h4 className="font-medium mb-2">🔄 Actualización en Tiempo Real</h4>
              <p className="text-sm text-foreground/70">
                Actualiza el marcador después de cada entrada para mantener informados a los seguidores.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-pastel-yellow/10">
              <h4 className="font-medium mb-2">✅ Verificación Final</h4>
              <p className="text-sm text-foreground/70">
                Revisa todas las estadísticas antes de marcar el juego como finalizado.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
        </div>
      )}
    </div>
  );
}