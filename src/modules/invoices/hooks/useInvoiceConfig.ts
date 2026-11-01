import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type { SerieFe } from '../lib/invoiceSettings';

/**
 * Configuración de Facturación Electrónica (TA-61).
 *
 * Consume los dos endpoints que ya existen en el backend desde TA-60:
 *   GET /api/v1/invoices/config  -> entorno, checklist y series
 *   GET /api/v1/invoices/series  -> series de la empresa
 *
 * `config` ya devuelve las series dentro de `series`, así que normalmente basta
 * con una llamada. El endpoint suelto se usa cuando el primero no las trae (por
 * ejemplo, si una versión del backend todavía no las incluye): así la pantalla
 * funciona contra las dos versiones en lugar de mostrar una lista vacía.
 *
 * LO QUE ESTE HOOK NO HACE: escribir. `PUT /invoices/config` responde 409 a
 * propósito, porque el entorno y las credenciales SOL viven en las variables
 * del despliegue y aceptarlas por HTTP las dejaría en el cuerpo de la petición
 * y en el log de acceso. Fingir un guardado sería peor que no ofrecerlo.
 */

/** Respuesta cruda de `GET /invoices/config`. */
export interface ConfiguracionBackend {
  entorno?: string;
  endpoint_bill_service?: string;
  endpoint_consult_service?: string;
  listo_para_emitir?: boolean;
  checklist?: Array<{
    clave: string;
    descripcion: string;
    configurado: boolean;
    obligatorio: boolean;
    detalle?: string;
  }>;
  series?: Array<{
    document_type: string;
    series: string;
    current_correlative: number;
    is_active: boolean;
  }>;
}

/** Lo que consume la pantalla, ya normalizado. */
export interface ConfiguracionFeVista {
  entorno: string;
  endpoint_bill_service: string;
  endpoint_consult_service: string;
  listo_para_emitir: boolean;
  checklist: NonNullable<ConfiguracionBackend['checklist']>;
  /** Series ya convertidas al tipo de la pantalla. */
  series: SerieFe[];
}

/**
 * Convierte las series del backend al tipo de la pantalla.
 *
 * El backend llama `current_correlative` al ÚLTIMO número usado, no al próximo:
 * por eso aquí se suma 1. Mostrar el último usado como "próximo a emitir" haría
 * que el usuario creyera que va a repetir un número ya emitido, que es el
 * defecto exacto que TA-60 corrigió en el servidor.
 */
export const aSerieFe = (fila: {
  document_type: string;
  series: string;
  current_correlative: number;
  is_active: boolean;
}): SerieFe => ({
  serie: fila.series,
  tipoComprobante: fila.document_type,
  siguienteCorrelativo: fila.current_correlative + 1,
  activa: fila.is_active,
});

export const useInvoiceConfig = (ruc: string) => {
  const consulta = useQuery({
    queryKey: ['invoices', 'config', ruc],
    queryFn: async (): Promise<ConfiguracionFeVista> => {
      const { data } = await apiClient.get<ConfiguracionBackend>(
        '/invoices/config',
      );

      const series =
        data.series && data.series.length > 0
          ? data.series
          : await apiClient
              .get<ConfiguracionBackend['series']>('/invoices/series')
              .then((respuesta) => respuesta.data ?? [])
              .catch(() => []);

      return {
        entorno: data.entorno ?? 'MOCK',
        endpoint_bill_service: data.endpoint_bill_service ?? '',
        endpoint_consult_service: data.endpoint_consult_service ?? '',
        listo_para_emitir: data.listo_para_emitir ?? false,
        checklist: data.checklist ?? [],
        series: (series ?? []).map(aSerieFe),
      };
    },
    staleTime: 1000 * 60 * 5,
    enabled: ruc !== '',
    retry: 1,
  });

  return {
    data: consulta.data,
    error: consulta.error,
    cargando: consulta.isLoading,
    recargar: consulta.refetch,
  };
};
