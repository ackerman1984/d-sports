# ⚾ Baseball SaaS - Sistema de Registro Completo

## ✅ Sistema Implementado - FUNCIONAL 100%

### 🎯 Flujo de Registro Perfecto:
**1. 👑 ADMIN se registra PRIMERO** → Crea liga con equipos y temporadas
**2. ⚾ JUGADORES se registran** → Seleccionan liga existente y equipo
**3. 📊 ANOTADORES se registran** → Seleccionan liga para anotar juegos

## 🚀 Configuración Rápida

### 1. Variables de Entorno
Copia `.env.example` a `.env.local` y configura:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# NextAuth Configuration  
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your_nextauth_secret_here
```

### 2. Base de Datos Supabase

**Ejecutar migraciones EN ORDEN:**
1. Ve a tu panel de Supabase → SQL Editor → New Query
2. **Migración 1:** Ejecuta `src/lib/supabase/migrations/001_initial_schema.sql`
3. **Migración 2:** Ejecuta `src/lib/supabase/migrations/002_enhanced_user_roles.sql`
4. **Migración 3:** Ejecuta `src/lib/supabase/migrations/003_optional_fields_update.sql`

### 3. ¡Listo para Usar!
```bash
npm run dev
# Servidor en http://localhost:3001
```

## 🎯 Funcionalidades Implementadas

### 🔐 Sistema de Autenticación
- ✅ Registro real en Supabase
- ✅ Login con roles
- ✅ Middleware de protección de rutas
- ✅ Redirección automática por rol

### 👑 Admin Dashboard (`/admin/dashboard`)
- ✅ Crear usuarios (jugadores y anotadores)
- ✅ Gestionar equipos y ligas
- ✅ Ver estadísticas generales
- ✅ Asignar anotadores a juegos

### ⚾ Jugador Dashboard (`/jugador/dashboard`)
- ✅ Editar perfil personal
- ✅ Subir foto de perfil
- ✅ Cambiar número de camiseta
- ✅ Ver información del equipo

### 📊 Anotador Dashboard (`/anotador/dashboard`)
- ✅ Ver juegos asignados
- ✅ Registrar estadísticas en tiempo real
- ✅ Controlar estado de juegos (iniciar/finalizar)
- ✅ Guardar datos de partidos

## 🌐 Rutas Principales

```
/ → Landing page con redirección automática
/login → Inicio de sesión
/registro → Registro de jugadores y anotadores

# Dashboards por rol:
/admin/dashboard → Panel de administración
/jugador/dashboard → Panel de jugador  
/anotador/dashboard → Panel de anotador
```

## 📋 APIs Implementadas

```
POST /api/auth/register → Registro de usuarios
POST /api/admin/users → Admin crea usuarios
GET /api/admin/users → Listar usuarios por liga
GET /api/profile → Obtener perfil del usuario
PUT /api/profile → Actualizar perfil
GET /api/ligas → Listar ligas activas
GET /api/equipos → Listar equipos por liga
GET /api/juegos/[id]/stats → Estadísticas de juego
POST /api/juegos/[id]/stats → Guardar estadísticas
PUT /api/juegos/[id] → Actualizar juego
POST /api/seed → Crear datos de prueba (dev)
```

## 🎮 Cómo Probar el Flujo Completo

### Paso 1: Registro de Administrador
```
1. Ve a http://localhost:3001/registro
2. Selecciona "👑 Admin"
3. Completa datos personales (Paso 1)
4. Completa información de liga (Paso 2):
   - Nombre: "Liga Regional 2024"
   - Equipos: "Tigres", "Leones", "Águilas" (mínimo 2)
   - Temporada: "Temporada 2024" con fechas
5. ¡LIGA CREADA! → Login automático al dashboard
```

### Paso 2: Registro de Jugadores
```
1. Abre nueva ventana → http://localhost:3001/registro
2. Selecciona "⚾ Jugador"
3. Elige "Liga Regional 2024" → Aparecen equipos automáticamente
4. Selecciona equipo "Tigres"
5. Completa: nombre, número camiseta, teléfono, email, contraseña
6. ¡REGISTRADO! → Login automático al dashboard de jugador
7. Foto se puede subir DESPUÉS desde su perfil
```

### Paso 3: Registro de Anotadores
```
1. Nueva ventana → http://localhost:3001/registro
2. Selecciona "📊 Anotador"
3. Elige "Liga Regional 2024"
4. Completa datos personales
5. ¡REGISTRADO! → Dashboard de anotador
```

### Características Especiales:
- 🚫 **Sin Liga = Sin Registro**: Jugadores/anotadores ven "No hay ligas disponibles"
- 🎨 **Código/Subdominio Automático**: Se genera desde el nombre de liga
- 📷 **Fotos Después**: Se suben desde el perfil, no en registro
- 🔄 **Auto-actualización**: Nuevos equipos aparecen inmediatamente

## 🔧 Arquitectura

### Base de Datos:
- `ligas` → Ligas de baseball
- `usuarios` → Usuarios con roles  
- `equipos` → Equipos por liga
- `jugadores` → Jugadores por equipo
- `juegos` → Partidos de baseball
- `estadisticas_jugador` → Stats por juego
- `anotador_juegos` → Asignación de anotadores

### Autenticación:
- NextAuth.js con Supabase Auth
- JWT tokens con información de rol y liga
- Middleware para protección de rutas
- Row Level Security (RLS) en Supabase

### Frontend:
- Next.js 15 con App Router
- TypeScript + Tailwind CSS
- Componentes por rol especializados
- Estado global con Zustand (si es necesario)

## 🐛 Resolución de Problemas

### Error 404 en /registro:
✅ **SOLUCIONADO**: Página creada en `src/app/registro/page.tsx`

### Error de autenticación:
- Verificar variables de entorno
- Confirmar que Supabase está configurado
- Ejecutar migraciones de base de datos

### Usuarios no se crean:
- Verificar SUPABASE_SERVICE_ROLE_KEY
- Confirmar permisos en Supabase
- Revistar RLS policies

### Redirección infinita:
- Verificar middleware configuration
- Confirmar roles en JWT token
- Limpiar cookies de navegador

## 📞 Estado del Sistema
✅ **FUNCIONANDO**: Registro, login, dashboards por rol, gestión de usuarios, estadísticas en tiempo real

¡El sistema está listo para usar! 🎉