import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Receipt,
  Plus,
  Search,
  Eye,
  History,
  AlertCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Page,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { purchasesApi } from '../services/purchasesApi';
import type { PurchaseRecord, PurchasePaymentRecord } from '../types/purchases.types';
import { NationalPurchaseModal } from '../components/NationalPurchaseModal';
import { PurchaseDetailModal } from '../components/PurchaseDetailModal';
import { formatDateTimeToPeru } from '@/lib/formatters';

const money = (n: number) =>
  `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PurchasesPage() {
  const queryClient = useQueryClient();

  // Estados de control de modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [detailPurchase, setDetailPurchase] = useState<PurchaseRecord | null>(null);
  const [paymentPurchase, setPaymentPurchase] = useState<PurchaseRecord | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PurchasePaymentRecord[] | null>(null);

  // Estados para formulario de pago
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('TRANSFERENCIA');
  const [paymentBank, setPaymentBank] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDIENTE' | 'PAGO_PARCIAL' | 'PAGADA'>('ALL');

  // Consulta de Compras
  const { data, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['purchases-module-list'],
    queryFn: () => purchasesApi.listPurchases(),
  });

  // Mutación de Pago
  const paymentMutation = useMutation({
    mutationFn: () =>
      purchasesApi.payPurchase(paymentPurchase!.id, {
        amount: paymentAmount ? Number(paymentAmount) : undefined,
        paymentMethod,
        bankName: paymentMethod === 'EFECTIVO' ? undefined : paymentBank || undefined,
      }),
    onSuccess: async () => {
      setPaymentPurchase(null);
      setErrorMessage(null);
      await queryClient.invalidateQueries({ queryKey: ['purchases-module-list'] });
      await queryClient.invalidateQueries({ queryKey: ['purchase-payables'] });
      await queryClient.invalidateQueries({ queryKey: ['national-purchases'] });
      await queryClient.invalidateQueries({ queryKey: ['accounting-entries'] });
    },
    onError: (err: any) => {
      setErrorMessage(
        err?.response?.data?.message || 'No se pudo registrar el pago. Verifica el saldo y el monto.',
      );
    },
  });

  const handleOpenPayments = async (p: PurchaseRecord) => {
    try {
      const pagos = await purchasesApi.listPayments(p.id);
      setPaymentHistory(pagos);
    } catch {
      setErrorMessage('No se pudo cargar el historial de pagos de la compra.');
    }
  };

  const handleOpenPayModal = (p: PurchaseRecord) => {
    setPaymentPurchase(p);
    setPaymentMethod('TRANSFERENCIA');
    setPaymentBank('');
    const saldo = p.pendingAmount ?? p.totalAmount - (p.paidAmount ?? 0);
    setPaymentAmount(String(saldo > 0 ? saldo.toFixed(2) : ''));
    setErrorMessage(null);
  };

  // Filtrado de compras
  const items = data?.items ?? [];
  const filteredPurchases = useMemo(() => {
    return items.filter((p) => {
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      const term = searchTerm.trim().toLowerCase();
      const matchSearch =
        !term ||
        p.supplierName.toLowerCase().includes(term) ||
        p.supplierDocNumber.toLowerCase().includes(term) ||
        `${p.documentSerial}-${p.documentNumber}`.toLowerCase().includes(term) ||
        p.purchaseNumber.toLowerCase().includes(term);
      return matchStatus && matchSearch;
    });
  }, [items, searchTerm, statusFilter]);

  // Cálculos para tarjetas de métricas
  return (
    <Page>
      <PageHeader
        title="Módulo de Compras"
        description="Gestión integral de compras nacionales, comprobantes de proveedores, asientos contables de naturaleza/destino y cuentas por pagar"
      >
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
        >
          <Plus className="h-4 w-4" />
          + Nueva Compra Nacional
        </Button>
      </PageHeader>

      {(errorMessage || queryError) && (
        <Card className="p-3 mb-4 text-xs text-destructive border-destructive/30 bg-destructive/5 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage || 'Error al conectar con el servicio de compras.'}</span>
        </Card>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por RUC, proveedor, serie-número o compra..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 text-xs h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs"
          >
            <option value="ALL">Todos los estados</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="PAGO_PARCIAL">Pago parcial</option>
            <option value="PAGADA">Pagadas</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9 text-xs">
            Actualizar
          </Button>
        </div>
      </div>

      {/* Tabla Principal de Compras */}
      <Card flush>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Compra</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Almacén</TableHead>
              <TableHead>Registrado</TableHead>
              <TableHead align="right">Total Factura</TableHead>
              <TableHead align="right">Pagado</TableHead>
              <TableHead align="right">Saldo CxP</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead align="right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  Cargando compras registradas...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filteredPurchases.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  No se encontraron comprobantes de compra.
                </TableCell>
              </TableRow>
            )}
            {filteredPurchases.map((p) => {
              const saldo = p.pendingAmount ?? p.totalAmount - (p.paidAmount ?? 0);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs font-semibold text-emerald-600">
                    {p.purchaseNumber}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-xs text-foreground">{p.supplierName}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      RUC: {p.supplierDocNumber}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {p.documentSerial}-{p.documentNumber}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(p.issueDate).toLocaleDateString('es-PE')}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{p.warehouseCode}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.createdAt ? formatDateTimeToPeru(p.createdAt) : '-'}</TableCell>
                  <TableCell align="right" className="font-mono text-xs font-semibold">
                    {money(p.totalAmount)}
                  </TableCell>
                  <TableCell align="right" className="font-mono text-xs text-emerald-600">
                    {money(p.paidAmount ?? 0)}
                  </TableCell>
                  <TableCell
                    align="right"
                    className={`font-mono text-xs font-bold ${
                      saldo > 0 ? 'text-amber-600' : 'text-muted-foreground'
                    }`}
                  >
                    {money(saldo)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        p.status === 'PAGADA'
                          ? 'default'
                          : p.status === 'PAGO_PARCIAL'
                          ? 'secondary'
                          : 'outline'
                      }
                      className="text-[10px]"
                    >
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell align="right">
                    <div className="flex justify-end gap-1 items-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDetailPurchase(p)}
                        className="h-7 px-2 text-xs gap-1"
                        title="Ver detalle de mercaderías"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Detalle
                      </Button>
                      {(p.paidAmount ?? 0) > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenPayments(p)}
                          className="h-7 px-2 text-xs gap-1"
                          title="Ver historial de pagos"
                        >
                          <History className="h-3.5 w-3.5" />
                          Pagos
                        </Button>
                      )}
                      {p.status !== 'PAGADA' && p.status !== 'ANULADA' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenPayModal(p)}
                          className="h-7 px-2 text-xs gap-1 text-emerald-600 border-emerald-600/40 hover:bg-emerald-50"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Pagar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Modal Registrar Compra */}
      <NationalPurchaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          refetch();
          void queryClient.invalidateQueries({ queryKey: ['purchase-payables'] });
          void queryClient.invalidateQueries({ queryKey: ['national-purchases'] });
          void queryClient.invalidateQueries({ queryKey: ['inventory-stocks'] });
          void queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
          void queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
          void queryClient.invalidateQueries({ queryKey: ['accounting-entries'] });
        }}
      />

      {/* Modal Ver Detalle de Compra */}
      <PurchaseDetailModal
        purchase={detailPurchase}
        onClose={() => setDetailPurchase(null)}
        onRegisterPayment={(p) => handleOpenPayModal(p)}
      />

      {/* Modal Registrar Pago / Abono */}
      <Dialog
        open={paymentPurchase !== null}
        onOpenChange={(open) => {
          if (!open) setPaymentPurchase(null);
        }}
      >
        <DialogContent className="text-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4 text-emerald-600" /> Registrar Abono a Proveedor
            </DialogTitle>
            <DialogDescription className="text-xs">
              {paymentPurchase?.purchaseNumber} · {paymentPurchase?.supplierName}
              <br />
              Saldo pendiente CxP:{' '}
              <strong className="text-foreground">
                {paymentPurchase
                  ? money(
                      paymentPurchase.pendingAmount ??
                        paymentPurchase.totalAmount - (paymentPurchase.paidAmount ?? 0),
                    )
                  : ''}
              </strong>
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <Alert variant="destructive" className="py-2 text-xs">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label htmlFor="purchase-pay-amount" className="font-medium text-foreground">
                Monto a pagar (S/) *
              </label>
              <Input
                id="purchase-pay-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="h-8 text-xs font-mono font-bold"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="purchase-pay-method" className="font-medium text-foreground">
                Medio de Pago *
              </label>
              <select
                id="purchase-pay-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                <option value="DEPOSITO">Depósito en Cuenta</option>
                <option value="EFECTIVO">Efectivo (Caja Chica)</option>
                <option value="CHEQUE">Cheque Comercial</option>
              </select>
            </div>
            {paymentMethod !== 'EFECTIVO' && (
              <div className="space-y-1">
                <label htmlFor="purchase-pay-bank" className="font-medium text-foreground">
                  Banco / Entidad Financiera
                </label>
                <Input
                  id="purchase-pay-bank"
                  value={paymentBank}
                  onChange={(e) => setPaymentBank(e.target.value)}
                  placeholder="ej: BCP, BBVA, Interbank..."
                  className="h-8 text-xs"
                />
              </div>
            )}
            <p className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded border">
              Este abono genera un egreso en tesorería y registra el asiento contable de cancelación
              421 (Cuentas por pagar) vs 104 (Bancos) o 101 (Caja).
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentPurchase(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => paymentMutation.mutate()}
              disabled={paymentMutation.isPending || Number(paymentAmount) <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {paymentMutation.isPending ? 'Registrando...' : 'Confirmar Abono'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Historial de Pagos */}
      <Dialog
        open={paymentHistory !== null}
        onOpenChange={(open) => {
          if (!open) setPaymentHistory(null);
        }}
      >
        <DialogContent className="max-w-lg text-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-emerald-600" />
              Historial de Abonos Registrados
            </DialogTitle>
            <DialogDescription className="text-xs">
              Egresos registrados en tesorería y cancelaciones contables de la factura.
            </DialogDescription>
          </DialogHeader>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Medio de Pago</TableHead>
                <TableHead align="right">Monto Pagado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(paymentHistory ?? []).map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-mono text-xs">
                    {formatDateTimeToPeru(h.date)}
                  </TableCell>
                  <TableCell>
                    {h.paymentMethod}
                    {h.bankName ? ` (${h.bankName})` : ''}
                  </TableCell>
                  <TableCell align="right" className="font-mono font-semibold text-emerald-600">
                    {money(h.amount)}
                  </TableCell>
                </TableRow>
              ))}
              {(paymentHistory ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                    Sin abonos registrados en el sistema.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentHistory(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
