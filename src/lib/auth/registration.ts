import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin-client';
import { createClient as createClientClient } from '@/lib/supabase/client';
import { Usuario, Role } from '@/types/beisbol';

export interface RegisterUserData {
  email: string;
  password: string;
  nombre: string;
  telefono?: string;
  fechaNacimiento?: string;
  role: Role;
  ligaId: string;
  fotoUrl?: string;
  numeroCasaca?: number;
  equipoId?: string;
  posicion?: string;
}

export interface AdminCreateUserData {
  email: string;
  password: string;
  nombre: string;
  telefono?: string;
  role: 'anotador' | 'jugador';
  ligaId: string;
  equipoId?: string;
  numeroCasaca?: number;
}

export async function registerUser(userData: RegisterUserData): Promise<{ user: Usuario | null; error: string | null }> {
  // Usar el cliente admin que bypasea RLS para crear usuarios
  const supabase = createAdminClient();

  try {
    // PASO 1: Verificar si ya existe un perfil pre-creado para este email
    console.log('🔍 Verificando si existe perfil pre-creado para:', userData.email);
    
    const { data: jugadorPreCreado } = await supabase
      .from('jugadores')
      .select('id, nombre, liga_id, equipo_id, numero_casaca, posicion')
      .eq('email', userData.email)
      .single();

    let authData;
    
    if (jugadorPreCreado) {
      console.log('✅ Jugador pre-creado encontrado, vinculando cuenta Auth...');
      
      // Crear usuario Auth normal con signUp 
      const clientSupabase = createClientClient();
      const signUpResult = await clientSupabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      });

      if (signUpResult.error || !signUpResult.data.user) {
        return { user: null, error: signUpResult.error?.message || 'Error creating auth user' };
      }
      
      authData = signUpResult.data;
      
      // Actualizar el jugador pre-creado con el ID del Auth
      const { error: updateError } = await supabase
        .from('jugadores')
        .update({ 
          id: authData.user!.id,
          updated_at: new Date().toISOString()
        })
        .eq('email', userData.email);
        
      if (updateError) {
        console.error('Error vinculando jugador:', updateError);
        return { user: null, error: 'Error linking pre-created player' };
      }
      
      // Actualizar usuario en tabla usuarios con el nuevo ID
      const { error: updateUsuarioError } = await supabase
        .from('usuarios')
        .update({ 
          id: authData.user!.id,
          updated_at: new Date().toISOString()
        })
        .eq('email', userData.email);
        
      if (updateUsuarioError) {
        console.error('Error vinculando usuario:', updateUsuarioError);
        return { user: null, error: 'Error linking user profile' };
      }
      
      // Actualizar estadísticas si existen
      await supabase
        .from('estadisticas_jugador')
        .update({ jugador_id: authData.user!.id })
        .eq('jugador_id', jugadorPreCreado.id);
      
      console.log('🔗 Vinculación completada exitosamente');
      
    } else {
      console.log('📝 No hay jugador pre-creado, registro normal...');
      
      // 1. Crear usuario en Supabase Auth usando admin API (solo si no hay perfil pre-creado)
      const createResult = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true, // Auto-confirmar email
      });

      if (createResult.error || !createResult.data.user) {
        return { user: null, error: createResult.error?.message || 'Error creating auth user' };
      }
      
      authData = createResult.data;
    }

    // 2. Obtener o crear perfil de usuario 
    let userProfile;
    
    if (jugadorPreCreado) {
      // Si el jugador fue pre-creado, obtener el perfil existente
      const { data: existingProfile } = await supabase
        .from('usuarios')
        .select()
        .eq('id', authData.user!.id)
        .single();
        
      userProfile = existingProfile;
    } else {
      // Si es registro normal, crear nuevo perfil
      const { data: newProfile, error: profileError } = await supabase
        .from('usuarios')
        .upsert({
          id: authData.user!.id,
          email: userData.email,
          nombre: userData.nombre,
          role: userData.role,
          liga_id: userData.ligaId,
          activo: true,
        })
        .select()
        .single();

      if (profileError) {
        // Si falla la creación del perfil, eliminar el usuario de auth
        await supabase.auth.admin.deleteUser(authData.user!.id);
        return { user: null, error: profileError.message };
      }
      
      userProfile = newProfile;
    }

    // 3. Crear entrada en tabla específica según el rol (solo si no existe)
    if (userData.role === 'jugador' && !jugadorPreCreado) {
      const { error: jugadorError } = await supabase
        .from('jugadores')
        .insert({
          id: authData.user!.id,
          equipo_id: userData.equipoId,
          nombre: userData.nombre,
          email: userData.email,
          telefono: userData.telefono,
          foto_url: userData.fotoUrl,
          numero_casaca: userData.numeroCasaca,
          fecha_nacimiento: userData.fechaNacimiento,
          posicion: userData.posicion || 'No especificada',
          liga_id: userData.ligaId,
          estado: 'activo',
          activo: true,
          created_by: null, // Auto-registro
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (jugadorError) {
        console.error('Error creating jugador entry:', jugadorError);
        // Si falla la creación del jugador, eliminar el usuario
        await supabase.auth.admin.deleteUser(authData.user!.id);
        await supabase.from('usuarios').delete().eq('id', authData.user!.id);
        return { user: null, error: 'Error creating player profile' };
      }
    } else if (userData.role === 'admin') {
      const { error: adminError } = await supabase
        .from('administradores')
        .insert({
          id: authData.user!.id,
          nombre: userData.nombre,
          email: userData.email,
          liga_id: userData.ligaId,
          activo: true,
          created_at: new Date().toISOString()
        });

      if (adminError) {
        console.error('Error creating admin entry:', adminError);
        // Si falla la creación del admin, eliminar el usuario
        await supabase.auth.admin.deleteUser(authData.user!.id);
        await supabase.from('usuarios').delete().eq('id', authData.user!.id);
        return { user: null, error: 'Error creating admin profile' };
      }
    }
    // Para anotadores, se crean desde el panel de admin, no desde registro público

    const user: Usuario = {
      id: userProfile.id,
      email: userProfile.email,
      nombre: userProfile.nombre,
      role: userProfile.role as Role,
      ligaId: userProfile.liga_id,
      activo: userProfile.activo,
      createdAt: new Date(userProfile.created_at),
    };

    return { user, error: null };
  } catch (error) {
    return { user: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function adminCreateUser(adminId: string, userData: AdminCreateUserData): Promise<{ user: Usuario | null; error: string | null }> {
  const supabase = createAdminClient();

  try {
    // Verificar que el admin tenga permisos
    const { data: admin } = await supabase
      .from('usuarios')
      .select('role, liga_id')
      .eq('id', adminId)
      .single();

    if (!admin || admin.role !== 'admin') {
      return { user: null, error: 'Unauthorized: Only admins can create users' };
    }

    // Verificar que el usuario se cree en la misma liga del admin
    if (userData.ligaId !== admin.liga_id) {
      return { user: null, error: 'Can only create users in your own league' };
    }

    // Crear usuario usando la función de registro
    const result = await registerUser({
      ...userData,
      ligaId: admin.liga_id,
    });

    return result;
  } catch (error) {
    return { user: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function updateUserProfile(userId: string, updateData: Partial<RegisterUserData>): Promise<{ user: Usuario | null; error: string | null }> {
  const supabase = createAdminClient();

  try {
    // Actualizar tabla usuarios (solo campos básicos)
    const { data: updatedUser, error } = await supabase
      .from('usuarios')
      .update({
        nombre: updateData.nombre,
        email: updateData.email,
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return { user: null, error: error.message };
    }

    // Actualizar tabla específica según el rol
    if (updatedUser.role === 'jugador') {
      await supabase
        .from('jugadores')
        .update({
          nombre: updateData.nombre,
          email: updateData.email,
          telefono: updateData.telefono,
          foto_url: updateData.fotoUrl,
          fecha_nacimiento: updateData.fechaNacimiento,
          numero_casaca: updateData.numeroCasaca,
          equipo_id: updateData.equipoId,
          posicion: updateData.posicion,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
    } else if (updatedUser.role === 'admin') {
      await supabase
        .from('administradores')
        .update({
          nombre: updateData.nombre,
          email: updateData.email,
        })
        .eq('id', userId);
    } else if (updatedUser.role === 'anotador') {
      await supabase
        .from('anotadores')
        .update({
          nombre: updateData.nombre,
          email: updateData.email,
          foto_url: updateData.fotoUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
    }

    const user: Usuario = {
      id: updatedUser.id,
      email: updatedUser.email,
      nombre: updatedUser.nombre,
      role: updatedUser.role as Role,
      ligaId: updatedUser.liga_id,
      activo: updatedUser.activo,
      createdAt: new Date(updatedUser.created_at),
    };

    return { user, error: null };
  } catch (error) {
    return { user: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function assignAnotadorToGame(adminId: string, anotadorId: string, juegoId: string): Promise<{ success: boolean; error: string | null }> {
  const supabase = createAdminClient();

  try {
    // Verificar permisos de admin
    const { data: admin } = await supabase
      .from('usuarios')
      .select('role')
      .eq('id', adminId)
      .single();

    if (!admin || admin.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only admins can assign anotadores' };
    }

    // Verificar que el anotador tenga el rol correcto
    const { data: anotador } = await supabase
      .from('usuarios')
      .select('role')
      .eq('id', anotadorId)
      .single();

    if (!anotador || anotador.role !== 'anotador') {
      return { success: false, error: 'User is not an anotador' };
    }

    // Asignar anotador al juego
    const { error: assignError } = await supabase
      .from('anotador_juegos')
      .insert({
        anotador_id: anotadorId,
        juego_id: juegoId,
        asignado_por: adminId,
      });

    if (assignError) {
      return { success: false, error: assignError.message };
    }

    // También actualizar el juego con el anotador principal
    await supabase
      .from('juegos')
      .update({ anotador_id: anotadorId })
      .eq('id', juegoId);

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}