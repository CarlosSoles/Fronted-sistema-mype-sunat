import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Pencil, Plus, Power, Search } from 'lucide-react';
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
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { accountingApi } from '../services/accountingApi';
import type { AccountingAccount } from '../types/accounting.types';

/** Elementos del PCGE, en el orden oficial. El primero dígito del código manda. */
const ELEMENTOS = [
  { value: '1', label: 'Activo' },
  { value: '2', label: 'Activo realizable' },
  { value: '3', label: 'Activo inmovilizado' },
  { value: '4', label: 'Pasivo' },
  { value: '5', label: 'Patrimonio' },
  { value: '6', label: 'Gastos' },
  { value: '7', label: 'Ingresos' },
  { value: '8', label: 'Saldos intermediarios' },
  { value: '9', label: 'Costos de producción' },
];

/** "1011101" -> "101110"; una cuenta raíz no tiene padre. */
const nuevaPadreDe = (codigo: string): string => (codigo.length > 1 ? codigo.slice(0, -1) : 'Sin padre (cuenta raíz)');

/**
 * Mensaje de error al editar una cuenta.
 *
 * Si el servidor responde 404, la causa casi siempre es que el backend
 * desplegado aún no tiene el endpoint de edición: sin este aviso el botón
 * "no hacía nada".
 */
const mensajeDeErrorCuenta = (error: any, respaldo: string): string => {
  if (error?.response?.status === 404) {
    return 'El servidor todavía no tiene habilitada la edición de cuentas. Falta desplegar el backend con este cambio.';
  }
  const texto = error?.response?.data?.message;
  if (Array.isArray(texto)) return texto.join(' · ');
  return typeof texto === 'string' && texto.trim() ? texto : respaldo;
};

/**
 * Plan de cuentas que usa el módulo de facturación.
 *
 * POR QU0 ESTAS Y NO OTRAS
 *
 * Las cuatro filas anteriores (`121101`, `401111`, `601101`, `701111`) no eran
 * del PCGE: tenían un dígito de más y no coincidían con ninguna cuenta del
 * asiento real, así que la pantalla mostraba un catálogo que no se usaba en
 * ninguna parte.
 *
 * Esta lista sale de dos fuentes verificables, no de memoria:
 *
 *  - las cuentas que asigna `accountingBridge.ts` al asentar una venta
 *    (12121, 12129, 40111, 40114, 70121, 70321, 70521, 74111);
 *  - las cuentas que realmente aparecen en `accounting_lines` de la base de
 *    datos (12121, 1212, 40111, 70121).
 *
 * Se incluyen además las de compras y gastos porque completan los elementos 1,
 * 2, 4, 6 y 7 que el docente pidió ver: "tenemos las 70, 40, 12... y tiene su
 * subdivisionaria".
 */

interface TreeNode extends AccountingAccount {
  children: TreeNode[];
}

function buildTree(accounts: AccountingAccount[]): TreeNode[] {
  const byCode = new Map<string, TreeNode>();
  accounts.forEach((account) => byCode.set(account.code, { ...account, children: [] }));
  const roots: TreeNode[] = [];
  byCode.forEach((node) => {
    if (node.parentCode && byCode.has(node.parentCode)) {
      byCode.get(node.parentCode)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

export default function AccountingPlanCuentasPage() {
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'ACTIVA' | 'INACTIVA'>('TODOS');
  const [abrirAlta, setAbrirAlta] = useState(false);
  const [abrirTesoreria, setAbrirTesoreria] = useState(false);
  const [nueva, setNueva] = useState({ code: '', name: '', parentCode: '' });
  const [errorAlta, setErrorAlta] = useState<string | null>(null);
  const [editando, setEditando] = useState<{ code: string; name: string; element: string } | null>(null);
  /** Aviso temporal: se borra solo y al iniciar otra acción. */
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'aviso'; texto: string } | null>(null);

  useEffect(() => {
    if (!aviso) return;
    const temporizador = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(temporizador);
  }, [aviso]);
  const queryClient = useQueryClient();

  const refrescar = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['accounting-accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-accounts', 'all'] }),
    ]);
  };

  /** Activa o desactiva una cuenta sin borrarla (los asientos la referencian). */
  const alternar = useMutation({
    mutationFn: ({ code, isActive }: { code: string; isActive: boolean }) =>
      accountingApi.updateAccount(code, { isActive }),
    onSuccess: async (resultado, variables) => {
      const cuantas = resultado.descendientesAfectados;
      const accion = variables.isActive ? 'activada' : 'inactivada';
      setAviso({
        tipo: 'ok',
        texto: cuantas > 0
          ? `Cuenta ${variables.code} ${accion} junto con ${cuantas} subcuenta(s).`
          : `Cuenta ${variables.code} ${accion}.`,
      });
      // Las advertencias (reglas, tesorería) se muestran como aviso aparte.
      if (resultado.advertencias.length > 0) {
        setAviso({ tipo: 'aviso', texto: resultado.advertencias.join(' ') });
      }
      setErrorAlta(null);
      await refrescar();
    },
    onError: (e: any) => setErrorAlta(mensajeDeErrorCuenta(e, 'No se pudo cambiar el estado de la cuenta.')),
  });

  const renombrar = useMutation({
    mutationFn: ({ code, name, element }: { code: string; name: string; element?: string }) =>
      accountingApi.updateAccount(code, { name: name.trim(), ...(element ? { element } : {}) }),
    onSuccess: async () => { setEditando(null); setErrorAlta(null); await refrescar(); },
    onError: (e: any) => setErrorAlta(mensajeDeErrorCuenta(e, 'No se pudo renombrar la cuenta.')),
  });

  const crear = useMutation({
    mutationFn: () => accountingApi.createAccount({ code: nueva.code.trim(), name: nueva.name.trim(), parentCode: nueva.parentCode.trim() || undefined }),
    onSuccess: async () => { setAbrirAlta(false); setNueva({ code: '', name: '', parentCode: '' }); setErrorAlta(null); await refrescar(); },
    onError: (e: any) => setErrorAlta(e?.response?.data?.message ?? 'No se pudo crear la cuenta.'),
  });
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9']));

  const { data: accounts = [], isLoading, error } = useQuery({
    queryKey: ['accounting-accounts', 'all'],
    // El plan muestra también las inactivas para poder reactivarlas; los
    // selectores de asiento siguen pidiendo solo las activas.
    queryFn: () => accountingApi.getAccounts({ includeInactive: true }),
  });

  const padresPosibles = useMemo(() => accounts.filter((a) => a.code.length < nueva.code.length && nueva.code.startsWith(a.code)).sort((a, b) => b.code.length - a.code.length), [accounts, nueva.code]);
  const cuentaEditadaActiva = Boolean(accounts.find((cuenta) => cuenta.code === editando?.code)?.isActive);
  const padreExiste = !nueva.code || nueva.code.length === 1 || accounts.some((a) => a.code === nueva.parentCode);
  const tree = useMemo(() => buildTree(accounts), [accounts]);

  /**
   * Códigos que cumplen los filtros.
   *
   * El árbol no se sustituye por esta lista: se usa para decidir qué ramas se
   * muestran, de modo que la jerarquía y las acciones se conservan siempre.
   */
  const coincidencias = useMemo(() => {
    const term = search.trim().toLowerCase();
    const hayFiltros = Boolean(term || filtroTipo || filtroEstado !== 'TODOS');
    const codigos = new Set<string>();
    for (const account of accounts) {
      if (filtroTipo && !account.code.startsWith(filtroTipo)) continue;
      if (filtroEstado === 'ACTIVA' && !account.isActive) continue;
      if (filtroEstado === 'INACTIVA' && account.isActive) continue;
      if (term && !account.code.toLowerCase().includes(term) && !account.name.toLowerCase().includes(term)) {
        continue;
      }
      codigos.add(account.code);
    }
    return { codigos, hayFiltros };
  }, [accounts, search, filtroTipo, filtroEstado]);

  /** Árbol visible: coincidencias más sus ancestros, sin perder la jerarquía. */
  const arbolVisible = useMemo(() => {
    if (!coincidencias.hayFiltros) return tree;
    const porCodigo = new Map(accounts.map((cuenta) => [cuenta.code, cuenta]));
    const incluir = new Set<string>();
    for (const code of coincidencias.codigos) {
      incluir.add(code);
      let actual = porCodigo.get(code);
      while (actual?.parentCode) {
        incluir.add(actual.parentCode);
        actual = porCodigo.get(actual.parentCode);
      }
    }
    const podar = (nodos: TreeNode[]): TreeNode[] =>
      nodos
        .filter((nodo) => incluir.has(nodo.code))
        .map((nodo) => ({ ...nodo, children: podar(nodo.children) }));
    return podar(tree);
  }, [tree, accounts, coincidencias]);

  // Con filtros activos, las ramas con coincidencias se abren solas.
  useEffect(() => {
    if (!coincidencias.hayFiltros) return;
    const porCodigo = new Map(accounts.map((cuenta) => [cuenta.code, cuenta]));
    const abrir = new Set<string>();
    for (const code of coincidencias.codigos) {
      let actual = porCodigo.get(code);
      while (actual?.parentCode) {
        abrir.add(actual.parentCode);
        actual = porCodigo.get(actual.parentCode);
      }
    }
    if (abrir.size === 0) return;
    setExpanded((prev) => new Set([...prev, ...abrir]));
  }, [coincidencias, accounts]);

  const toggle = (code: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  /** Subcuentas de una cuenta, para avisar cuántas se verán afectadas. */
  const descendientesDe = (code: string): number =>
    accounts.filter((cuenta) => cuenta.code !== code && cuenta.code.startsWith(code)).length;

  /** Resalta el término buscado dentro de un texto. */
  const terminoBusqueda = search.trim().toLowerCase();
  const resaltar = (texto: string): React.ReactNode => {
    if (!terminoBusqueda) return texto;
    const posicion = texto.toLowerCase().indexOf(terminoBusqueda);
    if (posicion < 0) return texto;
    return (
      <>
        {texto.slice(0, posicion)}
        <mark className="rounded bg-amber-200/70 px-0.5 dark:bg-amber-400/30">
          {texto.slice(posicion, posicion + terminoBusqueda.length)}
        </mark>
        {texto.slice(posicion + terminoBusqueda.length)}
      </>
    );
  };

  const renderRow = (node: TreeNode, depth: number): React.ReactNode[] => {
    const isOpen = expanded.has(node.code);
    const hasChildren = node.children.length > 0;
    // Con filtros activos, los ancestros que no coinciden se atenúan.
    const coincide = !coincidencias.hayFiltros || coincidencias.codigos.has(node.code);
    // Una subcuenta no se reactiva mientras su padre siga inactivo.
    const padre = node.parentCode ? accounts.find((cuenta) => cuenta.code === node.parentCode) : undefined;
    const padreInactivo = !node.isActive && padre !== undefined && !padre.isActive;
    const rows: React.ReactNode[] = [
      <TableRow key={node.code} className={coincide ? undefined : 'opacity-60'}>
        <TableCell>
          <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 18}px` }}>
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggle(node.code)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={isOpen ? `Contraer ${node.code}` : `Expandir ${node.code}`}
              >
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <span className="w-4" />
            )}
            <span className="font-mono font-bold">{resaltar(node.code)}</span>
          </div>
        </TableCell>
        <TableCell className={node.level <= 2 ? 'font-semibold' : ''}>{resaltar(node.name)}</TableCell>
        <TableCell>{node.element}</TableCell>
        <TableCell align="center">
          <Badge variant={node.nature === 'Deudora' ? 'secondary' : 'outline'}>{node.nature}</Badge>
        </TableCell>
        <TableCell align="center">{node.children.length || ''}</TableCell>
        <TableCell align="center">
          <Badge
            variant="outline"
            className={
              node.isActive
                ? 'border-emerald-600/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                : 'text-muted-foreground'
            }
          >
            {node.isActive ? 'Activa' : 'Inactiva'}
          </Badge>
        </TableCell>
        <TableCell align="center">
          <span className="flex items-center justify-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Editar ${node.code}`}
              onClick={() => setEditando({ code: node.code, name: node.name, element: node.element })}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={node.isActive ? `Desactivar ${node.code}` : `Activar ${node.code}`}
              aria-pressed={!node.isActive}
              title={
                padreInactivo
                  ? 'Active primero la cuenta padre'
                  : node.isActive
                    ? 'Inactivar cuenta'
                    : 'Reactivar cuenta'
              }
              // Solo se bloquea el botón de la fila que se está guardando; si se
              // deshabilitaran todos, parecería que se pulsaron en todas.
              // Una subcuenta con el padre inactivo no se puede reactivar.
              disabled={(alternar.isPending && alternar.variables?.code === node.code) || padreInactivo}
              onClick={() => {
                if (node.isActive) {
                  const subcuentas = descendientesDe(node.code);
                  const mensaje = subcuentas > 0
                    ? `Esta cuenta tiene ${subcuentas} subcuenta(s) activa(s) y se inactivarán también. ¿Continuar?`
                    : `¿Inactivar la cuenta ${node.code} · ${node.name}?`;
                  if (!window.confirm(mensaje)) return;
                }
                setAviso(null);
                alternar.mutate({ code: node.code, isActive: !node.isActive });
              }}
            >
              <Power className={`h-4 w-4 ${node.isActive ? '' : 'text-muted-foreground'}`} />
            </Button>
          </span>
        </TableCell>
      </TableRow>,
    ];
    if (isOpen) {
      node.children.forEach((child) => rows.push(...renderRow(child, depth + 1)));
    }
    return rows;
  };

  return (
    <Page>
      <PageHeader
        title="Cuentas Contables"
        description={`${accounts.length} cuentas · jerarquía por elemento, cuenta y subcuenta`}
      >
        <Button size="sm" variant="outline" onClick={() => setAbrirTesoreria(true)}>Cuentas de tesorería</Button>
        <Button size="sm" onClick={() => setAbrirAlta(true)}><Plus className="h-4 w-4 mr-1" /> Nueva cuenta</Button>
      </PageHeader>

      <TreasuryAccountsCard abierto={abrirTesoreria} onCerrar={() => setAbrirTesoreria(false)} cuentas={accounts} />

      {aviso ? (
        <Card
          className={
            aviso.tipo === 'ok'
              ? 'border-emerald-600/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400'
              : 'border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400'
          }
        >
          {aviso.texto}
        </Card>
      ) : null}

      {errorAlta ? (
        <Card className="border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{errorAlta}</Card>
      ) : null}

      <Card className="mb-4">
        <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por código o nombre"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <Select value={filtroTipo || 'todos'} onValueChange={(v) => setFiltroTipo(v === 'todos' ? '' : v)}>
              <SelectTrigger className="h-9 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                {/* Elementos del PCGE: el 2 no es Pasivo, es Activo realizable. */}
                <SelectItem value="1">Activo</SelectItem>
                <SelectItem value="2">Activo realizable</SelectItem>
                <SelectItem value="3">Activo inmovilizado</SelectItem>
                <SelectItem value="4">Pasivo</SelectItem>
                <SelectItem value="5">Patrimonio</SelectItem>
                <SelectItem value="6">Gastos</SelectItem>
                <SelectItem value="7">Ingresos</SelectItem>
                <SelectItem value="8">Saldos intermediarios</SelectItem>
                <SelectItem value="9">Costos de producción</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as 'TODOS' | 'ACTIVA' | 'INACTIVA')}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los estados</SelectItem>
                <SelectItem value="ACTIVA">Activas</SelectItem>
                <SelectItem value="INACTIVA">Inactivas</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs tabular-nums text-muted-foreground">
              Mostrando {coincidencias.hayFiltros ? coincidencias.codigos.size : accounts.length} de {accounts.length} cuentas
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExpanded(new Set(accounts.filter((cuenta) => descendientesDe(cuenta.code) > 0).map((cuenta) => cuenta.code)))}
            >
              Expandir todo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExpanded(new Set())}
            >
              Colapsar todo
            </Button>
          </div>
        </div>
      </Card>

      {error ? (
        <Card className="p-6 text-sm text-destructive">
          No se pudo cargar el plan de cuentas. Revisa la sesión y la conexión con el backend.
        </Card>
      ) : (
        <Card flush>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código PCGE</TableHead>
                <TableHead>Denominación de la cuenta</TableHead>
                <TableHead>Elemento</TableHead>
                <TableHead align="center">Naturaleza</TableHead>
                <TableHead align="center">Subcuentas</TableHead>
                <TableHead align="center">Estado</TableHead>
                <TableHead align="center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6}>Cargando catálogo PCGE⬦</TableCell>
                </TableRow>
              ) : arbolVisible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>No hay cuentas que coincidan con la búsqueda.</TableCell>
                </TableRow>
              ) : (
                // Una sola vista de árbol, con o sin filtros: así nunca se
                // pierden las flechas, el conteo ni las acciones.
                arbolVisible.flatMap((node) => renderRow(node, 0))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
      <Dialog open={Boolean(editando)} onOpenChange={(abierto) => { if (!abierto) setEditando(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cuenta contable</DialogTitle>
            <DialogDescription>
              Modifica los datos de la cuenta. El código no se cambia porque los asientos ya
              registrados lo referencian.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium" htmlFor="editar-codigo">Código</label>
                <Input id="editar-codigo" value={editando?.code ?? ''} disabled className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" htmlFor="editar-tipo">Tipo de cuenta</label>
                <Select
                  value={editando?.element ?? undefined}
                  onValueChange={(valor) => setEditando((prev) => (prev ? { ...prev, element: valor } : prev))}
                >
                  <SelectTrigger id="editar-tipo">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ELEMENTOS.map((elemento) => (
                      <SelectItem key={elemento.label} value={elemento.label}>{elemento.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="cuenta-nombre">Nombre de la cuenta</label>
              <Input
                id="cuenta-nombre"
                value={editando?.name ?? ''}
                onChange={(evento) => setEditando((prev) => (prev ? { ...prev, name: evento.target.value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="editar-padre">Cuenta padre (subcuenta de)</label>
              <Input
                id="editar-padre"
                value={nuevaPadreDe(editando?.code ?? '')}
                disabled
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Cuenta activa</p>
                <p className="text-xs text-muted-foreground">Disponible para registrar asientos.</p>
              </div>
              <Switch
                checked={cuentaEditadaActiva}
                aria-label="Cuenta activa"
                disabled={alternar.isPending}
                onCheckedChange={() => {
                  const actual = accounts.find((cuenta) => cuenta.code === editando?.code);
                  if (actual) alternar.mutate({ code: actual.code, isActive: !actual.isActive });
                }}
              />
            </div>
            {errorAlta ? <p className="text-xs text-destructive">{errorAlta}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button
              onClick={() => { if (editando) renombrar.mutate(editando); }}
              disabled={renombrar.isPending || !editando?.name.trim()}
            >
              {renombrar.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={abrirAlta} onOpenChange={setAbrirAlta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva cuenta contable</DialogTitle>
            <DialogDescription>
              El código es único en todo el plan contable. Una subcuenta hereda el tipo de su cuenta padre.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium" htmlFor="nueva-codigo">Código</label>
                <Input
                  id="nueva-codigo"
                  value={nueva.code}
                  inputMode="numeric"
                  onChange={(e) => {
                    const code = e.target.value.replace(/\D/g, '');
                    setNueva({ ...nueva, code, parentCode: code.length > 1 ? code.slice(0, -1) : '' });
                  }}
                  placeholder="1011101"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" htmlFor="nueva-tipo">Tipo de cuenta</label>
                <Select
                  value={nueva.code.charAt(0) || undefined}
                  onValueChange={(valor) => setNueva({ ...nueva, code: valor })}
                  disabled={Boolean(nueva.code)}
                >
                  <SelectTrigger id="nueva-tipo">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ELEMENTOS.map((elemento) => (
                      <SelectItem key={elemento.value} value={elemento.value}>{elemento.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="nueva-nombre">Nombre de la cuenta</label>
              <Input
                id="nueva-nombre"
                value={nueva.name}
                onChange={(e) => setNueva({ ...nueva, name: e.target.value })}
                placeholder="Almacén principal"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="nueva-padre">Cuenta padre (subcuenta de)</label>
              <Select
                value={nueva.parentCode || 'raiz'}
                onValueChange={(valor) => setNueva({ ...nueva, parentCode: valor === 'raiz' ? '' : valor })}
              >
                <SelectTrigger id="nueva-padre">
                  <SelectValue placeholder="Sin padre (cuenta raíz)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="raiz">Sin padre (cuenta raíz)</SelectItem>
                  {padresPosibles.map((cuenta) => (
                    <SelectItem key={cuenta.code} value={cuenta.code}>
                      {cuenta.code} · {cuenta.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {nueva.code.length > 1 && !padreExiste ? (
                <p className="text-xs text-destructive">No existe la cuenta padre {nueva.parentCode}. Créala primero.</p>
              ) : null}
            </div>
            {errorAlta ? <p className="text-xs text-destructive">{errorAlta}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbrirAlta(false)}>Cancelar</Button>
            <Button onClick={() => crear.mutate()} disabled={crear.isPending || !nueva.code || !nueva.name || !padreExiste}>
              {crear.isPending ? 'Creando…' : 'Registrar cuenta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

/**
 * Cuentas de tesorería de la empresa: alias operativo ("BCP cuenta corriente",
 * "Caja chica") sobre una subcuenta del PCGE. El asiento de un cobro o pago usa
 * la subcuenta que se elija aquí, no una cuenta fija del código.
 */
function TreasuryAccountsCard({
  abierto,
  onCerrar,
  cuentas,
}: {
  abierto: boolean;
  onCerrar: () => void;
  cuentas: AccountingAccount[];
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ code: '', name: '', kind: 'BANCO' as 'CAJA' | 'BANCO' });
  const [error, setError] = useState<string | null>(null);
  const { data: tesoreria = [] } = useQuery({
    queryKey: ['treasury-accounts'],
    queryFn: () => accountingApi.getTreasuryAccounts(),
  });

  const refrescar = async () => {
    await queryClient.invalidateQueries({ queryKey: ['treasury-accounts'] });
  };

  const crear = useMutation({
    mutationFn: () => accountingApi.createTreasuryAccount({ code: form.code, name: form.name, kind: form.kind }),
    onSuccess: async () => { setForm({ code: '', name: '', kind: 'BANCO' }); setError(null); await refrescar(); },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'No se pudo crear la cuenta de tesorería.'),
  });

  const alternar = useMutation({
    mutationFn: (cuenta: { id: string; isActive: boolean }) =>
      accountingApi.updateTreasuryAccount(cuenta.id, { isActive: !cuenta.isActive }),
    onSuccess: refrescar,
    onError: (e: any) => setError(e?.response?.data?.message ?? 'No se pudo actualizar la cuenta.'),
  });

  // Solo subcuentas hoja: el backend rechaza cuentas de mayor con subcuentas.
  const padres = new Set(cuentas.map((c) => c.parentCode).filter(Boolean));
  const hojas = cuentas.filter((c) => !padres.has(c.code)).sort((a, b) => a.code.localeCompare(b.code));

  return (
    <Dialog open={abierto} onOpenChange={(open) => { if (!open) onCerrar(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cuentas de tesorería</DialogTitle>
          <DialogDescription>
            Subcuentas de caja o banco que usan los cobros y pagos. El nombre es operativo; el código debe existir en el PCGE.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-2 md:grid-cols-4">
            <label className="text-xs md:col-span-2">Subcuenta PCGE
              <select className="mt-1 h-9 w-full rounded border bg-background px-2" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}>
                <option value="">Seleccionar subcuenta</option>
                {hojas.filter((c) => c.code.startsWith('10')).map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}
              </select>
            </label>
            <label className="text-xs">Tipo
              <select className="mt-1 h-9 w-full rounded border bg-background px-2" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as 'CAJA' | 'BANCO' })}>
                <option value="CAJA">Caja</option>
                <option value="BANCO">Banco</option>
              </select>
            </label>
            <label className="text-xs">Nombre operativo
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="BCP cuenta corriente" />
            </label>
          </div>
          <Button size="sm" onClick={() => crear.mutate()} disabled={crear.isPending || !form.code || !form.name}>
            {crear.isPending ? 'Agregando⬦' : 'Agregar cuenta'}
          </Button>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <Table>
            <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Nombre</TableHead><TableHead>Tipo</TableHead><TableHead align="right">Estado</TableHead></TableRow></TableHeader>
            <TableBody>
              {tesoreria.length === 0 ? <TableRow><TableCell colSpan={4}>Sin cuentas de tesorería configuradas.</TableCell></TableRow> : null}
              {tesoreria.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.code}</TableCell>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>{t.kind === 'CAJA' ? 'Caja' : 'Banco'}</TableCell>
                  <TableCell align="right">
                    <Button size="sm" variant="ghost" onClick={() => alternar.mutate(t)}>{t.isActive ? 'Desactivar' : 'Activar'}</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
