'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import PhotoUpload from '@/components/ui/PhotoUpload';

interface Equipo {
  id: string;
  nombre: string;
}

interface Liga {
  id: string;
  nombre: string;
  codigo: string;
  subdominio: string;
}

interface JugadorRegistrationFormProps {
  ligas: Liga[];
}

export default function JugadorRegistrationForm({ ligas }: JugadorRegistrationFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nombre: '',
    telefono: '',
    foto: null as string | null,
    ligaId: '',
    equipoId: '',
    numeroCasaca: '',
  });
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validatingJersey, setValidatingJersey] = useState(false);
  const [jerseyError, setJerseyError] = useState('');

  useEffect(() => {
    if (formData.ligaId) {
      fetchEquipos(formData.ligaId);
    }
  }, [formData.ligaId]);

  useEffect(() => {
    if (formData.equipoId && formData.numeroCasaca) {
      const timer = setTimeout(() => {
        validateJerseyNumber(formData.equipoId, formData.numeroCasaca);
      }, 500); // Debounce de 500ms

      return () => clearTimeout(timer);
    } else {
      setJerseyError('');
    }
  }, [formData.equipoId, formData.numeroCasaca]);

  const fetchEquipos = async (ligaId: string) => {
    try {
      console.log('Fetching equipos for liga:', ligaId);
      const response = await fetch(`/api/public/equipos?ligaId=${ligaId}`);
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Equipos data received:', data);
        setEquipos(data.equipos || []);
      } else {
        const errorData = await response.json();
        console.error('Error response:', response.status, response.statusText, errorData);
        setEquipos([]);
      }
    } catch (error) {
      console.error('Error fetching equipos:', error);
      setEquipos([]);
    }
  };

  const validateJerseyNumber = async (equipoId: string, numeroCasaca: string) => {
    if (!equipoId || !numeroCasaca || parseInt(numeroCasaca) < 1) {
      setJerseyError('');
      return;
    }

    setValidatingJersey(true);
    setJerseyError('');

    try {
      const response = await fetch(`/api/public/validate-jersey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          equipoId,
          numeroCasaca: parseInt(numeroCasaca)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setJerseyError(data.error || 'Error validating jersey number');
      } else if (!data.available) {
        setJerseyError(`El número ${numeroCasaca} ya está ocupado por ${data.playerName}`);
      }
    } catch (error) {
      console.error('Error validating jersey:', error);
      setJerseyError('Error validando el número de playera');
    } finally {
      setValidatingJersey(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (!formData.numeroCasaca || parseInt(formData.numeroCasaca) < 1) {
      setError('Número de camiseta debe ser mayor a 0');
      setLoading(false);
      return;
    }

    if (jerseyError) {
      setError('Por favor corrige el error del número de camiseta antes de continuar');
      setLoading(false);
      return;
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
          role: 'jugador',
          ligaId: formData.ligaId,
          equipoId: formData.equipoId,
          numeroCasaca: parseInt(formData.numeroCasaca),
          fotoUrl: formData.foto,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error en el registro');
        return;
      }

      // Auto-login after successful registration
      const signInResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (signInResult?.ok) {
        router.push('/dashboard');
      } else {
        router.push('/login?message=registered');
      }
    } catch (error) {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 border border-gray-300 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Registro de Jugador</h2>
      
      {/* Foto de perfil */}
      <div className="flex justify-center mb-6">
        <div className="text-center">
          <PhotoUpload
            onPhotoChange={(photo) => setFormData({ ...formData, foto: photo })}
            currentPhoto={formData.foto}
            size="md"
          />
          <p className="text-sm text-gray-500 mt-2">
            Foto de perfil (opcional)
          </p>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Liga</label>
          <select
            required
            value={formData.ligaId}
            onChange={(e) => setFormData({ ...formData, ligaId: e.target.value, equipoId: '' })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecciona una liga</option>
            {ligas.map((liga) => (
              <option key={liga.id} value={liga.id}>
                {liga.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Equipo</label>
          <select
            required
            value={formData.equipoId}
            onChange={(e) => setFormData({ ...formData, equipoId: e.target.value })}
            disabled={!formData.ligaId || equipos.length === 0}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">Selecciona un equipo</option>
            {equipos.map((equipo) => (
              <option key={equipo.id} value={equipo.id}>
                {equipo.nombre}
              </option>
            ))}
          </select>
          {formData.ligaId && equipos.length === 0 && (
            <p className="text-sm text-gray-500 mt-1">
              No hay equipos disponibles. Contacta al administrador.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
          <input
            type="text"
            required
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Número de Camiseta</label>
          <div className="relative">
            <input
              type="number"
              required
              min="1"
              max="99"
              value={formData.numeroCasaca}
              onChange={(e) => setFormData({ ...formData, numeroCasaca: e.target.value })}
              className={`mt-1 block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                jerseyError 
                  ? 'border-red-400 focus:ring-red-500 bg-red-50' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="Ej: 10"
            />
            {validatingJersey && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-1">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
          
          {/* Mensajes de validación */}
          {jerseyError && (
            <p className="text-sm text-red-600 mt-1 flex items-center">
              <span className="mr-1">❌</span>
              {jerseyError}
            </p>
          )}
          
          {!jerseyError && formData.numeroCasaca && formData.equipoId && !validatingJersey && (
            <p className="text-sm text-green-600 mt-1 flex items-center">
              <span className="mr-1">✅</span>
              El número {formData.numeroCasaca} está disponible
            </p>
          )}
          
          {!formData.equipoId && formData.numeroCasaca && (
            <p className="text-sm text-gray-500 mt-1">
              Selecciona primero un equipo para validar el número
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Teléfono</label>
          <input
            type="tel"
            value={formData.telefono}
            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Contraseña</label>
          <input
            type="password"
            required
            minLength={6}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Confirmar Contraseña</label>
          <input
            type="password"
            required
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>


        <button
          type="submit"
          disabled={loading || jerseyError !== '' || validatingJersey}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Registrando...' : 
           validatingJersey ? 'Validando número...' : 
           'Registrar Jugador'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          ¿Ya tienes cuenta?{' '}
          <button
            onClick={() => router.push('/login')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Inicia sesión
          </button>
        </p>
      </div>
    </div>
  );
}