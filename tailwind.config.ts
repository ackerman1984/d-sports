import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores personalizados del usuario
        // Brand colors principales
        primary: {
          50: '#f0f4ff',
          100: '#e0eaff', 
          500: '#013771', // Azul principal
          600: '#012c5c',
          700: '#01214a',
          800: '#011638',
          900: '#010b26',
          DEFAULT: '#013771',
        },
        secondary: {
          50: '#fdf2f8',
          100: '#fce7f3',
          500: '#BE0D3C', // Rojo principal
          600: '#9b0a31',
          700: '#780826',
          800: '#55051b',
          900: '#320310',
          DEFAULT: '#BE0D3C',
        },
        accent: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#619BF3', // Azul claro
          600: '#4e7cc2',
          700: '#3b5d91',
          800: '#283e60',
          900: '#151f2f',
          DEFAULT: '#619BF3',
        },
        neutral: {
          50: '#f8fafc',
          100: '#f1f5f9',
          500: '#3D5C8A', // Azul grisáceo
          600: '#314a6e',
          700: '#253752',
          800: '#192536',
          900: '#0d121a',
          DEFAULT: '#3D5C8A',
        },
        
        // Colores pasteles derivados
        pastel: {
          blue: '#a8c8ec',    // Versión pastel de 619BF3
          red: '#d68699',     // Versión pastel de BE0D3C
          navy: '#7a96b8',    // Versión pastel de 013771
          gray: '#9bacc4',    // Versión pastel de 3D5C8A
          white: '#FFFFFF',   // Blanco puro
        },
        
        // Estados del sistema
        success: '#10b981',
        warning: '#f59e0b', 
        error: '#ef4444',
        info: '#619BF3',
        
        // Modo oscuro específico
        dark: {
          bg: '#0a0e1a',      // Muy oscuro basado en primary
          surface: '#13203a',  // Oscuro basado en primary
          card: '#1a2d4a',    // Cards en modo oscuro
          border: '#2a4260',  // Bordes sutiles
          text: '#e2e8f0',    // Texto claro
          muted: '#94a3b8',   // Texto secundario
        },
        
        // Colores específicos de béisbol
        baseball: {
          field: '#22c55e',   // Verde césped
          dirt: '#a16207',    // Marrón tierra
          base: '#ffffff',    // Blanco bases
          ball: '#f8fafc',    // Pelota
          diamond: '#84cc16', // Verde diamante
        },
      },
      
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        logo: ["Intro Rust G Base2 Line", "system-ui", "sans-serif"],
      },
      
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "bounce-soft": "bounceSoft 0.6s ease-out",
      },
      
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        bounceSoft: {
          "0%, 20%, 53%, 80%, 100%": { transform: "translate3d(0,0,0)" },
          "40%, 43%": { transform: "translate3d(0, -5px, 0)" },
          "70%": { transform: "translate3d(0, -2px, 0)" },
          "90%": { transform: "translate3d(0, -1px, 0)" },
        },
      },
      
      boxShadow: {
        "baseball": "0 4px 6px -1px var(--shadow)",
        "baseball-lg": "0 8px 25px -5px var(--shadow)",
      },
      
      borderRadius: {
        "baseball": "0.75rem",
      },
      
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
      },
    },
  },
  plugins: [],
};

export default config;