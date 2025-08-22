# Estado de Reestructuración de Base de Datos

## ✅ Completado

### 1. **Análisis y Planificación**
- ✅ Identificación de problemas con estructura actual
- ✅ Diseño de nueva arquitectura de base de datos
- ✅ Plan de migración y reestructuración

### 2. **Actualización de APIs**
- ✅ `/api/jugador/profile/route.ts` - Actualizado para usar ID directo
- ✅ `/api/jugador/registro/route.ts` - Actualizado para nueva estructura
- ✅ `/api/admin/jugadores/route.ts` - Corregido referencias antigas
- ✅ `/api/admin/anotadores/route.ts` - Actualizado para dual-table pattern
- ✅ `/api/profile/route.ts` - Removido campos obsoletos
- ✅ `/api/jugador/estadisticas/detalladas/route.ts` - Corregido usuario_id → jugador_id

### 3. **Actualización de Interfaces TypeScript**
- ✅ `src/types/beisbol.ts` - Usuario interface simplificada
- ✅ `src/hooks/useJugadorProfile.ts` - Actualizado para nueva estructura
- ✅ Interfaces para Administrador y Anotador añadidas

### 4. **Scripts de Migración**
- ✅ `scripts/clean-and-restructure-db.js` - Script principal de reestructuración
- ✅ `scripts/verify-database-structure.js` - Verificación de estructura
- ✅ `scripts/create-administradores-sql.sql` - SQL para crear tabla administradores
- ✅ `scripts/test-new-structure.js` - Pruebas de nueva estructura
- ✅ `scripts/insert-test-data.js` - Datos de prueba

## ⚠️ Pendiente de Completar

### 1. **Limpieza Final de Tabla Usuarios**
**Acción requerida**: Ejecutar `scripts/clean-usuarios-table.sql` en Supabase Dashboard

**Problema actual**: La tabla `usuarios` todavía contiene campos obsoletos:
- `telefono`, `foto_url`, `numero_casaca`, `equipo_id`, `posicion`, `ultimo_login`, `updated_at`

**Estructura objetivo para `usuarios`**:
```sql
usuarios (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  nombre TEXT NOT NULL,
  role TEXT NOT NULL,
  liga_id UUID REFERENCES ligas(id),
  created_at TIMESTAMP,
  activo BOOLEAN DEFAULT true
)
```

### 2. **Verificación Final**
Después de ejecutar el SQL de limpieza:
```bash
node scripts/verify-database-structure.js
node scripts/insert-test-data.js
```

## 📊 Nueva Arquitectura Implementada

### **Tabla Central: `usuarios`**
- **Propósito**: Autenticación y datos básicos únicamente
- **Campos**: `id`, `email`, `nombre`, `role`, `liga_id`, `created_at`, `activo`
- **Relación**: Mismo UUID usado como PK en tablas específicas

### **Tablas Específicas por Rol**
1. **`administradores`**: Datos específicos de administradores de liga
2. **`anotadores`**: Datos específicos de anotadores (código_acceso, etc.)
3. **`jugadores`**: Datos específicos de jugadores (equipo, posición, etc.)

### **Flujo de Datos**
- **Registro**: Se crea en `usuarios` + tabla específica del rol
- **Autenticación**: Se consulta `usuarios` para login
- **Datos específicos**: Se consultan de tabla correspondiente usando mismo ID

## 🔧 APIs Actualizados

### **Patrón de Consulta Actualizado**
**Antes** (con usuario_id):
```javascript
.eq('usuario_id', session.user.id)
```

**Ahora** (ID directo):
```javascript
.eq('id', session.user.id)
```

### **Creación de Usuarios (Dual-Table Pattern)**
1. Crear usuario en `auth.users` (si necesario)
2. Insertar en tabla `usuarios` con datos básicos
3. Insertar en tabla específica (`jugadores`, `anotadores`, `administradores`)

## 🎯 Próximos Pasos

1. **Ejecutar** `scripts/clean-usuarios-table.sql` en Supabase
2. **Verificar** estructura con scripts de validación
3. **Probar** funcionamiento end-to-end con datos de prueba
4. **Validar** que todas las rutas y formularios funcionen correctamente

## 💡 Beneficios de la Nueva Estructura

- ✅ **Separación clara** entre autenticación y datos específicos
- ✅ **Eliminación de conflictos** de datos entre diferentes fuentes
- ✅ **Consistencia** en todos los APIs y interfaces
- ✅ **Escalabilidad** para agregar nuevos roles
- ✅ **Mantenibilidad** mejorada del código