import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/formatters';
import {
  FileText,
  DollarSign,
  Layers,
  ShieldCheck,
  Upload,
  Download,
  FileCheck2,
  Paperclip,
} from 'lucide-react';
import { type CustomsDeclarationRecord } from '../types';
import { DamFormatAView } from './DamFormatAView';
import { customsDeclarationsApi } from '../services/customsDeclarationsApi';

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
  const queryClient = useQueryClient();
  const [activeFormat, setActiveFormat] = useState<'A' | 'B' | 'C' | 'DOCS'>('A');

  // Formulario de subida de documentos
  const [docFormatType, setDocFormatType] = useState('FORMATO_A');
  const [docNumber, setDocNumber] = useState('');
  const [docFileName, setDocFileName] = useState('');
  const [docFileUrl, setDocFileUrl] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const declarationId = declaration?.id || '';

  const docsQuery = useQuery({
    queryKey: ['customs', 'declaration-documents', declarationId],
    queryFn: () => customsDeclarationsApi.getDocuments(declarationId),
    enabled: isOpen && Boolean(declarationId),
  });

  const uploadMutation = useMutation({
    mutationFn: () =>
      customsDeclarationsApi.uploadDocument(declarationId, {
        format_type: docFormatType,
        document_number: docNumber.trim() || undefined,
        file_name: docFileName.trim() || `${docFormatType}_DAM_${declaration?.dua_number || 'DOC'}.pdf`,
        storage_url: docFileUrl.trim() || `/documents/dam/${declarationId}/${docFormatType.toLowerCase()}.pdf`,
        mime_type: 'application/pdf',
        file_size_bytes: 245000,
        uploaded_by: 'Operador Aduanas',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['customs', 'declaration-documents', declarationId],
      });
      setUploadSuccess('Documento subido y vinculado exitosamente a la DAM.');
      setDocNumber('');
      setDocFileName('');
      setDocFileUrl('');
      setTimeout(() => setUploadSuccess(null), 4000);
    },
  });

  if (!declaration) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-[96vw] max-h-[92vh] overflow-y-auto overflow-x-hidden">
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
          <Button
            size="sm"
            variant={activeFormat === 'DOCS' ? 'default' : 'ghost'}
            onClick={() => setActiveFormat('DOCS')}
            className="h-8 gap-1.5 text-primary"
          >
            <Paperclip className="h-3.5 w-3.5" />
            Subir / Ver Documentos (Formatos A, B, C y Sustento)
            {docsQuery.data && docsQuery.data.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {docsQuery.data.length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Contenido Formato A */}
        {activeFormat === 'A' && <DamFormatAView declaration={declaration} />}

        {/* Contenido Formato B */}
        {activeFormat === 'B' && (
          <div className="space-y-4 py-2 text-xs">
            {/* Casilla 5: Proveedor Extranjero */}
            <div className="p-4 border rounded-xl bg-card/60 space-y-2.5 shadow-sm">
              <h4 className="font-bold text-foreground text-xs flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                1. Datos del Proveedor Extranjero (Casilla 5 DAV)
              </h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 text-[11px] text-muted-foreground">
                <div className="p-2 bg-muted/20 rounded-md">
                  <span className="block text-[10px] uppercase font-semibold text-muted-foreground">Razón Social / Exportador:</span>
                  <span className="font-semibold text-foreground text-xs">{declaration.supplier_name || 'Shenzhen Tech Ltd.'}</span>
                </div>
                <div className="p-2 bg-muted/20 rounded-md">
                  <span className="block text-[10px] uppercase font-semibold text-muted-foreground">Tax ID / RUC País:</span>
                  <span className="font-mono font-medium text-foreground text-xs">{declaration.supplier_tax_id || '91440300MA5'}</span>
                </div>
                <div className="p-2 bg-muted/20 rounded-md">
                  <span className="block text-[10px] uppercase font-semibold text-muted-foreground">País de Residencia:</span>
                  <span className="font-medium text-foreground">{declaration.supplier_country ? `${declaration.supplier_country} — Exterior` : 'CN — China'}</span>
                </div>
                <div className="p-2 bg-muted/20 rounded-md flex flex-col justify-center">
                  <span className="block text-[10px] uppercase font-semibold text-muted-foreground mb-1">Condición del Proveedor:</span>
                  <Badge variant="outline" className="text-[10px] py-0.5 w-fit">FABRICANTE DIRECTO</Badge>
                </div>
              </div>
            </div>

            {/* Casilla 6: Transacción Comercial y Factura */}
            <div className="p-4 border rounded-xl bg-card/60 space-y-2.5 shadow-sm">
              <h4 className="font-bold text-foreground text-xs flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                2. Factura Comercial e Incoterm Pactado (Casilla 6 DAV)
              </h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 text-[11px]">
                <div className="p-2 bg-muted/20 rounded-md">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">N° Factura Comercial:</span>
                  <span className="font-mono font-bold text-primary text-xs">{declaration.commercial_invoice_number || 'INV-2026-SZ892'}</span>
                </div>
                <div className="p-2 bg-muted/20 rounded-md">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Fecha de Emisión:</span>
                  <span className="font-medium text-foreground">{String(declaration.numeration_date).slice(0, 10)}</span>
                </div>
                <div className="p-2 bg-muted/20 rounded-md">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Término de Entrega:</span>
                  <span className="font-bold text-foreground">{declaration.incoterm || 'FOB'} — Free On Board (ICC 2020)</span>
                </div>
                <div className="p-2 bg-muted/20 rounded-md">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Forma de Pago Convenida:</span>
                  <span className="font-medium text-foreground">Transferencia SWIFT / T/T</span>
                </div>
              </div>
            </div>

            {/* Casilla 7: Cuestionario OMC */}
            <div className="p-4 bg-muted/30 rounded-xl space-y-2.5 border border-border/60">
              <h4 className="font-bold text-foreground text-xs">
                3. Condiciones de la Transacción (Decisión 571 CAN / Acuerdo del Valor OMC):
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-muted-foreground text-[11px]">
                <div className="p-2 bg-background/50 rounded border">✓ Casilla 7.1: ¿Existe vinculación comercial entre comprador y vendedor? <strong>NO</strong></div>
                <div className="p-2 bg-background/50 rounded border">✓ Casilla 7.3: ¿Existen restricciones a la cesión o utilización? <strong>NO</strong></div>
                <div className="p-2 bg-background/50 rounded border">✓ Casilla 7.8: ¿Existen cánones o derechos de licencia (regalías)? <strong>NO</strong></div>
                <div className="p-2 bg-background/50 rounded border text-primary">
                  ✓ Método de Valoración: <strong>Primer Método — Valor de Transacción (Art. 1 OMC)</strong>
                </div>
              </div>
            </div>

            {/* Casilla 8: Determinación del Valor en Aduana */}
            <div className="p-4 border rounded-xl space-y-2.5 bg-card/60 shadow-sm">
              <h4 className="font-bold text-foreground text-xs">
                4. Determinación del Valor en Aduana — Ajustes Art. 8 Acuerdo OMC (Casilla 8):
              </h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 text-[11px]">
                <div className="p-3 bg-muted/30 rounded-lg border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Precio Facturado (FOB Total):</span>
                  <span className="font-mono font-bold text-foreground text-sm">
                    {formatCurrency(declaration.fob_total_usd || 50000, 'USD')}
                  </span>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">(+) Flete Marítimo Internacional:</span>
                  <span className="font-mono font-bold text-foreground text-sm">
                    {formatCurrency(declaration.freight_total_usd || 1200, 'USD')}
                  </span>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">(+) Seguro (TPPS SUNAT 0.75%):</span>
                  <span className="font-mono font-bold text-foreground text-sm">
                    {formatCurrency(declaration.insurance_total_usd || 375, 'USD')}
                  </span>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <span className="text-emerald-700 dark:text-emerald-300 block text-[10px] font-semibold uppercase">(=) Total Valor CIF Aduanas:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatCurrency(declaration.cif_total_usd || 51575, 'USD')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contenido Formato C */}
        {activeFormat === 'C' && (
          <div className="space-y-4 py-2 text-xs">
            <div className="p-4 bg-muted/40 rounded-xl flex items-center justify-between border border-border/60 shadow-sm">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Tipo de Cambio Aduanero Oficial:</span>
                <span className="font-mono font-bold text-foreground text-sm">S/ {declaration.exchange_rate || 3.82} por USD</span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Base Imponible CIF en Moneda Nacional:</span>
                <span className="font-mono font-bold text-foreground text-base">
                  {formatCurrency(declaration.cif_total_pen || 197016.5, 'PEN')}
                </span>
              </div>
            </div>

            <div className="border rounded-xl overflow-hidden shadow-sm bg-card">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-muted/70 font-semibold border-b text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Cód. SUNAT</th>
                    <th className="p-3">Concepto Tributario</th>
                    <th className="p-3">Tasa Legal</th>
                    <th className="p-3 text-right">Base Imponible</th>
                    <th className="p-3 text-right">Monto Liquidado (PEN)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="hover:bg-muted/20">
                    <td className="p-3 font-mono text-muted-foreground">0010</td>
                    <td className="p-3 font-medium text-foreground">Ad-Valorem (Arancel de Aduanas)</td>
                    <td className="p-3 font-mono">0.0%</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(declaration.cif_total_pen || 197016.5, 'PEN')}</td>
                    <td className="p-3 text-right font-mono font-bold">S/ 0.00</td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="p-3 font-mono text-muted-foreground">0003</td>
                    <td className="p-3 font-medium text-foreground">IGV Aduanero (Impuesto General a las Ventas)</td>
                    <td className="p-3 font-mono">16.0%</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(declaration.cif_total_pen || 197016.5, 'PEN')}</td>
                    <td className="p-3 text-right font-mono font-bold">
                      {formatCurrency(declaration.total_igv_pen || 31522.64, 'PEN')}
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="p-3 font-mono text-muted-foreground">0004</td>
                    <td className="p-3 font-medium text-foreground">IPM (Impuesto de Promoción Municipal)</td>
                    <td className="p-3 font-mono">2.0%</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(declaration.cif_total_pen || 197016.5, 'PEN')}</td>
                    <td className="p-3 text-right font-mono font-bold">
                      {formatCurrency(declaration.total_ipm_pen || 3940.33, 'PEN')}
                    </td>
                  </tr>
                  <tr className="bg-amber-500/10 hover:bg-amber-500/15">
                    <td className="p-3 font-mono text-amber-700 dark:text-amber-300 font-bold">0026</td>
                    <td className="p-3 font-medium text-amber-700 dark:text-amber-300">
                      Percepción del IGV en Importaciones (Ley 29173)
                    </td>
                    <td className="p-3 font-mono text-amber-700 dark:text-amber-300">3.5% (Habitual)</td>
                    <td className="p-3 text-right font-mono text-amber-700 dark:text-amber-300">S/ 232,479.47</td>
                    <td className="p-3 text-right font-mono font-bold text-amber-700 dark:text-amber-300">
                      {formatCurrency(declaration.total_perception_pen || 8136.78, 'PEN')}
                    </td>
                  </tr>
                  <tr className="bg-primary/10 font-bold border-t-2 border-primary/20">
                    <td colSpan={4} className="p-3 text-right text-foreground uppercase tracking-wider text-xs">
                      TOTAL DEUDA TRIBUTARIA ADUANERA:
                    </td>
                    <td className="p-3 text-right font-mono text-primary text-sm font-extrabold">
                      {formatCurrency(
                        (declaration.total_ad_valorem_pen || 0) +
                          (declaration.total_igv_pen || 31522.64) +
                          (declaration.total_ipm_pen || 3940.33) +
                          (declaration.total_perception_pen || 8136.78),
                        'PEN',
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Recuadro Oficial de Cobranza (CDA) */}
            <div className="p-4 border rounded-xl bg-card space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-xs uppercase tracking-wide flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Liquidación de Cobranza Oficial SUNAT (CDA)
                </span>
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] px-2.5 py-0.5">
                  PAGADA / CON LEVANTE AUTORIZADO
                </Badge>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-[11px] p-3 bg-muted/20 rounded-lg border">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">N° Documento CDA (14 dígitos):</span>
                  <span className="font-mono font-bold text-foreground text-xs">11826100104589</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Fecha de Vencimiento:</span>
                  <span className="font-medium text-foreground">05/11/2026 (Exigible)</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Modalidad de Garantía:</span>
                  <span className="font-medium text-foreground">Pago Contado Previo (Sin Art. 160)</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Entidad Bancaria Recaudadora:</span>
                  <span className="font-medium text-foreground">BCP — Op. Bancaria 994128</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contenido Documentos y Sustentos (Obs 10) */}
        {activeFormat === 'DOCS' && (
          <div className="space-y-4 py-2 text-xs">
            {uploadSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-medium">
                {uploadSuccess}
              </div>
            )}

            {/* Formulario de Carga */}
            <div className="p-4 border rounded-xl bg-card/60 space-y-3">
              <h4 className="font-bold text-foreground text-xs flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                Subir Nuevo Documento Oficial de la DAM (Formatos A, B, C o Sustentos)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-medium text-muted-foreground block mb-1 uppercase text-[10px]">
                    Tipo de Formato / Documento *
                  </label>
                  <select
                    value={docFormatType}
                    onChange={(e) => setDocFormatType(e.target.value)}
                    className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background font-medium"
                  >
                    <option value="FORMATO_A">Formato A — Declaración de Mercancías</option>
                    <option value="FORMATO_B">Formato B — Declaración del Valor OMC</option>
                    <option value="FORMATO_C">Formato C — Liquidación de Tributos</option>
                    <option value="BL">Conocimiento de Embarque (B/L / AWB)</option>
                    <option value="FACTURA_COMERCIAL">Factura Comercial (Commercial Invoice)</option>
                    <option value="PACKING_LIST">Lista de Empaque (Packing List)</option>
                    <option value="CERTIFICADO_ORIGEN">Certificado de Origen</option>
                    <option value="SUSTENTO_VALOR">Sustento de Valor / Transferencia Swift</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-muted-foreground block mb-1 uppercase text-[10px]">
                    N° Folio / Referencia Documentaria
                  </label>
                  <Input
                    placeholder="ej: DAM-118-2026-A-01"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-medium text-muted-foreground block mb-1 uppercase text-[10px]">
                    Nombre del Archivo (PDF / Imagen)
                  </label>
                  <Input
                    placeholder="ej: Formato_A_Firmado.pdf"
                    value={docFileName}
                    onChange={(e) => setDocFileName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-muted-foreground block mb-1 uppercase text-[10px]">
                  Enlace o URL de Almacenamiento Seguro (S3 / Storage Local)
                </label>
                <Input
                  placeholder="https://storage.sunat-mype.pe/declarations/dam-2026-118-045892/formato_a.pdf"
                  value={docFileUrl}
                  onChange={(e) => setDocFileUrl(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  onClick={() => uploadMutation.mutate()}
                  disabled={uploadMutation.isPending}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {uploadMutation.isPending ? 'Cargando documento...' : 'Registrar y Guardar Documento'}
                </Button>
              </div>
            </div>

            {/* Listado de Documentos Oficiales Registrados */}
            <div className="border rounded-xl bg-card overflow-hidden">
              <div className="p-3 bg-muted/40 border-b flex items-center justify-between">
                <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <FileCheck2 className="h-4 w-4 text-emerald-600" />
                  Expediente Digital: Documentos Asociados a la DAM
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Almacenados en Base de Datos Oficial
                </span>
              </div>

              <table className="w-full text-left text-xs">
                <thead className="bg-muted/20 text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Tipo Formato</th>
                    <th className="p-2.5">N° Documento</th>
                    <th className="p-2.5">Archivo</th>
                    <th className="p-2.5">Fecha Registro</th>
                    <th className="p-2.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {docsQuery.isLoading ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-muted-foreground">
                        Cargando expediente digital...
                      </td>
                    </tr>
                  ) : (docsQuery.data ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">
                        No hay documentos registrados para esta declaración. Puede subir los Formatos A, B, C o sustentos arriba.
                      </td>
                    </tr>
                  ) : (
                    docsQuery.data!.map((doc) => (
                      <tr key={doc.id} className="border-t hover:bg-muted/10">
                        <td className="p-2.5">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {doc.format_type}
                          </Badge>
                        </td>
                        <td className="p-2.5 font-mono">{doc.document_number || 'S/N'}</td>
                        <td className="p-2.5 font-medium">{doc.file_name}</td>
                        <td className="p-2.5 font-mono text-muted-foreground">
                          {String(doc.created_at).slice(0, 10)}
                        </td>
                        <td className="p-2.5 text-right">
                          <a
                            href={doc.storage_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline font-semibold text-[11px]"
                          >
                            <Download className="h-3 w-3" />
                            Ver Documento
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
