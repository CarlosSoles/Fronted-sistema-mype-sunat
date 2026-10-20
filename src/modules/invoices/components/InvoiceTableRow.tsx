/**
 * Fila de la grilla enriquecida de comprobantes (M1).
 *
 * Se extrae de `InvoiceTable` para mantener ambos archivos por debajo del
 * límite de líneas y aislar las acciones por documento.
 */
import {
  Button,
  PageText,
  TableCell,
  TableRow,
} from '@/components/ui';
import { Download, FileCode2, FileCheck2 } from 'lucide-react';
import { formatCurrency, formatDateToPeru } from '@/lib/formatters';
import type { ComprobanteDemo } from '../data/invoiceDemoData';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';

/** Etiqueta legible del tipo de comprobante (Catálogo 01). */
const TIPO_LABEL: Record<ComprobanteDemo['tipo'], string> = {
  '01': 'Factura',
  '03': 'Boleta',
  '07': 'Nota de Crédito',
  '08': 'Nota de Débito',
  RA: 'Comunicación de Baja',
  RC: 'Resumen Diario',
};

interface InvoiceTableRowProps {
  comprobante: ComprobanteDemo;
}

export const InvoiceTableRow = ({ comprobante: c }: InvoiceTableRowProps) => {
  const descuento = c.detraccion + c.retencion;

  return (
    <TableRow>
      <TableCell>
        <PageText variant="label">{TIPO_LABEL[c.tipo]}</PageText>
        <PageText variant="caption">
          {c.serie}-{String(c.correlativo).padStart(4, '0')}
        </PageText>
        {c.documentoAfectado && (
          <PageText variant="caption">
            Afecta: {c.documentoAfectado}
          </PageText>
        )}
      </TableCell>

      <TableCell>
        <PageText variant="label">{c.clienteRazonSocial}</PageText>
        <PageText variant="caption">RUC/DNI: {c.clienteRuc}</PageText>
      </TableCell>

      <TableCell>{formatDateToPeru(c.fechaEmision)}</TableCell>

      <TableCell align="center">{c.moneda}</TableCell>

      <TableCell align="right">
        {formatCurrency(c.baseImponible, c.moneda)}
      </TableCell>

      <TableCell align="right">{formatCurrency(c.igv, c.moneda)}</TableCell>

      <TableCell align="right">
        {descuento > 0 ? (
          <>
            {c.detraccion > 0 && (
              <PageText variant="caption">
                Detracción {formatCurrency(c.detraccion, c.moneda)}
              </PageText>
            )}
            {c.retencion > 0 && (
              <PageText variant="caption">
                Retención {formatCurrency(c.retencion, c.moneda)}
              </PageText>
            )}
          </>
        ) : (
          <PageText variant="caption">—</PageText>
        )}
      </TableCell>

      <TableCell align="right">
        <PageText variant="label">
          {formatCurrency(c.totalNeto, c.moneda)}
        </PageText>
      </TableCell>

      <TableCell align="center">
        <InvoiceStatusBadge estado={c.estado} codigo={c.cdrCodigo} />
      </TableCell>

      <TableCell align="right">
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Ver XML de ${c.serie}-${c.correlativo}`}
            title="Ver XML"
          >
            <FileCode2 aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Ver CDR de ${c.serie}-${c.correlativo}`}
            title="Ver CDR"
          >
            <FileCheck2 aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Descargar PDF de ${c.serie}-${c.correlativo}`}
            title="Descargar PDF"
          >
            <Download aria-hidden="true" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};
