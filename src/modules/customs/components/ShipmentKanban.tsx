import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type CustomsShipmentSummary, type ShipmentStatus } from '../types';

interface ShipmentKanbanProps {
  shipments: CustomsShipmentSummary[];
  onSelectShipment: (id: string) => void;
}

const COLUMNS: { id: ShipmentStatus; label: string; badgeVariant: 'default' | 'secondary' | 'outline' }[] = [
  { id: 'BORRADOR', label: 'Borrador', badgeVariant: 'secondary' },
  { id: 'EN_TRANSITO', label: 'En Tránsito', badgeVariant: 'outline' },
  { id: 'ARRIBADO', label: 'Arribado', badgeVariant: 'outline' },
  { id: 'EN_DESPACHO', label: 'En Despacho', badgeVariant: 'default' },
  { id: 'CON_LEVANTE', label: 'Con Levante', badgeVariant: 'secondary' },
  { id: 'COSTEADO', label: 'Costeado (NIC 2)', badgeVariant: 'outline' },
  { id: 'CERRADO', label: 'Cerrado (Kardex)', badgeVariant: 'default' },
];

export const ShipmentKanban: React.FC<ShipmentKanbanProps> = ({
  shipments,
  onSelectShipment,
}) => {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-w-full">
      {COLUMNS.map((col) => {
        const items = shipments.filter((s) => s.status === col.id);
        return (
          <div
            key={col.id}
            className="flex-1 min-w-[170px] max-w-[240px] flex flex-col bg-muted/30 rounded-lg p-2.5 border border-border/50 min-h-[380px]"
          >
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-border/40">
              <span className="text-xs font-semibold text-foreground truncate">{col.label}</span>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                {items.length}
              </span>
            </div>

            <div className="space-y-2 flex-1">
              {items.map((shipment) => (
                <Card
                  key={shipment.id}
                  onClick={() => onSelectShipment(shipment.id)}
                  className="cursor-pointer hover:border-primary/60 transition-all border-border/60 shadow-2xs hover:shadow-xs p-2.5 bg-card"
                >
                  <CardContent className="p-0 space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-bold font-mono text-foreground truncate">
                        {shipment.shipment_number}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono shrink-0">
                        {shipment.incoterm}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground truncate" title={shipment.supplier_name}>
                      {shipment.supplier_name || 'Proveedor del exterior'}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-border/40">
                      <span className="truncate">Aduana {shipment.destination_customs.split(' ')[0]}</span>
                      <span className="font-semibold text-primary shrink-0 uppercase text-[9px]">
                        {shipment.transport_mode}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {items.length === 0 && (
                <div className="h-24 flex items-center justify-center border border-dashed border-border/40 rounded-md">
                  <span className="text-[11px] text-muted-foreground/60 italic">Sin expedientes</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
