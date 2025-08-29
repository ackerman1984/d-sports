'use client';

import React, { useState } from 'react';

type Action = 'empty' | 'H1' | 'H2' | 'H3' | 'HR' | 'K' | 'KB' | 'BB' | 'O' | 'C';

interface CellData {
  action: Action;
  runners: {
    first: boolean;
    second: boolean;
    third: boolean;
  };
}

export default function DiamondPreview() {
  const [selectedCell, setSelectedCell] = useState<number>(0);
  const [cellsData, setCellsData] = useState<CellData[]>(
    Array(9).fill(null).map(() => ({
      action: 'empty' as Action,
      runners: { first: false, second: false, third: false }
    }))
  );

  // Estados para el juego
  const [gameState, setGameState] = useState({
    strikes: 0,
    balls: 0,
    outs: 0,
  });

  const [fieldRunners, setFieldRunners] = useState({
    first: false,
    second: false,
    third: false,
    home: false,
  });

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

  // Estados para menú contextual
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    cellIndex: number;
    x: number;
    y: number;
  }>({ show: false, cellIndex: -1, x: 0, y: 0 });

  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isMenuStable, setIsMenuStable] = useState(false);

  // Funciones para menú contextual
  const handleMouseDown = (index: number, event: React.MouseEvent) => {
    event.preventDefault(); // Prevenir comportamiento por defecto
    setIsMenuStable(false);
    const timer = setTimeout(() => {
      setContextMenu({
        show: true,
        cellIndex: index,
        x: event.clientX,
        y: event.clientY
      });
      // Marcar el menú como estable después de mostrarlo
      setTimeout(() => setIsMenuStable(true), 100);
    }, 300);
    setLongPressTimer(timer);
  };

  const handleMouseUp = (event?: React.MouseEvent) => {
    if (event) event.preventDefault();
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleContextMenuAction = (action: 'edit' | 'delete' | 'stats') => {
    const cellIndex = contextMenu.cellIndex;
    
    if (action === 'edit') {
      setSelectedCell(cellIndex);
    } else if (action === 'delete') {
      setCellsData(prev => {
        const newData = [...prev];
        newData[cellIndex] = {
          action: 'empty' as Action,
          runners: { first: false, second: false, third: false }
        };
        return newData;
      });
    } else if (action === 'stats') {
      // Aquí se puede implementar mostrar estadísticas detalladas
      alert(`Estadísticas detalladas para celda ${cellIndex + 1}`);
    }
    
    setContextMenu({ show: false, cellIndex: -1, x: 0, y: 0 });
    setIsMenuStable(false);
  };

  // Función para calcular avance automático de corredores
  const calculateRunnerAdvancement = (action: Action, currentPlayer: number) => {
    const newGlobalRunners = { ...globalRunners };
    let cellRunners = { first: false, second: false, third: false };

    if (action === 'H1') {
      // Hit sencillo: avanza 1 base, el bateador va a primera
      if (globalRunners.third !== null) {
        // Corredor en tercera anota (no lo trackeamos más)
      }
      if (globalRunners.second !== null) {
        newGlobalRunners.third = globalRunners.second;
        newGlobalRunners.second = null;
      }
      if (globalRunners.first !== null) {
        newGlobalRunners.second = globalRunners.first;
      }
      newGlobalRunners.first = currentPlayer;
      cellRunners = { first: true, second: false, third: false };

    } else if (action === 'H2') {
      // Doble: avanza 2 bases, el bateador va a segunda
      if (globalRunners.third !== null || globalRunners.second !== null) {
        // Corredores en segunda y tercera anotan
      }
      if (globalRunners.first !== null) {
        newGlobalRunners.third = globalRunners.first;
      }
      newGlobalRunners.first = null;
      newGlobalRunners.second = currentPlayer;
      cellRunners = { first: true, second: true, third: false };

    } else if (action === 'H3') {
      // Triple: todos los corredores anotan, el bateador va a tercera
      newGlobalRunners.first = null;
      newGlobalRunners.second = null;
      newGlobalRunners.third = currentPlayer;
      cellRunners = { first: true, second: true, third: true };

    } else if (action === 'HR') {
      // Home Run: todos anotan incluyendo el bateador
      newGlobalRunners.first = null;
      newGlobalRunners.second = null;
      newGlobalRunners.third = null;
      cellRunners = { first: true, second: true, third: true };

    } else if (action === 'BB') {
      // Base por bolas: solo avanza si hay corredor en primera (bases llenas)
      if (globalRunners.first !== null) {
        if (globalRunners.second !== null) {
          if (globalRunners.third !== null) {
            // Bases llenas: corredor en tercera anota
          }
          newGlobalRunners.third = globalRunners.second;
        }
        newGlobalRunners.second = globalRunners.first;
      }
      newGlobalRunners.first = currentPlayer;
      cellRunners = { first: true, second: false, third: false };

    } else if (action === 'empty' || action === 'K' || action === 'KB' || action === 'O') {
      // No hay avance, no se modifica el estado global
      cellRunners = { first: false, second: false, third: false };
    }

    return { newGlobalRunners, cellRunners };
  };

  const handleActionClick = (action: Action) => {
    const currentPlayer = Math.floor(selectedCell / 5) + 1; // Calcular número de jugador
    const { newGlobalRunners, cellRunners } = calculateRunnerAdvancement(action, currentPlayer);

    // Actualizar estado global de corredores
    setGlobalRunners(newGlobalRunners);

    // Actualizar celda específica
    setCellsData(prev => {
      const newData = [...prev];
      newData[selectedCell] = {
        action: action,
        runners: cellRunners
      };
      return newData;
    });

    // Sincronizar diamante corredor con el estado de la celda
    setFieldRunners({
      first: cellRunners.first,
      second: cellRunners.second,
      third: cellRunners.third,
      home: action === 'HR' || action === 'C'
    });
  };

  const handleRunnerToggle = (base: 'first' | 'second' | 'third') => {
    setCellsData(prev => {
      const newData = [...prev];
      newData[selectedCell] = {
        ...newData[selectedCell],
        runners: {
          ...newData[selectedCell].runners,
          [base]: !newData[selectedCell].runners[base]
        }
      };
      return newData;
    });
  };

  const renderDiamondCell = (cellData: CellData, index: number, isSelected: boolean) => {
    const { action, runners } = cellData;
    
    return (
      <div 
        className={`w-12 h-12 flex items-center justify-center mx-auto relative rounded border-2 cursor-pointer transition-all select-none ${
          isSelected 
            ? 'bg-blue-600 border-blue-300 ring-2 ring-blue-300' 
            : action !== 'empty' 
              ? 'bg-blue-500 border-blue-400' 
              : 'bg-slate-500 border-slate-400'
        }`}
        onClick={() => {
          setSelectedCell(index);
          // Sincronizar el diamante corredor con esta celda específica
          const cellData = cellsData[index];
          if (cellData.runners.first || cellData.runners.second || cellData.runners.third) {
            setFieldRunners({
              first: cellData.runners.first,
              second: cellData.runners.second,
              third: cellData.runners.third,
              home: false
            });
          } else {
            setFieldRunners({ first: false, second: false, third: false, home: false });
          }
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          handleMouseDown(index, e);
        }}
        onMouseUp={(e) => {
          e.stopPropagation();
          handleMouseUp(e);
        }}
        onMouseLeave={(e) => {
          handleMouseUp(e);
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          handleMouseDown(index, e as any);
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleMouseUp();
        }}
      >
        {/* Diamante base - 35px x 35px exacto */}
        <div className="bg-slate-300 transform rotate-45 border border-slate-400" style={{ width: '35px', height: '35px' }}></div>
        
        
        {action === 'K' || action === 'KB' || action === 'O' ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-red-500 text-lg font-bold">✗</span>
          </div>
        ) : null}

        {/* Líneas de trayectoria según la acción */}
        {action === 'H1' && (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
            <line x1="24" y1="46" x2="46" y2="24" stroke="black" strokeWidth="2" />
          </svg>
        )}
        {action === 'H2' && (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
            <line x1="24" y1="46" x2="46" y2="24" stroke="black" strokeWidth="2" />
            <line x1="46" y1="24" x2="24" y2="2" stroke="black" strokeWidth="2" />
          </svg>
        )}
        {action === 'H3' && (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
            <line x1="24" y1="46" x2="46" y2="24" stroke="black" strokeWidth="2" />
            <line x1="46" y1="24" x2="24" y2="2" stroke="black" strokeWidth="2" />
            <line x1="24" y1="2" x2="2" y2="24" stroke="black" strokeWidth="2" />
          </svg>
        )}
        {action === 'HR' && (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
            <line x1="24" y1="46" x2="46" y2="24" stroke="black" strokeWidth="2" />
            <line x1="46" y1="24" x2="24" y2="2" stroke="black" strokeWidth="2" />
            <line x1="24" y1="2" x2="2" y2="24" stroke="black" strokeWidth="2" />
            <line x1="2" y1="24" x2="24" y2="46" stroke="black" strokeWidth="2" />
          </svg>
        )}
        {action === 'BB' && (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
            <line x1="24" y1="46" x2="46" y2="24" stroke="black" strokeWidth="2" strokeDasharray="3,3" />
          </svg>
        )}
        {action === 'C' && (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
            <line x1="24" y1="46" x2="46" y2="24" stroke="black" strokeWidth="2" />
            <line x1="46" y1="24" x2="24" y2="2" stroke="black" strokeWidth="2" />
            <line x1="24" y1="2" x2="2" y2="24" stroke="black" strokeWidth="2" />
            <line x1="2" y1="24" x2="24" y2="46" stroke="black" strokeWidth="2" />
          </svg>
        )}

        {/* Líneas de trayectoria según corredores de esta celda específica */}
        {runners.first && !runners.second && !runners.third && (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
            <line x1="24" y1="46" x2="46" y2="24" stroke="black" strokeWidth="2" />
          </svg>
        )}
        {runners.second && !runners.third && (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
            <line x1="24" y1="46" x2="46" y2="24" stroke="black" strokeWidth="2" />
            <line x1="46" y1="24" x2="24" y2="2" stroke="black" strokeWidth="2" />
          </svg>
        )}
        {runners.third && (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
            <line x1="24" y1="46" x2="46" y2="24" stroke="black" strokeWidth="2" />
            <line x1="46" y1="24" x2="24" y2="2" stroke="black" strokeWidth="2" />
            <line x1="24" y1="2" x2="2" y2="24" stroke="black" strokeWidth="2" />
          </svg>
        )}


        {/* Etiqueta de acción - PARTE INFERIOR */}
        {action !== 'empty' && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-black text-white px-1 py-0.5 text-xs rounded">
            {action}
          </div>
        )}
      </div>
    );
  };

  // Cerrar menú contextual al hacer clic fuera
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Solo cerrar si el menú está estable y el clic no es dentro del menú
      if (isMenuStable && !target.closest('[data-context-menu]')) {
        setContextMenu({ show: false, cellIndex: -1, x: 0, y: 0 });
        setIsMenuStable(false);
      }
    };

    if (contextMenu.show && isMenuStable) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu.show, isMenuStable]);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 relative">
      <h1 className="text-3xl font-bold text-center mb-8 text-blue-400">
        🔷 Vista Previa - Diamantes de Béisbol
      </h1>
      
      <div className="max-w-6xl mx-auto">
        
        {/* SECCIÓN 1: Diamantes Base */}
        <div className="bg-slate-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-green-400">1. Diamante Base (35px x 35px)</h2>
          <div className="flex items-center space-x-8">
            
            {/* Diamante Simple */}
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-2">Estado Inicial</p>
              <div className="w-12 h-12 flex items-center justify-center border-2 border-slate-600 bg-slate-700">
                <div className="bg-slate-300 transform rotate-45 border border-slate-400" style={{ width: '35px', height: '35px' }}></div>
              </div>
              <p className="text-xs text-slate-500 mt-2">Gris claro #e2e8f0</p>
            </div>

            {/* Con Hit a Primera */}
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-2">Hit a 1B</p>
              <div className="w-12 h-12 flex items-center justify-center border-2 border-slate-600 bg-slate-700 relative">
                <div className="bg-slate-300 transform rotate-45 border border-slate-400" style={{ width: '35px', height: '35px' }}></div>
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
                  <line x1="24" y1="37" x2="34" y2="27" stroke="black" strokeWidth="2" />
                </svg>
              </div>
              <p className="text-xs text-slate-500 mt-2">Línea 1</p>
            </div>

            {/* Con Hit a Segunda */}
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-2">Hit a 2B</p>
              <div className="w-12 h-12 flex items-center justify-center border-2 border-slate-600 bg-slate-700 relative">
                <div className="bg-slate-300 transform rotate-45 border border-slate-400" style={{ width: '35px', height: '35px' }}></div>
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
                  <line x1="24" y1="37" x2="34" y2="27" stroke="black" strokeWidth="2" />
                  <line x1="34" y1="27" x2="24" y2="11" stroke="black" strokeWidth="2" />
                </svg>
              </div>
              <p className="text-xs text-slate-500 mt-2">Líneas 1-2</p>
            </div>

            {/* Con Hit a Tercera */}
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-2">Hit a 3B</p>
              <div className="w-12 h-12 flex items-center justify-center border-2 border-slate-600 bg-slate-700 relative">
                <div className="bg-slate-300 transform rotate-45 border border-slate-400" style={{ width: '35px', height: '35px' }}></div>
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
                  <line x1="24" y1="37" x2="34" y2="27" stroke="black" strokeWidth="2" />
                  <line x1="34" y1="27" x2="24" y2="11" stroke="black" strokeWidth="2" />
                  <line x1="24" y1="11" x2="14" y2="21" stroke="black" strokeWidth="2" />
                </svg>
              </div>
              <p className="text-xs text-slate-500 mt-2">Líneas 1-2-3</p>
            </div>

            {/* Home Run */}
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-2">Home Run</p>
              <div className="w-12 h-12 flex items-center justify-center border-2 border-slate-600 bg-slate-700 relative">
                <div className="bg-slate-300 transform rotate-45 border border-slate-400" style={{ width: '35px', height: '35px' }}></div>
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
                  <line x1="24" y1="37" x2="34" y2="27" stroke="black" strokeWidth="2" />
                  <line x1="34" y1="27" x2="24" y2="11" stroke="black" strokeWidth="2" />
                  <line x1="24" y1="11" x2="14" y2="21" stroke="black" strokeWidth="2" />
                  <line x1="14" y1="21" x2="24" y2="37" stroke="black" strokeWidth="2" />
                </svg>
              </div>
              <p className="text-xs text-slate-500 mt-2">Diamante completo</p>
            </div>

            {/* Ponche */}
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-2">Ponche/Out</p>
              <div className="w-12 h-12 flex items-center justify-center border-2 border-slate-600 bg-slate-700 relative">
                <div className="bg-slate-300 transform rotate-45 border border-slate-400" style={{ width: '35px', height: '35px' }}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-red-500 text-lg font-bold">✗</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">Sin avance</p>
            </div>

          </div>
        </div>

        {/* SECCIÓN 2: Comparación de Tamaños */}
        <div className="bg-slate-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-yellow-400">2. Comparación de Tamaños</h2>
          <div className="flex items-end space-x-8">
            
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-2">30px</p>
              <div className="w-12 h-12 flex items-center justify-center border-2 border-slate-600 bg-slate-700">
                <div className="w-7 h-7 bg-slate-300 transform rotate-45 border border-slate-400"></div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-slate-400 mb-2">35px ← Actual</p>
              <div className="w-12 h-12 flex items-center justify-center border-2 border-green-600 bg-slate-700">
                <div className="bg-slate-300 transform rotate-45 border border-slate-400" style={{ width: '35px', height: '35px' }}></div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-slate-400 mb-2">48px</p>
              <div className="w-14 h-14 flex items-center justify-center border-2 border-slate-600 bg-slate-700">
                <div className="w-12 h-12 bg-slate-300 transform rotate-45 border border-slate-400"></div>
              </div>
            </div>

          </div>
        </div>

        {/* SECCIÓN 3: Simulación del Lineup */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-purple-400">3. Vista en Lineup Completo</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-600">
              <thead>
                <tr className="bg-slate-700">
                  <th className="border border-slate-600 p-3 text-left w-12 text-white font-bold">#</th>
                  <th className="border border-slate-600 p-3 text-left min-w-[200px] text-white font-bold">JUGADOR</th>
                  <th className="border border-slate-600 p-3 text-center w-16 text-white font-bold">POS</th>
                  {[1, 2, 3, 4, 5].map(entrada => (
                    <th key={entrada} className="border border-slate-600 p-3 text-center w-16 text-white font-bold">
                      {entrada}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Jugador 1 */}
                <tr className="hover:bg-slate-700/50">
                  <td className="border border-slate-600 p-3 text-center text-white font-bold">1</td>
                  <td className="border border-slate-600 p-3 text-blue-400 font-semibold">Pedro García</td>
                  <td className="border border-slate-600 p-3 text-center text-white">P</td>
                  
                  {/* Entrada 1 - Hit sencillo */}
                  <td className="border border-slate-600 p-2 text-center">
                    <div className="w-12 h-12 flex items-center justify-center mx-auto relative bg-blue-500 rounded border-2 border-blue-400">
                      <div className="bg-slate-300 transform rotate-45 border border-slate-400" style={{ width: '35px', height: '35px' }}></div>
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
                        <line x1="24" y1="37" x2="34" y2="27" stroke="black" strokeWidth="2" />
                      </svg>
                    </div>
                  </td>
                  
                  {/* Entrada 2 - Home Run */}
                  <td className="border border-slate-600 p-2 text-center">
                    <div className="w-12 h-12 flex items-center justify-center mx-auto relative bg-blue-500 rounded border-2 border-blue-400">
                      <div className="bg-slate-300 transform rotate-45 border border-slate-400" style={{ width: '35px', height: '35px' }}></div>
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
                        <line x1="24" y1="37" x2="34" y2="27" stroke="black" strokeWidth="2" />
                        <line x1="34" y1="27" x2="24" y2="11" stroke="black" strokeWidth="2" />
                        <line x1="24" y1="11" x2="14" y2="21" stroke="black" strokeWidth="2" />
                        <line x1="14" y1="21" x2="24" y2="37" stroke="black" strokeWidth="2" />
                      </svg>
                    </div>
                  </td>
                  
                  {/* Entrada 3 - Ponche */}
                  <td className="border border-slate-600 p-2 text-center">
                    <div className="w-12 h-12 flex items-center justify-center mx-auto relative bg-blue-500 rounded border-2 border-blue-400">
                      <div className="bg-slate-300 transform rotate-45 border border-slate-400" style={{ width: '35px', height: '35px' }}></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-red-500 text-lg font-bold">✗</span>
                      </div>
                    </div>
                  </td>
                  
                  {/* Entradas vacías */}
                  <td className="border border-slate-600 p-2 text-center">
                    <div className="w-12 h-12 flex items-center justify-center mx-auto bg-slate-500 rounded border-2 border-slate-400">
                      <div className="bg-slate-300 transform rotate-45 border border-slate-400" style={{ width: '35px', height: '35px' }}></div>
                    </div>
                  </td>
                  <td className="border border-slate-600 p-2 text-center">
                    <div className="w-12 h-12 flex items-center justify-center mx-auto bg-slate-500 rounded border-2 border-slate-400">
                      <div className="bg-slate-300 transform rotate-45 border border-slate-400" style={{ width: '35px', height: '35px' }}></div>
                    </div>
                  </td>
                </tr>

                {/* Jugador 2 */}
                <tr className="hover:bg-slate-700/50">
                  <td className="border border-slate-600 p-3 text-center text-white font-bold">2</td>
                  <td className="border border-slate-600 p-3 text-blue-400 font-semibold">Ana Martínez</td>
                  <td className="border border-slate-600 p-3 text-center text-white">C</td>
                  
                  {/* Entrada 1 - Base por bolas */}
                  <td className="border border-slate-600 p-2 text-center">
                    <div className="w-12 h-12 flex items-center justify-center mx-auto relative bg-blue-500 rounded border-2 border-blue-400">
                      <div className="bg-slate-300 transform rotate-45 border border-slate-400" style={{ width: '35px', height: '35px' }}></div>
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
                        <line x1="24" y1="37" x2="34" y2="27" stroke="green" strokeWidth="2" />
                      </svg>
                    </div>
                  </td>
                  
                  {/* Entrada 2 - Doble */}
                  <td className="border border-slate-600 p-2 text-center">
                    <div className="w-12 h-12 flex items-center justify-center mx-auto relative bg-blue-500 rounded border-2 border-blue-400">
                      <div className="bg-slate-300 transform rotate-45 border border-slate-400" style={{ width: '35px', height: '35px' }}></div>
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
                        <line x1="24" y1="37" x2="34" y2="27" stroke="orange" strokeWidth="2" />
                        <line x1="34" y1="27" x2="24" y2="11" stroke="orange" strokeWidth="2" />
                      </svg>
                    </div>
                  </td>
                  
                  {/* Entradas vacías */}
                  <td className="border border-slate-600 p-2 text-center">
                    <div className="w-12 h-12 flex items-center justify-center mx-auto bg-slate-500 rounded border-2 border-slate-400">
                      <div className="bg-slate-300 transform rotate-45 border border-slate-400" style={{ width: '35px', height: '35px' }}></div>
                    </div>
                  </td>
                  <td className="border border-slate-600 p-2 text-center">
                    <div className="w-12 h-12 flex items-center justify-center mx-auto bg-slate-500 rounded border-2 border-slate-400">
                      <div className="bg-slate-300 transform rotate-45 border border-slate-400" style={{ width: '35px', height: '35px' }}></div>
                    </div>
                  </td>
                  <td className="border border-slate-600 p-2 text-center">
                    <div className="w-12 h-12 flex items-center justify-center mx-auto bg-slate-500 rounded border-2 border-slate-400">
                      <div className="bg-slate-300 transform rotate-45 border border-slate-400" style={{ width: '35px', height: '35px' }}></div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SECCIÓN 4: SIMULADOR INTERACTIVO */}
        <div className="bg-gradient-to-r from-green-800 to-blue-800 rounded-lg p-6 mt-8">
          <h2 className="text-2xl font-bold mb-6 text-center text-yellow-400">⚡ SIMULADOR INTERACTIVO</h2>
          <p className="text-center text-slate-300 mb-6">Haz clic en una celda y usa los botones para simular anotaciones</p>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LINEUP SIMULADO */}
            <div className="lg:col-span-2">
              <h3 className="text-lg font-bold mb-4 text-blue-300">📋 Lineup Interactivo</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-600">
                  <thead>
                    <tr className="bg-slate-700">
                      <th className="border border-slate-600 p-3 text-left w-12 text-white font-bold">#</th>
                      <th className="border border-slate-600 p-3 text-left min-w-[150px] text-white font-bold">JUGADOR</th>
                      <th className="border border-slate-600 p-3 text-center w-12 text-white font-bold">POS</th>
                      {[1, 2, 3, 4, 5].map(entrada => (
                        <th key={entrada} className="border border-slate-600 p-3 text-center w-16 text-white font-bold">
                          {entrada}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Jugador 1 */}
                    <tr className="hover:bg-slate-700/50">
                      <td className="border border-slate-600 p-3 text-center text-white font-bold">1</td>
                      <td className="border border-slate-600 p-3 text-blue-400 font-semibold">Pedro García</td>
                      <td className="border border-slate-600 p-3 text-center text-white">P</td>
                      {[0, 1, 2, 3, 4].map(index => (
                        <td key={index} className="border border-slate-600 p-2 text-center">
                          {renderDiamondCell(cellsData[index], index, selectedCell === index)}
                        </td>
                      ))}
                    </tr>

                    {/* Jugador 2 */}
                    <tr className="hover:bg-slate-700/50">
                      <td className="border border-slate-600 p-3 text-center text-white font-bold">2</td>
                      <td className="border border-slate-600 p-3 text-blue-400 font-semibold">Ana Martínez</td>
                      <td className="border border-slate-600 p-3 text-center text-white">C</td>
                      {[5, 6, 7, 8].map((index, i) => (
                        <td key={index} className="border border-slate-600 p-2 text-center">
                          {renderDiamondCell(cellsData[index], index, selectedCell === index)}
                        </td>
                      ))}
                      <td className="border border-slate-600 p-2 text-center">
                        <div className="w-12 h-12 flex items-center justify-center mx-auto bg-slate-500 rounded border-2 border-slate-400">
                          <div className="bg-slate-300 transform rotate-45 border border-slate-400" style={{ width: '35px', height: '35px' }}></div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Info del estado actual */}
              <div className="mt-4 bg-slate-700 rounded-lg p-4">
                <h4 className="text-md font-bold text-yellow-400 mb-3">📊 Estado Actual del Juego</h4>
                
                {/* Información de la celda */}
                <div className="mb-4 p-3 bg-slate-600 rounded">
                  <h5 className="text-sm font-bold text-blue-400 mb-2">📍 Celda Seleccionada: {selectedCell + 1}</h5>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Acción:</span>
                      <span className="text-white font-bold">{cellsData[selectedCell].action === 'empty' ? 'Ninguna' : cellsData[selectedCell].action}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Corredores en celda:</span>
                      <span className="text-green-400">
                        {cellsData[selectedCell].runners.first ? '1B ' : ''}
                        {cellsData[selectedCell].runners.second ? '2B ' : ''}
                        {cellsData[selectedCell].runners.third ? '3B ' : ''}
                        {!cellsData[selectedCell].runners.first && !cellsData[selectedCell].runners.second && !cellsData[selectedCell].runners.third ? 'Ninguno' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Estado del conteo */}
                <div className="mb-4 p-3 bg-slate-600 rounded">
                  <h5 className="text-sm font-bold text-red-400 mb-2">🎯 Conteo Actual</h5>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-red-400 font-bold text-lg">{gameState.strikes}</div>
                      <div className="text-xs text-slate-400">Strikes</div>
                    </div>
                    <div>
                      <div className="text-green-400 font-bold text-lg">{gameState.balls}</div>
                      <div className="text-xs text-slate-400">Bolas</div>
                    </div>
                    <div>
                      <div className="text-yellow-400 font-bold text-lg">{gameState.outs}</div>
                      <div className="text-xs text-slate-400">Outs</div>
                    </div>
                  </div>
                </div>

                {/* Estado global de corredores */}
                <div className="mb-4 p-3 bg-slate-600 rounded">
                  <h5 className="text-sm font-bold text-blue-400 mb-2">🏃 Corredores en Campo (Global)</h5>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Primera Base:</span>
                      <span className="text-green-400 font-bold">
                        {globalRunners.first ? `Jugador ${globalRunners.first}` : 'Vacía'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Segunda Base:</span>
                      <span className="text-yellow-400 font-bold">
                        {globalRunners.second ? `Jugador ${globalRunners.second}` : 'Vacía'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tercera Base:</span>
                      <span className="text-purple-400 font-bold">
                        {globalRunners.third ? `Jugador ${globalRunners.third}` : 'Vacía'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Corredores en campo */}
                <div className="p-3 bg-slate-600 rounded">
                  <h5 className="text-sm font-bold text-green-400 mb-2">🏃 Corredores en Campo</h5>
                  <div className="flex items-center justify-center space-x-2">
                    {fieldRunners.first && <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold">1B</span>}
                    {fieldRunners.second && <span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-bold">2B</span>}
                    {fieldRunners.third && <span className="bg-purple-500 text-white px-2 py-1 rounded text-xs font-bold">3B</span>}
                    {fieldRunners.home && <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">HOME</span>}
                    {!fieldRunners.first && !fieldRunners.second && !fieldRunners.third && !fieldRunners.home && 
                      <span className="text-slate-400 text-sm">Bases limpias</span>
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* CONTROLES */}
            <div className="space-y-6">
              
              {/* ACCIONES RÁPIDAS */}
              <div className="bg-slate-700 rounded-lg p-4">
                <h4 className="text-lg font-bold text-green-400 mb-4">⚡ Acciones Rápidas</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleActionClick('H1')}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm font-bold transition-colors"
                  >
                    H1 - Sencillo
                  </button>
                  <button 
                    onClick={() => handleActionClick('H2')}
                    className="bg-orange-600 hover:bg-orange-700 text-white py-2 px-3 rounded text-sm font-bold transition-colors"
                  >
                    H2 - Doble
                  </button>
                  <button 
                    onClick={() => handleActionClick('H3')}
                    className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded text-sm font-bold transition-colors"
                  >
                    H3 - Triple
                  </button>
                  <button 
                    onClick={() => handleActionClick('HR')}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-3 rounded text-sm font-bold transition-colors"
                  >
                    HR - Jonrón
                  </button>
                  <button 
                    onClick={() => handleActionClick('C')}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-3 rounded text-sm font-bold transition-colors"
                  >
                    C - Carrera
                  </button>
                  <button 
                    onClick={() => handleActionClick('BB')}
                    className="bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded text-sm font-bold transition-colors"
                  >
                    BB - Base x Bola
                  </button>
                  <button 
                    onClick={() => handleActionClick('K')}
                    className="bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded text-sm font-bold transition-colors"
                  >
                    K - Ponche
                  </button>
                  <button 
                    onClick={() => handleActionClick('KB')}
                    className="bg-red-700 hover:bg-red-800 text-white py-2 px-3 rounded text-sm font-bold transition-colors"
                  >
                    KB - Ponche Mirando
                  </button>
                  <button 
                    onClick={() => handleActionClick('O')}
                    className="bg-red-700 hover:bg-red-800 text-white py-2 px-3 rounded text-sm font-bold transition-colors"
                  >
                    O - Out
                  </button>
                  <button 
                    onClick={() => handleActionClick('empty')}
                    className="bg-slate-600 hover:bg-slate-500 text-white py-2 px-3 rounded text-sm font-bold transition-colors"
                  >
                    ⌫ Limpiar
                  </button>
                </div>
                
                {/* Botón de Refresh General */}
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setCellsData(Array(9).fill(null).map(() => ({
                        action: 'empty' as Action,
                        runners: { first: false, second: false, third: false }
                      })));
                      setFieldRunners({ first: false, second: false, third: false, home: false });
                      setGameState({ strikes: 0, balls: 0, outs: 0 });
                      setGlobalRunners({ first: null, second: null, third: null });
                      setSelectedCell(0);
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded text-sm font-bold transition-colors"
                  >
                    🔄 REFRESH LINEUP COMPLETO
                  </button>
                </div>
              </div>

              {/* DIAMANTE DE CORREDORES */}
              <div className="bg-slate-700 rounded-lg p-4">
                <h4 className="text-lg font-bold text-green-400 mb-4">💎 Diamante de Corredores</h4>
                <div className="flex justify-center">
                  <div className="relative w-32 h-32">
                    
                    {/* Campo de béisbol */}
                    <svg width="128" height="128" className="absolute inset-0">
                      {/* Diamante principal */}
                      <polygon 
                        points="64,10 118,64 64,118 10,64" 
                        fill="rgba(34, 197, 94, 0.2)" 
                        stroke="rgba(34, 197, 94, 0.8)" 
                        strokeWidth="2"
                      />
                      {/* Líneas internas */}
                      <line x1="64" y1="64" x2="64" y2="10" stroke="#22c55e" strokeWidth="1"/>
                      <line x1="64" y1="64" x2="118" y2="64" stroke="#22c55e" strokeWidth="1"/>
                      <line x1="64" y1="64" x2="64" y2="118" stroke="#22c55e" strokeWidth="1"/>
                      <line x1="64" y1="64" x2="10" y2="64" stroke="#22c55e" strokeWidth="1"/>
                    </svg>

                    {/* Home Plate */}
                    <button
                      onClick={() => setFieldRunners(prev => ({ ...prev, home: !prev.home }))}
                      className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-6 rounded-full border-2 transition-all ${
                        fieldRunners.home 
                          ? 'bg-red-500 border-red-400 shadow-lg' 
                          : 'bg-slate-600 border-slate-500'
                      }`}
                      title="Home"
                    >
                      <span className="text-xs font-bold text-white">H</span>
                    </button>

                    {/* Primera Base */}
                    <button
                      onClick={() => setFieldRunners(prev => ({ ...prev, first: !prev.first }))}
                      className={`absolute right-0 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full border-2 transition-all ${
                        fieldRunners.first 
                          ? 'bg-blue-500 border-blue-400 shadow-lg' 
                          : 'bg-slate-600 border-slate-500'
                      }`}
                      title="Primera Base"
                    >
                      <span className="text-xs font-bold text-white">1</span>
                    </button>

                    {/* Segunda Base */}
                    <button
                      onClick={() => setFieldRunners(prev => ({ ...prev, second: !prev.second }))}
                      className={`absolute top-0 left-1/2 transform -translate-x-1/2 w-6 h-6 rounded-full border-2 transition-all ${
                        fieldRunners.second 
                          ? 'bg-yellow-500 border-yellow-400 shadow-lg' 
                          : 'bg-slate-600 border-slate-500'
                      }`}
                      title="Segunda Base"
                    >
                      <span className="text-xs font-bold text-white">2</span>
                    </button>

                    {/* Tercera Base */}
                    <button
                      onClick={() => setFieldRunners(prev => ({ ...prev, third: !prev.third }))}
                      className={`absolute left-0 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full border-2 transition-all ${
                        fieldRunners.third 
                          ? 'bg-purple-500 border-purple-400 shadow-lg' 
                          : 'bg-slate-600 border-slate-500'
                      }`}
                      title="Tercera Base"
                    >
                      <span className="text-xs font-bold text-white">3</span>
                    </button>

                  </div>
                </div>
                <div className="mt-3 text-xs text-center text-slate-300">
                  Haz clic en las bases para activar/desactivar corredores
                </div>
              </div>

              {/* CONTROL DE ESTADO DEL JUEGO */}
              <div className="bg-slate-700 rounded-lg p-4">
                <h4 className="text-lg font-bold text-red-400 mb-4">🎯 Estado del Juego</h4>
                
                {/* Strikes */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-semibold">Strikes</span>
                    <span className="text-red-400 font-bold text-lg">{gameState.strikes}</span>
                  </div>
                  <div className="flex space-x-2">
                    {[0, 1, 2].map(strike => (
                      <button
                        key={strike}
                        onClick={() => setGameState(prev => ({ ...prev, strikes: strike }))}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          strike <= gameState.strikes 
                            ? 'bg-red-500 border-red-400' 
                            : 'bg-slate-600 border-slate-500'
                        }`}
                      >
                        <span className="text-white text-xs font-bold">{strike}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Balls */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-semibold">Bolas</span>
                    <span className="text-green-400 font-bold text-lg">{gameState.balls}</span>
                  </div>
                  <div className="flex space-x-2">
                    {[0, 1, 2, 3].map(ball => (
                      <button
                        key={ball}
                        onClick={() => setGameState(prev => ({ ...prev, balls: ball }))}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          ball <= gameState.balls 
                            ? 'bg-green-500 border-green-400' 
                            : 'bg-slate-600 border-slate-500'
                        }`}
                      >
                        <span className="text-white text-xs font-bold">{ball}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Outs */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-semibold">Outs</span>
                    <span className="text-yellow-400 font-bold text-lg">{gameState.outs}</span>
                  </div>
                  <div className="flex space-x-2">
                    {[0, 1, 2].map(out => (
                      <button
                        key={out}
                        onClick={() => setGameState(prev => ({ ...prev, outs: out }))}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          out <= gameState.outs 
                            ? 'bg-yellow-500 border-yellow-400' 
                            : 'bg-slate-600 border-slate-500'
                        }`}
                      >
                        <span className="text-white text-xs font-bold">{out}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reset button */}
                <button
                  onClick={() => setGameState({ strikes: 0, balls: 0, outs: 0 })}
                  className="w-full bg-slate-600 hover:bg-slate-500 text-white py-2 px-3 rounded text-sm font-bold transition-colors"
                >
                  🔄 Reset Contador
                </button>
              </div>

              {/* CONTROL DE CORREDORES INDIVIDUAL */}
              <div className="bg-slate-700 rounded-lg p-4">
                <h4 className="text-lg font-bold text-green-400 mb-4">🏃 Control Individual de Corredores</h4>
                <div className="space-y-3">
                  
                  <div className="flex items-center justify-between">
                    <span className="text-white">Primera Base (1B)</span>
                    <button
                      onClick={() => handleRunnerToggle('first')}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        cellsData[selectedCell].runners.first 
                          ? 'bg-green-500' 
                          : 'bg-slate-500'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                        cellsData[selectedCell].runners.first 
                          ? 'translate-x-7' 
                          : 'translate-x-1'
                      }`}></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-white">Segunda Base (2B)</span>
                    <button
                      onClick={() => handleRunnerToggle('second')}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        cellsData[selectedCell].runners.second 
                          ? 'bg-green-500' 
                          : 'bg-slate-500'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                        cellsData[selectedCell].runners.second 
                          ? 'translate-x-7' 
                          : 'translate-x-1'
                      }`}></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-white">Tercera Base (3B)</span>
                    <button
                      onClick={() => handleRunnerToggle('third')}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        cellsData[selectedCell].runners.third 
                          ? 'bg-green-500' 
                          : 'bg-slate-500'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                        cellsData[selectedCell].runners.third 
                          ? 'translate-x-7' 
                          : 'translate-x-1'
                      }`}></div>
                    </button>
                  </div>

                  <div className="mt-4 p-2 bg-slate-600 rounded text-xs text-slate-300">
                    💡 Los puntos verdes en las esquinas del diamante indican corredores en bases
                  </div>
                </div>
              </div>

              {/* BOTÓN PARA IMPLEMENTAR */}
              <div className="bg-yellow-600 rounded-lg p-4 text-center">
                <h4 className="text-lg font-bold text-yellow-900 mb-2">✨ ¿Te gusta el diseño?</h4>
                <p className="text-yellow-900 text-sm mb-3">Prueba diferentes combinaciones y cuando estés listo, implementamos este diseño en la interfaz real del anotador.</p>
                <div className="text-yellow-800 text-xs">
                  📋 Diamante: 35px x 35px<br/>
                  🎯 Líneas: Negro 2px<br/>
                  🟢 Corredores: Puntos verdes
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* INFORMACIÓN DE COLORES */}
        <div className="bg-slate-800 rounded-lg p-6 mt-8">
          <h2 className="text-xl font-bold mb-4 text-blue-400">📋 Información de Colores</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="bg-slate-700 p-3 rounded">
              <div className="w-8 h-8 bg-slate-300 mb-2 rounded"></div>
              <p className="text-xs text-white">Diamante Base</p>
              <p className="text-xs text-slate-400">#e2e8f0</p>
            </div>

            <div className="bg-slate-700 p-3 rounded">
              <div className="w-8 h-8 bg-black mb-2 rounded"></div>
              <p className="text-xs text-white">Líneas Trayectoria</p>
              <p className="text-xs text-slate-400">#000000</p>
            </div>

            <div className="bg-slate-700 p-3 rounded">
              <div className="w-8 h-8 bg-blue-500 mb-2 rounded"></div>
              <p className="text-xs text-white">Cuadro Activo</p>
              <p className="text-xs text-slate-400">#3b82f6</p>
            </div>

            <div className="bg-slate-700 p-3 rounded">
              <div className="w-8 h-8 bg-slate-500 mb-2 rounded"></div>
              <p className="text-xs text-white">Cuadro Vacío</p>
              <p className="text-xs text-slate-400">#6b7280</p>
            </div>

          </div>
        </div>

      </div>

      {/* MENÚ CONTEXTUAL */}
      {contextMenu.show && (
        <div
          data-context-menu
          className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-2 min-w-[150px]"
          style={{ 
            left: Math.min(contextMenu.x, window.innerWidth - 160),
            top: Math.min(contextMenu.y, window.innerHeight - 120)
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-xs text-slate-400 border-b border-slate-600 mb-1">
            Celda {contextMenu.cellIndex + 1}
          </div>
          
          <button
            onClick={() => handleContextMenuAction('edit')}
            className="w-full text-left px-3 py-2 hover:bg-slate-700 transition-colors text-sm text-green-400"
          >
            ✏️ Editar/Seleccionar
          </button>
          
          <button
            onClick={() => handleContextMenuAction('delete')}
            className="w-full text-left px-3 py-2 hover:bg-slate-700 transition-colors text-sm text-red-400"
          >
            🗑️ Borrar
          </button>
          
          <button
            onClick={() => handleContextMenuAction('stats')}
            className="w-full text-left px-3 py-2 hover:bg-slate-700 transition-colors text-sm text-blue-400"
          >
            📊 Ver Estadísticas
          </button>
        </div>
      )}
    </div>
  );
}