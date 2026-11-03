import { useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useInvoicesList } from '../hooks/useInvoicesList';
import { useComprobantesDeEmpresa } from '../hooks/useComprobantesDeEmpresa';
import { useInvoiceMetrics } from '../hooks/useInvoiceMetrics';
import { InvoiceMetricsSummaryBar } from '../components/InvoiceMetricsSummaryBar';
import { METRICAS_VACIAS } from '../lib/invoiceMetricsPeriodo';
import {
  apartadoDesdeRuta,
  DESCRIPCION_POR_APARTADO,
  esListadoPorTipo,
  TIPOS_POR_APARTADO,
  TITULO_POR_APARTADO,
} from '../lib/invoiceApartados';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  FilterBar,
  FilterSearch,
  Page,
  PageHeader,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PageText,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { formatCurrency, formatDateToPeru } from '@/lib/formatters';
import { FilePlus, RefreshCw, Info, FileSearch, CheckCircle2 } from 'lucide-react';
import { InvoiceCdrModal } from '../components/InvoiceCdrModal';
import { InvoiceEmitModal } from '../components/InvoiceEmitModal';
import type { TipoEmisible } from '../lib/invoiceEmitValidation';
import type { Invoice } from '../types/invoice.types';
import type { ComprobanteDemo } from '../data/invoiceDemoTypes';
import { invoicesApi } from '../services/invoicesApi';

import { useRolePermissions } from '@/hooks/useRolePermissions';
import type { FiltrosInvoices } from '../services/invoicesApi';

const cdrStatusLabels = {
  ACEPTADO_SUNAT: 'Aceptado', EN_COLA_OUTBOX: 'Buffer Outbox', FALLO_CRITICO: 'En Cola DLQ', RECHAZADO_SUNAT: 'Rechazado',
} as const;

/** Estados que ofrece el filtro (los del enum del backend). */
const FILTROS_ESTADO = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'ACEPTADO', label: 'Aceptado' },
  { value: 'OBSERVADO', label: 'Observado' },
  { value: 'EN_COLA', label: 'En cola' },
  { value: 'ERROR_RED', label: 'Error de red' },
  { value: 'RECHAZADO', label: 'Rechazado' },
] as const;

/** Tipos del Catálogo 01 que ofrece el filtro. */
const FILTROS_TIPO = [
  { value: 'todos', label: 'Todos los tipos' },
  { value: '01', label: 'Factura' },
  { value: '03', label: 'Boleta' },
  { value: '07', label: 'Nota de crédito' },
  { value: '08', label: 'Nota de débito' },
] as const;

/**
 * Opciones del filtro de tipo para el apartado actual.
 *
 * En "Facturas y Boletas" no tiene sentido ofrecer "Nota de crédito": elegirla
 * devolvería una lista vacía y el usuario leería que no hay comprobantes.
 */
const opcionesTipoDe = (tiposDelApartado: readonly string[]) =>
  tiposDelApartado.length === 0
    ? FILTROS_TIPO
    : FILTROS_TIPO.filter((o) => o.value === 'todos' || tiposDelApartado.includes(o.value));

/**
 * Estado del CDR del front al modelo del modal.
 *
 * DEUDA CONOCIDA — COLAPSO DE `ERROR_RED` (decisión del 3 nov: se cierra
 * después de la demo)
 *
 * `FALLO_CRITICO` se mapea a `RECHAZADO`, y ese colapso es la raíz de que la
 * ficha afirmara "Rechazado" sobre un comprobante que SUNAT nunca recibió.
 * `RECHAZADO` es un veredicto del fisco; `ERROR_RED` es un fallo de envío. Hoy
 * se compensa mirando `estadoBackend` en cada sitio que rotula el estado
 * (`InvoiceStatusBadge`, `InvoiceAuditTrail`, la celda de la grilla y
 * `InvoiceCdrModal`), con el criterio único de `lib/invoiceRedError`.
 *
 * Ese apaño tiene un techo: cualquier pantalla nueva que use `estado` sin
 * pasar por `esErrorDeRed` vuelve a mentir, y la grilla sigue rotulando
 * "En Cola DLQ" a un fallo de red vía `MAPA_ESTADOS`. La solución de raíz es
 * añadir `SIN_CONFIRMAR` al enum `CdrStatus` y dejar de colapsar, revisando
 * badge, filtros y conteos. No se hizo antes de la demo por superficie de
 * riesgo, no por olvido.
 */
const mapEstadoCdr = (
  status: Invoice['cdrStatus'],
): ComprobanteDemo['estado'] => {
  switch (status) {
    case 'ACEPTADO_SUNAT':
      return 'ACEPTADO';
    case 'RECHAZADO_SUNAT':
    case 'FALLO_CRITICO':
      return 'RECHAZADO';
    default:
      // EN_COLA_OUTBOX: el comprobante todavía no tiene respuesta de SUNAT.
      return 'EN_COLA';
  }
};

/**
 * Adapta la fila de la bandeja al tipo que espera el modal de auditoría.
 *
 * `Invoice` (lo que devuelve la API) y `ComprobanteDemo` (el modelo del modal)
 * describen lo mismo con nombres distintos. Se traduce aquí en lugar de cambiar
 * cualquiera de los dos: el modal también lo usa el flujo de demostración.
 *
 * `detalle` son los datos del ENDPOINT DE DETALLE, que trae el CDR completo. El
 * listado no los incluye: por eso el modal mostraba "Código PENDIENTE" en
 * comprobantes ya ACEPTADOS, contradiciendo el badge de la propia fila.
 */
const aComoComprobanteDemo = (
  inv: Invoice,
  detalle?: Invoice | null,
): ComprobanteDemo => {
  const fuente = detalle ?? inv;

  return {
    /**
     * `id` va el UUID DE LA BASE, no el número del comprobante.
     *
     * El modal lo usa para pedir `GET /invoices/:id/{xml,pdf,cdr}`. Con el
     * número (`F001-00000032`) esas rutas resuelven a un comprobante que no
     * existe y el backend responde 404: el botón "Descargar XML" fallaba en
     * todas las facturas. Se detectó en el navegador el 31-10 capturando la
     * petición real.
     *
     * El número legible se arma con `serie` + `correlativo`, que el modal ya
     * recibe por separado.
     */
    id: inv.id,
    tipo: (inv.tipoComprobante ?? '01') as ComprobanteDemo['tipo'],
    serie: inv.serie,
    correlativo: Number(inv.numero.split('-')[1] ?? 0),
    fechaEmision: inv.fechaEmision,
    clienteRuc: fuente.clienteRuc || inv.clienteRuc,
    clienteTipoDoc:
      (fuente.clienteRuc || inv.clienteRuc).length === 11 ? '6' : '1',
    clienteRazonSocial: fuente.clienteRazonSocial || inv.clienteRazonSocial,
    baseImponible: fuente.subtotal,
    igv: fuente.igv,
    totalNeto: fuente.total,
    estado: mapEstadoCdr(fuente.cdrStatus),
    cdrCodigo: fuente.cdrCodigo ?? inv.cdrCodigo,
    // Código y motivo del rechazo cuando SUNAT no devolvió CDR. Sin esto el
    // modal no tenía con qué rotular un RECHAZADO y caía en "PENDIENTE".
    ultimoErrorCodigo: fuente.ultimoErrorCodigo,
    ultimoErrorMensaje: fuente.ultimoErrorMensaje,
    // `cdrMensaje` es la descripción que devuelve el backend; el modelo del
    // modal la llama `cdrDescripcion`.
    //
    // Un RECHAZADO sin CDR (SOAP Fault) no tiene código oficial: el backend
    // ahora manda el código y el motivo del fault en `ultimoError*`. Se usa eso
    // en lugar de "Sin respuesta de SUNAT todavía", que describía un rechazo
    // consumado como si SUNAT no hubiera contestado.
    //
    // FALLO_CRITICO (ERROR_RED) se trata ANTES que ese último recurso. Antes
    // caía en "Sin respuesta de SUNAT todavía" mientras el badge, dos líneas
    // más arriba, decía "Rechazado": la ficha se contradecía consigo misma. Un
    // ERROR_RED no es un rechazo de SUNAT — SUNAT nunca contestó porque el
    // envío no salió— así que el texto habla de la transmisión, no del CDR.
    cdrDescripcion:
      (fuente.cdrMensaje || inv.cdrMensaje) ??
      (fuente.ultimoErrorMensaje
        ? `Código ${fuente.ultimoErrorCodigo ?? '?'}: ${fuente.ultimoErrorMensaje}`
        : fuente.cdrCodigo || inv.cdrCodigo
          ? `Código ${fuente.cdrCodigo ?? inv.cdrCodigo} reportado por SUNAT`
          : fuente.estadoBackend === 'ERROR_RED'
            ? 'No llegó a SUNAT: el envío falló por un error de red y el comprobante no fue evaluado.'
            : 'Sin respuesta de SUNAT todavía'),
    // SHA-256 del XML firmado; lo expone el endpoint de detalle.
    hashCpe: (fuente.hashCpe || inv.hashCpe) ?? '',
    moneda: inv.moneda,
    detraccion: 0,
    retencion: 0,
    tipoOperacion: '0101',
    // Forma de pago y cronograma: vienen del DETALLE, que los lee del
    // `payload_ubl` enviado a SUNAT. Antes se escribía `'Contado'` y `[]` a
    // mano, así que toda factura al crédito se abría como venta al contado y
    // sin cronograma aunque su XML llevara Cuota001/Cuota002.
    //
    // Solo se toma del detalle: el listado no los trae. Si el detalle aún no
    // llegó no se afirma nada (`null` = desconocido), porque escribir "Contado"
    // por defecto describiría como contado un crédito.
    formaPago: detalle ? (detalle.formaPago ?? null) : null,
    cuotas: detalle?.cuotas ?? [],
    // Estado crudo del backend: la Bitácora lo necesita para no rotular un
    // ERROR_RED como rechazo de SUNAT.
    estadoBackend: fuente.estadoBackend ?? inv.estadoBackend,
    items: [],
  };
};

export default function InvoicesListPage() {
  // TA-59: la URL decide qué apartado se muestra. Sin esto, las cuatro rutas
  // del menú (facturas, notas, bajas, monitor) renderizaban el mismo listado
  // con la misma consulta y navegar solo cambiaba el resaltado del sidebar.
  const { pathname } = useLocation();
  const apartado = apartadoDesdeRuta(pathname);
  const tiposDelApartado = TIPOS_POR_APARTADO[apartado];

  // TA-59: la paginación y los filtros son estado real y se envían al backend,
  // que ya los soportaba; antes la pantalla los ignoraba y solo paginaba en
  // cliente sobre la primera página.
  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState('todos');
  const [tipo, setTipo] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  /**
   * Comprobante abierto en el modal de auditoría.
   *
   * `InvoiceCdrModal` existía pero ninguna pantalla lo importaba: el CDR, el XML
   * y el PDF no eran alcanzables desde la interfaz.
   */
  const [auditoria, setAuditoria] = useState<Invoice | null>(null);
  /** Detalle del comprobante abierto; trae el CDR que el listado no incluye. */
  const [detalleCdr, setDetalleCdr] = useState<Invoice | null>(null);

  /**
   * Tipo del comprobante que se está emitiendo, o `null` si el modal está cerrado.
   *
   * EL BOTÓN "Nueva Factura" QUEDÓ MUERTO AL CAMBIAR DE PANTALLA. Este botón solo
   * se dibujaba: abrir `InvoiceEmitModal` era cosa de la pantalla anterior
   * (`InvoiceList.tsx`), que se retiró al enrutar `/invoices/facturas` a esta.
   * El modal nunca se borró —quedó sin que nadie lo importara—, así que lo que
   * faltaba era volver a conectarlo aquí.
   */
  const [emitiendo, setEmitiendo] = useState<TipoEmisible | null>(null);

  /**
   * Confirmación de la última emisión, con el número que asignó el backend.
   *
   * Sin esto, al cerrar el modal el usuario no tenía forma de saber si el
   * comprobante se había emitido ni con qué número: la grilla se recarga pero
   * el documento nuevo puede quedar en otra página.
   */
  const [ultimaEmision, setUltimaEmision] = useState<string | null>(null);

  /** Tras emitir se recarga la bandeja para ver el comprobante recién creado. */
  const cerrarEmision = useCallback(() => setEmitiendo(null), []);

  /**
   * Fecha de hoy en Lima (UTC-5), calculada AL ABRIR el modal y no en el render.
   *
   * `Date.now()` es impuro: llamarlo durante el render lo rechaza la regla
   * react-hooks y además daría una fecha distinta si el componente re-renderiza
   * cerca de medianoche. Se congela al pulsar el botón.
   */
  const [fechaBorrador, setFechaBorrador] = useState('');

  const abrirEmision = useCallback((tipo: TipoEmisible) => {
    setFechaBorrador(
      new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10),
    );
    setEmitiendo(tipo);
  }, []);

  /**
   * Tipo con el que se abre el formulario según el apartado de origen.
   *
   * El modal abría SIEMPRE en Factura (01), también desde Notas: quien entraba
   * a emitir una nota tenía que cambiar el tipo a mano, y hasta entonces el
   * formulario no mostraba ni el documento afectado ni el motivo. En Notas se
   * abre en 07; en Comprobantes, en 01.
   */
  const tipoAlEmitir: TipoEmisible = apartado === 'notas' ? '07' : '01';

  /*
   * Solo hay dos valores posibles: desde Notas se emite una nota (07) y desde
   * Comprobantes, una factura (01). La boleta no se ofrece aquí porque necesita
   * serie propia y el apartado no la distingue.
   */
  const etiquetaEmision =
    tipoAlEmitir === '07' ? 'Nueva Nota de Crédito' : 'Nueva Factura';

  /**
   * Abre el modal pidiendo el DETALLE del comprobante.
   *
   * El listado devuelve `cdr_codigo: null` aunque el comprobante esté ACEPTADO,
   * así que el modal mostraba "Código PENDIENTE — Sin respuesta de SUNAT
   * todavía" en una factura aceptada: se contradecía con el badge de la fila.
   * El endpoint de detalle sí trae el CDR.
   */
  const abrirAuditoria = (inv: Invoice) => {
    setAuditoria(inv);
    setDetalleCdr(null);
    invoicesApi
      .getInvoiceById(inv.id)
      .then((detalle) => setDetalleCdr(detalle))
      .catch(() => {
        // Si el detalle falla, el modal se abre con lo que trae la fila y no
        // se inventa el CDR: el componente muestra "sin respuesta".
        setDetalleCdr(null);
      });
  };

  const filtros: FiltrosInvoices = {
    estado: estado === 'todos' ? undefined : estado,
    // El apartado impone sus tipos; el filtro manual solo puede afinar dentro
    // de ese conjunto. En "comprobantes" con un tipo elegido se manda ese tipo;
    // en "notas" sin elección se piden 07 y 08, pero el backend acepta un solo
    // valor por petición, así que se pide el primero y se afina en cliente.
    tipo:
      tipo !== 'todos'
        ? tipo
        : esListadoPorTipo(apartado)
          ? tiposDelApartado[0]
          : undefined,
  };

  const { data, isLoading, refetch, isRefetching } = useInvoicesList(
    page,
    filtros,
  );
  /**
   * Comprobantes de TODA la empresa, para reconocer el origen de una nota.
   *
   * Solo se pide mientras el modal está abierto: la bandeja no lo necesita y
   * pedirlo siempre sería una petición de más en cada visita.
   */
  const {
    data: comprobantesEmpresa,
    refetch: refetchComprobantesEmpresa,
  } = useComprobantesDeEmpresa(emitiendo !== null);
  // TA-69: la barra de resumen se alimenta del periodo completo, no de la
  // página visible, y por eso es una consulta aparte de la grilla.
  const { data: metricas, isLoading: cargandoMetricas } = useInvoiceMetrics();
  const { canEmitInvoices, isAuditor } = useRolePermissions();

  // La búsqueda por texto sigue siendo local: el backend no expone un parámetro
  // de texto libre y añadirlo obligaría a un LIKE sin índice sobre dos columnas.
  // Es la búsqueda sobre la página visible, no sobre toda la empresa.
  const filteredInvoices = (data?.data ?? [])
    // El apartado acota los tipos. El backend filtra por UN tipo por petición,
    // así que el resto del conjunto se descarta aquí.
    .filter(
      (inv) =>
        !esListadoPorTipo(apartado) ||
        tipo !== 'todos' ||
        tiposDelApartado.includes(inv.tipoComprobante),
    )
    .filter((inv) =>
      `${inv.serie}-${inv.numero} ${inv.clienteRazonSocial} ${inv.clienteRuc}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );

  const totalPages = data?.totalPages ?? 1;

  /**
   * Filas que alimentan el buscador de documento afectado del modal.
   *
   * Manda la consulta a la empresa; si aún no llegó (o falló), se cae a la
   * grilla para no dejar el campo vacío mientras carga. Nunca se inventa nada:
   * si no hay datos, el modal simplemente no encontrará el número y lo dirá.
   */
  const listaDeLaEmpresa: readonly Invoice[] =
    comprobantesEmpresa ?? data?.data ?? [];

  return (
    <Page>
      <PageHeader
        title={TITULO_POR_APARTADO[apartado]}
        description={DESCRIPCION_POR_APARTADO[apartado]}
      >
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw aria-hidden="true" />
          Actualizar
        </Button>
        {canEmitInvoices ? (
          <Button size="sm" onClick={() => abrirEmision(tipoAlEmitir)}>
            <FilePlus aria-hidden="true" />
            {etiquetaEmision}
          </Button>
        ) : (
          <Badge variant="outline" className="h-9 px-3 text-xs bg-muted/60 text-muted-foreground border-dashed">
            {isAuditor ? 'Inspección Fiscal (Solo Lectura)' : 'Consulta Contable (Lectura)'}
          </Badge>
        )}
      </PageHeader>

      {/*
        Confirmación de lo que el backend acaba de registrar. El número lo
        asigna el servidor; mostrarlo evita que el usuario cierre el modal sin
        saber si la emisión existió y con qué número.
      */}
      {ultimaEmision && (
        <Alert variant="success">
          <CheckCircle2 aria-hidden="true" />
          <AlertTitle>Comprobante registrado</AlertTitle>
          <AlertDescription>
            {ultimaEmision}. Queda en cola: el CDR se consulta en la bandeja.
          </AlertDescription>
        </Alert>
      )}

      <Alert variant="info">
        <Info aria-hidden="true" />
        <AlertTitle>Canal de Comunicación SUNAT Activo</AlertTitle>
        <AlertDescription>
          Los comprobantes emitidos se firman digitalmente y se encolan con garantía de entrega outbox.
        </AlertDescription>
      </Alert>

      {/*
        TA-69: métricas del PERIODO, calculadas en el servidor.

        Van antes de la barra de filtros porque describen el mes completo y no
        la vista filtrada: si estuvieran después, el usuario leería el número
        como si correspondiera al filtro que acaba de elegir. Los filtros
        afectan a la grilla, no a estas cifras, y por eso la barra no las
        recalcula cuando cambia un filtro.
      */}
      <InvoiceMetricsSummaryBar
        metricas={metricas ?? METRICAS_VACIAS}
        cargando={cargandoMetricas}
      />

      <FilterBar>
        <FilterSearch
          value={searchTerm}
          onChange={setSearchTerm}
          onClear={() => setSearchTerm('')}
          placeholder="Filtrar en esta página por serie, número o RUC..."
        />
        <Select
          value={estado}
          onValueChange={(valor) => {
            setEstado(valor);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filtrar por estado" className="h-9 w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTROS_ESTADO.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={tipo}
          onValueChange={(valor) => {
            setTipo(valor);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filtrar por tipo" className="h-9 w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {opcionesTipoDe(tiposDelApartado).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      <Card flush>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Comprobante</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha Emisión</TableHead>
              <TableHead align="right">Total</TableHead>
              <TableHead>Estado CDR</TableHead>
              <TableHead align="right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Cargando comprobantes...
                </TableCell>
              </TableRow>
            ) : filteredInvoices.length > 0 ? (
              filteredInvoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>{inv.numero}</TableCell>
                  <TableCell>
                    <PageText variant="label">{inv.clienteRazonSocial}</PageText>
                    <PageText variant="caption">RUC: {inv.clienteRuc}</PageText>
                  </TableCell>
                  <TableCell>
                    {formatDateToPeru(inv.fechaEmision)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(inv.total, inv.moneda)}
                  </TableCell>
                  <TableCell align="center">
                    {/*
                      Un ERROR_RED no se rotula "Rechazado": SUNAT no lo evaluó.
                      Se mira el estado CRUDO y no `cdrStatus`, porque el mapa
                      del front colapsa FALLO_CRITICO en RECHAZADO_SUNAT y
                      entonces la celda contradecía al texto de la ficha. Antes
                      además decía "En Cola DLQ", que tampoco era cierto: el
                      comprobante puede no estar en la DLQ.

                      Ver la deuda en `lib/invoiceRedError`: la solución de raíz
                      es un estado propio en el enum.
                    */}
                    <Badge
                      variant={
                        inv.estadoBackend === 'ERROR_RED'
                          ? 'outline'
                          : inv.cdrStatus === 'FALLO_CRITICO'
                            ? 'destructive'
                            : 'outline'
                      }
                      className={
                        inv.estadoBackend === 'ERROR_RED'
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-700'
                          : undefined
                      }
                    >
                      {inv.estadoBackend === 'ERROR_RED'
                        ? 'Sin confirmar'
                        : cdrStatusLabels[inv.cdrStatus]}
                      {inv.cdrCodigo ? ` (${inv.cdrCodigo})` : ''}
                    </Badge>
                    {/* TA-59: el badge OBSERVADO solo aparece si el estado crudo
                        lo dice; el status de CDR lo colapsa con ACEPTADO. */}
                    {inv.estadoBackend === 'OBSERVADO' && (
                      <Badge variant="outline" className="ml-1 text-[10px]">
                        Observado
                      </Badge>
                    )}
                  </TableCell>
                  {/*
                    Acciones por fila.
                    `InvoiceCdrModal` existía pero NINGUNA pantalla lo abría, así
                    que el CDR, el XML y el PDF no eran alcanzables desde la
                    interfaz. Se detectó recorriendo la bandeja en el navegador el
                    31-10: las filas no tenían ningún botón.
                  */}
                  <TableCell align="right">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Ver CDR de ${inv.numero}`}
                      onClick={() => abrirAuditoria(inv)}
                    >
                      <FileSearch className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      Ver CDR
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No se encontraron comprobantes registrados en este periodo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/*
        Modal de emisión: el botón "Nueva Factura" lo abre.

        `existentes` se ADAPTA con `aComoComprobanteDemo`, no se castea. Antes
        decía `(data?.data ?? []) as unknown as readonly ComprobanteDemo[]`, y
        ese `as unknown as` desactivaba al compilador: le prometía que una
        `Invoice` tenía la forma de un `ComprobanteDemo`, y no la tiene. Los
        nombres de los importes son distintos (`subtotal` aquí, `baseImponible`
        allí), así que al encontrar el documento afectado el bloque «Se vincula
        con ...» hacía `afectado.baseImponible.toFixed(2)` sobre `undefined` y el
        módulo se caía con "Cannot read properties of undefined (reading
        'toFixed')". Reproducido en el navegador el 3 nov sobre F001-00072582.

        Se pasan los comprobantes de TODA la empresa, no los del apartado: una
        nota sobre una factura tiene que poder nacer desde la página de Notas,
        donde la grilla trae solo notas.
      */}
      {emitiendo && (
        <InvoiceEmitModal
          tipoInicial={emitiendo}
          fecha={fechaBorrador}
          existentes={listaDeLaEmpresa.map((inv) =>
            aComoComprobanteDemo(inv),
          )}
          /*
           * El modal EMITE y devuelve el resultado real del backend.
           *
           * Antes este callback ignoraba el argumento, cerraba el diálogo y
           * recargaba la grilla sin haber enviado nada: el usuario creía haber
           * emitido. Ahora se recibe el número fiscal que asignó el servidor,
           * se muestra y se recarga la bandeja para ver el comprobante real.
           */
          onEmitir={(resultado) => {
            setUltimaEmision(
              `${resultado.numero} · S/ ${resultado.monto_total.toFixed(2)}`,
            );
            cerrarEmision();
            void refetch();
            void refetchComprobantesEmpresa();
          }}
          onCerrar={cerrarEmision}
        />
      )}

      {/* Modal de auditoría: CDR, XML y PDF del comprobante elegido.
          La `key` por id remonta el componente al cambiar de comprobante. Sin
          ella React reutiliza la instancia y conserva el estado: el visor
          seguía mostrando el XML del comprobante ANTERIOR mientras el CDR ya
          era el del nuevo, y la pestaña elegida se arrastraba de uno a otro. */}
      {auditoria && (
        <InvoiceCdrModal
          key={auditoria.id}
          comprobante={aComoComprobanteDemo(auditoria, detalleCdr)}
          modoInicial="cdr"
          onCerrar={() => {
            setAuditoria(null);
            setDetalleCdr(null);
          }}
        />
      )}

      <Pagination>
        <PaginationContent>
          <PaginationItem><PaginationPrevious onClick={() => setPage((p) => Math.max(1, p - 1))} /></PaginationItem>
          <PaginationItem>
            <PaginationLink isActive>
              {page} de {totalPages}
            </PaginationLink>
          </PaginationItem>
          <PaginationItem><PaginationNext onClick={() => setPage((p) => Math.min(totalPages, p + 1))} /></PaginationItem>
        </PaginationContent>
      </Pagination>
    </Page>
  );
}
