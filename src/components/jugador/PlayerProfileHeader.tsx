'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface JugadorProfile {
  id: string;
  email: string;
  nombre: string;
  telefono?: string;
  fotoUrl?: string;
  numeroCasaca?: number;
  equipoId?: string;
  equipo?: {
    id: string;
    nombre: string;
    color: string;
  };
}

interface Liga {
  id: string;
  nombre: string;
  codigo: string;
}

export default function PlayerProfileHeader() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<JugadorProfile | null>(null);
  const [liga, setLiga] = useState<Liga | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
      fetchLiga();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchLiga = async () => {
    try {
      const response = await fetch(`/api/ligas?id=${session?.user?.ligaId}`);
      if (response.ok) {
        const data = await response.json();
        setLiga(data.liga);
      }
    } catch (error) {
      console.error('Error fetching liga:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-8 animate-pulse">
        <div className="flex items-center space-x-6">
          <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full"></div>
          <div className="space-y-2">
            <div className="h-8 bg-white bg-opacity-20 rounded w-48"></div>
            <div className="h-4 bg-white bg-opacity-20 rounded w-32"></div>
            <div className="h-6 bg-white bg-opacity-20 rounded w-40"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-gradient-to-r from-red-600 to-red-800 px-6 py-8">
        <p className="text-white text-center">Error cargando el perfil del jugador</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center space-y-6 md:space-y-0 md:space-x-8">
          {/* Foto del jugador */}
          <div className="relative flex-shrink-0">
            {profile.fotoUrl ? (
              <Image
                src={profile.fotoUrl}
                alt={profile.nombre}
                width={150}
                height={150}
                className="rounded-full border-4 border-white shadow-xl object-cover"
              />
            ) : (
              <div className="w-[150px] h-[150px] bg-white rounded-full flex items-center justify-center border-4 border-white shadow-xl">
                <span className="text-5xl font-bold text-blue-600">
                  {profile.nombre.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Información del jugador */}
          <div className="text-white text-center md:text-left flex-1">
            <div className="mb-6">
              <h1 className="text-4xl md:text-5xl font-bold mb-2">{profile.nombre}</h1>
              <p className="text-blue-100 text-lg">
                {liga ? liga.nombre : 'Cargando liga...'}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Información del equipo */}
              <div className="bg-white bg-opacity-15 rounded-xl p-4 backdrop-blur-sm border border-white border-opacity-20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-blue-100 text-sm font-medium">EQUIPO</h3>
                    <p className="text-white font-bold text-lg">
                      {profile.equipo ? profile.equipo.nombre : 'Sin equipo'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Número de playera */}
              <div className="bg-white bg-opacity-15 rounded-xl p-4 backdrop-blur-sm border border-white border-opacity-20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">#</span>
                  </div>
                  <div>
                    <h3 className="text-blue-100 text-sm font-medium">NÚMERO DE PLAYERA</h3>
                    <p className="text-white font-bold text-2xl">
                      {profile.numeroCasaca ? profile.numeroCasaca : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Teléfono */}
              <div className="bg-white bg-opacity-15 rounded-xl p-4 backdrop-blur-sm border border-white border-opacity-20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-blue-100 text-sm font-medium">TELÉFONO</h3>
                    <p className="text-white font-bold text-lg">
                      {profile.telefono || 'No especificado'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}