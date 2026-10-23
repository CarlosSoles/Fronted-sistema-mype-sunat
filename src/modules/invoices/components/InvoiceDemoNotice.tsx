/**
 * Aviso de la consola fiscal del módulo M1.
 *
 * Se separa de `InvoiceList.tsx` para mantener el orquestador por debajo del
 * límite de líneas y poder cambiar el mensaje sin tocar la lógica de la vista.
 *
 * El texto presenta el M1 como lo que es: la consola fiscal del Sprint 1, con
 * el motor tributario real (UBL 2.1) y una semilla de comprobantes; la
 * persistencia contra el backend está planificada para el Sprint 2. Redactado
 * así deja de leerse como "datos falsos" y pasa a ser el alcance declarado.
 */
import { Alert, AlertDescription, AlertTitle } from '@/components/ui';
import { Info } from 'lucide-react';

/** Aviso sobre el origen de los comprobantes listados. */
export const InvoiceDemoNotice = () => (
  <Alert variant="info">
    <Info aria-hidden="true" />
    <AlertTitle>Consola fiscal · Sprint 1</AlertTitle>
    <AlertDescription>
      Los comprobantes del periodo se cargan con una semilla de demostración
      sobre el motor tributario UBL 2.1 del módulo (IGV, detracción, retención y
      CDR). La persistencia contra el backend entra en el Sprint 2.
    </AlertDescription>
  </Alert>
);
