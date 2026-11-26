import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Pencil, Plus, Save, Search, TriangleAlert } from 'lucide-react';
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
import { accountingApi, type AccountingRule, type AccountingRuleInput } from '../services/accountingApi';
import { AccountCombobox } from '../components/AccountCombobox';
import { IMPORTE_EJEMPLO, COSTO_EJEMPLO, TASA_IGV } from '../lib/parametros';

/** Nombres de proceso tal como los ve el usuario. */
const NOMBRE_PROCESO: Record<string, string> = {
  VENTA: 'Venta',
  COMPRA: 'Compra',
  PAGO: 'Pago',
  COBRO: 'Cobro',
  GASTO: 'Gasto',
  AJUSTE: 'Ajuste de inventario',
  IMPORTACION: 'Importación',
  RECEPCION: 'Recepción',
  CIERRE: 'Cierre del ejercicio',
};

/** Bases de cálculo con su etiqueta legible y su explicación. */
const BASES: Array<{ valor: string; etiqueta: string; ayuda: string }> = [
  { valor: 'TOTAL', etiqueta: 'Total con IGV', ayuda: 'El importe completo del comprobante, impuestos incluidos.' },
  { valor: 'BASE', etiqueta: 'Base sin IGV', ayuda: 'El valor de venta o de compra sin el IGV.' },
  { valor: 'IGV', etiqueta: 'IGV', ayuda: 'Solo el impuesto, calculado sobre el total del comprobante.' },
  { valor: 'COSTO', etiqueta: 'Costo', ayuda: 'El costo del bien, que se indica aparte y no se deriva del precio de venta.' },
  { valor: 'MONTO_PAGADO', etiqueta: 'Monto pagado', ayuda: 'El importe efectivamente cobrado o pagado.' },
];

const etiquetaBase = (valor: string): string =>
  BASES.find((base) => base.valor === valor)?.etiqueta ?? valor;

const VACIA: AccountingRuleInput = {
  processCode: 'VENTA',
  documentType: '*',
  lineOrder: 1,
  accountCode: '',
  side: 'DEBE',
  baseCalculation: 'TOTAL',
  description: '',
};

/** Importe que le corresponde a una línea según su base de cálculo. */
function importeDeBase(base: string, total: number, costo: number): number {
  const baseSinIgv = total / (1 + TASA_IGV);
  switch (base) {
    case 'BASE':
      return baseSinIgv;
    case 'IGV':
      return total - baseSinIgv;
    case 'COSTO':
      return costo;
    default:
      return total;
  }
}

/** Suma Debe y Haber de un conjunto de reglas con el importe de ejemplo. */
function calcularCuadre(reglas: readonly AccountingRule[], total: number, costo: number) {
  const sumar = (lado: 'DEBE' | 'HABER') =>
    reglas
      .filter((regla) => regla.side === lado)
      .reduce((suma, regla) => suma + importeDeBase(regla.base_calculation, total, costo), 0);
  const debe = Math.round(sumar('DEBE') * 100) / 100;
  const haber = Math.round(sumar('HABER') * 100) / 100;
  return { debe, haber, cuadra: Math.abs(debe - haber) <= 0.01 };
}

/**
 * Reglas de contabilización.
 *
 * Una regla asocia un proceso (venta, compra, pago…) con la cuenta, el lado y la
 * base de cálculo de cada línea del asiento automático. La pantalla agrupa por
 * proceso y avisa si la receta no cuadra con el importe de ejemplo.
 *
 * AJUSTE se muestra aparte: mezcla el asiento de pérdida y el de sobrante, que
 * son alternativos, así que no se puede marcar como descuadrado.
 */
export default function AccountingRulesPage() {
  const [parametros] = useSearchParams();
  const queryClient = useQueryClient();
  const [editar, setEditar] = useState<AccountingRuleInput | null>(null);
  const [original, setOriginal] = useState<AccountingRuleInput | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [busqueda, setBusqueda] = useState('');
  const [filtroProceso, setFiltroProceso] = useState('TODOS');
  const [confirmarCierre, setConfirmarCierre] = useState(false);

  const { data: reglas = [], isLoading } = useQuery({
    queryKey: ['accounting-rules'],
    queryFn: () => accountingApi.getRules(),
  });

  const { data: cuentas = [] } = useQuery({
    queryKey: ['accounting-accounts', 'todas-reglas'],
    queryFn: () => accountingApi.getAccounts({ includeInactive: true }),
  });

  const porCodigo = useMemo(() => new Map(cuentas.map((cuenta) => [cuenta.code, cuenta])), [cuentas]);

  /** Solo cuentas imputables (sin hijas) y activas: las de último nivel. */
  const cuentasImputables = useMemo(() => {
    const conHijas = new Set(cuentas.map((cuenta) => cuenta.parentCode).filter(Boolean) as string[]);
    return cuentas.filter((cuenta) => cuenta.isActive && !conHijas.has(cuenta.code));
  }, [cuentas]);

  const refrescar = () => queryClient.invalidateQueries({ queryKey: ['accounting-rules'] });

  const guardar = useMutation({
    mutationFn: (payload: AccountingRuleInput) => accountingApi.upsertRule(payload),
    onSuccess: async () => {
      setEditar(null);
      setOriginal(null);
      setErrores({});
      await refrescar();
    },
    onError: (e: any) =>
      setErrores({ general: e?.response?.data?.message ?? 'No se pudo guardar la regla. Inténtalo otra vez.' }),
  });

  // Deep link desde la Guía contable: ?regla=<id> o ?proceso=<codigo>.
  useEffect(() => {
    if (reglas.length === 0) return;
    const idRegla = parametros.get('regla');
    const proceso = parametros.get('proceso');
    if (idRegla) {
      const encontrada = reglas.find((regla) => regla.id === idRegla);
      if (encontrada) setEditar(aReglaInput(encontrada));
    } else if (proceso) {
      setFiltroProceso(proceso);
    }
  }, [parametros, reglas]);

  const procesos = useMemo(() => {
    const presentes = new Set(reglas.map((regla) => regla.process_code));
    for (const codigo of Object.keys(NOMBRE_PROCESO)) presentes.add(codigo);
    return [...presentes].sort((a, b) => (NOMBRE_PROCESO[a] ?? a).localeCompare(NOMBRE_PROCESO[b] ?? b));
  }, [reglas]);

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return reglas.filter((regla) => {
      if (filtroProceso !== 'TODOS' && regla.process_code !== filtroProceso) return false;
      if (!termino) return true;
      const cuenta = porCodigo.get(regla.account_code);
      return (
        regla.account_code.toLowerCase().includes(termino) ||
        (cuenta?.name ?? '').toLowerCase().includes(termino) ||
        (regla.description ?? '').toLowerCase().includes(termino)
      );
    });
  }, [reglas, filtroProceso, busqueda, porCodigo]);

  /** Reglas agrupadas por proceso, en el orden de la lista. */
  const grupos = useMemo(() => {
    const porProceso = new Map<string, AccountingRule[]>();
    for (const regla of visibles) {
      const lista = porProceso.get(regla.process_code) ?? [];
      lista.push(regla);
      porProceso.set(regla.process_code, lista);
    }
    return [...porProceso.entries()]
      .map(([codigo, lista]) => ({
        codigo,
        nombre: NOMBRE_PROCESO[codigo] ?? codigo,
        reglas: [...lista].sort((a, b) => a.line_order - b.line_order),
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [visibles]);

  const abrirNueva = () => {
    const delProceso = reglas.filter((regla) => regla.process_code === 'VENTA');
    const siguiente = delProceso.reduce((maximo, regla) => Math.max(maximo, regla.line_order), 0) + 1;
    const nueva = { ...VACIA, lineOrder: siguiente };
    setEditar(nueva);
    setOriginal(nueva);
    setErrores({});
  };

  const abrirEdicion = (regla: AccountingRule) => {
    const datos = aReglaInput(regla);
    setEditar(datos);
    setOriginal(datos);
    setErrores({});
  };

  const hayCambios = Boolean(
    editar && original && JSON.stringify(editar) !== JSON.stringify(original),
  );

  const cerrarFormulario = () => {
    if (hayCambios) {
      setConfirmarCierre(true);
      return;
    }
    setEditar(null);
    setOriginal(null);
  };

  const validar = (): boolean => {
    const nuevos: Record<string, string> = {};
    if (!editar) return false;
    if (!editar.accountCode) nuevos.cuenta = 'Elige la cuenta contable.';
    if (!editar.description?.trim()) nuevos.descripcion = 'La descripción es obligatoria.';
    if (!Number.isInteger(editar.lineOrder) || editar.lineOrder < 1) nuevos.orden = 'El orden debe ser 1 o mayor.';
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const enviar = () => {
    if (!editar || !validar()) return;
    guardar.mutate({ ...editar, description: editar.description?.trim() });
  };

  const reglasDelProceso = editar ? reglas.filter((regla) => regla.process_code === editar.processCode) : [];
  const vistaPrevia = calcularCuadre(
    [
      ...reglasDelProceso.filter((regla) => regla.account_code !== editar?.accountCode || regla.line_order !== editar?.lineOrder),
      {
        id: 'preview',
        process_code: editar?.processCode ?? '',
        document_type: '*',
        account_code: editar?.accountCode ?? '',
        side: editar?.side ?? 'DEBE',
        base_calculation: editar?.baseCalculation ?? 'TOTAL',
        line_order: editar?.lineOrder ?? 0,
        is_active: true,
      } as AccountingRule,
    ].filter(Boolean) as AccountingRule[],
    IMPORTE_EJEMPLO,
    COSTO_EJEMPLO,
  );

  return (
    <Page>
      <PageHeader
        title="Reglas de contabilización"
        description="Qué cuentas usa cada operación, con qué lado y con qué base de cálculo"
      >
        <Button size="sm" onClick={abrirNueva}>
          <Plus className="mr-1 h-4 w-4" /> Nueva regla
        </Button>
      </PageHeader>

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2 p-3">
          <span className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por cuenta o descripción"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              aria-label="Buscar reglas"
            />
          </span>
          <Select value={filtroProceso} onValueChange={setFiltroProceso}>
            <SelectTrigger className="h-8 w-56 sm:ml-auto" aria-label="Filtrar por proceso">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos los procesos</SelectItem>
              {procesos.map((codigo) => (
                <SelectItem key={codigo} value={codigo}>{NOMBRE_PROCESO[codigo] ?? codigo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? <Card className="p-4 text-sm text-muted-foreground">Cargando reglas…</Card> : null}

      <div className="space-y-4">
        {grupos.map((grupo) => {
          const { cuadra, debe, haber } = calcularCuadre(grupo.reglas, IMPORTE_EJEMPLO, COSTO_EJEMPLO);
          const esAjuste = grupo.codigo === 'AJUSTE';
          return (
            <Card key={grupo.codigo} flush>
              <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-4 py-2">
                <span className="text-sm font-semibold">{grupo.nombre}</span>
                <Badge variant="outline">{grupo.reglas.length} línea(s)</Badge>
                {esAjuste ? (
                  <Badge
                    variant="outline"
                    className="cursor-help"
                    title="El ajuste de inventario tiene dos asientos alternativos: uno por pérdida y otro por sobrante. Se usan según el signo del ajuste, por eso no se suman."
                  >
                    Variantes: pérdida y sobrante
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className={
                      cuadra
                        ? 'border-emerald-600/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                        : 'border-destructive/30 bg-destructive/5 text-destructive'
                    }
                    title={`Con un importe de ejemplo de S/ ${IMPORTE_EJEMPLO.toFixed(2)}: Debe S/ ${debe.toFixed(2)} · Haber S/ ${haber.toFixed(2)}`}
                  >
                    {cuadra ? 'Cuadra ✓' : `No cuadra (D ${debe.toFixed(2)} / H ${haber.toFixed(2)})`}
                  </Badge>
                )}
              </div>

              {/* Anchos fijos: sin ellos la descripción se desplazaba según el
                  largo del nombre de la cuenta de cada proceso. */}
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Orden</TableHead>
                    <TableHead className="w-24">Lado</TableHead>
                    <TableHead className="w-40">Base</TableHead>
                    <TableHead className="w-[28%]">Cuenta</TableHead>
                    <TableHead className="w-[24%]">Descripción</TableHead>
                    <TableHead align="right" className="w-20">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grupo.reglas.map((regla) => {
                    const cuenta = porCodigo.get(regla.account_code);
                    return (
                      <TableRow key={`${regla.process_code}-${regla.id}`}>
                        <TableCell className="tabular-nums">{regla.line_order}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              regla.side === 'DEBE'
                                ? 'border-emerald-600/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                                : 'border-sky-600/30 bg-sky-500/5 text-sky-700 dark:text-sky-400'
                            }
                          >
                            {regla.side === 'DEBE' ? 'Debe' : 'Haber'}
                          </Badge>
                        </TableCell>
                        <TableCell>{etiquetaBase(regla.base_calculation)}</TableCell>
                        <TableCell>
                          {/* min-w-0 permite que el nombre se recorte en lugar de
                              empujar la columna y montarse sobre la descripción. */}
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="shrink-0 font-mono text-xs">{regla.account_code}</span>
                            {cuenta ? (
                              <span className="truncate text-xs text-muted-foreground" title={cuenta.name}>
                                {cuenta.name}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="block truncate text-muted-foreground" title={regla.description ?? ''}>
                            {regla.description ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant="ghost"
                            size="icon"
                            title={`Editar la regla ${regla.line_order} de ${grupo.nombre}`}
                            aria-label={`Editar la regla ${regla.line_order} de ${grupo.nombre}`}
                            onClick={() => abrirEdicion(regla)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          );
        })}
      </div>

      <Dialog open={editar !== null} onOpenChange={(abierto) => { if (!abierto) cerrarFormulario(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{original?.accountCode ? 'Editar regla' : 'Nueva regla'}</DialogTitle>
            <DialogDescription>
              Este cambio afectará solo los asientos nuevos. Los ya registrados no se modifican.
            </DialogDescription>
          </DialogHeader>

          {editar ? (
            <div className="space-y-3 py-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-medium">
                  Proceso
                  <Select
                    value={editar.processCode}
                    onValueChange={(valor) => setEditar({ ...editar, processCode: valor })}
                    disabled={Boolean(original?.accountCode)}
                  >
                    <SelectTrigger className="h-8" aria-label="Proceso">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(NOMBRE_PROCESO).map(([codigo, nombre]) => (
                        <SelectItem key={codigo} value={codigo}>{nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {original?.accountCode ? (
                    <span className="block text-[11px] text-muted-foreground">
                      El proceso no se cambia al editar una regla existente.
                    </span>
                  ) : null}
                </label>

                <label className="space-y-1 text-xs font-medium">
                  Orden
                  <Input
                    type="number"
                    min={1}
                    value={editar.lineOrder}
                    onChange={(evento) => setEditar({ ...editar, lineOrder: Number(evento.target.value) })}
                    aria-label="Orden de la línea"
                  />
                  {errores.orden ? <span className="block text-[11px] text-destructive">{errores.orden}</span> : null}
                </label>

                <label className="space-y-1 text-xs font-medium">
                  Lado
                  <Select value={editar.side} onValueChange={(valor) => setEditar({ ...editar, side: valor as 'DEBE' | 'HABER' })}>
                    <SelectTrigger className="h-8" aria-label="Lado">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEBE">Debe</SelectItem>
                      <SelectItem value="HABER">Haber</SelectItem>
                    </SelectContent>
                  </Select>
                </label>

                <label className="space-y-1 text-xs font-medium">
                  Base
                  <Select value={editar.baseCalculation} onValueChange={(valor) => setEditar({ ...editar, baseCalculation: valor })}>
                    <SelectTrigger className="h-8" aria-label="Base de cálculo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BASES.map((base) => (
                        <SelectItem key={base.valor} value={base.valor}>{base.etiqueta}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="block text-[11px] font-normal text-muted-foreground">
                    {BASES.find((base) => base.valor === editar.baseCalculation)?.ayuda}
                  </span>
                </label>
              </div>

              <div className="space-y-1 text-xs font-medium">
                Cuenta
                <AccountCombobox
                  idPrefijo="regla"
                  accounts={cuentasImputables}
                  value={editar.accountCode}
                  onChange={(code) => setEditar({ ...editar, accountCode: code })}
                  placeholder="Buscar cuenta imputable por código o nombre"
                />
                {errores.cuenta ? <span className="block text-[11px] text-destructive">{errores.cuenta}</span> : null}
                <span className="block text-[11px] font-normal text-muted-foreground">
                  Solo cuentas de último nivel y activas.
                </span>
              </div>

              <label className="block space-y-1 text-xs font-medium">
                Descripción
                <Input
                  value={editar.description ?? ''}
                  onChange={(evento) => setEditar({ ...editar, description: evento.target.value })}
                  aria-label="Descripción de la regla"
                />
                {errores.descripcion ? (
                  <span className="block text-[11px] text-destructive">{errores.descripcion}</span>
                ) : null}
              </label>

              {/* Vista previa del asiento con el importe de ejemplo. */}
              <Card className="p-3">
                <p className="text-xs font-medium">Vista previa del asiento</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Con un importe de ejemplo de S/ {IMPORTE_EJEMPLO.toFixed(2)} y un costo de S/ {COSTO_EJEMPLO.toFixed(2)}.
                </p>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span>Debe: <strong className="tabular-nums">S/ {vistaPrevia.debe.toFixed(2)}</strong></span>
                  <span>Haber: <strong className="tabular-nums">S/ {vistaPrevia.haber.toFixed(2)}</strong></span>
                  <Badge
                    variant="outline"
                    className={
                      vistaPrevia.cuadra
                        ? 'border-emerald-600/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                        : 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400'
                    }
                  >
                    {vistaPrevia.cuadra ? 'Cuadra ✓' : 'Aún no cuadra'}
                  </Badge>
                </div>
              </Card>

              {errores.general ? (
                <p className="flex items-center gap-2 text-xs text-destructive">
                  <TriangleAlert className="h-3.5 w-3.5" /> {errores.general}
                </p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={cerrarFormulario}>Cancelar</Button>
            <Button onClick={enviar} disabled={guardar.isPending}>
              <Save className="mr-1 h-4 w-4" />
              {guardar.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación al cerrar con cambios sin guardar. */}
      <Dialog open={confirmarCierre} onOpenChange={setConfirmarCierre}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Descartar los cambios?</DialogTitle>
            <DialogDescription>
              La regla tiene cambios sin guardar. Si cierras ahora se perderán.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarCierre(false)}>Seguir editando</Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmarCierre(false);
                setEditar(null);
                setOriginal(null);
                setErrores({});
              }}
            >
              Descartar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

/** Convierte una regla guardada en el formulario. */
function aReglaInput(regla: AccountingRule): AccountingRuleInput {
  return {
    processCode: regla.process_code,
    documentType: regla.document_type,
    lineOrder: regla.line_order,
    accountCode: regla.account_code,
    side: regla.side,
    baseCalculation: regla.base_calculation,
    description: regla.description ?? '',
  };
}
