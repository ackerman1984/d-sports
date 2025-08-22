"use client";

import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '@/lib/apollo/client';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { updateAuthToken } from '@/lib/apollo/client';

interface ApolloWrapperProps {
  children: React.ReactNode;
}

export function ApolloWrapper({ children }: ApolloWrapperProps) {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Actualizar el token de Apollo cuando cambie la sesión
    if (status === 'authenticated' && session?.user) {
      // En una implementación real, obtendrías el token de Supabase
      // Por ahora, usamos un token simulado basado en la sesión
      const mockToken = `${session.user.id}-${Date.now()}`;
      updateAuthToken(mockToken);
    } else if (status === 'unauthenticated') {
      updateAuthToken(null);
    }
  }, [session, status]);

  return (
    <ApolloProvider client={apolloClient}>
      {children}
    </ApolloProvider>
  );
}