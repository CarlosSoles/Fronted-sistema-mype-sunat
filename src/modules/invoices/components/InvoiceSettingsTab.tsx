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
import { useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
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
  tieneErrores,
  validarConfiguracion,
  type AmbienteFe,
  type ConfiguracionFe,
  type SerieFe,
} from '../lib/invoiceSettings';

const CLASE_INPUT = 'h-9 w-full rounded-md border bg-background px-3 text-sm';

interface InvoiceSettingsTabProps {
  /** RUC de la empresa en sesión; nunca se edita. */
  ruc: string;
  configuracion?: Partial<ConfiguracionFe>;
  series?: readonly SerieFe[];
  onGuardar: (config: ConfiguracionFe) => void;
}

/** Formulario de configuración del emisor electrónico. */
export const InvoiceSettingsTab = ({
  ruc,
  configuracion,
  series = [],
  onGuardar,
}: InvoiceSettingsTabProps) => {
  const [config, setConfig] = useState<ConfiguracionFe>({
    ...configuracionVacia(ruc),
    ...configuracion,
    ruc,
  });
  const [intentado, setIntentado] = useState(false);

  const errores = useMemo(() => validarConfiguracion(config), [config]);
  const hayErrores = tieneErrores(errores);

  const cambiar = (parcial: Partial<ConfiguracionFe>) =>
    setConfig((previo) => ({ ...previo, ...parcial }));

  const guardar = () => {
    setIntentado(true);
    if (hayErrores) return;
    onGuardar(config);
  };

  /** Muestra el error solo después del primer intento de guardar. */
  const errorDe = (campo: keyof ConfiguracionFe): string | undefined =>
    intentado ? errores[campo] : undefined;

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
            onChange={(e) => cambiar({ razonSocial: e.target.value })}
            placeholder="FERRETERIA LOS ANDES S.A.C."
          />
          {errorDe('razonSocial') && (
            <PageText variant="error">{errorDe('razonSocial')}</PageText>
          )}
        </PageField>

        <PageField label="Nombre comercial" htmlFor="cfg-nombre">
          <input
            id="cfg-nombre"
            className={CLASE_INPUT}
            value={config.nombreComercial}
            onChange={(e) => cambiar({ nombreComercial: e.target.value })}
            placeholder="Ferretería Los Andes"
          />
        </PageField>

        <PageField label="Dirección fiscal" htmlFor="cfg-direccion">
          <input
            id="cfg-direccion"
            className={CLASE_INPUT}
            value={config.direccion}
            onChange={(e) => cambiar({ direccion: e.target.value })}
            placeholder="Av. Larco 123 - Trujillo"
          />
          {errorDe('direccion') && (
            <PageText variant="error">{errorDe('direccion')}</PageText>
          )}
        </PageField>

        <PageField label="Ubigeo (6 dígitos)" htmlFor="cfg-ubigeo">
          <input
            id="cfg-ubigeo"
            className={CLASE_INPUT}
            value={config.ubigeo}
            maxLength={6}
            onChange={(e) =>
              cambiar({ ubigeo: e.target.value.replace(/\D/g, '') })
            }
            placeholder="130101"
          />
          {errorDe('ubigeo') && (
            <PageText variant="error">{errorDe('ubigeo')}</PageText>
          )}
        </PageField>
      </Card>

      <Card>
        <PageText variant="label">Envío a SUNAT</PageText>

        <PageField label="Ambiente" htmlFor="cfg-ambiente">
          <Select
            value={config.ambiente}
            onValueChange={(v) => cambiar({ ambiente: v as AmbienteFe })}
          >
            <SelectTrigger id="cfg-ambiente">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beta">Beta (pruebas)</SelectItem>
              <SelectItem value="produccion">Producción</SelectItem>
            </SelectContent>
          </Select>
        </PageField>

        <PageField label="Correo de copia" htmlFor="cfg-correo">
          <input
            id="cfg-correo"
            className={CLASE_INPUT}
            value={config.correoCopia ?? ''}
            onChange={(e) => cambiar({ correoCopia: e.target.value })}
            placeholder="facturacion@empresa.pe"
          />
          {errorDe('correoCopia') && (
            <PageText variant="error">{errorDe('correoCopia')}</PageText>
          )}
        </PageField>

        <PageField label="Cuenta del Banco de la Nación" htmlFor="cfg-cuenta">
          <input
            id="cfg-cuenta"
            className={CLASE_INPUT}
            value={config.cuentaBancoNacion ?? ''}
            onChange={(e) =>
              cambiar({
                cuentaBancoNacion: e.target.value.replace(/\D/g, ''),
              })
            }
            placeholder="00019123456"
          />
          <PageText variant="caption">
            Se imprime en los comprobantes con detracción (SPOT).
          </PageText>
          {errorDe('cuentaBancoNacion') && (
            <PageText variant="error">{errorDe('cuentaBancoNacion')}</PageText>
          )}
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

      <div className="flex items-center justify-end gap-2">
        {intentado && hayErrores && (
          <PageText variant="error">
            Corrija los campos marcados antes de guardar.
          </PageText>
        )}
        <Button size="sm" onClick={guardar}>
          Guardar configuración
        </Button>
      </div>
    </Page>
  );
};
