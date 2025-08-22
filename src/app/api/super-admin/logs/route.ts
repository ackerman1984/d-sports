import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin-client';

export async function GET(_request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Obtener logs de acceso con información de la liga
    const { data: logs, error } = await supabase
      .from('access_logs')
      .select(`
        id,
        liga_id,
        admin_email,
        action,
        performed_by,
        reason,
        ip_address,
        user_agent,
        created_at,
        ligas!inner(
          nombre
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100); // Limitar a los últimos 100 logs

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Formatear datos para el frontend
    const formattedLogs = logs?.map((log: any) => ({
      id: log.id,
      liga_id: log.liga_id,
      admin_email: log.admin_email,
      action: log.action,
      performed_by: log.performed_by,
      reason: log.reason,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      created_at: log.created_at,
      liga_name: Array.isArray(log.ligas) ? log.ligas[0]?.nombre : log.ligas?.nombre || 'Liga eliminada'
    })) || [];

    return NextResponse.json(
      { logs: formattedLogs },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}