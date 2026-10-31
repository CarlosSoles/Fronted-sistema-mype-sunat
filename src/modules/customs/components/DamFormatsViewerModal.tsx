import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import { FileText, DollarSign, Layers, ShieldCheck } from 'lucide-react';
import { type CustomsDeclarationRecord } from '../types';
import { DamFormatAView } from './DamFormatAView';

interface DamFormatsViewerModalProps {
  declaration: CustomsDeclarationRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DamFormatsViewerModal: React.FC<DamFormatsViewerModalProps> = ({
  declaration,
  isOpen,
  onClose,
}) => {
  const [activeFormat, setActiveFormat] = useState<'A' | 'B' | 'C'>('A');

  if (!declaration) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Visor Oficial de Formatos Aduaneros DAM / DUA
              </DialogTitle>
              <DialogDescription className="text-xs">
                Declaración Aduanera Oficial N° {declaration.dua_number || '118-2026-10-045892'} · Régimen 10
              </DialogDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              Canal: {declaration.channel || 'VERDE'}
            </Badge>
          </div>
        </DialogHeader>

        {/* Selector de Formatos Oficiales A / B / C */}
        <div className="flex border-b border-border gap-2 text-xs font-semibold">
          <Button
            size="sm"
            variant={activeFormat === 'A' ? 'default' : 'ghost'}
            onClick={() => setActiveFormat('A')}
            className="h-8 gap-1.5"
          >
            <Layers className="h-3.5 w-3.5" />
            Formato A (Series y Mercancías)
          </Button>
          <Button
            size="sm"
            variant={activeFormat === 'B' ? 'default' : 'ghost'}
            onClick={() => setActiveFormat('B')}
            className="h-8 gap-1.5"
          >
            <DollarSign className="h-3.5 w-3.5" />
            Formato B (Declaración del Valor OMC)
          </Button>
          <Button
            size="sm"
            variant={activeFormat === 'C' ? 'default' : 'ghost'}
            onClick={() => setActiveFormat('C')}
            className="h-8 gap-1.5"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Formato C (Liquidación de Tributos)
          </Button>
        </div>

        {/* Contenido Formato A */}
        {activeFormat === 'A' && <DamFormatAView declaration={declaration} />}

        {/* Contenido Formato B */}
        {activeFormat === 'B' && (
          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-muted/40 rounded-lg space-y-2">
              <h4 className="font-bold text-foreground">Condiciones de la Transacción (Acuerdo del Valor OMC):</h4>
              <ul className="space-y-1 text-muted-foreground text-[11px]">
                <li>✓ Casilla 7.1: ¿Existe vinculación comercial entre comprador y vendedor? <strong>NO</strong></li>
                <li>✓ Casilla 7.3: ¿Existen restricciones a la cesión o utilización de las mercancías? <strong>NO</strong></li>
                <li>✓ Casilla 7.8: ¿Existen cánones o derechos de licencia (regalías)? <strong>NO</strong></li>
                <li>✓ Método de Valoración: <strong>Primer Método - Valor de Transacción</strong></li>
              </ul>
            </div>

            <div className="p-3 border rounded-lg space-y-2">
              <h4 className="font-bold text-foreground">Adiciones y Ajustes al Valor FOB (Casilla 8):</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground block text-[10px]">FOB Total:</span>
                  <span className="font-mono font-bold">{formatCurrency(declaration.fob_total_usd || 50000, 'USD')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Flete Internacional:</span>
                  <span className="font-mono font-bold">{formatCurrency(declaration.freight_total_usd || 1200, 'USD')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Seguro (TPPS 0.75%):</span>
                  <span className="font-mono font-bold">{formatCurrency(declaration.insurance_total_usd || 375, 'USD')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Valor CIF Aduanas:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(declaration.cif_total_usd || 51575, 'USD')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contenido Formato C */}
        {activeFormat === 'C' && (
          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-muted/40 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-muted-foreground block text-[10px]">Tipo de Cambio Aduanero Oficial:</span>
                <span className="font-mono font-bold">S/ {declaration.exchange_rate || 3.82} por USD</span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block text-[10px]">Valor CIF Nacionalizado (PEN):</span>
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(declaration.cif_total_pen || 197016.5, 'PEN')}
                </span>
              </div>
            </div>

            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-muted font-semibold border-b">
                  <tr>
                    <th className="p-2">Concepto Tributario</th>
                    <th className="p-2">Tasa Legal</th>
                    <th className="p-2 text-right">Base Imponible</th>
                    <th className="p-2 text-right">Monto (PEN)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-2 font-medium">Ad-Valorem (Arancel)</td>
                    <td className="p-2 font-mono">0.0%</td>
                    <td className="p-2 text-right font-mono">{formatCurrency(declaration.cif_total_pen || 197016.5, 'PEN')}</td>
                    <td className="p-2 text-right font-mono font-bold">S/ 0.00</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">IGV Aduanero</td>
                    <td className="p-2 font-mono">16.0%</td>
                    <td className="p-2 text-right font-mono">{formatCurrency(declaration.cif_total_pen || 197016.5, 'PEN')}</td>
                    <td className="p-2 text-right font-mono font-bold">
                      {formatCurrency(declaration.total_igv_pen || 31522.64, 'PEN')}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">IPM (Promoción Municipal)</td>
                    <td className="p-2 font-mono">2.0%</td>
                    <td className="p-2 text-right font-mono">{formatCurrency(declaration.cif_total_pen || 197016.5, 'PEN')}</td>
                    <td className="p-2 text-right font-mono font-bold">
                      {formatCurrency(declaration.total_ipm_pen || 3940.33, 'PEN')}
                    </td>
                  </tr>
                  <tr className="bg-amber-500/5">
                    <td className="p-2 font-medium text-amber-700 dark:text-amber-300">Percepción del IGV (Cuota 0026)</td>
                    <td className="p-2 font-mono text-amber-700 dark:text-amber-300">3.5%</td>
                    <td className="p-2 text-right font-mono text-amber-700 dark:text-amber-300">S/ 232,479.47</td>
                    <td className="p-2 text-right font-mono font-bold text-amber-700 dark:text-amber-300">S/ 8,136.78</td>
                  </tr>
                  <tr className="bg-primary/5 font-bold">
                    <td colSpan={3} className="p-2 text-right text-foreground">TOTAL DEUDA TRIBUTARIA ADUANERA:</td>
                    <td className="p-2 text-right font-mono text-primary text-xs">
                      {formatCurrency(43599.75, 'PEN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-border">
          <Button size="sm" variant="outline" onClick={onClose} className="text-xs">
            Cerrar Visor
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
