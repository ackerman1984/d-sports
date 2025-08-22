import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { duplicateValidator, DuplicateCheckResult } from '@/lib/validation/duplicates';
import { teamSchema, playerSchema, validateWithFriendlyErrors } from '@/lib/validation/schemas';
import toast from 'react-hot-toast';

export interface Team {
  id: string;
  nombre: string;
  color: string;
  logo_url?: string;
  activo: boolean;
  jugadores_count?: number;
  liga_id: string;
  created_at: string;
}

export interface Player {
  id: string;
  nombre: string;
  numero_casaca: number;
  posicion?: string;
  foto_url?: string;
  activo: boolean;
  equipo_id: string;
  usuario_id?: string;
}

export class TeamsAPI {
  private supabase = createClientComponentClient();

  async getTeamsByLiga(ligaId: string): Promise<Team[]> {
    const { data, error } = await this.supabase
      .from('equipos')
      .select(`
        *,
        jugadores(count)
      `)
      .eq('liga_id', ligaId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data.map(team => ({
      ...team,
      jugadores_count: team.jugadores?.[0]?.count || 0
    }));
  }

  async createTeam(teamData: Omit<Team, 'id' | 'created_at' | 'jugadores_count'>): Promise<Team> {
    console.log('TeamsAPI: Creating team with data:', teamData);
    
    // 1. Validar datos del formulario
    const validation = validateWithFriendlyErrors(teamSchema, teamData);
    if (!validation.success) {
      const errorMessage = validation.errors.join(', ');
      toast.error(`Datos inválidos: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    // 2. Verificar duplicados
    try {
      const duplicateCheck = await duplicateValidator.checkTeamName(
        teamData.nombre, 
        teamData.liga_id
      );
      
      if (duplicateCheck.exists) {
        toast.error(duplicateCheck.message!);
        throw new Error(duplicateCheck.message!);
      }
    } catch (validationError) {
      console.error('TeamsAPI: Validation error:', validationError);
      throw validationError;
    }

    // 3. Crear el equipo
    const { data, error } = await this.supabase
      .from('equipos')
      .insert(validation.data)
      .select()
      .single();

    console.log('TeamsAPI: Supabase response:', { data, error });

    if (error) {
      console.error('TeamsAPI: Supabase error:', error);
      
      // Mensajes de error más amigables
      let friendlyMessage = 'Error creando el equipo';
      if (error.message.includes('violates row-level security')) {
        friendlyMessage = 'No tienes permisos para crear equipos en esta liga';
      } else if (error.message.includes('foreign key')) {
        friendlyMessage = 'Liga no encontrada o inválida';
      }
      
      toast.error(friendlyMessage);
      throw new Error(friendlyMessage);
    }
    
    console.log('TeamsAPI: Team created successfully:', data);
    toast.success(`Equipo "${data.nombre}" creado exitosamente`);
    return { ...data, jugadores_count: 0 };
  }

  async updateTeam(teamId: string, updates: Partial<Team>): Promise<Team> {
    const { data, error } = await this.supabase
      .from('equipos')
      .update(updates)
      .eq('id', teamId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteTeam(teamId: string): Promise<void> {
    const { error } = await this.supabase
      .from('equipos')
      .delete()
      .eq('id', teamId);

    if (error) throw error;
  }

  async getTeamPlayers(teamId: string): Promise<Player[]> {
    const { data, error } = await this.supabase
      .from('jugadores')
      .select('*')
      .eq('equipo_id', teamId)
      .eq('activo', true)
      .order('numero_casaca', { ascending: true });

    if (error) throw error;
    return data;
  }

  async createPlayer(playerData: Omit<Player, 'id'>): Promise<Player> {
    console.log('TeamsAPI: Creating player with data:', playerData);
    
    // 1. Validar datos del formulario
    const validation = validateWithFriendlyErrors(playerSchema, playerData);
    if (!validation.success) {
      const errorMessage = validation.errors.join(', ');
      toast.error(`Datos inválidos: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    // 2. Verificar duplicado de número de casaca
    try {
      const duplicateCheck = await duplicateValidator.checkJerseyNumber(
        playerData.numero_casaca,
        playerData.equipo_id
      );
      
      if (duplicateCheck.exists) {
        toast.error(duplicateCheck.message!);
        throw new Error(duplicateCheck.message!);
      }
    } catch (validationError) {
      console.error('TeamsAPI: Player validation error:', validationError);
      throw validationError;
    }

    // 3. Crear el jugador
    const { data, error } = await this.supabase
      .from('jugadores')
      .insert(validation.data)
      .select()
      .single();

    if (error) {
      console.error('TeamsAPI: Error creating player:', error);
      
      let friendlyMessage = 'Error creando el jugador';
      if (error.message.includes('violates row-level security')) {
        friendlyMessage = 'No tienes permisos para crear jugadores en este equipo';
      } else if (error.message.includes('foreign key')) {
        friendlyMessage = 'Equipo no encontrado o inválido';
      }
      
      toast.error(friendlyMessage);
      throw new Error(friendlyMessage);
    }

    toast.success(`Jugador "${data.nombre}" agregado exitosamente`);
    return data;
  }

  async updatePlayer(playerId: string, updates: Partial<Player>): Promise<Player> {
    const { data, error } = await this.supabase
      .from('jugadores')
      .update(updates)
      .eq('id', playerId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deletePlayer(playerId: string): Promise<void> {
    const { error } = await this.supabase
      .from('jugadores')
      .delete()
      .eq('id', playerId);

    if (error) throw error;
  }
}

export const teamsAPI = new TeamsAPI();