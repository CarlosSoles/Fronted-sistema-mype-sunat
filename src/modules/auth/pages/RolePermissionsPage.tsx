import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Page, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { extractApiErrorMessage } from '@/lib/apiErrors';
import { MODULES_PERMISOS, ROLES_PERMISOS, modulePermissionsApi, type ModulePermission } from '../services/modulePermissionsApi';

export default function RolePermissionsPage() {
  const queryClient = useQueryClient();
  const permisos = useQuery({ queryKey: ['module-permissions'], queryFn: modulePermissionsApi.list });
  const [rows, setRows] = useState<ModulePermission[]>([]);
  const [mensaje, setMensaje] = useState('');
  useEffect(() => { if (permisos.data) setRows(permisos.data); }, [permisos.data]);
  const guardar = useMutation({
    mutationFn: () => modulePermissionsApi.save(rows),
    onSuccess: async (data) => { setRows(data); setMensaje('Permisos guardados.'); await queryClient.invalidateQueries({ queryKey: ['module-permissions-me'] }); },
    onError: (e: unknown) => setMensaje(extractApiErrorMessage(e, 'No se pudieron guardar los permisos.')),
  });
  const cambiar = (role: string, moduleCode: string, field: 'canView' | 'canWrite') => {
    setRows((prev) => prev.map((r) => r.role === role && r.moduleCode === moduleCode ? { ...r, [field]: !r[field], ...(field === 'canView' && r.canView ? { canWrite: false } : {}), ...(field === 'canWrite' && !r.canView ? { canView: true } : {}) } : r));
  };
  return (
    <Page>
      <PageHeader title="Permisos por módulo" description="Define visibilidad y escritura por rol. ADMIN siempre conserva acceso.">
        <Button size="sm" onClick={() => guardar.mutate()} disabled={guardar.isPending || rows.length === 0}>{guardar.isPending ? 'Guardando…' : 'Guardar permisos'}</Button>
      </PageHeader>
      {mensaje ? <p role="status" className="mb-3 text-xs text-muted-foreground">{mensaje}</p> : null}
      <Card flush className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Rol</TableHead>{MODULES_PERMISOS.map(([code, name]) => <TableHead key={code}><span title={name}>{code}</span></TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {ROLES_PERMISOS.map((role) => (
              <TableRow key={role}>
                <TableCell className="text-xs font-medium">{role}</TableCell>
                {MODULES_PERMISOS.map(([code]) => {
                  const row = rows.find((r) => r.role === role && r.moduleCode === code);
                  return <TableCell key={code}><div className="space-y-1 text-[10px]"><label className="flex items-center gap-1"><input type="checkbox" aria-label={`${role} ${code} ver`} checked={row?.canView ?? false} disabled={role === 'ADMIN'} onChange={() => cambiar(role, code, 'canView')} />Ver</label><label className="flex items-center gap-1"><input type="checkbox" aria-label={`${role} ${code} escribir`} checked={row?.canWrite ?? false} disabled={role === 'ADMIN'} onChange={() => cambiar(role, code, 'canWrite')} />Editar</label></div></TableCell>;
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <p className="mt-3 text-[11px] text-muted-foreground">M1 Facturación · M2 Importaciones · M3 SIRE · M4 Contabilidad · M5 Resiliencia · M6 Inventario · M7 Ventas · M8 Compras · M9 Seguridad · M10 UX</p>
    </Page>
  );
}
