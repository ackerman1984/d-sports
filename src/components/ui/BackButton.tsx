'use client';

import { ChevronLeftIcon } from '@heroicons/react/24/outline';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  variant?: 'default' | 'minimal' | 'pill';
  className?: string;
}

export default function BackButton({ 
  onClick, 
  label = 'Volver', 
  variant = 'default',
  className = '' 
}: BackButtonProps) {
  const variants = {
    default: `inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white hover:scale-105 active:scale-95`,
    minimal: `inline-flex items-center px-2 py-1 text-sm font-medium transition-colors duration-200 text-slate-400 hover:text-white`,
    pill: `inline-flex items-center px-6 py-3 rounded-full font-medium transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl`
  };

  return (
    <button
      onClick={onClick}
      className={`${variants[variant]} ${className}`}
    >
      <ChevronLeftIcon className="w-5 h-5 mr-2" />
      {label}
    </button>
  );
}

// Hook para navegación fácil en admin
export function useAdminNavigation() {
  const goBack = (setActiveTab: (tab: string) => void, defaultTab: string = 'overview') => {
    setActiveTab(defaultTab);
  };

  const goToTab = (setActiveTab: (tab: string) => void, tab: string) => {
    setActiveTab(tab);
  };

  return { goBack, goToTab };
}