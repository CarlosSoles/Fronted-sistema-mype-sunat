/**
 * Editor del cronograma de cuotas al crédito (TA-64).
 *
 * Antes el formulario solo pedía "Número de cuotas" (1, 2 o 3) y las fechas se
 * calculaban solas cada 30 días. En la práctica el cliente negocia otras fechas
 * —"la primera a 15 días, la segunda a 90"— y un crédito a 6 o 12 cuotas no se
 * podía emitir desde la pantalla.
 *
 * El editor muestra el neto pendiente, reparte el neto en partes iguales por
 * defecto y deja editar importe y fecha. El estado de la regla 3319 se ve en
 * vivo: si el usuario descuadra el cronograma, el botón de emitir se bloquea
 * con el motivo exacto en lugar de dejar que el backend lo rechace.
 */
import { Button, PageText } from '@/components/ui';
import {
  repartirEnCuotas,
  validarCronograma,
  type CuotaBorrador,
} from '../lib/invoiceDetraccion';

const CLASE_CELDA =
  'h-8 w-full rounded border bg-background px-2 text-xs text-foreground';

interface CreditInstallmentsEditorProps {
  cuotas: readonly CuotaBorrador[];
  netoPendiente: number;
  fechaEmision: string;
  onCambiar: (cuotas: readonly CuotaBorrador[]) => void;
}

/** Tabla editable de cuotas con la comprobación de la regla 3319 al pie. */
export const CreditInstallmentsEditor = ({
  cuotas,
  netoPendiente,
  fechaEmision,
  onCambiar,
}: CreditInstallmentsEditorProps) => {
  const resultado = validarCronograma(cuotas, netoPendiente, fechaEmision);

  /** Vuelve a repartir el neto en el número de cuotas indicado. */
  const repartir = (numero: number) => {
    const nuevas = repartirEnCuotas(netoPendiente, numero, fechaEmision);
    onCambiar(nuevas.map((c) => ({ monto: c.monto, vencimiento: c.vencimiento })));
  };

  const editar = (indice: number, parcial: Partial<CuotaBorrador>) => {
    onCambiar(cuotas.map((c, i) => (i === indice ? { ...c, ...parcial } : c)));
  };

  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PageText variant="label">Cronograma de cuotas</PageText>
        <div className="flex gap-1">
          {[1, 2, 3, 6, 12].map((n) => (
            <Button
              key={n}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => repartir(n)}
            >
              {n}
            </Button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead className="bg-muted/60 text-[11px] uppercase">
            <tr>
              <th className="px-2 py-1 text-left">Cuota</th>
              <th className="px-2 py-1 text-right">Importe</th>
              <th className="px-2 py-1 text-left">Vencimiento</th>
            </tr>
          </thead>
          <tbody>
            {cuotas.map((cuota, i) => (
              <tr key={`cuota-${i}`} className="border-t">
                <td className="px-2 py-1 tabular-nums">
                  Cuota{String(i + 1).padStart(3, '0')}
                </td>
                <td className="px-1 py-1">
                  <input
                    aria-label={`Importe de la cuota ${i + 1}`}
                    type="number"
                    min="0"
                    step="0.01"
                    className={`${CLASE_CELDA} text-right`}
                    value={cuota.monto}
                    onChange={(e) =>
                      editar(i, { monto: Number(e.target.value) })
                    }
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    aria-label={`Vencimiento de la cuota ${i + 1}`}
                    type="date"
                    className={CLASE_CELDA}
                    value={cuota.vencimiento}
                    onChange={(e) =>
                      editar(i, { vencimiento: e.target.value })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PageText variant="caption">
        Neto pendiente {resultado.netoPendiente.toFixed(2)} · cuotas suman{' '}
        {resultado.suma.toFixed(2)}
      </PageText>

      {resultado.cuadra && resultado.errores.length === 0 ? (
        <PageText variant="caption">
          El cronograma cuadra al céntimo con el neto pendiente.
        </PageText>
      ) : (
        resultado.errores.map((error) => (
          <PageText key={error} variant="error">
            · {error}
          </PageText>
        ))
      )}
    </div>
  );
};
