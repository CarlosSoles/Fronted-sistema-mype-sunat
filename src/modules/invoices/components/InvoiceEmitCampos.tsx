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
  documentoClienteValido,
} from '../lib/invoiceEmitValidation';
import type { BorradorEmision } from '../lib/invoiceEmitDraft';
import { CampoSelect, CampoTexto } from './InvoiceEmitCamposBase';
import { InvoiceEmitCamposTributarios } from './InvoiceEmitCamposTributarios';

interface InvoiceEmitCamposProps {
  borrador: BorradorEmision;
  actualizar: (parcial: Partial<BorradorEmision>) => void;
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
}: InvoiceEmitCamposProps) => {
  const esNota = b.tipo === '07' || b.tipo === '08';
  const motivos = b.tipo === '08' ? MOTIVOS_ND : MOTIVOS_NC;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <CampoSelect
        id="tipo-cpe"
        label="Tipo de comprobante"
        value={b.tipo}
        onChange={(v) =>
          actualizar({
            tipo: v as BorradorEmision['tipo'],
            serie: SERIES_POR_TIPO[v]?.[0] ?? 'F001',
          })
        }
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
      />

      <CampoTexto
        id="doc-cliente"
        label="RUC / DNI del cliente"
        value={b.clienteDoc}
        onChange={(v) => actualizar({ clienteDoc: v.replace(/\D/g, '') })}
        placeholder="20100070970"
        error={
          b.clienteDoc.length > 0 && !documentoClienteValido(b.clienteDoc)
            ? 'Documento inválido (RUC módulo 11 o DNI 8 dígitos)'
            : undefined
        }
      />

      <CampoTexto
        id="razon-cliente"
        label="Razón social"
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
          <CampoTexto
            id="doc-afectado"
            label="Documento afectado"
            value={b.documentoAfectado}
            onChange={(v) => actualizar({ documentoAfectado: v })}
            placeholder="F001-0042"
          />
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
