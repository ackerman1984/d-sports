/**
 * Generador de Jornadas (Schedule Generator)
 * 
 * Asigna las rondas del Round Robin a sábados específicos
 * con control de capacidad, descansos y fechas especiales
 */

import { Ronda, Partido } from './round-robin-generator';

export interface Campo {
  id: string;
  nombre: string;
  activo: boolean;
  orden: number;
}

export interface Horario {
  id: string;
  nombre: string;
  horaInicio: string; // HH:MM format
  horaFin: string;
  activoPorDefecto: boolean;
  orden: number;
}

export interface SabadoEspecial {
  fecha: Date;
  tipo: 'feriado' | 'flex' | 'mantenimiento';
  descripcion?: string;
}

export interface ConfiguracionJornadas {
  fechaInicio: Date;
  fechaFin: Date;
  campos: Campo[];
  horarios: Horario[];
  maxJuegosPorSabado: number;
  sabadosEspeciales: SabadoEspecial[];
  semanasFlexCada: number; // Cada cuántos sábados normales
}

export interface Jornada {
  numero: number;
  fecha: Date;
  vuelta: number;
  tipo: 'regular' | 'flex' | 'playoffs';
  capacidadMaxima: number;
  partidos: PartidoProgramado[];
}

export interface PartidoProgramado extends Partido {
  campo?: Campo;
  horario?: Horario;
  horaProgramada?: string;
  numeroPartido: number;
}

export interface ContadorDescanso {
  equipoId: string;
  juegosJugados: number;
  necesitaDescanso: boolean;
  proximoDescansoJornada?: number;
}

export interface ResultadoJornadas {
  jornadas: Jornada[];
  equiposEnDescanso: { [jornadaNumero: number]: string[] };
  estadisticas: {
    jornadasUsadas: number;
    promedioPartidosPorJornada: number;
    jornadasConT1: number; // Jornadas que usaron horario T1
    balanceCampos: { [campoId: string]: number };
    balanceHorarios: { [horarioId: string]: number };
  };
}

export interface ResultadoSchedule {
  exito: boolean;
  jornadas?: Jornada[];
  error?: string;
  equiposEnDescanso?: { [jornadaNumero: number]: string[] };
  estadisticas?: {
    jornadasUsadas: number;
    promedioPartidosPorJornada: number;
    jornadasConT1: number;
    balanceCampos: { [campoId: string]: number };
    balanceHorarios: { [horarioId: string]: number };
  };
}

/**
 * Generador de Jornadas
 */
export class ScheduleGenerator {

  /**
   * Genera las jornadas asignando rondas a sábados específicos
   */
  static generar(
    rondas: Ronda[], 
    configuracion: ConfiguracionJornadas
  ): ResultadoSchedule {
    try {
    
    console.log(`📅 Generando jornadas del calendario:`);
    console.log(`   - Rondas a programar: ${rondas.length}`);
    console.log(`   - Período: ${configuracion.fechaInicio.toDateString()} - ${configuracion.fechaFin.toDateString()}`);
    console.log(`   - Campos: ${configuracion.campos.filter(c => c.activo).length}`);
    console.log(`   - Horarios activos: ${configuracion.horarios.filter(h => h.activoPorDefecto).length}`);

    // 1. Generar sábados disponibles
    const sabados = this.generarSabados(configuracion);
    console.log(`   - Sábados disponibles: ${sabados.length}`);

    // 2. Inicializar contadores de descanso
    const contadoresDescanso = this.inicializarContadoresDescanso(rondas);

    // 3. Asignar rondas a jornadas
    const jornadas = this.asignarRondasAJornadas(rondas, sabados, configuracion, contadoresDescanso);

    // 4. Asignar campos y horarios
    this.asignarCamposYHorarios(jornadas, configuracion);

    // 5. Generar estadísticas
    const estadisticas = this.generarEstadisticas(jornadas, configuracion);

    const resultado: ResultadoJornadas = {
      jornadas,
      equiposEnDescanso: this.obtenerEquiposEnDescanso(jornadas, contadoresDescanso),
      estadisticas
    };

      console.log(`\n✅ Jornadas generadas exitosamente:`);
      console.log(`   - Total jornadas: ${resultado.jornadas.length}`);
      console.log(`   - Promedio partidos/jornada: ${resultado.estadisticas.promedioPartidosPorJornada.toFixed(1)}`);
      console.log(`   - Jornadas con T1: ${resultado.estadisticas.jornadasConT1}`);

      return {
        exito: true,
        jornadas: resultado.jornadas,
        equiposEnDescanso: resultado.equiposEnDescanso,
        estadisticas: resultado.estadisticas
      };
      
    } catch (error) {
      console.error('❌ Error generando jornadas:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido generando jornadas'
      };
    }
  }

  /**
   * Genera la lista de sábados disponibles entre fechas
   */
  private static generarSabados(configuracion: ConfiguracionJornadas): Array<{
    fecha: Date;
    tipo: 'regular' | 'flex' | 'feriado';
    capacidad: number;
  }> {
    const sabados = [];
    const fecha = new Date(configuracion.fechaInicio);
    
    // Encontrar el primer sábado
    while (fecha.getDay() !== 6) { // 6 = sábado
      fecha.setDate(fecha.getDate() + 1);
    }

    let contadorSabados = 0;
    
    while (fecha <= configuracion.fechaFin) {
      const fechaSabado = new Date(fecha);
      
      // Verificar si es día especial
      const sabadoEspecial = configuracion.sabadosEspeciales.find(s => 
        s.fecha.toDateString() === fechaSabado.toDateString()
      );

      if (sabadoEspecial?.tipo === 'feriado') {
        // Saltar feriados
        console.log(`⏭️ Saltando feriado: ${fechaSabado.toDateString()}`);
      } else {
        contadorSabados++;
        
        // Determinar tipo de sábado
        let tipo: 'regular' | 'flex' = 'regular';
        
        if (sabadoEspecial?.tipo === 'flex' || 
            (configuracion.semanasFlexCada > 0 && contadorSabados % configuracion.semanasFlexCada === 0)) {
          tipo = 'flex';
        }

        // Calcular capacidad
        const horariosActivos = configuracion.horarios.filter(h => h.activoPorDefecto);
        const capacidadTeorica = configuracion.campos.filter(c => c.activo).length * horariosActivos.length;
        const capacidad = Math.min(configuracion.maxJuegosPorSabado, capacidadTeorica);

        sabados.push({
          fecha: fechaSabado,
          tipo,
          capacidad
        });
      }

      // Siguiente sábado
      fecha.setDate(fecha.getDate() + 7);
    }

    return sabados;
  }

  /**
   * Inicializa contadores de descanso para cada equipo
   */
  private static inicializarContadoresDescanso(rondas: Ronda[]): { [equipoId: string]: ContadorDescanso } {
    const contadores: { [equipoId: string]: ContadorDescanso } = {};
    
    // Obtener todos los equipos únicos
    const equipos = new Set<string>();
    rondas.forEach(ronda => {
      ronda.partidos.forEach(partido => {
        equipos.add(partido.equipoLocal.id);
        if (partido.equipoVisitante) {
          equipos.add(partido.equipoVisitante.id);
        }
      });
    });

    // Inicializar contadores
    equipos.forEach(equipoId => {
      if (equipoId !== 'BYE') {
        contadores[equipoId] = {
          equipoId,
          juegosJugados: 0,
          necesitaDescanso: false
        };
      }
    });

    return contadores;
  }

  /**
   * Asigna rondas a jornadas específicas aplicando regla 5+1
   */
  private static asignarRondasAJornadas(
    rondas: Ronda[],
    sabados: Array<{ fecha: Date; tipo: string; capacidad: number }>,
    configuracion: ConfiguracionJornadas,
    contadoresDescanso: { [equipoId: string]: ContadorDescanso }
  ): Jornada[] {
    
    const jornadas: Jornada[] = [];
    let indiceSabado = 0;
    
    for (const ronda of rondas) {
      // Aplicar regla de descansos 5+1
      const partidosFiltrados = this.aplicarReglaDescansos(ronda, contadoresDescanso);
      
      if (partidosFiltrados.length === 0) {
        console.log(`⚠️ Ronda ${ronda.numero} de vuelta ${ronda.vuelta}: todos los equipos en descanso`);
        continue;
      }

      // Buscar sábado disponible
      while (indiceSabado < sabados.length) {
        const sabado = sabados[indiceSabado];
        
        // Saltear semanas flex si no es necesario (preferir para reprogramaciones)
        if (sabado.tipo === 'flex' && partidosFiltrados.length <= sabado.capacidad && indiceSabado + 1 < sabados.length) {
          const siguienteSabado = sabados[indiceSabado + 1];
          if (siguienteSabado.tipo === 'regular' && partidosFiltrados.length <= siguienteSabado.capacidad) {
            indiceSabado++;
            continue;
          }
        }

        // Verificar si la ronda cabe en este sábado
        if (partidosFiltrados.length <= sabado.capacidad) {
          const jornada: Jornada = {
            numero: jornadas.length + 1,
            fecha: sabado.fecha,
            vuelta: ronda.vuelta,
            tipo: sabado.tipo as any,
            capacidadMaxima: sabado.capacidad,
            partidos: partidosFiltrados.map((partido, index) => ({
              ...partido,
              numeroPartido: index + 1
            }))
          };

          jornadas.push(jornada);
          
          // Actualizar contadores de juegos
          this.actualizarContadoresJuegos(partidosFiltrados, contadoresDescanso);
          
          indiceSabado++;
          break;
        } else {
          // Dividir ronda si no cabe completa
          const partidosParaEsteOSabado = partidosFiltrados.splice(0, sabado.capacidad);
          
          const jornada: Jornada = {
            numero: jornadas.length + 1,
            fecha: sabado.fecha,
            vuelta: ronda.vuelta,
            tipo: sabado.tipo as any,
            capacidadMaxima: sabado.capacidad,
            partidos: partidosParaEsteOSabado.map((partido, index) => ({
              ...partido,
              numeroPartido: index + 1
            }))
          };

          jornadas.push(jornada);
          this.actualizarContadoresJuegos(partidosParaEsteOSabado, contadoresDescanso);
          
          indiceSabado++;
          
          // Continuar con el resto de partidos en el siguiente sábado
          if (partidosFiltrados.length > 0) {
            // No incrementar indiceSabado para procesar el resto en el siguiente sábado
          }
        }
      }
    }

    return jornadas;
  }

  /**
   * Aplica la regla de descansos 5+1
   */
  private static aplicarReglaDescansos(
    ronda: Ronda, 
    contadoresDescanso: { [equipoId: string]: ContadorDescanso }
  ): PartidoProgramado[] {
    
    const partidosFiltrados: PartidoProgramado[] = [];
    
    ronda.partidos.forEach(partido => {
      const localNecesitaDescanso = contadoresDescanso[partido.equipoLocal.id]?.necesitaDescanso || false;
      const visitanteNecesitaDescanso = partido.equipoVisitante ? 
        (contadoresDescanso[partido.equipoVisitante.id]?.necesitaDescanso || false) : false;

      if (partido.esBye) {
        // BYE cuenta como descanso
        const contador = contadoresDescanso[partido.equipoLocal.id];
        if (contador && contador.necesitaDescanso) {
          contador.necesitaDescanso = false;
          contador.juegosJugados = 0; // Reiniciar contador
          console.log(`😴 ${partido.equipoLocal.nombre}: BYE (descanso aplicado)`);
        }
        // No agregar BYEs al calendario de partidos
      } else if (!localNecesitaDescanso && !visitanteNecesitaDescanso) {
        // Ambos equipos pueden jugar
        partidosFiltrados.push({
          ...partido,
          numeroPartido: 0 // Se asignará después
        });
      } else {
        // Al menos uno necesita descanso - posponer partido
        console.log(`😴 Posponiendo: ${partido.equipoLocal.nombre} vs ${partido.equipoVisitante?.nombre} (descanso requerido)`);
        
        // Marcar descanso como aplicado
        if (localNecesitaDescanso) {
          const contador = contadoresDescanso[partido.equipoLocal.id];
          contador.necesitaDescanso = false;
          contador.juegosJugados = 0;
        }
        if (visitanteNecesitaDescanso && partido.equipoVisitante) {
          const contador = contadoresDescanso[partido.equipoVisitante.id];
          contador.necesitaDescanso = false;
          contador.juegosJugados = 0;
        }
      }
    });

    return partidosFiltrados;
  }

  /**
   * Actualiza contadores de juegos y marca necesidad de descanso
   */
  private static actualizarContadoresJuegos(
    partidos: PartidoProgramado[], 
    contadoresDescanso: { [equipoId: string]: ContadorDescanso }
  ) {
    partidos.forEach(partido => {
      if (!partido.esBye) {
        // Incrementar contador del equipo local
        const contadorLocal = contadoresDescanso[partido.equipoLocal.id];
        if (contadorLocal) {
          contadorLocal.juegosJugados++;
          if (contadorLocal.juegosJugados >= 5) {
            contadorLocal.necesitaDescanso = true;
          }
        }

        // Incrementar contador del equipo visitante
        if (partido.equipoVisitante) {
          const contadorVisitante = contadoresDescanso[partido.equipoVisitante.id];
          if (contadorVisitante) {
            contadorVisitante.juegosJugados++;
            if (contadorVisitante.juegosJugados >= 5) {
              contadorVisitante.necesitaDescanso = true;
            }
          }
        }
      }
    });
  }

  /**
   * Asigna campos y horarios a los partidos
   */
  private static asignarCamposYHorarios(jornadas: Jornada[], configuracion: ConfiguracionJornadas) {
    const camposActivos = configuracion.campos.filter(c => c.activo).sort((a, b) => a.orden - b.orden);
    const horariosActivos = configuracion.horarios.filter(h => h.activoPorDefecto).sort((a, b) => a.orden - b.orden);
    const horarioT1 = configuracion.horarios.find(h => h.nombre === 'T1');

    jornadas.forEach(jornada => {
      jornada.partidos.forEach((partido, index) => {
        // Asignar campo (rotación)
        const campo = camposActivos[index % camposActivos.length];
        partido.campo = campo;

        // Asignar horario
        let horario: Horario;
        
        if (index < horariosActivos.length * camposActivos.length) {
          // Usar horarios regulares
          const horarioIndex = Math.floor(index / camposActivos.length) % horariosActivos.length;
          horario = horariosActivos[horarioIndex];
        } else if (horarioT1) {
          // Overflow: usar T1
          horario = horarioT1;
        } else {
          // Fallback: usar primer horario
          horario = horariosActivos[0];
        }

        partido.horario = horario;
        partido.horaProgramada = horario.horaInicio;
      });
    });
  }

  /**
   * Obtiene equipos en descanso por jornada
   */
  private static obtenerEquiposEnDescanso(
    jornadas: Jornada[], 
    contadoresDescanso: { [equipoId: string]: ContadorDescanso }
  ): { [jornadaNumero: number]: string[] } {
    
    const equiposEnDescanso: { [jornadaNumero: number]: string[] } = {};
    
    jornadas.forEach(jornada => {
      const equiposJugando = new Set<string>();
      
      jornada.partidos.forEach(partido => {
        equiposJugando.add(partido.equipoLocal.id);
        if (partido.equipoVisitante) {
          equiposJugando.add(partido.equipoVisitante.id);
        }
      });

      const todosLosEquipos = Object.keys(contadoresDescanso);
      const equiposDescansando = todosLosEquipos.filter(equipoId => !equiposJugando.has(equipoId));
      
      if (equiposDescansando.length > 0) {
        equiposEnDescanso[jornada.numero] = equiposDescansando;
      }
    });

    return equiposEnDescanso;
  }

  /**
   * Genera estadísticas del calendario
   */
  private static generarEstadisticas(jornadas: Jornada[], configuracion: ConfiguracionJornadas) {
    const totalPartidos = jornadas.reduce((sum, j) => sum + j.partidos.length, 0);
    const balanceCampos: { [campoId: string]: number } = {};
    const balanceHorarios: { [horarioId: string]: number } = {};
    let jornadasConT1 = 0;

    configuracion.campos.forEach(c => balanceCampos[c.id] = 0);
    configuracion.horarios.forEach(h => balanceHorarios[h.id] = 0);

    jornadas.forEach(jornada => {
      let usaT1 = false;
      
      jornada.partidos.forEach(partido => {
        if (partido.campo) {
          balanceCampos[partido.campo.id]++;
        }
        if (partido.horario) {
          balanceHorarios[partido.horario.id]++;
          if (partido.horario.nombre === 'T1') {
            usaT1 = true;
          }
        }
      });

      if (usaT1) jornadasConT1++;
    });

    return {
      jornadasUsadas: jornadas.length,
      promedioPartidosPorJornada: totalPartidos / jornadas.length,
      jornadasConT1,
      balanceCampos,
      balanceHorarios
    };
  }
}