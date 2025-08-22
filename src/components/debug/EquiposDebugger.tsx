'use client';

import { useState, useEffect } from 'react';

interface Liga {
  id: string;
  nombre: string;
  codigo: string;
  subdominio: string;
}

interface Equipo {
  id: string;
  nombre: string;
  color: string;
  activo: boolean;
}

export default function EquiposDebugger() {
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [selectedLigaId, setSelectedLigaId] = useState('');
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState<any[]>([]);

  useEffect(() => {
    fetchLigas();
  }, []);

  useEffect(() => {
    if (selectedLigaId) {
      fetchEquipos(selectedLigaId);
    } else {
      setEquipos([]);
    }
  }, [selectedLigaId]);

  const fetchLigas = async () => {
    try {
      const response = await fetch('/api/ligas');
      if (response.ok) {
        const data = await response.json();
        setLigas(data.ligas || []);
        addDebugInfo('Ligas cargadas', { count: data.ligas?.length, ligas: data.ligas });
      }
    } catch (error) {
      addDebugInfo('Error cargando ligas', error);
    }
  };

  const fetchEquipos = async (ligaId: string) => {
    setLoading(true);
    setError('');
    
    try {
      addDebugInfo('Iniciando fetch equipos', { ligaId });
      
      // Forzar bypass del cache del navegador
      const timestamp = Date.now();
      const url = `/api/public/equipos?ligaId=${ligaId}&_t=${timestamp}`;
      
      addDebugInfo('URL con timestamp', { url });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      addDebugInfo('Response object', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        type: response.type,
        url: response.url
      });
      
      const data = await response.json();
      
      addDebugInfo('Respuesta JSON parseada', { 
        status: response.status, 
        ok: response.ok, 
        data,
        equiposCount: data.equipos?.length || 0,
        rawResponse: JSON.stringify(data)
      });
      
      if (response.ok) {
        setEquipos(data.equipos || []);
        addDebugInfo('Estado actualizado', { nuevosEquipos: data.equipos?.length || 0 });
      } else {
        setError(`Error ${response.status}: ${data.error || 'Error desconocido'}`);
        setEquipos([]);
      }
    } catch (error) {
      addDebugInfo('Error en fetch', { 
        message: error instanceof Error ? error.message : 'Error desconocido', 
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof Error ? error.constructor.name : typeof error
      });
      setError('Error de conexión');
      setEquipos([]);
    } finally {
      setLoading(false);
    }
  };

  const addDebugInfo = (action: string, data: any) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev.slice(-9), { timestamp, action, data }]);
  };

  const clearDebug = () => {
    setDebugInfo([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-800 rounded-lg">
      <h2 className="text-2xl font-bold text-white mb-6">🐛 Debugger de Equipos</h2>
      
      {/* Selector de Liga */}
      <div className="mb-6">
        <label className="block text-white font-semibold mb-2">
          Liga:
        </label>
        <select
          value={selectedLigaId}
          onChange={(e) => setSelectedLigaId(e.target.value)}
          className="w-full p-3 bg-slate-700 text-white border border-slate-600 rounded"
        >
          <option value="">Selecciona una liga</option>
          {ligas.map((liga) => (
            <option key={liga.id} value={liga.id}>
              {liga.nombre} ({liga.codigo})
            </option>
          ))}
        </select>
      </div>

      {/* Estado del Loading */}
      {loading && (
        <div className="mb-4 p-3 bg-blue-600 text-white rounded">
          ⏳ Cargando equipos...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-600 text-white rounded">
          ❌ {error}
        </div>
      )}

      {/* Equipos Encontrados */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">
          ⚾ Equipos Encontrados: {equipos.length}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {equipos.map((equipo) => (
            <div
              key={equipo.id}
              className="p-3 bg-slate-700 rounded border-l-4"
              style={{ borderLeftColor: equipo.color }}
            >
              <div className="text-white font-medium">{equipo.nombre}</div>
              <div className="text-sm text-slate-300">
                ID: {equipo.id.slice(0, 8)}...
              </div>
              <div className="text-sm text-slate-300">
                Color: {equipo.color} | Activo: {equipo.activo ? '✅' : '❌'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Debug Log */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-white">📝 Debug Log</h3>
          <button
            onClick={clearDebug}
            className="px-3 py-1 bg-slate-600 text-white rounded text-sm hover:bg-slate-500"
          >
            Limpiar
          </button>
        </div>
        <div className="bg-slate-900 p-4 rounded max-h-80 overflow-y-auto">
          {debugInfo.length === 0 ? (
            <div className="text-slate-400">Sin logs de debug</div>
          ) : (
            debugInfo.map((log, index) => (
              <div key={index} className="mb-2 text-sm">
                <div className="text-slate-300">
                  <span className="text-slate-400">{log.timestamp}</span> - 
                  <span className="text-white font-medium ml-2">{log.action}</span>
                </div>
                <pre className="text-slate-300 text-xs ml-4 mt-1 overflow-x-auto">
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}