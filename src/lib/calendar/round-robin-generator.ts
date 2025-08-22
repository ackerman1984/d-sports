/**
 * Generador de Calendario Round Robin - Fase 1
 * 
 * Sistema automático para generar calendarios de liga de béisbol
 * con rotación equitativa y manejo de equipos impares
 */

export interface Equipo {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface Partido {
  equipoLocal: Equipo;
  equipoVisitante: Equipo | null; // null para BYE
  vuelta: number;
  ronda: number;
  esBye: boolean;
}

export interface Ronda {
  numero: number;
  vuelta: number;
  partidos: Partido[];
}

export interface ConfiguracionCalendario {
  equipos: Equipo[];
  vueltas: number;
  alternarLocalVisitante: boolean; // Alternar local/visitante entre vueltas
}

export interface ResultadoGeneracion {
  rondas: Ronda[];
  totalPartidos: number;
  totalJornadas: number;
  equiposConBye: string[];
  estadisticas: {
    partidosPorEquipo: { [equipoId: string]: number };
    partidosLocalPorEquipo: { [equipoId: string]: number };
    partidosVisitantePorEquipo: { [equipoId: string]: number };
    byesPorEquipo: { [equipoId: string]: number };
  };
}

export interface ResultadoRoundRobin {
  exito: boolean;
  rondas?: Ronda[];
  error?: string;
  totalPartidos?: number;
  totalJornadas?: number;
  equiposConBye?: string[];
  estadisticas?: {
    partidosPorEquipo: { [equipoId: string]: number };
    partidosLocalPorEquipo: { [equipoId: string]: number };
    partidosVisitantePorEquipo: { [equipoId: string]: number };
    byesPorEquipo: { [equipoId: string]: number };
  };
}

/**
 * Generador principal de calendario Round Robin
 */
export class RoundRobinGenerator {
  
  /**
   * Genera el calendario completo para una liga
   */
  static generar(configuracion: ConfiguracionCalendario): ResultadoRoundRobin {
    try {
      const { equipos, vueltas, alternarLocalVisitante } = configuracion;
      
      if (equipos.length < 2) {
        return {
          exito: false,
          error: 'Se necesitan al menos 2 equipos para generar un calendario'
        };
      }

    console.log(`🏟️ Generando calendario Round Robin:`);
    console.log(`   - Equipos: ${equipos.length}`);
    console.log(`   - Vueltas: ${vueltas}`);
    console.log(`   - Equipos impares: ${equipos.length % 2 === 1 ? 'Sí (se agregará BYE)' : 'No'}`);

    const todasLasRondas: Ronda[] = [];
    const estadisticas = this.inicializarEstadisticas(equipos);
    
    // Generar cada vuelta
    for (let vuelta = 1; vuelta <= vueltas; vuelta++) {
      console.log(`\n📅 Generando vuelta ${vuelta}...`);
      
      const rondasVuelta = this.generarVuelta(
        equipos, 
        vuelta, 
        alternarLocalVisitante && vuelta % 2 === 0
      );
      
      // Actualizar estadísticas
      this.actualizarEstadisticas(rondasVuelta, estadisticas);
      
      todasLasRondas.push(...rondasVuelta);
      console.log(`✅ Vuelta ${vuelta}: ${rondasVuelta.length} rondas generadas`);
    }

      const totalPartidos = this.contarPartidos(todasLasRondas);
      const totalJornadas = todasLasRondas.length;
      const equiposConBye = this.obtenerEquiposConBye(todasLasRondas);

      console.log(`\n🎉 Calendario generado exitosamente:`);
      console.log(`   - Total rondas: ${totalJornadas}`);
      console.log(`   - Total partidos: ${totalPartidos}`);
      console.log(`   - Equipos con BYE: ${equiposConBye.length}`);

      return {
        exito: true,
        rondas: todasLasRondas,
        totalPartidos,
        totalJornadas,
        equiposConBye,
        estadisticas
      };
      
    } catch (error) {
      console.error('❌ Error generando calendario Round Robin:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido generando calendario'
      };
    }
  }

  /**
   * Genera una vuelta completa (todos contra todos)
   */
  private static generarVuelta(
    equiposOriginales: Equipo[], 
    numeroVuelta: number,
    invertirLocalVisitante: boolean = false
  ): Ronda[] {
    
    // Clonar equipos para no modificar el original
    const equipos = [...equiposOriginales];
    const esImpar = equipos.length % 2 === 1;
    
    // Agregar BYE para número impar de equipos
    if (esImpar) {
      equipos.push({
        id: 'BYE',
        nombre: 'BYE',
        activo: true
      });
    }

    const rondasPorVuelta = equipos.length - 1;
    const rondas: Ronda[] = [];

    // Algoritmo Round Robin clásico con rotación
    for (let ronda = 0; ronda < rondasPorVuelta; ronda++) {
      const partidosRonda: Partido[] = [];

      // Generar emparejamientos para esta ronda
      for (let i = 0; i < equipos.length / 2; i++) {
        const equipo1 = equipos[i];
        const equipo2 = equipos[equipos.length - 1 - i];

        // Saltar si uno de los equipos es BYE
        if (equipo1.id === 'BYE' || equipo2.id === 'BYE') {
          const equipoReal = equipo1.id === 'BYE' ? equipo2 : equipo1;
          
          // Agregar BYE (descanso)
          partidosRonda.push({
            equipoLocal: equipoReal,
            equipoVisitante: null,
            vuelta: numeroVuelta,
            ronda: ronda + 1,
            esBye: true
          });
        } else {
          // Determinar local y visitante
          let equipoLocal = equipo1;
          let equipoVisitante = equipo2;

          // Alternar local/visitante según configuración
          if (invertirLocalVisitante) {
            equipoLocal = equipo2;
            equipoVisitante = equipo1;
          }

          partidosRonda.push({
            equipoLocal,
            equipoVisitante,
            vuelta: numeroVuelta,
            ronda: ronda + 1,
            esBye: false
          });
        }
      }

      rondas.push({
        numero: ronda + 1,
        vuelta: numeroVuelta,
        partidos: partidosRonda
      });

      // Rotar equipos (el primero se queda fijo, los demás rotan)
      if (equipos.length > 2) {
        const equipoRotante = equipos.splice(equipos.length - 1, 1)[0];
        equipos.splice(1, 0, equipoRotante);
      }
    }

    return rondas;
  }

  /**
   * Balanceador de Local/Visitante
   * Asegura que cada equipo tenga un número equilibrado de juegos en casa
   */
  static balancearLocalVisitante(rondas: Ronda[]): Ronda[] {
    const contadorLocal: { [equipoId: string]: number } = {};
    const contadorVisitante: { [equipoId: string]: number } = {};

    // Contar actuales
    rondas.forEach(ronda => {
      ronda.partidos.forEach(partido => {
        if (!partido.esBye && partido.equipoVisitante) {
          contadorLocal[partido.equipoLocal.id] = (contadorLocal[partido.equipoLocal.id] || 0) + 1;
          contadorVisitante[partido.equipoVisitante.id] = (contadorVisitante[partido.equipoVisitante.id] || 0) + 1;
        }
      });
    });

    // Identificar desequilibrios y corregir
    rondas.forEach(ronda => {
      ronda.partidos.forEach(partido => {
        if (!partido.esBye && partido.equipoVisitante) {
          const localCount = contadorLocal[partido.equipoLocal.id] || 0;
          const visitanteCount = contadorVisitante[partido.equipoVisitante.id] || 0;
          
          const localCountOponente = contadorLocal[partido.equipoVisitante.id] || 0;
          const visitanteCountOponente = contadorVisitante[partido.equipoLocal.id] || 0;

          // Si hay gran desequilibrio, intercambiar
          if (localCount - localCountOponente > 2 || visitanteCount - visitanteCountOponente > 2) {
            // Intercambiar local y visitante
            const temp = partido.equipoLocal;
            partido.equipoLocal = partido.equipoVisitante!;
            partido.equipoVisitante = temp;

            // Actualizar contadores
            contadorLocal[partido.equipoLocal.id]++;
            contadorVisitante[partido.equipoVisitante.id]++;
            contadorLocal[temp.id]--;
            contadorVisitante[temp.id]--;
          }
        }
      });
    });

    return rondas;
  }

  /**
   * Inicializar estadísticas
   */
  private static inicializarEstadisticas(equipos: Equipo[]) {
    const estadisticas = {
      partidosPorEquipo: {} as { [equipoId: string]: number },
      partidosLocalPorEquipo: {} as { [equipoId: string]: number },
      partidosVisitantePorEquipo: {} as { [equipoId: string]: number },
      byesPorEquipo: {} as { [equipoId: string]: number }
    };

    equipos.forEach(equipo => {
      estadisticas.partidosPorEquipo[equipo.id] = 0;
      estadisticas.partidosLocalPorEquipo[equipo.id] = 0;
      estadisticas.partidosVisitantePorEquipo[equipo.id] = 0;
      estadisticas.byesPorEquipo[equipo.id] = 0;
    });

    return estadisticas;
  }

  /**
   * Actualizar estadísticas con las rondas generadas
   */
  private static actualizarEstadisticas(rondas: Ronda[], estadisticas: any) {
    rondas.forEach(ronda => {
      ronda.partidos.forEach(partido => {
        if (partido.esBye) {
          estadisticas.byesPorEquipo[partido.equipoLocal.id]++;
        } else if (partido.equipoVisitante) {
          estadisticas.partidosPorEquipo[partido.equipoLocal.id]++;
          estadisticas.partidosPorEquipo[partido.equipoVisitante.id]++;
          estadisticas.partidosLocalPorEquipo[partido.equipoLocal.id]++;
          estadisticas.partidosVisitantePorEquipo[partido.equipoVisitante.id]++;
        }
      });
    });
  }

  /**
   * Contar total de partidos (sin BYEs)
   */
  private static contarPartidos(rondas: Ronda[]): number {
    return rondas.reduce((total, ronda) => {
      return total + ronda.partidos.filter(p => !p.esBye).length;
    }, 0);
  }

  /**
   * Obtener equipos que tienen BYE
   */
  private static obtenerEquiposConBye(rondas: Ronda[]): string[] {
    const equiposConBye = new Set<string>();
    
    rondas.forEach(ronda => {
      ronda.partidos.forEach(partido => {
        if (partido.esBye) {
          equiposConBye.add(partido.equipoLocal.id);
        }
      });
    });

    return Array.from(equiposConBye);
  }

  /**
   * Validar que el calendario generado es correcto
   */
  static validarCalendario(resultado: ResultadoGeneracion): { valido: boolean; errores: string[] } {
    const errores: string[] = [];
    const { rondas, estadisticas } = resultado;

    // 1. Verificar que cada equipo juegue contra todos los demás el número correcto de veces
    const equiposIds = Object.keys(estadisticas.partidosPorEquipo);
    const vueltas = Math.max(...rondas.map(r => r.vuelta));

    equiposIds.forEach(equipoId => {
      const partidosEsperados = (equiposIds.length - 1) * vueltas;
      const partidosReales = estadisticas.partidosPorEquipo[equipoId];
      
      if (partidosReales !== partidosEsperados) {
        errores.push(`Equipo ${equipoId}: esperados ${partidosEsperados} partidos, tiene ${partidosReales}`);
      }
    });

    // 2. Verificar balance local/visitante (diferencia máxima de 1)
    equiposIds.forEach(equipoId => {
      const local = estadisticas.partidosLocalPorEquipo[equipoId];
      const visitante = estadisticas.partidosVisitantePorEquipo[equipoId];
      
      if (Math.abs(local - visitante) > 1) {
        errores.push(`Equipo ${equipoId}: desequilibrio local/visitante (${local}/${visitante})`);
      }
    });

    // 3. Verificar que no hay partidos duplicados
    const partidosUnicos = new Set<string>();
    rondas.forEach(ronda => {
      ronda.partidos.forEach(partido => {
        if (!partido.esBye && partido.equipoVisitante) {
          const key1 = `${partido.equipoLocal.id}-${partido.equipoVisitante.id}-${partido.vuelta}`;
          const key2 = `${partido.equipoVisitante.id}-${partido.equipoLocal.id}-${partido.vuelta}`;
          
          if (partidosUnicos.has(key1) || partidosUnicos.has(key2)) {
            errores.push(`Partido duplicado: ${partido.equipoLocal.nombre} vs ${partido.equipoVisitante.nombre} en vuelta ${partido.vuelta}`);
          }
          
          partidosUnicos.add(key1);
        }
      });
    });

    return {
      valido: errores.length === 0,
      errores
    };
  }
}

/**
 * Utilidades para testing y debugging
 */
export class CalendarioUtils {
  
  /**
   * Generar equipos de prueba
   */
  static generarEquiposPrueba(cantidad: number): Equipo[] {
    const equipos: Equipo[] = [];
    
    for (let i = 1; i <= cantidad; i++) {
      equipos.push({
        id: `equipo_${i}`,
        nombre: `Equipo ${i}`,
        activo: true
      });
    }
    
    return equipos;
  }

  /**
   * Imprimir calendario de forma legible
   */
  static imprimirCalendario(resultado: ResultadoGeneracion): void {
    console.log('\n📋 CALENDARIO GENERADO\n');
    
    resultado.rondas.forEach(ronda => {
      console.log(`📅 VUELTA ${ronda.vuelta} - RONDA ${ronda.numero}`);
      
      ronda.partidos.forEach((partido, index) => {
        if (partido.esBye) {
          console.log(`   ${index + 1}. ${partido.equipoLocal.nombre} - DESCANSO (BYE)`);
        } else {
          console.log(`   ${index + 1}. ${partido.equipoLocal.nombre} vs ${partido.equipoVisitante?.nombre}`);
        }
      });
      
      console.log('');
    });

    // Estadísticas
    console.log('📊 ESTADÍSTICAS');
    Object.entries(resultado.estadisticas.partidosPorEquipo).forEach(([equipoId, partidos]) => {
      const local = resultado.estadisticas.partidosLocalPorEquipo[equipoId];
      const visitante = resultado.estadisticas.partidosVisitantePorEquipo[equipoId];
      const byes = resultado.estadisticas.byesPorEquipo[equipoId];
      
      console.log(`   ${equipoId}: ${partidos} partidos (${local}L/${visitante}V) + ${byes} BYEs`);
    });
  }
}