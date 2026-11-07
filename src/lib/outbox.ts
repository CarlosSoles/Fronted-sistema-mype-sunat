import { accountingApi } from '@/modules/accounting/services/accountingApi';
import type { CreateAccountingEntryInput } from '@/modules/accounting/types/accounting.types';

export interface PendingAccountingEntry {
  id: string;
  type: 'ACCOUNTING_ENTRY';
  payload: CreateAccountingEntryInput;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

const STORAGE_KEY = 'sync-sunat-outbox';

const uuid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function leer(): PendingAccountingEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingAccountingEntry[]) : [];
  } catch {
    return [];
  }
}

function escribir(operaciones: PendingAccountingEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(operaciones));
}

/** Guarda un asiento para enviarlo cuando vuelva la red. */
export async function enqueueAccountingEntry(
  payload: CreateAccountingEntryInput,
): Promise<string> {
  const id = uuid();
  const operacion: PendingAccountingEntry = {
    id,
    type: 'ACCOUNTING_ENTRY',
    payload: { ...payload, idempotencyKey: payload.idempotencyKey ?? id },
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  escribir([...leer(), operacion]);
  return id;
}

export async function listPendingOperations(): Promise<PendingAccountingEntry[]> {
  return leer();
}

/** Reintenta la cola; el idempotencyKey evita duplicados en el backend. */
export async function flushOutbox(): Promise<{ enviados: number; fallidos: number }> {
  if (!navigator.onLine) return { enviados: 0, fallidos: 0 };
  const pendientes = leer();
  let enviados = 0;
  let fallidos = 0;

  for (const operacion of pendientes) {
    try {
      await accountingApi.createEntry(operacion.payload);
      enviados += 1;
    } catch (error) {
      fallidos += 1;
      const actualizadas = leer().map((item) =>
        item.id === operacion.id
          ? {
              ...item,
              attempts: item.attempts + 1,
              lastError: error instanceof Error ? error.message : 'Error desconocido',
            }
          : item,
      );
      escribir(actualizadas);
      continue;
    }
    escribir(leer().filter((item) => item.id !== operacion.id));
  }

  return { enviados, fallidos };
}
