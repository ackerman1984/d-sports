import { NextRequest, NextResponse } from 'next/server';

// API temporal para logs mientras se aplica la migración
export async function GET(_request: NextRequest) {
  try {
    // Datos de prueba mientras se aplica la migración
    const mockLogs = [
      {
        id: 'temp-1',
        liga_id: 'mock-liga-1',
        admin_email: 'admin@demo.com',
        action: 'authorized',
        performed_by: 'creator@baseball-saas.com',
        reason: 'Autorización inicial',
        created_at: new Date().toISOString(),
        liga_name: 'Liga Demo'
      },
      {
        id: 'temp-2',
        liga_id: 'mock-liga-2',
        admin_email: 'admin2@demo.com',
        action: 'suspended',
        performed_by: 'creator@baseball-saas.com',
        reason: 'Violación de términos',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        liga_name: 'Liga Suspendida'
      }
    ];

    return NextResponse.json(
      { 
        logs: mockLogs,
        note: 'Datos de prueba - aplica la migración para logs reales'
      },
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