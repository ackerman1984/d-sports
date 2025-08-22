import { gql } from '@apollo/client';

// ==================== QUERIES DE LIGAS ====================

export const GET_LIGAS = gql`
  query GetLigas {
    ligas(where: { activa: { _eq: true } }) {
      id
      nombre
      codigo
      subdominio
      activa
      created_at
      updated_at
    }
  }
`;

export const GET_LIGA_BY_ID = gql`
  query GetLigaById($id: uuid!) {
    ligas_by_pk(id: $id) {
      id
      nombre
      codigo
      subdominio
      activa
      equipos(where: { activo: { _eq: true } }) {
        id
        nombre
        color
        logo_url
        jugadores_aggregate {
          aggregate {
            count
          }
        }
      }
      temporadas(order_by: { created_at: desc }) {
        id
        nombre
        fecha_inicio
        fecha_fin
        activa
      }
    }
  }
`;

export const GET_LIGA_BY_SUBDOMINIO = gql`
  query GetLigaBySubdominio($subdominio: String!) {
    ligas(where: { subdominio: { _eq: $subdominio } }) {
      id
      nombre
      codigo
      subdominio
      activa
    }
  }
`;

// ==================== QUERIES DE EQUIPOS ====================

export const GET_EQUIPOS_BY_LIGA = gql`
  query GetEquiposByLiga($liga_id: uuid!) {
    equipos(
      where: { liga_id: { _eq: $liga_id }, activo: { _eq: true } }
      order_by: { nombre: asc }
    ) {
      id
      nombre
      color
      logo_url
      activo
      jugadores_aggregate {
        aggregate {
          count
        }
      }
      juegos_local_aggregate {
        aggregate {
          count(columns: id)
        }
      }
      juegos_visitante_aggregate {
        aggregate {
          count(columns: id)
        }
      }
    }
  }
`;

export const GET_EQUIPO_DETALLE = gql`
  query GetEquipoDetalle($id: uuid!) {
    equipos_by_pk(id: $id) {
      id
      nombre
      color
      logo_url
      activo
      liga {
        id
        nombre
      }
      jugadores(where: { activo: { _eq: true } }, order_by: { numero_casaca: asc }) {
        id
        nombre
        numero_casaca
        posicion
        foto_url
        activo
        usuario {
          id
          nombre
          email
        }
      }
    }
  }
`;

// ==================== QUERIES DE JUGADORES ====================

export const GET_JUGADORES_BY_EQUIPO = gql`
  query GetJugadoresByEquipo($equipo_id: uuid!) {
    jugadores(
      where: { equipo_id: { _eq: $equipo_id }, activo: { _eq: true } }
      order_by: { numero_casaca: asc }
    ) {
      id
      nombre
      numero_casaca
      posicion
      foto_url
      activo
      usuario {
        id
        nombre
        email
        telefono
      }
    }
  }
`;

export const GET_JUGADOR_ESTADISTICAS = gql`
  query GetJugadorEstadisticas($jugador_id: uuid!, $temporada_id: uuid) {
    jugadores_by_pk(id: $jugador_id) {
      id
      nombre
      numero_casaca
      posicion
      foto_url
      equipo {
        id
        nombre
        color
      }
    }
    
    estadisticas_jugadores(
      where: { 
        jugador_id: { _eq: $jugador_id }
        juego: { temporada_id: { _eq: $temporada_id } }
      }
    ) {
      id
      turnos
      hits
      carreras
      impulsadas
      home_runs
      bases_robadas
      ponches
      base_por_bolas
      errores
      juego {
        id
        fecha
        estado
        equipo_local {
          nombre
        }
        equipo_visitante {
          nombre
        }
      }
    }
  }
`;

// ==================== QUERIES DE JUEGOS ====================

export const GET_JUEGOS_BY_TEMPORADA = gql`
  query GetJuegosByTemporada($temporada_id: uuid!) {
    juegos(
      where: { temporada_id: { _eq: $temporada_id } }
      order_by: { fecha: asc }
    ) {
      id
      fecha
      estado
      marcador_local
      marcador_visitante
      equipo_local {
        id
        nombre
        color
      }
      equipo_visitante {
        id
        nombre
        color
      }
    }
  }
`;

export const GET_JUEGO_DETALLE = gql`
  query GetJuegoDetalle($id: uuid!) {
    juegos_by_pk(id: $id) {
      id
      fecha
      estado
      marcador_local
      marcador_visitante
      temporada {
        id
        nombre
        liga {
          id
          nombre
        }
      }
      equipo_local {
        id
        nombre
        color
        logo_url
      }
      equipo_visitante {
        id
        nombre
        color
        logo_url
      }
      estadisticas_jugadores {
        id
        turnos
        hits
        carreras
        impulsadas
        home_runs
        bases_robadas
        ponches
        base_por_bolas
        errores
        jugador {
          id
          nombre
          numero_casaca
          posicion
          equipo {
            id
            nombre
          }
        }
      }
    }
  }
`;

// ==================== QUERIES DE TEMPORADAS ====================

export const GET_TEMPORADAS_BY_LIGA = gql`
  query GetTemporadasByLiga($liga_id: uuid!) {
    temporadas(
      where: { liga_id: { _eq: $liga_id } }
      order_by: { created_at: desc }
    ) {
      id
      nombre
      fecha_inicio
      fecha_fin
      activa
      juegos_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

export const GET_TEMPORADA_ACTIVA = gql`
  query GetTemporadaActiva($liga_id: uuid!) {
    temporadas(
      where: { liga_id: { _eq: $liga_id }, activa: { _eq: true } }
      limit: 1
    ) {
      id
      nombre
      fecha_inicio
      fecha_fin
      activa
    }
  }
`;

// ==================== QUERIES DE USUARIOS ====================

export const GET_USUARIO_BY_ID = gql`
  query GetUsuarioById($id: uuid!) {
    usuarios_by_pk(id: $id) {
      id
      email
      nombre
      telefono
      role
      liga {
        id
        nombre
        subdominio
      }
      jugador {
        id
        nombre
        numero_casaca
        posicion
        foto_url
        equipo {
          id
          nombre
          color
        }
      }
    }
  }
`;

// ==================== ESTADÍSTICAS AGREGADAS ====================

export const GET_TOP_BATEADORES = gql`
  query GetTopBateadores($temporada_id: uuid!, $limit: Int = 25) {
    estadisticas_agregadas: estadisticas_jugadores(
      where: { 
        juego: { temporada_id: { _eq: $temporada_id } }
        turnos: { _gt: 0 }
      }
    ) {
      jugador {
        id
        nombre
        numero_casaca
        posicion
        equipo {
          nombre
          color
        }
      }
      turnos_aggregate: turnos
      hits_aggregate: hits
      carreras_aggregate: carreras
      impulsadas_aggregate: impulsadas
      home_runs_aggregate: home_runs
    }
  }
`;

// ==================== MUTATIONS ====================

export const CREATE_LIGA = gql`
  mutation CreateLiga($input: ligas_insert_input!) {
    insert_ligas_one(object: $input) {
      id
      nombre
      codigo
      subdominio
      activa
    }
  }
`;

export const CREATE_EQUIPO = gql`
  mutation CreateEquipo($input: equipos_insert_input!) {
    insert_equipos_one(object: $input) {
      id
      nombre
      color
      logo_url
      liga_id
    }
  }
`;

export const CREATE_JUGADOR = gql`
  mutation CreateJugador($input: jugadores_insert_input!) {
    insert_jugadores_one(object: $input) {
      id
      nombre
      numero_casaca
      posicion
      foto_url
      equipo_id
      usuario_id
    }
  }
`;

export const CREATE_JUEGO = gql`
  mutation CreateJuego($input: juegos_insert_input!) {
    insert_juegos_one(object: $input) {
      id
      fecha
      estado
      temporada_id
      equipo_local_id
      equipo_visitante_id
    }
  }
`;

export const UPDATE_ESTADISTICAS_JUGADOR = gql`
  mutation UpdateEstadisticasJugador($juego_id: uuid!, $jugador_id: uuid!, $estadisticas: estadisticas_jugadores_set_input!) {
    insert_estadisticas_jugadores_one(
      object: {
        juego_id: $juego_id
        jugador_id: $jugador_id
        turnos: $estadisticas.turnos
        hits: $estadisticas.hits
        carreras: $estadisticas.carreras
        impulsadas: $estadisticas.impulsadas
        home_runs: $estadisticas.home_runs
        bases_robadas: $estadisticas.bases_robadas
        ponches: $estadisticas.ponches
        base_por_bolas: $estadisticas.base_por_bolas
        errores: $estadisticas.errores
      }
      on_conflict: {
        constraint: estadisticas_jugadores_jugador_id_juego_id_key
        update_columns: [turnos, hits, carreras, impulsadas, home_runs, bases_robadas, ponches, base_por_bolas, errores]
      }
    ) {
      id
      jugador {
        nombre
        numero_casaca
      }
    }
  }
`;

export const UPDATE_MARCADOR_JUEGO = gql`
  mutation UpdateMarcadorJuego($id: uuid!, $marcador_local: Int!, $marcador_visitante: Int!, $estado: String!) {
    update_juegos_by_pk(
      pk_columns: { id: $id }
      _set: {
        marcador_local: $marcador_local
        marcador_visitante: $marcador_visitante
        estado: $estado
      }
    ) {
      id
      marcador_local
      marcador_visitante
      estado
    }
  }
`;

// ==================== SUBSCRIPTIONS ====================

export const SUBSCRIBE_JUEGO_LIVE = gql`
  subscription SubscribeJuegoLive($id: uuid!) {
    juegos_by_pk(id: $id) {
      id
      fecha
      estado
      marcador_local
      marcador_visitante
      equipo_local {
        nombre
        color
      }
      equipo_visitante {
        nombre
        color
      }
    }
  }
`;