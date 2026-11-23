import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Page,
  PageHeader,
  Button,
  Card,
  Input,
  Badge,
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui';
import {
  BookOpen,
  Plus,
  Trash2,
  Upload,
  Download,
  FileSpreadsheet,
  Search,
  Boxes,
  Package,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Building2,
  CalendarDays,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { inventoryLedgerApi } from '../services/inventoryLedgerApi';
import { inventoryApi } from '../services/inventoryApi';
import { accountingApi } from '@/modules/accounting/services/accountingApi';
import { type InventoryMovement } from '../types/inventory.types';

const today = () => new Date().toISOString().slice(0, 10);

const apiError = (error: unknown): string => {
  const err = error as { response?: { data?: { message?: unknown } }; message?: string };
  const message = err.response?.data?.message;
  if (Array.isArray(message)) return message.join(' · ');
  if (typeof message === 'string') return message;
  return err.message || 'No se pudo cargar el saldo inicial.';
};

export default function InventoryOpeningPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialDate = today();
  const initialPeriod = initialDate.slice(0, 7);

  const [form, setForm] = useState({
    openingDate: initialDate,
    warehouseCode: 'ALM-01',
    period: initialPeriod,
    documentTypeCode: '00',
    documentSerial: 'ACTA',
    documentNumber: '2026-001',
    openingReason: 'APORTE_CAPITAL',
    generateAccountingEntry: true,
    notes: '',
  });

  const [items, setItems] = useState([{ sku: '', quantity: 0, unitCost: 0 }]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [historySearchTerm, setHistorySearchTerm] = useState('');

  const warehouses = useQuery({
    queryKey: ['inventory', 'warehouses'],
    queryFn: inventoryLedgerApi.getWarehouses,
  });

  const stocksQuery = useQuery({
    queryKey: ['inventory', 'stocks'],
    queryFn: inventoryApi.getStockBalances,
  });

  const movementsQuery = useQuery<{ total: number; items: InventoryMovement[] }>({
    queryKey: ['inventory', 'movements'],
    queryFn: () => inventoryApi.listMovements(),
  });

  const periodsQuery = useQuery({
    queryKey: ['accounting-periods'],
    queryFn: () => accountingApi.getPeriods(),
  });

  const catalogProducts = stocksQuery.data?.balances ?? [];

  // Saldos iniciales ya registrados en el sistema (Operación 16)
  const openingMovements: InventoryMovement[] = (movementsQuery.data?.items ?? []).filter(
    (m: InventoryMovement) => m.operationTypeCode === '16'
  );

  const filteredOpeningMovements = openingMovements.filter((m: InventoryMovement) => {
    if (!historySearchTerm.trim()) return true;
    const term = historySearchTerm.toLowerCase();
    const sku = (m.sku || '').toLowerCase();
    const desc = (m.description || '').toLowerCase();
    const num = (m.movementNumber || '').toLowerCase();
    const wh = (m.warehouseCode || '').toLowerCase();
    const doc = (m.documentNumber || '').toLowerCase();
    const ser = (m.documentSerial || '').toLowerCase();
    const notes = (m.notes || '').toLowerCase();
    return (
      sku.includes(term) ||
      desc.includes(term) ||
      num.includes(term) ||
      wh.includes(term) ||
      doc.includes(term) ||
      ser.includes(term) ||
      notes.includes(term)
    );
  });

  const totalOpeningUnitsRegistered = openingMovements.reduce(
    (acc: number, m: InventoryMovement) => acc + m.quantity,
    0
  );
  const totalOpeningValueRegistered = openingMovements.reduce(
    (acc: number, m: InventoryMovement) => acc + m.totalCost,
    0
  );

  // Validación de estado del período contable
  const currentPeriodRecord = (periodsQuery.data || []).find((p) => p.period === form.period);
  const isPeriodClosed = currentPeriodRecord?.status === 'CERRADO';

  const handleDateChange = (dateStr: string) => {
    const derivedPeriod = dateStr.slice(0, 7);
    setForm((prev) => ({
      ...prev,
      openingDate: dateStr,
      period: derivedPeriod,
    }));
  };

  const mutation = useMutation({
    mutationFn: () => {
      if (isPeriodClosed) {
        throw new Error(`El período contable ${form.period} está CERRADO. Debe abrirlo en Contabilidad antes de registrar saldos.`);
      }
      return inventoryLedgerApi.createOpening({
        ...form,
        items: items
          .filter((i) => i.sku.trim() && i.quantity > 0)
          .map((i) => ({
            sku: i.sku.trim().toUpperCase(),
            quantity: Number(i.quantity),
            unitCost: Number(i.unitCost),
          })),
      });
    },
    onSuccess: (result: any) => {
      setError(null);
      setSuccess(
        `Saldo inicial cargado exitosamente para ${result.items?.length ?? items.length} producto(s) en ${
          result.warehouseCode ?? form.warehouseCode
        }. Asiento contable de apertura generado con Doc ${form.documentSerial}-${form.documentNumber} en el período ${form.period}.`
      );
      queryClient.invalidateQueries({ queryKey: ['inventory', 'stocks'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'kardex'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-entries'] });
      setItems([{ sku: '', quantity: 0, unitCost: 0 }]);
    },
    onError: (e) => {
      setSuccess(null);
      setError(apiError(e));
    },
  });

  const updateItem = (
    index: number,
    patch: Partial<{ sku: string; quantity: number; unitCost: number }>
  ) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const batchTotalUnits = items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
  const batchTotalValue = items.reduce(
    (acc, i) => acc + (Number(i.quantity) || 0) * (Number(i.unitCost) || 0),
    0
  );

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length <= 1) {
          setError('El archivo CSV no contiene registros de inventario.');
          return;
        }

        const newItems: Array<{ sku: string; quantity: number; unitCost: number }> = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
          if (cols.length >= 3) {
            const sku = cols[0].toUpperCase();
            const quantity = parseFloat(cols[1]);
            const unitCost = parseFloat(cols[2]);

            if (sku && !isNaN(quantity) && !isNaN(unitCost) && quantity > 0) {
              newItems.push({ sku, quantity, unitCost });
            }
          }
        }

        if (newItems.length > 0) {
          const catalogSkus = new Set(catalogProducts.map((p) => p.sku.toUpperCase()));
          if (catalogSkus.size > 0) {
            const missingSkus = newItems
              .map((item) => item.sku)
              .filter((sku) => !catalogSkus.has(sku));
            if (missingSkus.length > 0) {
              const uniqueMissing = Array.from(new Set(missingSkus));
              const preview = uniqueMissing.slice(0, 5).join(', ');
              const extra = uniqueMissing.length > 5 ? ` y ${uniqueMissing.length - 5} más` : '';
              setError(
                `Atención: Los siguientes SKUs no están registrados en el catálogo de existencias: ${preview}${extra}. Regístrelos primero en el catálogo antes de asentar el saldo inicial.`
              );
              return;
            }
          }
          setItems(newItems);
          setError(null);
          setSuccess(`Se cargaron ${newItems.length} registros del archivo CSV.`);
        } else {
          setError('No se encontraron líneas válidas (Formato esperado: SKU, Cantidad, CostoUnitario).');
        }
      } catch (err) {
        setError('Error al procesar el archivo CSV.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadCsvTemplate = () => {
    const header = 'SKU,Cantidad,CostoUnitario\n';
    const sample = 'FIE-001,100,28.50\nCLV-2,50,4.20\nALM-ARQ-16,30,8.90\n';
    const blob = new Blob([header + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_saldo_inicial.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Page>
      <PageHeader
        title="Saldo Inicial de Inventario (Op. 16 SUNAT)"
        description="Apertura formal de existencias por período contable amparado en documento contable con asiento en Libro Diario."
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCsvTemplate}
            className="gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Descargar Plantilla CSV
          </Button>

          <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
            <Link to="/inventory/movements">
              <Boxes className="h-3.5 w-3.5" />
              Ver Kardex Completo
            </Link>
          </Button>
        </div>
      </PageHeader>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Productos con Saldo Inicial</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{openingMovements.length}</p>
          </div>
          <div className="p-3 rounded-full bg-primary/10 text-primary">
            <Package className="h-5 w-5" />
          </div>
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Total Unidades Iniciales</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400 font-mono">
              +{totalOpeningUnitsRegistered.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-600">
            <Boxes className="h-5 w-5" />
          </div>
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Valor Total Apertura (PEN)</p>
            <p className="text-2xl font-bold mt-1 text-primary font-mono">
              S/ {totalOpeningValueRegistered.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 rounded-full bg-primary/10 text-primary">
            <DollarSign className="h-5 w-5" />
          </div>
        </Card>
      </div>

      <Alert className="border-blue-500/30 bg-blue-500/10 text-xs">
        <AlertTitle className="font-semibold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
          <BookOpen className="h-4 w-4" /> Normativa de Apertura Contable y Kardex SUNAT (Art. 35 LIR / NIC 2)
        </AlertTitle>
        <AlertDescription className="text-blue-900/80 dark:text-blue-200/90 leading-relaxed">
          El saldo inicial se asienta en el Kardex permanente valorizado (PLE 13.1, Operación 16) vinculado a un <strong>Período Contable formal</strong> y amparado por un <strong>Documento Contable numerado</strong> (Acta de inventario, escritura de constitución o comprobante de traspaso por quiebra/liquidación).
        </AlertDescription>
      </Alert>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Formulario de Carga */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Formulario de Carga de Apertura
            </h3>
            <p className="text-xs text-muted-foreground">
              Datos contables del período, documento de sustento e inventario valorizado.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleCsvUpload}
              accept=".csv"
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-1.5 text-xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              Cargar archivo CSV
            </Button>
          </div>
        </div>

        {/* Sección 1: Período y Almacén */}
        <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3 p-3 rounded-lg border bg-muted/20">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold uppercase text-muted-foreground text-[10px]">Fecha de corte *</span>
            </div>
            <Input
              type="date"
              value={form.openingDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="h-8 text-xs font-mono"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold uppercase text-muted-foreground text-[10px] flex items-center gap-1">
                <CalendarDays className="h-3 w-3 text-primary" />
                Período Contable *
              </span>
              {currentPeriodRecord ? (
                isPeriodClosed ? (
                  <Badge variant="destructive" className="text-[9px] px-1 py-0">Cerrado</Badge>
                ) : (
                  <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0">Abierto</Badge>
                )
              ) : (
                <span className="text-[9px] text-muted-foreground">Derivado</span>
              )}
            </div>
            <Input
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value.trim() })}
              placeholder="AAAA-MM (ej: 2026-01)"
              className="h-8 text-xs font-mono font-bold"
            />
          </div>

          <div>
            <p className="mb-1 font-semibold uppercase text-muted-foreground text-[10px] flex items-center gap-1">
              <Building2 className="h-3 w-3 text-primary" />
              Almacén de destino *
            </p>
            <select
              className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-semibold"
              value={form.warehouseCode}
              onChange={(e) => setForm({ ...form, warehouseCode: e.target.value })}
            >
              {(warehouses.data ?? [{ warehouse_code: 'ALM-01', description: 'Almacén principal' }]).map((w) => (
                <option key={w.warehouse_code} value={w.warehouse_code}>
                  {w.warehouse_code} — {w.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sección 2: Documento de Sustento Contable (Observación Docente) */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs p-3 rounded-lg border bg-muted/10">
          <div>
            <p className="mb-1 font-semibold uppercase text-muted-foreground text-[10px]">Doc. Sustento (Tabla 10) *</p>
            <select
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-medium"
              value={form.documentTypeCode}
              onChange={(e) => setForm({ ...form, documentTypeCode: e.target.value })}
            >
              <option value="00">00 - Documento Interno / Balance Apertura</option>
              <option value="01">01 - Factura (Compra por Quiebra/Liquidación)</option>
              <option value="46">46 - Formulario Declaración Jurada Inicial</option>
              <option value="09">09 - Guía de Remisión de Traslado</option>
              <option value="99">99 - Otros Documentos de Sustento</option>
            </select>
          </div>

          <div>
            <p className="mb-1 font-semibold uppercase text-muted-foreground text-[10px]">Serie del Documento *</p>
            <Input
              value={form.documentSerial}
              onChange={(e) => setForm({ ...form, documentSerial: e.target.value.toUpperCase() })}
              placeholder="ej: ACTA, F001, EP"
              className="h-8 text-xs font-mono uppercase font-bold"
              required
            />
          </div>

          <div>
            <p className="mb-1 font-semibold uppercase text-muted-foreground text-[10px]">Número de Documento *</p>
            <Input
              value={form.documentNumber}
              onChange={(e) => setForm({ ...form, documentNumber: e.target.value.toUpperCase() })}
              placeholder="ej: 2026-001, 0004589"
              className="h-8 text-xs font-mono font-bold"
              required
            />
          </div>

          <div>
            <p className="mb-1 font-semibold uppercase text-muted-foreground text-[10px]">Origen / Causa de Mercadería *</p>
            <select
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-medium"
              value={form.openingReason}
              onChange={(e) => setForm({ ...form, openingReason: e.target.value })}
            >
              <option value="APORTE_CAPITAL">🏢 Aporte de capital de socios (Constitución)</option>
              <option value="LIQUIDACION_QUIEBRA">⚠️ Adquisición por quiebra/liquidación previa</option>
              <option value="EJERCICIO_ANTERIOR">📅 Apertura de ejercicio (Arrastre previo)</option>
              <option value="REGULARIZACION">📋 Regularización de inventario físico inicial</option>
            </select>
          </div>
        </div>

        {/* Sección 3: Observaciones e Integración Contable */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs items-center">
          <div className="sm:col-span-2">
            <p className="mb-1 font-semibold uppercase text-muted-foreground text-[10px]">Observaciones / Glosa Contable</p>
            <Input
              placeholder="ej: Aporte en bienes según Escritura Pública N° 0412 de constitución"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="h-8 text-xs"
            />
          </div>

          <div className="p-2.5 rounded-md border bg-muted/30 flex items-center gap-2.5 mt-3 sm:mt-0">
            <input
              type="checkbox"
              id="generateAccountingEntry"
              checked={form.generateAccountingEntry}
              onChange={(e) => setForm({ ...form, generateAccountingEntry: e.target.checked })}
              className="h-4 w-4 rounded border-input text-primary focus:ring-ring cursor-pointer"
            />
            <label htmlFor="generateAccountingEntry" className="text-xs font-medium cursor-pointer leading-tight">
              Generar Asiento de Apertura (APE) en Libro Diario
              <span className="block text-[10px] text-muted-foreground">
                Debe 20111 ➔ Haber {form.openingReason === 'LIQUIDACION_QUIEBRA' ? '4699' : form.openingReason === 'EJERCICIO_ANTERIOR' ? '5911' : '5011'}
              </span>
            </label>
          </div>
        </div>

        {/* Tabla de Productos del Lote */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-muted-foreground text-[10px]">
              Productos a Aperturar ({items.length})
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setItems([...items, { sku: '', quantity: 0, unitCost: 0 }])}
              className="h-7 text-xs gap-1"
            >
              <Plus className="h-3 w-3" /> Agregar ítem
            </Button>
          </div>

          <div className="border rounded-md overflow-hidden bg-card">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Código SKU</th>
                  <th className="p-2.5 w-32 text-right">Cantidad</th>
                  <th className="p-2.5 w-36 text-right">Costo Unit. (PEN)</th>
                  <th className="p-2.5 w-36 text-right">Subtotal Valuado (PEN)</th>
                  <th className="p-2.5 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const subtotal = (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
                  const matchedCat = catalogProducts.find((p) => p.sku === item.sku);

                  return (
                    <tr key={index} className="border-t">
                      <td className="p-2">
                        {catalogProducts.length > 0 ? (
                          <div className="space-y-0.5">
                            <input
                              className="h-8 w-full rounded border border-input bg-background px-2 text-xs font-mono font-bold uppercase"
                              placeholder="SKU (ej. FIE-001, CLV-2)"
                              list={`catalog-skus-${index}`}
                              value={item.sku}
                              onChange={(e) => updateItem(index, { sku: e.target.value.toUpperCase() })}
                            />
                            <datalist id={`catalog-skus-${index}`}>
                              {catalogProducts.map((p) => (
                                <option key={p.sku} value={p.sku}>
                                  {p.sku} — {p.description}
                                </option>
                              ))}
                            </datalist>
                            {matchedCat && (
                              <p className="text-[10px] text-muted-foreground truncate">
                                {matchedCat.description} ({matchedCat.sunatUnitCode || 'NIU'})
                              </p>
                            )}
                          </div>
                        ) : (
                          <Input
                            placeholder="SKU (ej. FIE-001)"
                            value={item.sku}
                            onChange={(e) => updateItem(index, { sku: e.target.value.toUpperCase() })}
                            className="h-8 text-xs font-mono font-bold uppercase"
                          />
                        )}
                      </td>
                      <td className="p-2 text-right">
                        <Input
                          type="number"
                          step="0.0001"
                          min="0"
                          placeholder="0.00"
                          value={item.quantity || ''}
                          onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                          className="h-8 text-xs text-right font-mono font-semibold"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <Input
                          type="number"
                          step="0.0001"
                          min="0"
                          placeholder="0.0000"
                          value={item.unitCost || ''}
                          onChange={(e) => updateItem(index, { unitCost: Number(e.target.value) })}
                          className="h-8 text-xs text-right font-mono"
                        />
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        S/ {subtotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={items.length === 1}
                          onClick={() => setItems(items.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t bg-muted/40 font-bold">
                <tr>
                  <td className="p-2.5 uppercase text-[10px] text-muted-foreground">Total del Lote a Cargar:</td>
                  <td className="p-2.5 text-right font-mono text-xs">
                    {batchTotalUnits.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-2.5"></td>
                  <td className="p-2.5 text-right font-mono text-sm text-emerald-600 dark:text-emerald-400">
                    S/ {batchTotalValue.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || isPeriodClosed || items.every((i) => !i.sku.trim() || i.quantity <= 0)}
            className="gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            {mutation.isPending ? 'Cargando saldo inicial...' : 'Cargar Saldo Inicial Contable (Op. 16)'}
          </Button>
        </div>
      </Card>

      {/* Historial de Saldos Iniciales Registrados con Documento y Período */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Boxes className="h-5 w-5 text-primary" />
              Saldos Iniciales Registrados en el Sistema
            </h3>
            <p className="text-xs text-muted-foreground">
              Historial oficial de asientos de apertura (Op. 16 SUNAT) con documento legal de sustento y período contable.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por SKU, correlativo, documento o almacén..."
              value={historySearchTerm}
              onChange={(e) => setHistorySearchTerm(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>
        </div>

        <Card className="overflow-x-auto shadow-sm border rounded-xl">
          <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px]">
              <tr>
                <th className="p-3 whitespace-nowrap">Fecha de Corte</th>
                <th className="p-3 whitespace-nowrap">Período Contable</th>
                <th className="p-3">Almacén</th>
                <th className="p-3">N° Correlativo</th>
                <th className="p-3">Documento de Inicio</th>
                <th className="p-3">Origen / Causa</th>
                <th className="p-3">Código SKU</th>
                <th className="p-3">Descripción</th>
                <th className="p-3 text-right">Cantidad</th>
                <th className="p-3 text-right">Costo Unit. (PEN)</th>
                <th className="p-3 text-right">Total Valuado (PEN)</th>
                <th className="p-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {movementsQuery.isLoading ? (
                <tr>
                  <td colSpan={12} className="p-6 text-center text-muted-foreground">
                    Cargando historial de saldos iniciales...
                  </td>
                </tr>
              ) : filteredOpeningMovements.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-6 text-center text-muted-foreground">
                    No se registran saldos iniciales con los criterios de búsqueda.
                  </td>
                </tr>
              ) : (
                filteredOpeningMovements.map((m: InventoryMovement) => {
                  const movDate = new Date(m.movementDate);
                  const movPeriod = movDate.toISOString().slice(0, 7);
                  const isLiquidacion = m.notes?.includes('LIQUIDACION_QUIEBRA');
                  const isEjercicio = m.notes?.includes('EJERCICIO_ANTERIOR');

                  return (
                    <tr key={m.id || m.movementNumber} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono whitespace-nowrap">
                        {movDate.toLocaleDateString('es-PE')}
                      </td>
                      <td className="p-3 font-mono font-bold text-foreground whitespace-nowrap">
                        <Badge variant="outline" className="font-mono bg-muted/40 text-[10px]">
                          {movPeriod}
                        </Badge>
                      </td>
                      <td className="p-3 font-semibold">{m.warehouseCode || 'ALM-01'}</td>
                      <td className="p-3 font-mono font-semibold text-primary">{m.movementNumber}</td>
                      <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">
                        <span className="text-[10px] px-1 py-0.5 rounded bg-muted/80 text-foreground font-semibold mr-1">
                          [{m.documentTypeCode || '00'}]
                        </span>
                        <strong className="text-foreground">
                          {m.documentSerial ? `${m.documentSerial}-` : ''}{m.documentNumber || 'SI-2026'}
                        </strong>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {isLiquidacion ? (
                          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 bg-amber-500/10">
                            Quiebra / Liquidación
                          </Badge>
                        ) : isEjercicio ? (
                          <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-600 bg-blue-500/10">
                            Arrastre de Ejercicio
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
                            Aporte de Capital
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-primary">{m.sku}</td>
                      <td className="p-3 text-foreground truncate max-w-[200px]" title={m.description}>
                        {m.description || '—'}
                      </td>
                      <td className="p-3 text-right font-bold font-mono">
                        {m.quantity.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-mono">
                        S/ {m.unitCost.toLocaleString('es-PE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        S/ {m.totalCost.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="default" className="text-[10px] bg-emerald-600">
                          CONFIRMADO
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </Page>
  );
}
