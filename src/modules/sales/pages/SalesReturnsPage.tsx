import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Input, Page, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { apiClient } from '@/lib/axios';
import { extractApiErrorMessage } from '@/lib/apiErrors';
import { invoicesApi } from '@/modules/invoices/services/invoicesApi';
import type { Invoice, LineaOrigen } from '@/modules/invoices/types/invoice.types';

const money = (n: number) => `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const hoy = new Date().toISOString().slice(0, 10);
const inicioMes = `${hoy.slice(0, 7)}-01`;

export default function SalesReturnsPage() {
  const queryClient = useQueryClient();
  const ventas = useQuery({ queryKey: ['sales-returns-ventas'], queryFn: () => invoicesApi.getInvoices(1, { desde: inicioMes, hasta: hoy, page_size: 100 }) });
  const config = useQuery({ queryKey: ['sales-returns-config'], queryFn: async () => (await apiClient.get<{ series?: Array<{ document_type: string; series: string; is_active: boolean }> }>('/invoices/config')).data });
  const [seleccion, setSeleccion] = useState<{ venta: Invoice; lineas: Array<{ linea: LineaOrigen; cantidad: number; incluir: boolean }>; motivo: '07' | '06' } | null>(null);
  const [msg, setMsg] = useState('');
  const serieNota = (config.data?.series ?? []).find((s) => s.document_type === '07' && s.is_active)?.series ?? '';
  const ventasValidas = useMemo(() => (ventas.data?.data ?? []).filter((v) => ['01', '03'].includes(v.tipoComprobante) && ['ACEPTADO', 'OBSERVADO'].includes(v.cdrStatus)), [ventas.data]);
  const elegir = async (v: Invoice) => {
    try {
      const detalle = await invoicesApi.getInvoiceById(v.id, true);
      const lineas = (detalle.lineasOrigen ?? detalle.items?.map((i) => ({ codigo: null, descripcion: i.descripcion, unidad: 'NIU', cantidad: i.cantidad, valor_unitario: i.precioUnitario / 1.18, precio_unitario: i.precioUnitario, afectacion: '10' })) ?? []).map((linea) => ({ linea, cantidad: Number(linea.cantidad ?? 0), incluir: false }));
      setSeleccion({ venta: detalle, lineas, motivo: '07' });
      setMsg('');
    } catch (e) { setMsg(extractApiErrorMessage(e, 'No se pudo cargar el comprobante.')); }
  };
  const emitir = useMutation({
    mutationFn: async () => {
      if (!seleccion || !serieNota) throw new Error('No hay serie activa para notas de crédito (07).');
      const lineas = seleccion.lineas.filter((l) => l.incluir && l.cantidad > 0);
      if (!lineas.length) throw new Error('Seleccione al menos un ítem para devolver.');
      const resultado = await invoicesApi.emitirComprobante({
        tipo_comprobante: '07', serie: serieNota, almacen: seleccion.venta.almacen ?? 'ALM-01',
        customer_identity_type: /^\d{11}$/.test(seleccion.venta.clienteRuc) ? '6' : '1',
        customer_identity_number: seleccion.venta.clienteRuc,
        customer_legal_name: seleccion.venta.clienteRazonSocial,
        forma_pago: 'Contado', documento_afectado: seleccion.venta.numero,
        codigo_motivo_nota: seleccion.motivo,
        descripcion_motivo_nota: seleccion.motivo === '06' ? 'Devolución total' : 'Devolución por ítem',
        items: lineas.map(({ linea, cantidad }) => ({
          descripcion: linea.descripcion ?? 'ÍTEM', codigo: linea.codigo ?? undefined,
          unidad: linea.unidad ?? 'NIU', cantidad,
          valorUnitario: Number(linea.valor_unitario ?? 0),
          precioUnitario: Number(linea.precio_unitario ?? Number(linea.valor_unitario ?? 0) * 1.18),
          afectacion: (linea.afectacion ?? '10') as never,
        })),
      }, crypto.randomUUID());
      return resultado;
    },
    onSuccess: async (r) => { setMsg(`Nota de crédito emitida: ${r.numero}`); setSeleccion(null); await queryClient.invalidateQueries({ queryKey: ['sales-returns-ventas'] }); },
    onError: (e) => setMsg(extractApiErrorMessage(e, 'No se pudo emitir la devolución.')),
  });
  return (
    <Page>
      <PageHeader title="Devoluciones de venta" description="Emite la nota de crédito y devuelve stock desde el comprobante original" />
      {msg ? <p role="status" className="mb-3 text-xs text-muted-foreground">{msg}</p> : null}
      {seleccion ? (
        <Card className="mb-5 border-primary/40 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div><p className="text-sm font-semibold">Devolución de {seleccion.venta.numero}</p><p className="text-xs text-muted-foreground">{seleccion.venta.clienteRazonSocial}</p></div>
            <select aria-label="Motivo" className="h-9 rounded-md border bg-background px-2 text-xs" value={seleccion.motivo} onChange={(e) => setSeleccion({ ...seleccion, motivo: e.target.value as '07' | '06' })}><option value="07">Devolución por ítem</option><option value="06">Devolución total</option></select>
          </div>
          <Table><TableHeader><TableRow><TableHead>Devolver</TableHead><TableHead>Ítem</TableHead><TableHead align="right">Cantidad</TableHead><TableHead align="right">Precio</TableHead></TableRow></TableHeader><TableBody>
            {seleccion.lineas.map((l, idx) => <TableRow key={idx}><TableCell><input type="checkbox" aria-label={`Incluir ${l.linea.descripcion}`} checked={l.incluir} onChange={(e) => setSeleccion({ ...seleccion, lineas: seleccion.lineas.map((x, i) => i === idx ? { ...x, incluir: e.target.checked } : x) })} /></TableCell><TableCell className="text-xs">{l.linea.descripcion}</TableCell><TableCell align="right"><Input aria-label={`Cantidad ${l.linea.descripcion}`} className="ml-auto h-7 w-20" type="number" min={0} max={Number(l.linea.cantidad ?? 0)} value={l.cantidad} onChange={(e) => setSeleccion({ ...seleccion, lineas: seleccion.lineas.map((x, i) => i === idx ? { ...x, cantidad: Math.min(Number(l.linea.cantidad ?? 0), Math.max(0, Number(e.target.value))) } : x) })} /></TableCell><TableCell align="right" className="font-mono text-xs">{money(Number(l.linea.precio_unitario ?? 0))}</TableCell></TableRow>)}
          </TableBody></Table>
          <div className="mt-3 flex gap-2"><Button size="sm" onClick={() => emitir.mutate()} disabled={emitir.isPending || !serieNota}>{emitir.isPending ? 'Emitiendo…' : 'Emitir nota de crédito'}</Button><Button size="sm" variant="outline" onClick={() => setSeleccion(null)}>Cancelar</Button></div>
          {!serieNota ? <p className="mt-2 text-xs text-destructive">No hay serie activa para notas de crédito (07).</p> : null}
        </Card>
      ) : null}
      <Card flush>
        <Table><TableHeader><TableRow><TableHead>Comprobante</TableHead><TableHead>Cliente</TableHead><TableHead>Fecha</TableHead><TableHead>Estado</TableHead><TableHead align="right">Total</TableHead><TableHead /></TableRow></TableHeader><TableBody>
          {ventasValidas.map((v) => <TableRow key={v.id}><TableCell className="font-mono text-xs">{v.numero}<p className="text-[10px] text-muted-foreground">{v.tipoComprobante === '01' ? 'Factura' : 'Boleta'}</p></TableCell><TableCell className="text-xs">{v.clienteRazonSocial}<p className="text-[10px] text-muted-foreground">{v.clienteRuc}</p></TableCell><TableCell className="text-xs">{new Date(v.fechaEmision).toLocaleDateString('es-PE')}</TableCell><TableCell><Badge variant="outline">{v.cdrStatus}</Badge></TableCell><TableCell align="right" className="font-mono text-xs">{money(Number(v.total))}</TableCell><TableCell align="right"><Button size="sm" variant="outline" onClick={() => void elegir(v)}>Devolución</Button></TableCell></TableRow>)}
          {!ventas.isLoading && ventasValidas.length === 0 ? <TableRow><TableCell colSpan={6} className="text-xs text-muted-foreground">Sin ventas aceptadas en el mes.</TableCell></TableRow> : null}
        </TableBody></Table>
      </Card>
    </Page>
  );
}
