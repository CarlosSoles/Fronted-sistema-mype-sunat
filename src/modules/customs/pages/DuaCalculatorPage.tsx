import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DuaSummaryCard } from '../components/DuaSummaryCard';
import { useDuaCalculator } from '../hooks/useDuaCalculator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ship, Calculator } from 'lucide-react';
import { type DuaInput } from '../types/customs.types';

export default function DuaCalculatorPage() {
  const { mutate: calculateDua, data: result, isPending } = useDuaCalculator();

  const [formData, setFormData] = useState<DuaInput>({
    numeroDua: '118-2026-10-001234',
    regimenAduanero: 'IMPORTACION_CONSUMO',
    valorFob: 10000,
    flete: 1200,
    seguro: 300,
    tasaAdValorem: 6,
    aplicaPercepcion: true,
    tasaPercepcion: 3.5,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    calculateDua(formData);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Liquidación DUA / DAM & Kardex"
        description="Cálculo normativo de tributos aduaneros, Casilla 4 y costeo de importación MYPE"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario de Entrada DUA */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Ship className="h-4 w-4 text-primary" />
              Datos de Declaración de Importación (DAM)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-foreground block mb-1">N° Declaración DUA/DAM</label>
                <Input
                  value={formData.numeroDua}
                  onChange={(e) => setFormData({ ...formData, numeroDua: e.target.value })}
                  placeholder="118-2026-10-xxxxxx"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-medium block mb-1">Valor FOB ($)</label>
                  <Input
                    type="number"
                    value={formData.valorFob}
                    onChange={(e) => setFormData({ ...formData, valorFob: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label className="font-medium block mb-1">Flete ($)</label>
                  <Input
                    type="number"
                    value={formData.flete}
                    onChange={(e) => setFormData({ ...formData, flete: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label className="font-medium block mb-1">Seguro ($)</label>
                  <Input
                    type="number"
                    value={formData.seguro}
                    onChange={(e) => setFormData({ ...formData, seguro: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium block mb-1">Tasa Ad-Valorem (%)</label>
                  <Input
                    type="number"
                    value={formData.tasaAdValorem}
                    onChange={(e) => setFormData({ ...formData, tasaAdValorem: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label className="font-medium block mb-1">Tasa Percepción (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.tasaPercepcion}
                    onChange={(e) => setFormData({ ...formData, tasaPercepcion: Number(e.target.value) })}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full gap-2" disabled={isPending}>
                <Calculator className="h-4 w-4" />
                {isPending ? 'Calculando Casilla 4...' : 'Calcular Tributos SUNAT'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Tarjeta de Liquidación de Tributos */}
        <div>
          <DuaSummaryCard result={result} />
        </div>
      </div>
    </div>
  );
}
