import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { accountingApi } from '../services/accountingApi';
import type { AccountingAccount } from '../types/accounting.types';

/**
 * Plan de cuentas que usa el módulo de facturación.
 *
 * POR QUÉ ESTAS Y NO OTRAS
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
  const [abrirAlta, setAbrirAlta] = useState(false);
  const [abrirTesoreria, setAbrirTesoreria] = useState(false);
  const [nueva, setNueva] = useState({ code: '', name: '', parentCode: '' });
  const [errorAlta, setErrorAlta] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const crear = useMutation({
    mutationFn: () => accountingApi.createAccount({ code: nueva.code.trim(), name: nueva.name.trim(), parentCode: nueva.parentCode.trim() || undefined }),
    onSuccess: async () => { setAbrirAlta(false); setNueva({ code: '', name: '', parentCode: '' }); setErrorAlta(null); await queryClient.invalidateQueries({ queryKey: ['accounting-accounts'] }); },
    onError: (e: any) => setErrorAlta(e?.response?.data?.message ?? 'No se pudo crear la cuenta.'),
  });
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9']));

  const { data: accounts = [], isLoading, error } = useQuery({
    queryKey: ['accounting-accounts'],
    queryFn: () => accountingApi.getAccounts(),
  });

  const padresPosibles = useMemo(() => accounts.filter((a) => a.code.length < nueva.code.length && nueva.code.startsWith(a.code)).sort((a, b) => b.code.length - a.code.length), [accounts, nueva.code]);
  const padreExiste = !nueva.code || nueva.code.length === 1 || accounts.some((a) => a.code === nueva.parentCode);
  const tree = useMemo(() => buildTree(accounts), [accounts]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return null;
    return accounts.filter(
      (account) =>
        account.code.toLowerCase().includes(term) ||
        account.name.toLowerCase().includes(term),
    );
  }, [accounts, search]);

  const toggle = (code: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const renderRow = (node: TreeNode, depth: number): React.ReactNode[] => {
    const isOpen = expanded.has(node.code);
    const hasChildren = node.children.length > 0;
    const rows: React.ReactNode[] = [
      <TableRow key={node.code}>
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
            <span className="font-mono font-bold">{node.code}</span>
          </div>
        </TableCell>
        <TableCell className={node.level <= 2 ? 'font-semibold' : ''}>{node.name}</TableCell>
        <TableCell>{node.element}</TableCell>
        <TableCell align="center">
          <Badge variant={node.nature === 'Deudora' ? 'secondary' : 'outline'}>{node.nature}</Badge>
        </TableCell>
        <TableCell align="center">{node.children.length || '—'}</TableCell>
        <TableCell align="center">
          <Badge variant={node.isActive ? 'outline' : 'secondary'}>
            {node.isActive ? 'Activa' : 'Inactiva'}
          </Badge>
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
        title="Plan Contable General Empresarial (PCGE 2019)"
        description={`${accounts.length} cuentas cargadas · jerarquía por elemento, cuenta y subcuenta`}
      >
        <Button size="sm" variant="outline" onClick={() => setAbrirTesoreria(true)}>Cuentas de tesorería</Button>
        <Button size="sm" onClick={() => setAbrirAlta(true)}><Plus className="h-4 w-4 mr-1" /> Nueva subcuenta</Button>
      </PageHeader>

      <TreasuryAccountsCard abierto={abrirTesoreria} onCerrar={() => setAbrirTesoreria(false)} cuentas={accounts} />

      <Card className="mb-4">
        <div className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por código o nombre de cuenta"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((element) => (
              <Badge key={element} variant="outline">
                Elemento {element}: {accounts.filter((account) => account.code.startsWith(element)).length}
              </Badge>
            ))}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6}>Cargando catálogo PCGE…</TableCell>
                </TableRow>
              ) : filtered ? (
                filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>No hay cuentas que coincidan con la búsqueda.</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((account) => (
                    <TableRow key={account.code} className="transition-colors hover:bg-muted/40">
                      <TableCell className="whitespace-nowrap font-mono text-xs font-semibold">{account.code}</TableCell>
                      <TableCell>{account.name}</TableCell>
                      <TableCell className="text-muted-foreground">{account.element}</TableCell>
                      <TableCell align="center">
                        <Badge variant={account.nature === 'Deudora' ? 'secondary' : 'outline'}>
                          {account.nature}
                        </Badge>
                      </TableCell>
                      <TableCell align="center" className="text-muted-foreground/60">—</TableCell>
                      <TableCell align="center">
                        <Badge
                          variant="outline"
                          className={
                            account.isActive
                              ? 'border-emerald-600/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                              : 'text-muted-foreground'
                          }
                        >
                          {account.isActive ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )
              ) : (
                tree.flatMap((node) => renderRow(node, 0))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
      <Dialog open={abrirAlta} onOpenChange={setAbrirAlta}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva subcuenta PCGE</DialogTitle><DialogDescription>Agrega una divisionaria al catálogo. El código padre debe existir.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><label className="text-xs font-medium">Código</label><Input value={nueva.code} inputMode="numeric" onChange={(e) => { const code = e.target.value.replace(/\D/g, ""); setNueva({ ...nueva, code, parentCode: code.length > 1 ? code.slice(0, -1) : "" }); }} placeholder="2011101" /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium">Nombre</label><Input value={nueva.name} onChange={(e) => setNueva({ ...nueva, name: e.target.value })} placeholder="Almacén principal" /></div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Cuenta padre</label>
              <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={nueva.parentCode} onChange={(e) => setNueva({ ...nueva, parentCode: e.target.value })}>
                <option value="">Sin padre (cuenta raíz)</option>
                {padresPosibles.map((a) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
              </select>
              {nueva.code.length > 1 && !padreExiste ? <p className="text-xs text-destructive">No existe la cuenta padre {nueva.parentCode}. Créala primero.</p> : null}
            </div>
            {errorAlta ? <p className="text-xs text-destructive">{errorAlta}</p> : null}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAbrirAlta(false)}>Cancelar</Button><Button onClick={() => crear.mutate()} disabled={crear.isPending || !nueva.code || !nueva.name || !padreExiste}>{crear.isPending ? 'Creando…' : 'Crear cuenta'}</Button></DialogFooter>
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
            {crear.isPending ? 'Agregando…' : 'Agregar cuenta'}
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
