'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import AdminRegistrationForm from '@/components/auth/AdminRegistrationForm';
import PhotoUpload from '@/components/ui/PhotoUpload';

interface Liga {
  id: string;
  nombre: string;
  codigo: string;
  subdominio: string;
}

interface Equipo {
  id: string;
  nombre: string;
}

export default function RegistroPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'jugador'>('jugador');
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nombre: '',
    telefono: '',
    ligaId: '',
    equipoId: '',
    numeroCasaca: '',
    foto: null as string | null,
  });

  useEffect(() => {
    fetchLigas();
    // Debug: También obtener info detallada de todas las ligas
    debugAllLigas();
  }, []);

  const debugAllLigas = async () => {
    try {
      console.log('DEBUG: Fetching all ligas info...');
      const response = await fetch('/api/admin/ligas/debug');
      if (response.ok) {
        const data = await response.json();
        console.log('DEBUG: All ligas info:', data);
        console.log('📊 RESUMEN:', data.resumen);
        if (data.resumen.disponiblesParaRegistro === 0) {
          console.log('⚠️ NO HAY LIGAS DISPONIBLES - Necesitas activar ligas y equipos');
          console.log('💡 Ejecuta: activateAllLigasYEquipos() en la consola');
        }
      }
    } catch (error) {
      console.error('DEBUG: Error fetching all ligas info:', error);
    }
  };

  // Función global para activar todas las ligas (para usar en consola)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).activateAllLigasYEquipos = async () => {
        try {
          console.log('🔧 Activating all ligas and equipos...');
          const response = await fetch('/api/admin/activate-all', { method: 'POST' });
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Resultado:', data);
            alert('✅ Todas las ligas y equipos han sido activados. Recargando página...');
            window.location.reload();
          } else {
            console.error('❌ Error activating:', response.status);
          }
        } catch (error) {
          console.error('❌ Error:', error);
        }
      };
    }
  }, []);

  useEffect(() => {
    console.log('🔄 useEffect triggered - ligaId changed to:', formData.ligaId);
    if (formData.ligaId) {
      console.log('   ✅ Liga selected, fetching equipos...');
      fetchEquipos(formData.ligaId);
    } else {
      console.log('   ❌ No liga selected, clearing equipos...');
      setEquipos([]);
    }
  }, [formData.ligaId]);

  const fetchLigas = async () => {
    try {
      console.log('Fetching ligas from frontend...');
      const response = await fetch('/api/ligas');
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Ligas received:', data.ligas);
        setLigas(data.ligas || []);
      } else {
        console.error('Response not OK:', response.status, response.statusText);
        const errorData = await response.json();
        console.error('Error data:', errorData);
      }
    } catch (error) {
      console.error('Error fetching ligas:', error);
    }
  };

  const fetchEquipos = async (ligaId: string) => {
    try {
      console.log('🔍 FETCH EQUIPOS - START');
      console.log('   Liga ID:', ligaId);
      console.log('   URL:', `/api/public/equipos?ligaId=${ligaId}`);
      
      // Forzar bypass del cache del navegador
      const timestamp = Date.now();
      const url = `/api/public/equipos?ligaId=${ligaId}&_t=${timestamp}`;
      console.log('   URL with timestamp:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      console.log('   Response status:', response.status);
      console.log('   Response ok:', response.ok);
      console.log('   Response headers:', Object.fromEntries(response.headers.entries()));
      console.log('   Response URL:', response.url);
      
      if (response.ok) {
        const data = await response.json();
        console.log('   ✅ SUCCESS - Data received:', data);
        console.log('   ✅ SUCCESS - Equipos count:', data.equipos?.length || 0);
        console.log('   ✅ SUCCESS - Equipos list:', data.equipos);
        
        const equiposToSet = data.equipos || [];
        console.log('   🔄 Setting equipos state to:', equiposToSet);
        setEquipos(equiposToSet);
        
        // Verificar que el estado se actualizó después
        setTimeout(() => {
          console.log('   🔍 Estado equipos después de set:', equipos.length);
        }, 100);
        
      } else {
        const errorData = await response.json();
        console.error('   ❌ ERROR Response:', response.status, response.statusText, errorData);
        setEquipos([]);
      }
    } catch (error) {
      console.error('   ❌ CATCH Error fetching equipos:', error);
      console.error('   ❌ CATCH Error stack:', (error as any)?.stack);
      setEquipos([]);
    }
    console.log('🔍 FETCH EQUIPOS - END');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validaciones
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    if (selectedRole === 'jugador') {
      if (!formData.equipoId) {
        setError('Los jugadores deben seleccionar un equipo');
        setLoading(false);
        return;
      }
      if (!formData.numeroCasaca || parseInt(formData.numeroCasaca) < 1) {
        setError('Los jugadores deben tener un número de camiseta válido');
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          nombre: formData.nombre,
          telefono: formData.telefono,
          role: selectedRole,
          ligaId: formData.ligaId,
          equipoId: selectedRole === 'jugador' ? formData.equipoId : undefined,
          numeroCasaca: selectedRole === 'jugador' ? parseInt(formData.numeroCasaca) : undefined,
          fotoUrl: formData.foto,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error en el registro');
        return;
      }

      // Auto-login después del registro exitoso
      const signInResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (signInResult?.ok) {
        // Solo redirigir a jugador dashboard ya que anotadores no se registran aquí
        router.push('/jugador/dashboard');
      } else {
        router.push('/login?message=registered');
      }
    } catch (error) {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      nombre: '',
      telefono: '',
      ligaId: '',
      equipoId: '',
      numeroCasaca: '',
      foto: null,
    });
    setError('');
  };

  // Si es admin, redirigir al formulario específico
  if (showAdminForm) {
    return <AdminRegistrationForm onRoleChange={(role) => {
      if (role === 'jugador') {
        setShowAdminForm(false);
        setSelectedRole('jugador');
        resetForm();
      }
    }} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <h2 className="mt-6 text-center text-4xl font-extrabold text-white">
          🏟️ Registro D-Sports
        </h2>
        <p className="mt-4 text-center text-lg text-slate-300">
          Únete a tu liga de baseball favorita
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-slate-800/90 backdrop-blur-sm py-10 px-8 shadow-2xl rounded-2xl border border-slate-600">
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 text-red-300 rounded-xl backdrop-blur-sm">
              <div className="flex items-center">
                <span className="text-red-400 mr-2">⚠️</span>
                {error}
              </div>
            </div>
          )}

          {/* Selector de Rol */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-white mb-4">
              ¿Qué tipo de usuario eres?
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setShowAdminForm(true);
                  resetForm();
                }}
                className={`py-6 px-6 border-2 rounded-xl text-base font-semibold transition-all duration-300 ${
                  showAdminForm
                    ? 'bg-gradient-to-r from-red-600 to-red-500 text-white border-red-500 shadow-lg shadow-red-500/25'
                    : 'bg-slate-700/50 text-slate-300 border-slate-600 hover:bg-slate-700 hover:border-red-400 hover:text-white'
                }`}
              >
                <div className="text-3xl mb-2">👑</div>
                <div>Admin</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('jugador');
                  resetForm();
                }}
                className={`py-6 px-6 border-2 rounded-xl text-base font-semibold transition-all duration-300 ${
                  selectedRole === 'jugador'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/25'
                    : 'bg-slate-700/50 text-slate-300 border-slate-600 hover:bg-slate-700 hover:border-blue-400 hover:text-white'
                }`}
              >
                <div className="text-3xl mb-2">⚾</div>
                <div>Jugador</div>
              </button>
            </div>
            <div className="mt-4 text-sm text-slate-400 grid grid-cols-2 gap-4 text-center">
              <div>Crea y gestiona ligas completas</div>
              <div>Participa en equipos</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Liga */}
            <div>
              <label className="block text-base font-semibold text-white mb-3">
                🏆 Selecciona tu Liga
              </label>
              <select
                required
                value={formData.ligaId}
                onChange={(e) => {
                  setFormData({ ...formData, ligaId: e.target.value, equipoId: '' });
                }}
                className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base focus:outline-none focus:border-blue-500 focus:bg-slate-600 transition-all duration-300"
                disabled={ligas.length === 0}
              >
                <option value="" className="bg-slate-700 text-white">
                  {ligas.length === 0 ? 'No hay ligas disponibles' : 'Selecciona una liga'}
                </option>
                {ligas.map((liga) => (
                  <option key={liga.id} value={liga.id} className="bg-slate-700 text-white">
                    {liga.nombre}
                  </option>
                ))}
              </select>
              {ligas.length === 0 && (
                <div className="mt-4 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-xl backdrop-blur-sm">
                  <div className="flex items-start">
                    <div className="text-yellow-400 mr-3 text-lg">⚠️</div>
                    <div className="text-sm text-yellow-300">
                      <p className="font-semibold mb-2">No hay ligas disponibles</p>
                      <p className="mb-3">
                        Necesitas que un administrador cree una liga primero.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowAdminForm(true)}
                        className="inline-flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors duration-300"
                      >
                        👑 Crear Liga
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Equipo (solo para jugadores) */}
            {selectedRole === 'jugador' && (
              <div>
                <label className="block text-base font-semibold text-white mb-3">
                  ⚾ Selecciona tu Equipo
                </label>
                
                
                <select
                  required
                  value={formData.equipoId}
                  onChange={(e) => setFormData({ ...formData, equipoId: e.target.value })}
                  disabled={!formData.ligaId || equipos.length === 0}
                  className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base focus:outline-none focus:border-blue-500 focus:bg-slate-600 transition-all duration-300 disabled:bg-slate-800 disabled:border-slate-700 disabled:text-slate-500"
                >
                  <option value="" className="bg-slate-700 text-white">
                    Selecciona un equipo ({equipos.length} disponibles)
                  </option>
                  {equipos.map((equipo) => (
                    <option key={equipo.id} value={equipo.id} className="bg-slate-700 text-white">
                      {equipo.nombre}
                    </option>
                  ))}
                </select>
                {formData.ligaId && equipos.length === 0 && (
                  <p className="text-sm text-slate-400 mt-2">
                    No hay equipos disponibles. Contacta al administrador.
                  </p>
                )}
              </div>
            )}

            {/* Información Personal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-base font-semibold text-white mb-3">
                  👤 Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Tu nombre completo"
                  className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-slate-600 transition-all duration-300"
                />
              </div>

              {selectedRole === 'jugador' && (
                <div>
                  <label className="block text-base font-semibold text-white mb-3">
                    🔢 Número de Camiseta
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="99"
                    value={formData.numeroCasaca}
                    onChange={(e) => setFormData({ ...formData, numeroCasaca: e.target.value })}
                    placeholder="1-99"
                    className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-slate-600 transition-all duration-300"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-base font-semibold text-white mb-3">
                  📧 Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="tu@email.com"
                  className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-slate-600 transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-base font-semibold text-white mb-3">
                  📱 Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="+1 234 567 890"
                  className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-slate-600 transition-all duration-300"
                />
              </div>
            </div>

            {/* Foto de perfil - Solo para jugadores */}
            {selectedRole === 'jugador' && (
              <div className="bg-slate-700/30 rounded-xl p-6 border border-slate-600">
                <PhotoUpload
                  onPhotoChange={(photoUrl) => setFormData({ ...formData, foto: photoUrl })}
                  currentPhoto={formData.foto || undefined}
                  size="lg"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-base font-semibold text-white mb-3">
                  🔒 Contraseña
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-slate-600 transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-base font-semibold text-white mb-3">
                  🔒 Confirmar Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Repite tu contraseña"
                  className="block w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-slate-600 transition-all duration-300"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || ligas.length === 0}
              className="w-full flex justify-center items-center py-5 px-6 border border-transparent rounded-2xl shadow-lg text-lg font-bold text-white bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  Registrando...
                </>
              ) : (
                <>
                  <span className="mr-2">⚾</span>
                  Registrar Jugador
                </>
              )}
            </button>
          </form>

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