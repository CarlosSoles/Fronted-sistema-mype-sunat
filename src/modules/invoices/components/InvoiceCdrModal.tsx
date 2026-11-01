/**
 * Modal de auditoría CDR y visor XML del comprobante (M1).
 *
 * Muestra la respuesta oficial del `billService` de SUNAT (código,
 * descripción, Hash y trama QR), la bitácora del pipeline de envío y, en modo
 * XML, el documento UBL 2.1 completo con scroll.
 */
import { useState } from 'react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  PageText,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { Download, FileCode2 } from 'lucide-react';
import type { ComprobanteDemo } from '../data/invoiceDemoTypes';
import { generarTramaQrSunat } from '../lib/invoiceCreditAndRules';
import { generarXmlUbl21Comprobante } from '../lib/invoiceExportXml';
import { RUC_EMISOR } from '../lib/invoiceExportConstants';
import { descargarDesdeBackend, type FormatoDescarga } from '../lib/invoiceDescarga';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { InvoiceAuditTrail } from './InvoiceAuditTrail';

interface InvoiceCdrModalProps {
  comprobante: ComprobanteDemo | null;
  /** Pestaña inicial: 'cdr' (auditoría) o 'xml' (documento). */
  modoInicial?: 'cdr' | 'xml';
  onCerrar: () => void;
}

/** Modal de auditoría CDR con visor del XML UBL 2.1. */
export const InvoiceCdrModal = ({
  comprobante,
  modoInicial = 'cdr',
  onCerrar,
}: InvoiceCdrModalProps) => {
  const [modo, setModo] = useState<'cdr' | 'xml'>(modoInicial);
  const [descargando, setDescargando] = useState<FormatoDescarga | null>(null);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  if (!comprobante) return null;

  const c = comprobante;

  /**
   * Pide el documento al backend y lo guarda.
   *
   * Si el backend responde 404 se muestra el motivo (un comprobante PENDIENTE
   * todavía no tiene CDR) en lugar de bajar un archivo vacío o inventado.
   */
  const descargar = async (formato: FormatoDescarga) => {
    setDescargando(formato);
    setErrorDescarga(null);
    try {
      await descargarDesdeBackend(c.id, formato);
    } catch (error: unknown) {
      const mensaje =
        error instanceof Error ? error.message : 'No se pudo descargar';
      setErrorDescarga(mensaje);
    } finally {
      setDescargando(null);
    }
  };
  const numeroSerie = `${c.serie}-${String(c.correlativo).padStart(4, '0')}`;
  const trama = generarTramaQrSunat({
    rucEmisor: RUC_EMISOR,
    tipo: c.tipo,
    serie: c.serie,
    correlativo: c.correlativo,
    igv: c.igv,
    total: c.totalNeto,
    fecha: c.fechaEmision,
    tipoDocCliente: c.clienteTipoDoc,
    numDocCliente: c.clienteRuc,
    hashCpe: c.hashCpe,
  });

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>
              {numeroSerie} · {c.clienteRazonSocial}
            </span>
            <InvoiceStatusBadge estado={c.estado} codigo={c.cdrCodigo} />
          </DialogTitle>
          <PageText variant="caption">
            {c.formaPago === 'Credito'
              ? `Crédito (${c.cuotas.length} cuotas)`
              : 'Contado'}
            {c.documentoAfectado
              ? ` · Afecta ${c.documentoAfectado}${
                  c.motivoNota
                    ? ` (${c.motivoNota.codigo} - ${c.motivoNota.descripcion})`
                    : ''
                }`
              : ''}
          </PageText>
        </DialogHeader>

        <Tabs value={modo} onValueChange={(v) => setModo(v as 'cdr' | 'xml')}>
          <TabsList>
            <TabsTrigger value="cdr">Auditoría CDR</TabsTrigger>
            <TabsTrigger value="xml">Visor XML UBL 2.1</TabsTrigger>
          </TabsList>

          <TabsContent value="cdr" className="space-y-4">
            <div className="space-y-2 rounded-lg border p-3">
              <PageText variant="label">
                Respuesta oficial CDR SUNAT (billService)
              </PageText>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  Código {c.cdrCodigo ?? 'PENDIENTE'}
                </Badge>
                <PageText variant="caption">{c.cdrDescripcion}</PageText>
              </div>
              <PageText variant="caption" className="break-all">
                digestValue: {c.hashCpe}
              </PageText>
              <PageText variant="caption" className="break-all">
                Trama QR: {trama}
              </PageText>
            </div>

            <InvoiceAuditTrail comprobante={c} />
          </TabsContent>

          <TabsContent value="xml">
            <pre className="max-h-72 overflow-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed">
              {generarXmlUbl21Comprobante(c)}
            </pre>
          </TabsContent>
        </Tabs>

        {errorDescarga && (
          <PageText variant="caption" className="text-destructive">
            No se pudo descargar: {errorDescarga}
          </PageText>
        )}

        <DialogFooter>
          {/*
            Se descarga el documento DEL BACKEND, no una reconstrucción local.
            Antes se llamaba a `descargarXmlComprobante(c)`, que armaba el XML en
            el navegador: un archivo con el nombre del comprobante que no era el
            que SUNAT aceptó.
          */}
          <Button
            variant="outline"
            size="sm"
            disabled={descargando !== null}
            onClick={() => descargar('xml')}
          >
            <FileCode2 aria-hidden="true" />
            {descargando === 'xml' ? 'Descargando…' : 'Descargar XML Oficial'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={descargando !== null}
            onClick={() => descargar('pdf')}
          >
            <Download aria-hidden="true" />
            {descargando === 'pdf' ? 'Descargando…' : 'Descargar PDF Homologado'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={descargando !== null}
            onClick={() => descargar('cdr')}
          >
            <Download aria-hidden="true" />
            {descargando === 'cdr' ? 'Descargando…' : 'Descargar CDR'}
          </Button>
          <Button size="sm" onClick={onCerrar}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
