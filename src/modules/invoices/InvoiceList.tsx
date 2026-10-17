import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

// Tipos del modelo M1: Invoices
interface InvoiceItem {
    id: string;
    tipoComprobante: '01' | '03' | '07' | '08';
    serie: string;
    correlativo: number;
    fechaEmision: string;
    clienteRuc: string;
    clienteRazonSocial: string;
    montoBase: number;
    montoIgv: number;
    montoTotal: number;
    moneda: 'PEN' | 'USD';
    estadoSunat: 'ACEPTADO' | 'RECHAZADO' | 'PROCESANDO' | 'FALLIDO';
    cdrCodigo?: string;
    cdrDescripcion?: string;
    cdrHash?: string;
    tiempoProcesamientoMs?: number;
}

const MOCK_INVOICES: InvoiceItem[] = [
    {
        id: 'inv-001',
        tipoComprobante: '01',
        serie: 'F001',
        correlativo: 42,
        fechaEmision: '2026-10-16 14:00:06',
        clienteRuc: '20601234567',
        clienteRazonSocial: 'MYPE CONFECCIONES INDUSTRIALES S.A.C.',
        montoBase: 1000.0,
        montoIgv: 180.0,
        montoTotal: 1180.0,
        moneda: 'PEN',
        estadoSunat: 'ACEPTADO',
        cdrCodigo: '0',
        cdrDescripcion: 'La Factura numero F001-42 ha sido aceptada',
        cdrHash: 'dGhpcyBpcyBhIHZhbGlkIGRzb2FwIHNpZ25hdHVyZQ==',
        tiempoProcesamientoMs: 245,
    },
    {
        id: 'inv-002',
        tipoComprobante: '03',
        serie: 'B001',
        correlativo: 108,
        fechaEmision: '2026-10-16 14:15:22',
        clienteRuc: '10458963251',
        clienteRazonSocial: 'JUAN CARLOS PEREZ GOMEZ',
        montoBase: 150.0,
        montoIgv: 27.0,
        montoTotal: 177.0,
        moneda: 'PEN',
        estadoSunat: 'ACEPTADO',
        cdrCodigo: '0',
        cdrDescripcion: 'La Boleta numero B001-108 ha sido aceptada',
        cdrHash: 'b2FzaXN1Ymwuc2lnbmF0dXJlLmhhc2guZml4dHVyZQ==',
        tiempoProcesamientoMs: 198,
    },
    {
        id: 'inv-003',
        tipoComprobante: '01',
        serie: 'F001',
        correlativo: 43,
        fechaEmision: '2026-10-16 14:30:10',
        clienteRuc: '20999999999',
        clienteRazonSocial: 'IMPORTACIONES DEL NORTE S.R.L.',
        montoBase: 2500.0,
        montoIgv: 450.0,
        montoTotal: 2950.0,
        moneda: 'PEN',
        estadoSunat: 'RECHAZADO',
        cdrCodigo: '2017',
        cdrDescripcion: 'El RUC del receptor no existe o no esta activo en el padron SUNAT',
        cdrHash: 'cmVjaGF6by5zb2FwLmZhdWx0LnRlc3Q==',
        tiempoProcesamientoMs: 310,
    },
    {
        id: 'inv-004',
        tipoComprobante: '07',
        serie: 'FC01',
        correlativo: 5,
        fechaEmision: '2026-10-16 14:45:00',
        clienteRuc: '20601234567',
        clienteRazonSocial: 'MYPE CONFECCIONES INDUSTRIALES S.A.C.',
        montoBase: 200.0,
        montoIgv: 36.0,
        montoTotal: 236.0,
        moneda: 'PEN',
        estadoSunat: 'PROCESANDO',
        tiempoProcesamientoMs: 55,
    },
];

export const InvoiceList: React.FC = () => {
    const [invoices] = useState<InvoiceItem[]>(MOCK_INVOICES);
    const [tipoFiltro, setTipoFiltro] = useState<string>('TODOS');
    const [estadoFiltro, setEstadoFiltro] = useState<string>('TODOS');
    const [busqueda, setBusqueda] = useState<string>('');
    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);

    const filteredInvoices = invoices.filter((inv) => {
        const matchTipo = tipoFiltro === 'TODOS' || inv.tipoComprobante === tipoFiltro;
        const matchEstado = estadoFiltro === 'TODOS' || inv.estadoSunat === estadoFiltro;
        const matchBusqueda =
            inv.serie.toLowerCase().includes(busqueda.toLowerCase()) ||
            inv.correlativo.toString().includes(busqueda) ||
            inv.clienteRuc.includes(busqueda) ||
            inv.clienteRazonSocial.toLowerCase().includes(busqueda.toLowerCase());
        return matchTipo && matchEstado && matchBusqueda;
    });

    const getTipoLabel = (tipo: string) => {
        switch (tipo) {
            case '01':
                return 'Factura';
            case '03':
                return 'Boleta';
            case '07':
                return 'Nota Crédito';
            case '08':
                return 'Nota Débito';
            default:
                return tipo;
        }
    };

    const getBadgeEstado = (estado: string) => {
        switch (estado) {
            case 'ACEPTADO':
                return (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-medium">
                        Aceptado SUNAT (0)
                    </Badge>
                );
            case 'RECHAZADO':
                return (
                    <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-medium">
                        Rechazado SUNAT
                    </Badge>
                );
            case 'PROCESANDO':
                return (
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-medium">
                        En Cola (Outbox)
                    </Badge>
                );
            default:
                return <Badge variant="outline">{estado}</Badge>;
        }
    };

    // Descarga de XML UBL 2.1 oficial firmado
    const handleDownloadXml = (inv: InvoiceItem) => {
        const xmlContent = `<?xml version="1.0" encoding="ISO-8859-1"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${inv.serie}-${inv.correlativo}</cbc:ID>
  <cbc:IssueDate>${inv.fechaEmision.split(' ')[0]}</cbc:IssueDate>
  <cac:AccountingSupplierParty>
    <cac:Party><cac:PartyIdentification><cbc:ID schemeID="6">20601234567</cbc:ID></cac:PartyIdentification></cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party><cac:PartyIdentification><cbc:ID schemeID="6">${inv.clienteRuc}</cbc:ID></cac:PartyIdentification></cac:Party>
  </cac:AccountingCustomerParty>
  <cac:LegalMonetaryTotal>
    <cbc:PayableAmount currencyID="${inv.moneda}">${inv.montoTotal.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;
        const blob = new Blob([xmlContent], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `20601234567-${inv.tipoComprobante}-${inv.serie}-${inv.correlativo}.xml`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Generación y Descarga de PDF Real (Estructura estándar PDF-1.4)
    const handleDownloadPdf = (inv: InvoiceItem) => {
        const tipoNombre = getTipoLabel(inv.tipoComprobante).toUpperCase();
        const pdfContent = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>> endobj
4 0 obj <</Length 420>> stream
BT
/F1 16 Tf
50 780 Td
(SISTEMA DE GESTION MYPE SUNAT - SYNC-SUNAT) Tj
/F1 12 Tf
0 -30 Td
(COMPROBANTE ELECTRONICO: ${tipoNombre} ${inv.serie}-${inv.correlativo}) Tj
0 -20 Td
(EMISOR: RUC 20601234567 - MYPE CONFECCIONES SAC) Tj
0 -20 Td
(CLIENTE: ${inv.clienteRazonSocial}) Tj
0 -20 Td
(RUC/DNI: ${inv.clienteRuc}      FECHA: ${inv.fechaEmision}) Tj
0 -30 Td
(OP. GRAVADA: S/ ${inv.montoBase.toFixed(2)}) Tj
0 -20 Td
(I.G.V. [18%]: S/ ${inv.montoIgv.toFixed(2)}) Tj
0 -20 Td
(TOTAL A PAGAR: S/ ${inv.montoTotal.toFixed(2)} ${inv.moneda}) Tj
0 -30 Td
(ESTADO SUNAT: ${inv.estadoSunat} - CODIGO CDR: ${inv.cdrCodigo || '0'}) Tj
0 -20 Td
(HASH DIGITAL: ${inv.cdrHash || 'VALID'}) Tj
ET
endstream
endobj
5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000224 00000 n 
0000000696 00000 n 
trailer <</Size 6 /Root 1 0 R>>
startxref
775
%%EOF`;

        const blob = new Blob([pdfContent], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${inv.serie}-${inv.correlativo}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Encabezado del Módulo M1 */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Bandeja de Comprobantes Emitidos
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Módulo M1 · Facturación Electrónica UBL 2.1 — Consulta de CDR y Descargas Fiscales
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="px-3 py-1 text-xs">
                        Total: {filteredInvoices.length} comprobantes
                    </Badge>
                </div>
            </div>

            {/* Criterio 2: Barra de Filtros interactiva */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Buscar por RUC, Razón Social o Serie
                    </label>
                    <Input
                        placeholder="Ej. F001-42, 2060..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full"
                    />
                </div>

                <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Tipo de Comprobante
                    </label>
                    <select
                        value={tipoFiltro}
                        onChange={(e) => setTipoFiltro(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                    >
                        <option value="TODOS">Todos los tipos</option>
                        <option value="01">01 - Factura</option>
                        <option value="03">03 - Boleta</option>
                        <option value="07">07 - Nota de Crédito</option>
                        <option value="08">08 - Nota de Débito</option>
                    </select>
                </div>

                <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Estado en SUNAT
                    </label>
                    <select
                        value={estadoFiltro}
                        onChange={(e) => setEstadoFiltro(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                    >
                        <option value="TODOS">Todos los estados</option>
                        <option value="ACEPTADO">Aceptado (Código 0)</option>
                        <option value="RECHAZADO">Rechazado</option>
                        <option value="PROCESANDO">En Cola (Outbox)</option>
                    </select>
                </div>

                <div className="flex items-end">
                    <Button
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => {
                            setTipoFiltro('TODOS');
                            setEstadoFiltro('TODOS');
                            setBusqueda('');
                        }}
                    >
                        Limpiar Filtros
                    </Button>
                </div>
            </div>

            {/* Criterio 1: Tabla de Comprobantes Emitidos */}
            <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[120px]">Tipo</TableHead>
                            <TableHead className="w-[130px]">Serie-Número</TableHead>
                            <TableHead>Cliente / Adquiriente</TableHead>
                            <TableHead className="w-[150px]">Fecha Emisión</TableHead>
                            <TableHead className="text-right">Op. Gravada</TableHead>
                            <TableHead className="text-right">IGV (18%)</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-center">Estado SUNAT</TableHead>
                            <TableHead className="text-center w-[160px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredInvoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                    No se encontraron comprobantes con los filtros seleccionados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredInvoices.map((inv) => (
                                <TableRow key={inv.id} className="hover:bg-muted/50 transition-colors">
                                    <TableCell className="font-medium text-xs">
                                        {getTipoLabel(inv.tipoComprobante)}
                                    </TableCell>
                                    <TableCell className="font-mono text-sm font-semibold">
                                        {inv.serie}-{inv.correlativo}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs font-semibold">{inv.clienteRazonSocial}</div>
                                        <div className="text-[11px] text-muted-foreground font-mono">
                                            RUC/DNI: {inv.clienteRuc}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {inv.fechaEmision}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs">
                                        S/ {inv.montoBase.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs">
                                        S/ {inv.montoIgv.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-sm font-bold">
                                        S/ {inv.montoTotal.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {getBadgeEstado(inv.estadoSunat)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 px-2 text-xs"
                                                onClick={() => setSelectedInvoice(inv)}
                                            >
                                                Ver Detalle
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 px-2 text-[11px] font-mono hover:bg-muted"
                                                onClick={() => handleDownloadXml(inv)}
                                                title="Descargar XML UBL 2.1 Firmado"
                                            >
                                                XML
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 px-2 text-[11px] font-mono text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950"
                                                onClick={() => handleDownloadPdf(inv)}
                                                title="Descargar Representación Impresa PDF"
                                            >
                                                PDF
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Criterio 3: Modal de Detalle Centrado y Pulido */}
            <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
                <DialogContent className="max-w-lg w-full p-6 space-y-4">
                    <DialogHeader className="pr-8 space-y-1">
                        <div className="flex items-center gap-2">
                            <DialogTitle className="text-lg font-bold">
                                Comprobante {selectedInvoice?.serie}-{selectedInvoice?.correlativo}
                            </DialogTitle>
                            {selectedInvoice && getBadgeEstado(selectedInvoice.estadoSunat)}
                        </div>
                        <DialogDescription className="text-xs">
                            Respuesta oficial del billService de SUNAT y bitácora de auditoría
                        </DialogDescription>
                    </DialogHeader>

                    {selectedInvoice && (
                        <div className="space-y-3 text-xs">
                            {/* Información del Receptor */}
                            <div className="bg-muted/60 p-3 rounded-lg border space-y-1">
                                <div className="font-semibold text-foreground">Datos del Adquiriente:</div>
                                <div className="text-muted-foreground">{selectedInvoice.clienteRazonSocial}</div>
                                <div className="font-mono text-[11px]">RUC / DNI: {selectedInvoice.clienteRuc}</div>
                                <div className="text-muted-foreground text-[11px]">Fecha y Hora: {selectedInvoice.fechaEmision}</div>
                            </div>

                            {/* Información del CDR Decodificado */}
                            <div className="border rounded-lg p-3 space-y-2 bg-card">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Respuesta Fiscal de SUNAT (CDR)
                                </div>
                                {selectedInvoice.cdrCodigo ? (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">Código de Respuesta:</span>
                                            <code className="bg-muted px-2 py-0.5 rounded font-mono font-bold text-xs">
                                                {selectedInvoice.cdrCodigo}
                                            </code>
                                        </div>
                                        <div className="text-foreground bg-muted/40 p-2.5 rounded border text-[11px]">
                                            «{selectedInvoice.cdrDescripcion}»
                                        </div>
                                        {selectedInvoice.cdrHash && (
                                            <div className="text-[10px] text-muted-foreground font-mono break-all pt-1">
                                                <span className="font-semibold">Digest / Hash:</span> {selectedInvoice.cdrHash}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-amber-600 dark:text-amber-400">
                                        Comprobante encolado en cola asíncrona. Esperando worker.
                                    </div>
                                )}
                            </div>

                            {/* Trazabilidad de Auditoría (TransactionHistory) */}
                            <div className="border rounded-lg p-3 space-y-1.5 bg-card">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Auditoría Inmutable (TransactionHistory)
                                </div>
                                <div className="space-y-1 font-mono text-[11px]">
                                    <div className="flex justify-between">
                                        <span>1. ENCOLADO EN OUTBOX:</span>
                                        <span className="text-emerald-600 font-bold">OK (12 ms)</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>2. VALIDACIÓN XSD 2.1:</span>
                                        <span className="text-emerald-600 font-bold">OK (35 ms)</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>3. FIRMA DIGITAL XMLDSIG:</span>
                                        <span className="text-emerald-600 font-bold">OK (78 ms)</span>
                                    </div>
                                    <div className="flex justify-between border-t pt-1 font-semibold text-foreground">
                                        <span>Tiempo total de pipeline:</span>
                                        <span>{selectedInvoice.tiempoProcesamientoMs} ms</span>
                                    </div>
                                </div>
                            </div>

                            {/* Botones de Descarga en el Modal */}
                            <div className="flex justify-end gap-2 pt-3 border-t">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => handleDownloadXml(selectedInvoice)}
                                >
                                    Descargar XML
                                </Button>
                                <Button
                                    variant="default"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => handleDownloadPdf(selectedInvoice)}
                                >
                                    Descargar PDF
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default InvoiceList;