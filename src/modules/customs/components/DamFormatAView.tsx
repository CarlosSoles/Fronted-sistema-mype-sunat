import React from 'react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import { type CustomsDeclarationRecord } from '../types';

interface DamFormatAViewProps {
  declaration: CustomsDeclarationRecord;
}

export const DamFormatAView: React.FC<DamFormatAViewProps> = ({ declaration }) => {
  const series = declaration.series || [
    {
      series_order: 1,
      product_code: 'LAP-GAMER-01',
      hs_code: '8471300000',
      commercial_description: 'Laptop Gamer Intel Core i7 16GB RAM 512GB SSD',
      destination_type: 'MERCADERIA',
      physical_quantity: 100,
      physical_unit: 'NIU',
      net_weight_kg: 250,
      gross_weight_kg: 280,
      fob_usd: 50000,
      ad_valorem_rate: 0,
    },
  ];

  return (
    <div className="space-y-3 py-2 text-xs">
      <div className="p-3 bg-muted/40 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <span className="text-muted-foreground block text-[10px]">Aduana:</span>
          <span className="font-semibold">118 - Marítima del Callao</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px]">Modalidad:</span>
          <span className="font-semibold">01 - Despacho Anticipado</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px]">Depósito Temporal:</span>
          <span className="font-semibold">DP World Callao [3045]</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px]">Manifiesto:</span>
          <span className="font-mono font-semibold">2026-118-00452</span>
        </div>
      </div>

      <h4 className="font-bold text-foreground uppercase tracking-wide text-[11px]">
        Series Arancelarias Declaradas ({series.length})
      </h4>

      <div className="border rounded-md overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-muted text-[11px] font-semibold border-b">
            <tr>
              <th className="p-2">Serie</th>
              <th className="p-2">Subpartida (SPN)</th>
              <th className="p-2">Descripción Comercial</th>
              <th className="p-2 text-right">Cant.</th>
              <th className="p-2 text-right">P. Neto (kg)</th>
              <th className="p-2 text-right">P. Bruto (kg)</th>
              <th className="p-2 text-right">FOB (USD)</th>
              <th className="p-2">Destino</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-[11px]">
            {series.map((s, idx) => (
              <tr key={idx} className="hover:bg-muted/30">
                <td className="p-2 font-mono font-bold">N° {s.series_order || idx + 1}</td>
                <td className="p-2 font-mono text-primary font-semibold">{s.hs_code}</td>
                <td className="p-2 max-w-[200px] truncate">{s.commercial_description}</td>
                <td className="p-2 text-right font-mono">{s.physical_quantity} {s.physical_unit || 'NIU'}</td>
                <td className="p-2 text-right font-mono">{s.net_weight_kg}</td>
                <td className="p-2 text-right font-mono">{s.gross_weight_kg}</td>
                <td className="p-2 text-right font-mono font-bold">{formatCurrency(s.fob_usd, 'USD')}</td>
                <td className="p-2">
                  <Badge variant={s.destination_type === 'ACTIVO_FIJO' ? 'secondary' : 'default'} className="text-[9px] py-0">
                    {s.destination_type || 'MERCADERIA'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

