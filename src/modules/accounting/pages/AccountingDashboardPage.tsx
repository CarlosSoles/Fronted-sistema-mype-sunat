import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileBarChart2,
  FileText,
  Landmark,
  Scale,
  ScrollText,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Badge, Page, PageHeader } from '@/components/ui';
import { PeriodInput } from '@/components/common/PeriodInput';
import { ReportLink, SectionTitle, Stat, Toolbar } from '../components/AccountingUI';
import { accountingApi } from '../services/accountingApi';

const periodoActual = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
};

const money = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const REPORTES = [
  { title: 'Libro Diario', to: '/accounting', icon: ClipboardList, description: 'Asientos del período y partida doble' },
  { title: 'Libro Mayor', to: '/accounting/ledger', icon: ScrollText, description: 'Movimientos y saldo por cuenta' },
  { title: 'Balance de Comprobación', to: '/accounting/trial-balance', icon: Scale, description: 'Saldos deudores y acreedores' },
  { title: 'Estado de Resultados', to: '/accounting/income-statement', icon: TrendingUp, description: 'Ingresos, costos y gastos del ejercicio' },
  { title: 'Balance General', to: '/accounting/balance-sheet', icon: Landmark, description: 'Activo, pasivo y patrimonio' },
  { title: 'Períodos contables', to: '/accounting/periods', icon: CalendarClock, description: 'Apertura, cierre y bloqueo' },
  { title: 'Auditoría contable', to: '/accounting/auditoria', icon: ShieldCheck, description: 'Reglas inválidas y asientos observados' },
  { title: 'Libros electrónicos', to: '/accounting/ple', icon: FileBarChart2, description: 'PLE 5.1, 14.1, 8.1 y 3.1' },
];

export default function AccountingDashboardPage() {
  const [period, setPeriod] = useState(periodoActual);
  const balance = useQuery({ queryKey: ['accounting-dashboard-balance', period], queryFn: () => accountingApi.getTrialBalance(period) });
  const entries = useQuery({ queryKey: ['accounting-dashboard-entries', period], queryFn: () => accountingApi.getEntries(period) });
  const accounts = useQuery({ queryKey: ['accounting-accounts'], queryFn: () => accountingApi.getAccounts() });
  const periods = useQuery({ queryKey: ['accounting-periods'], queryFn: () => accountingApi.getPeriods() });

  const debe = balance.data?.totalDebit ?? 0;
  const haber = balance.data?.totalCredit ?? 0;
  const diferencia = Math.abs(debe - haber);
  const cuadrado = diferencia < 0.01;
  const periodoAbierto = periods.data?.find((p) => p.period === period)?.status === 'ABIERTO';

  return (
    <Page>
      <PageHeader title="Resumen contable" description="Estado del período, partida doble y accesos a los reportes" />

      <Toolbar
        status={
          <>
            <Badge variant={periodoAbierto ? 'outline' : 'secondary'}>{periodoAbierto ? 'ABIERTO' : 'SIN ABRIR'}</Badge>
            <Badge variant={cuadrado ? 'outline' : 'destructive'} className={cuadrado ? 'border-emerald-600/30 text-emerald-600 dark:text-emerald-400' : undefined}>
              {cuadrado ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <Scale className="mr-1 h-3.5 w-3.5" />}
              {cuadrado ? 'Cuadrado' : `Descuadre ${money(diferencia)}`}
            </Badge>
          </>
        }
      >
        <div className="space-y-1.5">
          <label htmlFor="dashboard-period" className="text-xs font-medium text-muted-foreground">
            Período contable
          </label>
          <PeriodInput id="dashboard-period" value={period} onChange={setPeriod} />
        </div>
      </Toolbar>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Asientos con movimiento" value={entries.data?.length ?? 0} icon={FileText} hint="En el período seleccionado" />
        <Stat label="Total debe" value={money(debe)} icon={Wallet} hint="Suma de cargos" />
        <Stat label="Total haber" value={money(haber)} icon={TrendingUp} hint="Suma de abonos" />
        <Stat label="Cuentas PCGE" value={accounts.data?.length ?? 0} icon={BookOpen} hint="Catálogo activo" />
      </div>

      <div className="space-y-3">
        <SectionTitle title="Reportes del período" hint={`Datos de ${period}`} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {REPORTES.map((reporte) => (
            <ReportLink key={reporte.to} {...reporte} />
          ))}
        </div>
      </div>
    </Page>
  );
}
