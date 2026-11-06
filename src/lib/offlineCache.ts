import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { useAuthStore } from '@/stores/authStore';

interface CacheSchema extends DBSchema {
  'api-cache': {
    key: string;
    value: { key: string; data: unknown; savedAt: string };
  };
}

const DB_NAME = 'sync-sunat-offline';
const DB_VERSION = 1;
let dbPromise: Promise<IDBPDatabase<CacheSchema>> | null = null;

function db(): Promise<IDBPDatabase<CacheSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<CacheSchema>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        database.createObjectStore('api-cache', { keyPath: 'key' });
      },
    });
  }
  return dbPromise;
}

function tenantKey(key: string): string {
  const tenant = useAuthStore.getState().activeCompany?.tenantId ?? 'sin-empresa';
  return `${tenant}:${key}`;
}

/** Guarda la última respuesta buena de una lectura. */
export async function guardarCache(key: string, data: unknown): Promise<void> {
  const database = await db();
  await database.put('api-cache', {
    key: tenantKey(key),
    data,
    savedAt: new Date().toISOString(),
  });
}

/** Devuelve la última respuesta guardada, o null. */
export async function leerCache<T>(key: string): Promise<{ data: T; savedAt: string } | null> {
  const database = await db();
  const row = await database.get('api-cache', tenantKey(key));
  return row ? { data: row.data as T, savedAt: row.savedAt } : null;
}

/**
 * Lectura con caché: intenta red, guarda el resultado y, si falla la red,
 * devuelve la última copia local. No cachea escrituras.
 */
export async function cachedGet<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  try {
    const data = await fetcher();
    await guardarCache(key, data);
    return data;
  } catch (error) {
    const cache = await leerCache<T>(key);
    if (cache) return cache.data;
    throw error;
  }
}
