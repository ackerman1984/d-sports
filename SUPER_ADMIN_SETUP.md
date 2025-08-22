# Super Admin Control System - Setup Guide

El sistema de control de super admin ha sido implementado exitosamente. Aquí están las instrucciones para activarlo:

## 🚀 Pasos de Activación

### 1. Aplicar la Migración de Base de Datos
```bash
npm run db:migrate
```

### 2. Configurar Variables de Entorno
Asegúrate de tener en tu `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

### 3. Acceder al Panel de Super Admin
- URL: `http://localhost:3000/super-admin`
- Email por defecto: `creator@baseball-saas.com`
- Código maestro por defecto: `MASTER-2024-BASEBALL`

### 4. Personalizar Credenciales (Recomendado)
Edita el archivo `src/lib/supabase/migrations/004_super_admin_control.sql` líneas 66-72:
```sql
INSERT INTO super_admins (email, name, master_code, active) 
VALUES (
  'tu_email@ejemplo.com', -- CAMBIAR POR TU EMAIL
  'Tu Nombre',
  'TU-CODIGO-SECRETO', -- CAMBIAR POR TU CÓDIGO MAESTRO
  true
) ON CONFLICT (email) DO NOTHING;
```

## 🛡️ Funcionalidades del Sistema

### Panel de Control
- **Resumen**: Estadísticas de ligas autorizadas, pendientes y suspendidas
- **Gestión de Ligas**: Autorizar/suspender/reactivar ligas
- **Registro de Acciones**: Historial completo de todas las acciones

### Control de Acceso
- **Autorización**: Solo ligas autorizadas pueden acceder a la app
- **Suspensión**: Suspender ligas temporalmente con razón
- **Reactivación**: Restaurar acceso a ligas suspendidas

### Protección de Rutas
- Los usuarios de ligas no autorizadas/suspendidas son redirigidos a `/access-denied`
- El middleware verifica automáticamente el estado de autorización
- El super admin tiene acceso completo sin restricciones

## ⚙️ Uso del Sistema

### Autorizar una Liga Nueva
1. Ve al panel de super admin
2. Busca la liga en "Gestión de Ligas"
3. Haz clic en "✅ Autorizar"
4. La liga ya puede acceder normalmente

### Suspender una Liga
1. Ve al panel de super admin
2. Encuentra la liga autorizada
3. Haz clic en "🚫 Suspender"
4. Proporciona una razón para la suspensión
5. Los usuarios verán la página de acceso denegado

### Reactivar una Liga
1. Ve al panel de super admin
2. Encuentra la liga suspendida
3. Haz clic en "🔄 Reactivar"
4. La liga recupera acceso inmediatamente

## 🔒 Seguridad

- **RLS (Row Level Security)**: Implementado en todas las tablas
- **Verificación de Middleware**: Cada request verifica autorización
- **Logs de Auditoría**: Todas las acciones quedan registradas
- **Acceso Restringido**: Solo super admins pueden controlar el sistema

## 📋 Estados de Liga

- **Pendiente** (amarillo): Liga creada pero no autorizada
- **Autorizada** (verde): Liga con acceso completo
- **Suspendida** (rojo): Liga temporalmente bloqueada

## 🚨 Notas Importantes

1. **Cambiar Credenciales**: Personaliza email y código maestro antes de producción
2. **Backup**: Respalda la base de datos antes de aplicar migraciones
3. **Logs**: Revisa regularmente el registro de acciones
4. **Testing**: Prueba el flujo completo antes de usar en producción

El sistema está listo para proteger tu aplicación y darte control total sobre qué ligas pueden acceder.