import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ligaId = id;

    console.log(`Activating all equipos for liga ${ligaId}...`);

    // Activar todos los equipos de la liga
    const { data, error } = await supabase
      .from('equipos')
      .update({ activo: true })
      .eq('liga_id', ligaId)
      .select();

    if (error) {
      console.error('Error activating equipos:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('Equipos activated successfully:', data);

    return NextResponse.json({ 
      message: `${data?.length || 0} equipos activados exitosamente`,
      equipos: data 
    }, { status: 200 });

  } catch (error) {
    console.error('Activate equipos error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}