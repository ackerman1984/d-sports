import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin-client';

// API temporal para obtener ligas sin las nuevas columnas
export async function GET(_request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Obtener todas las ligas con información del admin
    const { data: ligas, error } = await supabase
      .from('ligas')
      .select(`
        id,
        nombre,
        codigo,
        subdominio,
        created_at,
        usuarios!inner(
          email,
          nombre
        )
      `)
      .eq('usuarios.role', 'admin')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Formatear datos para el frontend con valores por defecto
    const formattedLigas = ligas?.map((liga: any) => ({
      id: liga.id,
      nombre: liga.nombre,  
      codigo: liga.codigo,
      subdominio: liga.subdominio,
      authorized: false, // Valor por defecto
      authorization_code: null,
      authorized_at: null,
      authorized_by: null,
      suspended_at: null,
      suspension_reason: null,
      created_at: liga.created_at,
      admin_email: Array.isArray(liga.usuarios) ? liga.usuarios[0]?.email : liga.usuarios?.email || 'N/A',
      admin_name: Array.isArray(liga.usuarios) ? liga.usuarios[0]?.nombre : liga.usuarios?.nombre || 'N/A'
    })) || [];

    return NextResponse.json(
      { 
        ligas: formattedLigas,
        note: 'Modo temporal - aplica la migración para funcionalidad completa'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error fetching ligas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}