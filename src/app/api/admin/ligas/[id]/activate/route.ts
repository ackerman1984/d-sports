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

    console.log(`Activating liga ${ligaId}...`);

    // Activar la liga
    const { data, error } = await supabase
      .from('ligas')
      .update({ activa: true })
      .eq('id', ligaId)
      .select()
      .single();

    if (error) {
      console.error('Error activating liga:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('Liga activated successfully:', data);

    return NextResponse.json({ 
      message: 'Liga activada exitosamente',
      liga: data 
    }, { status: 200 });

  } catch (error) {
    console.error('Activate liga error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}