"use client";

import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

// HTTP Link hacia Supabase GraphQL
const httpLink = createHttpLink({
  uri: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/graphql/v1`,
});

// Auth Link para agregar el token de autorización
const authLink = setContext((_, { headers }) => {
  // En el cliente, obtenemos el token desde sessionStorage o cookies
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('supabase-auth-token') 
    : null;

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    },
  };
});

// Error Link para manejar errores GraphQL
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.log(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }

  if (networkError) {
    console.log(`[Network error]: ${networkError}`);
    
    // Si es un error 401, podemos redirigir al login
    if ('statusCode' in networkError && networkError.statusCode === 401) {
      // Limpiar tokens y redirigir
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase-auth-token');
        window.location.href = '/login';
      }
    }
  }
});

// Configuración del cache con type policies para béisbol
const cache = new InMemoryCache({
  typePolicies: {
    Liga: {
      fields: {
        equipos: {
          merge(existing = [], incoming) {
            return incoming;
          },
        },
        temporadas: {
          merge(existing = [], incoming) {
            return incoming;
          },
        },
      },
    },
    Jugador: {
      fields: {
        estadisticas: {
          merge(existing = [], incoming) {
            return incoming;
          },
        },
      },
    },
    Juego: {
      fields: {
        estadisticas_jugadores: {
          merge(existing = [], incoming) {
            return incoming;
          },
        },
      },
    },
    Query: {
      fields: {
        // Cache para estadísticas con TTL
        estadisticas_jugadores: {
          merge(existing = [], incoming) {
            return incoming;
          },
        },
        // Cache para juegos con políticas específicas
        juegos: {
          merge(existing = [], incoming, { args }) {
            // Si hay filtros, no mergear con cache existente
            if (args?.where) {
              return incoming;
            }
            return [...existing, ...incoming];
          },
        },
      },
    },
  },
});

// Cliente Apollo principal
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache,
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true,
    },
    query: {
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
  connectToDevTools: process.env.NODE_ENV === 'development',
});

// Función helper para actualizar el token de auth
export const updateAuthToken = (token: string | null) => {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('supabase-auth-token', token);
    } else {
      localStorage.removeItem('supabase-auth-token');
    }
    
    // Resetear el cache cuando cambie el token
    apolloClient.resetStore();
  }
};

// Función helper para queries con contexto de liga
export const createLigaContext = (ligaId: string) => ({
  headers: {
    'X-Liga-ID': ligaId,
  },
});

export default apolloClient;