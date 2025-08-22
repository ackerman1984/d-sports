'use client';

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <span className="text-6xl">🚫</span>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Acceso Denegado
        </h1>
        
        <p className="text-gray-600 mb-6">
          Tu liga no está autorizada para acceder a la aplicación o ha sido suspendida temporalmente.
        </p>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">
            ¿Qué significa esto?
          </h4>
          <ul className="text-xs text-yellow-700 space-y-1 text-left">
            <li>• La liga está pendiente de autorización</li>
            <li>• La liga ha sido suspendida por el administrador</li>
            <li>• Hay un problema técnico temporal</li>
          </ul>
        </div>
        
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Si crees que esto es un error, contacta al administrador de tu liga.
          </p>
          
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Volver al Login
          </button>
        </div>
      </div>
    </div>
  );
}