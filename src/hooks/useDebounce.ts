import { useEffect, useState } from 'react';

/**
 * Hook para retrasar la actualización de un valor hasta que el usuario
 * deje de tipear durante un tiempo determinado (evita llamadas excesivas al backend).
 */
export function useDebounce<T>(value: T, delay: number = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
