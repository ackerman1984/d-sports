import { z } from 'zod';

// Schema para validar equipos
export const teamSchema = z.object({
  nombre: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El nombre solo puede contener letras y espacios'),
  
  color: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'El color debe ser un código hexadecimal válido (ej: #FF0000)'),
  
  logo_url: z.string()
    .url('La URL del logo debe ser válida')
    .optional()
    .or(z.literal('')),
  
  liga_id: z.string().uuid('ID de liga inválido')
});

// Schema para validar jugadores
export const playerSchema = z.object({
  nombre: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El nombre solo puede contener letras y espacios'),
  
  numero_casaca: z.number()
    .int('El número debe ser un entero')
    .min(1, 'El número debe ser mayor a 0')
    .max(99, 'El número no puede ser mayor a 99'),
  
  posicion: z.string()
    .max(50, 'La posición no puede exceder 50 caracteres')
    .optional(),
  
  foto_url: z.string()
    .url('La URL de la foto debe ser válida')
    .optional()
    .or(z.literal('')),
  
  equipo_id: z.string().uuid('ID de equipo inválido'),
  
  usuario_id: z.string().uuid('ID de usuario inválido').optional()
});

// Schema para validar ligas
export const leagueSchema = z.object({
  nombre: z.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  
  codigo: z.string()
    .min(3, 'El código debe tener al menos 3 caracteres')
    .max(20, 'El código no puede exceder 20 caracteres')
    .regex(/^[A-Z0-9-_]+$/, 'El código solo puede contener letras mayúsculas, números, guiones y guiones bajos')
    .transform(val => val.toUpperCase()),
  
  subdominio: z.string()
    .min(3, 'El subdominio debe tener al menos 3 caracteres')
    .max(50, 'El subdominio no puede exceder 50 caracteres')
    .regex(/^[a-z0-9-]+$/, 'El subdominio solo puede contener letras minúsculas, números y guiones')
    .transform(val => val.toLowerCase())
});

// Schema para validar usuarios
export const userSchema = z.object({
  nombre: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  
  email: z.string()
    .email('El email debe ser válido')
    .max(255, 'El email no puede exceder 255 caracteres')
    .transform(val => val.toLowerCase()),
  
  telefono: z.string()
    .regex(/^\+?[\d\s-()]{10,15}$/, 'El teléfono debe tener entre 10 y 15 dígitos')
    .optional()
    .or(z.literal('')),
  
  role: z.enum(['admin', 'anotador', 'jugador'], {
    message: 'El rol debe ser admin, anotador o jugador'
  }),
  
  password: z.string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(50, 'La contraseña no puede exceder 50 caracteres'),
  
  liga_id: z.string().uuid('ID de liga inválido')
});

// Función para validar y mostrar errores amigables
export function validateWithFriendlyErrors<T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.issues.map(err => {
    if (err.path.length > 0) {
      return `${err.path.join('.')}: ${err.message}`;
    }
    return err.message;
  });
  
  return { success: false, errors };
}

// Tipos derivados de los schemas
export type TeamFormData = z.infer<typeof teamSchema>;
export type PlayerFormData = z.infer<typeof playerSchema>;
export type LeagueFormData = z.infer<typeof leagueSchema>;
export type UserFormData = z.infer<typeof userSchema>;