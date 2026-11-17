import { Fragment, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, FileText, Lock, Plus, Trash2, Unlock } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { accountingApi } from '../services/accountingApi';
import type { AccountingPeriod } from '../types/accounting.types';

const hoy = new Date();
const anioActual = hoy.getFullYear();
const mesActual = hoy.getMonth() + 1;

/**
 * Períodos contables.
 *
 * Un período es un mes. Se abre para poder registrar asientos en él y se cierra
 * cuando ya no debe recibir movimientos. Reabrir es la corrección: el mes vuelve
 * a admitir asientos (y el año, si estaba cerrado, también).
 *
 * La lista se agrupa por año fiscal, que es como se revisa en la práctica.
 */
export default function AccountingPeriodsPage() {
  const queryClient = useQueryClient();
  const [anioFiltro, setAnioFiltro] = useState<string>('todos');
  const [abrirNuevo, setAbrirNuevo] = useState(false);
  const [nuevo, setNuevo] = useState({ year: anioActual, month: mesActual });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const { data: periods = [], isLoading, error: queryError } = useQuery({
    queryKey: ['accounting-periods'],
    queryFn: () => accountingApi.getPeriods(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['accounting-periods'] });

  /**
   * Mensaje del servidor, o el texto de respaldo.
   *
   * class-validator devuelve un objeto por campo; sin normalizarlo, la pantalla
   * mostraba literalmente "[object Object]".
   */
  const mensajeDeError = (e: any, respaldo: string): string => {
    const texto = e?.response?.data?.message;
    if (Array.isArray(texto)) return texto.join(' · ');
    if (typeof texto === 'string' && texto.trim()) return texto;
    if (texto && typeof texto === 'object') {
      const detalles = Object.values(texto as Record<string, unknown>)
        .flat()
        .filter((valor): valor is string => typeof valor === 'string');
      if (detalles.length > 0) return detalles.join(' · ');
    }
    if (typeof e?.message === 'string' && e.message.trim()) return e.message;
    return respaldo;
  };

  const openPeriod = useMutation({
    mutationFn: ({ y, m }: { y: number; m: number }) => accountingApi.openPeriod(y, m),
    onSuccess: async (periodo) => {
      setError(null);
      setOk(`Período ${periodo.period} abierto.`);
      setAbrirNuevo(false);
      await invalidate();
    },
    onError: (e: any) => setError(mensajeDeError(e, 'No se pudo abrir el período.')),
  });

  const closePeriod = useMutation({
    mutationFn: (period: string) => accountingApi.closePeriod(period),
    onSuccess: async () => {
      setError(null);
      setOk('Período cerrado. Ya no admite asientos nuevos.');
      await invalidate();
    },
    onError: (e: any) => setError(mensajeDeError(e, 'No se pudo cerrar el período.')),
  });

  /**
   * Eliminar un período: solo si no tiene asientos. El backend es quien valida,
   * así que su mensaje se muestra tal cual cuando el mes tiene movimientos.
   */
  const deletePeriod = useMutation({
    mutationFn: (period: string) => accountingApi.deletePeriod(period),
    onSuccess: async (resultado) => {
      setError(null);
      setOk(`Período ${resultado.period} eliminado.`);
      await invalidate();
    },
    onError: (e: any) => setError(mensajeDeError(e, 'No se pudo eliminar el período.')),
  });

  const openYear = useMutation({
    mutationFn: (y: number) => accountingApi.openFiscalYear(y),
    onSuccess: async () => { setError(null); setOk('Año fiscal abierto.'); await invalidate(); },
    onError: (e: any) => setError(mensajeDeError(e, 'No se pudo abrir el año fiscal.')),
  });

  const closeYear = useMutation({
    mutationFn: (y: number) => accountingApi.closeFiscalYear(y),
    onSuccess: async () => { setError(null); setOk('Año fiscal cerrado.'); await invalidate(); },
    onError: (e: any) => setError(mensajeDeError(e, 'No se pudo cerrar el año fiscal.')),
  });

  const closingEntry = useMutation({
    mutationFn: (y: number) => accountingApi.generateClosingEntry(y),
    onSuccess: async () => { setError(null); setOk('Asiento de cierre generado.'); await invalidate(); },
    onError: (e: any) => setError(mensajeDeError(e, 'No se pudo generar el asiento de cierre. Verifica que el año tenga asientos y no esté cerrado.')),
  });

  const closeAnnual = useMutation({
    mutationFn: (y: number) => accountingApi.closeAnnual(y),
    onSuccess: async (data) => {
      setError(null);
      setOk(data.closingEntryCreated ? 'Asiento de cierre generado y año bloqueado.' : 'El asiento de cierre ya existía; año bloqueado.');
      await invalidate();
    },
    onError: (e: any) => setError(mensajeDeError(e, 'No se pudo cerrar el año completo.')),
  });

  const anios = useMemo(
    () => [...new Set(periods.map((periodo) => periodo.year))].sort((a, b) => b - a),
    [periods],
  );

  const visibles = useMemo(
    () => (anioFiltro === 'todos' ? periods : periods.filter((periodo) => String(periodo.year) === anioFiltro)),
    [periods, anioFiltro],
  );

  /** Lista de períodos agrupada por año fiscal, del año más reciente al más antiguo. */
  const grupos = useMemo(() => {
    const porAnio = new Map<number, AccountingPeriod[]>();
    for (const periodo of visibles) {
      const lista = porAnio.get(periodo.year) ?? [];
      lista.push(periodo);
      porAnio.set(periodo.year, lista);
    }
    return [...porAnio.entries()]
      .sort(([a], [b]) => b - a)
      .map(([year, lista]) => ({
        year,
        periodos: [...lista].sort((a, b) => a.month - b.month),
        abiertos: lista.filter((periodo) => periodo.status === 'ABIERTO').length,
        cerrados: lista.filter((periodo) => periodo.status === 'CERRADO').length,
      }));
  }, [visibles]);

  const fecha = (valor?: string | null) => {
    if (!valor) return '—';
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? '—' : fecha.toLocaleDateString('es-PE');
  };

  return (
    <Page>
      <PageHeader
        title="Períodos contables"
        description="Períodos mensuales agrupados por año fiscal. Un período cerrado no admite asientos nuevos."
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3 p-3">
          <Select value={anioFiltro} onValueChange={setAnioFiltro}>
            <SelectTrigger className="h-9 w-52" aria-label="Año fiscal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los años fiscales</SelectItem>
              {anios.map((anio) => (
                <SelectItem key={anio} value={String(anio)}>Año fiscal {anio}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="ml-auto" onClick={() => { setError(null); setOk(null); setAbrirNuevo(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Nuevo período
          </Button>
        </div>
      </Card>

      {ok ? <Card className="mb-3 border-emerald-600/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">{ok}</Card> : null}
      {error || queryError ? (
        <Card className="mb-4 border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error ?? 'No se pudieron cargar los períodos.'}
        </Card>
      ) : null}

      <Card flush>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[14%]">Período</TableHead>
              <TableHead className="w-[12%]">Año / mes</TableHead>
              <TableHead className="w-[14%]">Estado</TableHead>
              <TableHead className="w-[16%]">Abierto</TableHead>
              <TableHead className="w-[16%]">Cerrado</TableHead>
              <TableHead align="right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6}>Cargando períodos…</TableCell></TableRow>
            ) : grupos.length === 0 ? (
              <TableRow><TableCell colSpan={6}>No hay períodos. Crea el primero con «Nuevo período».</TableCell></TableRow>
            ) : (
              grupos.map((grupo) => (
                <Fragment key={grupo.year}>
                  <TableRow className="bg-muted/60">
                    <TableCell colSpan={6}>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-semibold">Año fiscal {grupo.year}</span>
                        <Badge variant="outline">{grupo.abiertos} abierto(s)</Badge>
                        <Badge variant="secondary">{grupo.cerrados} cerrado(s)</Badge>
                        <div className="ml-auto flex flex-wrap gap-1.5">
                          <Button variant="ghost" size="sm" onClick={() => openYear.mutate(grupo.year)} disabled={openYear.isPending}>
                            <Unlock className="mr-1 h-3.5 w-3.5" /> Abrir año
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => closeYear.mutate(grupo.year)} disabled={closeYear.isPending}>
                            <Lock className="mr-1 h-3.5 w-3.5" /> Cerrar año
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => closingEntry.mutate(grupo.year)} disabled={closingEntry.isPending}>
                            <FileText className="mr-1 h-3.5 w-3.5" /> Asiento de cierre
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { if (window.confirm(`¿Generar el asiento de cierre y bloquear el año ${grupo.year}?`)) closeAnnual.mutate(grupo.year); }}
                            disabled={closeAnnual.isPending}
                          >
                            <Lock className="mr-1 h-3.5 w-3.5" /> Cerrar año completo
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                  {grupo.periodos.map((period) => (
                    <TableRow key={period.period}>
                      <TableCell className="font-mono font-bold">{period.period}</TableCell>
                      <TableCell>{period.year} / {String(period.month).padStart(2, '0')}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            period.status === 'ABIERTO'
                              ? 'border-emerald-600/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                              : 'text-muted-foreground'
                          }
                        >
                          {period.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{fecha(period.openedAt)}</TableCell>
                      <TableCell>{fecha(period.closedAt)}</TableCell>
                      <TableCell align="right">
                        <span className="flex items-center justify-end gap-1">
                          {period.status === 'ABIERTO' ? (
                            <Button variant="outline" size="sm" onClick={() => closePeriod.mutate(period.period)} disabled={closePeriod.isPending}>
                              <Lock className="mr-1 h-3.5 w-3.5" /> Cerrar
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => openPeriod.mutate({ y: period.year, m: period.month })} disabled={openPeriod.isPending}>
                              <CalendarDays className="mr-1 h-3.5 w-3.5" /> Reabrir
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Eliminar ${period.period}`}
                            title="Solo se puede eliminar si no tiene asientos"
                            disabled={deletePeriod.isPending}
                            onClick={() => {
                              if (window.confirm(`¿Eliminar el período ${period.period}? Solo es posible si no tiene asientos.`)) {
                                deletePeriod.mutate(period.period);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        Abrir un período permite registrar asientos en ese mes. Cerrarlo los bloquea. Reabrir vuelve a
        habilitarlo y, si el año estaba cerrado, lo reabre también.
      </p>

      <Dialog open={abrirNuevo} onOpenChange={setAbrirNuevo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo período</DialogTitle>
            <DialogDescription>
              Indica el año y el mes. Si el período ya existe, se reabre.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="nuevo-anio">Año</label>
              <Input
                id="nuevo-anio"
                type="number"
                min={2000}
                max={2100}
                value={nuevo.year}
                onChange={(evento) => setNuevo({ ...nuevo, year: Number(evento.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="nuevo-mes">Mes</label>
              <Input
                id="nuevo-mes"
                type="number"
                min={1}
                max={12}
                value={nuevo.month}
                onChange={(evento) => setNuevo({ ...nuevo, month: Number(evento.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbrirNuevo(false)}>Cancelar</Button>
            <Button
              onClick={() => openPeriod.mutate({ y: nuevo.year, m: nuevo.month })}
              disabled={openPeriod.isPending}
            >
              {openPeriod.isPending ? 'Abriendo…' : 'Abrir período'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
