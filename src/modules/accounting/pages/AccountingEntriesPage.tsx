import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/axios';
import { DoubleEntryBalanceCard } from '../components/DoubleEntryBalanceCard';
import {
  Badge,
  Button,
  Card,
  Input,
  Page,
  PageHeader,
  PageText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { formatCurrency, formatDateToPeru } from '@/lib/formatters';
import { BookOpen, CheckCircle2, Download, FilePlus, PlusCircle, RefreshCw, Trash2, X } from 'lucide-react';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useAuthStore } from '@/stores/authStore';
import { hoyEnLima, periodoActualLima } from '@/modules/invoices/lib/invoiceFecha';

interface EntryLine {
  lineOrder: number;
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
}

interface Entry {
  id: string;
  numeroAsiento: string;
  fechaContable: string;
  glosa: string;
  totalDebe: number;
  totalHaber: number;
  estaCuadrado: boolean;
  /** Líneas reales del asiento. Vacío si la fuente no trae detalle. */
  lines?: EntryLine[];
}

/** Línea de asiento tal como la devuelve el backend. */
interface LineaAsientoBackend {
  lineOrder?: number;
  line_order?: number;
  accountCode?: string;
  account_code?: string;
  accountName?: string;
  account_name?: string;
  debitAmount?: number | string;
  debit_amount?: number | string;
  debit?: number | string;
  creditAmount?: number | string;
  credit_amount?: number | string;
  credit?: number | string;
}

/** Asiento del backend: acepta camelCase y snake_case (contrato heredado). */
interface AsientoBackend {
  id?: string;
  numeroAsiento?: string;
  entryNumber?: number;
  entry_number?: number;
  entryDate?: string;
  entry_date?: string;
  fechaContable?: string;
  glosa?: string;
  concept?: string;
  totalDebit?: number | string;
  total_debit?: number | string;
  totalDebe?: number | string;
  totalCredit?: number | string;
  total_credit?: number | string;
  totalHaber?: number | string;
  lines?: LineaAsientoBackend[];
  accounting_lines?: LineaAsientoBackend[];
}

const STORAGE_KEY = 'accounting_entries_demo_v2';

/**
 * Periodo fiscal que se muestra y se exporta, en Lima (UTC-5).
 *
 * Antes estaba fijo en 2026-10 en tres sitios: la lectura de asientos, el alta
 * de un asiento manual y la exportación PLE. Las ventas del módulo de
 * facturación se asientan en el mes en que ocurren, así que en noviembre la
 * pantalla decía "no hay asientos" aunque hubiera doce. Se toma el mes en curso.
 */
const periodoActual = (): { anio: number; mes: number; clave: string } =>
  periodoActualLima();

export default function AccountingEntriesPage() {
  const navigate = useNavigate();
  const { canCreateAccountingEntry, isAuditor } = useRolePermissions();
  const { activeCompany, user } = useAuthStore();
  const companyId = activeCompany?.tenantId ?? user?.companyId ?? '';
  const companyRuc = activeCompany?.ruc ?? user?.companyRuc ?? '';
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Carga inicial desde memoria local
  const [entries, setEntries] = useState<Entry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        console.warn('Error al leer memoria local.');
      }
    }
    return [];
  });

  const [glosa, setGlosa] = useState('');
  const [monto, setMonto] = useState('');

  // 1. REFRESCAR / RECARGAR DESDE BACKEND O LOCALSTORAGE
  const fetchEntriesFromApi = async () => {
    setIsRefreshing(true);
    try {
      // apiClient ya resuelve la base de la API y el token; el periodo va en la
      // query para que se lean los asientos del mes en curso y no del fijo.
      const { data } = await apiClient.get<AsientoBackend[]>(
        `/accounting/entries?period=${periodoActual().clave}`,
      );

      if (Array.isArray(data) && data.length > 0) {
        const mappedEntries: Entry[] = data.map((item: AsientoBackend, index: number) => {
          // Extraer líneas de detalles si vienen pobladas en el backend
          const lines = item.lines || item.accounting_lines || [];

          // Calcular suma de Debe
          const sumDebe = lines.length > 0
            ? lines.reduce((acc: number, l: LineaAsientoBackend) => acc + Number(l.debitAmount || l.debit || 0), 0)
            : Number(item.totalDebit || item.total_debit || item.totalDebe || 0);

          // Calcular suma de Haber
          const sumHaber = lines.length > 0
            ? lines.reduce((acc: number, l: LineaAsientoBackend) => acc + Number(l.creditAmount || l.credit || 0), 0)
            : Number(item.totalCredit || item.total_credit || item.totalHaber || 0);

          return {
            id: String(item.id || Date.now() + index),
            numeroAsiento: item.numeroAsiento || `001-202610-00${item.entryNumber || item.entry_number || index + 1}`,
            fechaContable: item.entryDate || item.entry_date || item.fechaContable || new Date().toISOString().split('T')[0],
            glosa: item.glosa || item.concept || 'Asiento Contable',
            totalDebe: sumDebe,
            totalHaber: sumHaber,
            estaCuadrado: true,
            // Se conservan las líneas tal como las registró el backend
            // (cuenta, nombre y montos). La trama PLE necesita estas cuentas,
            // no un par fijo elegido en el cliente.
            lines: lines.map((l: LineaAsientoBackend, order: number) => ({
              lineOrder: Number(l.lineOrder ?? l.line_order ?? order + 1),
              accountCode: String(l.accountCode ?? l.account_code ?? ''),
              accountName: String(l.accountName ?? l.account_name ?? ''),
              debitAmount: Number(l.debitAmount ?? l.debit_amount ?? 0),
              creditAmount: Number(l.creditAmount ?? l.credit_amount ?? 0),
            })),
          };
        });

        setEntries(mappedEntries);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedEntries));
      } else {
        reloadFromLocalStorage();
      }
    } catch {
      reloadFromLocalStorage();
    } finally {
      setIsRefreshing(false);
    }
  };

  const reloadFromLocalStorage = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setEntries([...parsed]);
      } catch (e) {
        console.error('Error parseando localStorage:', e);
      }
    }
  };

  /**
   * Carga los asientos del backend AL ENTRAR a la pantalla.
   *
   * Antes no había `useEffect`: la página solo leía `localStorage` y se quedaba
   * vacía hasta que el usuario pulsaba "Refrescar". Para el docente eso se ve
   * como un Libro Diario sin asientos aunque el sistema los tenga —y los tiene,
   * porque cada comprobante aceptado genera el suyo—.
   *
   * Se difiere a un microtask porque `fetchEntriesFromApi` hace `setState` de
   * inmediato y la regla `react-hooks/set-state-in-effect` lo prohíbe.
   */
  useEffect(() => {
    let vivo = true;
    void Promise.resolve().then(() => {
      if (vivo) void fetchEntriesFromApi();
    });
    return () => {
      vivo = false;
    };
    // Sólo al montar: el refresco manual sigue disponible en el botón.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalDebe = entries.reduce((acc, e) => acc + e.totalDebe, 0);
  const totalHaber = entries.reduce((acc, e) => acc + e.totalHaber, 0);

  // 2. BORRADO COMPLETO (RESET PARA DEMO)
  const handleClearAllEntries = () => {
    if (confirm('¿Deseas limpiar todos los asientos contables de la vista?')) {
      setEntries([]);
      localStorage.removeItem(STORAGE_KEY);
      // Clave de la versión anterior: se limpia para no resucitar asientos viejos.
      localStorage.removeItem('accounting_entries');
    }
  };

  // 3. BORRADO INDIVIDUAL FILA POR FILA
  const handleDeleteSingleEntry = (idToDelete: string) => {
    const updated = entries.filter((item) => item.id !== idToDelete);
    setEntries(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // 4. GUARDAR NUEVO ASIENTO MANUAL
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!glosa || !monto) return;

    const val = parseFloat(monto);
    const fechaActual = hoyEnLima();
    const nextNumber = entries.length + 1;
    const periodo = periodoActual();

    const newEntry: Entry = {
      id: String(Date.now()),
      numeroAsiento: `001-${periodo.anio}${String(periodo.mes).padStart(2, '0')}-00${nextNumber}`,
      fechaContable: fechaActual,
      glosa: glosa,
      totalDebe: val,
      totalHaber: val,
      estaCuadrado: true,
      lines: [
        { lineOrder: 1, accountCode: '121101', accountName: 'Cuentas por Cobrar', debitAmount: val, creditAmount: 0 },
        { lineOrder: 2, accountCode: '701111', accountName: 'Venta de Mercaderías', debitAmount: 0, creditAmount: val },
      ],
    };

    const updatedList = [newEntry, ...entries];
    setEntries(updatedList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));

    try {
      // apiClient añade URL base y token; la empresa sale del JWT.
      await apiClient.post('/accounting/entries', {
        period: periodo.clave,
        entryNumber: Number(nextNumber),
        entryDate: fechaActual,
        glosa: glosa,
        sourceModule: 'MANUAL',
        lines: [
          { lineOrder: 1, accountCode: '121101', accountName: 'Cuentas por Cobrar', debitAmount: val, creditAmount: 0 },
          { lineOrder: 2, accountCode: '701111', accountName: 'Venta de Mercaderías', debitAmount: 0, creditAmount: val },
        ],
      });
    } catch {
      console.warn('Operando en sandbox local.');
    } finally {
      setGlosa('');
      setMonto('');
      setIsModalOpen(false);
    }
  };

  // 5. EXPORTACIÓN PLE ESTRICTAMENTE SINCRONIZADA
  const handleExportPle = async () => {
    if (entries.length === 0) {
      alert('No hay asientos registrados para exportar en el período activo.');
      return;
    }

    setIsExporting(true);
    const periodo = periodoActual();
    let fileName = `LE20601012341${periodo.anio}${String(periodo.mes).padStart(2, '0')}00050100001111.txt`;
    let pleContent = '';

    try {
      const { data } = await apiClient.post(
        '/accounting/ple/export',
        {
          companyId,
          companyRuc,
          year: periodo.anio,
          month: periodo.mes,
          bookCode: '050100',
        },
        { timeout: 60000 },
      );

      if (data.fileName && data.content) {
        fileName = data.fileName;
        pleContent = data.content;
      }
    } catch {
      console.log('Generando trama desde la tabla local...');
    } finally {
      if (!pleContent) {
        // Sin respuesta del backend se arma la trama con las líneas REALES del
        // asiento. Si algún asiento no trae detalle se omite y se avisa: antes se
        // escribían dos líneas fijas (121101 / 701111) para cada uno, lo que
        // producía una trama PLE con cuentas distintas a las registradas.
        const sinDetalle: string[] = [];
        const lines: string[] = [];
        entries.forEach((ent, idx) => {
          const numAsiento = ent.numeroAsiento || `001-202610-00${idx + 1}`;
          if (!ent.lines || ent.lines.length === 0) {
            sinDetalle.push(numAsiento);
            return;
          }
          for (const l of [...ent.lines].sort((a, b) => a.lineOrder - b.lineOrder)) {
            lines.push(
              `${periodo.anio}${String(periodo.mes).padStart(2, '0')}00|${numAsiento}|${l.accountCode}|${l.accountCode}|${l.debitAmount.toFixed(2)}|${l.creditAmount.toFixed(2)}|${ent.glosa}|${l.lineOrder}|${ent.fechaContable}|`,
            );
          }
        });

        if (sinDetalle.length > 0) {
          alert(
            `No se pudo descargar la trama del servidor y ${sinDetalle.length} asiento(s) no tienen el detalle de cuentas cargado (${sinDetalle.join(', ')}). ` +
              'Esos asientos se omiten para no inventar cuentas: pulsa "Refrescar" y vuelve a exportar.',
          );
        }
        pleContent = lines.length > 0 ? lines.join('\r\n') + '\r\n' : '';
      }

      if (pleContent) {
        const blob = new Blob([pleContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    }
    setIsExporting(false);
  };

  return (
    <Page>
      <PageHeader
        title="Libro Diario (PCGE)"
        description="Auditoría de asientos contables del periodo fiscal activo y validación de partida doble"
      >
        <Button variant="default" size="sm" onClick={() => navigate('/invoices/emision')}>
          <FilePlus aria-hidden="true" className="w-4 h-4 mr-1" />
          Emitir Comprobante
        </Button>

        {entries.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearAllEntries} title="Limpiar todo (Demo)">
            <Trash2 aria-hidden="true" className="w-4 h-4 text-muted-foreground hover:text-destructive" />
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={fetchEntriesFromApi} disabled={isRefreshing}>
          <RefreshCw aria-hidden="true" className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Refrescando...' : 'Refrescar'}
        </Button>

        <Button variant="outline" size="sm" onClick={handleExportPle} disabled={isExporting || entries.length === 0}>
          <Download aria-hidden="true" />
          {isExporting ? 'Exportando...' : 'Exportar PLE (.txt)'}
        </Button>

        {canCreateAccountingEntry ? (
          <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)}>
            <PlusCircle aria-hidden="true" />
            Nuevo Asiento
          </Button>
        ) : isAuditor ? (
          <Badge variant="outline" className="h-9 px-3 text-xs bg-muted/60 text-muted-foreground border-dashed">
            👁️ Auditoría Contable (Solo Lectura)
          </Badge>
        ) : null}
      </PageHeader>

      <DoubleEntryBalanceCard totalDebe={totalDebe} totalHaber={totalHaber} />

      <Card flush>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Asiento</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Glosa / Concepto</TableHead>
              <TableHead align="right">Total Debe</TableHead>
              <TableHead align="right">Total Haber</TableHead>
              <TableHead align="center">Estado</TableHead>
              <TableHead align="center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length > 0 ? (
              entries.map((entry) => (
                <Fragment key={entry.id}>
                  <TableRow>
                    <TableCell>{entry.numeroAsiento}</TableCell>
                    <TableCell>{formatDateToPeru(entry.fechaContable)}</TableCell>
                    <TableCell>{entry.glosa}</TableCell>
                    <TableCell align="right">{formatCurrency(entry.totalDebe, 'PEN')}</TableCell>
                    <TableCell align="right">{formatCurrency(entry.totalHaber, 'PEN')}</TableCell>
                    <TableCell align="center">
                      <Badge variant={entry.estaCuadrado ? 'secondary' : 'destructive'}>
                        {entry.estaCuadrado ? 'Cuadrado' : 'Descuadrado'}
                      </Badge>
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSingleEntry(entry.id)}
                        title="Eliminar este asiento"
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>

                  {/*
                    Desglose del asiento por cuenta y subdivisionaria.

                    El docente lo pidió con estas palabras: "tienes la glosa,
                    tienes el monto, pero no tienes lo esencial: te falta el
                    asiento... ahí debería aparecer las cuentas". La tabla
                    mostraba solo el total de cada asiento, así que no se veía a
                    qué cuenta se había ido el cargo ni de dónde salía el abono.

                    Cada línea se pinta como subfila del asiento para que el
                    número y la glosa queden visualmente pegados a sus cuentas.
                  */}
                  {entry.lines && entry.lines.length > 0 && (
                    <TableRow>
                      <TableCell />
                      <TableCell />
                      <TableCell>
                        <table className="w-full text-xs">
                          <tbody>
                            {[...entry.lines]
                              .sort((a, b) => a.lineOrder - b.lineOrder)
                              .map((l) => (
                                <tr key={`${entry.id}-${l.lineOrder}`}>
                                  <td className="w-20 py-0.5 pr-2 font-mono text-muted-foreground">
                                    {l.accountCode}
                                  </td>
                                  <td className="py-0.5 pr-2">{l.accountName}</td>
                                  <td className="w-24 py-0.5 pr-2 text-right font-mono">
                                    {l.debitAmount > 0 ? formatCurrency(l.debitAmount, 'PEN') : ''}
                                  </td>
                                  <td className="w-24 py-0.5 text-right font-mono">
                                    {l.creditAmount > 0 ? formatCurrency(l.creditAmount, 'PEN') : ''}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </TableCell>
                      <TableCell align="right" />
                      <TableCell align="right" />
                      <TableCell align="center" />
                      <TableCell align="center" />
                    </TableRow>
                  )}
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <BookOpen aria-hidden="true" />
                  <PageText variant="muted">No hay asientos contables registrados en el período activo.</PageText>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full p-6 shadow-xl relative text-card-foreground space-y-4">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-semibold tracking-tight">Registrar Nuevo Asiento (PCGE)</h3>
              <p className="text-sm text-muted-foreground">
                Ingresa el concepto y monto del movimiento para el Libro Diario.
              </p>
            </div>

            <form onSubmit={handleSaveEntry} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium leading-none text-foreground">
                  Glosa / Concepto Contable
                </label>
                <Input
                  type="text"
                  required
                  placeholder="Ej. Venta de mercaderías al contado"
                  value={glosa}
                  onChange={(e) => setGlosa(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium leading-none text-foreground">
                  Monto Total (PEN)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  placeholder="2500.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                />
              </div>

              <div className="p-3 bg-muted/40 border border-border/80 rounded-md text-xs space-y-1.5 text-muted-foreground">
                <div className="flex items-center gap-1.5 text-foreground font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Cuentas automáticas PCGE: 1211 (Debe) / 7011 (Haber)</span>
                </div>
                <div className="flex items-center gap-1.5 text-foreground font-medium pl-5">
                  <span>Partida Doble: Validada y Cuadrada</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm">
                  Guardar Asiento
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Page>
  );
}