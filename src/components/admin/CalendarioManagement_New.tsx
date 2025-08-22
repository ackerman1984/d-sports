'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Temporada {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  playoffs_inicio?: string;
  max_juegos_por_sabado: number;
  vueltas_programadas: number;
  estado: 'configuracion' | 'generado' | 'activa' | 'cerrada' | 'playoffs';
  auto_generar: boolean;
  fecha_generacion?: string;
}

interface Campo {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  orden: number;
}

interface Horario {
  id: string;
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  activo_por_defecto: boolean;
  orden: number;
  descripcion?: string;
}

interface Equipo {
  id: string;
  nombre: string;
  activo: boolean;
}

export default function CalendarioManagement() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'configuracion' | 'calendario' | 'temporadas' | 'campos' | 'horarios' | 'generar'>('configuracion');
  
  // Estados
  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [campos, setCampos] = useState<Campo[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [jornadas, setJornadas] = useState<any[]>([]);
  const [partidos, setPartidos] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados para formularios
  const [showTemporadaForm, setShowTemporadaForm] = useState(false);
  const [showCampoForm, setShowCampoForm] = useState(false);
  const [showHorarioForm, setShowHorarioForm] = useState(false);
  
  const [editingTemporada, setEditingTemporada] = useState<Temporada | null>(null);
  const [editingCampo, setEditingCampo] = useState<Campo | null>(null);
  const [editingHorario, setEditingHorario] = useState<Horario | null>(null);

  // Formulario temporada
  const [temporadaForm, setTemporadaForm] = useState({
    nombre: '',
    fecha_inicio: '',
    fecha_fin: '',
    playoffs_inicio: '',
    max_juegos_por_sabado: 5,
    vueltas_programadas: 2,
    auto_generar: true
  });

  // Formulario campo
  const [campoForm, setCampoForm] = useState({
    nombre: '',
    descripcion: '',
    activo: true,
    orden: 1
  });

  // Formulario horario
  const [horarioForm, setHorarioForm] = useState({
    nombre: '',
    hora_inicio: '',
    hora_fin: '',
    activo_por_defecto: true,
    orden: 1,
    descripcion: ''
  });

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchAllData();
    }
  }, [session]);

  // Auto-cargar calendario cuando hay temporada generada
  useEffect(() => {
    const temporadaGenerada = temporadas.find(t => t.estado === 'generado');
    if (temporadaGenerada && activeTab === 'calendario') {
      fetchCalendario(temporadaGenerada.id);
    }
  }, [temporadas, activeTab]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchTemporadas(),
        fetchCampos(),
        fetchHorarios(),
        fetchEquipos()
      ]);
    } catch (error) {
      setError('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemporadas = async () => {
    const response = await fetch('/api/admin/temporadas');
    if (response.ok) {
      const data = await response.json();
      setTemporadas(data.temporadas || []);
    }
  };

  const fetchCampos = async () => {
    const response = await fetch('/api/admin/campos');
    if (response.ok) {
      const data = await response.json();
      setCampos(data.campos || []);
    }
  };

  const fetchHorarios = async () => {
    const response = await fetch('/api/admin/horarios');
    if (response.ok) {
      const data = await response.json();
      setHorarios(data.horarios || []);
    }
  };

  const fetchEquipos = async () => {
    const response = await fetch('/api/admin/equipos');
    if (response.ok) {
      const data = await response.json();
      setEquipos(data.equipos || []);
    }
  };

  const fetchCalendario = async (temporadaId: string) => {
    try {
      const response = await fetch(`/api/admin/generar-calendario/${temporadaId}`);
      if (response.ok) {
        const data = await response.json();
        setJornadas(data.jornadas || []);
        
        // Aplanar partidos de todas las jornadas
        const todosPartidos = data.jornadas?.reduce((acc: any[], jornada: any) => {
          return acc.concat(jornada.partidos_calendario || []);
        }, []) || [];
        setPartidos(todosPartidos);
      }
    } catch (error) {
      console.error('Error cargando calendario:', error);
    }
  };

  const handleSubmitTemporada = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const url = editingTemporada ? `/api/admin/temporadas?id=${editingTemporada.id}` : '/api/admin/temporadas';
      const method = editingTemporada ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(temporadaForm)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(editingTemporada ? 'Temporada actualizada' : 'Temporada creada');
        setShowTemporadaForm(false);
        setEditingTemporada(null);
        setTemporadaForm({
          nombre: '',
          fecha_inicio: '',
          fecha_fin: '',
          playoffs_inicio: '',
          max_juegos_por_sabado: 5,
          vueltas_programadas: 2,
          auto_generar: true
        });
        fetchTemporadas();
      } else {
        setError(data.error || 'Error guardando temporada');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerarCalendario = async (temporadaId: string) => {
    console.log('🚀 handleGenerarCalendario called with temporadaId:', temporadaId);
    console.log('📋 Current data:', { equipos: equipos.length, campos: campos.length, horarios: horarios.length });
    
    if (!confirm('¿Estás seguro de generar el calendario? Esto sobrescribirá cualquier calendario existente.')) {
      console.log('❌ User cancelled confirmation');
      return;
    }

    console.log('✅ User confirmed, starting generation...');
    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      console.log('📡 Making API request to:', `/api/admin/generar-calendario/${temporadaId}`);
      const requestBody = {
        equipos: equipos.filter(e => e.activo),
        campos: campos.filter(c => c.activo),
        horarios: horarios
      };
      console.log('📤 Request body:', requestBody);
      
      const response = await fetch(`/api/admin/generar-calendario/${temporadaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 Response status:', response.status);
      const data = await response.json();
      console.log('📥 Response data:', data);

      if (response.ok) {
        console.log('✅ Calendar generated successfully');
        setSuccess(`Calendario generado: ${data.estadisticas.totalJornadas} jornadas, ${data.estadisticas.totalPartidos} partidos`);
        fetchTemporadas();
      } else {
        console.error('❌ API Error:', data);
        setError(data.error || 'Error generando calendario');
      }
    } catch (error) {
      console.error('💥 Network Error:', error);
      setError('Error de conexión');
    } finally {
      setGenerating(false);
    }
  };

  if (session?.user?.role !== 'admin') {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Acceso Denegado</h2>
        <p className="text-gray-800 mt-2">Solo los administradores pueden gestionar calendarios.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-white">📅 Sistema de Calendario</h2>
          <p className="text-slate-300 mt-3 text-lg">Gestiona temporadas, campos, horarios y genera calendarios automáticamente</p>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 text-red-300 px-6 py-4 rounded-xl backdrop-blur-sm">
            <div className="flex items-center">
              <span className="text-red-400 mr-3 text-lg">⚠️</span>
              {error}
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-500/20 border border-green-500/50 text-green-300 px-6 py-4 rounded-xl backdrop-blur-sm">
            <div className="flex items-center">
              <span className="text-green-400 mr-3 text-lg">✅</span>
              {success}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex rounded-xl bg-slate-700/50 p-1">
            {[
              { key: 'configuracion', label: '⚙️ Configuración & Generación', count: temporadas.length + campos.length + horarios.length },
              { key: 'calendario', label: '📋 Calendario Generado', count: partidos.length }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 py-4 px-6 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="bg-slate-800/90 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-slate-600">
            <div className="flex items-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              <span className="text-slate-300 text-lg">Cargando calendario...</span>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Tab Content */}
          {activeTab === 'configuracion' && (
            <div className="space-y-8">
              {/* Sección Temporadas */}
              <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-600">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-white">🗓️ Temporadas</h3>
                  <button
                    onClick={() => {
                      setShowTemporadaForm(true);
                      setEditingTemporada(null);
                    }}
                    className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    ➕ Nueva Temporada
                  </button>
                </div>

                {temporadas.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <div className="text-6xl mb-4">📅</div>
                    <p className="text-lg">No hay temporadas configuradas. Crea una para comenzar.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {temporadas.map((temporada) => (
                      <div key={temporada.id} className="bg-slate-700/50 border border-slate-600 rounded-xl p-6 hover:bg-slate-700/70 transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-white text-lg">{temporada.nombre}</h4>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            temporada.estado === 'activa' ? 'bg-green-500/20 text-green-300 border border-green-500/50' :
                            temporada.estado === 'configuracion' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50' :
                            temporada.estado === 'generado' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50' :
                            temporada.estado === 'cerrada' ? 'bg-gray-500/20 text-gray-300 border border-gray-500/50' :
                            'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                          }`}>
                            {temporada.estado}
                          </span>
                        </div>
                        <div className="text-sm text-slate-300 space-y-2">
                          <div>📅 {new Date(temporada.fecha_inicio).toLocaleDateString()} - {new Date(temporada.fecha_fin).toLocaleDateString()}</div>
                          <div>🔄 {temporada.vueltas_programadas} vueltas</div>
                          <div>⚽ Máx {temporada.max_juegos_por_sabado} juegos/sábado</div>
                        </div>
                        <div className="mt-6 flex justify-between">
                          <button
                            onClick={() => {
                              setEditingTemporada(temporada);
                              setTemporadaForm({
                                nombre: temporada.nombre,
                                fecha_inicio: temporada.fecha_inicio,
                                fecha_fin: temporada.fecha_fin,
                                playoffs_inicio: temporada.playoffs_inicio || '',
                                max_juegos_por_sabado: temporada.max_juegos_por_sabado,
                                vueltas_programadas: temporada.vueltas_programadas,
                                auto_generar: temporada.auto_generar
                              });
                              setShowTemporadaForm(true);
                            }}
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors duration-200"
                          >
                            ✏️ Editar
                          </button>
                          {temporada.estado === 'configuracion' && (
                            <button
                              onClick={() => handleGenerarCalendario(temporada.id)}
                              disabled={generating}
                              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                            >
                              {generating ? '⏳' : '🚀'} Generar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Campos y Horarios */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">🏟️ Campos ({campos.filter(c => c.activo).length})</h3>
                    <button
                      onClick={() => {
                        setShowCampoForm(true);
                        setEditingCampo(null);
                      }}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      ➕ Agregar
                    </button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {campos.map((campo) => (
                      <div key={campo.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <span className="font-medium">{campo.nombre}</span>
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                            campo.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {campo.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setEditingCampo(campo);
                            setCampoForm({
                              nombre: campo.nombre,
                              descripcion: campo.descripcion || '',
                              activo: campo.activo,
                              orden: campo.orden
                            });
                            setShowCampoForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          ✏️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">⏰ Horarios ({horarios.filter(h => h.activo_por_defecto).length})</h3>
                    <button
                      onClick={() => {
                        setShowHorarioForm(true);
                        setEditingHorario(null);
                      }}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      ➕ Agregar
                    </button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {horarios.map((horario) => (
                      <div key={horario.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <span className="font-medium">{horario.nombre}</span>
                          <div className="text-xs text-gray-800">
                            {horario.hora_inicio} - {horario.hora_fin}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setEditingHorario(horario);
                            setHorarioForm({
                              nombre: horario.nombre,
                              hora_inicio: horario.hora_inicio,
                              hora_fin: horario.hora_fin,
                              activo_por_defecto: horario.activo_por_defecto,
                              orden: horario.orden,
                              descripcion: horario.descripcion || ''
                            });
                            setShowHorarioForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          ✏️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'temporadas' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Temporadas</h3>
                <button
                  onClick={() => {
                    setShowTemporadaForm(true);
                    setEditingTemporada(null);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  ➕ Nueva Temporada
                </button>
              </div>

              {temporadas.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <div className="text-gray-400 text-6xl mb-4">🗓️</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay temporadas</h3>
                  <p className="text-gray-800">Crea tu primera temporada para comenzar.</p>
                </div>
              ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {temporadas.map((temporada) => (
                      <li key={temporada.id} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-lg font-medium text-gray-900">{temporada.nombre}</h4>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                temporada.estado === 'activa' ? 'bg-green-100 text-green-800' :
                                temporada.estado === 'configuracion' ? 'bg-yellow-100 text-yellow-800' :
                                temporada.estado === 'generado' ? 'bg-blue-100 text-blue-800' :
                                temporada.estado === 'cerrada' ? 'bg-gray-100 text-gray-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {temporada.estado}
                              </span>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-800">
                              <div>📅 Inicio: {new Date(temporada.fecha_inicio).toLocaleDateString()}</div>
                              <div>🏁 Fin: {new Date(temporada.fecha_fin).toLocaleDateString()}</div>
                              <div>🔄 Vueltas: {temporada.vueltas_programadas}</div>
                              <div>⚾ Max juegos/sábado: {temporada.max_juegos_por_sabado}</div>
                            </div>
                          </div>
                          <div className="ml-4 flex space-x-2">
                            <button
                              onClick={() => {
                                setEditingTemporada(temporada);
                                setTemporadaForm({
                                  nombre: temporada.nombre,
                                  fecha_inicio: temporada.fecha_inicio,
                                  fecha_fin: temporada.fecha_fin,
                                  playoffs_inicio: temporada.playoffs_inicio || '',
                                  max_juegos_por_sabado: temporada.max_juegos_por_sabado,
                                  vueltas_programadas: temporada.vueltas_programadas,
                                  auto_generar: temporada.auto_generar
                                });
                                setShowTemporadaForm(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              ✏️ Editar
                            </button>
                            {temporada.estado === 'configuracion' && (
                              <button
                                onClick={() => handleGenerarCalendario(temporada.id)}
                                disabled={generating}
                                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                              >
                                {generating ? '⚡ Generando...' : '🚀 Generar'}
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'campos' && (
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-600">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">🏟️ Campos de Juego</h3>
                <button
                  onClick={() => {
                    setShowCampoForm(true);
                    setEditingCampo(null);
                  }}
                  className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  ➕ Nuevo Campo
                </button>
              </div>

              {campos.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <div className="text-6xl mb-4">🏟️</div>
                  <h3 className="text-xl font-semibold text-white mb-2">No hay campos configurados</h3>
                  <p className="text-slate-300">Agrega campos donde se jugarán los partidos.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {campos.map((campo) => (
                    <div key={campo.id} className="bg-slate-700/50 border border-slate-600 rounded-xl p-6 hover:bg-slate-700/70 transition-all duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-white text-lg">{campo.nombre}</h4>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          campo.activo ? 'bg-green-500/20 text-green-300 border border-green-500/50' : 'bg-red-500/20 text-red-300 border border-red-500/50'
                        }`}>
                          {campo.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      {campo.descripcion && (
                        <p className="text-sm text-slate-300 mb-4">{campo.descripcion}</p>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-400">Orden: {campo.orden}</span>
                        <button
                          onClick={() => {
                            setEditingCampo(campo);
                            setCampoForm({
                              nombre: campo.nombre,
                              descripcion: campo.descripcion || '',
                              activo: campo.activo,
                              orden: campo.orden
                            });
                            setShowCampoForm(true);
                          }}
                          className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors duration-200"
                        >
                          ✏️ Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'horarios' && (
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-600">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">⏰ Horarios de Juego</h3>
                <button
                  onClick={() => {
                    setShowHorarioForm(true);
                    setEditingHorario(null);
                  }}
                  className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  ➕ Nuevo Horario
                </button>
              </div>

              {horarios.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <div className="text-6xl mb-4">⏰</div>
                  <h3 className="text-xl font-semibold text-white mb-2">No hay horarios configurados</h3>
                  <p className="text-slate-300">Configura los horarios disponibles para los juegos.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {horarios.map((horario) => (
                    <div key={horario.id} className="bg-slate-700/50 border border-slate-600 rounded-xl p-6 hover:bg-slate-700/70 transition-all duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-white text-lg">{horario.nombre}</h4>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          horario.activo_por_defecto ? 'bg-green-500/20 text-green-300 border border-green-500/50' : 'bg-gray-500/20 text-gray-300 border border-gray-500/50'
                        }`}>
                          {horario.activo_por_defecto ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm text-slate-300 mb-4">
                        <div>🕐 Inicio: {horario.hora_inicio}</div>
                        <div>🕑 Fin: {horario.hora_fin}</div>
                        <div>📊 Orden: {horario.orden}</div>
                        {horario.descripcion && (
                          <div>📝 {horario.descripcion}</div>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            setEditingHorario(horario);
                            setHorarioForm({
                              nombre: horario.nombre,
                              hora_inicio: horario.hora_inicio,
                              hora_fin: horario.hora_fin,
                              activo_por_defecto: horario.activo_por_defecto,
                              orden: horario.orden,
                              descripcion: horario.descripcion || ''
                            });
                            setShowHorarioForm(true);
                          }}
                          className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors duration-200"
                        >
                          ✏️ Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'generar' && (
            <div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">🚀 Generador Automático de Calendario</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900">Equipos Activos</h4>
                    <p className="text-2xl font-bold text-blue-600">{equipos.filter(e => e.activo).length}</p>
                    <p className="text-sm text-blue-700">
                      {equipos.filter(e => e.activo).length % 2 === 1 ? 'Impar - se agregará BYE' : 'Par - todos juegan'}
                    </p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-900">Campos Disponibles</h4>
                    <p className="text-2xl font-bold text-green-600">{campos.filter(c => c.activo).length}</p>
                    <p className="text-sm text-green-700">
                      {campos.filter(c => c.activo).map(c => c.nombre).join(', ')}
                    </p>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-medium text-purple-900">Horarios Activos</h4>
                    <p className="text-2xl font-bold text-purple-600">{horarios.filter(h => h.activo_por_defecto).length}</p>
                    <p className="text-sm text-purple-700">
                      Capacidad: {campos.filter(c => c.activo).length * horarios.filter(h => h.activo_por_defecto).length} partidos/sábado
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Temporadas Disponibles para Generar:</h4>
                  {temporadas.filter(t => t.estado === 'configuracion').length === 0 ? (
                    <p className="text-gray-800">No hay temporadas en configuración. Crea una nueva temporada primero.</p>
                  ) : (
                    <div className="space-y-2">
                      {temporadas.filter(t => t.estado === 'configuracion').map(temporada => (
                        <div key={temporada.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div>
                            <h5 className="font-medium">{temporada.nombre}</h5>
                            <p className="text-sm text-gray-800">
                              {new Date(temporada.fecha_inicio).toLocaleDateString()} - {new Date(temporada.fecha_fin).toLocaleDateString()}
                              • {temporada.vueltas_programadas} vueltas
                            </p>
                          </div>
                          <button
                            onClick={() => handleGenerarCalendario(temporada.id)}
                            disabled={generating}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {generating ? '⚡ Generando...' : '🚀 Generar Calendario'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'calendario' && (
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-600">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white">📋 Calendario Generado</h3>
                  {(() => {
                    const temporadaGenerada = temporadas.find(t => t.estado === 'generado');
                    return temporadaGenerada ? (
                      <p className="text-slate-300 mt-2">
                        Temporada: <span className="font-semibold text-white">{temporadaGenerada.nombre}</span>
                        {temporadaGenerada.fecha_generacion && (
                          <span className="ml-2">• Generado: {new Date(temporadaGenerada.fecha_generacion).toLocaleDateString()}</span>
                        )}
                      </p>
                    ) : null;
                  })()}
                </div>
                <button
                  onClick={() => {
                    const temporadaGenerada = temporadas.find(t => t.estado === 'generado');
                    if (temporadaGenerada) {
                      fetchCalendario(temporadaGenerada.id);
                    }
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  🔄 Recargar
                </button>
              </div>

              {partidos.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <div className="text-gray-400 text-6xl mb-4">📅</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay calendario cargado</h3>
                  <p className="text-gray-800">Selecciona una temporada para ver su calendario.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Resumen */}
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{jornadas.length}</div>
                        <div className="text-sm text-gray-800">Jornadas</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">{partidos.length}</div>
                        <div className="text-sm text-gray-800">Partidos</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">{equipos.filter(e => e.activo).length}</div>
                        <div className="text-sm text-gray-800">Equipos</div>
                      </div>
                    </div>
                  </div>

                  {/* Lista de Jornadas */}
                  <div className="space-y-4">
                    {jornadas.map((jornada, index) => (
                      <div key={jornada.id} className="bg-white rounded-lg shadow">
                        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                          <h4 className="font-medium text-gray-900">
                            Jornada {jornada.numero_jornada} - {new Date(jornada.fecha).toLocaleDateString()}
                          </h4>
                          <p className="text-sm text-gray-800">
                            {jornada.partidos_calendario?.length || 0} partidos programados
                          </p>
                        </div>
                        
                        <div className="p-4">
                          {jornada.partidos_calendario?.length > 0 ? (
                            <div className="grid gap-3">
                              {jornada.partidos_calendario.map((partido: any) => (
                                <div key={partido.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded shadow-sm">
                                  <div className="flex items-center space-x-4">
                                    <div className="text-sm">
                                      <span className="font-bold text-blue-800">{partido.equipo_local?.nombre || 'Equipo Local'}</span>
                                      <span className="mx-2 text-gray-600 font-semibold">vs</span>
                                      <span className="font-bold text-red-800">{partido.equipo_visitante?.nombre || 'Equipo Visitante'}</span>
                                    </div>
                                    {partido.campo && (
                                      <div className="text-xs text-gray-800">
                                        📍 {partido.campo.nombre}
                                      </div>
                                    )}
                                    {partido.horario && (
                                      <div className="text-xs text-gray-800">
                                        🕐 {partido.horario.hora_inicio}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      partido.estado === 'programado' ? 'bg-yellow-100 text-yellow-800' :
                                      partido.estado === 'finalizado' ? 'bg-green-100 text-green-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {partido.estado}
                                    </span>
                                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                                      ✏️ Editar
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-800 text-center py-4">No hay partidos en esta jornada</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal Temporada */}
      {showTemporadaForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl p-8 w-full max-w-md mx-4 border border-slate-600 shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-6">
              {editingTemporada ? '✏️ Editar Temporada' : '➕ Nueva Temporada'}
            </h3>
            
            <form onSubmit={handleSubmitTemporada} className="space-y-6">
              <div>
                <label className="block text-base font-semibold text-white mb-3">📅 Nombre *</label>
                <input
                  type="text"
                  required
                  value={temporadaForm.nombre}
                  onChange={(e) => setTemporadaForm({ ...temporadaForm, nombre: e.target.value })}
                  className="w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-slate-600 transition-all duration-300"
                  placeholder="Temporada 2025"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-semibold text-white mb-3">📅 Fecha Inicio *</label>
                  <input
                    type="date"
                    required
                    value={temporadaForm.fecha_inicio}
                    onChange={(e) => setTemporadaForm({ ...temporadaForm, fecha_inicio: e.target.value })}
                    className="w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base focus:outline-none focus:border-blue-500 focus:bg-slate-600 transition-all duration-300"
                  />
                </div>

                <div>
                  <label className="block text-base font-semibold text-white mb-3">📅 Fecha Fin *</label>
                  <input
                    type="date"
                    required
                    value={temporadaForm.fecha_fin}
                    onChange={(e) => setTemporadaForm({ ...temporadaForm, fecha_fin: e.target.value })}
                    className="w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-4 text-white text-base focus:outline-none focus:border-blue-500 focus:bg-slate-600 transition-all duration-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Vueltas</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={temporadaForm.vueltas_programadas}
                    onChange={(e) => setTemporadaForm({ ...temporadaForm, vueltas_programadas: parseInt(e.target.value) || 1 })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Max Juegos/Sábado</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={temporadaForm.max_juegos_por_sabado}
                    onChange={(e) => setTemporadaForm({ ...temporadaForm, max_juegos_por_sabado: parseInt(e.target.value) || 1 })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex space-x-4 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowTemporadaForm(false);
                    setEditingTemporada(null);
                  }}
                  className="flex-1 bg-slate-700 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-600 py-4 px-6 rounded-xl font-semibold transition-all duration-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 text-white py-4 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                >
                  {saving ? '⏳ Guardando...' : (editingTemporada ? '✏️ Actualizar' : '➕ Crear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Campo */}
      {showCampoForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">
              {editingCampo ? 'Editar Campo' : 'Nuevo Campo'}
            </h3>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              setError('');
              setSuccess('');

              try {
                const url = editingCampo ? `/api/admin/campos?id=${editingCampo.id}` : '/api/admin/campos';
                const method = editingCampo ? 'PUT' : 'POST';

                const response = await fetch(url, {
                  method,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(campoForm)
                });

                const data = await response.json();

                if (response.ok) {
                  setSuccess(editingCampo ? 'Campo actualizado' : 'Campo creado');
                  setShowCampoForm(false);
                  setEditingCampo(null);
                  setCampoForm({
                    nombre: '',
                    descripcion: '',
                    activo: true,
                    orden: 1
                  });
                  fetchCampos();
                } else {
                  setError(data.error || 'Error guardando campo');
                }
              } catch (error) {
                setError('Error de conexión');
              } finally {
                setSaving(false);
              }
            }}
            className="space-y-4"
          >
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={campoForm.nombre}
                  onChange={(e) => setCampoForm({ ...campoForm, nombre: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Campo Principal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Descripción</label>
                <textarea
                  value={campoForm.descripcion}
                  onChange={(e) => setCampoForm({ ...campoForm, descripcion: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descripción del campo..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Orden</label>
                  <input
                    type="number"
                    min="1"
                    value={campoForm.orden}
                    onChange={(e) => setCampoForm({ ...campoForm, orden: parseInt(e.target.value) || 1 })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    id="campo-activo"
                    checked={campoForm.activo}
                    onChange={(e) => setCampoForm({ ...campoForm, activo: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="campo-activo" className="text-sm font-medium text-gray-900">
                    Campo activo
                  </label>
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCampoForm(false);
                    setEditingCampo(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-900 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : (editingCampo ? 'Actualizar' : 'Crear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Horario */}
      {showHorarioForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">
              {editingHorario ? 'Editar Horario' : 'Nuevo Horario'}
            </h3>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              setError('');
              setSuccess('');

              try {
                const url = editingHorario ? `/api/admin/horarios?id=${editingHorario.id}` : '/api/admin/horarios';
                const method = editingHorario ? 'PUT' : 'POST';

                const response = await fetch(url, {
                  method,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(horarioForm)
                });

                const data = await response.json();

                if (response.ok) {
                  setSuccess(editingHorario ? 'Horario actualizado' : 'Horario creado');
                  setShowHorarioForm(false);
                  setEditingHorario(null);
                  setHorarioForm({
                    nombre: '',
                    hora_inicio: '',
                    hora_fin: '',
                    activo_por_defecto: true,
                    orden: 1,
                    descripcion: ''
                  });
                  fetchHorarios();
                } else {
                  setError(data.error || 'Error guardando horario');
                }
              } catch (error) {
                setError('Error de conexión');
              } finally {
                setSaving(false);
              }
            }}
            className="space-y-4"
          >
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={horarioForm.nombre}
                  onChange={(e) => setHorarioForm({ ...horarioForm, nombre: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Matutino"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Hora Inicio *</label>
                  <input
                    type="time"
                    required
                    value={horarioForm.hora_inicio}
                    onChange={(e) => setHorarioForm({ ...horarioForm, hora_inicio: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Hora Fin *</label>
                  <input
                    type="time"
                    required
                    value={horarioForm.hora_fin}
                    onChange={(e) => setHorarioForm({ ...horarioForm, hora_fin: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Descripción</label>
                <input
                  type="text"
                  value={horarioForm.descripcion}
                  onChange={(e) => setHorarioForm({ ...horarioForm, descripcion: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Opcional..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Orden</label>
                  <input
                    type="number"
                    min="1"
                    value={horarioForm.orden}
                    onChange={(e) => setHorarioForm({ ...horarioForm, orden: parseInt(e.target.value) || 1 })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    id="horario-activo"
                    checked={horarioForm.activo_por_defecto}
                    onChange={(e) => setHorarioForm({ ...horarioForm, activo_por_defecto: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="horario-activo" className="text-sm font-medium text-gray-900">
                    Activo por defecto
                  </label>
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowHorarioForm(false);
                    setEditingHorario(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-900 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : (editingHorario ? 'Actualizar' : 'Crear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}