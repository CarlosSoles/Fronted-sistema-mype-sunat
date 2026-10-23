/**
 * Campos tributarios del formulario de emisión (M1).
 *
 * Agrupa afectación IGV, forma de pago, cuotas, detracción, ICBPER y la
 * retención del agente. Se separa de `InvoiceEmitCampos.tsx` para respetar el
 * límite de líneas.
 */
import {
  PageField,
  PageText,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { DETRACCIONES } from '../lib/invoiceEmitValidation';
import type { BorradorEmision } from '../lib/invoiceEmitDraft';

interface InvoiceEmitCamposTributariosProps {
  borrador: BorradorEmision;
  actualizar: (parcial: Partial<BorradorEmision>) => void;
}

/** Campos tributarios: afectación, pago, cuotas, detracción e ICBPER. */
export const InvoiceEmitCamposTributarios = ({
  borrador: b,
  actualizar,
}: InvoiceEmitCamposTributariosProps) => {
  return (
    <>
      <PageField label="Afectación IGV (Catálogo 07)" htmlFor="afect">
        <Select
          value={b.afectacion}
          onValueChange={(v) =>
            actualizar({ afectacion: v as BorradorEmision['afectacion'] })
          }
        >
          <SelectTrigger id="afect">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GRAVADA">Gravada - 18%</SelectItem>
            <SelectItem value="EXONERADA">Exonerada</SelectItem>
            <SelectItem value="INAFECTA">Inafecta</SelectItem>
            <SelectItem value="GRATUITA">Gratuita</SelectItem>
          </SelectContent>
        </Select>
      </PageField>

      <PageField label="Forma de pago" htmlFor="forma-pago">
        <Select
          value={b.formaPago}
          onValueChange={(v) =>
            actualizar({ formaPago: v as BorradorEmision['formaPago'] })
          }
        >
          <SelectTrigger id="forma-pago">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Contado">Contado</SelectItem>
            <SelectItem value="Credito">Crédito</SelectItem>
          </SelectContent>
        </Select>
      </PageField>

      {b.formaPago === 'Credito' && (
        <PageField label="Número de cuotas" htmlFor="cuotas">
          <Select
            value={String(b.numeroCuotas)}
            onValueChange={(v) => actualizar({ numeroCuotas: Number(v) })}
          >
            <SelectTrigger id="cuotas">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} cuota{n > 1 ? 's' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PageField>
      )}

      <PageField label="Detracción SPOT (Catálogo 54)" htmlFor="detrac">
        <Select
          value={String(b.detraccionPct)}
          onValueChange={(v) => actualizar({ detraccionPct: Number(v) })}
        >
          <SelectTrigger id="detrac">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DETRACCIONES.map((p) => (
              <SelectItem key={p} value={String(p)}>
                {p === 0 ? 'Sin detracción' : `${p * 100}%`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageField>

      <PageField label="Bolsas plásticas ICBPER" htmlFor="bolsas">
        <input
          id="bolsas"
          type="number"
          min="0"
          className="h-9 rounded-md border bg-background px-3 text-sm"
          value={b.bolsas}
          onChange={(e) => actualizar({ bolsas: Number(e.target.value) || 0 })}
        />
        <PageText variant="caption">S/ 0.50 por bolsa</PageText>
      </PageField>
    </>
  );
};
