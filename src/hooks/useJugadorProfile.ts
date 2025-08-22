'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export interface JugadorProfile {
  id: string;
  email: string;
  nombre: string;
  fechaNacimiento?: string;
  fotoUrl?: string;
  numeroCasaca?: number | null;
  equipoId?: string;
  posicion?: string;
  ligaId?: string;
  role?: string;
  estado?: string;
  activo?: boolean;
  password_temporal?: boolean;
  telefono?: string;
  equipo?: {
    id: string;
    nombre: string;
    color?: string;
  };
}

export interface UseJugadorProfileReturn {
  profile: JugadorProfile | null;
  loading: boolean;
  error: string;
  refetch: () => Promise<void>;
  updateProfile: (data: Partial<JugadorProfile>) => Promise<boolean>;
}

export function useJugadorProfile(): UseJugadorProfileReturn {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<JugadorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProfile = useCallback(async () => {
    if (!session?.user || session.user.role !== 'jugador') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/jugador/profile');
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error cargando el perfil');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Error de conexión al cargar el perfil');
    } finally {
      setLoading(false);
    }
  }, [session]);

  const updateProfile = useCallback(async (updateData: Partial<JugadorProfile>): Promise<boolean> => {
    if (!session?.user || session.user.role !== 'jugador') {
      setError('No autorizado');
      return false;
    }

    try {
      console.log('🚀 Hook actualizando perfil con datos:', updateData);
      
      const response = await fetch('/api/jugador/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        console.log('✅ Actualización exitosa, recargando perfil...');
        // Recargar perfil actualizado
        await fetchProfile();
        return true;
      } else {
        const errorData = await response.json();
        console.error('❌ Error en actualización:', errorData);
        setError(errorData.error || 'Error actualizando el perfil');
        return false;
      }
    } catch (error) {
      console.error('💥 Error updating profile:', error);
      setError('Error de conexión al actualizar el perfil');
      return false;
    }
  }, [session, fetchProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile,
    updateProfile
  };
}