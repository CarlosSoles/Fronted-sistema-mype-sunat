import { Page, PageHeader } from '@/components/ui';
import { DatosEmpresaForm } from '@/modules/company/components/DatosEmpresaForm';

/**
 * Pantalla histórica de configuración de la empresa.
 *
 * El formulario se comparte con “Credenciales de Empresa” para que los datos
 * fiscales vivan en el mismo apartado global. La ruta se conserva para no
 * romper enlaces existentes.
 */
export default function SireConfiguracionPage() {
  return (
    <Page>
      <PageHeader
        title="Datos de la Empresa"
        description="Información fiscal de la empresa activa. También está disponible dentro de Credenciales de Empresa."
      />
      <DatosEmpresaForm />
    </Page>
  );
}
