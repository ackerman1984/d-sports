"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [loginType, setLoginType] = useState<'normal' | 'anotador'>('normal');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (loginType === 'anotador') {
        // Login de anotador
        if (!codigo.trim()) {
          setError('Por favor ingresa tu código de acceso');
          setLoading(false);
          return;
        }

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
      } else {
        // Login normal (admin/jugador)
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError("Credenciales incorrectas");
        } else {
          // Forzar recarga para obtener la sesión actualizada y redirigir
          window.location.href = "/dashboard";
        }
      }
    } catch {
      setError("Ocurrió un error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="bg-slate-800/90 backdrop-blur-sm p-10 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-600">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">
            🏟️ D-Sports Login
          </h1>
          <p className="text-slate-300 mt-3 text-lg">
            Accede a tu cuenta de baseball
          </p>
        </div>

        {/* Selector de tipo de login */}
        <div className="mb-6">
          <div className="flex rounded-xl bg-slate-700/50 p-1">
            <button
              type="button"
              onClick={() => {
                setLoginType('normal');
                setError('');
              }}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                loginType === 'normal'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
              }`}
            >
              👤 Admin / Jugador
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginType('anotador');
                setError('');
              }}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                loginType === 'anotador'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
              }`}
            >
              📝 Anotador
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-4 rounded-xl backdrop-blur-sm">
              <div className="flex items-center">
                <span className="text-red-400 mr-3 text-lg">⚠️</span>
                {error}
              </div>
            </div>
          )}

          {loginType === 'normal' ? (
            <>
              <div>
                <label htmlFor="email" className="block text-base font-semibold text-white mb-3">
                  📧 Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tu@email.com"
                  className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-slate-600 transition-all duration-300"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-base font-semibold text-white mb-3">
                  🔒 Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Tu contraseña"
                  className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-slate-600 transition-all duration-300"
                />
              </div>
            </>
          ) : (
            <div>
                <label htmlFor="codigo" className="block text-base font-semibold text-white mb-3">
                  🔑 Código de Acceso
                </label>
                <input
                  id="codigo"
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  required
                  placeholder="Ejemplo: ANOTADOR1"
                  className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base font-mono tracking-wider text-center placeholder-slate-400 focus:outline-none focus:border-green-500 focus:bg-slate-600 transition-all duration-300"
                  maxLength={20}
                  style={{ letterSpacing: '0.1em' }}
                />
                <p className="mt-2 text-sm text-slate-400">
                  Ingresa el código que te proporcionó el administrador
                </p>
              </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center items-center py-5 px-6 border border-transparent rounded-2xl shadow-lg text-lg font-bold text-white transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed ${
              loginType === 'normal'
                ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 focus:ring-blue-500/50'
                : 'bg-gradient-to-r from-green-600 via-green-700 to-green-800 hover:from-green-700 hover:via-green-800 hover:to-green-900 focus:ring-green-500/50'
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                {loginType === 'normal' ? 'Iniciando sesión...' : 'Verificando código...'}
              </>
            ) : (
              <>
                <span className="mr-2">{loginType === 'normal' ? '🔑' : '📝'}</span>
                {loginType === 'normal' ? 'Iniciar Sesión' : 'Acceder como Anotador'}
              </>
            )}
          </button>
        </form>

        {loginType === 'normal' && (
          <div className="mt-8 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-600" />
              </div>
              <div className="relative flex justify-center text-base">
                <span className="px-4 bg-slate-800/90 text-slate-400">¿No tienes cuenta?</span>
              </div>
            </div>
            
            <div className="mt-6">
              <Link 
                href="/registro" 
                className="inline-flex items-center justify-center py-4 px-6 border-2 border-slate-600 rounded-xl shadow-sm text-base font-semibold text-slate-300 bg-slate-700/50 hover:bg-slate-700 hover:border-slate-500 hover:text-white transition-all duration-300 w-full"
              >
                <span className="mr-2">📝</span>
                Crear Nueva Cuenta
              </Link>
            </div>
          </div>
        )}

        {loginType === 'anotador' && (
          <div className="mt-8">
            <div className="bg-green-800/30 backdrop-blur-sm rounded-xl p-6 border border-green-600/50">
              <h3 className="text-white font-semibold mb-3 flex items-center">
                <span className="mr-2">💡</span>
                Información para Anotadores
              </h3>
              <ul className="text-green-100 text-sm space-y-2">
                <li>• Solo necesitas tu código único de anotador</li>
                <li>• El código se convierte automáticamente a mayúsculas</li>
                <li>• Si olvidas tu código, contacta al administrador</li>
                <li>• Podrás anotar partidos una vez dentro</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}