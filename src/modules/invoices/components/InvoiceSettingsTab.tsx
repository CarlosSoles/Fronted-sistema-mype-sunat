/**
 * Pantalla de configuración de Facturación Electrónica (TA-61).
 *
 * No existía: el emisor, su dirección y el ambiente de SUNAT estaban fijos en el
 * código, así que cambiar de beta a producción o corregir la dirección impresa
 * exigía tocar el repositorio.
 *
 * El formulario separa dos cosas que se confunden fácil:
 *  - **Identidad fiscal** (RUC): de solo lectura. Cambiarlo invalidaría todos los
 *    comprobantes ya emitidos.
 *  - **Datos operativos** (razón social, dirección, series, ambiente): editables.
 *
 * La validación vive en `../lib/invoiceSettings` para poder probarla sin montar
 * el componente; el backend vuelve a validar, así que esta capa es comodidad.
 */
import { useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Card,
  Page,
  PageField,
  PageHeader,
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
import { Info } from 'lucide-react';
import {
  avisoAmbiente,
  configuracionVacia,
  nombreTipo,
  type ConfiguracionFe,
  type SerieFe,
} from '../lib/invoiceSettings';

const CLASE_INPUT = 'h-9 w-full rounded-md border bg-background px-3 text-sm';

interface InvoiceSettingsTabProps {
  /** RUC de la empresa en sesión; nunca se edita. */
  ruc: string;
  configuracion?: Partial<ConfiguracionFe>;
  series?: readonly SerieFe[];
  /**
   * Ya NO se llama desde aquí.
   *
   * El botón «Guardar configuración» se retiró en D1: estaba conectado a un
   * callback que en `InvoiceSettingsPage` no hacía nada —solo un comentario
   * explicando por qué no se guardaba—. El usuario rellenaba razón social,
   * dirección o ubigeo, pulsaba e iba el mensaje a ninguna parte. El backend
   * responde 409 a `PUT /invoices/config` a propósito, porque el entorno y las
   * credenciales SOL viven en variables del despliegue.
   *
   * Un formulario que finge editar es peor que uno que solo muestra: el segundo
   * dice la verdad. Se conserva la prop para no romper a quien lo monte, pero
   * los campos pasan a ser de lectura.
   */
  onGuardar?: (config: ConfiguracionFe) => void;
}

/** Formulario de configuración del emisor electrónico. */
export const InvoiceSettingsTab = ({
  ruc,
  configuracion,
  series = [],
}: InvoiceSettingsTabProps) => {
  const [config] = useState<ConfiguracionFe>({
    ...configuracionVacia(ruc),
    ...configuracion,
    ruc,
  });

  return (
    <Page>
      <PageHeader
        title="Configuración de Facturación Electrónica"
        description="Datos del emisor, series y ambiente de SUNAT con los que se emiten los comprobantes"
      />

      <Alert variant="info">
        <Info aria-hidden="true" />
        <AlertTitle>Ambiente {config.ambiente === 'produccion' ? 'PRODUCCIÓN' : 'BETA'}</AlertTitle>
        <AlertDescription>{avisoAmbiente(config.ambiente)}</AlertDescription>
      </Alert>

      <Card>
        <PageText variant="label">Emisor</PageText>

        <PageField label="RUC (no editable)" htmlFor="cfg-ruc">
          <input
            id="cfg-ruc"
            className={`${CLASE_INPUT} bg-muted`}
            value={config.ruc}
            readOnly
            aria-readonly="true"
          />
          <PageText variant="caption">
            El RUC identifica fiscalmente a la empresa: cambiarlo invalidaría los
            comprobantes ya emitidos.
          </PageText>
        </PageField>

        <PageField label="Razón social" htmlFor="cfg-razon">
          <input
            id="cfg-razon"
            className={CLASE_INPUT}
            value={config.razonSocial}
            readOnly
            placeholder="FERRETERIA LOS ANDES S.A.C."
          />
        </PageField>

        <PageField label="Nombre comercial" htmlFor="cfg-nombre">
          <input
            id="cfg-nombre"
            className={CLASE_INPUT}
            value={config.nombreComercial}
            readOnly
            placeholder="Ferretería Los Andes"
          />
        </PageField>

        <PageField label="Dirección fiscal" htmlFor="cfg-direccion">
          <input
            id="cfg-direccion"
            className={CLASE_INPUT}
            value={config.direccion}
            readOnly
            placeholder="Av. Larco 123 - Trujillo"
          />
        </PageField>

        <PageField label="Ubigeo (6 dígitos)" htmlFor="cfg-ubigeo">
          <input
            id="cfg-ubigeo"
            className={CLASE_INPUT}
            value={config.ubigeo}
            maxLength={6}
            readOnly
            placeholder="130101"
          />
        </PageField>
      </Card>

      <Card>
        <PageText variant="label">Envío a SUNAT</PageText>

        <PageField label="Ambiente" htmlFor="cfg-ambiente">
          <Select value={config.ambiente} disabled>
            <SelectTrigger id="cfg-ambiente">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beta">Beta (pruebas)</SelectItem>
              <SelectItem value="produccion">Producción</SelectItem>
            </SelectContent>
          </Select>
          {/*
            D1: el selector está deshabilitado a propósito. El entorno lo fija
            la variable `SUNAT_ENV` del despliegue y `PUT /invoices/config`
            responde 409; ofrecerlo como editable era ofrecer un cambio que el
            servidor iba a rechazar.
          */}
          <PageText variant="caption">
            Lo define el despliegue (variable SUNAT_ENV), no esta pantalla.
          </PageText>
        </PageField>

        <PageField label="Correo de copia" htmlFor="cfg-correo">
          <input
            id="cfg-correo"
            className={CLASE_INPUT}
            value={config.correoCopia ?? ''}
            readOnly
            placeholder="facturacion@empresa.pe"
          />
        </PageField>

        <PageField label="Cuenta del Banco de la Nación" htmlFor="cfg-cuenta">
          <input
            id="cfg-cuenta"
            className={CLASE_INPUT}
            value={config.cuentaBancoNacion ?? ''}
            readOnly
            placeholder="00019123456"
          />
          <PageText variant="caption">
            Se imprime en los comprobantes con detracción (SPOT).
          </PageText>
        </PageField>
      </Card>

      <Card flush>
        <PageText variant="label">Series disponibles</PageText>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Serie</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead align="right">Siguiente</TableHead>
              <TableHead align="center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {series.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  La empresa todavía no tiene series registradas.
                </TableCell>
              </TableRow>
            ) : (
              series.map((s) => (
                <TableRow key={s.serie}>
                  <TableCell>{s.serie}</TableCell>
                  <TableCell>{nombreTipo(s.tipoComprobante)}</TableCell>
                  <TableCell align="right">
                    {s.siguienteCorrelativo !== undefined
                      ? `${s.serie}-${String(s.siguienteCorrelativo).padStart(8, '0')}`
                      : '—'}
                  </TableCell>
                  <TableCell align="center">
                    <Badge variant="outline">
                      {s.activa ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </Page>
  );
};
