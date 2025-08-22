"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/providers/theme-provider";

interface User {
  id: string;
  name?: string | null;
  email: string;
  role: string;
  ligaId?: string;
  ligaSubdominio?: string;
}

interface BaseballNavigationProps {
  user: User;
}

export function BaseballNavigation({ user }: BaseballNavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const getNavigationItems = () => {
    const commonItems = [
      { href: "/dashboard", label: "Dashboard", icon: "🏠" },
    ];

    switch (user.role) {
      case 'admin':
        return [
          ...commonItems,
          { href: "/admin/ligas", label: "Gestión de Liga", icon: "⚾" },
          { href: "/admin/equipos", label: "Equipos", icon: "👥" },
          { href: "/admin/jugadores", label: "Jugadores", icon: "🏃‍♂️" },
          { href: "/admin/temporadas", label: "Temporadas", icon: "📅" },
          { href: "/admin/calendario", label: "Calendario", icon: "🗓️" },
          { href: "/estadisticas", label: "Estadísticas", icon: "📊" },
        ];
      case 'anotador':
        return [
          ...commonItems,
          { href: "/anotador/juegos", label: "Anotar Juegos", icon: "📝" },
          { href: "/anotador/estadisticas", label: "Ver Estadísticas", icon: "📊" },
          { href: "/calendario", label: "Calendario", icon: "🗓️" },
        ];
      case 'jugador':
        return [
          ...commonItems,
          { href: "/jugador/perfil", label: "Mi Perfil", icon: "👤" },
          { href: "/jugador/estadisticas", label: "Mis Estadísticas", icon: "📈" },
          { href: "/calendario", label: "Calendario", icon: "🗓️" },
          { href: "/equipo", label: "Mi Equipo", icon: "👥" },
        ];
      default:
        return commonItems;
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-slate-800 border-b border-slate-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 font-bold text-xl hover:opacity-80 transition-opacity">
            {/* D-Sports Logo Icon */}
            <div className="w-8 h-8 bg-slate-100 dark:bg-slate-200 rounded border border-slate-300 dark:border-slate-400 flex items-center justify-center shadow-sm">
              <div className="w-4 h-4 bg-blue-800 rounded-full"></div>
            </div>
            <span className="text-red-500 dark:text-red-400 font-logo font-black tracking-wider uppercase">D-SPORTS</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {getNavigationItems().map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-slate-700"
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme Toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "light" ? "🌙" : "☀️"}
            </Button>

            {/* User Info */}
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-700">
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-slate-400 capitalize">
                  {user.role}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white">
                Salir
              </Button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? "✕" : "☰"}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-700 bg-slate-800">
            <div className="flex flex-col gap-2">
              {getNavigationItems().map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-slate-700"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
              
              <div className="border-t border-slate-700 pt-3 mt-3">
                <div className="flex items-center justify-between px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {user.name || user.email}
                    </p>
                    <p className="text-xs text-slate-400 capitalize">
                      {user.role}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-slate-300 hover:text-white">
                      {theme === "light" ? "🌙" : "☀️"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleSignOut} className="border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white">
                      Salir
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}