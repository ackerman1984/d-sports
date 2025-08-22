'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Player {
  id: string;
  nombre: string;
  numero: number;
  posicion: string;
}

interface GameData {
  id: string;
  fecha: string;
  equipo_local: { nombre: string; id: string };
  equipo_visitante: { nombre: string; id: string };
  lugar: string;
  entrada_actual: number;
  equipo_bateando: 'local' | 'visitante';
  temporada: string;
  liga: { nombre: string; };
}

interface InningData {
  [jugadorId: string]: {
    [entrada: number]: {
      accion: string;
      bases: number[];
      carrera: boolean;
      detalle?: string;
    };
  };
}

interface TeamScore {
  [entrada: number]: number;
}

interface BaserunnerState {
  first: boolean;
  second: boolean;
  third: boolean;
  home: boolean;
}

interface GameState {
  strikes: number;
  balls: number;
  outs: number;
  activeRunners: number; // Número de jugadores en bases
}

// Posiciones de béisbol disponibles
const BASEBALL_POSITIONS = [
  { code: 'P', name: 'Lanzador (Pitcher)', number: 1 },
  { code: 'C', name: 'Receptor (Catcher)', number: 2 },
  { code: '1B', name: 'Primera base', number: 3 },
  { code: '2B', name: 'Segunda base', number: 4 },
  { code: '3B', name: 'Tercera base', number: 5 },
  { code: 'SS', name: 'Campocorto (Shortstop)', number: 6 },
  { code: 'JI', name: 'Jardinero izquierdo', number: 7 },
  { code: 'JC', name: 'Jardinero central', number: 8 },
  { code: 'JD', name: 'Jardinero derecho', number: 9 }
];

export default function ScoreGameInterface({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [playersLocal, setPlayersLocal] = useState<Player[]>([]);
  const [playersVisitante, setPlayersVisitante] = useState<Player[]>([]);
  const [inningData, setInningData] = useState<InningData>({});
  const [scoreLocal, setScoreLocal] = useState<TeamScore>({});
  const [scoreVisitante, setScoreVisitante] = useState<TeamScore>({});
  const [currentPlayer, setCurrentPlayer] = useState<string | null>(null);
  const [currentInning, setCurrentInning] = useState(1);
  const [currentTeam, setCurrentTeam] = useState<'local' | 'visitante'>('visitante');
  const [runners, setRunners] = useState<BaserunnerState>({ first: false, second: false, third: false, home: false });
  const [gameState, setGameState] = useState<GameState>({ strikes: 0, balls: 0, outs: 0, activeRunners: 0 });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeQuadrants, setActiveQuadrants] = useState<string[]>([]);
  const [playerStats, setPlayerStats] = useState<{[key: string]: any}>({});
  const [selectedPlayers, setSelectedPlayers] = useState<{[position: number]: Player | null}>({});
  const [selectedPositions, setSelectedPositions] = useState<{[lineupPosition: number]: string}>({});
  const [dropdownOpen, setDropdownOpen] = useState<number | string | null>(null);
  const [lastPitchCount, setLastPitchCount] = useState(0);
  const processingAutoAction = useRef(false);

  useEffect(() => {
    fetchGameData();
  }, [gameId]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = () => {
      setDropdownOpen(null);
    };

    if (dropdownOpen !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [dropdownOpen]);

  const fetchGameData = async () => {
    try {
      console.log('🎮 Cargando datos del juego:', gameId);
      const response = await fetch(`/api/anotador/game-data/${gameId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error en respuesta:', errorText);
        throw new Error(`Error cargando datos del juego: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ Datos del juego cargados:', data);
      
      setGameData({
        id: data.id,
        fecha: data.fecha,
        equipo_local: data.equipo_local,
        equipo_visitante: data.equipo_visitante,
        lugar: data.lugar || 'Campo TBD',
        entrada_actual: 1,
        equipo_bateando: 'visitante',
        temporada: data.temporada?.nombre || data.temporada || '2024',
        liga: { nombre: data.liga?.nombre || 'Liga Béisbol' }
      });
      
      setPlayersLocal(data.jugadores_local || []);
      setPlayersVisitante(data.jugadores_visitante || []);
      
      // Inicializar marcadores
      const initScore = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0};
      setScoreLocal(initScore);
      setScoreVisitante(initScore);
      
    } catch (error) {
      console.error('❌ Error cargando datos del juego:', error);
      setError('Error cargando datos del juego');
    }
  };

  const handleCellClick = (playerId: string, inning: number) => {
    setCurrentPlayer(playerId);
    setCurrentInning(inning);
    
    // Mensaje visual para confirmar selección
    const player = getCurrentPlayers().find(p => p.id === playerId);
    if (player) {
      setSuccessMessage(`Jugador seleccionado: ${player.nombre} - Entrada ${inning}`);
      setTimeout(() => setSuccessMessage(''), 2000);
    }
  };

  const getCurrentPlayerInfo = () => {
    if (!currentPlayer) return null;
    return getCurrentPlayers().find(p => p.id === currentPlayer);
  };

  const getCurrentPlayerPosition = () => {
    if (!currentPlayer) return null;
    const players = getCurrentPlayers();
    const playerIndex = players.findIndex(p => p.id === currentPlayer);
    return playerIndex >= 0 ? playerIndex : null;
  };

  const handleQuickAction = async (action: string) => {
    if (!currentPlayer) {
      setError('Selecciona un jugador primero');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      let carrera = false;
      let carrerasTotal = 0; // Para contar total de carreras en HR
      let rbis = 0; // Carreras impulsadas por el bateador
      let newGameState = { ...gameState };
      let newRunners = { ...runners };
      
      // Lógica automática por acción
      switch (action) {
        case 'K':
        case 'KP':
        case 'O':
          newGameState.strikes = 0;
          newGameState.balls = 0;
          newGameState.outs = Math.min(newGameState.outs + 1, 3);
          break;
        case 'BB':
          newGameState.balls = 0;
          newGameState.strikes = 0;
          if (newRunners.third) carrera = true;
          newRunners = { first: true, second: newRunners.first, third: newRunners.second, home: false };
          break;
        case '1B':
        case 'H1':
          // Calcular RBIs - corredores que anotan desde 3ra y 2da
          if (newRunners.third) { carrera = true; rbis++; }
          if (newRunners.second) { carrera = true; rbis++; }
          newRunners = { first: true, second: false, third: newRunners.first, home: false };
          break;
        case '2B':
        case 'H2':
          // Calcular RBIs - todos los corredores anotan excepto desde 1ra que va a 3ra
          if (newRunners.third) { carrera = true; rbis++; }
          if (newRunners.second) { carrera = true; rbis++; }
          if (newRunners.first) { carrera = true; rbis++; }
          newRunners = { first: false, second: true, third: false, home: false };
          break;
        case '3B':
        case 'H3':
          // Calcular RBIs - todos los corredores en base anotan
          if (newRunners.third) { carrera = true; rbis++; }
          if (newRunners.second) { carrera = true; rbis++; }
          if (newRunners.first) { carrera = true; rbis++; }
          newRunners = { first: false, second: false, third: true, home: false };
          break;
        case 'HR':
          // DEBUG: Mostrar estado antes del HR
          console.log('🏟️ Estado bases antes del HR:', { 
            primera: newRunners.first, 
            segunda: newRunners.second, 
            tercera: newRunners.third 
          });
          
          // Calcular RBIs - todos los corredores en base (NO cuenta el bateador)
          if (newRunners.first) rbis++;
          if (newRunners.second) rbis++;
          if (newRunners.third) rbis++;
          
          // Contar carreras totales (incluyendo el bateador)
          carrerasTotal = 1; // El bateador siempre anota
          if (newRunners.first) carrerasTotal++;
          if (newRunners.second) carrerasTotal++;
          if (newRunners.third) carrerasTotal++;
          
          console.log(`⚾ HR: ${carrerasTotal} carreras totales (1 bateador + ${carrerasTotal-1} corredores)`);
          console.log(`💯 RBIs: ${rbis}`);
          
          carrera = true; // Para marcar que hubo al menos una carrera
          newRunners = { first: false, second: false, third: false, home: false };
          break;
        case 'C':
          carrera = true;
          break;
      }

      // Actualizar estados
      setGameState(newGameState);
      setRunners(newRunners);

      // Registrar acción
      const newInningData = { ...inningData };
      if (!newInningData[currentPlayer]) {
        newInningData[currentPlayer] = {};
      }
      
      newInningData[currentPlayer][currentInning] = {
        accion: action,
        bases: [],
        carrera: carrera,
        detalle: getActionDetail(action)
      };

      setInningData(newInningData);

      // Actualizar marcador si hay carrera ANTES de guardar en BD
      if (carrera) {
        if (action === 'HR' && carrerasTotal > 0) {
          // Para HR, agregar todas las carreras calculadas
          console.log(`🏟️ PROCESANDO HR: agregando ${carrerasTotal} carreras`);
          for (let i = 0; i < carrerasTotal; i++) {
            console.log(`   Llamada ${i + 1} a addRun()`);
            addRun();
          }
        } else {
          // Para otras acciones, agregar una carrera
          console.log(`⚾ Agregando 1 carrera para acción: ${action}`);
          addRun();
        }
      }

      // Estadísticas automáticas
      updatePlayerStats(currentPlayer, action, carrera);

      // Esperar un momento para que el estado se actualice, luego guardar en BD
      setTimeout(async () => {
        try {
          await saveGameData(action, carrera, rbis);
          
          const playerName = getCurrentPlayers().find(p => p.id === currentPlayer)?.nombre;
          setSuccessMessage(`${action} registrado para ${playerName}`);
          setTimeout(() => setSuccessMessage(''), 3000);

          // Si es un ponche (K), avanzar automáticamente al siguiente jugador
          if (action === 'K') {
            setTimeout(() => {
              advanceToNextPlayerWithOrderCheck();
            }, 400); // Pequeña pausa para que el usuario vea la acción registrada
          }
        } catch (error) {
          console.error('❌ Error guardando estadísticas:', error);
          setError('Error guardando estadísticas: ' + (error as Error).message);
        }
      }, 100);

    } catch (error) {
      console.error('❌ Error guardando estadísticas:', error);
      setError('Error guardando estadísticas: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const updatePlayerStats = (playerId: string, action: string, carrera: boolean) => {
    const newStats = { ...playerStats };
    if (!newStats[playerId]) {
      newStats[playerId] = { H1: 0, H2: 0, H3: 0, HR: 0, C: 0, K: 0, BB: 0, JJ: 0 };
    }
    
    // Actualizar estadística de Juegos Jugados (JJ) si es la primera acción del jugador en este juego
    if (!newStats[playerId].JJ) {
      newStats[playerId].JJ = 1;
    }
    
    if (action === '1B' || action === 'H1') newStats[playerId].H1++;
    if (action === '2B' || action === 'H2') newStats[playerId].H2++;
    if (action === '3B' || action === 'H3') newStats[playerId].H3++;
    if (action === 'HR') newStats[playerId].HR++;
    if (carrera) newStats[playerId].C++;
    if (action === 'K') newStats[playerId].K++;
    if (action === 'BB') newStats[playerId].BB++;
    
    setPlayerStats(newStats);
  };

  const handlePlayerSelection = (position: number, player: Player | null) => {
    setSelectedPlayers(prev => ({
      ...prev,
      [position]: player
    }));
    setDropdownOpen(null);
    
    // Si se selecciona un jugador, añadir estadística JJ
    if (player) {
      updatePlayerJJ(player.id);
    }
  };

  const updatePlayerJJ = (playerId: string) => {
    const newStats = { ...playerStats };
    if (!newStats[playerId]) {
      newStats[playerId] = { H1: 0, H2: 0, H3: 0, HR: 0, C: 0, K: 0, BB: 0, JJ: 1 };
    } else if (!newStats[playerId].JJ) {
      newStats[playerId].JJ = 1;
    }
    setPlayerStats(newStats);
  };

  const getPlayerForPosition = (position: number) => {
    return selectedPlayers[position] || getCurrentPlayers()[position] || null;
  };

  const getAvailablePlayersForChange = () => {
    const allPlayers = getCurrentPlayers();
    const selectedPlayerIds = Object.values(selectedPlayers)
      .filter(player => player !== null)
      .map(player => player!.id);
    
    return allPlayers.filter(player => !selectedPlayerIds.includes(player.id));
  };

  const handlePlayerChange = (position: number, newPlayer: Player) => {
    setSelectedPlayers(prev => ({
      ...prev,
      [position]: newPlayer
    }));
    setDropdownOpen(null);
    
    // Actualizar estadística JJ para el nuevo jugador
    updatePlayerJJ(newPlayer.id);
  };

  const getAvailablePositions = () => {
    const selectedPositionCodes = Object.values(selectedPositions);
    return BASEBALL_POSITIONS.filter(pos => !selectedPositionCodes.includes(pos.code));
  };

  const handlePositionChange = (lineupPosition: number, positionCode: string) => {
    setSelectedPositions(prev => ({
      ...prev,
      [lineupPosition]: positionCode
    }));
    setDropdownOpen(null);
  };

  const getPositionForLineup = (lineupPosition: number) => {
    const selectedPos = selectedPositions[lineupPosition];
    if (selectedPos) {
      return BASEBALL_POSITIONS.find(pos => pos.code === selectedPos)?.code || 'POS';
    }
    
    const player = getPlayerForPosition(lineupPosition);
    return player?.posicion || 'POS';
  };


  const getActionDetail = (action: string) => {
    const details: {[key: string]: string} = {
      'K': 'Ponche',
      'BB': 'Base por bolas',
      '1B': 'Sencillo',
      '2B': 'Doble',
      '3B': 'Triple',
      'HR': 'Jonrón',
      'C': 'Carrera',
      'O': 'Out',
      'KP': 'Ponche mirando'
    };
    return details[action] || action;
  };

  const saveGameData = async (action: string, carrera: boolean, rbis: number = 0) => {
    const marcadorActualLocal = getTotalScore('local');
    const marcadorActualVisitante = getTotalScore('visitante');

    console.log('📤 Enviando datos a API:', {
      gameId: gameData?.id,
      jugadorId: currentPlayer,
      entrada: currentInning,
      accion: action,
      carrera: carrera,
      marcadorLocal: marcadorActualLocal,
      marcadorVisitante: marcadorActualVisitante,
      gameState: gameState
    });

    const response = await fetch('/api/anotador/save-stats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gameId: gameData?.id,
        jugadorId: currentPlayer,
        entrada: currentInning,
        accion: action,
        carrera: carrera,
        rbis: rbis,
        marcadorLocal: marcadorActualLocal,
        marcadorVisitante: marcadorActualVisitante,
        gameState: gameState
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de API:', response.status, errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || 'Error guardando estadísticas');
      } catch {
        throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
      }
    }

    return await response.json();
  };

  const addRun = () => {
    console.log(`⚾ AGREGANDO CARRERA - Equipo: ${currentTeam}, Entrada: ${currentInning}`);
    
    if (currentTeam === 'local') {
      setScoreLocal(prevScore => {
        const newScore = { ...prevScore };
        const currentRuns = newScore[currentInning] || 0;
        newScore[currentInning] = currentRuns + 1;
        console.log(`   Local - Antes: ${currentRuns}, Después: ${newScore[currentInning]}`);
        return newScore;
      });
    } else {
      setScoreVisitante(prevScore => {
        const newScore = { ...prevScore };
        const currentRuns = newScore[currentInning] || 0;
        newScore[currentInning] = currentRuns + 1;
        console.log(`   Visitante - Antes: ${currentRuns}, Después: ${newScore[currentInning]}`);
        return newScore;
      });
    }
  };

  const submitInning = () => {
    setCurrentPlayer(null);
    setGameState(prev => ({ ...prev, strikes: 0, balls: 0 }));
  };

  const getCurrentPlayers = () => {
    return currentTeam === 'local' ? playersLocal : playersVisitante;
  };

  const getNextPlayerInBattingOrder = (currentPlayerId: string | null) => {
    if (!currentPlayerId) return null;
    
    const players = getCurrentPlayers();
    const currentIndex = players.findIndex(p => p.id === currentPlayerId);
    
    if (currentIndex === -1) return null;
    
    // Si es el último jugador (índice 8), volver al primero (índice 0)
    // Si no, avanzar al siguiente jugador
    const nextIndex = currentIndex === players.length - 1 ? 0 : currentIndex + 1;
    
    return players[nextIndex]?.id || null;
  };

  const advanceToNextPlayer = () => {
    const nextPlayerId = getNextPlayerInBattingOrder(currentPlayer);
    if (nextPlayerId) {
      setCurrentPlayer(nextPlayerId);
      console.log(`🔄 Avanzando al siguiente jugador en el orden de bateo`);
    }
  };

  const advanceToNextPlayerWithOrderCheck = () => {
    if (!currentPlayer) return;
    
    const players = getCurrentPlayers();
    const currentIndex = players.findIndex(p => p.id === currentPlayer);
    
    // Si es el 9no bateador (índice 8), reiniciar el orden
    if (currentIndex === 8) {
      console.log('🔄 Completado ciclo de 9 bateadores - reiniciando orden de bateo');
      
      // Limpiar datos de la tabla de bateo pero mantener corredores y outs
      setInningData({}); // Limpiar datos de entrada
      setCurrentPlayer(players[0]?.id || null); // Volver al primer bateador
      
      console.log(`🔄 Reiniciando con bateador #1: ${players[0]?.nombre}`);
      console.log(`📍 Manteniendo: ${gameState.outs} outs, corredores en bases`);
    } else {
      // Avance normal al siguiente bateador
      advanceToNextPlayer();
    }
  };

  const handleDefensiveError = async (positionCode: string, positionNumber: number) => {
    try {
      // Determinar equipo defensivo (opuesto al que está bateando)
      const defensiveTeam = currentTeam === 'local' ? 'visitante' : 'local';
      const defensivePlayers = defensiveTeam === 'local' ? playersLocal : playersVisitante;
      
      // Buscar jugador en esa posición (aproximado por número de casaca o posición)
      const defensivePlayer = defensivePlayers.find(p => p.numero === positionNumber) || 
                             defensivePlayers[positionNumber - 1]; // Fallback por índice
      
      if (!defensivePlayer) {
        setError(`No se encontró jugador en posición ${positionCode} (${positionNumber})`);
        return;
      }

      console.log(`🚨 Error defensivo: E${positionNumber} (${positionCode}) - ${defensivePlayer.nombre}`);
      
      // Guardar error en la base de datos
      await saveDefensiveError(defensivePlayer.id, positionCode, positionNumber);
      
      setSuccessMessage(`Error E${positionNumber} registrado para ${defensivePlayer.nombre} (${positionCode})`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error) {
      console.error('❌ Error registrando error defensivo:', error);
      setError('Error registrando error defensivo: ' + (error as Error).message);
    }
  };

  const saveDefensiveError = async (playerId: string, position: string, positionNumber: number) => {
    const response = await fetch('/api/anotador/save-stats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gameId: gameData?.id,
        jugadorId: playerId,
        entrada: currentInning,
        accion: 'E',
        carrera: false,
        rbis: 0,
        marcadorLocal: getTotalScore('local'),
        marcadorVisitante: getTotalScore('visitante'),
        gameState: gameState,
        positionError: positionNumber // Para identificar la posición del error
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de API:', response.status, errorText);
      throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
    }

    return await response.json();
  };

  const getCurrentPitcher = () => {
    // El pitcher es del equipo que está en defensa (opuesto al que está bateando)
    const defensiveTeam = currentTeam === 'local' ? 'visitante' : 'local';
    const defensivePlayers = defensiveTeam === 'local' ? playersLocal : playersVisitante;
    
    // Buscar el pitcher (posición 1)
    return defensivePlayers.find(p => p.numero === 1) || defensivePlayers[0];
  };

  const handlePitcherAction = async (action: string) => {
    try {
      const pitcher = getCurrentPitcher();
      if (!pitcher) {
        setError('No se encontró pitcher en el equipo defensivo');
        return;
      }

      console.log(`⚾ Acción de pitcher: ${action} - ${pitcher.nombre}`);
      
      // Calcular lanzamientos basándose en la acción
      let pitches = 0;
      switch (action) {
        case 'K_P': // Ponche (ya se habrán contado strikes previamente)
          pitches = 0; // Los strikes ya se contaron
          break;
        case 'BB_P': // Base por bolas (ya se habrán contado bolas)
          pitches = 0; // Las bolas ya se contaron
          break;
        case 'HBP': // Golpe al bateador
          pitches = 1;
          break;
        case 'BK': // Balk
          pitches = 0; // Balk no cuenta como lanzamiento
          break;
        case 'STRIKE_PITCH': // Strike manual
          pitches = 1;
          break;
        case 'BALL_PITCH': // Bola manual
          pitches = 1;
          break;
      }
      
      // Guardar estadísticas del pitcher
      await savePitcherStats(pitcher.id, action, pitches);
      
      setSuccessMessage(`${action} registrado para pitcher ${pitcher.nombre}`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error) {
      console.error('❌ Error registrando estadística de pitcher:', error);
      setError('Error registrando estadística de pitcher: ' + (error as Error).message);
    }
  };

  const savePitcherStats = async (pitcherId: string, action: string, pitches: number) => {
    const response = await fetch('/api/anotador/save-stats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gameId: gameData?.id,
        jugadorId: pitcherId,
        entrada: currentInning,
        accion: action,
        carrera: false,
        rbis: 0,
        pitches: pitches,
        marcadorLocal: getTotalScore('local'),
        marcadorVisitante: getTotalScore('visitante'),
        gameState: gameState,
        isPitcherStat: true
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de API:', response.status, errorText);
      throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
    }

    return await response.json();
  };

  const getTotalScore = (team: 'local' | 'visitante') => {
    const score = team === 'local' ? scoreLocal : scoreVisitante;
    return Object.values(score).reduce((total, runs) => total + runs, 0);
  };

  // Efectos automáticos para strikes, bolas y outs
  useEffect(() => {
    if (processingAutoAction.current) return; // Evitar bucle infinito
    
    if (gameState.strikes >= 3) {
      processingAutoAction.current = true;
      handleQuickAction('K').finally(() => {
        setTimeout(() => {
          processingAutoAction.current = false;
        }, 100);
      });
    } else if (gameState.balls >= 4) {
      processingAutoAction.current = true;
      handleQuickAction('BB').finally(() => {
        setTimeout(() => {
          processingAutoAction.current = false;
        }, 100);
      });
    }
  }, [gameState.strikes, gameState.balls, gameState.outs]);

  // CONTEO AUTOMÁTICO DE LANZAMIENTOS DESACTIVADO TEMPORALMENTE
  // Para evitar bucles infinitos - se puede activar manualmente con botones
  
  const updatePitcherPitches = async (pitcherId: string, pitches: number) => {
    try {
      await savePitcherStats(pitcherId, 'PITCH', pitches);
    } catch (error) {
      console.error('Error actualizando lanzamientos:', error);
    }
  };

  // useEffect para cambio de entrada después de 3 outs
  useEffect(() => {
    if (gameState.outs >= 3) {
      // Cambio de entrada y equipo
      setGameState(prev => ({ ...prev, outs: 0, strikes: 0, balls: 0 }));
      setRunners({ first: false, second: false, third: false, home: false });
      setInningData({}); // Limpiar datos de la tabla de bateo
      setCurrentPlayer(null); // Limpiar selección de jugador
      
      // Cambiar al otro equipo
      setCurrentTeam(prev => prev === 'local' ? 'visitante' : 'local');
      
      console.log(`🔄 Cambio de entrada: 3 outs completados, ahora batea el equipo ${currentTeam === 'local' ? 'visitante' : 'local'}`);
      console.log(`🧹 Tabla de bateo limpiada para nuevo equipo`);
    }
  }, [gameState.outs]);

  if (!gameData) {
    return <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">Cargando juego...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      {/* ENCABEZADO CON INFORMACIÓN DE LIGA Y TEMPORADA */}
      <div className="bg-slate-800 border-b border-slate-600 p-4 mb-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-blue-400 mb-2">{gameData.liga?.nombre || 'Liga de Béisbol'}</h1>
          <p className="text-lg text-slate-300">Temporada {gameData.temporada || '2024'}</p>
        </div>
      </div>

      {/* INFORMACIÓN DEL PARTIDO */}
      <div className="bg-slate-800 rounded-lg p-4 mb-6">
        <h2 className="text-xl font-bold text-center text-white mb-4">INFORMACIÓN DEL PARTIDO</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <span className="block text-sm text-slate-400">Lugar:</span>
            <p className="font-semibold text-white">{gameData.lugar}</p>
          </div>
          <div>
            <span className="block text-sm text-slate-400">Fecha:</span>
            <p className="font-semibold text-white">{new Date(gameData.fecha).toLocaleDateString()}</p>
          </div>
          <div>
            <span className="block text-sm text-slate-400">Horario:</span>
            <p className="font-semibold text-white">{new Date(gameData.fecha).toLocaleTimeString()}</p>
          </div>
          <div>
            <span className="block text-sm text-slate-400">Equipos:</span>
            <p className="font-semibold text-white">{gameData.equipo_visitante.nombre} vs {gameData.equipo_local.nombre}</p>
          </div>
        </div>
      </div>

      {/* MENÚS SEPARADOS PARA VISITANTE Y LOCAL CON INDICADORES POR ENTRADA */}
      <div className="bg-slate-800 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-bold text-center text-white mb-4">SELECCIÓN DE EQUIPO</h3>
        
        {/* Botones principales de equipo */}
        <div className="flex justify-center space-x-4 mb-6">
          <button
            onClick={() => setCurrentTeam('visitante')}
            className={`px-8 py-3 rounded-lg font-bold text-lg ${
              currentTeam === 'visitante' 
                ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-400' 
                : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
            }`}
          >
            🏃 VISITANTE - {gameData.equipo_visitante.nombre}
          </button>
          <button
            onClick={() => setCurrentTeam('local')}
            className={`px-8 py-3 rounded-lg font-bold text-lg ${
              currentTeam === 'local' 
                ? 'bg-green-600 text-white shadow-lg border-2 border-green-400' 
                : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
            }`}
          >
            🏠 LOCAL - {gameData.equipo_local.nombre}
          </button>
        </div>

      </div>

      {/* Mensajes */}
      {error && <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-100 rounded">{error}</div>}
      {successMessage && <div className="mb-4 p-3 bg-green-900/50 border border-green-700 text-green-100 rounded">{successMessage}</div>}
      {saving && <div className="mb-4 p-3 bg-blue-900/50 border border-blue-700 text-blue-100 rounded flex items-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-100 mr-2"></div>Guardando estadísticas...</div>}

      {/* CUADRO DE SCORE - JUGADORES EN LISTA EN 9 ESPACIOS */}
      <div className="bg-slate-800 rounded-lg p-4 mb-6">
        <h3 className="text-xl font-bold text-center text-white mb-4">
          📋 LINEUP - {currentTeam === 'local' ? gameData.equipo_local.nombre : gameData.equipo_visitante.nombre}
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-600">
            <thead>
              <tr className="bg-slate-700">
                <th className="border border-slate-600 p-3 text-left w-12 text-white font-bold">#</th>
                <th className="border border-slate-600 p-3 text-left min-w-[200px] text-white font-bold">JUGADOR</th>
                <th className="border border-slate-600 p-3 text-center w-16 text-white font-bold">POS</th>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(entrada => (
                  <th key={entrada} className="border border-slate-600 p-3 text-center w-16 text-white font-bold">
                    <div className="flex items-center justify-center">
                      <span className="mr-1">{entrada}</span>
                      
                      {/* Triángulo verde solo cuando equipo visitante está seleccionado */}
                      {currentTeam === 'visitante' && (
                        <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2 L22 20 L2 20 Z"/>
                        </svg>
                      )}
                      
                      {/* Triángulo rojo solo cuando equipo local está seleccionado */}
                      {currentTeam === 'local' && (
                        <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 22 L2 4 L22 4 Z"/>
                        </svg>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* SIEMPRE MOSTRAR EXACTAMENTE 9 JUGADORES */}
              {[...Array(9)].map((_, index) => {
                const player = getPlayerForPosition(index);
                const playerId = player?.id || `placeholder-${index}`;
                
                return (
                  <tr key={playerId} className="hover:bg-slate-700/50">
                    <td className="border border-slate-600 p-3 text-center text-white font-bold">{index + 1}</td>
                    <td className="border border-slate-600 p-3 text-blue-400 font-semibold relative">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <span>{player?.nombre || `Jugador ${index + 1}`}</span>
                          {/* Botón Cambio que aparece solo si hay jugador seleccionado */}
                          {player && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDropdownOpen(dropdownOpen === `change-${index}` ? null : `change-${index}`);
                              }}
                              className="ml-2 px-2 py-1 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors"
                            >
                              Cambio
                            </button>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDropdownOpen(dropdownOpen === index ? null : index);
                          }}
                          className="ml-2 text-slate-400 hover:text-blue-400 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Dropdown Menu - Selección inicial */}
                      {dropdownOpen === index && (
                        <div className="absolute top-full left-0 right-0 bg-slate-700 border border-slate-600 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                          <div className="p-2">
                            <div className="text-xs text-slate-400 mb-2 font-semibold">
                              Seleccionar jugador:
                            </div>
                            {getCurrentPlayers().map((availablePlayer) => (
                              <button
                                key={availablePlayer.id}
                                onClick={() => handlePlayerSelection(index, availablePlayer)}
                                className="w-full text-left px-3 py-2 hover:bg-blue-600 rounded text-sm text-white transition-colors flex justify-between items-center"
                              >
                                <span>
                                  #{availablePlayer.numero} {availablePlayer.nombre}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {availablePlayer.posicion}
                                </span>
                              </button>
                            ))}
                            {getCurrentPlayers().length === 0 && (
                              <div className="text-sm text-slate-400 text-center py-3">
                                No hay jugadores disponibles
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Dropdown Menu - Cambio de jugador (solo jugadores no seleccionados) */}
                      {dropdownOpen === `change-${index}` && (
                        <div className="absolute top-full left-0 right-0 bg-orange-800 border border-orange-600 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                          <div className="p-2">
                            <div className="text-xs text-orange-200 mb-2 font-semibold">
                              Cambiar por jugador disponible:
                            </div>
                            {getAvailablePlayersForChange().map((availablePlayer) => (
                              <button
                                key={availablePlayer.id}
                                onClick={() => handlePlayerChange(index, availablePlayer)}
                                className="w-full text-left px-3 py-2 hover:bg-orange-600 rounded text-sm text-white transition-colors flex justify-between items-center"
                              >
                                <span>
                                  #{availablePlayer.numero} {availablePlayer.nombre}
                                </span>
                                <span className="text-xs text-orange-200">
                                  {availablePlayer.posicion}
                                </span>
                              </button>
                            ))}
                            {getAvailablePlayersForChange().length === 0 && (
                              <div className="text-sm text-orange-200 text-center py-3">
                                No hay jugadores disponibles para cambio
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="border border-slate-600 p-3 text-center text-white relative">
                      <div className="flex items-center justify-center">
                        <span className="mr-2">{getPositionForLineup(index)}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDropdownOpen(dropdownOpen === `pos-${index}` ? null : `pos-${index}`);
                          }}
                          className="text-slate-400 hover:text-green-400 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      {/* Dropdown Menu - Selección de posición */}
                      {dropdownOpen === `pos-${index}` && (
                        <div className="absolute top-full left-0 right-0 bg-green-800 border border-green-600 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                          <div className="p-2">
                            <div className="text-xs text-green-200 mb-2 font-semibold">
                              Seleccionar posición:
                            </div>
                            {getAvailablePositions().map((position) => (
                              <button
                                key={position.code}
                                onClick={() => handlePositionChange(index, position.code)}
                                className="w-full text-left px-3 py-2 hover:bg-green-600 rounded text-sm text-white transition-colors"
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-bold">
                                    {position.code} ({position.number})
                                  </span>
                                </div>
                                <div className="text-xs text-green-200 mt-1">
                                  {position.name}
                                </div>
                              </button>
                            ))}
                            {getAvailablePositions().length === 0 && (
                              <div className="text-sm text-green-200 text-center py-3">
                                Todas las posiciones están ocupadas
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(entrada => (
                      <td 
                        key={entrada} 
                        className="border border-slate-600 p-2 text-center cursor-pointer hover:bg-blue-600/20"
                        onClick={() => player && handleCellClick(playerId, entrada)}
                      >
                        {/* CUADRO QUE SIMULA EL CAMPO DE JUEGO */}
                        <div className={`w-12 h-12 flex items-center justify-center rounded border-2 text-xs font-bold transition-all ${
                          currentPlayer === playerId && currentInning === entrada
                            ? 'bg-blue-600 border-blue-300 text-white shadow-lg ring-2 ring-blue-300 ring-opacity-50'
                            : player 
                              ? 'bg-blue-500 border-blue-400 text-white hover:bg-blue-400 hover:shadow-md'
                              : 'bg-slate-500 border-slate-400 text-slate-300'
                        }`}>
                          {player && inningData[playerId]?.[entrada]?.accion ? (
                            <span className="font-bold">{inningData[playerId][entrada].accion}</span>
                          ) : player ? (
                            <span className="text-blue-200">○</span>
                          ) : (
                            <span className="text-slate-400">○</span>
                          )}
                        </div>
                        
                        {/* Indicador de jugador activo */}
                        {currentPlayer === playerId && currentInning === entrada && (
                          <div className="text-xs text-blue-300 mt-1 font-semibold">
                            ACTIVO
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CUADRO DE CARRERAS POR EQUIPO - CONTADOR AL FINAL */}
      <div className="bg-slate-800 rounded-lg p-4 mb-6">
        <h3 className="text-xl font-bold text-center text-white mb-4">📊 MARCADOR POR ENTRADAS</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-600">
            <thead>
              <tr className="bg-slate-700">
                <th className="border border-slate-600 p-3 text-left min-w-[200px] text-white font-bold">EQUIPO</th>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(entrada => (
                  <th key={entrada} className="border border-slate-600 p-3 text-center w-16 text-white font-bold">
                    {entrada}
                  </th>
                ))}
                <th className="border border-slate-600 p-3 text-center w-16 bg-yellow-600 text-white font-bold">C</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-slate-800">
                <td className="border border-slate-600 p-3 font-bold text-blue-400">
                  🏃 {gameData.equipo_visitante.nombre} (Visitante)
                </td>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(entrada => (
                  <td key={entrada} className="border border-slate-600 p-3 text-center text-white font-bold text-lg">
                    {scoreVisitante[entrada] || 0}
                  </td>
                ))}
                <td className="border border-slate-600 p-3 text-center font-bold text-yellow-400 bg-slate-700 text-xl">
                  {getTotalScore('visitante')}
                </td>
              </tr>
              <tr className="bg-slate-800">
                <td className="border border-slate-600 p-3 font-bold text-green-400">
                  🏠 {gameData.equipo_local.nombre} (Local)
                </td>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(entrada => (
                  <td key={entrada} className="border border-slate-600 p-3 text-center text-white font-bold text-lg">
                    {scoreLocal[entrada] || 0}
                  </td>
                ))}
                <td className="border border-slate-600 p-3 text-center font-bold text-yellow-400 bg-slate-700 text-xl">
                  {getTotalScore('local')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      {/* PANEL DE CONTROL INFERIOR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CUADRO DE CORREDORES CON DIAMANTE Y CÍRCULO DE PITCHER */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-center text-white mb-4">⚾ CORREDORES</h3>
          
          {/* INFORMACIÓN DEL JUGADOR SELECCIONADO */}
          {currentPlayer && getCurrentPlayerInfo() && (
            <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-3 mb-4">
              <div className="text-center">
                <div className="text-sm font-semibold text-blue-300">JUGADOR SELECCIONADO</div>
                <div className="text-lg font-bold text-white">
                  {getCurrentPlayerInfo()?.nombre}
                </div>
                <div className="text-sm text-blue-200">
                  #{getCurrentPlayerInfo()?.numero} - Entrada {currentInning} - {currentTeam === 'local' ? 'Local' : 'Visitante'}
                </div>
              </div>
            </div>
          )}
          
          {!currentPlayer && (
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3 mb-4">
              <div className="text-center text-slate-400 text-sm">
                Haz clic en una celda de jugador para seleccionar
              </div>
            </div>
          )}
          
          {/* DIAMANTE DE BÉISBOL CON BASES EN SENTIDO ANTI-HORARIO */}
          <div className="relative w-64 h-64 mx-auto mb-6">
            <svg viewBox="0 0 260 260" className="w-full h-full">
              {/* Cuadro del campo */}
              <rect x="30" y="30" width="200" height="200" fill="#1e293b" stroke="#3b82f6" strokeWidth="3" rx="8"/>
              
              {/* CÍRCULO DEL PITCHER EN EL CENTRO */}
              <circle cx="130" cy="130" r="12" fill="#3b82f6" stroke="#60a5fa" strokeWidth="2"/>
              <text x="130" y="135" textAnchor="middle" className="fill-white text-xs font-bold">P</text>
              
              {/* HOME PLATE (esquina inferior) */}
              <circle 
                cx="130" 
                cy="210" 
                r="12" 
                fill={runners.home ? "#10b981" : "#6b7280"}
                stroke="#ffffff"
                strokeWidth="3"
                className="cursor-pointer"
                onClick={() => setRunners(prev => ({ ...prev, home: !prev.home }))}
              />
              <text x="130" y="235" textAnchor="middle" className="fill-white text-xs font-bold">HOME</text>
              
              {/* PRIMERA BASE (sentido anti-horario desde home) */}
              <circle 
                cx="210" 
                cy="130" 
                r="12" 
                fill={runners.first ? "#10b981" : "#6b7280"}
                stroke="#ffffff"
                strokeWidth="3"
                className="cursor-pointer"
                onClick={() => setRunners(prev => ({ ...prev, first: !prev.first }))}
              />
              <text x="235" y="135" textAnchor="start" className="fill-white text-xs font-bold">1B</text>
              
              {/* SEGUNDA BASE (arriba) */}
              <circle 
                cx="130" 
                cy="50" 
                r="12" 
                fill={runners.second ? "#10b981" : "#6b7280"}
                stroke="#ffffff"
                strokeWidth="3"
                className="cursor-pointer"
                onClick={() => setRunners(prev => ({ ...prev, second: !prev.second }))}
              />
              <text x="130" y="35" textAnchor="middle" className="fill-white text-xs font-bold">2B</text>
              
              {/* TERCERA BASE (izquierda) */}
              <circle 
                cx="50" 
                cy="130" 
                r="12" 
                fill={runners.third ? "#10b981" : "#6b7280"}
                stroke="#ffffff"
                strokeWidth="3"
                className="cursor-pointer"
                onClick={() => setRunners(prev => ({ ...prev, third: !prev.third }))}
              />
              <text x="25" y="135" textAnchor="end" className="fill-white text-xs font-bold">3B</text>
            </svg>
          </div>


          {/* INFORMACIÓN DETALLADA DEL JUGADOR SELECCIONADO */}
          <div className="text-center mb-6">
            <p className="text-sm text-slate-400 mb-4">
              🔄 Cuando se llenen los 4 círculos del perímetro se marcará la carrera
            </p>
            
            {currentPlayer && getCurrentPlayerInfo() && (
              <div className="bg-slate-700 rounded-lg p-4 mb-4">
                <div className="text-lg text-blue-400 font-bold mb-2">
                  📝 JUGADOR ACTIVO
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Nombre:</span>
                    <p className="text-white font-semibold">{getCurrentPlayerInfo()?.nombre}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Número:</span>
                    <p className="text-white font-semibold">#{getCurrentPlayerInfo()?.numero}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Posición:</span>
                    <p className="text-white font-semibold">{getPositionForLineup(getCurrentPlayerPosition() || 0)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Entrada:</span>
                    <p className="text-white font-semibold">{currentInning}</p>
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-400">
                  Equipo: {currentTeam === 'local' ? '🏠 Local' : '🏃 Visitante'} - {currentTeam === 'local' ? gameData.equipo_local.nombre : gameData.equipo_visitante.nombre}
                </div>
              </div>
            )}
            
            {!currentPlayer && (
              <div className="bg-slate-700 rounded-lg p-4 border-2 border-dashed border-slate-600">
                <p className="text-red-400 font-semibold mb-2">⚠️ SELECCIONA UN JUGADOR</p>
                <p className="text-sm text-slate-400">
                  Haz click en cualquier recuadro azul del lineup para comenzar a anotar
                </p>
              </div>
            )}
          </div>

          {/* CONTADORES AUTOMÁTICOS */}
          {/* CONTROLES VISUALES DE STRIKES, BOLAS Y OUTS */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* STRIKES (3 hexágonos naranjas) */}
            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <div className="text-sm font-semibold text-orange-300 mb-3">STRIKES</div>
              <div className="flex justify-center gap-2 mb-2">
                {[0, 1, 2].map(index => (
                  <div key={index} className="relative">
                    <svg width="28" height="28" viewBox="0 0 24 24" className="cursor-pointer">
                      <polygon
                        points="12,2 21,7 21,17 12,22 3,17 3,7"
                        fill={gameState.strikes > index ? "#f97316" : "#4b5563"}
                        stroke="#ffffff"
                        strokeWidth="2"
                        onClick={() => {
                          const newStrikes = gameState.strikes === index + 1 ? index : index + 1;
                          if (newStrikes >= 3) {
                            // Automáticamente marcar out y resetear strikes
                            setGameState(prev => ({ ...prev, strikes: 0, outs: prev.outs + 1 }));
                            if (currentPlayer) {
                              handleQuickAction('K'); // Registrar ponche
                            }
                          } else {
                            setGameState(prev => ({ ...prev, strikes: newStrikes }));
                          }
                        }}
                      />
                    </svg>
                  </div>
                ))}
              </div>
              <div className="text-sm text-orange-200">{gameState.strikes}/3</div>
              <p className="text-xs text-slate-500 mt-1">3 = Out automático</p>
            </div>

            {/* BOLAS (4 rectángulos amarillos) */}
            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <div className="text-sm font-semibold text-yellow-300 mb-3">BOLAS</div>
              <div className="flex justify-center gap-1 mb-2">
                {[0, 1, 2, 3].map(index => (
                  <div
                    key={index}
                    className="w-6 h-10 border-2 border-white cursor-pointer"
                    style={{
                      backgroundColor: gameState.balls > index ? "#eab308" : "#4b5563"
                    }}
                    onClick={() => {
                      const newBalls = gameState.balls === index + 1 ? index : index + 1;
                      if (newBalls >= 4) {
                        // Automáticamente marcar BB (base por bolas) y resetear balls/strikes
                        setGameState(prev => ({ ...prev, balls: 0, strikes: 0 }));
                        setRunners(prev => ({ ...prev, first: true }));
                        if (currentPlayer) {
                          handleQuickAction('BB'); // Registrar base por bolas
                        }
                      } else {
                        setGameState(prev => ({ ...prev, balls: newBalls }));
                      }
                    }}
                  />
                ))}
              </div>
              <div className="text-sm text-yellow-200">{gameState.balls}/4</div>
              <p className="text-xs text-slate-500 mt-1">4 = Base automática</p>
            </div>

            {/* OUTS (3 círculos rojos) */}
            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <span className="block text-sm font-semibold text-red-300 mb-3">OUTS</span>
              <div className="flex justify-center space-x-2 mb-2">
                {[1, 2, 3].map(out => (
                  <div 
                    key={out}
                    className={`w-8 h-8 rounded-full cursor-pointer border-2 border-white ${gameState.outs >= out ? 'bg-red-500' : 'bg-slate-500'}`}
                    onClick={() => {
                      setGameState(prev => ({ 
                        ...prev, 
                        outs: prev.outs >= out ? out - 1 : out,
                        strikes: 0,
                        balls: 0 
                      }));
                    }}
                  />
                ))}
              </div>
              <div className="text-sm text-red-200">{gameState.outs}/3</div>
              <p className="text-xs text-slate-500">3 = Cambio entrada</p>
            </div>
          </div>

          {/* BOTÓN ✓ PARA SUBIR INFORMACIÓN */}
          <div className="text-center">
            <button 
              onClick={submitInning}
              disabled={!currentPlayer}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg text-lg font-bold disabled:bg-slate-600 disabled:cursor-not-allowed shadow-lg transition-all"
            >
              ✓ SUBIR INFORMACIÓN
            </button>
            <p className="text-xs text-slate-400 mt-2">Sube la información al cuadro de lineup</p>
          </div>
        </div>

        {/* ACCIONES RÁPIDAS */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-center text-white mb-6">⚡ ACCIONES RÁPIDAS</h3>
          <p className="text-center text-slate-400 mb-6">
            Aplican a {currentTeam === 'local' ? 'Local' : 'Visitante'} en la entrada actual
          </p>

          {/* SISTEMA H1/H2/H3/HR AUTOMÁTICO */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button 
              onClick={() => handleQuickAction('H1')} 
              disabled={!currentPlayer} 
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg text-sm font-bold disabled:bg-slate-600"
            >
              H1 - Hit (1B)<br/>
              <span className="text-xs">→ Jugador a 1B</span>
            </button>
            <button 
              onClick={() => handleQuickAction('H2')} 
              disabled={!currentPlayer} 
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg text-sm font-bold disabled:bg-slate-600"
            >
              H2 - Doble (2B)<br/>
              <span className="text-xs">→ Jugador a 2B</span>
            </button>
            <button 
              onClick={() => handleQuickAction('H3')} 
              disabled={!currentPlayer} 
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg text-sm font-bold disabled:bg-slate-600"
            >
              H3 - Triple (3B)<br/>
              <span className="text-xs">→ Jugador a 3B</span>
            </button>
            <button 
              onClick={() => handleQuickAction('HR')} 
              disabled={!currentPlayer} 
              className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg text-sm font-bold disabled:bg-slate-600"
            >
              HR - Jonrón<br/>
              <span className="text-xs">→ Carrera completa</span>
            </button>
          </div>

          {/* OTRAS ACCIONES */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <button onClick={() => handleQuickAction('C')} disabled={!currentPlayer} className="bg-green-600 hover:bg-green-700 text-white py-2 px-2 rounded text-xs font-medium disabled:bg-slate-600">C<br/>Carrera</button>
            <button onClick={() => handleQuickAction('BB')} disabled={!currentPlayer} className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-2 rounded text-xs font-medium disabled:bg-slate-600">BB<br/>Base</button>
            <button onClick={() => handleQuickAction('K')} disabled={!currentPlayer} className="bg-red-600 hover:bg-red-700 text-white py-2 px-2 rounded text-xs font-medium disabled:bg-slate-600">K<br/>Ponche</button>
            <button onClick={() => handleQuickAction('O')} disabled={!currentPlayer} className="bg-red-700 hover:bg-red-800 text-white py-2 px-2 rounded text-xs font-medium disabled:bg-slate-600">O<br/>Out</button>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4">
            <button onClick={() => handleQuickAction('4-3')} disabled={!currentPlayer} className="bg-slate-600 hover:bg-slate-500 text-white py-2 px-2 rounded text-xs font-medium disabled:bg-slate-700">4-3</button>
            <button onClick={() => handleQuickAction('5-3')} disabled={!currentPlayer} className="bg-slate-600 hover:bg-slate-500 text-white py-2 px-2 rounded text-xs font-medium disabled:bg-slate-700">5-3</button>
            <button onClick={() => handleQuickAction('6-3')} disabled={!currentPlayer} className="bg-slate-600 hover:bg-slate-500 text-white py-2 px-2 rounded text-xs font-medium disabled:bg-slate-700">6-3</button>
            <button onClick={() => handleQuickAction('F8')} disabled={!currentPlayer} className="bg-slate-600 hover:bg-slate-500 text-white py-2 px-2 rounded text-xs font-medium disabled:bg-slate-700">F8</button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-6">
            <button onClick={() => handleQuickAction('F7')} disabled={!currentPlayer} className="bg-slate-600 hover:bg-slate-500 text-white py-2 px-2 rounded text-xs font-medium disabled:bg-slate-700">F7</button>
            <button onClick={() => handleQuickAction('F6')} disabled={!currentPlayer} className="bg-slate-600 hover:bg-slate-500 text-white py-2 px-2 rounded text-xs font-medium disabled:bg-slate-700">F6</button>
            <button onClick={() => handleQuickAction('Fly')} disabled={!currentPlayer} className="bg-slate-600 hover:bg-slate-500 text-white py-2 px-2 rounded text-xs font-medium disabled:bg-slate-700">Fly</button>
          </div>

          {/* ESTADÍSTICAS DEL PITCHER */}
          <div className="bg-blue-900 rounded-lg p-4 mb-6">
            <h4 className="text-lg font-bold text-center text-blue-300 mb-3">⚾ ESTADÍSTICAS DEL PITCHER</h4>
            <p className="text-xs text-slate-400 text-center mb-3">
              Pitcher: {getCurrentPitcher()?.nombre || 'No seleccionado'}
            </p>
            
            {/* Contadores manuales */}
            <div className="bg-blue-800 rounded p-3 mb-3">
              <div className="text-xs text-blue-200 mb-2 text-center">CONTEO MANUAL</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handlePitcherAction('STRIKE_PITCH')}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white py-1 px-2 rounded text-xs"
                >
                  +Strike
                </button>
                <button
                  onClick={() => handlePitcherAction('BALL_PITCH')}
                  className="bg-green-600 hover:bg-green-700 text-white py-1 px-2 rounded text-xs"
                >
                  +Bola
                </button>
              </div>
            </div>
            
            {/* Acciones manuales del pitcher */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handlePitcherAction('K_P')}
                className="bg-red-600 hover:bg-red-700 text-white py-2 px-2 rounded text-xs font-medium"
                title="Ponche como pitcher"
              >
                <div className="font-bold">K</div>
                <div className="text-xs">Ponche</div>
              </button>
              
              <button
                onClick={() => handlePitcherAction('BB_P')}
                className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-2 rounded text-xs font-medium"
                title="Base por bolas otorgada"
              >
                <div className="font-bold">BB</div>
                <div className="text-xs">Base x Bola</div>
              </button>
              
              <button
                onClick={() => handlePitcherAction('HBP')}
                className="bg-orange-600 hover:bg-orange-700 text-white py-2 px-2 rounded text-xs font-medium"
                title="Golpe al bateador"
              >
                <div className="font-bold">HBP</div>
                <div className="text-xs">Golpe</div>
              </button>
              
              <button
                onClick={() => handlePitcherAction('BK')}
                className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-2 rounded text-xs font-medium"
                title="Balk"
              >
                <div className="font-bold">BK</div>
                <div className="text-xs">Balk</div>
              </button>
            </div>
          </div>

          {/* ERRORES DEFENSIVOS */}
          <div className="bg-slate-800 rounded-lg p-4 mb-6">
            <h4 className="text-lg font-bold text-center text-red-400 mb-3">⚾ ERRORES DEFENSIVOS</h4>
            <p className="text-xs text-slate-400 text-center mb-3">
              Equipo en campo: {currentTeam === 'local' ? 'Visitante' : 'Local'}
            </p>
            
            <div className="grid grid-cols-3 gap-2">
              {BASEBALL_POSITIONS.map((position) => (
                <button
                  key={position.code}
                  onClick={() => handleDefensiveError(position.code, position.number)}
                  className="bg-red-600 hover:bg-red-700 text-white py-2 px-2 rounded text-xs font-medium transition-colors"
                  title={`Error de ${position.name}`}
                >
                  <div className="font-bold">E{position.number}</div>
                  <div className="text-xs">{position.code}</div>
                </button>
              ))}
            </div>
          </div>

          {/* BOTONES DE CONTROL */}
          <div className="flex justify-between">
            <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg text-sm font-bold shadow-lg">
              💾 GUARDAR
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-sm font-bold shadow-lg">
              📄 EXPORTAR PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}