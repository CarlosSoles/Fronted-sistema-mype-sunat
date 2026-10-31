/**
 * Aviso de la consola fiscal del módulo M1.
 *
 * Se separa de `InvoiceList.tsx` para mantener el orquestador por debajo del
 * límite de líneas y poder cambiar el mensaje sin tocar la lógica de la vista.
 *
 * Desde TA-29 el listado se consulta al backend; lo que sigue siendo local es
 * la emisión, que aún no persiste. El aviso lo dice para no vender como real
 * lo que todavía no lo es.
 */
import { Alert, AlertDescription, AlertTitle } from '@/components/ui';
import { Info } from 'lucide-react';

/** Aviso sobre el origen de los comprobantes listados. */
export const InvoiceDemoNotice = () => (
  <Alert variant="info">
    <Info aria-hidden="true" />
    <AlertTitle>Consola fiscal · datos del backend</AlertTitle>
    <AlertDescription>
      Los comprobantes se consultan al backend con el tenant del token
      (GET /invoices). La emisión desde esta pantalla todavía se genera en el
      navegador y no persiste: al actualizar vuelve el listado real.
    </AlertDescription>
  </Alert>
);
