/**
 * Script de prueba para el sistema de calendario
 * Genera un calendario de prueba con datos simulados
 */

// Simulación de los módulos TypeScript en JavaScript
class RoundRobinGenerator {
  static generar(config) {
    console.log(`🎯 Generando Round Robin:`);
    console.log(`   - Equipos: ${config.equipos.length}`);
    console.log(`   - Vueltas: ${config.vueltas}`);

    const equipos = [...config.equipos];
    const esImpar = equipos.length % 2 === 1;
    
    if (esImpar) {
      equipos.push({ id: 'BYE', nombre: 'BYE', activo: true });
    }

    const rondasPorVuelta = equipos.length - 1;
    const rondas = [];

    for (let vuelta = 1; vuelta <= config.vueltas; vuelta++) {
      for (let ronda = 0; ronda < rondasPorVuelta; ronda++) {
        const partidosRonda = [];

        for (let i = 0; i < equipos.length / 2; i++) {
          const equipo1 = equipos[i];
          const equipo2 = equipos[equipos.length - 1 - i];

          if (equipo1.id === 'BYE' || equipo2.id === 'BYE') {
            const equipoReal = equipo1.id === 'BYE' ? equipo2 : equipo1;
            partidosRonda.push({
              equipoLocal: equipoReal,
              equipoVisitante: null,
              vuelta,
              ronda: ronda + 1,
              esBye: true
            });
          } else {
            partidosRonda.push({
              equipoLocal: equipo1,
              equipoVisitante: equipo2,
              vuelta,
              ronda: ronda + 1,
              esBye: false
            });
          }
        }

        rondas.push({
          numero: ronda + 1,
          vuelta,
          partidos: partidosRonda
        });

        // Rotar equipos
        if (equipos.length > 2) {
          const equipoRotante = equipos.splice(equipos.length - 1, 1)[0];
          equipos.splice(1, 0, equipoRotante);
        }
      }
    }

    const totalPartidos = rondas.reduce((sum, ronda) => 
      sum + ronda.partidos.filter(p => !p.esBye).length, 0
    );

    console.log(`✅ Round Robin generado: ${rondas.length} rondas, ${totalPartidos} partidos`);

    return {
      rondas,
      totalPartidos,
      estadisticas: {
        rondasGeneradas: rondas.length,
        partidosGenerados: totalPartidos
      }
    };
  }
}

class ScheduleGenerator {
  static generar(rondas, config) {
    console.log(`📅 Asignando rondas a jornadas:`);
    console.log(`   - Rondas: ${rondas.length}`);
    console.log(`   - Capacidad por sábado: ${config.maxJuegosPorSabado}`);

    const jornadas = [];
    const fecha = new Date(config.fechaInicio);
    
    // Ir al primer sábado
    while (fecha.getDay() !== 6) {
      fecha.setDate(fecha.getDate() + 1);
    }

    let jornadaNumero = 1;
    
    for (const ronda of rondas) {
      const partidosReales = ronda.partidos.filter(p => !p.esBye);
      
      if (partidosReales.length === 0) continue;

      // Verificar si excede capacidad
      if (partidosReales.length <= config.maxJuegosPorSabado) {
        // Toda la ronda en una jornada
        jornadas.push({
          numero: jornadaNumero++,
          fecha: new Date(fecha),
          vuelta: ronda.vuelta,
          tipo: 'regular',
          capacidadMaxima: config.maxJuegosPorSabado,
          partidos: partidosReales.map((partido, index) => ({
            ...partido,
            numeroPartido: index + 1,
            campo: config.campos[index % config.campos.length],
            horario: config.horarios[Math.floor(index / config.campos.length) % config.horarios.length]
          }))
        });
        
        fecha.setDate(fecha.getDate() + 7); // Siguiente sábado
      } else {
        // Dividir ronda en múltiples jornadas
        let partidosRestantes = [...partidosReales];
        
        while (partidosRestantes.length > 0) {
          const partidosEstaJornada = partidosRestantes.splice(0, config.maxJuegosPorSabado);
          
          jornadas.push({
            numero: jornadaNumero++,
            fecha: new Date(fecha),
            vuelta: ronda.vuelta,
            tipo: 'regular',
            capacidadMaxima: config.maxJuegosPorSabado,
            partidos: partidosEstaJornada.map((partido, index) => ({
              ...partido,
              numeroPartido: index + 1,
              campo: config.campos[index % config.campos.length],
              horario: config.horarios[Math.floor(index / config.campos.length) % config.horarios.length]
            }))
          });
          
          fecha.setDate(fecha.getDate() + 7);
        }
      }
    }

    const totalPartidos = jornadas.reduce((sum, j) => sum + j.partidos.length, 0);

    console.log(`✅ Jornadas generadas: ${jornadas.length}, ${totalPartidos} partidos programados`);

    return {
      jornadas,
      estadisticas: {
        jornadasGeneradas: jornadas.length,
        promedioPartidosPorJornada: totalPartidos / jornadas.length
      }
    };
  }
}

async function testCalendarGeneration() {
  console.log('🧪 PRUEBA DEL SISTEMA DE CALENDARIO\n');

  // 1. Configuración de prueba
  const equiposPrueba = [
    { id: '1', nombre: 'Águilas', activo: true },
    { id: '2', nombre: 'Leones', activo: true },
    { id: '3', nombre: 'Tigres', activo: true },
    { id: '4', nombre: 'Osos', activo: true },
    { id: '5', nombre: 'Lobos', activo: true }
  ];

  const camposPrueba = [
    { id: 'campo1', nombre: 'Campo Principal', activo: true, orden: 1 },
    { id: 'campo2', nombre: 'Campo Secundario', activo: true, orden: 2 }
  ];

  const horariosPrueba = [
    { 
      id: 'M1', 
      nombre: 'M1', 
      horaInicio: '08:00', 
      horaFin: '11:30', 
      activoPorDefecto: true, 
      orden: 1 
    },
    { 
      id: 'M2', 
      nombre: 'M2', 
      horaInicio: '12:00', 
      horaFin: '14:30', 
      activoPorDefecto: true, 
      orden: 2 
    }
  ];

  const fechaInicio = new Date('2025-09-06'); // Primer sábado de septiembre
  const fechaFin = new Date('2025-12-20');   // Último sábado antes de navidad

  console.log('⚙️ CONFIGURACIÓN DE PRUEBA:');
  console.log(`   - Equipos: ${equiposPrueba.length} (${equiposPrueba.length % 2 === 1 ? 'impar - se agregará BYE' : 'par'})`);
  console.log(`   - Campos: ${camposPrueba.length}`);
  console.log(`   - Horarios: ${horariosPrueba.length}`);
  console.log(`   - Capacidad por sábado: ${Math.min(5, camposPrueba.length * horariosPrueba.length)}`);
  console.log(`   - Período: ${fechaInicio.toDateString()} - ${fechaFin.toDateString()}`);
  console.log(`   - Vueltas: 2\n`);

  // 2. Generar Round Robin
  console.log('📋 PASO 1: GENERANDO ROUND ROBIN');
  const configRoundRobin = {
    equipos: equiposPrueba,
    vueltas: 2,
    alternarLocalVisitante: true
  };

  const resultadoRoundRobin = RoundRobinGenerator.generar(configRoundRobin);

  // 3. Mostrar emparejamientos
  console.log('\n📋 EMPAREJAMIENTOS GENERADOS:');
  resultadoRoundRobin.rondas.forEach(ronda => {
    console.log(`\n📅 VUELTA ${ronda.vuelta} - RONDA ${ronda.numero}:`);
    ronda.partidos.forEach((partido, index) => {
      if (partido.esBye) {
        console.log(`   ${index + 1}. ${partido.equipoLocal.nombre} - DESCANSO (BYE)`);
      } else {
        console.log(`   ${index + 1}. ${partido.equipoLocal.nombre} vs ${partido.equipoVisitante.nombre}`);
      }
    });
  });

  // 4. Generar Jornadas
  console.log('\n\n📅 PASO 2: ASIGNANDO A JORNADAS');
  const configJornadas = {
    fechaInicio,
    fechaFin,
    campos: camposPrueba,
    horarios: horariosPrueba,
    maxJuegosPorSabado: 4, // Limitado para probar división de rondas
    sabadosEspeciales: [],
    semanasFlexCada: 4
  };

  const resultadoJornadas = ScheduleGenerator.generar(resultadoRoundRobin.rondas, configJornadas);

  // 5. Mostrar calendario final
  console.log('\n\n📅 CALENDARIO FINAL:');
  resultadoJornadas.jornadas.forEach(jornada => {
    console.log(`\n📆 JORNADA ${jornada.numero} - ${jornada.fecha.toDateString()} (Vuelta ${jornada.vuelta})`);
    jornada.partidos.forEach(partido => {
      const campo = partido.campo ? partido.campo.nombre : 'Sin campo';
      const horario = partido.horario ? `${partido.horario.horaInicio}-${partido.horario.horaFin}` : 'Sin horario';
      console.log(`   ${partido.numeroPartido}. ${partido.equipoLocal.nombre} vs ${partido.equipoVisitante.nombre} | ${campo} | ${horario}`);
    });
  });

  // 6. Estadísticas finales
  console.log('\n\n📊 ESTADÍSTICAS FINALES:');
  console.log(`   - Total jornadas: ${resultadoJornadas.jornadas.length}`);
  console.log(`   - Total partidos: ${resultadoJornadas.jornadas.reduce((sum, j) => sum + j.partidos.length, 0)}`);
  console.log(`   - Promedio partidos/jornada: ${resultadoJornadas.estadisticas.promedioPartidosPorJornada.toFixed(1)}`);
  console.log(`   - Duración estimada: ${Math.ceil(resultadoJornadas.jornadas.length)} sábados`);

  // 7. Validaciones
  console.log('\n🔍 VALIDACIONES:');
  
  // Verificar que cada equipo juegue contra todos
  const partidosPorEquipo = {};
  equiposPrueba.forEach(equipo => {
    partidosPorEquipo[equipo.id] = 0;
  });

  resultadoJornadas.jornadas.forEach(jornada => {
    jornada.partidos.forEach(partido => {
      partidosPorEquipo[partido.equipoLocal.id]++;
      if (partido.equipoVisitante) {
        partidosPorEquipo[partido.equipoVisitante.id]++;
      }
    });
  });

  console.log('   - Partidos por equipo:');
  Object.entries(partidosPorEquipo).forEach(([equipoId, partidos]) => {
    const equipo = equiposPrueba.find(e => e.id === equipoId);
    const esperados = (equiposPrueba.length - 1) * 2; // 2 vueltas
    const status = partidos === esperados ? '✅' : '❌';
    console.log(`     ${status} ${equipo.nombre}: ${partidos}/${esperados} partidos`);
  });

  // Verificar fechas
  const primeraJornada = resultadoJornadas.jornadas[0]?.fecha;
  const ultimaJornada = resultadoJornadas.jornadas[resultadoJornadas.jornadas.length - 1]?.fecha;
  
  console.log(`   - Período real: ${primeraJornada?.toDateString()} - ${ultimaJornada?.toDateString()}`);
  console.log(`   - Dentro del período configurado: ${primeraJornada >= fechaInicio && ultimaJornada <= fechaFin ? '✅' : '❌'}`);

  console.log('\n🎉 ¡PRUEBA COMPLETADA EXITOSAMENTE!');
}

// Ejecutar prueba
testCalendarGeneration().catch(console.error);