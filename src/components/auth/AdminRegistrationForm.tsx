'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

interface AdminRegistrationFormProps {
  onRoleChange?: (role: 'admin' | 'jugador') => void;
}

export default function AdminRegistrationForm({ onRoleChange }: AdminRegistrationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  const [adminData, setAdminData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nombre: '',
    telefono: '',
  });

  const [ligaData, setLigaData] = useState({
    nombre: '',
    equipos: ['', ''], // Mínimo 2 equipos
    temporadaNombre: '',
    fechaInicio: '',
    fechaFin: '',
  });

  const addEquipo = () => {
    setLigaData({
      ...ligaData,
      equipos: [...ligaData.equipos, '']
    });
  };

  const removeEquipo = (index: number) => {
    if (ligaData.equipos.length > 2) {
      const newEquipos = ligaData.equipos.filter((_, i) => i !== index);
      setLigaData({ ...ligaData, equipos: newEquipos });
    }
  };

  const updateEquipo = (index: number, value: string) => {
    const newEquipos = [...ligaData.equipos];
    newEquipos[index] = value;
    setLigaData({ ...ligaData, equipos: newEquipos });
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (adminData.password !== adminData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (adminData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setCurrentStep(2);
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validaciones de liga
    if (!ligaData.nombre) {
      setError('El nombre de la liga es obligatorio');
      setLoading(false);
      return;
    }

    if (ligaData.equipos.filter(equipo => equipo.trim()).length < 2) {
      setError('Debe haber al menos 2 equipos');
      setLoading(false);
      return;
    }

    if (new Date(ligaData.fechaInicio) >= new Date(ligaData.fechaFin)) {
      setError('La fecha de inicio debe ser anterior a la fecha de fin');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin: adminData,
          liga: ligaData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error en el registro');
        return;
      }

      // Auto-login después del registro exitoso
      const signInResult = await signIn('credentials', {
        email: adminData.email,
        password: adminData.password,
        redirect: false,
      });

      if (signInResult?.ok) {
        // Redirigir al dashboard de admin con el subdominio de la liga
        const response = await fetch('/api/auth/session');
        const sessionData = await response.json();
        
        if (sessionData?.user?.ligaSubdominio) {
          // Si tenemos el subdominio, redirigir a la liga específica
          window.location.href = `/${sessionData.user.ligaSubdominio}/admin/dashboard`;
        } else {
          // Fallback al dashboard admin general
          router.push('/admin/dashboard');
        }
      } else {
        router.push('/login?message=registered');
      }
    } catch (error) {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const generateCodigo = (nombre: string) => {
    return nombre
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 10);
  };

  const generateSubdomain = (nombre: string) => {
    return nombre
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <h2 className="mt-6 text-center text-4xl font-extrabold text-white">
          👑 Registro de Administrador
        </h2>
        <p className="mt-4 text-center text-lg text-slate-300">
          Crea tu liga de baseball
        </p>

        {/* Selector de Rol */}
        <div className="mt-8 mb-8">
          <label className="block text-lg font-semibold text-white mb-4 text-center">
            ¿Qué tipo de usuario eres?
          </label>
          <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
            <button
              type="button"
              className="py-6 px-6 border-2 rounded-xl text-base font-semibold transition-all duration-300 bg-gradient-to-r from-red-600 to-red-500 text-white border-red-500 shadow-lg shadow-red-500/25"
            >
              <div className="text-3xl mb-2">👑</div>
              <div>Admin</div>
            </button>
            <button
              type="button"
              onClick={() => onRoleChange?.('jugador')}
              className="py-6 px-6 border-2 rounded-xl text-base font-semibold transition-all duration-300 bg-slate-700/50 text-slate-300 border-slate-600 hover:bg-slate-700 hover:border-blue-400 hover:text-white"
            >
              <div className="text-3xl mb-2">⚾</div>
              <div>Jugador</div>
            </button>
          </div>
          <div className="mt-4 text-sm text-slate-400 grid grid-cols-2 gap-4 text-center max-w-lg mx-auto">
            <div>Crea y gestiona ligas completas</div>
            <div>Participa en equipos</div>
          </div>
        </div>
        
        {/* Progress indicator */}
        <div className="mt-8 flex justify-center">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              currentStep >= 1 ? 'bg-red-600 text-white' : 'bg-slate-600 text-slate-400'
            }`}>
              1
            </div>
            <div className={`w-16 h-1 ${currentStep >= 2 ? 'bg-red-600' : 'bg-slate-600'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              currentStep >= 2 ? 'bg-red-600 text-white' : 'bg-slate-600 text-slate-400'
            }`}>
              2
            </div>
          </div>
        </div>
        <div className="mt-2 flex justify-center">
          <div className="flex space-x-16 text-sm text-slate-400">
            <span>Datos Personales</span>
            <span>Información de Liga</span>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-slate-800/90 backdrop-blur-sm py-10 px-8 shadow-2xl rounded-2xl border border-slate-600">
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 text-red-300 rounded-xl backdrop-blur-sm">
              <div className="flex items-center">
                <span className="text-red-400 mr-2">⚠️</span>
                {error}
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-8">
              <h3 className="text-xl font-semibold text-white mb-6">👤 Información Personal</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-base font-semibold text-white mb-3">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={adminData.nombre}
                    onChange={(e) => setAdminData({ ...adminData, nombre: e.target.value })}
                    placeholder="Tu nombre completo"
                    className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-slate-600 transition-all duration-300"
                  />
                </div>

                <div>
                  <label className="block text-base font-semibold text-white mb-3">
                    📱 Teléfono
                  </label>
                  <input
                    type="tel"
                    value={adminData.telefono}
                    onChange={(e) => setAdminData({ ...adminData, telefono: e.target.value })}
                    placeholder="+1 234 567 890"
                    className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-slate-600 transition-all duration-300"
                  />
                </div>

                <div>
                  <label className="block text-base font-semibold text-white mb-3">
                    📧 Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={adminData.email}
                    onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                    placeholder="tu@email.com"
                    className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-slate-600 transition-all duration-300"
                  />
                </div>

                <div>
                  <label className="block text-base font-semibold text-white mb-3">
                    🔒 Contraseña *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={adminData.password}
                    onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-slate-600 transition-all duration-300"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-base font-semibold text-white mb-3">
                    🔒 Confirmar Contraseña *
                  </label>
                  <input
                    type="password"
                    required
                    value={adminData.confirmPassword}
                    onChange={(e) => setAdminData({ ...adminData, confirmPassword: e.target.value })}
                    placeholder="Repite tu contraseña"
                    className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-slate-600 transition-all duration-300"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex justify-center items-center py-5 px-6 border border-transparent rounded-2xl shadow-lg text-lg font-bold text-white bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-700 hover:via-red-800 hover:to-red-900 focus:outline-none focus:ring-4 focus:ring-red-500/50 transition-all duration-300 transform hover:scale-105"
              >
                <span className="mr-2">👑</span>
                Continuar
              </button>
            </form>
          )}

          {currentStep === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white">🏆 Configuración de Liga</h3>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-red-400 hover:text-red-300 text-base font-medium flex items-center transition-colors duration-300"
                >
                  ← Volver
                </button>
              </div>

              <div>
                <label className="block text-base font-semibold text-white mb-3">
                  🏟️ Nombre de la Liga *
                </label>
                <input
                  type="text"
                  required
                  value={ligaData.nombre}
                  onChange={(e) => setLigaData({ ...ligaData, nombre: e.target.value })}
                  placeholder="Liga Regional de Baseball"
                  className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-slate-600 transition-all duration-300"
                />
              </div>

              {/* Equipos */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-base font-semibold text-white">
                    ⚾ Equipos * (mínimo 2)
                  </label>
                  <button
                    type="button"
                    onClick={addEquipo}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-300"
                  >
                    + Agregar Equipo
                  </button>
                </div>
                
                <div className="space-y-3">
                  {ligaData.equipos.map((equipo, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <input
                        type="text"
                        required
                        value={equipo}
                        onChange={(e) => updateEquipo(index, e.target.value)}
                        placeholder={`Equipo ${index + 1}`}
                        className="flex-1 bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-3 text-white text-base placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-slate-600 transition-all duration-300"
                      />
                      {ligaData.equipos.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeEquipo(index)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-3 rounded-xl transition-colors duration-300"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Temporada */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">📅 Primera Temporada</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-base font-semibold text-white mb-3">
                      Nombre de Temporada *
                    </label>
                    <input
                      type="text"
                      required
                      value={ligaData.temporadaNombre}
                      onChange={(e) => setLigaData({ ...ligaData, temporadaNombre: e.target.value })}
                      placeholder="Temporada 2024"
                      className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-slate-600 transition-all duration-300"
                    />
                  </div>

                  <div>
                    <label className="block text-base font-semibold text-white mb-3">
                      Fecha de Inicio *
                    </label>
                    <input
                      type="date"
                      required
                      value={ligaData.fechaInicio}
                      onChange={(e) => setLigaData({ ...ligaData, fechaInicio: e.target.value })}
                      className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base focus:outline-none focus:border-red-500 focus:bg-slate-600 transition-all duration-300"
                    />
                  </div>

                  <div>
                    <label className="block text-base font-semibold text-white mb-3">
                      Fecha de Fin *
                    </label>
                    <input
                      type="date"
                      required
                      value={ligaData.fechaFin}
                      onChange={(e) => setLigaData({ ...ligaData, fechaFin: e.target.value })}
                      className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base focus:outline-none focus:border-red-500 focus:bg-slate-600 transition-all duration-300"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-5 px-6 border border-transparent rounded-2xl shadow-lg text-lg font-bold text-white bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-700 hover:via-red-800 hover:to-red-900 focus:outline-none focus:ring-4 focus:ring-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    Creando Liga...
                  </>
                ) : (
                  <>
                    <span className="mr-2">👑</span>
                    Crear Liga y Cuenta de Administrador
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-600" />
              </div>
              <div className="relative flex justify-center text-base">
                <span className="px-4 bg-slate-800/90 text-slate-400">¿Ya tienes cuenta?</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => router.push('/login')}
                className="w-full flex justify-center items-center py-4 px-6 border-2 border-slate-600 rounded-xl shadow-sm text-base font-semibold text-slate-300 bg-slate-700/50 hover:bg-slate-700 hover:border-slate-500 hover:text-white transition-all duration-300"
              >
                <span className="mr-2">🔑</span>
                Iniciar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}