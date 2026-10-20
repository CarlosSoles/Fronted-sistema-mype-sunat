/**
 * Aviso de datos de demostración de la consola fiscal M1.
 *
 * Se separa de `InvoiceList.tsx` para mantener el orquestador por debajo del
 * límite de líneas.
 */
import { Alert, AlertDescription, AlertTitle } from '@/components/ui';
import { Info } from 'lucide-react';

/** Aviso sobre el origen demostrativo de los comprobantes listados. */
export const InvoiceDemoNotice = () => (
  <Alert variant="info">
    <Info aria-hidden="true" />
    <AlertTitle>Datos de demostración</AlertTitle>
    <AlertDescription>
      La vista se muestra con comprobantes de ejemplo del periodo. Los montos
      de IGV, detracción y retención se calculan con el motor tributario del
      módulo.
    </AlertDescription>
  </Alert>
);
