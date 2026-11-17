import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CircleAlert, Loader2 } from 'lucide-react';
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui';
import { accountingApi } from '../services/accountingApi';
import { monto } from '../lib/exportReport';
import type { AccountingPeriod } from '../types/accounting.types';

interface AnnualCloseWizardProps {
  year: number;
  periods: AccountingPeriod[];
  abierto: boolean;
  onCerrar: () => void;
  onAviso: (texto: string, tipo?: 'ok' | 'error') => void;
}

type Paso = 1 | 2 | 3 | 4;

/**
 * Cierre anual guiado en cuatro pasos.
 *
 * Cada paso se habilita solo si el anterior está resuelto, y el paso 3 muestra
 * el resultado del ejercicio antes de generar el asiento de cierre: ese asiento
 * es irreversible desde la pantalla.
 */
export function AnnualCloseWizard({ year, periods, abierto, onCerrar, onAviso }: AnnualCloseWizardProps) {
  const queryClient = useQueryClient();
  const [paso, setPaso] = useState<Paso>(1);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['accounting-periods'] });

  const delAnio = useMemo(() => periods.filter((periodo) => periodo.year === year), [periods, year]);
  const eneroANoviembre = delAnio.filter((periodo) => periodo.month <= 11);
  const diciembre = delAnio.find((periodo) => periodo.month === 12);
  const abiertosEneroNoviembre = eneroANoviembre.filter((periodo) => periodo.status === 'ABIERTO');

  const { data: preview, isLoading: cargandoPreview } = useQuery({
    queryKey: ['accounting-closing-preview', year],
    queryFn: () => accountingApi.getClosingPreview(year),
    enabled: abierto,
  });

  const cerrarMeses = useMutation({
    mutationFn: async () => {
      for (const periodo of abiertosEneroNoviembre) {
        await accountingApi.closePeriod(periodo.period);
      }
      return abiertosEneroNoviembre.length;
    },
    onSuccess: async (cuantos) => {
      onAviso(cuantos > 0 ? `${cuantos} mes(es) cerrados.` : 'No había meses abiertos de enero a noviembre.');
      await invalidar();
    },
    onError: (e: any) => onAviso(e?.response?.data?.message ?? 'No se pudieron cerrar los meses.', 'error'),
  });

  const generarCierre = useMutation({
    mutationFn: () => accountingApi.generateClosingEntry(year),
    onSuccess: async () => { onAviso('Asiento de cierre generado.'); await invalidar(); },
    onError: (e: any) => onAviso(e?.response?.data?.message ?? 'No se pudo generar el asiento de cierre.', 'error'),
  });

  const cerrarAnio = useMutation({
    mutationFn: () => accountingApi.closeFiscalYear(year),
    onSuccess: async () => { onAviso(`Ejercicio ${year} cerrado.`); await invalidar(); onCerrar(); },
    onError: (e: any) => onAviso(e?.response?.data?.message ?? 'No se pudo cerrar el año.', 'error'),
  });

  const paso1Listo = abiertosEneroNoviembre.length === 0;
  const paso2Listo = paso1Listo && (preview?.tieneAsientoCierre ?? false);
  const paso3Listo = paso2Listo;

  const fila = (numero: Paso, titulo: string, estado: 'hecho' | 'pendiente' | 'en-curso' | 'bloqueado', contenido: React.ReactNode) => {
    const icono =
      estado === 'hecho' ? <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        : estado === 'en-curso' ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          : estado === 'bloqueado' ? <CircleAlert className="h-4 w-4 text-muted-foreground" />
            : <span className="text-xs font-semibold tabular-nums">{numero}</span>;

    return (
      <div className={`rounded-lg border p-3 ${paso === numero ? 'border-primary/40 bg-muted/30' : ''}`}>
        <button type="button" onClick={() => setPaso(numero)} className="flex w-full items-center gap-2 text-left">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-muted">{icono}</span>
          <span className="text-sm font-medium">{titulo}</span>
          <Badge variant="outline" className="ml-auto">
            {estado === 'hecho' ? 'Completado' : estado === 'bloqueado' ? 'No aplica' : 'Pendiente'}
          </Badge>
        </button>
        {paso === numero ? <div className="mt-3 space-y-2 text-sm">{contenido}</div> : null}
      </div>
    );
  };

  return (
    <Dialog open={abierto} onOpenChange={(valor) => { if (!valor) onCerrar(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cierre del ejercicio {year}</DialogTitle>
          <DialogDescription>
            Cuatro pasos, en orden. Cada uno se habilita cuando el anterior está resuelto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {fila(
            1,
            'Revisar pendientes',
            paso1Listo ? 'hecho' : 'pendiente',
            <>
              {abiertosEneroNoviembre.length > 0 ? (
                <>
                  <p className="text-muted-foreground">
                    Hay {abiertosEneroNoviembre.length} mes(es) de enero a noviembre sin cerrar:{' '}
                    {abiertosEneroNoviembre.map((periodo) => periodo.period).join(', ')}.
                  </p>
                  <Button size="sm" onClick={() => cerrarMeses.mutate()} disabled={cerrarMeses.isPending}>
                    {cerrarMeses.isPending ? 'Cerrando…' : 'Cerrar los meses pendientes'}
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground">Enero a noviembre están cerrados.</p>
              )}
            </>
          )}

          {fila(
            2,
            'Cerrar los meses de enero a noviembre',
            paso1Listo ? 'hecho' : 'bloqueado',
            <p className="text-muted-foreground">
              {paso1Listo
                ? 'Los once meses anteriores a diciembre están cerrados.'
                : 'Primero resuelve los meses pendientes del paso 1.'}
            </p>
          )}

          {fila(
            3,
            'Generar el asiento de cierre',
            preview?.tieneAsientoCierre ? 'hecho' : paso2Listo ? 'pendiente' : 'bloqueado',
            <>
              {cargandoPreview ? (
                <p className="text-muted-foreground">Calculando el resultado del ejercicio…</p>
              ) : preview ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-md border p-2">
                      <p className="text-muted-foreground">Ingresos (7x)</p>
                      <p className="font-medium tabular-nums">{monto(preview.totalIngresos)}</p>
                    </div>
                    <div className="rounded-md border p-2">
                      <p className="text-muted-foreground">Gastos (6x)</p>
                      <p className="font-medium tabular-nums">{monto(preview.totalGastos)}</p>
                    </div>
                    <div className="rounded-md border p-2">
                      <p className="text-muted-foreground">{preview.tipo}</p>
                      <p
                        className={`font-semibold tabular-nums ${
                          preview.resultado < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {monto(preview.resultado)}
                      </p>
                    </div>
                  </div>
                  {preview.tieneAsientoCierre ? (
                    <p className="text-muted-foreground">El asiento de cierre ya está generado.</p>
                  ) : (
                    <>
                      <p className="text-[11px] text-muted-foreground">
                        Se cierran las cuentas de ingresos y gastos contra resultados acumulados, con fecha
                        31/12 de {year}. Diciembre debe seguir abierto en este paso.
                      </p>
                      <Button size="sm" onClick={() => generarCierre.mutate()} disabled={generarCierre.isPending || !paso2Listo}>
                        {generarCierre.isPending ? 'Generando…' : 'Generar asiento de cierre'}
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">No se pudo calcular el resultado.</p>
              )}
            </>
          )}

          {fila(
            4,
            'Cerrar diciembre y el año',
            diciembre?.status === 'CERRADO' ? 'hecho' : paso3Listo ? 'pendiente' : 'bloqueado',
            <>
              <p className="text-muted-foreground">
                {diciembre?.status === 'CERRADO'
                  ? 'Diciembre ya está cerrado.'
                  : 'Cierra diciembre y bloquea el ejercicio completo.'}
              </p>
              <Button
                size="sm"
                onClick={() => cerrarAnio.mutate()}
                disabled={cerrarAnio.isPending || !paso3Listo || diciembre?.status === 'CERRADO'}
              >
                {cerrarAnio.isPending ? 'Cerrando…' : `Cerrar ${year}`}
              </Button>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
