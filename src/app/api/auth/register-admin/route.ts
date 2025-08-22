import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin-client';

interface AdminData {
  email: string;
  password: string;
  nombre: string;
  telefono?: string;
}

interface LigaData {
  nombre: string;
  equipos: string[];
  temporadaNombre: string;
  fechaInicio: string;
  fechaFin: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { admin, liga }: { admin: AdminData; liga: LigaData } = body;

    // Validaciones básicas
    if (!admin.email || !admin.password || !admin.nombre) {
      return NextResponse.json(
        { error: 'Faltan datos del administrador' },
        { status: 400 }
      );
    }

    if (!liga.nombre) {
      return NextResponse.json(
        { error: 'El nombre de la liga es obligatorio' },
        { status: 400 }
      );
    }

    if (liga.equipos.filter(e => e.trim()).length < 2) {
      return NextResponse.json(
        { error: 'Se requieren al menos 2 equipos' },
        { status: 400 }
      );
    }

    // Usar cliente admin que bypasea RLS para creación inicial
    const supabase = createAdminClient();

    // Generar código y subdominio automáticamente
    const codigo = generateCodigo(liga.nombre);
    const subdominio = generateSubdomain(liga.nombre);

    // Verificar que el código y subdominio no existan (si se generan duplicados, agregar número)
    let finalCodigo = codigo;
    let finalSubdominio = subdominio;
    let counter = 1;

    while (true) {
      const { data: existingLiga } = await supabase
        .from('ligas')
        .select('id')
        .or(`codigo.eq.${finalCodigo},subdominio.eq.${finalSubdominio}`)
        .single();

      if (!existingLiga) break;

      counter++;
      finalCodigo = `${codigo}${counter}`;
      finalSubdominio = `${subdominio}-${counter}`;
    }

    // 1. Crear usuario administrador en Supabase Auth
    console.log('Creating auth user for:', admin.email);
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: admin.email,
      password: admin.password,
      email_confirm: true,
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      return NextResponse.json({ 
        error: `Auth error: ${authError.message}` 
      }, { status: 400 });
    }

    if (!authData.user) {
      console.error('Auth user data is null');
      return NextResponse.json({ 
        error: 'No user data returned from auth service' 
      }, { status: 400 });
    }

    console.log('Auth user created successfully:', authData.user.id);

    try {
      // 2. Crear la liga
      console.log('Creating liga:', liga.nombre, 'with codigo:', finalCodigo);
      const { data: nuevaLiga, error: ligaError } = await supabase
        .from('ligas')
        .insert({
          nombre: liga.nombre,
          codigo: finalCodigo,
          subdominio: finalSubdominio,
          activa: true,
        })
        .select()
        .single();

      if (ligaError) {
        console.error('Liga creation error:', ligaError);
        // Si falla, eliminar el usuario de auth
        await supabase.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json({ 
          error: `Liga creation error: ${ligaError.message}` 
        }, { status: 400 });
      }

      console.log('Liga created successfully:', nuevaLiga.id);

      // 3. Crear perfil del administrador
      console.log('Creating user profile for:', admin.email, 'with liga_id:', nuevaLiga.id);
      const { error: perfilError } = await supabase
        .from('usuarios')
        .upsert({
          id: authData.user.id,
          email: admin.email,
          nombre: admin.nombre,
          role: 'admin',
          liga_id: nuevaLiga.id,
          activo: true,
        });

      if (perfilError) {
        console.error('User profile creation error:', perfilError);
        // Si falla, limpiar todo
        await supabase.auth.admin.deleteUser(authData.user.id);
        await supabase.from('ligas').delete().eq('id', nuevaLiga.id);
        return NextResponse.json({ 
          error: `User profile error: ${perfilError.message}` 
        }, { status: 400 });
      }

      console.log('User profile created successfully');

      // 3.5. Crear perfil específico de administrador
      console.log('Creating admin profile for:', admin.email);
      const { error: adminProfileError } = await supabase
        .from('administradores')
        .insert({
          id: authData.user.id,
          nombre: admin.nombre,
          email: admin.email,
          activo: true,
          liga_id: nuevaLiga.id,
        });

      if (adminProfileError) {
        console.error('Admin profile creation error:', adminProfileError);
        // Si falla, limpiar todo
        await supabase.auth.admin.deleteUser(authData.user.id);
        await supabase.from('usuarios').delete().eq('id', authData.user.id);
        await supabase.from('ligas').delete().eq('id', nuevaLiga.id);
        return NextResponse.json({ 
          error: `Admin profile error: ${adminProfileError.message}` 
        }, { status: 400 });
      }

      console.log('Admin profile created successfully');

      // 4. Crear equipos
      const equiposData = liga.equipos
        .filter((nombre: string) => nombre.trim())
        .map((nombre: string) => ({
          liga_id: nuevaLiga.id,
          nombre: nombre.trim(),
          color: getRandomColor(),
          activo: true,
        }));

      const { error: equiposError } = await supabase
        .from('equipos')
        .insert(equiposData);

      if (equiposError) {
        console.error('Error creating teams:', equiposError);
        // No es crítico, continuamos
      }

      // 5. Crear configuración de temporada inicial (sistema avanzado)
      const { error: temporadaError } = await supabase
        .from('configuracion_temporada')
        .insert({
          liga_id: nuevaLiga.id,
          nombre: liga.temporadaNombre || 'Temporada Inicial',
          fecha_inicio: liga.fechaInicio,
          fecha_fin: liga.fechaFin,
          estado: 'configuracion',
          max_juegos_por_sabado: 5,
          vueltas_programadas: 2,
          auto_generar: true,
        });

      if (temporadaError) {
        console.error('Error creating season configuration:', temporadaError);
        // No es crítico, continuamos
      }

      // 6. Ya NO registramos automáticamente en super_admins
      // Los administradores regulares usan su propio sistema de autenticación
      console.log('Admin creado exitosamente sin registro en super_admins');

      return NextResponse.json(
        {
          message: 'Liga y administrador creados exitosamente',
          liga: {
            id: nuevaLiga.id,
            nombre: nuevaLiga.nombre,
            codigo: finalCodigo,
            subdominio: finalSubdominio,
          },
          admin: {
            id: authData.user.id,
            email: admin.email,
            nombre: admin.nombre,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      // Si algo falla, limpiar el usuario de auth
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw error;
    }
  } catch (error) {
    console.error('Admin registration error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Función para generar colores aleatorios para equipos
function getRandomColor(): string {
  const colors = [
    '#FF6B35', '#004225', '#0077BE', '#C8102E', '#FF8C00',
    '#006400', '#800080', '#FFD700', '#DC143C', '#228B22',
    '#4169E1', '#FF1493', '#32CD32', '#FF4500', '#9370DB'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Función para generar código de liga
function generateCodigo(nombre: string): string {
  return nombre
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 10);
}

// Función para generar subdominio
function generateSubdomain(nombre: string): string {
  return nombre
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}