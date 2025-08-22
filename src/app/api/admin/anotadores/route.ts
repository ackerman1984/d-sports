import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createClient } from '@/lib/supabase/server';

function generateAccessCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();

    // Obtener liga_id del usuario
    const ligaId = session.user.ligaId;
    
    if (!ligaId) {
      console.error('Usuario sin liga asignada:', session.user);
      return NextResponse.json({ error: 'Usuario sin liga asignada' }, { status: 400 });
    }

    console.log('Buscando anotadores para liga:', ligaId);

    // Obtener anotadores de la liga del admin
    const { data: anotadores, error } = await supabase
      .from('anotadores')
      .select('*')
      .eq('liga_id', ligaId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching anotadores:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      anotadores: anotadores || [],
      total: anotadores?.length || 0 
    });

  } catch (error) {
    console.error('Get anotadores error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { nombre, telefono, email, foto_url, codigo_acceso } = body;

    // Validaciones
    if (!nombre) {
      return NextResponse.json(
        { error: 'Nombre es requerido' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Obtener liga_id del usuario
    const ligaId = session.user.ligaId;
    
    if (!ligaId) {
      console.error('Usuario sin liga asignada:', session.user);
      return NextResponse.json({ error: 'Usuario sin liga asignada' }, { status: 400 });
    }

    console.log('Creando anotador para liga:', ligaId);

    // Generar código único si no se proporcionó uno
    let finalCodigoAcceso = codigo_acceso;
    
    if (!finalCodigoAcceso) {
      // Generar código único
      let isUnique = false;
      let attempts = 0;
      
      while (!isUnique && attempts < 10) {
        finalCodigoAcceso = generateAccessCode();
        
        const { data: existingAnotador } = await supabase
          .from('anotadores')
          .select('id')
          .eq('codigo_acceso', finalCodigoAcceso)
          .single();
          
        if (!existingAnotador) {
          isUnique = true;
        }
        attempts++;
      }
      
      if (!isUnique) {
        return NextResponse.json(
          { error: 'No se pudo generar un código único. Intenta de nuevo.' },
          { status: 500 }
        );
      }
    } else {
      // Verificar que el código proporcionado no exista
      const { data: existingAnotador } = await supabase
        .from('anotadores')
        .select('id')
        .eq('codigo_acceso', finalCodigoAcceso)
        .single();

      if (existingAnotador) {
        return NextResponse.json(
          { error: 'El código de acceso ya existe' },
          { status: 400 }
        );
      }
    }

    // Crear el anotador directamente (sin usuario de autenticación)
    const { data: newAnotador, error } = await supabase
      .from('anotadores')
      .insert({
        nombre,
        telefono: telefono || '', // Usar el teléfono proporcionado o vacío
        email: email || '', // Usar el email proporcionado o vacío  
        codigo_acceso: finalCodigoAcceso,
        foto_url: foto_url || null,
        liga_id: ligaId,
        activo: true,
        created_by: session.user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating anotador:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Anotador registrado exitosamente',
      anotador: newAnotador 
    }, { status: 201 });

  } catch (error) {
    console.error('Create anotador error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}