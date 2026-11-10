import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, CheckCircle2, FileText, Scale, TrendingUp, Wallet } from 'lucide-react';
import { Badge, Card, Page, PageHeader } from '@/components/ui';
import { accountingApi } from '../services/accountingApi';
import { PeriodInput } from '@/components/common/PeriodInput';

const periodoActual = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
};



const money = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AccountingDashboardPage() {
  const [period, setPeriod] = useState(periodoActual);
  const balance = useQuery({ queryKey: ['accounting-dashboard-balance', period], queryFn: () => accountingApi.getTrialBalance(period) });
  const entries = useQuery({ queryKey: ['accounting-dashboard-entries', period], queryFn: () => accountingApi.getEntries(period) });
  const accounts = useQuery({ queryKey: ['accounting-accounts'], queryFn: () => accountingApi.getAccounts() });
  const periods = useQuery({ queryKey: ['accounting-periods'], queryFn: () => accountingApi.getPeriods() });

  const cuadrado = Math.abs((balance.data?.totalDebit ?? 0) - (balance.data?.totalCredit ?? 0)) < 0.01;
  const periodoAbierto = periods.data?.find((p) => p.period === period)?.status === 'ABIERTO';
  const kpis = [
    { label: 'Asientos con movimiento', value: entries.data?.length ?? 0, icon: FileText },
    { label: 'Total debe', value: money(balance.data?.totalDebit ?? 0), icon: Wallet },
    { label: 'Total haber', value: money(balance.data?.totalCredit ?? 0), icon: TrendingUp },
    { label: 'Cuentas PCGE', value: accounts.data?.length ?? 0, icon: BookOpen },
  ];

  return (
    <Page>
      <PageHeader title="Resumen contable" description="Estado del período, partida doble y accesos a los reportes" />
      <div className="flex items-end gap-3 mb-4">
        <div className="space-y-1.5">
          <label htmlFor="dashboard-period" className="text-xs font-medium">Período</label>
          <PeriodInput id="dashboard-period" value={period} onChange={setPeriod} />
        </div>
        <Badge variant={periodoAbierto ? 'outline' : 'secondary'}>{periodoAbierto ? 'ABIERTO' : 'SIN ABRIR'}</Badge>
        <Badge variant={cuadrado ? 'outline' : 'destructive'}>
          {cuadrado ? <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> : <Scale className="h-3.5 w-3.5 mr-1" />}
          {cuadrado ? 'Cuadrado' : 'Descuadrado'}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-5">
        {kpis.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs">{label}</span>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold mt-2">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ['Libro Diario', '/accounting'],
          ['Libro Mayor', '/accounting/ledger'],
          ['Balance de Comprobación', '/accounting/trial-balance'],
          ['Estado de Resultados', '/accounting/income-statement'],
          ['Balance General', '/accounting/balance-sheet'],
          ['Períodos contables', '/accounting/periods'],
        ].map(([title, to]) => (
          <Link key={to} to={to} className="rounded-lg border bg-card p-4 hover:bg-muted/40 transition-colors">
            <p className="font-semibold text-sm">{title}</p>
            <p className="text-xs text-muted-foreground mt-1">Abrir reporte del período {period}</p>
          </Link>
        ))}
      </div>
    </Page>
  );
}
