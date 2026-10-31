import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { pleEvaluationSchema, type PleEvaluationFormData } from '../validators/pleExportSchema';
import { inventoryApi } from '../services/inventoryApi';
import { type InventoryBookObligation } from '../types/inventory.types';
import { PleExportModal } from '../components/PleExportModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookOpen, Download, Scale, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export default function ElectronicBooksPage() {
  const currentYear = new Date().getFullYear();
  const [obligation, setObligation] = useState<InventoryBookObligation | null>({
    companyId: 'company-demo',
    fiscalYear: currentYear,
    annualRevenueUit: 1800,
    taxRegime: 'MYPE_TRIBUTARIO',
    ple12_1Status: 'EXCEPTUADO',
    ple13_1Status: 'OBLIGATORIO',
    legalBasisNotes:
      'Art. 35 inciso b) del Reglamento de la LIR: Ingresos brutos anuales mayores a 1,500 UIT obligan a llevar Contabilidad de Costos y Registro de Inventario Permanente Valorizado (PLE 13.1). Exceptuado de unidades físicas (PLE 12.1).',
  });
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
  } = useForm<PleEvaluationFormData>({
    resolver: zodResolver(pleEvaluationSchema),
    defaultValues: {
      fiscal_year: currentYear,
      annual_revenue_uit: 1800,
      tax_regime: 'MYPE_TRIBUTARIO',
    },
  });

  const loadExistingDecision = async (year: number) => {
    try {
      const data = await inventoryApi.getObligationByYear(year);
      if (data) {
        setObligation(data);
        setValue('annual_revenue_uit', data.annualRevenueUit);
        setValue('tax_regime', data.taxRegime);
      }
    } catch (err) {
      console.error('Error cargando obligatoriedad:', err);
    }
  };

  useEffect(() => {
    loadExistingDecision(currentYear);
  }, [currentYear]);

  const onEvaluate = async (data: PleEvaluationFormData) => {
    setIsEvaluating(true);
    try {
      const result = await inventoryApi.evaluateObligation(data);
      setObligation(result);
    } catch (err) {
      console.error('Error evaluando obligatoriedad:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    if (status === 'OBLIGATORIO') {
      return (
        <Badge className="bg-red-500/10 text-red-600 border-red-500/30 gap-1">
          <AlertTriangle className="h-3.5 w-3.5" />
          OBLIGATORIO
        </Badge>
      );
    }
    if (status === 'EXCEPTUADO') {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          EXCEPTUADO
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        VOLUNTARIO
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            Registros Electrónicos PLE 12.1 y 13.1
          </h1>
          <p className="text-sm text-muted-foreground">
            Evaluación jurídica según el Art. 35 del Reglamento de la LIR y exportador de archivos TXT.
          </p>
        </div>

        <Button onClick={() => setIsExportModalOpen(true)} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Libro PLE
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Asistente de Evaluación Legal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Asistente de Obligatoriedad (Art. 35 LIR)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onEvaluate)} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-muted-foreground uppercase">Ejercicio Fiscal</label>
                <Input
                  type="number"
                  {...register('fiscal_year', { valueAsNumber: true })}
                  className="mt-1 font-semibold text-sm"
                />
              </div>

              <div>
                <label className="font-semibold text-muted-foreground uppercase">
                  Ingresos Brutos Anuales (en UIT) *
                </label>
                <Input
                  type="number"
                  step="any"
                  {...register('annual_revenue_uit', { valueAsNumber: true })}
                  className="mt-1 font-semibold text-sm"
                  placeholder="ej: 1800"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  1 UIT 2026 = S/ 5,350. Tramo &gt; 1,500 UIT obliga a llevar inventario valorizado (13.1).
                </p>
              </div>

              <div>
                <label className="font-semibold text-muted-foreground uppercase">Régimen Tributario *</label>
                <select
                  {...register('tax_regime')}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm mt-1"
                >
                  <option value="MYPE_TRIBUTARIO">Régimen MYPE Tributario (RMT)</option>
                  <option value="GENERAL">Régimen General (RG)</option>
                  <option value="RER">Régimen Especial de Renta (RER)</option>
                </select>
              </div>

              <Button type="submit" disabled={isEvaluating} className="w-full gap-2 mt-2">
                {isEvaluating && <Loader2 className="h-4 w-4 animate-spin" />}
                Diagnosticar Obligatoriedad Jurídica
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Dictamen Legal de Libros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Diagnóstico Tributario Oficial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {obligation ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/40">
                    <div>
                      <p className="font-semibold text-sm">PLE 12.1 - Unidades Físicas</p>
                      <p className="text-xs text-muted-foreground">Registro de Unidades Físicas (20 campos)</p>
                    </div>
                    {getStatusBadge(obligation.ple12_1Status)}
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/40">
                    <div>
                      <p className="font-semibold text-sm">PLE 13.1 - Permanente Valorizado</p>
                      <p className="text-xs text-muted-foreground">Kardex Perpetuo al Costo Promedio (27 campos)</p>
                    </div>
                    {getStatusBadge(obligation.ple13_1Status)}
                  </div>
                </div>

                <Alert className="text-xs">
                  <Scale className="h-4 w-4" />
                  <AlertDescription>
                    <span className="font-semibold">Fundamento Legal:</span> {obligation.legalBasisNotes}
                  </AlertDescription>
                </Alert>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-xs">
                Ingrese los ingresos anuales en UIT para evaluar la exigibilidad de los libros PLE.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PleExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
    </div>
  );
}
