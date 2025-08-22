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

  if (session?.user?.role !== 'admin') {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Acceso Denegado</h2>
        <p className="text-gray-600 mt-2">Solo los administradores pueden gestionar calendarios.</p>
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
      </div>
    </div>
  );
}