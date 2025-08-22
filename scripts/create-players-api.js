const fetch = require('node-fetch');

async function createPlayersViaAPI() {
  console.log('⚾ Creando jugadores vía API de administrador...\n');

  // Jugadores para UPICSA
  const jugadoresUPICSA = [
    { nombre: 'Carlos Martínez', numero_casaca: 1, posicion: 'Pitcher', equipo_nombre: 'upicsa' },
    { nombre: 'Luis García', numero_casaca: 2, posicion: 'Catcher', equipo_nombre: 'upicsa' },
    { nombre: 'Miguel Rodríguez', numero_casaca: 3, posicion: '1st Base', equipo_nombre: 'upicsa' },
    { nombre: 'Jorge López', numero_casaca: 4, posicion: '2nd Base', equipo_nombre: 'upicsa' },
    { nombre: 'Diego Hernández', numero_casaca: 5, posicion: '3rd Base', equipo_nombre: 'upicsa' },
    { nombre: 'Roberto Silva', numero_casaca: 6, posicion: 'Shortstop', equipo_nombre: 'upicsa' },
    { nombre: 'Fernando Morales', numero_casaca: 7, posicion: 'Left Field', equipo_nombre: 'upicsa' },
    { nombre: 'Antonio Vázquez', numero_casaca: 8, posicion: 'Center Field', equipo_nombre: 'upicsa' },
    { nombre: 'Ricardo Jiménez', numero_casaca: 9, posicion: 'Right Field', equipo_nombre: 'upicsa' }
  ];

  // Jugadores para ENCB
  const jugadoresENCB = [
    { nombre: 'Alejandro Ramírez', numero_casaca: 1, posicion: 'Pitcher', equipo_nombre: 'encb' },
    { nombre: 'Sebastián Torres', numero_casaca: 2, posicion: 'Catcher', equipo_nombre: 'encb' },
    { nombre: 'Gabriel Flores', numero_casaca: 3, posicion: '1st Base', equipo_nombre: 'encb' },
    { nombre: 'Andrés Mendoza', numero_casaca: 4, posicion: '2nd Base', equipo_nombre: 'encb' },
    { nombre: 'Daniel Castro', numero_casaca: 5, posicion: '3rd Base', equipo_nombre: 'encb' },
    { nombre: 'Pablo Guerrero', numero_casaca: 6, posicion: 'Shortstop', equipo_nombre: 'encb' },
    { nombre: 'Emilio Vargas', numero_casaca: 7, posicion: 'Left Field', equipo_nombre: 'encb' },
    { nombre: 'César Delgado', numero_casaca: 8, posicion: 'Center Field', equipo_nombre: 'encb' },
    { nombre: 'Manuel Ortega', numero_casaca: 9, posicion: 'Right Field', equipo_nombre: 'encb' }
  ];

  const todosLosJugadores = [...jugadoresUPICSA, ...jugadoresENCB];

  // Crear cada jugador
  for (const jugador of todosLosJugadores) {
    try {
      console.log(`Creando ${jugador.nombre} (#${jugador.numero_casaca}) para ${jugador.equipo_nombre.toUpperCase()}...`);
      
      const response = await fetch('http://localhost:3000/api/admin/jugadores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: jugador.nombre,
          numero_casaca: jugador.numero_casaca,
          posicion: jugador.posicion,
          equipo_nombre: jugador.equipo_nombre,
          activo: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ ${jugador.nombre} creado exitosamente`);
      } else {
        const error = await response.text();
        console.log(`❌ Error creando ${jugador.nombre}: ${response.status} - ${error}`);
      }
      
      // Pequeña pausa para evitar saturar la API
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.log(`❌ Error creando ${jugador.nombre}:`, error.message);
    }
  }

  console.log('\n🎉 ¡Proceso de creación completado!');
  console.log('📝 Verifica en el panel de administrador si los jugadores se crearon correctamente.');
}

createPlayersViaAPI();