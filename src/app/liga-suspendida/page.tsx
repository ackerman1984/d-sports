'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Suspense } from 'react';

function LigaSuspendidaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') || 'Liga suspendida por el administrador';

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Liga Suspendida
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          El acceso a esta liga ha sido temporalmente restringido
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Acceso Denegado
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{reason}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600">
                Tu liga ha sido suspendida temporalmente. Durante este período:
              </p>
              
              <ul className="text-left text-sm text-gray-600 space-y-2">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  No podrás acceder al sistema
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  Todos los usuarios de tu liga están bloqueados
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  Los datos están preservados y seguros
                </li>
              </ul>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-4">
                  Si crees que esto es un error, contacta al administrador del sistema.
                </p>
                
                <button
                  onClick={handleLogout}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LigaSuspendidaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <LigaSuspendidaContent />
    </Suspense>
  );
}