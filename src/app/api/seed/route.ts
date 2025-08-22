import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Solo permitir en desarrollo
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Only available in development' }, { status: 403 });
    }

    // 1. Crear liga de prueba
    const { data: liga, error: ligaError } = await supabase
      .from('ligas')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001',
        nombre: 'Liga de Prueba',
        codigo: 'PRUEBA',
        subdominio: 'prueba',
        activa: true,
      })
      .select()
      .single();

    if (ligaError) {
      return NextResponse.json({ error: ligaError.message }, { status: 400 });
    }

    // 2. Crear equipos
    const equipos = [
      {
        id: '00000000-0000-0000-0000-000000000002',
        liga_id: liga.id,
        nombre: 'Tigres',
        color: '#FF6B35',
        activo: true,
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        liga_id: liga.id,
        nombre: 'Leones',
        color: '#004225',
        activo: true,
      },
    ];

    const { error: equiposError } = await supabase
      .from('equipos')
      .upsert(equipos);

    if (equiposError) {
      return NextResponse.json({ error: equiposError.message }, { status: 400 });
    }

    // 3. Crear usuario admin
    const { data: adminAuth, error: adminAuthError } = await supabase.auth.admin.createUser({
      email: 'admin@prueba.com',
      password: '123456',
      email_confirm: true,
    });

    if (adminAuthError && !adminAuthError.message.includes('already registered')) {
      return NextResponse.json({ error: adminAuthError.message }, { status: 400 });
    }

    if (adminAuth.user) {
      await supabase
        .from('usuarios')
        .upsert({
          id: adminAuth.user.id,
          email: 'admin@prueba.com',
          nombre: 'Admin Prueba',
          role: 'admin',
          liga_id: liga.id,
        });
    }

    // 4. Crear configuración de temporada (sistema avanzado)
    const { data: temporada } = await supabase
      .from('configuracion_temporada')
      .upsert({
        id: '00000000-0000-0000-0000-000000000004',
        liga_id: liga.id,
        nombre: 'Temporada 2024',
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-12-31',
        estado: 'generado',
        max_juegos_por_sabado: 5,
        vueltas_programadas: 2,
        auto_generar: true,
      })
      .select()
      .single();

    return NextResponse.json({ 
      message: 'Datos de prueba creados exitosamente',
      data: {
        liga,
        equipos,
        temporada,
        adminCredentials: {
          email: 'admin@prueba.com',
          password: '123456',
        }
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}