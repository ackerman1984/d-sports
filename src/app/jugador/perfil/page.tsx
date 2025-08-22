'use client';

import { useSession, signOut } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import ProfileEditor from '@/components/jugador/ProfileEditor';
import PasswordChangeModal from '@/components/jugador/PasswordChangeModal';
import { useJugadorProfile } from '@/hooks/useJugadorProfile';


export default function JugadorPerfilPage() {
  const { data: session, status } = useSession();
  const { profile, loading, error, updateProfile, refetch } = useJugadorProfile();
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleProfileUpdate = async (updatedData: any) => {
    const success = await updateProfile(updatedData);
    if (success) {
      // El hook ya actualiza los datos automáticamente
      // Solo cerramos el editor
      setTimeout(() => {
        setShowProfileEditor(false);
      }, 500);
    }
  };

  const handlePasswordChanged = () => {
    // Contraseña cambiada exitosamente
    setShowPasswordModal(false);
    // Refrescar el perfil para actualizar el estado de password_temporal
    refetch();
  };

  // Verificar si necesita cambiar contraseña temporal
  const needsPasswordChange = profile?.password_temporal === true;

  // Mostrar modal automáticamente si tiene contraseña temporal
  useEffect(() => {
    if (needsPasswordChange && !loading && !error) {
      setShowPasswordModal(true);
    }
  }, [needsPasswordChange, loading, error]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto" style={{ borderColor: '#619BF3' }}></div>
          <p className="mt-4 text-white">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-red-500">
          <p className="text-xl mb-4">{error}</p>
          <button 
            onClick={() => refetch()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'jugador') {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 via-accent-500 to-pastel-blue px-6 py-8 shadow-xl">
        {/* Navegación */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => window.history.back()}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-white/30 transition-all duration-200 flex items-center space-x-2 text-sm font-medium"
          >
            <span>←</span>
            <span>Volver</span>
          </button>
          
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-white/30 transition-all duration-200 flex items-center space-x-2 text-sm font-medium"
          >
            <span>🚪</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>

        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Mi Perfil</h1>
          <p className="text-white/90 text-lg">Gestiona tu información personal</p>
        </div>
      </div>

      {/* Contenido del Perfil */}
      <div className="px-6 py-8 max-w-4xl mx-auto">
        {profile && (
          <div className="bg-slate-800/80 border border-slate-600 rounded-xl p-8 backdrop-blur-sm">
            {/* Información del Jugador */}
            <div className="flex items-center space-x-8 mb-8">
              {/* Avatar */}
              <div className="relative">
                {profile.fotoUrl ? (
                  <Image
                    src={profile.fotoUrl}
                    alt={profile.nombre || ''}
                    width={120}
                    height={120}
                    className="rounded-full border-4 border-white/20 shadow-xl"
                  />
                ) : (
                  <div className="w-30 h-30 bg-white/20 rounded-full flex items-center justify-center border-4 border-white/20 shadow-xl backdrop-blur-sm">
                    <span className="text-4xl font-bold text-white">
                      {profile.nombre?.charAt(0).toUpperCase() || 'J'}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-secondary-500 text-white text-sm px-3 py-1 rounded-full font-bold shadow-lg border-2 border-white">
                  #{profile.numeroCasaca || '42'}
                </div>
              </div>

              {/* Info del jugador */}
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-white mb-4">{profile.nombre || 'Nombre Jugador'}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white/90">
                  <div className="flex items-center">
                    <span className="text-pastel-red font-semibold w-20">Equipo:</span>
                    <span className="ml-3 font-medium">{profile.equipo?.nombre || 'Sin equipo'}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-pastel-blue font-semibold w-20">Posición:</span>
                    <span className="ml-3 font-medium">{profile.posicion || 'No especificada'}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xl mr-2">📞</span>
                    <span>{profile.telefono || 'No especificado'}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xl mr-2">📧</span>
                    <span>{profile.email || session?.user?.email}</span>
                  </div>
                  {profile.fechaNacimiento && (
                    <div className="flex items-center">
                      <span className="text-xl mr-2">🎂</span>
                      <span>
                        {new Date(profile.fechaNacimiento + 'T12:00:00').toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <span className="text-xl mr-2">🔢</span>
                    <span>Número: {profile.numeroCasaca || 'Sin asignar'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Botón Editar */}
            <div className="text-center">
              <button
                onClick={() => setShowProfileEditor(true)}
                className="bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300 shadow-lg"
              >
                ✏️ Editar Perfil
              </button>
            </div>

          </div>
        )}
      </div>

      {/* Modal de Edición de Perfil */}
      {showProfileEditor && profile && (
        <ProfileEditor
          profile={{
            nombre: profile.nombre,
            telefono: profile.telefono || '',
            fotoUrl: profile.fotoUrl || '',
            posicion: profile.posicion || '',
            email: profile.email || session?.user?.email || '',
            numeroCasaca: profile.numeroCasaca,
            fechaNacimiento: profile.fechaNacimiento || ''
          }}
          onProfileUpdate={handleProfileUpdate}
          onClose={() => setShowProfileEditor(false)}
        />
      )}

      {/* Modal de Cambio de Contraseña Temporal */}
      {showPasswordModal && needsPasswordChange && (
        <PasswordChangeModal
          onPasswordChanged={handlePasswordChanged}
        />
      )}
    </div>
  );
}