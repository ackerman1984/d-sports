"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface User {
  id: string;
  name?: string | null;
  email: string;
  role: string;
  ligaId?: string;
  ligaSubdominio?: string;
}

interface TeamManagementProps {
  user: User;
}

interface Team {
  id: string;
  nombre: string;
  liga_id: string;
  color: string;
  logo_url?: string;
  descripcion?: string;
  activo: boolean;
  created_at?: string;
  _count?: {
    jugadores: number;
  };
}

const coloresPredefinidos = [
  { name: 'Rojo', value: '#DC2626', bg: 'bg-red-600' },
  { name: 'Azul', value: '#2563EB', bg: 'bg-blue-600' },
  { name: 'Verde', value: '#16A34A', bg: 'bg-green-600' },
  { name: 'Amarillo', value: '#CA8A04', bg: 'bg-yellow-600' },
  { name: 'Morado', value: '#9333EA', bg: 'bg-purple-600' },
  { name: 'Rosa', value: '#DB2777', bg: 'bg-pink-600' },
  { name: 'Naranja', value: '#EA580C', bg: 'bg-orange-600' },
  { name: 'Gris', value: '#6B7280', bg: 'bg-gray-600' },
  { name: 'Negro', value: '#000000', bg: 'bg-black' },
  { name: 'Blanco', value: '#FFFFFF', bg: 'bg-white border border-gray-300' }
];

export function TeamManagement({ user }: TeamManagementProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<Partial<Team>>({
    nombre: '',
    color: '#2563EB',
    logo_url: '',
    descripcion: '',
    activo: true
  });

  useEffect(() => {
    fetchTeams();
  }, [user.ligaId]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching teams...');
      
      const response = await fetch('/api/admin/equipos');
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ Teams data received:', data);
      
      setTeams(data.equipos || []);
      console.log('👥 Teams set:', data.equipos?.length || 0);
      
    } catch (error) {
      console.error('❌ Error fetching teams:', error);
      alert('Error cargando equipos: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const teamData = {
        ...formData,
        liga_id: user.ligaId
      };

      let response;
      if (editingTeam) {
        // Update existing team
        response = await fetch('/api/admin/equipos', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: editingTeam.id, ...teamData }),
        });
      } else {
        // Create new team
        response = await fetch('/api/admin/equipos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(teamData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar la solicitud');
      }

      const result = await response.json();

      alert(result.message || (editingTeam ? "Equipo actualizado correctamente" : "Equipo creado correctamente"));

      setIsDialogOpen(false);
      setEditingTeam(null);
      resetForm();
      fetchTeams();
    } catch (error: unknown) {
      console.error('Error saving team:', error);
      alert('Error: ' + (error instanceof Error ? error.message : "No se pudo guardar el equipo"));
    }
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      nombre: team.nombre,
      color: team.color,
      logo_url: team.logo_url || '',
      descripcion: team.descripcion || '',
      activo: team.activo
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (teamId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este equipo? Esta acción también eliminará a todos los jugadores del equipo.')) return;

    try {
      const response = await fetch(`/api/admin/equipos?id=${teamId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar equipo');
      }

      const result = await response.json();
      alert(result.message || "Equipo eliminado correctamente");
      fetchTeams();
    } catch (error: unknown) {
      console.error('Error deleting team:', error);
      alert('Error: ' + (error instanceof Error ? error.message : "No se pudo eliminar el equipo"));
    }
  };

  const toggleTeamStatus = async (teamId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/admin/equipos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: teamId, 
          activo: !currentStatus 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cambiar estado');
      }

      fetchTeams();
    } catch (error: unknown) {
      console.error('Error toggling team status:', error);
      alert('Error: ' + (error instanceof Error ? error.message : "No se pudo cambiar el estado del equipo"));
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      color: '#2563EB',
      logo_url: '',
      descripcion: '',
      activo: true
    });
  };

  const filteredTeams = teams.filter(team =>
    team.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-white">Cargando equipos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 via-accent-500 to-pastel-blue p-8 rounded-xl text-white shadow-xl">
        <h2 className="text-3xl font-bold mb-3">Gestión de Equipos</h2>
        <p className="text-white/95 text-lg">
          Administra todos los equipos de la liga - {teams.length} registrados
        </p>
      </div>

      {/* Controls */}
      <Card className="bg-slate-800/80 border border-slate-600 shadow-xl backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1">
              <Input
                placeholder="Buscar equipos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-700/80 border-slate-600 text-white placeholder-slate-400"
              />
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600"
                  onClick={() => {
                    setEditingTeam(null);
                    resetForm();
                  }}
                >
                  ➕ Nuevo Equipo
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl">
                    {editingTeam ? 'Editar Equipo' : 'Nuevo Equipo'}
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    {editingTeam ? 'Modifica los datos del equipo' : 'Completa los datos del nuevo equipo'}
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre del Equipo *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                      className="bg-slate-700/80 border-slate-600"
                      placeholder="Ej: Tigres de la Ciudad"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea
                      id="descripcion"
                      value={formData.descripcion}
                      onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                      className="bg-slate-700/80 border-slate-600"
                      placeholder="Descripción del equipo..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Color del Equipo *</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {coloresPredefinidos.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setFormData({...formData, color: color.value})}
                          className={`relative w-full h-12 rounded-lg border-2 ${color.bg} ${
                            formData.color === color.value 
                              ? 'border-white ring-2 ring-primary-500' 
                              : 'border-slate-600 hover:border-slate-400'
                          } transition-all`}
                          title={color.name}
                        >
                          {formData.color === color.value && (
                            <span className={`absolute inset-0 flex items-center justify-center text-lg ${
                              color.value === '#FFFFFF' ? 'text-black' : 'text-white'
                            }`}>
                              ✓
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Label htmlFor="custom-color" className="text-sm">Color personalizado:</Label>
                      <input
                        type="color"
                        id="custom-color"
                        value={formData.color}
                        onChange={(e) => setFormData({...formData, color: e.target.value})}
                        className="w-12 h-8 rounded border border-slate-600"
                      />
                      <span className="text-sm text-slate-400">{formData.color}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo_url">URL del Logo</Label>
                    <Input
                      id="logo_url"
                      value={formData.logo_url}
                      onChange={(e) => setFormData({...formData, logo_url: e.target.value})}
                      className="bg-slate-700/80 border-slate-600"
                      placeholder="https://ejemplo.com/logo.png"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="activo"
                      checked={formData.activo}
                      onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                      className="w-4 h-4 text-primary-600 bg-slate-700 border-slate-600 rounded"
                    />
                    <Label htmlFor="activo">Equipo activo</Label>
                  </div>

                  <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                    <h4 className="text-white font-medium mb-2">📋 Vista previa:</h4>
                    <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                      <div 
                        className="w-8 h-8 rounded-full border-2 border-white/30"
                        style={{ backgroundColor: formData.color }}
                      ></div>
                      <div>
                        <p className="text-white font-medium">{formData.nombre || 'Nombre del equipo'}</p>
                        {formData.descripcion && (
                          <p className="text-slate-400 text-sm">{formData.descripcion}</p>
                        )}
                      </div>
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
                      {editingTeam ? 'Actualizar' : 'Crear'} Equipo
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Teams Grid */}
      <div className="grid gap-6">
        {filteredTeams.map((team) => (
          <Card key={team.id} className="bg-slate-800/80 border border-slate-600 shadow-xl backdrop-blur-sm hover:bg-slate-800/90 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-16 h-16 rounded-full border-4 border-white/20 shadow-lg flex items-center justify-center"
                      style={{ backgroundColor: team.color }}
                    >
                      {team.logo_url ? (
                        <img 
                          src={team.logo_url} 
                          alt={team.nombre}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-bold" style={{ 
                          color: team.color === '#FFFFFF' || team.color === '#000000' 
                            ? (team.color === '#FFFFFF' ? '#000000' : '#FFFFFF')
                            : '#FFFFFF'
                        }}>
                          {team.nombre.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{team.nombre}</h3>
                        <Badge className={team.activo 
                          ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                          : 'bg-red-500/20 text-red-400 border-red-500/50'
                        }>
                          {team.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <div className="text-slate-300 space-y-1">
                        {team.descripcion && (
                          <p className="text-sm">{team.descripcion}</p>
                        )}
                        <div className="flex items-center space-x-4 text-sm">
                          <span>🎨 Color: {team.color}</span>
                          <span>👥 {team._count?.jugadores || 0} jugadores</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleTeamStatus(team.id, team.activo)}
                    className={team.activo 
                      ? "border-red-500/50 text-red-400 hover:bg-red-500/10"
                      : "border-green-500/50 text-green-400 hover:bg-green-500/10"
                    }
                  >
                    {team.activo ? '⏸️ Desactivar' : '▶️ Activar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(team)}
                    className="border-slate-600 hover:bg-slate-700"
                  >
                    ✏️ Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(team.id)}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    🗑️ Eliminar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTeams.length === 0 && (
        <Card className="bg-slate-800/80 border border-slate-600 shadow-xl backdrop-blur-sm">
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">🏟️</div>
            <h3 className="text-xl font-bold text-white mb-2">No se encontraron equipos</h3>
            <p className="text-slate-400 mb-4">
              {searchTerm 
                ? "Ajusta la búsqueda para ver más resultados"
                : "Agrega el primer equipo a la liga"
              }
            </p>
            <Button 
              onClick={() => {
                setEditingTeam(null);
                resetForm();
                setIsDialogOpen(true);
              }}
              className="bg-gradient-to-r from-primary-500 to-accent-500"
            >
              Crear Primer Equipo
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}