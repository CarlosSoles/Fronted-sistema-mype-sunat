import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Plus, Trash2, TriangleAlert } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { accountingApi } from '../services/accountingApi';
import { enqueueAccountingEntry } from '@/lib/outbox';
import type { AccountingAccount } from '../types/accounting.types';

interface LineDraft {
  accountCode: string;
  description: string;
  debit: string;
  credit: string;
}

const DIARIOS = [
  { value: 'OPV', label: 'Operaciones varias' },
  { value: 'VEN', label: 'Ventas' },
  { value: 'COM', label: 'Compras' },
  { value: 'CAJ', label: 'Caja y bancos' },
];

interface ManualEntryModalProps {
  open: boolean;
  period: string;
  onClose: () => void;
  onSaved: () => void;
  /** Número que le tocará al asiento, calculado con los asientos del período. */
  proximoNumero?: (fecha: string) => string;
}

const round2 = (value: number) => Math.round(value * 100) / 100;
const hoy = () => {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
};
const lineaVacia = (): LineDraft => ({ accountCode: '', description: '', debit: '', credit: '' });

export default function ManualEntryModal({ open, onClose, onSaved, proximoNumero }: ManualEntryModalProps) {
  const [entryDate, setEntryDate] = useState(hoy);
  const [journalCode, setJournalCode] = useState('OPV');
  const [responsible, setResponsible] = useState('');
  const [glosa, setGlosa] = useState('');
  const [observacion, setObservacion] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([lineaVacia(), lineaVacia()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounting-accounts'],
    queryFn: () => accountingApi.getAccounts(),
    enabled: open,
  });

  const accountsByCode = useMemo(
    () => new Map(accounts.map((account) => [account.code, account])),
    [accounts],
  );

  // Al abrir, el formulario vuelve a su estado inicial: dos líneas vacías.
  useEffect(() => {
    if (!open) return;
    setEntryDate(hoy());
    setJournalCode('OPV');
    setResponsible('');
    setGlosa('');
    setObservacion('');
    setLines([lineaVacia(), lineaVacia()]);
    setError(null);
  }, [open]);

  const totales = useMemo(() => {
    const debit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const credit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
    return { debit: round2(debit), credit: round2(credit) };
  }, [lines]);

  const cuadrado = totales.debit > 0 && Math.abs(totales.debit - totales.credit) < 0.005;
  // Referencia completa: el correlativo sale de los asientos ya cargados del
  // período; si aún no hay ninguno, será el 0001.
  const [anio, mes] = entryDate.split('-');
  const referencia = proximoNumero ? proximoNumero(entryDate) : `MISC/${anio}/${mes}/0001`;

  const updateLine = (index: number, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };
  const addLine = () => setLines((prev) => [...prev, lineaVacia()]);
  const removeLine = (index: number) =>
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!glosa.trim()) {
      setError('El concepto (glosa) es obligatorio.');
      return;
    }
    if (!cuadrado) {
      setError('El asiento debe estar cuadrado y tener un monto mayor que cero.');
      return;
    }
    if (lines.some((line) => !line.accountCode)) {
      setError('Todas las líneas deben tener una cuenta contable.');
      return;
    }

    const payload = {
      period: entryDate.slice(0, 7),
      entryDate,
      glosa: glosa.trim(),
      observation: observacion.trim() || undefined,
      responsible: responsible.trim() || undefined,
      sourceModule: 'MANUAL',
      journalCode,
      lines: lines.map((line, index) => {
        const account = accountsByCode.get(line.accountCode);
        return {
          lineOrder: index + 1,
          accountCode: line.accountCode,
          // Si el contador escribe un detalle, se guarda como descripción de la
          // línea; si no, se usa el nombre oficial de la cuenta del PCGE.
          accountName: line.description.trim() || account?.name || line.accountCode,
          debitAmount: Number(line.debit) || 0,
          creditAmount: Number(line.credit) || 0,
        };
      }),
    };

    setSaving(true);
    try {
      await accountingApi.createEntry(payload);
      onSaved();
      onClose();
    } catch (error_) {
      const sinRespuesta =
        !navigator.onLine ||
        (error_ instanceof Error && 'response' in error_ && !(error_ as { response?: unknown }).response);
      if (sinRespuesta) {
        await enqueueAccountingEntry(payload);
        setError('Sin conexión: el asiento quedó guardado y se enviará al reconectar.');
        return;
      }
      const mensaje = (error_ as { response?: { data?: { message?: unknown } } }).response?.data?.message;
      setError(
        Array.isArray(mensaje)
          ? mensaje.join(' · ')
          : typeof mensaje === 'string'
            ? mensaje
            : 'No se pudo registrar el asiento. Revisa el período y las cuentas.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(abierto) => { if (!abierto) onClose(); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nuevo asiento contable</DialogTitle>
          <DialogDescription>
            Registra un asiento manual: completa el encabezado y las partidas de debe y haber. El número se asigna
            automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground" htmlFor="asiento-fecha">
                Fecha contable
              </label>
              <Input id="asiento-fecha" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Diario</label>
              <Select value={journalCode} onValueChange={setJournalCode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIARIOS.map((diario) => (
                    <SelectItem key={diario.value} value={diario.value}>{diario.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground" htmlFor="asiento-origen">
                Origen (opcional)
              </label>
              <Input
                id="asiento-origen"
                placeholder="Ej. Tienda principal"
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground" htmlFor="asiento-concepto">
                Concepto (glosa)
              </label>
              <Input
                id="asiento-concepto"
                placeholder="Ej. Ajuste por diferencia de caja del mes"
                value={glosa}
                onChange={(e) => setGlosa(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground" htmlFor="asiento-observacion">
                Observación (opcional)
              </label>
              <Input id="asiento-observacion" value={observacion} onChange={(e) => setObservacion(e.target.value)} />
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs">
            <span className="font-medium uppercase tracking-wider text-muted-foreground">Número</span>
            <p className="mt-0.5">
              Se genera automáticamente al registrar · referencia <span className="font-mono">{referencia}</span>
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Líneas del asiento ({lines.length})
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={addLine}>
                <Plus className="mr-1 h-4 w-4" /> Agregar línea
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left font-medium">Cuenta contable</th>
                    <th className="p-2 text-left font-medium">Descripción</th>
                    <th className="w-28 p-2 text-right font-medium">Debe (S/)</th>
                    <th className="w-28 p-2 text-right font-medium">Haber (S/)</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={`linea-${index}`} className="border-t">
                      <td className="min-w-56 p-2">
                        <Select
                          value={line.accountCode || undefined}
                          onValueChange={(value) => updateLine(index, { accountCode: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar cuenta" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((account: AccountingAccount) => (
                              <SelectItem key={account.code} value={account.code}>
                                {account.code} · {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          placeholder="Detalle (opcional)"
                          value={line.description}
                          onChange={(e) => updateLine(index, { description: e.target.value })}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="text-right tabular-nums"
                          value={line.debit}
                          onChange={(e) => updateLine(index, { debit: e.target.value, credit: '' })}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="text-right tabular-nums"
                          value={line.credit}
                          onChange={(e) => updateLine(index, { credit: e.target.value, debit: '' })}
                        />
                      </td>
                      <td className="p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLine(index)}
                          disabled={lines.length <= 1}
                          aria-label={`Eliminar línea ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-foreground px-3 py-2 text-sm text-background">
            <span className="flex items-center gap-4 uppercase tracking-wider">
              <span>
                Debe <span className="font-semibold tabular-nums">S/ {totales.debit.toFixed(2)}</span>
              </span>
              <span>
                Haber <span className="font-semibold tabular-nums">S/ {totales.credit.toFixed(2)}</span>
              </span>
            </span>
            <span
              className={
                cuadrado
                  ? 'flex items-center gap-1 text-xs font-medium text-emerald-400'
                  : 'flex items-center gap-1 text-xs font-medium text-amber-400'
              }
            >
              {cuadrado ? <CheckCircle2 className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}
              {cuadrado ? 'Asiento cuadrado' : 'Debe y haber deben coincidir'}
            </span>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving || !cuadrado}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              {saving ? 'Registrando…' : 'Registrar asiento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
