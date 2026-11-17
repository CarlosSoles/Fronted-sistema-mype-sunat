import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, FileText, ListChecks, Lock, MoreHorizontal, Plus, Unlock } from 'lucide-react';
import { AnnualCloseWizard } from '../components/AnnualCloseWizard';
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
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'ABIERTOS' | 'CERRADOS'>('TODOS');
  const navigate = useNavigate();
  const [abrirNuevo, setAbrirNuevo] = useState(false);
  const [nuevo, setNuevo] = useState({ year: anioActual, month: mesActual });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  /** Reapertura: período elegido y motivo obligatorio. */
  const [reabriendo, setReabriendo] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  /** Año abierto en el asistente de cierre guiado. */
  const [wizardAnio, setWizardAnio] = useState<number | null>(null);
  /** Menú «⋯» con las acciones del año. */
  const [accionesAbiertas, setAccionesAbiertas] = useState(false);

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

  const visibles = useMemo(() => {
    const delAnio = anioFiltro === 'todos' ? periods : periods.filter((periodo) => String(periodo.year) === anioFiltro);
    if (filtroEstado === 'ABIERTOS') return delAnio.filter((periodo) => periodo.status === 'ABIERTO');
    if (filtroEstado === 'CERRADOS') return delAnio.filter((periodo) => periodo.status === 'CERRADO');
    return delAnio;
  }, [periods, anioFiltro, filtroEstado]);

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

  const delAnio = (year: number) => periods.filter((periodo) => periodo.year === year);
  const abiertosDelAnio = (year: number) => delAnio(year).filter((p) => p.status === 'ABIERTO').length;
  const cerradosDelAnio = (year: number) => delAnio(year).filter((p) => p.status === 'CERRADO').length;

  /**
   * Acciones del año para el menú «⋯».
   *
   * Se deshabilitan cuando no aplican y el tooltip explica el motivo, para que
   * no parezca que el sistema falla.
   */
  const panelDeAcciones = (year: number) => {
    const abiertos = abiertosDelAnio(year);
    return (
      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => { setAccionesAbiertas(false); openYear.mutate(year); }}
          disabled={openYear.isPending}
        >
          <Unlock className="mr-2 h-4 w-4" /> Abrir año
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => { setAccionesAbiertas(false); closeYear.mutate(year); }}
          disabled={closeYear.isPending || abiertos === 0}
          title={abiertos === 0 ? 'Todos los meses ya están cerrados' : 'Cierra los meses abiertos del año'}
        >
          <Lock className="mr-2 h-4 w-4" /> Cerrar año
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => { setAccionesAbiertas(false); closingEntry.mutate(year); }}
          disabled={closingEntry.isPending || abiertos > 0}
          title={
            abiertos > 0
              ? `Hay ${abiertos} mes(es) abiertos: ciérralos antes del asiento de cierre`
              : 'Genera el asiento de cierre del ejercicio'
          }
        >
          <FileText className="mr-2 h-4 w-4" /> Asiento de cierre
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => {
            setAccionesAbiertas(false);
            if (window.confirm(`¿Generar el asiento de cierre y bloquear el año ${year}?`)) closeAnnual.mutate(year);
          }}
          disabled={closeAnnual.isPending}
          title="Genera el asiento de cierre y bloquea el año completo"
        >
          <Lock className="mr-2 h-4 w-4" /> Cerrar año completo
        </Button>
      </div>
    );
  };

  return (
    <Page>
      <PageHeader
        title="Períodos contables"
        description="Períodos mensuales agrupados por año fiscal. Un período cerrado no admite asientos nuevos."
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2 p-3">
          <Select value={anioFiltro} onValueChange={setAnioFiltro}>
            <SelectTrigger className="h-8 w-52" aria-label="Año fiscal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los años fiscales</SelectItem>
              {anios.map((anio) => (
                <SelectItem key={anio} value={String(anio)}>Año fiscal {anio}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroEstado} onValueChange={(valor) => setFiltroEstado(valor as 'TODOS' | 'ABIERTOS' | 'CERRADOS')}>
            <SelectTrigger className="h-8 w-44" aria-label="Filtrar por estado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos los estados</SelectItem>
              <SelectItem value="ABIERTOS">Solo abiertos</SelectItem>
              <SelectItem value="CERRADOS">Solo cerrados</SelectItem>
            </SelectContent>
          </Select>

          {/* Contadores del año elegido, como texto discreto. */}
          {anioSeleccionado !== null ? (
            <span className="text-xs tabular-nums text-muted-foreground">
              {abiertosDelAnio(anioSeleccionado)} abiertos · {cerradosDelAnio(anioSeleccionado)} cerrados
            </span>
          ) : null}

          <div className="ml-auto flex items-center gap-1.5">
            {anioSeleccionado !== null ? (
              <Button size="sm" onClick={() => setWizardAnio(anioSeleccionado)}>
                <ListChecks className="mr-1 h-4 w-4" /> Cierre guiado
              </Button>
            ) : null}
            {anioSeleccionado !== null ? (
              <Button
                variant="outline"
                size="icon"
                aria-label="Más acciones del año"
                title="Más acciones del año"
                onClick={() => setAccionesAbiertas(true)}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            ) : null}
            <Button onClick={() => { setError(null); setOk(null); setAbrirNuevo(true); }}>
              <Plus className="mr-1 h-4 w-4" /> Nuevo período
            </Button>
          </div>
        </div>
      </Card>

      {ok ? <Card className="mb-3 border-emerald-600/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">{ok}</Card> : null}
      {error || queryError ? (
        <Card className="mb-4 border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error ?? 'No se pudieron cargar los períodos.'}
        </Card>
      ) : null}

      <div className="space-y-4">
        {isLoading ? (
          <Card className="p-4 text-sm text-muted-foreground">Cargando períodos…</Card>
        ) : grupos.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">
            No hay períodos. Crea el primero con «Nuevo período».
          </Card>
        ) : (
          grupos.map((grupo) => (
            <Card key={grupo.year} flush>
              {/* Encabezado del año fuera de las columnas: la tabla muestra
                  solo los meses. */}
              <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-4 py-2">
                <span className="text-sm font-semibold">Año fiscal {grupo.year}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {grupo.abiertos} abierto(s) · {grupo.cerrados} cerrado(s)
                </span>
                {anioSeleccionado === null ? (
                  <div className="ml-auto flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setWizardAnio(grupo.year)}
                    >
                      <ListChecks className="mr-1 h-3.5 w-3.5" /> Cierre guiado
                    </Button>
                  </div>
                ) : null}
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="w-[14%]">Período</TableHead>
                    <TableHead className="w-[12%]">Año / mes</TableHead>
                    <TableHead className="w-[14%]">Estado</TableHead>
                    <TableHead className="w-[16%]">Abierto</TableHead>
                    <TableHead className="w-[16%]">Cerrado</TableHead>
                    <TableHead align="right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
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
                </TableBody>
              </Table>
            </Card>
          ))
        )}
      </div>

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

      {/* Menú «⋯»: acciones del año que no caben en la barra. */}
      <Dialog open={accionesAbiertas} onOpenChange={setAccionesAbiertas}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Acciones del año {anioSeleccionado}</DialogTitle>
            <DialogDescription>
              Abrir o cerrar el ejercicio completo. Cada acción indica cuándo no aplica.
            </DialogDescription>
          </DialogHeader>
          {anioSeleccionado !== null ? panelDeAcciones(anioSeleccionado) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccionesAbiertas(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {wizardAnio !== null ? (
        <AnnualCloseWizard
          year={wizardAnio}
          periods={periods}
          abierto
          onCerrar={() => setWizardAnio(null)}
          onAviso={(texto, tipo) => {
            if (tipo === 'error') { setOk(null); setError(texto); }
            else { setError(null); setOk(texto); }
          }}
        />
      ) : null}
    </Page>
  );
}
