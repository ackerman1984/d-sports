import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const ligaId = session.user.ligaId;
    
    if (!ligaId) {
      return NextResponse.json({ error: 'Usuario sin liga asignada' }, { status: 400 });
    }

    console.log('🔧 Configurando campo activo para temporadas...');

    console.log('🔧 Configurando campo activo...');

    // Como no podemos agregar la columna directamente, vamos a mostrar instrucciones SQL
    const { data: temporadas } = await supabase
      .from('configuracion_temporada')
      .select('*')
      .eq('liga_id', ligaId);

    return NextResponse.json({
      message: 'Para habilitar el sistema de activar/desactivar temporadas, ejecuta este SQL en tu dashboard de Supabase',
      sql_instructions: [
        'ALTER TABLE configuracion_temporada ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;',
        'UPDATE configuracion_temporada SET activo = true WHERE activo IS NULL;',
        'CREATE INDEX IF NOT EXISTS idx_configuracion_temporada_activo ON configuracion_temporada(liga_id, activo);'
      ],
      dashboard_url: 'https://supabase.com/dashboard',
      temporadas_found: temporadas?.length || 0,
      step_by_step: [
        '1. Ve a tu dashboard de Supabase',
        '2. Abre el SQL Editor',
        '3. Copia y ejecuta el SQL que aparece arriba',
        '4. Ve a Project Settings → General',
        '5. Haz clic en "Restart Project"',
        '6. Espera 2-3 minutos',
        '7. Recarga la página'
      ],
      important_note: 'IMPORTANTE: Después de ejecutar el SQL, DEBES reiniciar tu proyecto en Supabase para que el caché de esquema se actualice.'
    });

  } catch (error) {
    console.error('Setup activo error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}