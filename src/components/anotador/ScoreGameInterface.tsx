'use client';

import { useState, useEffect, useRef } from 'react';
import React from 'react';
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
  
  // Estado global de corredores en el campo (por jugador)
  const [globalRunners, setGlobalRunners] = useState<{
    first: number | null;  // Número del jugador en primera base
    second: number | null; // Número del jugador en segunda base  
    third: number | null;  // Número del jugador en tercera base
  }>({
    first: null,
    second: null,
    third: null,
  });
  
  // Estado para el modo de movimiento manual
  const [manualMoveMode, setManualMoveMode] = useState<{
    active: boolean;
    selectedRunner: { base: 'first' | 'second' | 'third'; playerNum: number } | null;
  }>({
    active: false,
    selectedRunner: null
  });

  // Estado para rastrear bases robadas
  const [stolenBases, setStolenBases] = useState<{
    [playerId: string]: number;
  }>({});

  // Estado para entrada personalizada de OUT
  const [customOutEntry, setCustomOutEntry] = useState<{
    isActive: boolean;
    inputValue: string;
  }>({ isActive: false, inputValue: '' });

  // Estado para modo robo de base (long press)
  const [stealMode, setStealMode] = useState<{
    [key: string]: 'normal' | 'stealing' | 'batting'; // normal=gris, stealing=naranja, batting=verde
  }>({});

  // Estado para detectar long press
  const [longPressState, setLongPressState] = useState<{
    isPressed: boolean;
    pressedRunner: string | null;
    pressTimer: NodeJS.Timeout | null;
  }>({
    isPressed: false,
    pressedRunner: null,
    pressTimer: null
  });
  
  // Estado para el modal de edición
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    playerId: string | null;
    inning: number | null;
    currentAction: string | null;
  }>({
    isOpen: false,
    playerId: null,
    inning: null,
    currentAction: null
  });
  
  // Estados para long press
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  
  // Estado para rastrear posición final de cada jugador por entrada
  const [playerFinalPositions, setPlayerFinalPositions] = useState<{
    [playerId: string]: {
      [entrada: number]: 'first' | 'second' | 'third' | 'home' | null;
    };
  }>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeQuadrants, setActiveQuadrants] = useState<string[]>([]);
  const [playerStats, setPlayerStats] = useState<{[key: string]: any}>({});
  const [selectedPlayers, setSelectedPlayers] = useState<{[position: number]: Player | null}>({});
  const [selectedPositions, setSelectedPositions] = useState<{[lineupPosition: number]: string}>({});
  
  // Estados separados para mantener lineups por equipo
  const [selectedPlayersLocal, setSelectedPlayersLocal] = useState<{[position: number]: Player | null}>({});
  const [selectedPositionsLocal, setSelectedPositionsLocal] = useState<{[lineupPosition: number]: string}>({});
  const [selectedPlayersVisitante, setSelectedPlayersVisitante] = useState<{[position: number]: Player | null}>({});
  const [selectedPositionsVisitante, setSelectedPositionsVisitante] = useState<{[lineupPosition: number]: string}>({});
  
  const [dropdownOpen, setDropdownOpen] = useState<number | string | null>(null);
  const [lastPitchCount, setLastPitchCount] = useState(0);
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false);
  const processingAutoAction = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Estados para sistema de jugadas forzadas
  const [showForcePlayModal, setShowForcePlayModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [forcedRunners, setForcedRunners] = useState<Array<{
    playerNum: number;
    fromBase: 'first' | 'second' | 'third';
    toBase: 'second' | 'third' | 'home';
    status: 'pending' | 'safe' | 'out';
  }>>([]);

  // Estados para sistema de Interferencia
  const [showInterferenceModal, setShowInterferenceModal] = useState(false);
  const [interferenceType, setInterferenceType] = useState<'batter' | 'runner' | 'catcher' | 'fan' | 'coach' | null>(null);

  // Estados para Wild Pitch y Passed Ball
  const [showWildPitchModal, setShowWildPitchModal] = useState(false);
  const [wildPitchType, setWildPitchType] = useState<'WP' | 'PB' | null>(null);
  const [runnersToAdvance, setRunnersToAdvance] = useState<Array<{
    playerNum: number;
    fromBase: 'first' | 'second' | 'third';
    toBase: 'second' | 'third' | 'home';
  }>>([]);
  const [selectedRunners, setSelectedRunners] = useState<Set<number>>(new Set());

  // Estados para Infield Fly Rule
  const [showInfieldFlyModal, setShowInfieldFlyModal] = useState(false);
  const [infieldFlyType, setInfieldFlyType] = useState<'caught' | 'dropped' | null>(null);
  const [infieldFlyPosition, setInfieldFlyPosition] = useState<number | null>(null);

  // Estados para Balk
  const [showBalkModal, setShowBalkModal] = useState(false);

  // Estados para menús desplegables
  const [showErrorMenu, setShowErrorMenu] = useState(false);
  const [showDoublePlayMenu, setShowDoublePlayMenu] = useState(false);
  const [showOtherActionsMenu, setShowOtherActionsMenu] = useState(false);
  const [showInfieldFlyMenu, setShowInfieldFlyMenu] = useState(false);
  const [showSpecialSituationsMenu, setShowSpecialSituationsMenu] = useState(false);
  const [showPitchingMenu, setShowPitchingMenu] = useState(false);
  const [showOutMenu, setShowOutMenu] = useState(false);

  // Estados para conteo de lanzamientos
  const [pitchCount, setPitchCount] = useState({ balls: 0, strikes: 0 });

  // Funciones para guardado temporal en localStorage
  const saveTemporaryLineup = () => {
    if (!gameId) return;
    
    const tempData = {
      local: {
        players: selectedPlayersLocal,
        positions: selectedPositionsLocal
      },
      visitante: {
        players: selectedPlayersVisitante,
        positions: selectedPositionsVisitante
      },
      // Incluir todas las estadísticas y datos del juego
      playerStats,
      inningData,
      scoreLocal,
      scoreVisitante,
      globalRunners,
      gameState,
      currentTeam,
      currentPlayer,
      currentInning,
      timestamp: Date.now()
    };
    
    localStorage.setItem(`lineup_temp_${gameId}`, JSON.stringify(tempData));
    console.log('💾 Guardado temporal completo:', {
      jugadoresLocal: Object.keys(selectedPlayersLocal).length,
      jugadoresVisitante: Object.keys(selectedPlayersVisitante).length,
      estadisticas: Object.keys(playerStats).length,
      innings: Object.keys(inningData).length,
      carrerasLocal: Object.values(scoreLocal).reduce((a, b) => a + b, 0),
      carrerasVisitante: Object.values(scoreVisitante).reduce((a, b) => a + b, 0),
      corredores: [globalRunners.first, globalRunners.second, globalRunners.third].filter(r => r !== null).length
    });
  };

  // Función con debounce para evitar guardados excesivos
  const debouncedSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveTemporaryLineup();
    }, 1000); // Esperar 1 segundo antes de guardar
  };

  const loadTemporaryLineup = () => {
    if (!gameId) return false;
    
    try {
      const tempData = localStorage.getItem(`lineup_temp_${gameId}`);
      if (tempData) {
        const parsed = JSON.parse(tempData);
        
        // Solo cargar si es reciente (menos de 24 horas)
        const hoursPassed = (Date.now() - parsed.timestamp) / (1000 * 60 * 60);
        if (hoursPassed < 24) {
          // Cargar lineups
          setSelectedPlayersLocal(parsed.local.players || {});
          setSelectedPositionsLocal(parsed.local.positions || {});
          setSelectedPlayersVisitante(parsed.visitante.players || {});
          setSelectedPositionsVisitante(parsed.visitante.positions || {});
          
          // Cargar todas las estadísticas y datos del juego
          if (parsed.playerStats) setPlayerStats(parsed.playerStats);
          if (parsed.inningData) setInningData(parsed.inningData);
          if (parsed.scoreLocal) setScoreLocal(parsed.scoreLocal);
          if (parsed.scoreVisitante) setScoreVisitante(parsed.scoreVisitante);
          if (parsed.globalRunners) setGlobalRunners(parsed.globalRunners);
          if (parsed.gameState) setGameState(parsed.gameState);
          if (parsed.currentPlayer) setCurrentPlayer(parsed.currentPlayer);
          if (parsed.currentInning) setCurrentInning(parsed.currentInning);
          
          // Sincronizar estado visual de runners con globalRunners
          if (parsed.globalRunners) {
            setRunners({
              first: parsed.globalRunners.first !== null,
              second: parsed.globalRunners.second !== null,
              third: parsed.globalRunners.third !== null,
              home: false
            });
          }
          
          // Establecer el equipo actual
          if (parsed.currentTeam) {
            setCurrentTeam(parsed.currentTeam);
          }
          
          console.log('📄 Cargado temporal completo: lineup, estadísticas, carreras y estado del juego');
          return true;
        } else {
          // Datos muy antiguos, limpiar
          localStorage.removeItem(`lineup_temp_${gameId}`);
          console.log('🗑️ Datos temporales antiguos eliminados (más de 24 horas)');
        }
      }
    } catch (error) {
      console.error('Error cargando lineup temporal:', error);
    }
    return false;
  };

  const clearTemporaryLineup = () => {
    if (gameId) {
      localStorage.removeItem(`lineup_temp_${gameId}`);
    }
  };

  const refreshLineup = async () => {
    // Limpiar todos los estados de lineup
    setSelectedPlayers({});
    setSelectedPositions({});
    setSelectedPlayersLocal({});
    setSelectedPositionsLocal({});
    setSelectedPlayersVisitante({});
    setSelectedPositionsVisitante({});
    
    // Limpiar localStorage
    clearTemporaryLineup();
    
    // Limpiar todas las estadísticas y datos del juego
    setPlayerStats({});
    setInningData({});
    setScoreLocal({1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0});
    setScoreVisitante({1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0});
    setCurrentPlayer(null);
    setCurrentInning(1);
    setGlobalRunners({ first: null, second: null, third: null });
    setRunners({ first: false, second: false, third: false, home: false });
    setGameState({ strikes: 0, balls: 0, outs: 0, activeRunners: 0 });
    
    // Recargar datos frescos del servidor
    await fetchGameData();
    
    setShowRefreshConfirm(false);
    setSuccessMessage('✅ Datos refrescados desde el servidor. Lineup reiniciado completamente.');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  useEffect(() => {
    fetchGameData();
    // Cargar datos temporales al inicio
    const loadedTemp = loadTemporaryLineup();
    if (loadedTemp) {
      setSuccessMessage('📄 Se cargaron datos temporales guardados anteriormente');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  }, [gameId]);

  // Manejar cambio entre equipos
  useEffect(() => {
    if (gameData) {
      // Guardar el lineup actual antes de cambiar
      if (currentTeam === 'local') {
        // Actualizar los estados específicos de local
        setSelectedPlayers(selectedPlayersLocal);
        setSelectedPositions(selectedPositionsLocal);
      } else {
        // Actualizar los estados específicos de visitante
        setSelectedPlayers(selectedPlayersVisitante);
        setSelectedPositions(selectedPositionsVisitante);
      }
      
      // Cargar lineup guardado si existe
      loadSavedLineup();
    }
  }, [currentTeam]);

  // Sincronizar cambios con los estados por equipo
  useEffect(() => {
    if (currentTeam === 'local') {
      setSelectedPlayersLocal(selectedPlayers);
      setSelectedPositionsLocal(selectedPositions);
    } else {
      setSelectedPlayersVisitante(selectedPlayers);
      setSelectedPositionsVisitante(selectedPositions);
    }
  }, [selectedPlayers, selectedPositions]);

  // Auto-guardado temporal con debounce
  useEffect(() => {
    if (gameId && gameData) {
      // Solo guardar si hay al menos un jugador seleccionado o datos registrados
      const hasLocalPlayers = Object.values(selectedPlayersLocal).some(player => player !== null);
      const hasVisitantePlayers = Object.values(selectedPlayersVisitante).some(player => player !== null);
      const hasStats = Object.keys(playerStats).length > 0;
      const hasInningData = Object.keys(inningData).length > 0;
      
      if (hasLocalPlayers || hasVisitantePlayers || hasStats || hasInningData) {
        debouncedSave();
      }
    }
  }, [
    selectedPlayersLocal, selectedPositionsLocal, 
    selectedPlayersVisitante, selectedPositionsVisitante, 
    playerStats, inningData, scoreLocal, scoreVisitante,
    globalRunners, gameState, currentTeam, currentPlayer, 
    currentInning, gameId
  ]);

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
        
        // Si es error 401 (sesión inválida), redireccionar al login
        if (response.status === 401) {
          console.log('🔐 Sesión expirada, redirigiendo al login...');
          router.push('/anotador/login');
          return;
        }
        
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
      
      // Cargar lineup guardado si existe
      await loadSavedLineup();
      
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

  // Función para detectar jugadas forzadas
  const detectForcePlay = (action: string) => {
    const forcedRunnersList: Array<{
      playerNum: number;
      fromBase: 'first' | 'second' | 'third';
      toBase: 'second' | 'third' | 'home';
      status: 'pending' | 'safe' | 'out';
    }> = [];

    // Acciones que causan jugadas forzadas (rodados principalmente)
    const forcePlayActions = ['4-3', '5-3', '6-3', '6-4-3', '4-6-3', '1-3', 'GO', 'DP', 'DP-6-4-3', 'DP-5-4-3', 'DP-4-6-3'];
    
    if (!forcePlayActions.includes(action)) {
      return forcedRunnersList; // No es jugada forzada
    }

    // Si hay corredor en primera base, debe avanzar (siempre forzado)
    if (globalRunners.first !== null) {
      forcedRunnersList.push({
        playerNum: globalRunners.first,
        fromBase: 'first',
        toBase: 'second',
        status: 'pending'
      });
    }

    // Si hay corredor en segunda Y en primera, el de segunda también está forzado
    if (globalRunners.second !== null && globalRunners.first !== null) {
      forcedRunnersList.push({
        playerNum: globalRunners.second,
        fromBase: 'second',
        toBase: 'third',
        status: 'pending'
      });
    }

    // Si hay corredores en primera, segunda Y tercera, todos están forzados
    if (globalRunners.third !== null && globalRunners.second !== null && globalRunners.first !== null) {
      // Ya agregamos primera y segunda arriba, ahora agregamos tercera
      forcedRunnersList.push({
        playerNum: globalRunners.third,
        fromBase: 'third',
        toBase: 'home',
        status: 'pending'
      });
    }

    return forcedRunnersList;
  };

  // Función para manejar la resolución de jugadas forzadas
  const resolveForcePlay = (action: string) => {
    const currentPlayerInfo = getCurrentPlayerInfo();
    const currentPlayerNum = currentPlayerInfo?.numero || 1;
    const forcedRunnersList = detectForcePlay(action);
    
    if (forcedRunnersList.length > 0) {
      // Hay jugadas forzadas - mostrar modal de confirmación
      setForcedRunners(forcedRunnersList);
      setPendingAction(action);
      setShowForcePlayModal(true);
      return true; // Indica que se está manejando una jugada forzada
    }
    
    return false; // No hay jugadas forzadas, continuar normal
  };

  // Función para aplicar los resultados de jugadas forzadas
  const applyForcePlayResults = () => {
    if (!pendingAction) return;

    let newGlobalRunners = { ...globalRunners };
    let totalRuns = 0;
    let totalOuts = 0;

    // Procesar cada corredor forzado
    forcedRunners.forEach(runner => {
      if (runner.status === 'safe') {
        // El corredor llegó safe, moverlo a la nueva base
        if (runner.toBase === 'home') {
          // Carrera anotada
          totalRuns++;
          newGlobalRunners[runner.fromBase] = null;
        } else {
          // Mover a la base de destino
          newGlobalRunners[runner.toBase] = runner.playerNum;
          newGlobalRunners[runner.fromBase] = null;
        }
      } else if (runner.status === 'out') {
        // El corredor fue puesto out, removerlo del juego
        newGlobalRunners[runner.fromBase] = null;
        totalOuts++;
      }
    });

    // Para rodados que no causan out al bateador, el bateador puede ir a primera
    if (pendingAction && ['4-3', '5-3', '6-3'].includes(pendingAction)) {
      // En rodados simples, el bateador generalmente es out también
      totalOuts++; // Out del bateador
    }

    // Actualizar estados del juego
    const currentPlayerInfo = getCurrentPlayerInfo();
    const currentPlayerNum = currentPlayerInfo?.numero || 1;

    // Actualizar runners y game state
    setGlobalRunners(newGlobalRunners);
    setGameState(prev => ({
      ...prev,
      outs: Math.min(prev.outs + totalOuts, 3),
      strikes: 0,
      balls: 0
    }));

    // Añadir carreras si las hay
    for (let i = 0; i < totalRuns; i++) {
      addRun();
    }

    // Registrar la acción
    const newInningData = { ...inningData };
    if (currentPlayer !== null && !newInningData[currentPlayer]) {
      newInningData[currentPlayer] = {};
    }
    
    const actionDetail = `${pendingAction} - ${forcedRunners.map(r => 
      `#${r.playerNum}(${r.fromBase}→${r.toBase}): ${r.status === 'safe' ? 'SAFE' : 'OUT'}`
    ).join(', ')}`;

    if (currentPlayer !== null) {
      newInningData[currentPlayer][currentInning] = {
        accion: pendingAction,
        bases: [],
        carrera: totalRuns > 0,
        detalle: actionDetail
      };
    }

    setInningData(newInningData);

    // Cerrar modal y limpiar estados
    setShowForcePlayModal(false);
    setForcedRunners([]);
    setPendingAction(null);
  };

  // =================== SISTEMA DE INTERFERENCIA ===================
  const handleInterference = (type: 'batter' | 'runner' | 'catcher' | 'fan' | 'coach') => {
    setInterferenceType(type);
    setShowInterferenceModal(true);
  };

  const applyInterferenceResult = async () => {
    if (!interferenceType || !currentPlayer) return;

    try {
      const player = getCurrentPlayers().find(p => p.id === currentPlayer);
      let actionText = '';
      let newGlobalRunners = { ...globalRunners };
      let carrerasAnotadas = 0;

      switch (interferenceType) {
        case 'batter':
          // BI - Batter Interference: Bateador OUT automático
          actionText = 'BI';
          await savePlayerStats(currentPlayer, 'BI', 0, 0, 0);
          
          // Incrementar outs
          setGameState(prev => ({ ...prev, outs: prev.outs + 1 }));
          
          setSuccessMessage(`🚫 BI - ${player?.nombre} OUT por interferencia del bateador`);
          
          // Avanzar al siguiente bateador si no hay 3 outs
          if (gameState.outs < 2) {
            advanceToNextPlayer();
          }
          break;

        case 'runner':
          // RI - Runner Interference: Corredor OUT + jugada se detiene
          actionText = 'RI';
          
          // Eliminar corredor interferente de las bases (se manejará manualmente)
          setSuccessMessage(`🚫 RI - Corredor OUT por interferencia. Selecciona manualmente qué corredor interferió.`);
          
          // Incrementar outs
          setGameState(prev => ({ ...prev, outs: prev.outs + 1 }));
          break;

        case 'catcher':
          // CI - Catcher Interference: Bateador a primera base + Error E2
          actionText = 'CI';
          await savePlayerStats(currentPlayer, 'CI', 0, 0, 0);
          
          // Registrar error del catcher
          const catcherLineupPosition = Object.keys(selectedPositions).find(pos => 
            selectedPositions[parseInt(pos)] === 'C'
          );
          const catcher = catcherLineupPosition ? getCurrentPlayers()[parseInt(catcherLineupPosition)] : null;
          
          if (catcher) {
            await saveDefensiveError(catcher.id, 'C', 2);
          }

          // Bateador va a primera base (con fuerza si es necesario)
          const currentPlayerNum = player?.numero;
          if (currentPlayerNum) {
            // Avanzar corredores por fuerza
            if (newGlobalRunners.third && newGlobalRunners.second && newGlobalRunners.first) {
              // Bases llenas - corredor de 3ª anota
              carrerasAnotadas++;
              addRun();
              newGlobalRunners.third = newGlobalRunners.second;
              newGlobalRunners.second = newGlobalRunners.first;
            } else if (newGlobalRunners.second && newGlobalRunners.first) {
              // 1ª y 2ª ocupadas - corredor de 2ª a 3ª
              newGlobalRunners.third = newGlobalRunners.second;
              newGlobalRunners.second = newGlobalRunners.first;
            } else if (newGlobalRunners.first) {
              // Solo 1ª ocupada - corredor a 2ª
              newGlobalRunners.second = newGlobalRunners.first;
            }
            
            newGlobalRunners.first = currentPlayerNum;
          }

          setGlobalRunners(newGlobalRunners);
          setSuccessMessage(`🎯 CI - ${player?.nombre} a primera base por interferencia del catcher ${carrerasAnotadas > 0 ? `- ${carrerasAnotadas} carreras` : ''}`);
          
          // Avanzar al siguiente bateador
          advanceToNextPlayer();
          break;

        case 'fan':
          // Fan Interference: Bola muerta - decisión arbitral
          actionText = 'Fan INT';
          setSuccessMessage(`📢 Fan INT - Bola muerta por interferencia de espectador. Decisión arbitral.`);
          break;

        case 'coach':
          // Coach Interference: Bola muerta - decisión arbitral
          actionText = 'Coach INT';
          setSuccessMessage(`📢 Coach INT - Bola muerta por interferencia de coach. Decisión arbitral.`);
          break;
      }

      // Registrar la interferencia en el inning data
      const newInningData = { ...inningData };
      if (!newInningData[currentPlayer]) {
        newInningData[currentPlayer] = {};
      }
      newInningData[currentPlayer][currentInning] = {
        accion: actionText,
        bases: [],
        carrera: carrerasAnotadas > 0,
        detalle: `Interferencia: ${getInterferenceDescription(interferenceType)}`
      };

      setInningData(newInningData);

    } catch (error) {
      console.error('❌ Error registrando interferencia:', error);
      setSuccessMessage('❌ Error al registrar interferencia');
    }

    setTimeout(() => setSuccessMessage(''), 3000);
    
    // Cerrar modal
    setShowInterferenceModal(false);
    setInterferenceType(null);
  };

  // Helper function para descripciones
  const getInterferenceDescription = (type: string) => {
    const descriptions = {
      'batter': 'Bateador interfiere con catcher',
      'runner': 'Corredor interfiere con fildeador', 
      'catcher': 'Catcher interfiere con bateador',
      'fan': 'Espectador interfiere con jugada',
      'coach': 'Coach interfiere con jugada'
    };
    return descriptions[type as keyof typeof descriptions] || type;
  };

  // =================== SISTEMA DE WILD PITCH / PASSED BALL ===================
  const handleWildPitch = (type: 'WP' | 'PB') => {
    setWildPitchType(type);
    
    // Detectar corredores que pueden avanzar
    const runnersCanAdvance = [];
    if (globalRunners.third) {
      runnersCanAdvance.push({
        playerNum: globalRunners.third,
        fromBase: 'third' as const,
        toBase: 'home' as const
      });
    }
    if (globalRunners.second) {
      runnersCanAdvance.push({
        playerNum: globalRunners.second,
        fromBase: 'second' as const,
        toBase: 'third' as const
      });
    }
    if (globalRunners.first) {
      runnersCanAdvance.push({
        playerNum: globalRunners.first,
        fromBase: 'first' as const,
        toBase: 'second' as const
      });
    }

    setRunnersToAdvance(runnersCanAdvance);
    setShowWildPitchModal(true);
  };

  const applyWildPitchResult = async (advances: {[playerNum: number]: boolean}) => {
    if (!wildPitchType) return;

    let newGlobalRunners = { ...globalRunners };
    let totalRuns = 0;
    let actionText = wildPitchType === 'WP' ? 'WP (Wild Pitch)' : 'PB (Passed Ball)';

    // Procesar avances de corredores
    runnersToAdvance.forEach(runner => {
      if (advances[runner.playerNum]) {
        // Corredor avanza
        if (runner.toBase === 'home') {
          totalRuns++;
          // Remover corredor de tercera
          newGlobalRunners.third = null;
        } else if (runner.toBase === 'third') {
          newGlobalRunners.third = runner.playerNum;
          newGlobalRunners.second = null;
        } else if (runner.toBase === 'second') {
          newGlobalRunners.second = runner.playerNum;
          newGlobalRunners.first = null;
        }
      }
    });

    // Actualizar estadísticas del pitcher
    const pitcher = getCurrentPitcher();
    if (pitcher) {
      try {
        const pitcherStatsData = {
          gameId: gameData?.id,
          jugadorId: pitcher.id,
          accion: wildPitchType,
          lanzamientos: 1,
          strikes: 0,
          bolas: 0
        };

        const response = await fetch('/api/anotador/save-pitcher-stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pitcherStatsData),
        });

        if (!response.ok) {
          console.error('Error guardando estadísticas de pitcher');
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }

    // Registrar la acción
    const newInningData = { ...inningData };
    if (!newInningData[currentPlayer || '']) {
      newInningData[currentPlayer || ''] = {};
    }
    newInningData[currentPlayer || ''][currentInning] = {
      accion: actionText,
      bases: [],
      carrera: totalRuns > 0,
      detalle: `Corredores avanzaron por ${wildPitchType}`
    };

    setInningData(newInningData);
    setGlobalRunners(newGlobalRunners);
    
    // Actualizar carreras si hubo anotaciones
    if (totalRuns > 0) {
      if (currentTeam === 'local') {
        setScoreLocal(prev => ({
          ...prev,
          [currentInning]: (prev[currentInning] || 0) + totalRuns
        }));
      } else {
        setScoreVisitante(prev => ({
          ...prev,
          [currentInning]: (prev[currentInning] || 0) + totalRuns
        }));
      }
    }
    
    // Cerrar modal
    setShowWildPitchModal(false);
    setWildPitchType(null);
    setRunnersToAdvance([]);
    setSelectedRunners(new Set());

    setSuccessMessage(`${actionText} registrado - ${totalRuns} carreras anotadas`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // =================== SISTEMA DE INFIELD FLY RULE ===================
  
  // Verificar si aplica la regla de Infield Fly
  const canApplyInfieldFly = () => {
    // Menos de 2 outs
    if (gameState.outs >= 2) return false;
    
    // Corredores en 1ª y 2ª, o bases llenas
    const hasFirst = globalRunners.first !== null;
    const hasSecond = globalRunners.second !== null;
    const hasThird = globalRunners.third !== null;
    
    return (hasFirst && hasSecond) || (hasFirst && hasSecond && hasThird);
  };

  const handleInfieldFly = (position: number, type: 'caught' | 'dropped') => {
    if (!canApplyInfieldFly()) {
      setSuccessMessage('❌ No se puede aplicar Infield Fly Rule en esta situación');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    setInfieldFlyPosition(position);
    setInfieldFlyType(type);
    setShowInfieldFlyModal(true);
  };

  const getPositionCode = (positionNumber: number): string => {
    const positionMap: { [key: number]: string } = {
      1: 'P',
      2: 'C', 
      3: '1B',
      4: '2B',
      5: '3B',
      6: 'SS',
      7: 'JI',
      8: 'JC',
      9: 'JD'
    };
    return positionMap[positionNumber] || '';
  };

  const advanceRunner = (playerId: string | null, currentRunners: { first: number | null; second: number | null; third: number | null }, toBase: 'first' | 'second' | 'third' | 'home') => {
    const newRunners = { ...currentRunners };
    let runs = 0;

    if (!playerId) return { newRunners, runs };

    const playerNumber = getCurrentPlayers().find(p => p.id === playerId)?.numero || 0;

    // CAMBIO: Ya NO hay avance forzado automático - solo manual
    // Solo coloca al bateador en la base solicitada
    if (toBase === 'first') {
      // Ya no forzamos avances automáticos - los corredores se mantienen en sus bases
      // Solo verificamos si la primera base está ocupada para mostrar advertencia
      if (newRunners.first !== null) {
        console.log('⚠️ Primera base ocupada - requiere decisión manual del anotador');
        // No forzamos el avance - el anotador debe mover manualmente los corredores
      }
      newRunners.first = playerNumber; // Solo el bateador va a primera
    } else if (toBase === 'second') {
      newRunners.second = playerNumber;
    } else if (toBase === 'third') {
      newRunners.third = playerNumber;
    } else if (toBase === 'home') {
      runs++; // Carrera anotada
    }

    return { newRunners, runs };
  };

  const confirmInfieldFly = async () => {
    if (!currentPlayer || !infieldFlyPosition || !infieldFlyType) return;

    try {
      const player = getCurrentPlayers().find(p => p.id === currentPlayer);
      const positionCode = getPositionCode(infieldFlyPosition);
      
      // El bateador está automáticamente out
      const action = infieldFlyType === 'caught' 
        ? `IF${infieldFlyPosition}` 
        : `IF${infieldFlyPosition} (dropped)`;

      // Guardar la estadística
      await savePlayerStats(currentPlayer, action, 0, 0, 0);

      // Actualizar outs
      setGameState(prev => ({ ...prev, outs: prev.outs + 1 }));

      // Los corredores NO avanzan automáticamente, solo pueden avanzar bajo su riesgo
      // En la implementación básica, mantenemos corredores en sus bases

      setSuccessMessage(`${action} - ${player?.nombre} está OUT (Infield Fly Rule)`);
      setTimeout(() => setSuccessMessage(''), 3000);

      // Avanzar al siguiente bateador si no hay 3 outs
      if (gameState.outs < 2) {
        advanceToNextPlayer();
      }

    } catch (error) {
      console.error('❌ Error registrando Infield Fly:', error);
      setSuccessMessage('❌ Error al registrar Infield Fly');
      setTimeout(() => setSuccessMessage(''), 3000);
    }

    // Cerrar modal
    setShowInfieldFlyModal(false);
    setInfieldFlyType(null);
    setInfieldFlyPosition(null);
  };

  // =================== SISTEMA DE BALK ===================
  
  const handleBalk = async () => {
    if (!getCurrentPitcher()) {
      setSuccessMessage('❌ No hay pitcher activo');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    // Todos los corredores avanzan automáticamente una base
    const newGlobalRunners = { ...globalRunners };
    let carrerasAnotadas = 0;

    // Avanzar corredores (de atrás hacia adelante para evitar conflicts)
    if (newGlobalRunners.third) {
      carrerasAnotadas++;
      addRun();
      newGlobalRunners.third = null;
    }
    if (newGlobalRunners.second) {
      newGlobalRunners.third = newGlobalRunners.second;
      newGlobalRunners.second = null;
    }
    if (newGlobalRunners.first) {
      newGlobalRunners.second = newGlobalRunners.first;
      newGlobalRunners.first = null;
    }

    setGlobalRunners(newGlobalRunners);

    // Registrar Balk en estadísticas del pitcher
    const pitcher = getCurrentPitcher();
    if (pitcher) {
      try {
        await savePitcherStats(pitcher.id, 'BALK', pitchCount.balls + pitchCount.strikes, pitchCount.strikes, pitchCount.balls);
        setSuccessMessage(`🚫 BALK registrado - ${pitcher.nombre} - ${carrerasAnotadas} carreras anotadas`);
      } catch (error) {
        setSuccessMessage('❌ Error registrando BALK');
      }
    }
    
    setTimeout(() => setSuccessMessage(''), 3000);
    setShowBalkModal(false);
  };

  // =================== SISTEMA DE HIT BY PITCH (HBP) ===================
  
  const handleHitByPitch = async () => {
    if (!currentPlayer) {
      setSuccessMessage('❌ No hay bateador activo');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    try {
      const player = getCurrentPlayers().find(p => p.id === currentPlayer);
      
      // Guardar estadística (HBP NO cuenta como turno al bat)
      await savePlayerStats(currentPlayer, 'HBP', 0, 0, 0);

      // Bateador va a primera base
      const { newRunners, runs } = advanceRunner(currentPlayer, globalRunners, 'first');
      setGlobalRunners(newRunners);

      // Sumar carreras si hay fuerza
      if (runs > 0) {
        for (let i = 0; i < runs; i++) {
          addRun();
        }
      }

      setSuccessMessage(`🎯 HBP - ${player?.nombre} golpeado por lanzamiento ${runs > 0 ? `- ${runs} carreras` : ''}`);
      setTimeout(() => setSuccessMessage(''), 3000);

      // Reiniciar conteo y avanzar al siguiente bateador
      setPitchCount({ balls: 0, strikes: 0 });
      advanceToNextPlayer();

    } catch (error) {
      console.error('❌ Error registrando HBP:', error);
      setSuccessMessage('❌ Error al registrar HBP');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // =================== SISTEMA DE BASES POR BOLAS (BB) ===================
  
  const handleBaseOnBalls = async () => {
    if (!currentPlayer) {
      setSuccessMessage('❌ No hay bateador activo');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    try {
      const player = getCurrentPlayers().find(p => p.id === currentPlayer);
      
      // Guardar estadística (BB NO cuenta como turno al bat)
      await savePlayerStats(currentPlayer, 'BB', 0, 0, 0);

      // Bateador va a primera base
      const { newRunners, runs } = advanceRunner(currentPlayer, globalRunners, 'first');
      setGlobalRunners(newRunners);

      // Sumar carreras si hay fuerza
      if (runs > 0) {
        for (let i = 0; i < runs; i++) {
          addRun();
        }
      }

      setSuccessMessage(`🚶‍♂️ BB - ${player?.nombre} base por bolas ${runs > 0 ? `- ${runs} carreras` : ''}`);
      setTimeout(() => setSuccessMessage(''), 3000);

      // Reiniciar conteo y avanzar al siguiente bateador
      setPitchCount({ balls: 0, strikes: 0 });
      advanceToNextPlayer();

    } catch (error) {
      console.error('❌ Error registrando BB:', error);
      setSuccessMessage('❌ Error al registrar BB');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // =================== SISTEMA DE IBB (BASES POR BOLAS INTENCIONALES) ===================
  
  const handleIntentionalWalk = async () => {
    if (!currentPlayer) {
      setSuccessMessage('❌ No hay bateador activo');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    try {
      const player = getCurrentPlayers().find(p => p.id === currentPlayer);
      
      // Guardar estadística (IBB NO cuenta como turno al bat)
      await savePlayerStats(currentPlayer, 'IBB', 0, 0, 0);

      // Bateador va a primera base
      const { newRunners, runs } = advanceRunner(currentPlayer, globalRunners, 'first');
      setGlobalRunners(newRunners);

      // Sumar carreras si hay fuerza
      if (runs > 0) {
        for (let i = 0; i < runs; i++) {
          addRun();
        }
      }

      setSuccessMessage(`🎯 IBB - ${player?.nombre} base por bolas intencional ${runs > 0 ? `- ${runs} carreras` : ''}`);
      setTimeout(() => setSuccessMessage(''), 3000);

      // Reiniciar conteo y avanzar al siguiente bateador
      setPitchCount({ balls: 0, strikes: 0 });
      advanceToNextPlayer();

    } catch (error) {
      console.error('❌ Error registrando IBB:', error);
      setSuccessMessage('❌ Error al registrar IBB');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // =================== SISTEMA DE CONTEO DE LANZAMIENTOS ===================
  
  const handlePitch = (type: 'ball' | 'strike') => {
    const newPitchCount = { ...pitchCount };
    
    if (type === 'ball') {
      newPitchCount.balls++;
      if (newPitchCount.balls >= 4) {
        // Base por bolas automática
        handleBaseOnBalls();
        return;
      }
    } else {
      newPitchCount.strikes++;
      if (newPitchCount.strikes >= 3) {
        // Ponche automático
        handleStrikeout();
        return;
      }
    }
    
    setPitchCount(newPitchCount);
    setSuccessMessage(`${type === 'ball' ? 'Bola' : 'Strike'}: ${newPitchCount.balls}-${newPitchCount.strikes}`);
    setTimeout(() => setSuccessMessage(''), 2000);
  };

  const handleStrikeout = async () => {
    if (!currentPlayer) return;

    try {
      const player = getCurrentPlayers().find(p => p.id === currentPlayer);
      
      // Guardar estadística del bateador (K SÍ cuenta como turno al bat)
      await savePlayerStats(currentPlayer, 'K', 0, 0, 0);

      // Registrar ponche para el pitcher
      const pitcher = getCurrentPitcher();
      if (pitcher) {
        await savePitcherStats(pitcher.id, 'K', pitchCount.balls + pitchCount.strikes + 1, 3, pitchCount.balls);
      }

      // Incrementar outs
      setGameState(prev => ({ ...prev, outs: prev.outs + 1 }));

      setSuccessMessage(`⚾ K - ${player?.nombre} ponchado`);
      setTimeout(() => setSuccessMessage(''), 3000);

      // Reiniciar conteo y avanzar al siguiente bateador si no hay 3 outs
      setPitchCount({ balls: 0, strikes: 0 });
      if (gameState.outs < 2) {
        advanceToNextPlayer();
      }

    } catch (error) {
      console.error('❌ Error registrando ponche:', error);
      setSuccessMessage('❌ Error al registrar ponche');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // Función para calcular avance automático de corredores
  const calculateRunnerAdvancement = (action: string, currentPlayerNum: number) => {
    const newGlobalRunners = { ...globalRunners };
    let carrera = false;
    let carrerasTotal = 0;
    let rbis = 0;

    if (action === 'H1' || action === '1B') {
      // Hit sencillo: avanza 1 base, el bateador va a primera
      if (globalRunners.third !== null) {
        carrerasTotal++; // Corredor en tercera anota (avanza 1 base a home)
        rbis++;
        carrera = true;
      }
      if (globalRunners.second !== null) {
        newGlobalRunners.third = globalRunners.second; // Corredor en segunda va a tercera (NO anota)
        newGlobalRunners.second = null;
      }
      if (globalRunners.first !== null) {
        newGlobalRunners.second = globalRunners.first; // Corredor en primera va a segunda (NO anota)
      }
      newGlobalRunners.first = currentPlayerNum;

    } else if (action === 'H2' || action === '2B') {
      // Doble: avanza 2 bases, el bateador va a segunda
      // Solo los corredores en primera y segunda anotan, tercera se queda en tercera
      if (globalRunners.second !== null) {
        carrerasTotal++; // Corredor en segunda anota (avanza 2 bases a home)
        rbis++;
        carrera = true;
      }
      if (globalRunners.first !== null) {
        newGlobalRunners.third = globalRunners.first; // Corredor en primera va a tercera (NO anota)
      }
      // Corredor en tercera se mantiene en tercera (NO anota con doble)
      newGlobalRunners.third = globalRunners.third || newGlobalRunners.third;
      newGlobalRunners.first = null;
      newGlobalRunners.second = currentPlayerNum;

    } else if (action === 'H3' || action === '3B') {
      // Triple: todos los corredores anotan, el bateador va a tercera
      if (globalRunners.first !== null) { carrerasTotal++; rbis++; carrera = true; }
      if (globalRunners.second !== null) { carrerasTotal++; rbis++; carrera = true; }
      if (globalRunners.third !== null) { carrerasTotal++; rbis++; carrera = true; }
      newGlobalRunners.first = null;
      newGlobalRunners.second = null;
      newGlobalRunners.third = currentPlayerNum;

    } else if (action === 'HR') {
      // Home Run: todos anotan incluyendo el bateador
      carrerasTotal = 1; // El bateador siempre anota
      if (globalRunners.first !== null) { carrerasTotal++; rbis++; }
      if (globalRunners.second !== null) { carrerasTotal++; rbis++; }
      if (globalRunners.third !== null) { carrerasTotal++; rbis++; }
      newGlobalRunners.first = null;
      newGlobalRunners.second = null;
      newGlobalRunners.third = null;
      carrera = true;

    } else if (action === 'BB') {
      // Base por bolas: TODOS los corredores avanzan UNA base (regla de avance forzado)
      // Si hay corredor en tercera base, anota automáticamente
      if (globalRunners.third !== null) {
        carrerasTotal++;
        carrera = true;
        console.log(`🏃 BB: Corredor #${globalRunners.third} anotó desde tercera base`);
      }
      
      // Avanzar corredor de segunda a tercera
      if (globalRunners.second !== null) {
        newGlobalRunners.third = globalRunners.second;
        console.log(`🏃 BB: Corredor #${globalRunners.second} avanzo de segunda a tercera`);
      } else {
        newGlobalRunners.third = null;
      }
      
      // Avanzar corredor de primera a segunda
      if (globalRunners.first !== null) {
        newGlobalRunners.second = globalRunners.first;
        console.log(`🏃 BB: Corredor #${globalRunners.first} avanzo de primera a segunda`);
      } else {
        newGlobalRunners.second = null;
      }
      
      // El bateador SIEMPRE va a primera base en BB
      newGlobalRunners.first = currentPlayerNum;
      console.log(`🏃 BB: Bateador #${currentPlayerNum} camina a primera base`);


    } else if (action === 'C') {
      // Carrera manual
      carrerasTotal = 1;
      carrera = true;
    }

    return { newGlobalRunners, carrera, carrerasTotal, rbis };
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
      // Obtener número del jugador actual
      const currentPlayerInfo = getCurrentPlayerInfo();
      const currentPlayerNum = currentPlayerInfo?.numero || 1;
      
      // Verificar si es una jugada forzada
      if (resolveForcePlay(action)) {
        setSaving(false); // No guardar aún, esperamos confirmación del modal
        return; // El modal se encargará del resto
      }
      
      // Calcular avance automático de corredores (para jugadas no forzadas)
      const { newGlobalRunners, carrera, carrerasTotal, rbis } = calculateRunnerAdvancement(action, currentPlayerNum);
      
      // Actualizar estado global de corredores
      setGlobalRunners(newGlobalRunners);
      console.log(`📝 Nuevos globalRunners:`, newGlobalRunners);
      
      // Sincronizar el estado visual de runners con globalRunners
      const syncedRunners = {
        first: newGlobalRunners.first !== null,
        second: newGlobalRunners.second !== null,
        third: newGlobalRunners.third !== null,
        home: false
      };
      setRunners(syncedRunners);
      console.log(`📝 Runners sincronizados:`, syncedRunners);
      
      let newGameState = { ...gameState };
      let newRunners = { ...runners };
      
      // Lógica simplificada para estados del juego
      switch (action) {
        case 'K':
        case 'KP':
        case 'O':
          newGameState.strikes = 0;
          newGameState.balls = 0;
          newGameState.outs = Math.min(newGameState.outs + 1, 3);
          break;
        case 'BB':
        case 'IBB':
        case '1B':
        case 'H1':
        case '2B': 
        case 'H2':
        case '3B':
        case 'H3':
        case 'HR':
          newGameState.balls = 0;
          newGameState.strikes = 0;
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
      
      // Registrar posición final inicial basada en la acción
      let finalPosition: 'first' | 'second' | 'third' | 'home' | null = null;
      if (action === 'H1' || action === '1B') finalPosition = 'first';
      else if (action === 'H2' || action === '2B') finalPosition = 'second';
      else if (action === 'H3' || action === '3B') finalPosition = 'third';
      else if (action === 'HR') finalPosition = 'home';
      else if (action === 'BB') finalPosition = 'first';
      
      if (finalPosition) {
        setPlayerFinalPositions(prev => ({
          ...prev,
          [currentPlayer]: {
            ...prev[currentPlayer],
            [currentInning]: finalPosition
          }
        }));
      }

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

  const handlePlayerSelection = async (position: number, player: Player | null) => {
    setSelectedPlayers(prev => ({
      ...prev,
      [position]: player
    }));
    setDropdownOpen(null);
    
    // Si se selecciona un jugador, añadir estadística JJ y guardar lineup
    if (player) {
      updatePlayerJJ(player.id);
      await saveLineupConfiguration();
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

  const saveLineupConfiguration = async () => {
    try {
      const lineupData = {
        gameId: gameData?.id,
        team: currentTeam,
        lineup: selectedPlayers,
        positions: selectedPositions
      };

      const response = await fetch('/api/anotador/save-lineup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lineupData),
      });

      if (!response.ok) {
        console.error('Error guardando lineup');
      }
    } catch (error) {
      console.error('Error guardando lineup:', error);
    }
  };

  const loadSavedLineup = async () => {
    try {
      const response = await fetch(`/api/anotador/load-lineup/${gameId}?team=${currentTeam}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const savedData = await response.json();
        
        // Solo actualizar si hay datos guardados, si no mantener el estado local
        if (savedData.lineup && Object.keys(savedData.lineup).length > 0) {
          setSelectedPlayers(savedData.lineup);
          // Actualizar también el estado específico del equipo
          if (currentTeam === 'local') {
            setSelectedPlayersLocal(savedData.lineup);
          } else {
            setSelectedPlayersVisitante(savedData.lineup);
          }
        }
        
        if (savedData.positions && Object.keys(savedData.positions).length > 0) {
          setSelectedPositions(savedData.positions);
          // Actualizar también el estado específico del equipo
          if (currentTeam === 'local') {
            setSelectedPositionsLocal(savedData.positions);
          } else {
            setSelectedPositionsVisitante(savedData.positions);
          }
        }
        
        if (savedData.inningData) {
          setInningData(savedData.inningData);
        }
        if (savedData.scores) {
          setScoreLocal(savedData.scores.local || {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0});
          setScoreVisitante(savedData.scores.visitante || {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0});
        }
      }
    } catch (error) {
      console.error('Error cargando lineup guardado:', error);
    }
  };

  const getPlayerForPosition = (position: number) => {
    // Solo retornar jugadores seleccionados manualmente, no usar los precargados
    return selectedPlayers[position] || null;
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

  const handlePositionChange = async (lineupPosition: number, positionCode: string) => {
    setSelectedPositions(prev => ({
      ...prev,
      [lineupPosition]: positionCode
    }));
    setDropdownOpen(null);
    
    // Guardar automáticamente la configuración del lineup
    await saveLineupConfiguration();
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

  const savePlayerStats = async (playerId: string, action: string, carreras: number = 0, rbis: number = 0, errors: number = 0) => {
    if (!gameData?.id || !playerId) {
      console.error('❌ Datos incompletos para guardar estadísticas:', { gameId: gameData?.id, playerId });
      return;
    }

    console.log('📤 Guardando estadística individual:', {
      gameId: gameData.id,
      jugadorId: playerId,
      accion: action,
      carreras,
      rbis,
      errors
    });

    try {
      const response = await fetch('/api/anotador/save-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId: gameData.id,
          jugadorId: playerId,
          entrada: currentInning,
          accion: action,
          carrera: carreras > 0,
          rbis: rbis,
          errors: errors,
          marcadorLocal: getTotalScore('local'),
          marcadorVisitante: getTotalScore('visitante')
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error guardando estadística:', response.status, errorText);
        throw new Error(`Error guardando estadística: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Estadística guardada:', result);
      return result;
    } catch (error) {
      console.error('❌ Error en savePlayerStats:', error);
      // No lanzar error para no bloquear el flujo del juego
      setSuccessMessage('⚠️ Jugada registrada, pero hubo un problema guardando estadísticas');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
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
    
    // Buscar el jugador que tiene asignada la posición 'P' (Pitcher) en el lineup
    for (let lineupPosition = 0; lineupPosition < 9; lineupPosition++) {
      const selectedPosition = selectedPositions[lineupPosition];
      const playerInPosition = selectedPlayers[lineupPosition] || defensivePlayers[lineupPosition];
      
      // Verificar si esta posición tiene asignada 'P' (Pitcher)
      if (selectedPosition === 'P' && playerInPosition) {
        console.log(`⚾ Pitcher encontrado en lineup: ${playerInPosition.nombre} en posición ${lineupPosition + 1}`);
        return playerInPosition;
      }
      
      // También verificar si la posición original del jugador es pitcher
      if (!selectedPosition && playerInPosition?.posicion === 'P') {
        console.log(`⚾ Pitcher encontrado por posición original: ${playerInPosition.nombre}`);
        return playerInPosition;
      }
    }
    
    // Fallback: buscar por posición original si no se encuentra en el lineup
    const pitcherByPosition = defensivePlayers.find(p => p.posicion === 'P');
    if (pitcherByPosition) {
      console.log(`⚾ Pitcher encontrado por posición original (fallback): ${pitcherByPosition.nombre}`);
      return pitcherByPosition;
    }
    
    console.log(`⚠️ No se encontró pitcher en equipo defensivo: ${defensiveTeam}`);
    return null;
  };

  const handlePitcherAction = async (action: string) => {
    try {
      const pitcher = getCurrentPitcher();
      if (!pitcher) {
        const defensiveTeam = currentTeam === 'local' ? 'visitante' : 'local';
        setError(`No se encontró pitcher con posición 'P' en el equipo ${defensiveTeam} (equipo en defensa). Asigna la posición 'P' a un jugador en el lineup.`);
        return;
      }

      console.log(`⚾ Acción de pitcher: ${action} - ${pitcher.nombre}`);
      
      // Calcular lanzamientos, strikes y bolas basándose en la acción
      let pitches = 0;
      let strikes = 0;
      let bolas = 0;
      
      switch (action) {
        case 'K_P': // Ponche completado
          pitches = 0; // Los strikes ya se contaron individualmente
          strikes = 0;
          bolas = 0;
          break;
        case 'BB_P': // Base por bolas completada
          pitches = 0; // Las bolas ya se contaron individualmente
          strikes = 0;
          bolas = 0;
          break;
        case 'HBP': // Golpe al bateador
          pitches = 1;
          strikes = 0;
          bolas = 0;
          break;
        case 'BK': // Balk
          pitches = 0;
          strikes = 0;
          bolas = 0;
          break;
        case 'STRIKE_PITCH': // Strike manual
          pitches = 1;
          strikes = 1;
          bolas = 0;
          break;
        case 'BALL_PITCH': // Bola manual
          pitches = 1;
          strikes = 0;
          bolas = 1;
          break;
      }
      
      // Guardar estadísticas del pitcher en tabla separada
      await savePitcherStats(pitcher.id, action, pitches, strikes, bolas);
      
      setSuccessMessage(`${action} registrado para pitcher ${pitcher.nombre}`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error) {
      console.error('❌ Error registrando estadística de pitcher:', error);
      setError('Error registrando estadística de pitcher: ' + (error as Error).message);
    }
  };

  const savePitcherStats = async (pitcherId: string, action: string, pitches: number = 0, strikes: number = 0, bolas: number = 0) => {
    console.log('⚾ Guardando estadísticas de pitcher separadas:', { pitcherId, action, pitches, strikes, bolas });
    
    const response = await fetch('/api/anotador/save-pitcher-stats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gameId: gameData?.id,
        jugadorId: pitcherId,
        accion: action,
        lanzamientos: pitches,
        strikes: strikes,
        bolas: bolas
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de API pitcher:', response.status, errorText);
      throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
    }

    return await response.json();
  };

  const getTotalScore = (team: 'local' | 'visitante') => {
    const score = team === 'local' ? scoreLocal : scoreVisitante;
    return Object.values(score).reduce((total, runs) => total + runs, 0);
  };
  
  // Función para manejar avance manual de corredores (diferencia robo vs avance por bateo)
  const handleManualRunnerMove = (fromBase: 'first' | 'second' | 'third', toBase: 'first' | 'second' | 'third' | 'home') => {
    const playerNum = globalRunners[fromBase];
    if (!playerNum) return;
    
    // Encontrar el playerId del jugador que se está moviendo
    const currentPlayers = getCurrentPlayers();
    const movingPlayer = currentPlayers.find(p => p.numero === playerNum);
    if (!movingPlayer) return;

    // Determinar el modo del corredor
    const runnerKey = `${fromBase}-${playerNum}`;
    const currentMode = stealMode[runnerKey] || 'normal';
    
    if (currentMode === 'stealing') {
      // MODO NARANJA: Base robada
      console.log(`🟠 BASE ROBADA: Jugador #${playerNum} de ${fromBase} a ${toBase}`);
      
      // REGISTRAR BASE ROBADA
      setStolenBases(prev => ({
        ...prev,
        [movingPlayer.id]: (prev[movingPlayer.id] || 0) + 1
      }));
      console.log(`📊 SB: Jugador ${movingPlayer.nombre} ahora tiene ${(stolenBases[movingPlayer.id] || 0) + 1} bases robadas`);
    } else if (currentMode === 'batting') {
      // MODO VERDE: Avance por bateo
      console.log(`🟢 AVANCE POR BATEO: Jugador #${playerNum} de ${fromBase} a ${toBase}`);
      // No se registra como base robada
    } else {
      // MODO NORMAL: Comportamiento por defecto (base robada)
      console.log(`🏃 MOVIMIENTO: Jugador #${playerNum} de ${fromBase} a ${toBase}`);
      setStolenBases(prev => ({
        ...prev,
        [movingPlayer.id]: (prev[movingPlayer.id] || 0) + 1
      }));
    }

    // Resetear el modo del corredor después del movimiento
    resetRunnerMode(fromBase, playerNum);
    
    const newGlobalRunners = { ...globalRunners };
    
    // Limpiar base de origen
    newGlobalRunners[fromBase] = null;
    
    // Mover a base destino
    if (toBase === 'home') {
      // Anotar carrera
      addRun();
      setSuccessMessage(`🏆 ¡Carrera! Jugador #${playerNum} anotó`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Actualizar posición final a home para el cuadro donde hizo la acción original
      if (movingPlayer) {
        // Encontrar en qué entrada el jugador hizo su acción original (buscar en TODAS las entradas)
        let originalActionInning = null;
        for (let i = 1; i <= 9; i++) {
          if (inningData[movingPlayer.id]?.[i]?.accion) {
            originalActionInning = i;
            break; // Tomar la PRIMERA acción encontrada
          }
        }
        
        if (originalActionInning) {
          setPlayerFinalPositions(prev => ({
            ...prev,
            [movingPlayer.id]: {
              ...prev[movingPlayer.id],
              [originalActionInning]: 'home' // Actualizar el cuadro donde hizo la acción original
            }
          }));
          
          console.log(`📝 🏆 CARRERA: Actualizando trayectoria de ${movingPlayer.nombre} en entrada ${originalActionInning} a HOME`);
        } else {
          console.log(`⚠️ No se encontró acción original para ${movingPlayer.nombre}`);
        }
      }
    } else {
      newGlobalRunners[toBase] = playerNum;
      
      // Actualizar posición final para el cuadro donde hizo la acción original
      if (movingPlayer) {
        // Encontrar en qué entrada el jugador hizo su acción original (buscar en TODAS las entradas)
        let originalActionInning = null;
        for (let i = 1; i <= 9; i++) {
          if (inningData[movingPlayer.id]?.[i]?.accion) {
            originalActionInning = i;
            break; // Tomar la PRIMERA acción encontrada
          }
        }
        
        if (originalActionInning) {
          setPlayerFinalPositions(prev => ({
            ...prev,
            [movingPlayer.id]: {
              ...prev[movingPlayer.id],
              [originalActionInning]: toBase // Actualizar el cuadro donde hizo la acción original
            }
          }));
          
          console.log(`📝 🏃 ROBO: Actualizando trayectoria de ${movingPlayer.nombre} en entrada ${originalActionInning} a ${toBase}`);
        } else {
          console.log(`⚠️ No se encontró acción original para ${movingPlayer.nombre}`);
        }
      }
    }
    
    setGlobalRunners(newGlobalRunners);
    
    // Sincronizar estado visual
    setRunners({
      first: newGlobalRunners.first !== null,
      second: newGlobalRunners.second !== null,
      third: newGlobalRunners.third !== null,
      home: false
    });
    
    setManualMoveMode({ active: false, selectedRunner: null });
  };
  
  // Función para eliminar corredor (marcar OUT)
  const removeRunnerFromBase = (base: 'first' | 'second' | 'third') => {
    const playerNum = globalRunners[base];
    if (!playerNum) {
      console.log(`⚠️ No hay jugador en ${base} base para eliminar`);
      return;
    }
    
    console.log(`❌ OUT: Iniciando eliminación de jugador #${playerNum} de ${base} base`);
    
    // SINCRONIZACIÓN: Encontrar el jugador correspondiente y actualizar currentPlayer
    const currentPlayers = getCurrentPlayers();
    const outPlayer = currentPlayers.find(p => p.numero === playerNum);
    if (outPlayer) {
      // Actualizar currentPlayer para sincronizar con la selección del lineup
      setCurrentPlayer(outPlayer.id);
      setCurrentInning(currentInning);
    }
    
    // 1. Limpiar globalRunners
    const newGlobalRunners = { ...globalRunners };
    newGlobalRunners[base] = null;
    console.log(`❌ Limpiando globalRunners[${base}]:`, newGlobalRunners);
    
    // 2. Actualizar globalRunners inmediatamente
    setGlobalRunners(newGlobalRunners);
    
    // 3. Sincronizar estado visual runners
    const newRunners = {
      first: newGlobalRunners.first !== null,
      second: newGlobalRunners.second !== null,
      third: newGlobalRunners.third !== null,
      home: false
    };
    console.log(`❌ Sincronizando runners:`, newRunners);
    setRunners(newRunners);
    
    // 4. Encontrar el jugador y actualizar su entrada como OUT
    if (outPlayer) {
      console.log(`❌ Jugador encontrado:`, outPlayer.nombre);
      
      // Buscar en qué entrada hizo su acción original
      let originalActionInning = null;
      for (let i = 1; i <= 9; i++) {
        if (inningData[outPlayer.id]?.[i]?.accion) {
          originalActionInning = i;
          break;
        }
      }
      
      if (originalActionInning) {
        // Actualizar inningData para mostrar que fue OUT
        const newInningData = { ...inningData };
        const existingAction = newInningData[outPlayer.id][originalActionInning]?.accion;
        
        newInningData[outPlayer.id][originalActionInning] = {
          accion: existingAction ? `${existingAction}-O` : 'O',
          bases: [],
          carrera: false,
          detalle: existingAction ? `${getActionDetail(existingAction)} + Out` : 'Out en bases'
        };
        
        console.log(`❌ Actualizando inningData entrada ${originalActionInning}:`, newInningData[outPlayer.id][originalActionInning]);
        setInningData(newInningData);
      }
    } else {
      console.log(`⚠️ No se encontró jugador con número ${playerNum}`);
    }
    
    // 5. Agregar out al conteo
    setGameState(prev => {
      const newState = { ...prev, outs: prev.outs + 1 };
      console.log(`❌ Actualizando outs: ${prev.outs} -> ${newState.outs}`);
      return newState;
    });
    
    setSuccessMessage(`❌ OUT: Jugador #${playerNum} eliminado de ${base} base`);
    setTimeout(() => setSuccessMessage(''), 3000);
    
    console.log(`❌ OUT completado para jugador #${playerNum}`);
  };

  // Función para activar entrada personalizada de OUT
  const activateCustomOutEntry = () => {
    setCustomOutEntry({ isActive: true, inputValue: '' });
  };

  // Función para procesar entrada personalizada de OUT
  const handleCustomOutEntry = async () => {
    if (!customOutEntry.inputValue.trim() || !currentPlayer) {
      setSuccessMessage('❌ Ingresa un tipo de OUT personalizado');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    try {
      const player = getCurrentPlayers().find(p => p.id === currentPlayer);
      const customAction = `OUT-${customOutEntry.inputValue.trim()}`;
      
      // Guardar la estadística personalizada
      await savePlayerStats(currentPlayer, customAction, 0, 0, 0);

      // Actualizar outs
      setGameState(prev => ({ ...prev, outs: prev.outs + 1 }));

      setSuccessMessage(`❌ OUT personalizado: ${player?.nombre} - ${customAction}`);
      setTimeout(() => setSuccessMessage(''), 3000);

      // Avanzar al siguiente bateador si no hay 3 outs
      if (gameState.outs < 2) {
        advanceToNextPlayer();
      }

      // Cerrar entrada personalizada
      setCustomOutEntry({ isActive: false, inputValue: '' });

    } catch (error) {
      console.error('❌ Error registrando OUT personalizado:', error);
      setSuccessMessage('❌ Error al registrar OUT personalizado');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // Función para cancelar entrada personalizada
  const cancelCustomOutEntry = () => {
    setCustomOutEntry({ isActive: false, inputValue: '' });
  };

  // Funciones para manejo del modo robo de base (long press)
  const handleRunnerMouseDown = (base: 'first' | 'second' | 'third') => {
    const playerNum = globalRunners[base];
    if (!playerNum) return;
    
    const runnerKey = `${base}-${playerNum}`;
    
    // Limpiar timer anterior si existe
    if (longPressState.pressTimer) {
      clearTimeout(longPressState.pressTimer);
    }

    // Iniciar timer para long press (800ms)
    const timer = setTimeout(() => {
      console.log(`🟠 MODO ROBO activado para jugador #${playerNum} en ${base}`);
      setStealMode(prev => ({
        ...prev,
        [runnerKey]: 'stealing'
      }));
      setLongPressState(prev => ({
        ...prev,
        isPressed: true,
        pressedRunner: runnerKey
      }));
    }, 800); // 800ms para activar modo robo

    setLongPressState({
      isPressed: false,
      pressedRunner: runnerKey,
      pressTimer: timer
    });
  };

  const handleRunnerMouseUp = (base: 'first' | 'second' | 'third') => {
    // Limpiar timer si se suelta antes del long press
    if (longPressState.pressTimer) {
      clearTimeout(longPressState.pressTimer);
    }

    // Si fue un click corto y no había modo robo activo, es avance por bateo
    const playerNum = globalRunners[base];
    if (playerNum && !longPressState.isPressed) {
      const runnerKey = `${base}-${playerNum}`;
      console.log(`🟢 MODO BATEO activado para jugador #${playerNum} en ${base}`);
      setStealMode(prev => ({
        ...prev,
        [runnerKey]: 'batting'
      }));
    }

    setLongPressState({
      isPressed: false,
      pressedRunner: null,
      pressTimer: null
    });
  };

  const resetRunnerMode = (base: 'first' | 'second' | 'third', playerNum: number) => {
    const runnerKey = `${base}-${playerNum}`;
    setStealMode(prev => {
      const newState = { ...prev };
      delete newState[runnerKey];
      return newState;
    });
  };

  // Función para obtener el color del corredor basado en su modo
  const getRunnerColor = (base: 'first' | 'second' | 'third', playerNum: number) => {
    const runnerKey = `${base}-${playerNum}`;
    const mode = stealMode[runnerKey] || 'normal';
    
    switch (mode) {
      case 'stealing':
        return 'bg-orange-600 border-orange-400'; // Naranja para robo
      case 'batting':
        return 'bg-green-600 border-green-400'; // Verde para avance por bateo
      default:
        return 'bg-blue-600 border-blue-400'; // Azul normal
    }
  };
  
  // Función para seleccionar corredor para mover
  const selectRunnerForMove = (base: 'first' | 'second' | 'third', playerNum: number) => {
    setManualMoveMode({
      active: true,
      selectedRunner: { base, playerNum }
    });
    
    // SINCRONIZACIÓN: Encontrar el jugador correspondiente y actualizar currentPlayer
    const currentPlayers = getCurrentPlayers();
    const selectedPlayer = currentPlayers.find(p => p.numero === playerNum);
    
    if (selectedPlayer) {
      // Actualizar currentPlayer para sincronizar con la selección del lineup
      setCurrentPlayer(selectedPlayer.id);
      
      // También necesitamos actualizar currentInning a la entrada actual
      setCurrentInning(currentInning);
      
      setSuccessMessage(`👆 Jugador #${playerNum} (${selectedPlayer.nombre}) seleccionado desde ${base} base. Haz click en la base destino.`);
    } else {
      setSuccessMessage(`👆 Jugador #${playerNum} seleccionado. Haz click en la base destino.`);
    }
    
    setTimeout(() => setSuccessMessage(''), 5000);
  };
  
  // Funciones para long press
  const handleMouseDown = (playerId: string, inning: number, e: React.MouseEvent) => {
    if (!longPressTimer) {
      const timer = setTimeout(() => {
        setIsLongPressing(true);
        openEditModal(playerId, inning);
      }, 800); // 800ms para activar long press
      setLongPressTimer(timer);
    }
  };
  
  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setIsLongPressing(false);
  };
  
  const handleMouseLeave = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setIsLongPressing(false);
  };
  
  // Abrir modal de edición
  const openEditModal = (playerId: string, inning: number) => {
    const currentAction = inningData[playerId]?.[inning]?.accion || null;
    setEditModal({
      isOpen: true,
      playerId,
      inning,
      currentAction
    });
    console.log(`📝 Abriendo editor para jugador ${playerId}, entrada ${inning}, acción actual: ${currentAction}`);
  };
  
  // Cerrar modal de edición
  const closeEditModal = () => {
    setEditModal({
      isOpen: false,
      playerId: null,
      inning: null,
      currentAction: null
    });
  };
  
  // Actualizar acción desde el modal
  const updateActionFromModal = async (newAction: string) => {
    if (!editModal.playerId || !editModal.inning) return;
    
    try {
      // Obtener información del jugador
      const playerInfo = getCurrentPlayers().find(p => p.id === editModal.playerId);
      const playerNum = playerInfo?.numero || 1;
      
      // Si la acción es diferente, actualizar
      if (newAction !== editModal.currentAction) {
        // Calcular nuevo avance de corredores
        const { newGlobalRunners, carrera, carrerasTotal, rbis } = calculateRunnerAdvancement(newAction, playerNum);
        
        // Si había una acción anterior que afectaba corredores, necesitaríamos revertir
        // Por simplicidad, actualizar directamente
        setGlobalRunners(newGlobalRunners);
        
        // Actualizar datos de entrada
        const newInningData = { ...inningData };
        if (!newInningData[editModal.playerId]) {
          newInningData[editModal.playerId] = {};
        }
        
        newInningData[editModal.playerId][editModal.inning] = {
          accion: newAction,
          bases: [],
          carrera: carrera,
          detalle: getActionDetail(newAction)
        };
        
        setInningData(newInningData);
        
        setSuccessMessage(`✅ Acción actualizada: ${newAction}`);
        setTimeout(() => setSuccessMessage(''), 3000);
      }
      
      closeEditModal();
    } catch (error) {
      console.error('❌ Error actualizando acción:', error);
      setError('Error actualizando acción');
    }
  };
  
  // Función para determinar trayectoria a mostrar (acción original + posición final)
  const getTrajectoryToShow = (playerId: string, entrada: number) => {
    const originalAction = inningData[playerId]?.[entrada]?.accion;
    const finalPosition = playerFinalPositions[playerId]?.[entrada];
    
    // Debugging detallado
    const playerName = getCurrentPlayers().find(p => p.id === playerId)?.nombre || 'Desconocido';
    console.log(`📝 getTrajectoryToShow - ${playerName} entrada ${entrada}:`);
    console.log(`   originalAction: ${originalAction}`);
    console.log(`   finalPosition: ${finalPosition}`);
    
    // Si no hay acción original, no mostrar nada
    if (!originalAction) {
      console.log(`   → Sin acción original, retornando null`);
      return null;
    }
    
    // Si hay posición final diferente por movimiento manual, mostrar trayectoria hasta ahí
    if (finalPosition) {
      let result;
      switch (finalPosition) {
        case 'first':
          result = 'H1';
          break;
        case 'second':
          result = 'H2';
          break;
        case 'third':
          result = 'H3';
          break;
        case 'home':
          result = 'HR';
          break;
        default:
          result = originalAction;
      }
      console.log(`   → Con posición final, retornando: ${result}`);
      return result;
    }
    
    // Si no hay movimiento manual, mostrar acción original
    console.log(`   → Sin movimiento manual, retornando: ${originalAction}`);
    return originalAction;
  };

  // Efectos automáticos para strikes, bolas y outs
  useEffect(() => {
    if (processingAutoAction.current) return; // Evitar bucle infinito
    
    if (gameState.strikes >= 3) {
      processingAutoAction.current = true;
      // Registrar ponche para bateador y pitcher
      Promise.all([
        handleQuickAction('K'),
        handlePitcherAction('K_P')
      ]).finally(() => {
        setTimeout(() => {
          processingAutoAction.current = false;
        }, 100);
      });
    } else if (gameState.balls >= 4) {
      processingAutoAction.current = true;
      // Registrar base por bolas para bateador y pitcher
      Promise.all([
        handleQuickAction('BB'),
        handlePitcherAction('BB_P')
      ]).finally(() => {
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
      setGlobalRunners({ first: null, second: null, third: null }); // Limpiar corredores globales
      
      // Cambiar al otro equipo
      setCurrentTeam(prev => prev === 'local' ? 'visitante' : 'local');
      
      console.log(`🔄 Cambio de entrada: 3 outs completados, ahora batea el equipo ${currentTeam === 'local' ? 'visitante' : 'local'}`);
      console.log(`🧹 Tabla de bateo limpiada y corredores reiniciados para nuevo equipo`);
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
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">
            📋 LINEUP - {currentTeam === 'local' ? gameData.equipo_local.nombre : gameData.equipo_visitante.nombre}
          </h3>
          <button
            onClick={() => setShowRefreshConfirm(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            title="Reiniciar lineup completo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reiniciar Lineup
          </button>
        </div>
        
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
                const uniqueKey = `lineup-${currentTeam}-${index}`;
                
                return (
                  <tr key={uniqueKey} className="hover:bg-slate-700/50">
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
                        className={`border border-slate-600 p-2 text-center ${player ? 'cursor-pointer hover:bg-blue-600/20' : 'cursor-not-allowed bg-slate-700/50'} ${isLongPressing ? 'animate-pulse bg-yellow-600/30' : ''}`}
                        onClick={() => {
                          if (!isLongPressing && player) {
                            handleCellClick(player.id, entrada);
                          }
                        }}
                        onMouseDown={(e) => player && handleMouseDown(player.id, entrada, e)}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        onTouchStart={(e) => player && handleMouseDown(player.id, entrada, e as any)}
                        onTouchEnd={handleMouseUp}
                      >
                        {/* DIAMANTE DE BÉISBOL CON TRAYECTORIAS */}
                        <div className={`w-12 h-12 flex items-center justify-center mx-auto relative rounded border-2 cursor-pointer transition-all select-none ${
                          player && currentPlayer === player.id && currentInning === entrada
                            ? 'bg-blue-600 border-blue-300 ring-2 ring-blue-300'
                            : player && inningData[player.id]?.[entrada]?.accion
                              ? 'bg-blue-500 border-blue-400'
                              : player
                                ? 'bg-slate-500 border-slate-400'
                                : 'bg-slate-500 border-slate-400'
                        }`}>
                          {/* Diamante base - 35px x 35px exacto */}
                          <div className="bg-slate-300 transform rotate-45 border border-slate-400" style={{ width: '35px', height: '35px' }}></div>
                          
                          {/* Líneas de trayectoria según posición final - SOLO VERDE CON NÚMERO DE LINEUP */}
                          {(() => {
                            if (!player) return null;
                            const trajectoryAction = getTrajectoryToShow(player.id, entrada);
                            const lineupPosition = index + 1; // Número de posición en lineup (1-9)
                            
                            if (trajectoryAction === 'H1' || trajectoryAction === '1B') {
                              return (
                                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
                                  <line x1="24" y1="46" x2="46" y2="24" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                  <circle cx="46" cy="24" r="2" fill="black" />
                                  <text x="46" y="18" textAnchor="middle" className="fill-white text-xs font-bold">{lineupPosition}</text>
                                </svg>
                              );
                            }
                            
                            if (trajectoryAction === 'H2' || trajectoryAction === '2B') {
                              return (
                                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
                                  <line x1="24" y1="46" x2="46" y2="24" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                  <line x1="46" y1="24" x2="24" y2="2" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                  <circle cx="24" cy="2" r="2" fill="black" />
                                  <text x="24" y="16" textAnchor="middle" className="fill-white text-xs font-bold">{lineupPosition}</text>
                                </svg>
                              );
                            }
                            
                            if (trajectoryAction === 'H3' || trajectoryAction === '3B') {
                              return (
                                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
                                  <line x1="24" y1="46" x2="46" y2="24" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                  <line x1="46" y1="24" x2="24" y2="2" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                  <line x1="24" y1="2" x2="2" y2="24" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                  <circle cx="2" cy="24" r="2" fill="black" />
                                  <text x="2" y="18" textAnchor="middle" className="fill-white text-xs font-bold">{lineupPosition}</text>
                                </svg>
                              );
                            }
                            
                            if (trajectoryAction === 'HR') {
                              return (
                                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
                                  <line x1="24" y1="46" x2="46" y2="24" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                  <line x1="46" y1="24" x2="24" y2="2" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                  <line x1="24" y1="2" x2="2" y2="24" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                  <line x1="2" y1="24" x2="24" y2="46" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                  <circle cx="24" cy="46" r="3" fill="black" />
                                  <text x="24" y="40" textAnchor="middle" className="fill-white text-xs font-bold">{lineupPosition}</text>
                                </svg>
                              );
                            }
                            
                            if (trajectoryAction === 'BB') {
                              return (
                                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
                                  <line x1="24" y1="46" x2="46" y2="24" stroke="black" strokeWidth="3" strokeDasharray="4,2" strokeLinecap="round" />
                                  <circle cx="46" cy="24" r="2" fill="black" />
                                  <text x="46" y="18" textAnchor="middle" className="fill-white text-xs font-bold">{lineupPosition}</text>
                                </svg>
                              );
                            }
                            
                            if (trajectoryAction === 'C') {
                              return (
                                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
                                  <line x1="24" y1="46" x2="46" y2="24" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                  <line x1="46" y1="24" x2="24" y2="2" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                  <line x1="24" y1="2" x2="2" y2="24" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                  <line x1="2" y1="24" x2="24" y2="46" stroke="black" strokeWidth="3" strokeLinecap="round" />
                                  <circle cx="24" cy="46" r="3" fill="black" />
                                  <text x="24" y="40" textAnchor="middle" className="fill-white text-xs font-bold">{lineupPosition}</text>
                                </svg>
                              );
                            }
                            
                            return null;
                          })()}
                          
                          {/* X para outs */}
                          {player && (inningData[player.id]?.[entrada]?.accion === 'K' || inningData[player.id]?.[entrada]?.accion === 'O') && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-red-500 text-lg font-bold">✗</span>
                            </div>
                          )}

                          {/* Etiqueta de acción - PARTE INFERIOR */}
                          {player && inningData[player.id]?.[entrada]?.accion && (
                            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-black text-white px-1 py-0.5 text-xs rounded">
                              {inningData[player.id][entrada].accion}
                            </div>
                          )}
                        </div>
                        
                        {/* Indicador de jugador activo */}
                        {player && currentPlayer === player.id && currentInning === entrada && (
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
                fill={manualMoveMode.active ? "#dc2626" : "#6b7280"}
                stroke={manualMoveMode.active ? "#991b1b" : "#ffffff"}
                strokeWidth={manualMoveMode.active ? "4" : "3"}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  if (manualMoveMode.active && manualMoveMode.selectedRunner) {
                    // Modo movimiento: anotar carrera
                    handleManualRunnerMove(manualMoveMode.selectedRunner.base, 'home');
                  }
                }}
              />
              <text x="130" y="235" textAnchor="middle" className="fill-white text-xs font-bold">HOME</text>
              {/* Indicador de carrera cuando está en modo manual */}
              {manualMoveMode.active && (
                <text x="130" y="248" textAnchor="middle" className="fill-red-400 text-xs font-bold">
                  🏆 ANOTAR
                </text>
              )}
              
              {/* PRIMERA BASE (sentido anti-horario desde home) */}
              <circle 
                cx="210" 
                cy="130" 
                r="12" 
                fill={globalRunners.first ? "#10b981" : manualMoveMode.active ? "#3b82f6" : "#6b7280"}
                stroke={globalRunners.first ? "#059669" : manualMoveMode.active ? "#1d4ed8" : "#ffffff"}
                strokeWidth={globalRunners.first || manualMoveMode.active ? "4" : "3"}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  if (manualMoveMode.active && manualMoveMode.selectedRunner) {
                    // Modo movimiento: mover corredor seleccionado a primera base
                    if (manualMoveMode.selectedRunner.base !== 'first' && !globalRunners.first) {
                      handleManualRunnerMove(manualMoveMode.selectedRunner.base, 'first');
                    }
                  } else if (globalRunners.first) {
                    // Modo normal: seleccionar corredor para mover
                    selectRunnerForMove('first', globalRunners.first);
                  }
                }}
              />
              <text x="235" y="135" textAnchor="start" className="fill-white text-xs font-bold">1B</text>
              {/* Mostrar número de lineup en primera base */}
              {globalRunners.first && (
                <text x="210" y="135" textAnchor="middle" className="fill-black text-xs font-bold">
                  {(() => {
                    const playerInFirst = getCurrentPlayers().find(p => p.numero === globalRunners.first);
                    const lineupPos = getCurrentPlayers().findIndex(p => p.numero === globalRunners.first) + 1;
                    return lineupPos;
                  })()}
                </text>
              )}
              
              {/* SEGUNDA BASE (arriba) */}
              <circle 
                cx="130" 
                cy="50" 
                r="12" 
                fill={globalRunners.second ? "#10b981" : manualMoveMode.active ? "#3b82f6" : "#6b7280"}
                stroke={globalRunners.second ? "#059669" : manualMoveMode.active ? "#1d4ed8" : "#ffffff"}
                strokeWidth={globalRunners.second || manualMoveMode.active ? "4" : "3"}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  if (manualMoveMode.active && manualMoveMode.selectedRunner) {
                    // Modo movimiento: mover corredor seleccionado a segunda base
                    if (manualMoveMode.selectedRunner.base !== 'second' && !globalRunners.second) {
                      handleManualRunnerMove(manualMoveMode.selectedRunner.base, 'second');
                    }
                  } else if (globalRunners.second) {
                    // Modo normal: seleccionar corredor para mover
                    selectRunnerForMove('second', globalRunners.second);
                  }
                }}
              />
              <text x="130" y="35" textAnchor="middle" className="fill-white text-xs font-bold">2B</text>
              {/* Mostrar número de lineup en segunda base */}
              {globalRunners.second && (
                <text x="130" y="55" textAnchor="middle" className="fill-black text-xs font-bold">
                  {(() => {
                    const lineupPos = getCurrentPlayers().findIndex(p => p.numero === globalRunners.second) + 1;
                    return lineupPos;
                  })()}
                </text>
              )}
              
              {/* TERCERA BASE (izquierda) */}
              <circle 
                cx="50" 
                cy="130" 
                r="12" 
                fill={globalRunners.third ? "#10b981" : manualMoveMode.active ? "#3b82f6" : "#6b7280"}
                stroke={globalRunners.third ? "#059669" : manualMoveMode.active ? "#1d4ed8" : "#ffffff"}
                strokeWidth={globalRunners.third || manualMoveMode.active ? "4" : "3"}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  if (manualMoveMode.active && manualMoveMode.selectedRunner) {
                    // Modo movimiento: mover corredor seleccionado a tercera base
                    if (manualMoveMode.selectedRunner.base !== 'third' && !globalRunners.third) {
                      handleManualRunnerMove(manualMoveMode.selectedRunner.base, 'third');
                    }
                  } else if (globalRunners.third) {
                    // Modo normal: seleccionar corredor para mover
                    selectRunnerForMove('third', globalRunners.third);
                  }
                }}
              />
              <text x="25" y="135" textAnchor="end" className="fill-white text-xs font-bold">3B</text>
              {/* Mostrar número de lineup en tercera base */}
              {globalRunners.third && (
                <text x="50" y="135" textAnchor="middle" className="fill-black text-xs font-bold">
                  {(() => {
                    const lineupPos = getCurrentPlayers().findIndex(p => p.numero === globalRunners.third) + 1;
                    return lineupPos;
                  })()}
                </text>
              )}
            </svg>
          </div>


          {/* ESTADO GLOBAL DE CORREDORES - MEJORADO */}
          <div className="bg-slate-700 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-bold text-blue-400 mb-3 text-center">🏃 CORREDORES EN CAMPO</h4>
            
            {/* Resumen rápido */}
            <div className="bg-slate-800 rounded p-2 mb-3 text-center">
              <span className="text-xs text-slate-300">
                Corredores activos: 
                <span className="font-bold text-green-400">
                  {[globalRunners.first, globalRunners.second, globalRunners.third].filter(r => r !== null).length}
                </span>
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-3 text-xs">
              {/* PRIMERA BASE */}
              <div 
                className={`text-center p-2 rounded cursor-pointer transition-all duration-200 border-2 select-none ${
                  globalRunners.first 
                    ? `${getRunnerColor('first', globalRunners.first)} hover:scale-105` 
                    : 'bg-slate-600 border-slate-500'
                }`}
                onMouseDown={() => globalRunners.first && handleRunnerMouseDown('first')}
                onMouseUp={() => globalRunners.first && handleRunnerMouseUp('first')}
                onMouseLeave={() => globalRunners.first && handleRunnerMouseUp('first')}
                onTouchStart={() => globalRunners.first && handleRunnerMouseDown('first')}
                onTouchEnd={() => globalRunners.first && handleRunnerMouseUp('first')}
              >
                <span className="block text-slate-300 font-semibold">1B</span>
                <span className={`text-lg font-bold ${globalRunners.first ? 'text-white' : 'text-slate-400'}`}>
                  {globalRunners.first ? (() => {
                    const lineupPos = getCurrentPlayers().findIndex(p => p.numero === globalRunners.first) + 1;
                    return lineupPos;
                  })() : '---'}
                </span>
                {globalRunners.first && (
                  <div className="text-xs text-white mt-1 opacity-90">
                    {getCurrentPlayers().find(p => p.numero === globalRunners.first)?.nombre?.split(' ')[0] || 'Jugador'}
                  </div>
                )}
                {globalRunners.first && (
                  <div className="text-xs text-white/60 mt-1">
                    {(() => {
                      const runnerKey = `first-${globalRunners.first}`;
                      const mode = stealMode[runnerKey];
                      if (mode === 'stealing') return '🟠 ROBO';
                      if (mode === 'batting') return '🟢 BATEO';
                      return 'Mantén presionado';
                    })()}
                  </div>
                )}
              </div>
              
              {/* SEGUNDA BASE */}
              <div 
                className={`text-center p-2 rounded cursor-pointer transition-all duration-200 border-2 select-none ${
                  globalRunners.second 
                    ? `${getRunnerColor('second', globalRunners.second)} hover:scale-105` 
                    : 'bg-slate-600 border-slate-500'
                }`}
                onMouseDown={() => globalRunners.second && handleRunnerMouseDown('second')}
                onMouseUp={() => globalRunners.second && handleRunnerMouseUp('second')}
                onMouseLeave={() => globalRunners.second && handleRunnerMouseUp('second')}
                onTouchStart={() => globalRunners.second && handleRunnerMouseDown('second')}
                onTouchEnd={() => globalRunners.second && handleRunnerMouseUp('second')}
              >
                <span className="block text-slate-300 font-semibold">2B</span>
                <span className={`text-lg font-bold ${globalRunners.second ? 'text-white' : 'text-slate-400'}`}>
                  {globalRunners.second ? (() => {
                    const lineupPos = getCurrentPlayers().findIndex(p => p.numero === globalRunners.second) + 1;
                    return lineupPos;
                  })() : '---'}
                </span>
                {globalRunners.second && (
                  <div className="text-xs text-white mt-1 opacity-90">
                    {getCurrentPlayers().find(p => p.numero === globalRunners.second)?.nombre?.split(' ')[0] || 'Jugador'}
                  </div>
                )}
                {globalRunners.second && (
                  <div className="text-xs text-white/60 mt-1">
                    {(() => {
                      const runnerKey = `second-${globalRunners.second}`;
                      const mode = stealMode[runnerKey];
                      if (mode === 'stealing') return '🟠 ROBO';
                      if (mode === 'batting') return '🟢 BATEO';
                      return 'Mantén presionado';
                    })()}
                  </div>
                )}
              </div>
              
              {/* TERCERA BASE */}
              <div 
                className={`text-center p-2 rounded cursor-pointer transition-all duration-200 border-2 select-none ${
                  globalRunners.third 
                    ? `${getRunnerColor('third', globalRunners.third)} hover:scale-105` 
                    : 'bg-slate-600 border-slate-500'
                }`}
                onMouseDown={() => globalRunners.third && handleRunnerMouseDown('third')}
                onMouseUp={() => globalRunners.third && handleRunnerMouseUp('third')}
                onMouseLeave={() => globalRunners.third && handleRunnerMouseUp('third')}
                onTouchStart={() => globalRunners.third && handleRunnerMouseDown('third')}
                onTouchEnd={() => globalRunners.third && handleRunnerMouseUp('third')}
              >
                <span className="block text-slate-300 font-semibold">3B</span>
                <span className={`text-lg font-bold ${globalRunners.third ? 'text-white' : 'text-slate-400'}`}>
                  {globalRunners.third ? (() => {
                    const lineupPos = getCurrentPlayers().findIndex(p => p.numero === globalRunners.third) + 1;
                    return lineupPos;
                  })() : '---'}
                </span>
                {globalRunners.third && (
                  <div className="text-xs text-white mt-1 opacity-90">
                    {getCurrentPlayers().find(p => p.numero === globalRunners.third)?.nombre?.split(' ')[0] || 'Jugador'}
                  </div>
                )}
                {globalRunners.third && (
                  <div className="text-xs text-white/60 mt-1">
                    {(() => {
                      const runnerKey = `third-${globalRunners.third}`;
                      const mode = stealMode[runnerKey];
                      if (mode === 'stealing') return '🟠 ROBO';
                      if (mode === 'batting') return '🟢 BATEO';
                      return 'Mantén presionado';
                    })()}
                  </div>
                )}
              </div>
            </div>
            
            {/* Instrucciones del sistema de colores */}
            <div className="mt-3 bg-slate-700/50 border border-slate-500 rounded-lg p-3">
              <div className="text-xs text-slate-300 mb-2 font-semibold text-center">
                📋 SISTEMA DE COLORES
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="w-4 h-4 bg-blue-600 border border-blue-400 rounded mx-auto mb-1"></div>
                  <div className="text-blue-300">NORMAL</div>
                </div>
                <div className="text-center">
                  <div className="w-4 h-4 bg-orange-600 border border-orange-400 rounded mx-auto mb-1"></div>
                  <div className="text-orange-300">ROBO</div>
                  <div className="text-slate-400 text-xs">(Mantén presionado)</div>
                </div>
                <div className="text-center">
                  <div className="w-4 h-4 bg-green-600 border border-green-400 rounded mx-auto mb-1"></div>
                  <div className="text-green-300">BATEO</div>
                  <div className="text-slate-400 text-xs">(Click normal)</div>
                </div>
              </div>
            </div>

            {/* Situación especial */}
            {globalRunners.first && globalRunners.second && globalRunners.third && (
              <div className="mt-2 text-center">
                <span className="text-xs bg-red-600 text-white px-2 py-1 rounded font-bold">
                  🔥 BASES LLENAS
                </span>
              </div>
            )}
            
            {/* CONTROLES DE MOVIMIENTO MANUAL */}
            <div className="mt-3 space-y-2">
              {/* Indicador de modo manual */}
              {manualMoveMode.active && (
                <div className="bg-blue-900 border border-blue-600 rounded p-2 text-center">
                  <div className="text-xs text-blue-300 mb-1">
                    👆 MODO MANUAL ACTIVO
                  </div>
                  <div className="text-sm text-white font-bold">
                    Jugador #{manualMoveMode.selectedRunner?.playerNum} seleccionado
                  </div>
                  <button 
                    onClick={() => setManualMoveMode({ active: false, selectedRunner: null })}
                    className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                  >
                    ❌ Cancelar
                  </button>
                </div>
              )}
              
              {/* Botones de Movimiento según Modo */}
              {!manualMoveMode.active && (globalRunners.first || globalRunners.second || globalRunners.third) && (
                <div className="bg-emerald-700/30 border border-emerald-600 rounded-lg p-3">
                  <div className="text-sm text-emerald-300 mb-3 text-center font-bold">
                    🏃‍♂️ MOVIMIENTO DE CORREDORES
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {globalRunners.first && (
                      <button 
                        onClick={() => handleManualRunnerMove('first', 'second')}
                        disabled={globalRunners.second !== null}
                        className={`w-full py-3 px-4 disabled:bg-slate-500 text-white text-sm font-bold rounded-lg transition-all transform hover:scale-105 ${
                          (() => {
                            const runnerKey = `first-${globalRunners.first}`;
                            const mode = stealMode[runnerKey];
                            if (mode === 'stealing') return 'bg-orange-600 hover:bg-orange-500';
                            if (mode === 'batting') return 'bg-green-600 hover:bg-green-500';
                            return 'bg-emerald-600 hover:bg-emerald-500';
                          })()
                        }`}
                      >
                        {(() => {
                          const runnerKey = `first-${globalRunners.first}`;
                          const mode = stealMode[runnerKey];
                          const playerPos = getCurrentPlayers().findIndex(p => p.numero === globalRunners.first) + 1;
                          if (mode === 'stealing') return `🟠 SB #${playerPos} → 2ª BASE`;
                          if (mode === 'batting') return `🟢 AVZ #${playerPos} → 2ª BASE`;
                          return `#${playerPos} → 2ª BASE`;
                        })()}
                      </button>
                    )}
                    {globalRunners.second && (
                      <button 
                        onClick={() => handleManualRunnerMove('second', 'third')}
                        disabled={globalRunners.third !== null}
                        className={`w-full py-3 px-4 disabled:bg-slate-500 text-white text-sm font-bold rounded-lg transition-all transform hover:scale-105 ${
                          (() => {
                            const runnerKey = `second-${globalRunners.second}`;
                            const mode = stealMode[runnerKey];
                            if (mode === 'stealing') return 'bg-orange-600 hover:bg-orange-500';
                            if (mode === 'batting') return 'bg-green-600 hover:bg-green-500';
                            return 'bg-emerald-600 hover:bg-emerald-500';
                          })()
                        }`}
                      >
                        {(() => {
                          const runnerKey = `second-${globalRunners.second}`;
                          const mode = stealMode[runnerKey];
                          const playerPos = getCurrentPlayers().findIndex(p => p.numero === globalRunners.second) + 1;
                          if (mode === 'stealing') return `🟠 SB #${playerPos} → 3ª BASE`;
                          if (mode === 'batting') return `🟢 AVZ #${playerPos} → 3ª BASE`;
                          return `#${playerPos} → 3ª BASE`;
                        })()}
                      </button>
                    )}
                    {globalRunners.third && (
                      <button 
                        onClick={() => handleManualRunnerMove('third', 'home')}
                        className={`w-full py-3 px-4 text-white text-sm font-bold rounded-lg transition-all transform hover:scale-105 ${
                          (() => {
                            const runnerKey = `third-${globalRunners.third}`;
                            const mode = stealMode[runnerKey];
                            if (mode === 'stealing') return 'bg-orange-600 hover:bg-orange-500';
                            if (mode === 'batting') return 'bg-green-600 hover:bg-green-500';
                            return 'bg-yellow-600 hover:bg-yellow-500';
                          })()
                        }`}
                      >
                        {(() => {
                          const runnerKey = `third-${globalRunners.third}`;
                          const mode = stealMode[runnerKey];
                          const playerPos = getCurrentPlayers().findIndex(p => p.numero === globalRunners.third) + 1;
                          if (mode === 'stealing') return `🟠 SB #${playerPos} → HOME ⚾`;
                          if (mode === 'batting') return `🟢 AVZ #${playerPos} → HOME ⚾`;
                          return `🏆 #${playerPos} → HOME`;
                        })()}
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-emerald-300/80 text-center mt-2">
                    🟠 SB = Base Robada | 🟢 AVZ = Avance por Bateo
                  </div>
                </div>
              )}
              
              {/* Botones de OUT para corredores */}
              {!manualMoveMode.active && (globalRunners.first || globalRunners.second || globalRunners.third) && (
                <div className="bg-red-700/30 border border-red-600 rounded-lg p-3 mt-3">
                  <div className="text-sm text-red-300 mb-3 text-center font-bold">
                    ❌ MARCAR OUT
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                      {globalRunners.first && (
                        <button 
                          onClick={() => removeRunnerFromBase('first')}
                          className="px-1 py-1 bg-red-700 hover:bg-red-800 text-white text-xs rounded transition-colors"
                        >
                          OUT-1B
                        </button>
                      )}
                      {globalRunners.second && (
                        <button 
                          onClick={() => removeRunnerFromBase('second')}
                          className="px-1 py-1 bg-red-700 hover:bg-red-800 text-white text-xs rounded transition-colors"
                        >
                          OUT-2B
                        </button>
                      )}
                      {globalRunners.third && (
                        <button 
                          onClick={() => removeRunnerFromBase('third')}
                          className="px-1 py-1 bg-red-700 hover:bg-red-800 text-white text-xs rounded transition-colors"
                        >
                          OUT-3B
                        </button>
                      )}
                  </div>
                </div>
              )}
          </div>

          {/* INFORMACIÓN DETALLADA DEL JUGADOR SELECCIONADO */}
          <div className="text-center mb-6">
            <div className="bg-slate-700 rounded p-3 mb-4">
              <p className="text-xs text-slate-300 mb-2">
                ⚾ Sistema de avance automático activo
              </p>
              <div className="text-xs text-blue-300 mb-1">
                📝 <strong>MOVIMIENTO MANUAL:</strong>
              </div>
              <div className="text-xs text-slate-400 mb-2">
                1. Haz click en un corredor (círculo verde)
                <br/>
                2. Haz click en la base destino
                <br/>
                3. O usa los botones rápidos de robo
              </div>
              <div className="text-xs text-orange-300 border-t border-slate-600 pt-2">
                📝 <strong>EDITAR ANOTACIONES:</strong>
                <br/>
                <span className="text-slate-400">Mantén presionado cualquier cuadro del lineup por 0.8s</span>
              </div>
            </div>
            
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
                              handlePitcherAction('K_P'); // Registrar ponche para pitcher
                            }
                          } else {
                            setGameState(prev => ({ ...prev, strikes: newStrikes }));
                            // Registrar strike como lanzamiento para pitcher
                            handlePitcherAction('STRIKE_PITCH');
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
                          handlePitcherAction('BB_P'); // Registrar base por bolas para pitcher
                        }
                      } else {
                        setGameState(prev => ({ ...prev, balls: newBalls }));
                        // Registrar bola como lanzamiento para pitcher
                        handlePitcherAction('BALL_PITCH');
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

          {/* BOTONES PRINCIPALES */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* H1 */}
            <button 
              onClick={() => handleQuickAction('H1')} 
              disabled={!currentPlayer} 
              className="bg-green-600 hover:bg-green-500 text-white py-4 px-3 rounded-xl text-sm font-bold disabled:bg-slate-600 transition-all transform hover:scale-105 shadow-lg"
            >
              <div className="text-lg mb-1">🥎</div>
              <div>H1</div>
              <div className="text-xs opacity-80">Sencillo</div>
            </button>
            
            {/* H2 */}
            <button 
              onClick={() => handleQuickAction('H2')} 
              disabled={!currentPlayer} 
              className="bg-blue-600 hover:bg-blue-500 text-white py-4 px-3 rounded-xl text-sm font-bold disabled:bg-slate-600 transition-all transform hover:scale-105 shadow-lg"
            >
              <div className="text-lg mb-1">⚾</div>
              <div>H2</div>
              <div className="text-xs opacity-80">Doble</div>
            </button>
            
            {/* H3 */}
            <button 
              onClick={() => handleQuickAction('H3')} 
              disabled={!currentPlayer} 
              className="bg-yellow-600 hover:bg-yellow-500 text-white py-4 px-3 rounded-xl text-sm font-bold disabled:bg-slate-600 transition-all transform hover:scale-105 shadow-lg"
            >
              <div className="text-lg mb-1">🌟</div>
              <div>H3</div>
              <div className="text-xs opacity-80">Triple</div>
            </button>

            {/* BB */}
            <button 
              onClick={() => handleQuickAction('BB')} 
              disabled={!currentPlayer} 
              className="bg-blue-700 hover:bg-blue-600 text-white py-4 px-3 rounded-xl text-sm font-bold disabled:bg-slate-600 transition-all transform hover:scale-105 shadow-lg"
            >
              <div className="text-lg mb-1">🚶</div>
              <div>BB</div>
              <div className="text-xs opacity-80">Base por Bolas</div>
            </button>

            {/* BASE ROBADA */}
            <button 
              onClick={() => handleQuickAction('SB')} 
              disabled={!currentPlayer} 
              className="bg-emerald-600 hover:bg-emerald-500 text-white py-4 px-3 rounded-xl text-sm font-bold disabled:bg-slate-600 transition-all transform hover:scale-105 shadow-lg"
            >
              <div className="text-lg mb-1">💨</div>
              <div>SB</div>
              <div className="text-xs opacity-80">BASE ROBADA</div>
            </button>

            {/* PONCHE */}
            <button 
              onClick={() => handleQuickAction('K')} 
              disabled={!currentPlayer} 
              className="bg-red-600 hover:bg-red-500 text-white py-4 px-3 rounded-xl text-sm font-bold disabled:bg-slate-600 transition-all transform hover:scale-105 shadow-lg"
            >
              <div className="text-lg mb-1">⚡</div>
              <div>K</div>
              <div className="text-xs opacity-80">Ponche</div>
            </button>

            {/* OUT - con menú desplegable */}
            <div className="relative">
              <button 
                onClick={() => setShowOutMenu(!showOutMenu)} 
                disabled={!currentPlayer} 
                className="w-full bg-red-700 hover:bg-red-600 text-white py-4 px-3 rounded-xl text-sm font-bold disabled:bg-slate-600 transition-all transform hover:scale-105 shadow-lg"
              >
                <div className="text-lg mb-1">❌</div>
                <div>OUT</div>
                <div className="text-xs opacity-80">Jugador Out ▼</div>
              </button>
              
              {/* Menú desplegable de OUT */}
              {showOutMenu && !customOutEntry.isActive && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-red-800 border border-red-600 rounded-lg shadow-lg z-50">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        handleQuickAction('O');
                        setShowOutMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-red-600 rounded text-sm text-white transition-colors mb-1"
                    >
                      🔴 OUT Normal
                    </button>
                    <button
                      onClick={() => {
                        activateCustomOutEntry();
                        setShowOutMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-red-600 rounded text-sm text-white transition-colors"
                    >
                      ⌨️ OUT Personalizado
                    </button>
                  </div>
                </div>
              )}

              {/* Entrada personalizada de OUT */}
              {customOutEntry.isActive && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-red-800 border border-red-600 rounded-lg shadow-lg z-50 min-w-[200px]">
                  <div className="p-3">
                    <div className="text-xs text-red-200 mb-2 font-semibold">TIPO DE OUT PERSONALIZADO:</div>
                    <input
                      type="text"
                      value={customOutEntry.inputValue}
                      onChange={(e) => setCustomOutEntry(prev => ({ ...prev, inputValue: e.target.value }))}
                      placeholder="ej: 6-4-3, FC, INT"
                      className="w-full px-2 py-1 bg-red-900 border border-red-500 rounded text-white text-sm mb-2 focus:outline-none focus:border-red-400"
                      autoFocus
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleCustomOutEntry();
                        }
                        if (e.key === 'Escape') {
                          cancelCustomOutEntry();
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleCustomOutEntry}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition-colors"
                      >
                        ✓ Confirmar
                      </button>
                      <button
                        onClick={cancelCustomOutEntry}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs transition-colors"
                      >
                        ❌ Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* F7 */}
            <button 
              onClick={() => handleQuickAction('F7')} 
              disabled={!currentPlayer} 
              className="bg-gray-600 hover:bg-gray-500 text-white py-4 px-3 rounded-xl text-sm font-bold disabled:bg-slate-600 transition-all transform hover:scale-105 shadow-lg"
            >
              <div className="text-lg mb-1">🌙</div>
              <div>F7</div>
              <div className="text-xs opacity-80">Fly LF</div>
            </button>

            {/* F8 */}
            <button 
              onClick={() => handleQuickAction('F8')} 
              disabled={!currentPlayer} 
              className="bg-gray-600 hover:bg-gray-500 text-white py-4 px-3 rounded-xl text-sm font-bold disabled:bg-slate-600 transition-all transform hover:scale-105 shadow-lg"
            >
              <div className="text-lg mb-1">🌕</div>
              <div>F8</div>
              <div className="text-xs opacity-80">Fly CF</div>
            </button>

            {/* F9 */}
            <button 
              onClick={() => handleQuickAction('F9')} 
              disabled={!currentPlayer} 
              className="bg-gray-600 hover:bg-gray-500 text-white py-4 px-3 rounded-xl text-sm font-bold disabled:bg-slate-600 transition-all transform hover:scale-105 shadow-lg"
            >
              <div className="text-lg mb-1">🌞</div>
              <div>F9</div>
              <div className="text-xs opacity-80">Fly RF</div>
            </button>
          </div>

          {/* MENÚS DESPLEGABLES */}
          <div className="space-y-4">
            {/* Menú de Errores */}
            <div className="bg-red-900/30 border border-red-600 rounded-lg">
              <button
                onClick={() => setShowErrorMenu(!showErrorMenu)}
                className="w-full flex items-center justify-between p-3 text-left text-red-300 hover:bg-red-800/30 transition-all"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">⚠️</span>
                  <span className="font-semibold">ERRORES</span>
                </div>
                <span className={`transform transition-transform ${showErrorMenu ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {showErrorMenu && (
                <div className="p-3 pt-0 border-t border-red-600/30">
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => handleDefensiveError('P', 1)} className="bg-red-700 hover:bg-red-600 text-white py-2 px-2 rounded text-xs font-medium">E1 - P</button>
                    <button onClick={() => handleDefensiveError('C', 2)} className="bg-red-700 hover:bg-red-600 text-white py-2 px-2 rounded text-xs font-medium">E2 - C</button>
                    <button onClick={() => handleDefensiveError('1B', 3)} className="bg-red-700 hover:bg-red-600 text-white py-2 px-2 rounded text-xs font-medium">E3 - 1B</button>
                    <button onClick={() => handleDefensiveError('2B', 4)} className="bg-red-700 hover:bg-red-600 text-white py-2 px-2 rounded text-xs font-medium">E4 - 2B</button>
                    <button onClick={() => handleDefensiveError('3B', 5)} className="bg-red-700 hover:bg-red-600 text-white py-2 px-2 rounded text-xs font-medium">E5 - 3B</button>
                    <button onClick={() => handleDefensiveError('SS', 6)} className="bg-red-700 hover:bg-red-600 text-white py-2 px-2 rounded text-xs font-medium">E6 - SS</button>
                    <button onClick={() => handleDefensiveError('LF', 7)} className="bg-red-700 hover:bg-red-600 text-white py-2 px-2 rounded text-xs font-medium">E7 - LF</button>
                    <button onClick={() => handleDefensiveError('CF', 8)} className="bg-red-700 hover:bg-red-600 text-white py-2 px-2 rounded text-xs font-medium">E8 - CF</button>
                    <button onClick={() => handleDefensiveError('RF', 9)} className="bg-red-700 hover:bg-red-600 text-white py-2 px-2 rounded text-xs font-medium">E9 - RF</button>
                  </div>
                </div>
              )}
            </div>

            {/* Menú de Doble Plays */}
            <div className="bg-purple-900/30 border border-purple-600 rounded-lg">
              <button
                onClick={() => setShowDoublePlayMenu(!showDoublePlayMenu)}
                className="w-full flex items-center justify-between p-3 text-left text-purple-300 hover:bg-purple-800/30 transition-all"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">⚡</span>
                  <span className="font-semibold">DOBLE PLAYS</span>
                </div>
                <span className={`transform transition-transform ${showDoublePlayMenu ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {showDoublePlayMenu && (
                <div className="p-3 pt-0 border-t border-purple-600/30">
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleQuickAction('DP-6-4-3')} className="bg-purple-700 hover:bg-purple-600 text-white py-2 px-2 rounded text-xs font-medium">
                      DP 6-4-3<br/>
                      <span className="text-xs text-purple-200">SS→2B→1B</span>
                    </button>
                    <button onClick={() => handleQuickAction('DP-5-4-3')} className="bg-purple-700 hover:bg-purple-600 text-white py-2 px-2 rounded text-xs font-medium">
                      DP 5-4-3<br/>
                      <span className="text-xs text-purple-200">3B→2B→1B</span>
                    </button>
                    <button onClick={() => handleQuickAction('DP-4-6-3')} className="bg-purple-700 hover:bg-purple-600 text-white py-2 px-2 rounded text-xs font-medium">
                      DP 4-6-3<br/>
                      <span className="text-xs text-purple-200">2B→SS→1B</span>
                    </button>
                    <button onClick={() => handleQuickAction('DP-3-6')} className="bg-purple-700 hover:bg-purple-600 text-white py-2 px-2 rounded text-xs font-medium">
                      DP 3-6<br/>
                      <span className="text-xs text-purple-200">1B→SS</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Menú de Otras Acciones */}
            <div className="bg-slate-700/50 border border-slate-500 rounded-lg">
              <button
                onClick={() => setShowOtherActionsMenu(!showOtherActionsMenu)}
                className="w-full flex items-center justify-between p-3 text-left text-slate-300 hover:bg-slate-600/50 transition-all"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🔧</span>
                  <span className="font-semibold">OTRAS ACCIONES</span>
                </div>
                <span className={`transform transition-transform ${showOtherActionsMenu ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {showOtherActionsMenu && (
                <div className="p-3 pt-0 border-t border-slate-500/30">
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <button onClick={() => handleQuickAction('HR')} className="bg-purple-600 hover:bg-purple-500 text-white py-2 px-2 rounded text-xs font-medium">HR</button>
                    <button onClick={() => handleQuickAction('IBB')} className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-2 rounded text-xs font-medium">IBB</button>
                    <button onClick={() => handleQuickAction('HBP')} className="bg-orange-600 hover:bg-orange-500 text-white py-2 px-2 rounded text-xs font-medium">HBP</button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <button onClick={() => handleQuickAction('4-3')} className="bg-slate-600 hover:bg-slate-500 text-white py-2 px-2 rounded text-xs font-medium">4-3</button>
                    <button onClick={() => handleQuickAction('5-3')} className="bg-slate-600 hover:bg-slate-500 text-white py-2 px-2 rounded text-xs font-medium">5-3</button>
                    <button onClick={() => handleQuickAction('6-3')} className="bg-slate-600 hover:bg-slate-500 text-white py-2 px-2 rounded text-xs font-medium">6-3</button>
                    <button onClick={() => handleQuickAction('F6')} className="bg-slate-600 hover:bg-slate-500 text-white py-2 px-2 rounded text-xs font-medium">F6</button>
                  </div>
                </div>
              )}
            </div>
          </div>
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

          {/* INFIELD FLY RULE - DESPLEGABLE */}
          <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg">
            <button
              onClick={() => setShowInfieldFlyMenu(!showInfieldFlyMenu)}
              className="w-full flex items-center justify-between p-3 text-left text-yellow-300 hover:bg-yellow-800/30 transition-all"
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">⚾</span>
                <div>
                  <span className="font-semibold">INFIELD FLY RULE</span>
                  <div className="text-xs text-yellow-200">
                    {canApplyInfieldFly() ? "✅ Disponible" : "❌ No aplica"}
                  </div>
                </div>
              </div>
              <span className={`transform transition-transform ${showInfieldFlyMenu ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {showInfieldFlyMenu && (
              <div className="p-3 pt-0 border-t border-yellow-600/30">
                <div className="text-xs text-yellow-200 text-center mb-3">
                  {canApplyInfieldFly() 
                    ? "✅ Se puede aplicar la regla" 
                    : "❌ No aplica (necesita corredores en 1ª y 2ª, menos de 2 outs)"
                  }
                </div>
                
                <div className="grid grid-cols-4 gap-1 mb-2">
                  <button 
                    onClick={() => handleInfieldFly(3, 'caught')} 
                    disabled={!canApplyInfieldFly() || !currentPlayer}
                    className="bg-yellow-700 hover:bg-yellow-600 text-white py-2 px-1 rounded text-xs font-medium disabled:bg-slate-700"
                  >
                    IF3<br/>
                    <span className="text-xs">1B</span>
                  </button>
                  <button 
                    onClick={() => handleInfieldFly(4, 'caught')} 
                    disabled={!canApplyInfieldFly() || !currentPlayer}
                    className="bg-yellow-700 hover:bg-yellow-600 text-white py-2 px-1 rounded text-xs font-medium disabled:bg-slate-700"
                  >
                    IF4<br/>
                    <span className="text-xs">2B</span>
                  </button>
                  <button 
                    onClick={() => handleInfieldFly(5, 'caught')} 
                    disabled={!canApplyInfieldFly() || !currentPlayer}
                    className="bg-yellow-700 hover:bg-yellow-600 text-white py-2 px-1 rounded text-xs font-medium disabled:bg-slate-700"
                  >
                    IF5<br/>
                    <span className="text-xs">3B</span>
                  </button>
                  <button 
                    onClick={() => handleInfieldFly(6, 'caught')} 
                    disabled={!canApplyInfieldFly() || !currentPlayer}
                    className="bg-yellow-700 hover:bg-yellow-600 text-white py-2 px-1 rounded text-xs font-medium disabled:bg-slate-700"
                  >
                    IF6<br/>
                    <span className="text-xs">SS</span>
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-1">
                  <button 
                    onClick={() => handleInfieldFly(3, 'dropped')} 
                    disabled={!canApplyInfieldFly() || !currentPlayer}
                    className="bg-red-700 hover:bg-red-600 text-white py-2 px-1 rounded text-xs font-medium disabled:bg-slate-700"
                  >
                    IF3<br/>
                    <span className="text-xs text-red-200">(drop)</span>
                  </button>
                  <button 
                    onClick={() => handleInfieldFly(4, 'dropped')} 
                    disabled={!canApplyInfieldFly() || !currentPlayer}
                    className="bg-red-700 hover:bg-red-600 text-white py-2 px-1 rounded text-xs font-medium disabled:bg-slate-700"
                  >
                    IF4<br/>
                    <span className="text-xs text-red-200">(drop)</span>
                  </button>
                  <button 
                    onClick={() => handleInfieldFly(5, 'dropped')} 
                    disabled={!canApplyInfieldFly() || !currentPlayer}
                    className="bg-red-700 hover:bg-red-600 text-white py-2 px-1 rounded text-xs font-medium disabled:bg-slate-700"
                  >
                    IF5<br/>
                    <span className="text-xs text-red-200">(drop)</span>
                  </button>
                  <button 
                    onClick={() => handleInfieldFly(6, 'dropped')} 
                    disabled={!canApplyInfieldFly() || !currentPlayer}
                    className="bg-red-700 hover:bg-red-600 text-white py-2 px-1 rounded text-xs font-medium disabled:bg-slate-700"
                  >
                    IF6<br/>
                    <span className="text-xs text-red-200">(drop)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* LANZAMIENTOS FOUL - PITCHER */}
          <div className="bg-orange-900/50 border border-orange-600 rounded-lg p-3 mb-6">
            <div className="text-xs text-orange-300 mb-2 font-semibold text-center">⚾ LANZAMIENTOS FOUL</div>
            <div className="text-xs text-orange-200 text-center mb-3">
              Pitcher ({currentTeam === 'local' ? 'Visitante' : 'Local'}): {getCurrentPitcher()?.nombre || 'Asignar posición P en lineup'}
            </div>
            
            {/* Contadores manuales */}
            <div className="bg-orange-800 rounded p-3 mb-3">
              <div className="text-xs text-orange-200 mb-2 text-center">CONTEO MANUAL</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handlePitcherAction('FOUL_PITCH')}
                  className="bg-orange-600 hover:bg-orange-700 text-white py-2 px-2 rounded text-xs font-bold"
                >
                  ⚾ FOUL
                </button>
                <button
                  onClick={() => handlePitcherAction('STRIKE_PITCH')}
                  className="bg-red-600 hover:bg-red-700 text-white py-2 px-2 rounded text-xs font-bold"
                >
                  🔴 STRIKE
                </button>
                <button
                  onClick={() => handlePitcherAction('BALL_PITCH')}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-2 rounded text-xs font-bold"
                >
                  🔵 BOLA
                </button>
                <button
                  onClick={() => handlePitcherAction('GROUND_OUT')}
                  className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-2 rounded text-xs font-bold"
                >
                  🌍 GROUND
                </button>
              </div>
            </div>
          </div>

          {/* SITUACIONES ESPECIALES - DESPLEGABLE */}
          <div className="bg-orange-900/30 border border-orange-600 rounded-lg">
            <button
              onClick={() => setShowSpecialSituationsMenu(!showSpecialSituationsMenu)}
              className="w-full flex items-center justify-between p-3 text-left text-orange-300 hover:bg-orange-800/30 transition-all"
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">⚡</span>
                <span className="font-semibold">SITUACIONES ESPECIALES</span>
              </div>
              <span className={`transform transition-transform ${showSpecialSituationsMenu ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {showSpecialSituationsMenu && (
              <div className="p-3 pt-0 border-t border-orange-600/30">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button 
                    onClick={handleHitByPitch} 
                    disabled={!currentPlayer}
                    className="bg-orange-700 hover:bg-orange-600 text-white py-2 px-2 rounded text-xs font-medium disabled:bg-slate-700"
                  >
                    🎯 HBP<br/>
                    <span className="text-xs text-orange-200">Golpe Bateador</span>
                  </button>
                  <button 
                    onClick={() => setShowBalkModal(true)} 
                    disabled={!getCurrentPitcher()}
                    className="bg-red-700 hover:bg-red-600 text-white py-2 px-2 rounded text-xs font-medium disabled:bg-slate-700"
                  >
                    🚫 BALK<br/>
                    <span className="text-xs text-red-200">Movimiento Ilegal</span>
                  </button>
                </div>
                <div className="text-xs text-orange-200 text-center mt-2">
                  💡 HBP, BB e IBB no cuentan como turno al bat (AB)
                </div>
              </div>
            )}
          </div>

          {/* ESTADÍSTICAS DEL PITCHER - DESPLEGABLE */}
          <div className="bg-blue-900/30 border border-blue-600 rounded-lg">
            <button
              onClick={() => setShowPitchingMenu(!showPitchingMenu)}
              className="w-full flex items-center justify-between p-3 text-left text-blue-300 hover:bg-blue-800/30 transition-all"
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">⚾</span>
                <div>
                  <span className="font-semibold">ESTADÍSTICAS DEL PITCHER</span>
                  <div className="text-xs text-blue-200">
                    {getCurrentPitcher()?.nombre || 'Sin pitcher asignado'}
                  </div>
                </div>
              </div>
              <span className={`transform transition-transform ${showPitchingMenu ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {showPitchingMenu && (
              <div className="p-3 pt-0 border-t border-blue-600/30">
                <p className="text-xs text-slate-400 text-center mb-3">
                  Pitcher ({currentTeam === 'local' ? 'Visitante' : 'Local'}): {getCurrentPitcher()?.nombre || 'Asignar posición P en lineup'}
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
            )}
          </div>

          {/* ERRORES DEFENSIVOS - DESPLEGABLE */}
          <div className="bg-slate-700/50 border border-slate-500 rounded-lg mb-6">
            <button
              onClick={() => setShowErrorMenu(!showErrorMenu)}
              className="w-full flex items-center justify-between p-3 text-left text-red-300 hover:bg-slate-600/50 transition-all"
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">⚠️</span>
                <div>
                  <span className="font-semibold">ERRORES DEFENSIVOS</span>
                  <div className="text-xs text-slate-400">
                    Equipo: {currentTeam === 'local' ? 'Visitante' : 'Local'}
                  </div>
                </div>
              </div>
              <span className={`transform transition-transform ${showErrorMenu ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {showErrorMenu && (
              <div className="p-3 pt-0 border-t border-slate-500/30">
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
            )}
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
      
      {/* MODAL DE EDICIÓN DE ANOTACIONES */}
      {editModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-600">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white mb-2">
                📝 EDITAR ANOTACIÓN
              </h3>
              <div className="text-sm text-slate-300 mb-4">
                <div>Jugador: <span className="text-blue-400 font-semibold">
                  {getCurrentPlayers().find(p => p.id === editModal.playerId)?.nombre || 'Desconocido'}
                </span></div>
                <div>Entrada: <span className="text-green-400 font-semibold">{editModal.inning}</span></div>
                <div>Acción actual: <span className="text-yellow-400 font-semibold">
                  {editModal.currentAction || 'Sin acción'}
                </span></div>
              </div>
            </div>
            
            <div className="mb-6">
              <h4 className="text-sm font-bold text-slate-300 mb-3">SELECCIONAR NUEVA ACCIÓN:</h4>
              
              {/* HITS */}
              <div className="mb-4">
                <div className="text-xs text-blue-300 mb-2 font-semibold">HITS:</div>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => updateActionFromModal('H1')}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm font-bold transition-colors"
                  >
                    H1 - Sencillo
                  </button>
                  <button 
                    onClick={() => updateActionFromModal('H2')}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm font-bold transition-colors"
                  >
                    H2 - Doble
                  </button>
                  <button 
                    onClick={() => updateActionFromModal('H3')}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm font-bold transition-colors"
                  >
                    H3 - Triple
                  </button>
                  <button 
                    onClick={() => updateActionFromModal('HR')}
                    className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded text-sm font-bold transition-colors"
                  >
                    HR - Jonrón
                  </button>
                </div>
              </div>
              
              {/* OTRAS ACCIONES */}
              <div className="mb-4">
                <div className="text-xs text-green-300 mb-2 font-semibold">OTRAS ACCIONES:</div>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => updateActionFromModal('BB')}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-3 rounded text-sm font-bold transition-colors"
                  >
                    BB
                  </button>
                  <button 
                    onClick={() => updateActionFromModal('K')}
                    className="bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded text-sm font-bold transition-colors"
                  >
                    K
                  </button>
                  <button 
                    onClick={() => updateActionFromModal('O')}
                    className="bg-red-700 hover:bg-red-800 text-white py-2 px-3 rounded text-sm font-bold transition-colors"
                  >
                    OUT
                  </button>
                  <button 
                    onClick={() => updateActionFromModal('C')}
                    className="bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded text-sm font-bold transition-colors"
                  >
                    C
                  </button>
                  <button 
                    onClick={() => updateActionFromModal('4-3')}
                    className="bg-slate-600 hover:bg-slate-500 text-white py-2 px-3 rounded text-sm font-bold transition-colors"
                  >
                    4-3
                  </button>
                  <button 
                    onClick={() => updateActionFromModal('6-3')}
                    className="bg-slate-600 hover:bg-slate-500 text-white py-2 px-3 rounded text-sm font-bold transition-colors"
                  >
                    6-3
                  </button>
                </div>
              </div>
              
              {/* LIMPIAR ACCIÓN */}
              {editModal.currentAction && (
                <div className="mb-4">
                  <button 
                    onClick={() => {
                      // Limpiar la acción actual
                      const newInningData = { ...inningData };
                      if (newInningData[editModal.playerId!] && newInningData[editModal.playerId!][editModal.inning!]) {
                        delete newInningData[editModal.playerId!][editModal.inning!];
                      }
                      setInningData(newInningData);
                      setSuccessMessage('🧹 Acción eliminada');
                      setTimeout(() => setSuccessMessage(''), 3000);
                      closeEditModal();
                    }}
                    className="w-full bg-red-800 hover:bg-red-900 text-white py-2 px-3 rounded text-sm font-bold transition-colors"
                  >
                    🧹 LIMPIAR ACCIÓN
                  </button>
                </div>
              )}
            </div>
            
            {/* BOTONES DE CONTROL */}
            <div className="flex justify-end space-x-3">
              <button 
                onClick={closeEditModal}
                className="bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded font-bold transition-colors"
              >
                ❌ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE JUGADAS FORZADAS */}
      {showForcePlayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl border border-slate-600">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white mb-2 text-center">
                ⚾ JUGADA FORZADA DETECTADA
              </h3>
              <div className="text-sm text-slate-300 mb-4 text-center">
                <div>Acción: <span className="text-blue-400 font-semibold">{pendingAction}</span></div>
                <div className="text-xs text-orange-300 mt-2">
                  Los siguientes corredores están forzados a avanzar:
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="space-y-3">
                {forcedRunners.map((runner, index) => {
                  const playerInfo = getCurrentPlayers().find(p => p.numero === runner.playerNum);
                  const lineupPos = getCurrentPlayers().findIndex(p => p.numero === runner.playerNum) + 1;
                  
                  return (
                    <div key={index} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <div className="text-white font-bold">
                            #{runner.playerNum} {playerInfo?.nombre || 'Desconocido'}
                          </div>
                          <div className="text-sm text-slate-300">
                            Lineup #{lineupPos} • {runner.fromBase.toUpperCase()} → {runner.toBase.toUpperCase()}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              const updatedRunners = [...forcedRunners];
                              updatedRunners[index].status = 'safe';
                              setForcedRunners(updatedRunners);
                            }}
                            className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                              runner.status === 'safe' 
                                ? 'bg-green-600 text-white' 
                                : 'bg-slate-600 hover:bg-green-600 text-slate-300 hover:text-white'
                            }`}
                          >
                            ✅ SAFE
                          </button>
                          <button
                            onClick={() => {
                              const updatedRunners = [...forcedRunners];
                              updatedRunners[index].status = 'out';
                              setForcedRunners(updatedRunners);
                            }}
                            className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                              runner.status === 'out' 
                                ? 'bg-red-600 text-white' 
                                : 'bg-slate-600 hover:bg-red-600 text-slate-300 hover:text-white'
                            }`}
                          >
                            ❌ OUT
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-xs text-slate-400">
                        Estado: <span className={`font-bold ${
                          runner.status === 'safe' ? 'text-green-400' : 
                          runner.status === 'out' ? 'text-red-400' : 
                          'text-yellow-400'
                        }`}>
                          {runner.status === 'safe' ? '✅ LLEGÓ SAFE' : 
                           runner.status === 'out' ? '❌ FORZADO OUT' : 
                           '⏳ PENDIENTE'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Información adicional sobre el bateador */}
              <div className="mt-4 bg-blue-900/50 rounded-lg p-3 border border-blue-600">
                <div className="text-sm text-blue-200 text-center">
                  <div className="font-bold">BATEADOR</div>
                  <div>{getCurrentPlayerInfo()?.nombre} - Acción: {pendingAction}</div>
                  <div className="text-xs text-blue-300 mt-1">
                    {['4-3', '5-3', '6-3'].includes(pendingAction || '') ? 
                      '⚠️ Probable OUT del bateador también' : 
                      'Estado del bateador será procesado automáticamente'
                    }
                  </div>
                </div>
              </div>
            </div>
            
            {/* Botones de control */}
            <div className="flex justify-between items-center">
              <div className="text-xs text-slate-400">
                <div>💡 <strong>Tip:</strong> En jugadas forzadas, los corredores DEBEN avanzar</div>
                <div>⚡ Selecciona SAFE/OUT para cada corredor según el resultado</div>
              </div>
              
              <div className="flex space-x-3">
                <button 
                  onClick={() => {
                    setShowForcePlayModal(false);
                    setForcedRunners([]);
                    setPendingAction(null);
                    setSaving(false);
                  }}
                  className="bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded font-bold transition-colors"
                >
                  ❌ Cancelar
                </button>
                
                <button 
                  onClick={() => {
                    // Verificar que todos los corredores tengan un estado asignado
                    const pendingRunners = forcedRunners.filter(r => r.status === 'pending');
                    if (pendingRunners.length > 0) {
                      setError('Debes asignar SAFE o OUT a todos los corredores forzados');
                      setTimeout(() => setError(''), 3000);
                      return;
                    }
                    
                    applyForcePlayResults();
                  }}
                  disabled={forcedRunners.some(r => r.status === 'pending')}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-slate-500 text-white py-2 px-6 rounded font-bold transition-colors"
                >
                  ✅ Aplicar Jugada
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN PARA REFRESH */}
      {showRefreshConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 max-w-md mx-4">
            <div className="text-center">
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                ⚠️ Confirmar Reinicio de Lineup
              </h3>
              <p className="text-slate-300 mb-6">
                ¿Estás seguro que deseas reiniciar completamente el lineup? 
                <br /><br />
                <span className="text-orange-300 font-semibold">
                  Esta acción eliminará TODOS los datos:
                  <br />• Jugadores seleccionados y posiciones
                  <br />• Estadísticas de todos los jugadores
                  <br />• Registro de carreras e innings
                  <br />• Corredores en bases y estado del juego
                  <br />• Datos temporales guardados
                </span>
                <br /><br />
                Esta acción no se puede deshacer.
              </p>
              
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setShowRefreshConfirm(false)}
                  className="bg-slate-600 hover:bg-slate-700 text-white py-2 px-6 rounded-lg font-medium transition-colors"
                >
                  ❌ Cancelar
                </button>
                <button
                  onClick={refreshLineup}
                  className="bg-orange-600 hover:bg-orange-700 text-white py-2 px-6 rounded-lg font-medium transition-colors"
                >
                  ✅ Sí, Reiniciar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE INTERFERENCIA */}
      {showInterferenceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-lg border border-orange-600">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white mb-2 text-center">
                ⚠️ INTERFERENCIA DETECTADA
              </h3>
              <div className="text-sm text-slate-300 mb-4 text-center">
                <div>Tipo: <span className="text-orange-400 font-semibold">
                  {interferenceType?.toUpperCase()}
                </span></div>
                <div className="text-xs text-orange-300 mt-2">
                  {interferenceType === 'batter' && 'El bateador interfiere con el catcher o la jugada'}
                  {interferenceType === 'runner' && 'El corredor interfiere con el fildeador'}
                  {interferenceType === 'catcher' && 'El catcher interfiere con el swing del bateador'}
                  {interferenceType === 'fan' && 'Un espectador interfiere con la pelota en juego'}
                  {interferenceType === 'coach' && 'El coach interfiere con la jugada'}
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="text-sm bg-slate-700 rounded p-3 mb-4">
                {interferenceType === 'batter' && (
                  <div>
                    <div className="font-semibold text-red-300 mb-1">📋 BI - Consecuencias:</div>
                    <div>• Bateador declarado <strong className="text-red-400">OUT</strong></div>
                    <div>• Se cuenta como turno al bat (AB)</div>
                    <div>• Jugada se detiene</div>
                  </div>
                )}
                
                {interferenceType === 'runner' && (
                  <div>
                    <div className="font-semibold text-red-300 mb-1">📋 RI - Consecuencias:</div>
                    <div>• Corredor declarado <strong className="text-red-400">OUT</strong></div>
                    <div>• Jugada se detiene</div>
                    <div>• Eliminar corredor manualmente después</div>
                  </div>
                )}
                
                {interferenceType === 'catcher' && (
                  <div>
                    <div className="font-semibold text-green-300 mb-1">📋 CI - Consecuencias:</div>
                    <div>• Bateador va a <strong className="text-green-400">primera base</strong></div>
                    <div>• Error E2 registrado al catcher</div>
                    <div>• Corredores avanzan por fuerza</div>
                    <div>• NO cuenta como turno al bat (AB)</div>
                  </div>
                )}
                
                {(interferenceType === 'fan' || interferenceType === 'coach') && (
                  <div>
                    <div className="font-semibold text-yellow-300 mb-1">📋 {interferenceType === 'fan' ? 'Fan INT' : 'Coach INT'} - Consecuencias:</div>
                    <div>• <strong className="text-yellow-400">Bola muerta</strong></div>
                    <div>• Decisión arbitral para corredores</div>
                    <div>• No afecta estadísticas automáticamente</div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-center space-x-3">
              <button 
                onClick={() => {
                  setShowInterferenceModal(false);
                  setInterferenceType(null);
                }}
                className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded font-bold transition-colors"
              >
                ❌ Cancelar
              </button>
              
              <button 
                onClick={applyInterferenceResult}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded font-bold transition-colors"
              >
                ✅ Confirmar
              </button>
            </div>
            
            <div className="mt-4 text-xs text-slate-400 text-center border-t border-slate-600 pt-3">
              💡 <strong>Recordatorio:</strong> La interferencia siempre requiere decisión arbitral
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE WILD PITCH / PASSED BALL */}
      {showWildPitchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl border border-purple-600">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white mb-2 text-center">
                ⚡ LANZAMIENTO DESCONTROLADO
              </h3>
              <div className="text-sm text-slate-300 mb-4 text-center">
                <div>Tipo: <span className="text-purple-400 font-semibold">
                  {wildPitchType === 'WP' ? 'WILD PITCH (Culpa del pitcher)' : 'PASSED BALL (Culpa del catcher)'}
                </span></div>
                <div className="text-xs text-purple-300 mt-2">
                  {wildPitchType === 'WP' ? 
                    'El pitcher lanzó la bola de manera descontrolada' : 
                    'El catcher no pudo controlar una bola que iba bien'
                  }
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h4 className="text-sm font-bold text-purple-300 mb-3 text-center">¿QUÉ CORREDORES AVANZARON?</h4>
              
              {runnersToAdvance.length === 0 ? (
                <div className="bg-slate-700 rounded-lg p-4 text-center">
                  <div className="text-slate-300 text-sm">
                    No hay corredores en bases que puedan avanzar
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {runnersToAdvance.map((runner, index) => {
                    const playerInfo = getCurrentPlayers().find(p => p.numero === runner.playerNum);
                    const lineupPos = getCurrentPlayers().findIndex(p => p.numero === runner.playerNum) + 1;
                    const isSelected = selectedRunners.has(runner.playerNum);
                    
                    return (
                      <div key={index} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-white font-bold">
                              #{runner.playerNum} {playerInfo?.nombre || 'Desconocido'}
                            </div>
                            <div className="text-sm text-slate-300">
                              Lineup #{lineupPos} • {runner.fromBase.toUpperCase()} → {runner.toBase.toUpperCase()}
                              {runner.toBase === 'home' && <span className="text-yellow-400 font-bold"> 🏆 CARRERA</span>}
                            </div>
                          </div>
                          
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const newSelectedRunners = new Set(selectedRunners);
                                if (e.target.checked) {
                                  newSelectedRunners.add(runner.playerNum);
                                } else {
                                  newSelectedRunners.delete(runner.playerNum);
                                }
                                setSelectedRunners(newSelectedRunners);
                              }}
                              className="sr-only"
                            />
                            <div className={`relative w-12 h-6 rounded-full transition-colors ${
                              isSelected ? 'bg-green-600' : 'bg-slate-600'
                            }`}>
                              <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                                isSelected ? 'translate-x-6' : 'translate-x-0'
                              }`}></div>
                            </div>
                            <span className={`ml-2 text-sm font-bold ${
                              isSelected ? 'text-green-400' : 'text-slate-400'
                            }`}>
                              {isSelected ? '✅ AVANZA' : '❌ NO AVANZA'}
                            </span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-xs text-slate-400">
                <div>💡 <strong>Wild Pitch:</strong> Error del pitcher, bola muy descontrolada</div>
                <div>💡 <strong>Passed Ball:</strong> Error del catcher, no pudo controlar la bola</div>
              </div>
              
              <div className="flex space-x-3">
                <button 
                  onClick={() => {
                    setShowWildPitchModal(false);
                    setWildPitchType(null);
                    setRunnersToAdvance([]);
                    setSelectedRunners(new Set());
                  }}
                  className="bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded font-bold transition-colors"
                >
                  ❌ Cancelar
                </button>
                
                <button 
                  onClick={() => {
                    // Recopilar qué corredores avanzan basándose en el estado
                    const advances: {[playerNum: number]: boolean} = {};
                    runnersToAdvance.forEach((runner) => {
                      advances[runner.playerNum] = selectedRunners.has(runner.playerNum);
                    });
                    
                    applyWildPitchResult(advances);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-6 rounded font-bold transition-colors"
                >
                  ✅ Aplicar Resultado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE INFIELD FLY RULE */}
      {showInfieldFlyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-yellow-600">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h3 className="text-lg font-bold text-white mb-2">
                ⚾ Confirmar Infield Fly Rule
              </h3>
              
              <div className="text-slate-300 mb-4">
                <p className="mb-2">
                  <span className="font-semibold text-yellow-400">
                    IF{infieldFlyPosition} {infieldFlyType === 'dropped' && '(dropped)'}
                  </span>
                </p>
                <p className="text-sm mb-2">
                  El bateador queda <strong className="text-red-400">automáticamente OUT</strong>
                </p>
                <p className="text-xs text-slate-400">
                  Los corredores pueden avanzar bajo su propio riesgo, pero NO están obligados.
                </p>
              </div>

              <div className="bg-yellow-900/30 rounded-lg p-3 mb-4">
                <div className="text-xs text-yellow-200">
                  <div className="font-semibold mb-1">📋 Condiciones cumplidas:</div>
                  <div>✅ Menos de 2 outs ({gameState.outs} outs)</div>
                  <div>✅ Corredores en 1ª y 2ª base (o bases llenas)</div>
                  <div>✅ Fly elevado dentro del cuadro</div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button 
                  onClick={() => {
                    setShowInfieldFlyModal(false);
                    setInfieldFlyType(null);
                    setInfieldFlyPosition(null);
                  }}
                  className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded font-bold transition-colors"
                >
                  ❌ Cancelar
                </button>
                
                <button 
                  onClick={confirmInfieldFly}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded font-bold transition-colors"
                >
                  ✅ Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE BALK */}
      {showBalkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-red-600">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h3 className="text-lg font-bold text-white mb-2">
                🚫 Confirmar BALK
              </h3>
              
              <div className="text-slate-300 mb-4">
                <p className="mb-2">
                  <span className="font-semibold text-red-400">Pitcher:</span> {getCurrentPitcher()?.nombre}
                </p>
                <p className="text-sm mb-2">
                  Todos los corredores en bases <strong className="text-green-400">avanzan automáticamente</strong> una base.
                </p>
                <p className="text-xs text-slate-400">
                  El BALK se registra como estadística negativa del pitcher.
                </p>
              </div>

              <div className="bg-red-900/30 rounded-lg p-3 mb-4">
                <div className="text-xs text-red-200">
                  <div className="font-semibold mb-1">📋 Corredores en bases:</div>
                  <div>1ª Base: {globalRunners.first ? `#${globalRunners.first}` : 'Vacía'}</div>
                  <div>2ª Base: {globalRunners.second ? `#${globalRunners.second}` : 'Vacía'}</div>
                  <div>3ª Base: {globalRunners.third ? `#${globalRunners.third}` : 'Vacía'}</div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button 
                  onClick={() => setShowBalkModal(false)}
                  className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded font-bold transition-colors"
                >
                  ❌ Cancelar
                </button>
                
                <button 
                  onClick={handleBalk}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded font-bold transition-colors"
                >
                  ✅ Confirmar BALK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}