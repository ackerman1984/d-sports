// Tipos principales para la aplicación
export type Role = 'admin' | 'anotador' | 'jugador';

export interface Liga {
  id: string;
  nombre: string;
  codigo: string;
  subdominio: string;
  activa: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Temporada {
  id: string;
  ligaId: string;
  nombre: string;
  fechaInicio: Date;
  fechaFin: Date;
  activa: boolean;
}

export interface Equipo {
  id: string;
  ligaId: string;
  nombre: string;
  color: string;
  logo?: string;
  activo: boolean;
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  role: Role;
  ligaId: string;
  activo: boolean;
  createdAt: Date;
}

export interface Administrador {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  ligaId: string;
  createdAt: Date;
}

export interface Anotador {
  id: string;
  email: string;
  nombre: string;
  codigoAcceso: string;
  fotoUrl?: string;
  ligaId: string;
  createdBy: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Jugador {
  id: string;
  equipoId: string;
  usuarioId?: string;
  nombre: string;
  numeroCasaca: number;
  posicion?: string;
  fotoUrl?: string;
  activo: boolean;
}

export interface Juego {
  id: string;
  temporadaId: string;
  equipoLocalId: string;
  equipoVisitanteId: string;
  fecha: Date;
  estado: 'programado' | 'en_progreso' | 'finalizado' | 'suspendido';
  marcadorLocal?: number;
  marcadorVisitante?: number;
  anotadorId?: string;
}

export interface AnotadorJuego {
  id: string;
  anotadorId: string;
  juegoId: string;
  asignadoPor: string;
  createdAt: Date;
}

export interface EstadisticaJugador {
  id: string;
  jugadorId: string;
  juegoId: string;
  turnos: number;
  hits: number;
  carreras: number;
  impulsadas: number;
  homeRuns: number;
  basesRobadas: number;
  ponches: number;
  basePorBolas: number;
  errores: number;
  registradoPor?: string;
  createdAt: Date;
  updatedAt: Date;
}