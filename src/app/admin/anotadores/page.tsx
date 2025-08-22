'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import AnotadorManagement from '@/components/admin/AnotadorManagement';

export default function AnotadoresAdminPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Gestión de Anotadores
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Liga: {session.user.ligaSubdominio || 'N/A'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                Administrador
              </span>
              <button
                onClick={() => window.location.href = '/admin/dashboard'}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm"
              >
                ← Volver al Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnotadorManagement />
      </div>
    </div>
  );
}