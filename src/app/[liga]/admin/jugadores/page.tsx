'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useState } from 'react';
import { BaseballNavigation } from '@/components/layout/baseball-navigation';
import { PlayerManagement } from '@/components/admin/player-management';

export default function AdminJugadoresPage() {
  const { data: session, status } = useSession();

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

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <BaseballNavigation user={session.user} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PlayerManagement user={session.user} />
      </div>
    </div>
  );
}