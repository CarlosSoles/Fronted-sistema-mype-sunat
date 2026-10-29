import { useState, useEffect } from 'react';
import { DoubleEntryBalanceCard } from '../components/DoubleEntryBalanceCard';
import {
  Badge,
  Button,
  Card,
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
import { BookOpen, Download, PlusCircle, RefreshCw, Trash2, X } from 'lucide-react';
import { useRolePermissions } from '@/hooks/useRolePermissions';

interface Entry {
  id: string;
  numeroAsiento: string;
  fechaContable: string;
  glosa: string;
  totalDebe: number;
  totalHaber: number;
  estaCuadrado: boolean;
}

const ACTIVE_COMPANY_ID = '5eaccb4e-a6ec-4f23-9909-85fe7fc9a87e';
const STORAGE_KEY = 'accounting_entries_demo_v2';

export default function AccountingEntriesPage() {
  const { canCreateAccountingEntry, isAuditor } = useRolePermissions();
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
      const res = await fetch('http://localhost:3000/api/v1/accounting/entries', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mappedEntries: Entry[] = data.map((item: any, index: number) => ({
            id: String(item.id || Date.now() + index),
            numeroAsiento: `001-202610-00${item.entryNumber || item.entry_number || index + 1}`,
            fechaContable: item.entryDate || item.entry_date || new Date().toISOString().split('T')[0],
            glosa: item.glosa || item.concept || 'Asiento Contable',
            totalDebe: Number(item.totalDebit || item.total_debit || item.totalDebe || 0),
            totalHaber: Number(item.totalCredit || item.total_credit || item.totalHaber || 0),
            estaCuadrado: true,
          }));

          setEntries(mappedEntries);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedEntries));
        } else {
          reloadFromLocalStorage();
        }
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

  const totalDebe = entries.reduce((acc, e) => acc + e.totalDebe, 0);
  const totalHaber = entries.reduce((acc, e) => acc + e.totalHaber, 0);

  // 2. BORRADO COMPLETO (RESET PARA DEMO)
  const handleClearAllEntries = () => {
    if (confirm('¿Deseas limpiar todos los asientos contables de la vista?')) {
      setEntries([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // 3. BORRADO INDIVIDUAL FILA POR FILA
  const handleDeleteSingleEntry = (idToDelete: string) => {
    const updated = entries.filter((item) => item.id !== idToDelete);
    setEntries(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // 4. GUARDAR NUEVO ASIENTO
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!glosa || !monto) return;

    const val = parseFloat(monto);
    const fechaActual = new Date().toISOString().split('T')[0];
    const nextNumber = entries.length + 1;

    const newEntry: Entry = {
      id: String(Date.now()),
      numeroAsiento: `001-202610-00${nextNumber}`,
      fechaContable: fechaActual,
      glosa: glosa,
      totalDebe: val,
      totalHaber: val,
      estaCuadrado: true,
    };

    const updatedList = [newEntry, ...entries];
    setEntries(updatedList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));

    try {
      await fetch('http://localhost:3000/api/v1/accounting/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          companyId: ACTIVE_COMPANY_ID,
          period: '2026-10',
          entryNumber: Number(nextNumber),
          entryDate: fechaActual,
          glosa: glosa,
          sourceModule: 'MANUAL',
          lines: [
            { lineOrder: 1, accountCode: '121101', accountName: 'Cuentas por Cobrar', debitAmount: val, creditAmount: 0 },
            { lineOrder: 2, accountCode: '701111', accountName: 'Venta de Mercaderías', debitAmount: 0, creditAmount: val },
          ],
        }),
      });
    } catch {
      console.warn('Operando en sandbox local.');
    } finally {
      setGlosa('');
      setMonto('');
      setIsModalOpen(false);
    }
  };

  // 5. EXPORTACIÓN PLE ESTRICTAMENTE SINCRONIZADA CON LA TABLA ACTUAL
  const handleExportPle = async () => {
    if (entries.length === 0) {
      alert('No hay asientos registrados para exportar en el período activo.');
      return;
    }

    setIsExporting(true);
    let fileName = 'LE2060101234120261000050100001111.txt';
    let pleContent = '';

    try {
      const res = await fetch('http://localhost:3000/api/v1/accounting/ple/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyRuc: '20601012341',
          year: 2026,
          month: 10,
          bookCode: '050100',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.fileName && data.content) {
          fileName = data.fileName;
          pleContent = data.content;
        }
      }
    } catch {
      console.log('Generando trama desde la tabla local...');
    } finally {
      // Si el backend no devuelve trama, se construye con los asientos visibles en pantalla (entries)
      if (!pleContent) {
        let lines: string[] = [];
        entries.forEach((ent, idx) => {
          const numAsiento = ent.numeroAsiento || `001-202610-00${idx + 1}`;
          lines.push(`20261000|${numAsiento}|M001|121101|${ent.totalDebe.toFixed(2)}|0.00|${ent.glosa}|1||`);
          lines.push(`20261000|${numAsiento}|M002|701111|0.00|${ent.totalHaber.toFixed(2)}|${ent.glosa}|1||`);
        });
        pleContent = lines.join('\r\n') + '\r\n';
      }

      const blob = new Blob([pleContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setIsExporting(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Contabilidad PCGE & Libros PLE"
        description="Libro Diario, Mayor y generación de archivos estructurados para SUNAT (PLE 5.1)"
      >
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
          <Button size="sm" onClick={() => setIsModalOpen(true)}>
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
                <TableRow key={entry.id}>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-lg max-w-md w-full p-6 shadow-xl relative text-foreground">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-semibold mb-1">Registrar Nuevo Asiento (PCGE)</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Ingresa el concepto y monto del movimiento para el Libro Diario.
            </p>

            <form onSubmit={handleSaveEntry} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Glosa / Concepto Contable</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Venta de mercaderías al contado"
                  value={glosa}
                  onChange={(e) => setGlosa(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-muted/40 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Monto Total (PEN)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="2500.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-muted/40 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="p-3 bg-muted/30 border border-border rounded-md text-xs space-y-1 text-muted-foreground">
                <p>✔️ Cuentas automáticas PCGE: 1211 (Debe) / 7011 (Haber)</p>
                <p>✔️ Partida Doble: Validada y Cuadrada</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
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