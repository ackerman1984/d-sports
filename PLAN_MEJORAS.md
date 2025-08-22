# Plan de Mejoras - Baseball SaaS

## 🎯 Objetivos
1. ✅ Corregir error "duplicate key" en creación de liga/admin
2. 📸 Implementar sistema de cámara/subida de fotos 
3. ⚡ Mejorar flujo de selección de liga obligatoria
4. ⚾ Implementar gestión completa de equipos
5. 📝 Mejorar sistema de acceso para anotadores
6. 🎨 Mejorar interfaces por rol

## 📋 Fases de Implementación

### FASE 1: Sistema de Fotos 📸
**Prioridad: Alta**

#### 1.1 Instalar librerías necesarias
```bash
npm install react-image-crop html2canvas @types/html2canvas
npm install lucide-react  # Para iconos de cámara/upload
```

#### 1.2 Crear componente de subida de fotos
- `/src/components/ui/PhotoUpload.tsx`
- Soporte para cámara web
- Soporte para subida de archivos
- Cropping de imágenes
- Previsualización

#### 1.3 Integrar en formularios existentes
- AdminRegistrationForm (paso 1)
- JugadorRegistrationForm 
- ProfileManagement (jugadores)
- Sistema de anotadores

---

### FASE 2: Selección Obligatoria de Liga ⚡
**Prioridad: Alta**

#### 2.1 Modificar flujo de login
- Agregar selector de liga antes del login
- Validar que la liga esté activa
- Persistir selección en session

#### 2.2 Actualizar middleware
- Verificar liga seleccionada
- Redirigir si no hay liga válida

---

### FASE 3: Gestión de Equipos ⚾
**Prioridad: Media**

#### 3.1 Dashboard de Admin - Gestión de Equipos
- CRUD completo de equipos
- Asignación de colores
- Activar/desactivar equipos

#### 3.2 Vincular con registro de jugadores
- Solo mostrar equipos de la liga seleccionada
- Validar disponibilidad de números de casaca

---

### FASE 4: Sistema de Anotadores 📝
**Prioridad: Media**

#### 4.1 Gestión desde Admin
- Crear cuentas de anotadores
- Asignar credenciales temporales
- Gestionar permisos

#### 4.2 Perfil de Anotador
- Cambiar credenciales
- Subir foto de perfil
- Editar información personal

---

### FASE 5: Mejoras de UI/UX 🎨
**Prioridad: Baja**

#### Por interfaz:
1. **Super Admin**: Dashboard mejorado con estadísticas
2. **Admin**: Gestión completa de liga y equipos
3. **Jugador**: Perfil con foto y estadísticas
4. **Anotador**: Interface de anotación optimizada

---

## 🚀 Empezar con FASE 1

¿Quieres que empecemos con la **FASE 1 - Sistema de Fotos**?

Esto incluye:
1. Instalar las librerías necesarias
2. Crear el componente PhotoUpload
3. Integrarlo en el formulario de admin

Una vez completada la Fase 1, podemos continuar con las siguientes fases de forma ordenada.