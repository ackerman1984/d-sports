'use client';

import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';

interface PasswordChangeModalProps {
  onPasswordChanged: () => void;
}

export default function PasswordChangeModal({ onPasswordChanged }: PasswordChangeModalProps) {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      minLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
      isValid: minLength && hasUpper && hasLower && hasNumber && hasSpecial
    };
  };

  const passwordValidation = validatePassword(formData.newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validaciones
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('Todos los campos son obligatorios');
      setLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Las contraseñas nuevas no coinciden');
      setLoading(false);
      return;
    }

    if (!passwordValidation.isValid) {
      setError('La nueva contraseña no cumple con los requisitos de seguridad');
      setLoading(false);
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('La nueva contraseña debe ser diferente a la actual');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/jugador/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cambiar la contraseña');
      }

      // Éxito - llamar callback
      onPasswordChanged();
      
    } catch (error) {
      console.error('Error changing password:', error);
      setError(error instanceof Error ? error.message : 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl p-8 w-full max-w-md border border-slate-600 shadow-2xl">
        <div className="text-center mb-6">
          <div className="bg-amber-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔐</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Cambio de Contraseña Requerido
          </h2>
          <p className="text-slate-300 text-sm">
            Hola <strong>{session?.user?.name}</strong>, tu cuenta usa una contraseña temporal.
            Por seguridad, debes cambiarla antes de continuar.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contraseña Actual */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Contraseña Temporal Actual *
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? "text" : "password"}
                required
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Ingresa la contraseña temporal"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPasswords.current ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Nueva Contraseña */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nueva Contraseña *
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? "text" : "password"}
                required
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Crea tu nueva contraseña"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPasswords.new ? '🙈' : '👁️'}
              </button>
            </div>
            
            {/* Requisitos de contraseña */}
            {formData.newPassword && (
              <div className="mt-2 space-y-1 text-xs">
                <div className={`flex items-center ${passwordValidation.minLength ? 'text-green-400' : 'text-red-400'}`}>
                  <span className="mr-2">{passwordValidation.minLength ? '✅' : '❌'}</span>
                  Al menos 8 caracteres
                </div>
                <div className={`flex items-center ${passwordValidation.hasUpper ? 'text-green-400' : 'text-red-400'}`}>
                  <span className="mr-2">{passwordValidation.hasUpper ? '✅' : '❌'}</span>
                  Una letra mayúscula
                </div>
                <div className={`flex items-center ${passwordValidation.hasLower ? 'text-green-400' : 'text-red-400'}`}>
                  <span className="mr-2">{passwordValidation.hasLower ? '✅' : '❌'}</span>
                  Una letra minúscula
                </div>
                <div className={`flex items-center ${passwordValidation.hasNumber ? 'text-green-400' : 'text-red-400'}`}>
                  <span className="mr-2">{passwordValidation.hasNumber ? '✅' : '❌'}</span>
                  Un número
                </div>
                <div className={`flex items-center ${passwordValidation.hasSpecial ? 'text-green-400' : 'text-red-400'}`}>
                  <span className="mr-2">{passwordValidation.hasSpecial ? '✅' : '❌'}</span>
                  Un carácter especial (!@#$%^&*)
                </div>
              </div>
            )}
          </div>

          {/* Confirmar Contraseña */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Confirmar Nueva Contraseña *
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? "text" : "password"}
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Confirma tu nueva contraseña"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPasswords.confirm ? '🙈' : '👁️'}
              </button>
            </div>
            {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
              <p className="text-red-400 text-xs mt-1">Las contraseñas no coinciden</p>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleLogout}
              className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-medium py-2 rounded-lg transition-colors"
            >
              🚪 Cerrar Sesión
            </button>
            <button
              type="submit"
              disabled={loading || !passwordValidation.isValid}
              className="flex-1 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-medium py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Cambiando...' : '🔑 Cambiar Contraseña'}
            </button>
          </div>
        </form>

        <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/50 text-blue-300 rounded-lg text-xs">
          <p className="font-medium mb-1">💡 ¿Por qué cambiar la contraseña?</p>
          <p>Las contraseñas temporales son creadas por el administrador para configuración inicial. Cambiarla garantiza que solo tú tengas acceso a tu cuenta.</p>
        </div>
      </div>
    </div>
  );
}