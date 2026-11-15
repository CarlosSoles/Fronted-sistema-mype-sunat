import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Page, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { extractApiErrorMessage } from '@/lib/apiErrors';
import { warehousesApi } from '../services/warehousesApi';

export default function UserWarehousesPage() {
  const queryClient = useQueryClient();
  const almacenes = useQuery({ queryKey: ['auth', 'warehouses'], queryFn: warehousesApi.list });
  const usuarios = useQuery({ queryKey: ['auth', 'users'], queryFn: warehousesApi.listUsers });
  const [seleccion, setSeleccion] = useState<Record<string, string[]>>({});
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [activos, setActivos] = useState<Record<string, boolean>>({});
  const [mensaje, setMensaje] = useState('');
  useEffect(() => {
    if (usuarios.data) {
      setSeleccion(Object.fromEntries(usuarios.data.map((u) => [u.id, u.warehouseCodes])));
      setRoles(Object.fromEntries(usuarios.data.map((u) => [u.id, u.role])));
      setActivos(Object.fromEntries(usuarios.data.map((u) => [u.id, u.isActive])));
    }
  }, [usuarios.data]);
  const guardar = useMutation({
    mutationFn: async (userId: string) => {
      await warehousesApi.updateUser(userId, { role: roles[userId], isActive: activos[userId] });
      const usuario = (usuarios.data ?? []).find((u) => u.id === userId);
      if (usuario?.role !== 'ADMIN' && roles[userId] !== 'ADMIN') await warehousesApi.setUserWarehouses(userId, seleccion[userId] ?? []);
    },
    onSuccess: async () => { setMensaje('Accesos actualizados.'); await queryClient.invalidateQueries({ queryKey: ['auth', 'users'] }); },
    onError: (e: unknown) => setMensaje(extractApiErrorMessage(e, 'No se pudieron guardar los accesos.')),
  });
  const alternar = (userId: string, code: string) => {
    const actual = seleccion[userId] ?? [];
    setSeleccion({ ...seleccion, [userId]: actual.includes(code) ? actual.filter((c) => c !== code) : [...actual, code] });
  };
  return (
    <Page>
      <PageHeader title="Usuarios y almacenes" description="Define qué almacenes puede usar cada usuario. El administrador conserva acceso a todos." />
      {mensaje ? <p role="status" className="mb-3 text-xs text-muted-foreground">{mensaje}</p> : null}
      <Card flush>
        <Table>
          <TableHeader><TableRow><TableHead>Usuario</TableHead><TableHead>Rol / estado</TableHead><TableHead>Almacenes permitidos</TableHead><TableHead align="right">Acción</TableHead></TableRow></TableHeader>
          <TableBody>
            {usuarios.isLoading ? <TableRow><TableCell colSpan={4}>Cargando usuarios…</TableCell></TableRow> : null}
            {(usuarios.data ?? []).map((u) => (
              <TableRow key={u.id}>
                <TableCell><p className="text-xs font-medium">{u.fullName}</p><p className="text-[11px] text-muted-foreground">{u.email}</p></TableCell>
                <TableCell><select aria-label={`Rol ${u.email}`} className="h-8 rounded-md border bg-background px-2 text-xs" value={roles[u.id] ?? u.role} onChange={(e) => setRoles({ ...roles, [u.id]: e.target.value })}><option value="ADMIN">ADMIN</option><option value="CONTADOR">CONTADOR</option><option value="OPERADOR_FACTURACION">OPERADOR_FACTURACION</option><option value="OPERADOR_ADUANAS">OPERADOR_ADUANAS</option><option value="AUDITOR">AUDITOR</option></select><label className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground"><input type="checkbox" checked={activos[u.id] ?? u.isActive} onChange={(e) => setActivos({ ...activos, [u.id]: e.target.checked })} />Activo</label></TableCell>
                <TableCell>
                  {u.role === 'ADMIN' ? <span className="text-xs text-muted-foreground">Todos los almacenes</span> : (
                    <div className="flex flex-wrap gap-2">
                      {(almacenes.data ?? []).map((a) => (
                        <label key={a.warehouse_code} className="flex items-center gap-1 text-xs">
                          <input type="checkbox" checked={(seleccion[u.id] ?? []).includes(a.warehouse_code)} onChange={() => alternar(u.id, a.warehouse_code)} />
                          {a.warehouse_code} · {a.description}
                        </label>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell align="right"><Button size="sm" variant="outline" disabled={guardar.isPending} onClick={() => guardar.mutate(u.id)}>Guardar</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Page>
  );
}
