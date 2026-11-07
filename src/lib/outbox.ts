import { accountingApi } from '@/modules/accounting/services/accountingApi';
import { invoicesApi } from '@/modules/invoices/services/invoicesApi';
import type { CreateAccountingEntryInput } from '@/modules/accounting/types/accounting.types';
import type { EmitirComprobantePayload } from '@/modules/invoices/types/invoiceEmision.types';

export interface PendingAccountingEntry {
  id: string;
  type: 'ACCOUNTING_ENTRY';
  payload: CreateAccountingEntryInput;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

export interface PendingInvoiceEmission {
  id: string;
  type: 'INVOICE_EMISSION';
  payload: EmitirComprobantePayload;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

export type PendingOperation = PendingAccountingEntry | PendingInvoiceEmission;

const STORAGE_KEY = 'sync-sunat-outbox';

const uuid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function leer(): PendingOperation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingOperation[]) : [];
  } catch {
    return [];
  }
}

function escribir(operaciones: PendingOperation[]): void {
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
  window.dispatchEvent(new Event('outbox:changed'));
  return id;
}

/** Encola una emisión cuando no hay red; la llave fiscal evita duplicados. */
export async function enqueueInvoiceEmission(
  payload: EmitirComprobantePayload,
): Promise<string> {
  const id = uuid();
  escribir([
    ...leer(),
    {
      id,
      type: 'INVOICE_EMISSION',
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
    },
  ]);
  window.dispatchEvent(new Event('outbox:changed'));
  return id;
}

export async function listPendingOperations(): Promise<PendingOperation[]> {
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
      if (operacion.type === 'ACCOUNTING_ENTRY') {
        await accountingApi.createEntry(operacion.payload);
      } else {
        await invoicesApi.emitirComprobante(operacion.payload);
      }
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
