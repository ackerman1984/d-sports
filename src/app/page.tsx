import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Baseball themed background decorations */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-16 h-16 rounded-full border-2 border-white animate-pulse"></div>
        <div className="absolute top-32 right-20 w-12 h-12 rounded-full border-2 border-white animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-32 w-8 h-8 rounded-full border-2 border-white animate-pulse delay-2000"></div>
        <div className="absolute bottom-32 right-16 w-20 h-20 rounded-full border-2 border-white animate-pulse delay-500"></div>
      </div>
      
      {/* Baseball diamond decoration */}
      <div className="absolute top-1/4 right-10 opacity-10 transform rotate-45">
        <div className="w-20 h-20 border-2 border-white"></div>
      </div>
      
      {/* Baseball bat decoration */}
      <div className="absolute bottom-10 left-1/4 opacity-10 transform rotate-12">
        <div className="w-2 h-24 bg-white rounded-full"></div>
        <div className="w-4 h-6 bg-white rounded-full ml-[-1px] mt-[-2px]"></div>
      </div>

      <div className="bg-slate-800/90 backdrop-blur-sm p-12 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-600 text-center relative z-10">
        <div className="mb-8">
          <div className="flex justify-center mb-6">
            <Image 
              src="/d-sports-logo.png" 
              alt="D-Sports Logo" 
              width={200} 
              height={60}
              className="object-contain"
            />
          </div>
          <p className="text-slate-300 text-xl font-medium">
            Sistema de gestión de béisbol
          </p>
        </div>

        <div className="space-y-6">
          <Link 
            href="/login" 
            className="w-full flex justify-center items-center py-5 px-6 border border-transparent rounded-2xl shadow-lg text-lg font-bold text-white bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all duration-300 transform hover:scale-105"
          >
            <span className="mr-2">🏟️</span>
            Iniciar
          </Link>
          
          <Link 
            href="/registro" 
            className="w-full inline-flex items-center justify-center py-4 px-6 border-2 border-slate-600 rounded-xl shadow-sm text-base font-semibold text-slate-300 bg-slate-700/50 hover:bg-slate-700 hover:border-slate-500 hover:text-white transition-all duration-300"
          >
            <span className="mr-2">📝</span>
            Crear Nueva Cuenta
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-600">
          <p className="text-slate-400 text-sm">
            ⚾ Gestiona tu liga de béisbol de manera profesional
          </p>
        </div>
      </div>
    </div>
  );
}