'use client';

import { useState, useEffect } from 'react';
import { useThemeClasses } from '@/components/providers/theme-provider';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface ValidatedInputProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  validator?: (value: string) => Promise<{ isValid: boolean; message?: string }>;
  type?: 'text' | 'email' | 'number' | 'color';
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  debounceMs?: number;
  className?: string;
}

export default function ValidatedInput({
  label,
  value,
  onChange,
  validator,
  type = 'text',
  placeholder,
  required = false,
  min,
  max,
  debounceMs = 500,
  className = ''
}: ValidatedInputProps) {
  const themeClasses = useThemeClasses();
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message?: string;
  } | null>(null);
  
  useEffect(() => {
    if (!validator || !value) {
      setValidationResult(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsValidating(true);
      try {
        const result = await validator(String(value));
        setValidationResult(result);
      } catch (error) {
        setValidationResult({
          isValid: false,
          message: 'Error validando el campo'
        });
      } finally {
        setIsValidating(false);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [value, validator, debounceMs]);

  const getInputClasses = () => {
    let classes = `w-full px-4 py-2 rounded-lg border ${themeClasses.input} transition-colors duration-200`;
    
    if (validationResult) {
      if (validationResult.isValid) {
        classes += ' border-green-500 focus:border-green-600';
      } else {
        classes += ' border-red-500 focus:border-red-600';
      }
    }
    
    return `${classes} ${className}`;
  };

  return (
    <div className="space-y-2">
      <label className={`block text-sm font-medium ${themeClasses.text}`}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="relative">
        {type === 'color' ? (
          <div className="flex items-center space-x-3">
            <input
              type="color"
              value={String(value)}
              onChange={(e) => onChange(e.target.value)}
              className="w-12 h-10 rounded border cursor-pointer"
            />
            <input
              type="text"
              value={String(value)}
              onChange={(e) => onChange(e.target.value)}
              className={getInputClasses()}
              placeholder={placeholder}
            />
          </div>
        ) : (
          <input
            type={type}
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
            className={getInputClasses()}
            placeholder={placeholder}
            min={min}
            max={max}
            required={required}
          />
        )}
        
        {/* Icono de validación */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isValidating && (
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          )}
          {!isValidating && validationResult && (
            validationResult.isValid ? (
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
            ) : (
              <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
            )
          )}
        </div>
      </div>
      
      {/* Mensaje de validación */}
      {validationResult && !validationResult.isValid && validationResult.message && (
        <p className="text-sm text-red-500 flex items-center space-x-1">
          <ExclamationCircleIcon className="h-4 w-4" />
          <span>{validationResult.message}</span>
        </p>
      )}
      
      {validationResult && validationResult.isValid && validationResult.message && (
        <p className="text-sm text-green-500 flex items-center space-x-1">
          <CheckCircleIcon className="h-4 w-4" />
          <span>{validationResult.message}</span>
        </p>
      )}
    </div>
  );
}