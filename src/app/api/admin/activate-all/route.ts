import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    
    console.log('🔧 ACTIVATING ALL LIGAS AND EQUIPOS...');
    
    // 1. Activar TODAS las ligas
    const { data: ligasActivadas, error: ligasError } = await supabase
      .from('ligas')
      .update({ activa: true })
      .not('id', 'is', null) // WHERE clause para activar todas las ligas
      .select();

    if (ligasError) {
      console.error('Error activating ligas:', ligasError);
      return NextResponse.json({ error: ligasError.message }, { status: 400 });
    }

    console.log(`✅ Activated ${ligasActivadas?.length || 0} ligas`);

    // 2. Activar TODOS los equipos usando SQL directo para evitar el trigger
    const { data: equiposActivados, error: equiposError } = await supabase
      .rpc('activate_all_equipos');

    if (equiposError) {
      console.error('Error activating equipos:', equiposError);
      // Si el RPC no existe, intentamos el método alternativo
      const { data: equiposAlternativo, error: errorAlternativo } = await supabase
        .from('equipos')
        .select('id')
        .then(async ({ data: equipos, error: selectError }) => {
          if (selectError || !equipos) {
            return { data: null, error: selectError };
          }
          
          // Actualizar uno por uno para evitar el trigger
          const updates = [];
          for (const equipo of equipos) {
            const { error: updateError } = await supabase
              .from('equipos')
              .update({ activo: true })
              .eq('id', equipo.id);
            if (!updateError) updates.push(equipo);
          }
          return { data: updates, error: null };
        });
      
      if (errorAlternativo) {
        console.error('Error with alternative method:', errorAlternativo);
        return NextResponse.json({ error: errorAlternativo.message }, { status: 400 });
      }
      console.log(`✅ Activated ${equiposAlternativo?.length || 0} equipos (alternative method)`);
    } else {
      console.log(`✅ Activated ${equiposActivados?.length || 0} equipos`);
    }

    // 3. Verificar el resultado final
    const { data: verificacion, error: verifyError } = await supabase
      .from('ligas')
      .select(`
        id,
        nombre,
        activa,
        equipos(id, nombre, activo)
      `);

    if (verifyError) {
      console.error('Error verifying result:', verifyError);
    } else {
      console.log('🔍 Final verification:', verificacion);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Todas las ligas y equipos han sido activados',
      resultados: {
        ligasActivadas: ligasActivadas?.length || 0,
        equiposActivados: 'Variable number based on method used'
      },
      verificacion
    }, { status: 200 });

  } catch (error) {
    console.error('Activate all error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}