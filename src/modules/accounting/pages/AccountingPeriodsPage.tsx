import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, FileText, Lock, Plus, Unlock } from 'lucide-react';
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
  const navigate = useNavigate();
  const [abrirNuevo, setAbrirNuevo] = useState(false);
  const [nuevo, setNuevo] = useState({ year: anioActual, month: mesActual });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  /** Reapertura: período elegido y motivo obligatorio. */
  const [reabriendo, setReabriendo] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');

  // Los avisos se borran solos: antes el verde y el rojo se quedaban pegados.
  useEffect(() => {
    if (!ok && !error) return;
    const temporizador = setTimeout(() => {
      setOk(null);
      setError(null);
    }, 6000);
    return () => clearTimeout(temporizador);
  }, [ok, error]);

  const { data: periods = [], isLoading, error: queryError } = useQuery({
    queryKey: ['accounting-periods'],
    queryFn: () => accountingApi.getPeriods(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['accounting-periods'] });

  /**
   * Mensaje del servidor, siempre como texto.
   *
   * class-validator devuelve un objeto por campo y Prisma puede devolver un
   * error anidado; sin normalizarlo del todo la pantalla mostraba literalmente
   * "[object Object]" y no había forma de saber qué había fallado.
   */
  const mensajeDeError = (e: any, respaldo: string): string => {
    const datos = e?.response?.data;
    const texto = datos?.message ?? datos?.error ?? datos;
    if (Array.isArray(texto)) {
      // El backend devuelve [{ field, rule, message }] por cada validación.
      const partes = texto.map((valor) => {
        if (typeof valor === 'string') return valor;
        if (valor && typeof valor === 'object') {
          const item = valor as { field?: string; message?: string };
          return item.field ? `${item.field}: ${item.message ?? 'valor inválido'}` : (item.message ?? JSON.stringify(valor));
        }
        return String(valor);
      });
      if (partes.length > 0) return partes.join(' · ');
    }
    if (typeof texto === 'string' && texto.trim()) return texto;
    if (texto && typeof texto === 'object') {
      const detalles = Object.values(texto as Record<string, unknown>)
        .flatMap((valor) => (Array.isArray(valor) ? valor : [valor]))
        .filter((valor): valor is string => typeof valor === 'string' && valor.trim().length > 0);
      if (detalles.length > 0) return detalles.join(' · ');
      try {
        return JSON.stringify(texto).slice(0, 300);
      } catch {
        // Si no se puede serializar, se usa el respaldo.
      }
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
   * Reabrir exige motivo: se pide en un diálogo y el backend lo audita.
   */
  const reopenPeriod = useMutation({
    mutationFn: ({ period, motivo }: { period: string; motivo: string }) =>
      accountingApi.reopenPeriod(period, motivo),
    onSuccess: async (resultado) => {
      setReabriendo(null);
      setMotivo('');
      setError(null);
      const avisos = resultado.advertencias?.length ? ` ${resultado.advertencias.join(' ')}` : '';
      setOk(`Período ${resultado.period.period} reabierto.${avisos}`);
      await invalidate();
    },
    onError: (e: any) => setError(mensajeDeError(e, 'No se pudo reabrir el período.')),
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

  /**
   * Acciones que afectan a todo un ejercicio.
   *
   * Con un año filtrado se muestran en la barra superior, junto a «Nuevo
   * período»; con «Todos los años» cada grupo lleva las suyas, para que no haya
   * duda de a qué año se aplican.
   */
  const anioSeleccionado = anioFiltro === 'todos' ? null : Number(anioFiltro);

  const accionesDelAnio = (year: number) => (
    <>
      <Button variant="ghost" size="sm" onClick={() => openYear.mutate(year)} disabled={openYear.isPending}>
        <Unlock className="mr-1 h-3.5 w-3.5" /> Abrir año
      </Button>
      <Button variant="ghost" size="sm" onClick={() => closeYear.mutate(year)} disabled={closeYear.isPending}>
        <Lock className="mr-1 h-3.5 w-3.5" /> Cerrar año
      </Button>
      <Button variant="ghost" size="sm" onClick={() => closingEntry.mutate(year)} disabled={closingEntry.isPending}>
        <FileText className="mr-1 h-3.5 w-3.5" /> Asiento de cierre
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => { if (window.confirm(`¿Generar el asiento de cierre y bloquear el año ${year}?`)) closeAnnual.mutate(year); }}
        disabled={closeAnnual.isPending}
      >
        <Lock className="mr-1 h-3.5 w-3.5" /> Cerrar año completo
      </Button>
    </>
  );

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
          {anioSeleccionado !== null ? (
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              {accionesDelAnio(anioSeleccionado)}
            </div>
          ) : null}
          <Button className={anioSeleccionado !== null ? '' : 'ml-auto'} onClick={() => { setError(null); setOk(null); setAbrirNuevo(true); }}>
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
                          {anioSeleccionado === null ? accionesDelAnio(grupo.year) : null}
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
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/accounting/entries?period=${period.period}`)}
                            title="Ver los asientos de este período en el Libro Diario"
                          >
                            <FileText className="mr-1 h-3.5 w-3.5" /> Ver asientos
                          </Button>
                          {/* El botón alterna en la misma posición: Cerrar o Reabrir. */}
                          {period.status === 'ABIERTO' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setOk(null); setError(null); closePeriod.mutate(period.period); }}
                              disabled={closePeriod.isPending && closePeriod.variables === period.period}
                            >
                              <Lock className="mr-1 h-3.5 w-3.5" /> Cerrar
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setOk(null); setError(null); setMotivo(''); setReabriendo(period.period); }}
                              disabled={period.status !== 'CERRADO'}
                            >
                              <CalendarDays className="mr-1 h-3.5 w-3.5" /> Reabrir
                            </Button>
                          )}
                        </div>
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

      {/* Reabrir exige motivo: queda en la auditoría del período. */}
      <Dialog open={Boolean(reabriendo)} onOpenChange={(abierto) => { if (!abierto) setReabriendo(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reabrir el período {reabriendo}</DialogTitle>
            <DialogDescription>
              Un período cerrado deja de admitir asientos. Reabrirlo es una excepción: indica el motivo,
              que quedará registrado con tu usuario y la fecha.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-xs font-medium" htmlFor="motivo-reapertura">
              Motivo de la reapertura
            </label>
            <textarea
              id="motivo-reapertura"
              value={motivo}
              onChange={(evento) => setMotivo(evento.target.value)}
              placeholder="Por ejemplo: ajuste por factura omitida del proveedor XYZ"
              rows={3}
              className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-[11px] text-muted-foreground">
              Mínimo 10 caracteres. Si el ejercicio ya tiene asiento de cierre, primero hay que anularlo.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReabriendo(null)}>Cancelar</Button>
            <Button
              onClick={() => { if (reabriendo) { setError(null); reopenPeriod.mutate({ period: reabriendo, motivo }); } }}
              disabled={reopenPeriod.isPending || motivo.trim().length < 10}
            >
              {reopenPeriod.isPending ? 'Reabriendo…' : 'Reabrir período'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
