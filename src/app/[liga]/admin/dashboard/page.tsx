'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { AdminDashboard } from '@/components/dashboard/admin-dashboard';
import { BaseballNavigation } from '@/components/layout/baseball-navigation';

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--background)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto" style={{ borderColor: 'var(--accent)' }}></div>
          <p className="mt-4" style={{ color: 'var(--foreground)' }}>Cargando...</p>
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
        <AdminDashboard user={session.user} />
      </div>
    </div>
  );
}