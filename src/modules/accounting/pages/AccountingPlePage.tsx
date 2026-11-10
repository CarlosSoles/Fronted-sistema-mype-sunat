import { PeriodInput } from '@/components/common/PeriodInput';
import { useState } from 'react';
import { Button, Card, Page, PageHeader } from '@/components/ui';
import { Download, FileCheck2, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/axios';

export default function AccountingPlePage() {
  const { activeCompany, user } = useAuthStore();
  const companyId = activeCompany?.tenantId ?? user?.companyId ?? '';
  const companyRuc = activeCompany?.ruc ?? user?.companyRuc ?? '';
  const [isDownloadingDiario, setIsDownloadingDiario] = useState(false);
  const [isDownloadingMayor, setIsDownloadingMayor] = useState(false);
  const [isDownloadingBalances, setIsDownloadingBalances] = useState(false);
  const [isDownloadingVentas, setIsDownloadingVentas] = useState(false);
  const [isDownloadingCompras, setIsDownloadingCompras] = useState(false);
  const [period, setPeriod] = useState(() => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  });
  const [error, setError] = useState<string | null>(null);

  // Función unificada para consultar al Backend y descargar la trama real
  const handleExportPle = async (bookCode: '050100' | '060100' | '030100') => {
    const setLoader = bookCode === '050100' ? setIsDownloadingDiario : bookCode === '060100' ? setIsDownloadingMayor : setIsDownloadingBalances;
    setLoader(true);
    setError(null);

    try {
      const response = await apiClient.post('/accounting/ple/export', {
        companyId,
        companyRuc,
        year: Number(period.slice(0, 4)),
        month: Number(period.slice(5, 7)),
        bookCode,
      });

      const { fileName, content } = response.data;
      if (!fileName || !content) {
        throw new Error('El backend no devolvió una trama PLE válida');
      }
      downloadTxtFile(fileName, content);
    } catch (error) {
      console.error('Error al exportar trama PLE:', error);
      setError('No se pudo generar el PLE del período seleccionado.');
    } finally {
      setLoader(false);
    }
  };

  const handleExportTaxPle = async (bookCode: '140100' | '080100') => {
    const setLoader = bookCode === '140100' ? setIsDownloadingVentas : setIsDownloadingCompras;
    setLoader(true);
    setError(null);
    try {
      const response = await apiClient.post('/accounting/ple/tax-export', {
        companyRuc, year: Number(period.slice(0, 4)), month: Number(period.slice(5, 7)), bookCode,
      });
      const { fileName, content } = response.data;
      if (!fileName || !content) throw new Error('Sin trama');
      downloadTxtFile(fileName, content);
    } catch {
      setError('No se pudo generar el registro tributario del período.');
    } finally {
      setLoader(false);
    }
  };

  const downloadTxtFile = (fileName: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Page>
      <PageHeader
        title="Libros Electrónicos (PLE / SIRE)"
        description="Generación de estructuras y tramas oficiales PLE 5.1 / SIRE para presentación tributaria ante SUNAT"
      />
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label
              className="text-xs font-medium text-foreground"
              htmlFor="periodo-ple"
            >
              Período a exportar
            </label>
            <PeriodInput id="periodo-contable" value={period} onChange={setPeriod} className="w-44" />
          </div>
          <p className="text-xs text-muted-foreground pb-2">
            La trama se genera con los asientos del período seleccionado.
          </p>
        </div>
      </Card>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Libro Diario 5.1 */}
        <Card className="p-5 space-y-3 border">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-base">Libro Diario 5.1 (PLE)</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Estructura de asientos contables del periodo fiscal activo en formato texto plano `.txt`.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => handleExportPle('050100')}
            disabled={isDownloadingDiario}
          >
            {isDownloadingDiario ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isDownloadingDiario ? 'Generando Trama...' : 'Descargar Libro Diario 5.1'}
          </Button>
        </Card>

        {/* Libro Mayor 6.1 */}
        <Card className="p-5 space-y-3 border">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-base">Libro Mayor 6.1 (PLE)</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Centralización de saldos acumulados por código de cuenta contable del mes.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => handleExportPle('060100')}
            disabled={isDownloadingMayor}
          >
            {isDownloadingMayor ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isDownloadingMayor ? 'Generando Trama...' : 'Descargar Libro Mayor 6.1'}
          </Button>
        </Card>
        {/* Libro de Inventarios y Balances 3.1 */}
        <Card className="p-5 space-y-3 border">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-base">Inventarios y Balances 3.1 (PLE)</h3>
          </div>
          <p className="text-xs text-muted-foreground">Saldos por cuenta contable del período, agregados desde el Libro Diario.</p>
          <Button variant="outline" size="sm" className="w-full" onClick={() => handleExportPle('030100')} disabled={isDownloadingBalances}>
            {isDownloadingBalances ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {isDownloadingBalances ? 'Generando Trama...' : 'Descargar Inventarios y Balances 3.1'}
          </Button>
        </Card>

        {/* Registro de Ventas 14.1 */}
        <Card className="p-5 space-y-3 border">
          <h3 className="font-semibold text-base">Registro de Ventas 14.1 (PLE)</h3>
          <p className="text-xs text-muted-foreground">Facturas, boletas y notas del período con base, IGV y total.</p>
          <Button variant="outline" size="sm" className="w-full" onClick={() => handleExportTaxPle('140100')} disabled={isDownloadingVentas}>
            {isDownloadingVentas ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {isDownloadingVentas ? 'Generando Trama...' : 'Descargar Ventas 14.1'}
          </Button>
        </Card>

        {/* Registro de Compras 8.1 */}
        <Card className="p-5 space-y-3 border">
          <h3 className="font-semibold text-base">Registro de Compras 8.1 (PLE)</h3>
          <p className="text-xs text-muted-foreground">Compras nacionales del período con base, IGV y total.</p>
          <Button variant="outline" size="sm" className="w-full" onClick={() => handleExportTaxPle('080100')} disabled={isDownloadingCompras}>
            {isDownloadingCompras ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {isDownloadingCompras ? 'Generando Trama...' : 'Descargar Compras 8.1'}
          </Button>
        </Card>

      </div>
    </Page>
  );
}