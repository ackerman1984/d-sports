"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  toggleTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "baseball-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  // Hidratación segura del tema desde localStorage
  useEffect(() => {
    const storedTheme = localStorage?.getItem(storageKey) as Theme;
    if (storedTheme) {
      setTheme(storedTheme);
    }
  }, [storageKey]);

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      root.setAttribute("data-theme", systemTheme);
      return;
    }

    root.classList.add(theme);
    root.setAttribute("data-theme", theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      localStorage?.setItem(storageKey, newTheme);
      setTheme(newTheme);
    },
    toggleTheme: () => {
      const newTheme = theme === 'dark' ? 'light' : 'dark';
      localStorage?.setItem(storageKey, newTheme);
      setTheme(newTheme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};

// Hook para clases de tema consistentes con brand colors
export const useThemeClasses = () => {
  return {
    // Backgrounds
    bg: 'bg-white dark:bg-dark-bg',
    bgSecondary: 'bg-neutral-50 dark:bg-dark-surface',
    surface: 'bg-neutral-50 dark:bg-dark-surface',
    card: 'bg-white dark:bg-dark-card',
    
    // Text
    text: 'text-primary-500 dark:text-dark-text',
    textMuted: 'text-neutral-500 dark:text-dark-muted',
    textSecondary: 'text-primary-700 dark:text-neutral-300',
    
    // Borders
    border: 'border-neutral-200 dark:border-dark-border',
    borderSecondary: 'border-neutral-300 dark:border-neutral-600',
    
    // Buttons - usando brand colors
    btnPrimary: 'bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white shadow-baseball transition-all duration-300',
    btnSecondary: 'bg-pastel-gray hover:bg-pastel-blue text-primary-500 dark:text-white transition-all duration-300',
    btnOutline: 'border-2 border-primary-500 dark:border-pastel-blue text-primary-500 dark:text-pastel-blue hover:bg-primary-500 hover:text-white dark:hover:bg-pastel-blue dark:hover:text-primary-500 transition-all duration-300',
    
    // Inputs - con brand colors
    input: 'bg-white dark:bg-dark-card border-neutral-300 dark:border-dark-border text-primary-500 dark:text-dark-text placeholder-neutral-500 dark:placeholder-dark-muted focus:border-accent-500 dark:focus:border-pastel-blue transition-colors duration-300',
    
    // States - con colores pasteles en modo oscuro
    success: 'text-success dark:text-green-400',
    error: 'text-secondary-500 dark:text-pastel-red',
    warning: 'text-warning dark:text-yellow-400',
    info: 'text-accent-500 dark:text-pastel-blue',
    
    // Baseball specific
    baseballGradient: 'bg-gradient-to-br from-primary-500 via-accent-500 to-pastel-blue',
    baseballCard: 'bg-white/95 dark:bg-dark-card/95 backdrop-blur-sm shadow-baseball hover:shadow-baseball-lg transition-all duration-300',
  };
};