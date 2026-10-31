import { useState } from 'react';
import { Button, Card, Page, PageHeader } from '@/components/ui';
import { Download, FileCheck2, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function AccountingPlePage() {
  const [isDownloadingDiario, setIsDownloadingDiario] = useState(false);
  const [isDownloadingMayor, setIsDownloadingMayor] = useState(false);

  // Función unificada para consultar al Backend y descargar la trama real
  const handleExportPle = async (bookCode: '5.1' | '6.1') => {
    const setLoader = bookCode === '5.1' ? setIsDownloadingDiario : setIsDownloadingMayor;
    setLoader(true);

    try {
      // Petición al endpoint real de NestJS
      const response = await axios.post('http://localhost:3000/api/v1/accounting/ple/export', {
        companyId: '5eaccb4e-a6ec-4f23-9909-85fe7fc9e879',
        companyRuc: '20601012341',
        year: 2026,
        month: 10,
        bookCode: bookCode, // Pasa '5.1' o '6.1' dinámicamente
      });

      const { fileName, content } = response.data;
      downloadTxtFile(fileName, content);
    } catch (error) {
      console.error('Error al exportar trama PLE:', error);
      alert('Error al conectar con el servidor para exportar la trama.');
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
            onClick={() => handleExportPle('5.1')}
            disabled={isDownloadingDiario}
          >
            {isDownloadingDiario ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isDownloadingDiario ? 'Generando Trama...' : 'Descargar LE2060101234120261000050100.txt'}
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
            onClick={() => handleExportPle('6.1')}
            disabled={isDownloadingMayor}
          >
            {isDownloadingMayor ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isDownloadingMayor ? 'Generando Trama...' : 'Descargar LE2060101234120261000060100.txt'}
          </Button>
        </Card>
      </div>
    </Page>
  );
}