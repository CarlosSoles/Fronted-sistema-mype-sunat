/**
 * Página de configuración de Facturación Electrónica (TA-61).
 *
 * POR QUÉ HAY UN ENVOLTORIO Y NO SE RUTEA LA PESTAÑA DIRECTAMENTE
 *
 * `InvoiceSettingsTab` es un componente de presentación: recibe `ruc`,
 * `configuracion` y `series` por props y avisa con `onGuardar`. No sabe de
 * dónde vienen esos datos ni cómo se guardan, y eso es correcto: así se puede
 * montar en una prueba sin backend.
 *
 * Una ruta, en cambio, tiene que resolver esas tres cosas. Eso es lo que hace
 * este archivo: lee el RUC de la sesión, pide la configuración y las series al
 * backend que ya existen (`GET /invoices/config` y `GET /invoices/series`) y
 * presenta el resultado. Si el backend no responde, la pantalla lo dice en
 * lugar de mostrar un formulario vacío que el usuario creería que se guardó.
 */
import { useMemo } from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Page,
  PageHeader,
  PageText,
} from '@/components/ui';
import { InvoiceSettingsTab } from '../components/InvoiceSettingsTab';
import { InvoiceConfigChecklist } from '../components/InvoiceConfigChecklist';
import { useInvoiceConfig } from '../hooks/useInvoiceConfig';
import { useAuthStore } from '@/stores/authStore';
import type { ConfiguracionFe } from '../lib/invoiceSettings';

export default function InvoiceSettingsPage() {
  // El RUC sale de la empresa ACTIVA de la sesión y no de un campo del
  // formulario: la identidad fiscal no se cambia desde aquí (invalidaría los
  // comprobantes ya emitidos).
  const ruc = (useAuthStore((state) => state.activeCompany?.ruc) ?? '').trim();

  const { data, error, cargando } = useInvoiceConfig(ruc);

  const configuracion = useMemo<Partial<ConfiguracionFe>>(
    () => ({
      ruc,
      // El entorno lo decide el despliegue y el backend lo informa; el
      // formulario lo muestra pero no lo escribe (PUT /config responde 409).
      // El front solo contempla 'beta' y 'produccion', así que un entorno
      // simulado (MOCK) se presenta como 'beta': es el entorno de pruebas de
      // SUNAT y no dar a entender que se emitirá al ambiente real.
      ambiente: data?.entorno === 'PRODUCCION' ? 'produccion' : 'beta',
    }),
    [ruc, data],
  );

  return (
    <Page>
      <PageHeader
        title="Configuración de Facturación Electrónica"
        description="Entorno de SUNAT, series con correlativo propio y estado de las credenciales para emitir"
      >
        <PageText variant="caption" className="text-muted-foreground">
          {cargando ? 'Consultando configuración…' : `Empresa ${ruc || 'sin RUC en sesión'}`}
        </PageText>
      </PageHeader>

      {/*
        Si el backend no responde, se dice. Mostrar el formulario vacío haría
        creer que la empresa no tiene series configuradas, que es una
        conclusión muy distinta y llevaría a corregir algo que no está roto.
      */}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo leer la configuración</AlertTitle>
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : 'El servicio de facturación no respondió.'}{' '}
            Los valores del formulario pueden estar incompletos.
          </AlertDescription>
        </Alert>
      ) : null}

      {/*
        D1: el checklist del backend, que antes se descartaba.
        `useInvoiceConfig` ya traía `checklist` y `listo_para_emitir`; la
        pantalla solo pintaba el RUC y las series, así que el usuario no tenía
        forma de saber si SUNAT aceptaría sus comprobantes.
      */}
      {data && <InvoiceConfigChecklist config={data} />}

      <InvoiceSettingsTab
        ruc={ruc}
        configuracion={configuracion}
        series={data?.series ?? []}
      />
    </Page>
  );
}
