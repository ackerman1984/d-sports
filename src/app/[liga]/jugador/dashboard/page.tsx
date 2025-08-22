'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useState } from 'react';
import { JugadorDashboard } from '@/components/dashboard/jugador-dashboard';
import { BaseballNavigation } from '@/components/layout/baseball-navigation';
import ProfileManagement from '@/components/jugador/ProfileManagement';

export default function JugadorDashboardPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto" style={{ borderColor: '#619BF3' }}></div>
          <p className="mt-4 text-white">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'jugador') {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <BaseballNavigation user={session.user} />
      
      {/* Navegación de pestañas */}
      <div className="bg-slate-800 shadow-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-accent-500 text-accent-500'
                  : 'border-transparent text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'profile'
                  ? 'border-accent-500 text-accent-500'
                  : 'border-transparent text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              Editar Perfil
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'team'
                  ? 'border-accent-500 text-accent-500'
                  : 'border-transparent text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              Mi Equipo
            </button>
          </nav>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <JugadorDashboard user={session.user} />}
        
        {activeTab === 'profile' && <ProfileManagement />}
        
        {activeTab === 'team' && (
          <div className="bg-slate-800/80 border border-slate-600 rounded-xl shadow-xl p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-4 text-white">Mi Equipo</h2>
            <p className="text-slate-400">
              Información sobre tu equipo y compañeros de juego.
            </p>
            {/* TODO: Implementar componente de información del equipo */}
          </div>
        )}
      </div>
    </div>
  );
}