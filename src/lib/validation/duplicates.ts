import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export interface DuplicateCheckResult {
  exists: boolean;
  message?: string;
  conflictData?: unknown;
}

export class DuplicateValidator {
  private supabase = createClientComponentClient();

  // Verificar si un email ya existe en usuarios
  async checkUserEmail(email: string, excludeId?: string): Promise<DuplicateCheckResult> {
    try {
      let query = this.supabase
        .from('usuarios')
        .select('id, email, nombre, role')
        .eq('email', email);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }

      return {
        exists: !!data,
        message: data ? `El email ${email} ya está registrado por ${data.nombre} (${data.role})` : undefined,
        conflictData: data
      };
    } catch (error) {
      console.error('Error checking email duplicate:', error);
      throw error;
    }
  }

  // Verificar si un nombre de equipo ya existe en una liga
  async checkTeamName(nombre: string, ligaId: string, excludeId?: string): Promise<DuplicateCheckResult> {
    try {
      let query = this.supabase
        .from('equipos')
        .select('id, nombre, color')
        .eq('nombre', nombre)
        .eq('liga_id', ligaId);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return {
        exists: !!data,
        message: data ? `Ya existe un equipo llamado "${nombre}" en esta liga` : undefined,
        conflictData: data
      };
    } catch (error) {
      console.error('Error checking team name duplicate:', error);
      throw error;
    }
  }

  // Verificar si un número de casaca ya existe en un equipo
  async checkJerseyNumber(numero: number, equipoId: string, excludeId?: string): Promise<DuplicateCheckResult> {
    try {
      let query = this.supabase
        .from('jugadores')
        .select('id, nombre, numero_casaca')
        .eq('numero_casaca', numero)
        .eq('equipo_id', equipoId)
        .eq('activo', true);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return {
        exists: !!data,
        message: data ? `El número ${numero} ya está ocupado por ${data.nombre}` : undefined,
        conflictData: data
      };
    } catch (error) {
      console.error('Error checking jersey number duplicate:', error);
      throw error;
    }
  }

  // Verificar si un código de liga ya existe
  async checkLeagueCode(codigo: string, excludeId?: string): Promise<DuplicateCheckResult> {
    try {
      let query = this.supabase
        .from('ligas')
        .select('id, nombre, codigo, subdominio')
        .eq('codigo', codigo.toUpperCase());

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return {
        exists: !!data,
        message: data ? `El código "${codigo}" ya está siendo usado por la liga "${data.nombre}"` : undefined,
        conflictData: data
      };
    } catch (error) {
      console.error('Error checking league code duplicate:', error);
      throw error;
    }
  }

  // Verificar si un subdominio ya existe
  async checkSubdomain(subdominio: string, excludeId?: string): Promise<DuplicateCheckResult> {
    try {
      let query = this.supabase
        .from('ligas')
        .select('id, nombre, codigo, subdominio')
        .eq('subdominio', subdominio.toLowerCase());

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return {
        exists: !!data,
        message: data ? `El subdominio "${subdominio}" ya está siendo usado por la liga "${data.nombre}"` : undefined,
        conflictData: data
      };
    } catch (error) {
      console.error('Error checking subdomain duplicate:', error);
      throw error;
    }
  }

  // Verificar múltiples campos a la vez
  async checkMultiple(checks: Array<() => Promise<DuplicateCheckResult>>): Promise<DuplicateCheckResult[]> {
    try {
      const results = await Promise.all(checks.map(check => check()));
      return results;
    } catch (error) {
      console.error('Error in multiple duplicate checks:', error);
      throw error;
    }
  }
}

export const duplicateValidator = new DuplicateValidator();