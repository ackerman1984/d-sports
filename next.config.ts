import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuración mínima para evitar problemas de inicio
  images: {
    domains: ['localhost'],
  },
  // Configuración ESLint para no fallar el build con warnings
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Configuración para manejar headers grandes y evitar error 431
  serverExternalPackages: ['@supabase/supabase-js'],
  // Configuración para evitar errores de headers muy grandes
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
