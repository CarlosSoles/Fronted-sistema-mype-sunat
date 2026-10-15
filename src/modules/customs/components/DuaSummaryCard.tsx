import { type DuaCalculationResult } from '../types/customs.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import { Calculator } from 'lucide-react';

interface Props {
  result?: DuaCalculationResult | null;
}

export const DuaSummaryCard = ({ result }: Props) => {
  if (!result) return null;

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          Liquidación de Tributos Aduaneros (Casilla 4 DAM)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-2.5 text-xs">
        <div className="flex justify-between py-1 border-b border-muted">
          <span className="text-muted-foreground">Valor CIF Aduanero (FOB + Flete + Seguro)</span>
          <span className="font-semibold">{formatCurrency(result.valorCif, 'USD')}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-muted">
          <span className="text-muted-foreground">Derechos Arancelarios (Ad-Valorem)</span>
          <span className="font-semibold">{formatCurrency(result.adValorem, 'USD')}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-muted">
          <span className="text-muted-foreground">Impuesto General a las Ventas (IGV 16%)</span>
          <span className="font-semibold">{formatCurrency(result.igvAduanero, 'USD')}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-muted">
          <span className="text-muted-foreground">Impuesto de Promoción Municipal (IPM 2%)</span>
          <span className="font-semibold">{formatCurrency(result.ipmAduanero, 'USD')}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-muted text-amber-600 dark:text-amber-400">
          <span>Percepción del IGV Aduanero (3.5%)</span>
          <span className="font-semibold">{formatCurrency(result.percepcionMonto, 'USD')}</span>
        </div>
        <div className="flex justify-between py-2 text-sm font-bold text-primary pt-2">
          <span>Total Tributos a Pagar SUNAT</span>
          <span>{formatCurrency(result.totalTributosAduaneros, 'USD')}</span>
        </div>
      </CardContent>
    </Card>
  );
};
