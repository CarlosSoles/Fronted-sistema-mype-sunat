import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sliders, Scale } from 'lucide-react';

interface ProrationSimulatorProps {
  totalExpensePen: number;
  totalWeightKg?: number;
  totalFobUsd?: number;
}

export const ProrationSimulator: React.FC<ProrationSimulatorProps> = ({
  totalExpensePen,
  totalWeightKg = 280,
  totalFobUsd = 50000,
}) => {
  const factorByWeight = totalWeightKg > 0 ? totalExpensePen / totalWeightKg : 0;
  const factorByFob = totalFobUsd > 0 ? totalExpensePen / totalFobUsd : 0;

  return (
    <Card className="border-border/60 shadow-xs bg-card">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" />
            Simulador de Prorrateos Bivariados (NIC 2 — Párrafo 11)
          </span>
          <Badge variant="outline" className="text-[10px] gap-1 font-mono">
            <Scale className="h-3 w-3" />
            Cuadre al Céntimo
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border border-border/40 bg-muted/20 space-y-1">
            <p className="font-bold text-foreground">Factor por Peso Bruto (Fletes/Estiba)</p>
            <p className="text-[11px] text-muted-foreground">
              Total gastos netos: S/ {Number(totalExpensePen ?? 0).toFixed(2)} ÷ {totalWeightKg} kg
            </p>
            <p className="text-sm font-mono font-bold text-primary pt-1">
              F_peso = S/ {Number(factorByWeight ?? 0).toFixed(4)} / kg
            </p>
          </div>

          <div className="p-3 rounded-lg border border-border/40 bg-muted/20 space-y-1">
            <p className="font-bold text-foreground">Factor por Valor FOB (Agencia/Seguro)</p>
            <p className="text-[11px] text-muted-foreground">
              Total gastos netos: S/ {Number(totalExpensePen ?? 0).toFixed(2)} ÷ ${Number(totalFobUsd ?? 0).toLocaleString()}
            </p>
            <p className="text-sm font-mono font-bold text-primary pt-1">
              F_fob = S/ {Number(factorByFob ?? 0).toFixed(6)} / USD
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
