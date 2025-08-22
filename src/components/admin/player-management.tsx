"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from '@/lib/supabase/client';
import { useToast } from "@/hooks/use-toast";
import PhotoUpload from "@/components/ui/PhotoUpload";

interface User {
  id: string;
  name?: string | null;
  email: string;
  role: string;
  ligaId?: string;
  ligaSubdominio?: string;
  [key: string]: any; // Para compatibilidad con session.user
}

interface PlayerManagementProps {
  user: User;
}

interface Team {
  id: string;
  nombre: string;
  liga_id: string;
  color: string;
  descripcion?: string;
}

interface Player {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  fecha_nacimiento?: string;
  numero_casaca?: number;
  equipo_id?: string;
  liga_id: string;
  estado: 'activo' | 'inactivo' | 'lesionado';
  foto_url?: string;
  equipo?: Team;
  created_at?: string;
  updated_at?: string;
}

interface PlayerStats {
  jugador_id: string;
  temporada: string;
  juegos_jugados: number;
  turnos_al_bate: number;
  hits: number;
  carreras_anotadas: number;
  carreras_impulsadas: number;
  home_runs: number;
  dobles: number;
  triples: number;
  bases_robadas: number;
  ponches: number;
  bases_por_bolas: number;
  errores: number;
  promedio_bateo: number;
  porcentaje_embase: number;
  porcentaje_slugging: number;
}

const posiciones = [
  "Catcher (C)",
  "Primera Base (1B)", 
  "Segunda Base (2B)",
  "Tercera Base (3B)",
  "Shortstop (SS)",
  "Jardinero Izquierdo (LF)",
  "Jardinero Central (CF)", 
  "Jardinero Derecho (RF)",
  "Pitcher (P)",
  "Bateador Designado (DH)"
];

export function PlayerManagement({ user }: PlayerManagementProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [playerStats, setPlayerStats] = useState<{ [key: string]: PlayerStats }>({});
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [formData, setFormData] = useState<Partial<Player>>({
    nombre: '',
    email: '',
    telefono: '',
    fecha_nacimiento: '',
    numero_casaca: undefined,
    equipo_id: '',
    estado: 'activo',
    foto_url: ''
  });

  const supabase = createClient();
  const { toast } = useToast();

  const fetchTeams = useCallback(async () => {
    try {
      console.log('🔍 Fetching teams for liga:', user.ligaId);
      const response = await fetch('/api/admin/equipos');
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📊 Teams fetched:', data.equipos?.length);
      setTeams(data.equipos || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los equipos: " + (error as Error).message,
        variant: "destructive"
      });
    }
  }, [user.ligaId, toast]);

  const fetchPlayerStats = useCallback(async (playerIds: string[]) => {
    try {
      if (!playerIds || playerIds.length === 0) {
        console.log('📊 No player IDs provided, skipping stats fetch');
        setPlayerStats({});
        return;
      }

      console.log('📊 Fetching stats for players:', playerIds.length);
      
      // Por ahora, vamos a skip las estadísticas para evitar errores
      // TODO: Implementar API de estadísticas o arreglar permisos
      console.log('📊 Skipping stats fetch temporarily to avoid errors');
      setPlayerStats({});
      
      /* Código original comentado temporalmente:
      const { data, error } = await supabase
        .from('estadisticas_jugador')
        .select('*')
        .in('jugador_id', playerIds)
        .eq('temporada', '2025');

      if (error) {
        console.error('📊 Supabase error fetching stats:', error);
        throw error;
      }
      
      console.log('📊 Stats data received:', data?.length || 0, 'records');
      const statsMap = (data || []).reduce((acc, stat) => {
        acc[stat.jugador_id] = stat;
        return acc;
      }, {} as { [key: string]: PlayerStats });
      
      setPlayerStats(statsMap);
      */
    } catch (error) {
      console.error('❌ Error fetching player stats:', error);
      setPlayerStats({}); // Reset stats on error
    }
  }, []);

  const fetchPlayers = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching players...');
      
      const response = await fetch('/api/admin/jugadores', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ Players data received:', data);
      console.log('📊 Data structure:', JSON.stringify(data, null, 2));
      
      setPlayers(data.jugadores || []);
      console.log('👥 Players set:', data.jugadores?.length || 0);
      console.log('🎯 Players state after set:', data.jugadores?.slice(0, 3));
      
      // Fetch player stats
      if (data.jugadores && data.jugadores.length > 0) {
        const playerIds = data.jugadores.map((p: Player) => p.id);
        await fetchPlayerStats(playerIds);
      }
    } catch (error) {
      console.error('❌ Error fetching players:', error);
      alert('Error cargando jugadores: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('🔄 PlayerManagement useEffect triggered');
    console.log('👤 User:', user);
    console.log('🏟️ Liga ID:', user.ligaId);
    
    if (!user.ligaId) {
      console.log('❌ No liga ID found, skipping fetch');
      return;
    }
    
    console.log('🚀 Starting fetch operations...');
    fetchTeams();
    fetchPlayers();
  }, [user.ligaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos obligatorios
    if (!formData.nombre?.trim()) {
      toast({
        title: "Error",
        description: "El nombre es obligatorio",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.email?.trim()) {
      toast({
        title: "Error", 
        description: "El email es obligatorio",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.equipo_id?.trim()) {
      toast({
        title: "Error",
        description: "Debe seleccionar un equipo", 
        variant: "destructive"
      });
      return;
    }
    
    // Solo permitir edición de jugadores existentes
    if (!editingPlayer) {
      toast({
        title: "Error",
        description: "Solo se pueden editar jugadores existentes. Los jugadores deben registrarse desde el formulario público.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const playerData = {
        ...formData,
        numero_casaca: formData.numero_casaca ? parseInt(formData.numero_casaca.toString()) : null
      };

      // Solo update de jugadores existentes
      const response = await fetch('/api/admin/jugadores', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: editingPlayer.id, ...playerData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar la solicitud');
      }

      const result = await response.json();

      toast({
        title: "Éxito",
        description: "Jugador actualizado correctamente"
      });

      setIsDialogOpen(false);
      setEditingPlayer(null);
      resetForm();
      fetchPlayers();
    } catch (error: unknown) {
      console.error('Error saving player:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo guardar el jugador",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    setFormData({
      nombre: player.nombre,
      email: player.email,
      telefono: player.telefono || '',
      fecha_nacimiento: player.fecha_nacimiento || '',
      numero_casaca: player.numero_casaca,
      equipo_id: player.equipo_id || '',
      estado: player.estado,
      foto_url: player.foto_url || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (playerId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este jugador? Esta acción eliminará también todas sus estadísticas.')) return;

    try {
      const response = await fetch(`/api/admin/jugadores?id=${playerId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar jugador');
      }

      const result = await response.json();

      toast({
        title: "Éxito",
        description: result.message || "Jugador eliminado correctamente"
      });

      fetchPlayers();
    } catch (error: unknown) {
      console.error('Error deleting player:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar el jugador",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      email: '',
      telefono: '',
      fecha_nacimiento: '',
      numero_casaca: undefined,
      equipo_id: '',
      estado: 'activo',
      foto_url: ''
    });
  };

  const filteredPlayers = players.filter(player => {
    const matchesSearch = 
      (player.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (player.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTeam = selectedTeam === "all" || player.equipo_id === selectedTeam;
    
    return matchesSearch && matchesTeam;
  });

  console.log('🔍 Current players state:', players.length);
  console.log('🔍 Filtered players:', filteredPlayers.length);
  console.log('🔍 Search term:', searchTerm);
  console.log('🔍 Selected team:', selectedTeam);
  console.log('🔍 Selected position:', selectedPosition);

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'activo': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'inactivo': return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      case 'lesionado': return 'bg-red-500/20 text-red-400 border-red-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-white">Cargando jugadores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 via-accent-500 to-pastel-blue p-8 rounded-xl text-white shadow-xl">
        <h2 className="text-3xl font-bold mb-3">Gestión de Jugadores</h2>
        <p className="text-white/95 text-lg">
          Administra todos los jugadores de la liga - {players.length} registrados
        </p>
      </div>

      {/* Controls */}
      <Card className="bg-slate-800/80 border border-slate-600 shadow-xl backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <Input
                placeholder="Buscar jugadores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-700/80 border-slate-600 text-white placeholder-slate-400"
              />
              
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="bg-slate-700/80 border-slate-600 text-white">
                  <SelectValue placeholder="Filtrar por equipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los equipos</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                <SelectTrigger className="bg-slate-700/80 border-slate-600 text-white">
                  <SelectValue placeholder="Filtrar por posición" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las posiciones</SelectItem>
                  {posiciones.map(pos => (
                    <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Los jugadores se registran desde el formulario público */}
            <div className="text-sm text-slate-400 bg-slate-700/50 p-3 rounded-md">
              <strong>Nota:</strong> Los jugadores deben registrarse usando el formulario de registro público. 
              El administrador solo puede editar información de jugadores existentes.
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl">
                    Editar Jugador
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Modifica los datos del jugador existente
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre Completo *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                      className="bg-slate-700/80 border-slate-600"
                      placeholder="Nombre y apellido del jugador"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="bg-slate-700/80 border-slate-600"
                      required
                    />
                  </div>


                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="telefono">Teléfono</Label>
                      <Input
                        id="telefono"
                        value={formData.telefono}
                        onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                        className="bg-slate-700/80 border-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento (Opcional)</Label>
                      <Input
                        id="fecha_nacimiento"
                        type="date"
                        value={formData.fecha_nacimiento}
                        onChange={(e) => setFormData({...formData, fecha_nacimiento: e.target.value})}
                        className="bg-slate-700/80 border-slate-600"
                        placeholder="Opcional"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="numero_casaca">Número (Opcional)</Label>
                      <Input
                        id="numero_casaca"
                        type="number"
                        min="0"
                        max="99"
                        value={formData.numero_casaca || ''}
                        onChange={(e) => setFormData({...formData, numero_casaca: e.target.value ? parseInt(e.target.value) : undefined})}
                        className="bg-slate-700/80 border-slate-600"
                        placeholder="1-99 (Opcional)"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="equipo_id">Equipo *</Label>
                    <Select 
                      value={formData.equipo_id} 
                      onValueChange={(value) => setFormData({...formData, equipo_id: value})}
                      required
                    >
                      <SelectTrigger className="bg-slate-700/80 border-slate-600">
                        <SelectValue placeholder="Seleccionar equipo *" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id}>{team.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Select 
                      value={formData.estado} 
                      onValueChange={(value: 'activo' | 'inactivo' | 'lesionado') => setFormData({...formData, estado: value})}
                    >
                      <SelectTrigger className="bg-slate-700/80 border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activo">Activo</SelectItem>
                        <SelectItem value="inactivo">Inactivo</SelectItem>
                        <SelectItem value="lesionado">Lesionado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Photo Upload */}
                  <div className="space-y-2">
                    <Label>Foto del Jugador</Label>
                    <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600">
                      <PhotoUpload
                        onPhotoChange={(photoUrl) => setFormData({ ...formData, foto_url: photoUrl || '' })}
                        currentPhoto={formData.foto_url || undefined}
                        size="md"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                      className="border-slate-600"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-gradient-to-r from-primary-500 to-accent-500">
                      {editingPlayer ? 'Actualizar' : 'Crear'} Jugador
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Players List */}
      <div className="grid gap-6">
        {filteredPlayers.length > 0 ? filteredPlayers.map((player) => {
          if (!player || !player.id) {
            console.warn('⚠️ Invalid player data:', player);
            return null;
          }
          
          const stats = playerStats[player.id];
          
          return (
            <Card key={player.id} className="bg-slate-800/80 border border-slate-600 shadow-xl backdrop-blur-sm hover:bg-slate-800/90 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-lg">
                        {player.numero_casaca || '?'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold text-white">
                          {player.nombre || 'Sin nombre'}
                        </h3>
                        <Badge className={getStatusColor(player.estado || 'inactivo')}>
                          {(player.estado || 'inactivo').charAt(0).toUpperCase() + (player.estado || 'inactivo').slice(1)}
                        </Badge>
                      </div>
                      <div className="text-slate-300 space-y-1">
                        <div className="flex items-center space-x-4">
                          <span>📧 {player.email || 'Sin email'}</span>
                          {player.telefono && <span>📞 {player.telefono}</span>}
                        </div>
                        <div className="flex items-center space-x-4">
                          <span>👥 {player.equipo?.nombre || 'Sin equipo'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {stats && (
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div className="bg-slate-700/60 rounded-lg p-3 border border-slate-600">
                          <div className="text-lg font-bold text-white">{stats.promedio_bateo.toFixed(3)}</div>
                          <div className="text-xs text-slate-400">AVG</div>
                        </div>
                        <div className="bg-slate-700/60 rounded-lg p-3 border border-slate-600">
                          <div className="text-lg font-bold text-white">{stats.hits}</div>
                          <div className="text-xs text-slate-400">H</div>
                        </div>
                        <div className="bg-slate-700/60 rounded-lg p-3 border border-slate-600">
                          <div className="text-lg font-bold text-white">{stats.home_runs}</div>
                          <div className="text-xs text-slate-400">HR</div>
                        </div>
                        <div className="bg-slate-700/60 rounded-lg p-3 border border-slate-600">
                          <div className="text-lg font-bold text-white">{stats.carreras_impulsadas}</div>
                          <div className="text-xs text-slate-400">RBI</div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(player)}
                        className="border-slate-600 hover:bg-slate-700"
                      >
                        ✏️ Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(player.id)}
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        🗑️ Eliminar
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }) : (
          <div className="text-center py-8 text-slate-400">
            <div className="text-6xl mb-4">🔄</div>
            <p>No hay jugadores para mostrar</p>
          </div>
        )}
      </div>

      {filteredPlayers.length === 0 && (
        <Card className="bg-slate-800/80 border border-slate-600 shadow-xl backdrop-blur-sm">
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">🏃‍♂️</div>
            <h3 className="text-xl font-bold text-white mb-2">No se encontraron jugadores</h3>
            <p className="text-slate-400">
              {searchTerm || selectedTeam !== "all" || selectedPosition !== "all" 
                ? "Ajusta los filtros para ver más resultados"
                : "Agrega el primer jugador a la liga"
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}