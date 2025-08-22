'use client';

import { useState } from 'react';

interface Liga {
  id: string;
  nombre: string;
  codigo: string;
  subdominio: string;
  authorized: boolean;
  authorization_code: string;
  authorized_at: string;
  authorized_by: string;
  suspended_at: string;
  suspension_reason: string;
  created_at: string;
  admin_email: string;
  admin_name: string;
}

interface AccessLog {
  id: string;
  liga_id: string;
  admin_email: string;
  action: string;
  performed_by: string;
  reason: string;
  created_at: string;
  liga_name: string;
}

export default function SuperAdminTempPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados para autenticación
  const [authForm, setAuthForm] = useState({
    email: '',
    masterCode: '',
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/super-admin/auth-temp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });

      if (response.ok) {
        setAuthenticated(true);
        setSuccess('Acceso autorizado como Super Admin (Modo Temporal)');
        fetchData();
      } else {
        const data = await response.json();
        setError(data.error || 'Credenciales inválidas');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [ligasRes, logsRes] = await Promise.all([
        fetch('/api/super-admin/ligas-temp'),
        fetch('/api/super-admin/logs-temp'),
      ]);

      if (ligasRes.ok) {
        const ligasData = await ligasRes.json();
        setLigas(ligasData.ligas || []);
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs || []);
      }
    } catch (error) {
      setError('Error cargando datos');
    }
  };

  const getStatusBadge = (liga: Liga) => {
    if (liga.suspended_at) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Suspendida</span>;
    }
    if (liga.authorized) {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Autorizada</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Pendiente</span>;
  };

  const getActionBadge = (action: string) => {
    const colors = {
      authorized: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      reactivated: 'bg-blue-100 text-blue-800',
      modified: 'bg-gray-100 text-gray-800',
    };
    return colors[action as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🛡️ Super Admin (Temporal)</h1>
            <p className="text-gray-600">Control maestro de la aplicación</p>
          </div>

          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            <strong>Modo Temporal:</strong> Para funcionalidad completa, aplica la migración en Supabase
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {success}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email de Super Admin
              </label>
              <input
                type="email"
                required
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="creator@baseball-saas.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Código Maestro
              </label>
              <input
                type="password"
                required
                value={authForm.masterCode}
                onChange={(e) => setAuthForm({ ...authForm, masterCode: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="MASTER-2024-BASEBALL"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Acceder al Panel (Temporal)'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="text-sm font-medium text-blue-800 mb-2">🔧 Credenciales de Prueba</h4>
            <p className="text-xs text-blue-700 mb-2">
              Email: creator@baseball-saas.com<br/>
              Código: MASTER-2024-BASEBALL
            </p>
            <p className="text-xs text-blue-700">
              O: admin@test.com / TEST123
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-red-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold">🛡️ Panel de Super Admin (Temporal)</h1>
              <p className="text-red-100">Control maestro - {authForm.email}</p>
            </div>
            <button
              onClick={() => setAuthenticated(false)}
              className="bg-red-700 text-white px-4 py-2 rounded-md hover:bg-red-800"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h4 className="text-lg font-medium text-yellow-800 mb-2">⚠️ Modo Temporal Activo</h4>
          <p className="text-sm text-yellow-700 mb-2">
            Estás usando el panel temporal. Para funcionalidad completa:
          </p>
          <ol className="text-sm text-yellow-700 list-decimal list-inside space-y-1">
            <li>Ve a tu dashboard de Supabase</li>
            <li>Abre el SQL Editor</li>
            <li>Copia y pega el contenido de: <code>src/lib/supabase/migrations/004_super_admin_control.sql</code></li>
            <li>Ejecuta la migración</li>
            <li>Usa <code>/super-admin</code> (sin -temp) para el panel completo</li>
          </ol>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Resumen', icon: '📊' },
              { id: 'ligas', name: 'Gestión de Ligas', icon: '🏆' },
              { id: 'logs', name: 'Registro de Acciones', icon: '📋' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon} {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <span className="text-2xl">🏆</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Total Ligas</h3>
                  <p className="text-2xl font-bold text-blue-600">{ligas.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <span className="text-2xl">✅</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Autorizadas</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {ligas.filter(l => l.authorized && !l.suspended_at).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <span className="text-2xl">⏳</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Pendientes</h3>
                  <p className="text-2xl font-bold text-yellow-600">
                    {ligas.filter(l => !l.authorized).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 bg-red-100 rounded-lg">
                  <span className="text-2xl">🚫</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Suspendidas</h3>
                  <p className="text-2xl font-bold text-red-600">
                    {ligas.filter(l => l.suspended_at).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gestión de Ligas */}
        {activeTab === 'ligas' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Gestión de Ligas (Modo Temporal)</h2>
              <p className="text-sm text-gray-600">Vista de solo lectura - aplica la migración para gestión completa</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Liga</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Administrador</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Creación</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ligas.map((liga) => (
                    <tr key={liga.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{liga.nombre}</div>
                          <div className="text-sm text-gray-500">{liga.codigo}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{liga.admin_name}</div>
                          <div className="text-sm text-gray-500">{liga.admin_email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(liga)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(liga.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Logs */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Registro de Acciones (Demo)</h2>
              <p className="text-sm text-gray-600">Datos de ejemplo - aplica la migración para logs reales</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Liga</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Realizada por</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Razón</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {log.liga_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.admin_email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionBadge(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.performed_by}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.reason || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}