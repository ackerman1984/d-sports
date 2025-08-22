/**
 * Coordinador Principal del Sistema de Calendario
 * 
 * Une todos los componentes para generar el calendario completo
 * incluyendo Round Robin, asignación de jornadas y persistencia en BD
 */

import { createClient } from '@/lib/supabase/client';
import { RoundRobinGenerator, Equipo, ConfiguracionCalendario } from './round-robin-generator';
import { ScheduleGenerator, ConfiguracionJornadas, Campo, Horario, SabadoEspecial } from './schedule-generator';

export interface ConfiguracionCompleta {
  // Información básica
  ligaId: string;
  temporadaId: string;
  nombre: string;
  
  // Fechas
  fechaInicio: Date;
  fechaFin: Date;
  playoffsInicio?: Date;
  
  // Configuración del torneo
  vueltas: number;
  maxJuegosPorSabado: number;
  alternarLocalVisitante: boolean;
  
  // Infraestructura
  campos: Campo[];
  horarios: Horario[];
  
  // Fechas especiales
  sabadosEspeciales: SabadoEspecial[];
  semanasFlexCada: number;
  
  // Equipos
  equipos: Equipo[];
}

export interface ResultadoCompleto {
  success: boolean;
  mensaje: string;
  calendario: {
    jornadas: number;
    partidos: number;
    temporadaId: string;
  };
  estadisticas: {
    roundRobin: any;
    jornadas: any;
  };
  errores: string[];
  warnings: string[];
}

/**
 * Coordinador Principal
 */
export class CalendarCoordinator {
  
  /**
   * Genera un calendario completo desde cero
   */
  static async generarCalendarioCompleto(configuracion: ConfiguracionCompleta): Promise<ResultadoCompleto> {
    console.log(`🎯 Iniciando generación de calendario completo...`);
    console.log(`   - Liga: ${configuracion.ligaId}`);
    console.log(`   - Temporada: ${configuracion.nombre}`);
    console.log(`   - Equipos: ${configuracion.equipos.length}`);
    console.log(`   - Período: ${configuracion.fechaInicio.toDateString()} - ${configuracion.fechaFin.toDateString()}`);

    const warnings: string[] = [];
    const errores: string[] = [];

    try {
      // 1. Validaciones previas
      const validacion = this.validarConfiguracion(configuracion);
      if (!validacion.valido) {
        return {
          success: false,
          mensaje: 'Configuración inválida',
          calendario: { jornadas: 0, partidos: 0, temporadaId: configuracion.temporadaId },
          estadisticas: { roundRobin: {}, jornadas: {} },
          errores: validacion.errores,
          warnings
        };
      }
      warnings.push(...validacion.warnings);

      // 2. Generar Round Robin
      console.log('\n📋 Paso 1: Generando Round Robin...');
      const configRoundRobin: ConfiguracionCalendario = {
        equipos: configuracion.equipos,
        vueltas: configuracion.vueltas,
        alternarLocalVisitante: configuracion.alternarLocalVisitante
      };

      const resultadoRoundRobin = RoundRobinGenerator.generar(configRoundRobin);
      
      // Validar resultado Round Robin
      if (!resultadoRoundRobin.rondas) {
        throw new Error('Error en generación Round Robin: No se generaron rondas');
      }
      
      const validacionRR = RoundRobinGenerator.validarCalendario(resultadoRoundRobin as any);
      if (!validacionRR.valido) {
        errores.push(...validacionRR.errores);
        throw new Error('Error en generación Round Robin');
      }

      // 3. Generar Jornadas
      console.log('\n📅 Paso 2: Asignando a jornadas...');
      const configJornadas: ConfiguracionJornadas = {
        fechaInicio: configuracion.fechaInicio,
        fechaFin: configuracion.fechaFin,
        campos: configuracion.campos,
        horarios: configuracion.horarios,
        maxJuegosPorSabado: configuracion.maxJuegosPorSabado,
        sabadosEspeciales: configuracion.sabadosEspeciales,
        semanasFlexCada: configuracion.semanasFlexCada
      };

      const resultadoJornadas = ScheduleGenerator.generar(resultadoRoundRobin.rondas, configJornadas);

      // 4. Persistir en base de datos
      console.log('\n💾 Paso 3: Guardando en base de datos...');
      await this.persistirCalendario(configuracion, resultadoJornadas);

      // 5. Registrar log
      await this.registrarLog(configuracion, resultadoRoundRobin, resultadoJornadas);

      console.log('\n🎉 ¡Calendario generado exitosamente!');

      if (!resultadoJornadas.jornadas) {
        throw new Error('Error en generación de jornadas: No se generaron jornadas');
      }

      return {
        success: true,
        mensaje: 'Calendario generado exitosamente',
        calendario: {
          jornadas: resultadoJornadas.jornadas.length,
          partidos: resultadoJornadas.jornadas.reduce((sum, j) => sum + j.partidos.length, 0),
          temporadaId: configuracion.temporadaId
        },
        estadisticas: {
          roundRobin: resultadoRoundRobin.estadisticas,
          jornadas: resultadoJornadas.estadisticas
        },
        errores,
        warnings
      };

    } catch (error) {
      console.error('❌ Error generando calendario:', error);
      
      errores.push(error instanceof Error ? error.message : 'Error desconocido');
      
      return {
        success: false,
        mensaje: 'Error generando calendario',
        calendario: { jornadas: 0, partidos: 0, temporadaId: configuracion.temporadaId },
        estadisticas: { roundRobin: {}, jornadas: {} },
        errores,
        warnings
      };
    }
  }

  /**
   * Valida la configuración antes de generar
   */
  private static validarConfiguracion(config: ConfiguracionCompleta): { 
    valido: boolean; 
    errores: string[]; 
    warnings: string[] 
  } {
    const errores: string[] = [];
    const warnings: string[] = [];

    // Validaciones básicas
    if (config.equipos.length < 2) {
      errores.push('Se necesitan al menos 2 equipos');
    }

    if (config.equipos.length > 50) {
      warnings.push(`${config.equipos.length} equipos es mucho. Considera dividir en divisiones.`);
    }

    if (config.fechaInicio >= config.fechaFin) {
      errores.push('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    const camposActivos = config.campos.filter(c => c.activo);
    if (camposActivos.length === 0) {
      errores.push('Se necesita al menos un campo activo');
    }

    const horariosActivos = config.horarios.filter(h => h.activoPorDefecto);
    if (horariosActivos.length === 0) {
      errores.push('Se necesita al menos un horario activo por defecto');
    }

    // Validar capacidad vs partidos estimados
    const partidosEstimados = (config.equipos.length * (config.equipos.length - 1) / 2) * config.vueltas;
    const capacidadPorSabado = Math.min(config.maxJuegosPorSabado, camposActivos.length * horariosActivos.length);
    
    const sabadosDisponibles = this.contarSabadosDisponibles(config.fechaInicio, config.fechaFin, config.sabadosEspeciales);
    const capacidadTotal = sabadosDisponibles * capacidadPorSabado;

    if (partidosEstimados > capacidadTotal) {
      warnings.push(`Partidos estimados (${partidosEstimados}) exceden capacidad (${capacidadTotal}). Se requerirá horario T1.`);
    }

    // Validar vueltas
    if (config.vueltas > 4) {
      warnings.push('Más de 4 vueltas puede hacer la temporada muy larga');
    }

    return {
      valido: errores.length === 0,
      errores,
      warnings
    };
  }

  /**
   * Cuenta sábados disponibles excluyendo feriados
   */
  private static contarSabadosDisponibles(
    fechaInicio: Date, 
    fechaFin: Date, 
    sabadosEspeciales: SabadoEspecial[]
  ): number {
    let contador = 0;
    const fecha = new Date(fechaInicio);
    
    // Ir al primer sábado
    while (fecha.getDay() !== 6) {
      fecha.setDate(fecha.getDate() + 1);
    }

    const feriados = sabadosEspeciales
      .filter(s => s.tipo === 'feriado')
      .map(s => s.fecha.toDateString());

    while (fecha <= fechaFin) {
      if (!feriados.includes(fecha.toDateString())) {
        contador++;
      }
      fecha.setDate(fecha.getDate() + 7);
    }

    return contador;
  }

  /**
   * Persiste el calendario en la base de datos
   */
  private static async persistirCalendario(
    configuracion: ConfiguracionCompleta, 
    resultadoJornadas: any
  ): Promise<void> {
    const supabase = createClient();

    try {
      // 1. Limpiar calendario anterior
      console.log('🧹 Limpiando calendario anterior...');
      
      await supabase
        .from('partidos_calendario')
        .delete()
        .eq('temporada_id', configuracion.temporadaId);

      await supabase
        .from('jornadas')
        .delete()
        .eq('temporada_id', configuracion.temporadaId);

      // 2. Insertar jornadas
      console.log('📅 Insertando jornadas...');
      
      const jornadasParaInsertar = resultadoJornadas.jornadas.map((jornada: any) => ({
        temporada_id: configuracion.temporadaId,
        numero_jornada: jornada.numero,
        fecha: jornada.fecha.toISOString().split('T')[0], // Solo fecha
        vuelta: jornada.vuelta,
        tipo: jornada.tipo,
        capacidad_maxima: jornada.capacidadMaxima,
        partidos_programados: jornada.partidos.length
      }));

      const { data: jornadasInsertadas, error: errorJornadas } = await supabase
        .from('jornadas')
        .insert(jornadasParaInsertar)
        .select();

      if (errorJornadas) {
        throw new Error(`Error insertando jornadas: ${errorJornadas.message}`);
      }

      console.log(`✅ ${jornadasInsertadas?.length} jornadas insertadas`);

      // 3. Insertar partidos
      console.log('🏟️ Insertando partidos...');
      
      const partidosParaInsertar: any[] = [];

      resultadoJornadas.jornadas.forEach((jornada: any, jornadaIndex: number) => {
        const jornadaId = jornadasInsertadas![jornadaIndex].id;

        jornada.partidos.forEach((partido: any) => {
          if (!partido.esBye) { // Solo insertar partidos reales
            partidosParaInsertar.push({
              jornada_id: jornadaId,
              temporada_id: configuracion.temporadaId,
              equipo_local_id: partido.equipoLocal.id,
              equipo_visitante_id: partido.equipoVisitante?.id || null,
              campo_id: partido.campo?.id || null,
              horario_id: partido.horario?.id || null,
              numero_partido: partido.numeroPartido,
              vuelta: partido.vuelta,
              es_bye: partido.esBye,
              estado: 'programado',
              fecha_programada: jornada.fecha.toISOString().split('T')[0],
              hora_programada: partido.horaProgramada || null
            });
          }
        });
      });

      if (partidosParaInsertar.length > 0) {
        const { data: partidosInsertados, error: errorPartidos } = await supabase
          .from('partidos_calendario')
          .insert(partidosParaInsertar)
          .select();

        if (errorPartidos) {
          throw new Error(`Error insertando partidos: ${errorPartidos.message}`);
        }

        console.log(`✅ ${partidosInsertados?.length} partidos insertados`);
      }

      // 4. Actualizar estado de temporada
      console.log('🔄 Actualizando estado de temporada...');
      
      const { error: errorTemporada } = await supabase
        .from('configuracion_temporada')
        .update({ 
          estado: 'activa',
          updated_at: new Date().toISOString()
        })
        .eq('id', configuracion.temporadaId);

      if (errorTemporada) {
        console.warn('⚠️ Error actualizando temporada:', errorTemporada.message);
      }

    } catch (error) {
      console.error('❌ Error persistiendo calendario:', error);
      throw error;
    }
  }

  /**
   * Registra log de la generación
   */
  private static async registrarLog(
    configuracion: ConfiguracionCompleta,
    resultadoRoundRobin: any,
    resultadoJornadas: any
  ): Promise<void> {
    const supabase = createClient();

    try {
      const logData = {
        temporada_id: configuracion.temporadaId,
        accion: 'generar',
        parametros: {
          equipos: configuracion.equipos.length,
          vueltas: configuracion.vueltas,
          fechas: {
            inicio: configuracion.fechaInicio,
            fin: configuracion.fechaFin
          },
          campos: configuracion.campos.length,
          horarios: configuracion.horarios.length
        },
        resultado: {
          jornadas: resultadoJornadas.jornadas.length,
          partidos: resultadoJornadas.jornadas.reduce((sum: number, j: any) => sum + j.partidos.length, 0),
          estadisticas: {
            roundRobin: resultadoRoundRobin.estadisticas,
            jornadas: resultadoJornadas.estadisticas
          }
        },
        tiempo_procesamiento: Date.now() // Simplificado
      };

      const { error } = await supabase
        .from('log_generacion_calendario')
        .insert(logData);

      if (error) {
        console.warn('⚠️ Error registrando log:', error.message);
      } else {
        console.log('📝 Log registrado exitosamente');
      }

    } catch (error) {
      console.warn('⚠️ Error en registro de log:', error);
    }
  }

  /**
   * Obtiene configuración desde base de datos
   */
  static async obtenerConfiguracionDesdeDB(temporadaId: string): Promise<ConfiguracionCompleta | null> {
    const supabase = createClient();

    try {
      // Obtener configuración de temporada
      const { data: temporada, error: errorTemporada } = await supabase
        .from('configuracion_temporada')
        .select(`
          *,
          liga:liga_id (
            id,
            nombre,
            codigo
          )
        `)
        .eq('id', temporadaId)
        .single();

      if (errorTemporada || !temporada) {
        throw new Error('Temporada no encontrada');
      }

      // Obtener equipos
      const { data: equipos, error: errorEquipos } = await supabase
        .from('equipos')
        .select('id, nombre, activo')
        .eq('liga_id', temporada.liga_id)
        .eq('activo', true);

      if (errorEquipos) {
        throw new Error('Error obteniendo equipos');
      }

      // Obtener campos
      const { data: campos, error: errorCampos } = await supabase
        .from('campos')
        .select('*')
        .eq('liga_id', temporada.liga_id);

      if (errorCampos) {
        throw new Error('Error obteniendo campos');
      }

      // Obtener horarios
      const { data: horarios, error: errorHorarios } = await supabase
        .from('horarios')
        .select('*')
        .eq('liga_id', temporada.liga_id);

      if (errorHorarios) {
        throw new Error('Error obteniendo horarios');
      }

      // Obtener sábados especiales
      const { data: sabadosEspeciales, error: errorSabados } = await supabase
        .from('sabados_especiales')
        .select('*')
        .eq('temporada_id', temporadaId);

      const configuracion: ConfiguracionCompleta = {
        ligaId: temporada.liga_id,
        temporadaId: temporada.id,
        nombre: temporada.nombre,
        fechaInicio: new Date(temporada.fecha_inicio),
        fechaFin: new Date(temporada.fecha_fin),
        playoffsInicio: temporada.playoffs_inicio ? new Date(temporada.playoffs_inicio) : undefined,
        vueltas: temporada.vueltas_programadas,
        maxJuegosPorSabado: temporada.max_juegos_por_sabado,
        alternarLocalVisitante: true, // Valor por defecto
        campos: campos || [],
        horarios: horarios || [],
        sabadosEspeciales: (sabadosEspeciales || []).map(s => ({
          fecha: new Date(s.fecha),
          tipo: s.tipo as any,
          descripcion: s.descripcion
        })),
        semanasFlexCada: 4, // Valor por defecto
        equipos: equipos || []
      };

      return configuracion;

    } catch (error) {
      console.error('Error obteniendo configuración:', error);
      return null;
    }
  }
}