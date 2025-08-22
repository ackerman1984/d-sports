'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AnotadorLogin() {
  const router = useRouter();
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!codigo.trim()) {
      setError('Por favor ingresa tu código de acceso');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/anotador/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          codigo: codigo.trim().toUpperCase() 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirigir al dashboard del anotador
        router.push('/anotador/dashboard');
      } else {
        setError(data.error || 'Código de acceso inválido');
      }
    } catch (error) {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-4xl font-extrabold text-white">
          📝 Acceso Anotador
        </h2>
        <p className="mt-4 text-center text-lg text-green-100">
          Ingresa tu código de acceso
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/90 backdrop-blur-sm py-10 px-8 shadow-2xl rounded-2xl border border-green-200">
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-xl">
              <div className="flex items-center">
                <span className="text-red-500 mr-2">⚠️</span>
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                Código de Acceso
              </label>
              <input
                type="text"
                required
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="Ingresa tu código"
                className="block w-full bg-white border-2 border-gray-300 rounded-xl px-4 py-4 text-gray-900 text-xl font-mono tracking-wider text-center focus:outline-none focus:border-green-500 transition-all duration-300"
                maxLength={20}
                style={{ letterSpacing: '0.2em' }}
              />
              <p className="mt-2 text-sm text-gray-600 text-center">
                Ingresa el código que te proporcionó el administrador
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !codigo.trim()}
              className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white bg-gradient-to-r from-green-600 via-green-700 to-green-800 hover:from-green-700 hover:via-green-800 hover:to-green-900 focus:outline-none focus:ring-4 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  Verificando...
                </>
              ) : (
                <>
                  <span className="mr-2">🔑</span>
                  Ingresar
                </>
              )}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">¿No tienes código?</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 mb-3">
                Contacta al administrador de tu liga para obtener tu código de acceso
              </p>
              <button
                onClick={() => router.push('/login')}
                className="text-green-600 hover:text-green-800 font-medium"
              >
                ← Volver al login normal
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Información adicional */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-green-800/50 backdrop-blur-sm rounded-xl p-6 border border-green-600">
          <h3 className="text-white font-semibold mb-3">💡 Información</h3>
          <ul className="text-green-100 text-sm space-y-2">
            <li>• Solo necesitas tu código único de anotador</li>
            <li>• El código lo convierte automáticamente a mayúsculas</li>
            <li>• Si olvidas tu código, contacta al administrador</li>
            <li>• Podrás anotar partidos una vez dentro</li>
          </ul>
        </div>
      </div>
    </div>
  );
}