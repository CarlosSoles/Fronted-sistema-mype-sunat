import React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { type LandedCostSheetRecord } from '../types';

interface LandedCostComparisonTableProps {
  sheet?: LandedCostSheetRecord | null;
  onApplyKardex: () => Promise<unknown>;
  isApplying: boolean;
}

export const LandedCostComparisonTable: React.FC<LandedCostComparisonTableProps> = ({
  sheet,
  onApplyKardex,
  isApplying,
}) => {
  const breakdown = sheet?.series_breakdown ?? [
    {
      series_id: 's1',
      series_order: 1,
      product_code: 'LAP-GAMER-01',
      commercial_description: '100 Laptops Gamer de Juan (Shenzhen)',
      physical_quantity: 100,
      cif_pen: 203892.5,
      ad_valorem_pen: 0.0,
      allocated_local_expenses_pen: 4000.0,
      total_landed_cost_pen: 207892.5,
      final_landed_cost_unit_pen: 2078.925,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold text-foreground">
            Desglose Analítico de Adquisición Final (Landed Cost NIC 2)
          </h4>
          <p className="text-[11px] text-muted-foreground">
            Excluye 100% créditos fiscales de IGV (S/ 720.00 local + S/ 36,700.65 aduanero).
          </p>
        </div>
        <Button
          size="sm"
          className="h-7 text-xs gap-1.5 font-bold"
          onClick={onApplyKardex}
          disabled={isApplying}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {isApplying ? 'Asentando en Kardex...' : 'Aprobar y Asentar en Kardex'}
        </Button>
      </div>

      <div className="rounded-lg border border-border/60 overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[80px] text-xs font-semibold">Serie</TableHead>
              <TableHead className="text-xs font-semibold">Producto Declarado</TableHead>
              <TableHead className="w-[80px] text-right text-xs font-semibold">Cant.</TableHead>
              <TableHead className="w-[120px] text-right text-xs font-semibold">CIF (PEN)</TableHead>
              <TableHead className="w-[110px] text-right text-xs font-semibold">Ad-Valorem</TableHead>
              <TableHead className="w-[120px] text-right text-xs font-semibold">Gastos Locales</TableHead>
              <TableHead className="w-[130px] text-right text-xs font-semibold text-primary">
                Costo Unit. Real
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {breakdown.map((row) => (
              <TableRow key={row.series_id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-xs font-semibold">N° {row.series_order}</TableCell>
                <TableCell className="text-xs text-foreground">
                  <span className="font-semibold block">{row.commercial_description}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{row.product_code}</span>
                </TableCell>
                <TableCell className="font-mono text-xs text-right font-medium">
                  {row.physical_quantity}
                </TableCell>
                <TableCell className="font-mono text-xs text-right text-muted-foreground">
                  S/ {Number(row.cif_pen ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="font-mono text-xs text-right text-muted-foreground">
                  S/ {Number(row.ad_valorem_pen ?? 0).toFixed(2)}
                </TableCell>
                <TableCell className="font-mono text-xs text-right text-muted-foreground">
                  S/ {Number(row.allocated_local_expenses_pen ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="font-mono text-xs text-right font-bold text-primary">
                  <div className="flex items-center justify-end gap-1">
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span>S/ {Number(row.final_landed_cost_unit_pen ?? 0).toFixed(3)}</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
