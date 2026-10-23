/**
 * Campos del formulario de emisión de comprobantes (M1).
 *
 * Se extraen de `InvoiceEmitModal.tsx` para mantener ambos archivos por debajo
 * del límite de líneas. Los primitivos de campo viven en
 * `InvoiceEmitCamposBase` y los tributarios en `InvoiceEmitCamposTributarios`.
 */
import {
  SERIES_POR_TIPO,
  MOTIVOS_NC,
  MOTIVOS_ND,
  documentoValidoParaTipo,
  mensajeErrorDocumento,
} from '../lib/invoiceEmitValidation';
import {
  cambiarTipo,
  esTipoNota,
  vincularDocumentoAfectado,
} from '../lib/invoiceEmitDraft';
import type { BorradorEmision } from '../lib/invoiceEmitDraft';
import type { ComprobanteDemo } from '../data/invoiceDemoTypes';
import { CampoSelect, CampoTexto } from './InvoiceEmitCamposBase';
import { InvoiceEmitCamposTributarios } from './InvoiceEmitCamposTributarios';

interface InvoiceEmitCamposProps {
  borrador: BorradorEmision;
  actualizar: (parcial: Partial<BorradorEmision>) => void;
  /** Comprobantes ya emitidos: se usan para vincular las notas. */
  existentes: readonly ComprobanteDemo[];
}

const OPCIONES_TIPO = [
  { value: '01' as const, label: '01 - Factura' },
  { value: '03' as const, label: '03 - Boleta' },
  { value: '07' as const, label: '07 - Nota de Crédito' },
  { value: '08' as const, label: '08 - Nota de Débito' },
];

/** Campos de identificación del comprobante y del cliente. */
export const InvoiceEmitCampos = ({
  borrador: b,
  actualizar,
  existentes,
}: InvoiceEmitCamposProps) => {
  const esNota = esTipoNota(b.tipo);
  const motivos = b.tipo === '08' ? MOTIVOS_ND : MOTIVOS_NC;
  const afectado = existentes.find(
    (c) => c.id.toUpperCase() === b.documentoAfectado.trim().toUpperCase(),
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <CampoSelect
        id="tipo-cpe"
        label="Tipo de comprobante"
        value={b.tipo}
        onChange={(v) => actualizar(cambiarTipo(b, v as BorradorEmision['tipo']))}
        opciones={OPCIONES_TIPO}
      />

      <CampoSelect
        id="serie-cpe"
        label="Serie"
        value={b.serie}
        onChange={(v) => actualizar({ serie: v })}
        opciones={(SERIES_POR_TIPO[b.tipo] ?? ['F001']).map((s) => ({
          value: s,
          label: s,
        }))}
        // La serie F/B de una Nota debe coincidir con el documento que afecta.
        disabled={esNota && Boolean(b.documentoAfectado.trim())}
      />

      <CampoTexto
        id="doc-cliente"
        label={
          b.tipo === '03' ? 'DNI del cliente' : 'RUC / DNI del cliente'
        }
        value={b.clienteDoc}
        onChange={(v) => actualizar({ clienteDoc: v.replace(/\D/g, '') })}
        placeholder={b.tipo === '03' ? '45678912' : '20100070970'}
        error={
          b.clienteDoc.length > 0 &&
          !documentoValidoParaTipo(b.tipo, b.clienteDoc)
            ? mensajeErrorDocumento(b.tipo)
            : undefined
        }
      />

      <CampoTexto
        id="razon-cliente"
        label="Razón social / nombre"
        value={b.clienteRazonSocial}
        onChange={(v) => actualizar({ clienteRazonSocial: v })}
        placeholder="CORPORACIÓN TEXTIL DEL NORTE S.A.C."
      />

      <CampoTexto
        id="desc-item"
        label="Descripción del ítem"
        value={b.descripcion}
        onChange={(v) => actualizar({ descripcion: v })}
      />

      <CampoTexto
        id="base-item"
        label="Monto base imponible"
        type="number"
        value={b.base}
        onChange={(v) => actualizar({ base: Number(v) })}
      />

      <InvoiceEmitCamposTributarios borrador={b} actualizar={actualizar} />

      {esNota && (
        <>
          <div className="sm:col-span-2">
            <CampoTexto
              id="doc-afectado"
              label="Documento afectado"
              value={b.documentoAfectado}
              onChange={(v) =>
                actualizar(
                  vincularDocumentoAfectado(
                    { ...b, documentoAfectado: v },
                    existentes,
                  ).borrador,
                )
              }
              placeholder="F001-0042"
              error={
                b.documentoAfectado.trim() && !afectado
                  ? 'No existe un comprobante con ese número en la grilla.'
                  : undefined
              }
            />
          </div>
          {afectado && (
            <div className="sm:col-span-2 rounded-lg border bg-muted/40 p-2">
              <p className="text-[11px] text-muted-foreground">
                Se vincula con {afectado.id} · {afectado.clienteRazonSocial} ·
                total S/{' '}
                {afectado.baseImponible.toFixed(2)} + IGV de{' '}
                {afectado.igv.toFixed(2)}
              </p>
            </div>
          )}
          <CampoSelect
            id="motivo"
            label="Motivo de la nota"
            value={b.motivoCodigo}
            onChange={(v) => {
              const elegido = motivos.find((m) => m.codigo === v);
              actualizar({
                motivoCodigo: v,
                motivoDescripcion: elegido?.descripcion ?? '',
              });
            }}
            opciones={motivos.map((m) => ({
              value: m.codigo,
              label: `${m.codigo} - ${m.descripcion}`,
            }))}
          />
        </>
      )}
    </div>
  );
};
