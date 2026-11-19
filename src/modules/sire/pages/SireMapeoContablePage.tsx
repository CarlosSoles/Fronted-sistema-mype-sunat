import type { FormEvent } from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Page,
  PageHeader,
  PageText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { CheckCircle2, LoaderCircle, Save, TableProperties } from 'lucide-react';
import { EmpresaSelector } from '@/modules/company/components/EmpresaSelector';
import { useEmpresasAdmin } from '@/modules/company/hooks/useEmpresasAdmin';
import { useSireCredentials } from '../hooks/useSireCredentials';
import { useSireMapeoContable } from '../hooks/useSireMapeoContable';
import { SIRE_MAPEO_TIPOS, type SireMapeoTipoOperacion } from '../types/sire.types';
import { useAuthStore } from '@/stores/authStore';

const TIPO_LABELS: Record<SireMapeoTipoOperacion, string> = {
  VENTAS: 'VENTAS',
  COMPRAS: 'COMPRAS',
  IGV_VENTAS: 'IGV VENTAS',
  IGV_COMPRAS: 'IGV COMPRAS',
  BASE: 'BASE',
};

/**
 * Pantalla de Mapeo Contable SIRE.
 *
 * Un ADMIN puede elegir la empresa (Multi-RUC). Las cuentas se cargan del
 * catálogo PCGE real y el mapeo se guarda completo para la empresa elegida.
 */
export default function SireMapeoContablePage() {
  const {
    isAdmin,
    empresas,
    isLoading: isLoadingEmpresas,
    error: empresasError,
    selectedCompanyId,
    setSelectedCompanyId,
  } = useEmpresasAdmin();
  const activeCompanyId = useAuthStore((state) => state.activeCompany?.tenantId);
  const companyId = selectedCompanyId || activeCompanyId || undefined;

  return (
    <Page>
      <PageHeader
        title="Mapeo Contable SIRE"
        description="Asigna cada operación SIRE a una cuenta real del Plan de Cuentas (PCGE). Los cambios reemplazan el mapeo completo de la empresa."
      />

      {isAdmin && (
        <EmpresaSelector
          empresas={empresas}
          value={selectedCompanyId}
          isLoading={isLoadingEmpresas}
          error={empresasError}
          onChange={setSelectedCompanyId}
        />
      )}

      <MapeoContableContent key={companyId ?? 'session'} companyId={companyId} />
    </Page>
  );
}

const MapeoContableContent = ({ companyId }: { companyId?: string }) => {
  const {
    isLoading,
    isSaving,
    values,
    accounts,
    isLoadingAccounts,
    accountsError,
    error,
    saveError,
    successMessage,
    setCuenta,
    save,
    resetMessages,
  } = useSireMapeoContable(companyId);
  const {
    isLoading: isLoadingStatus,
    configured,
    error: statusError,
  } = useSireCredentials(companyId);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await save();
  };

  const cargando = isLoading || isLoadingAccounts;

  return (
    <>
      {!isLoadingStatus && !statusError && (
        <PageText
          variant="caption"
          className={configured ? 'text-green-600' : 'text-muted-foreground'}
        >
          {configured
            ? 'Credenciales SIRE configuradas para la empresa seleccionada.'
            : 'La empresa seleccionada aún no tiene credenciales SIRE completas.'}
        </PageText>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo cargar el mapeo contable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {accountsError && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo cargar el Plan de Cuentas (PCGE)</AlertTitle>
          <AlertDescription>{accountsError}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert>
          <AlertTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
            {successMessage}
          </AlertTitle>
        </Alert>
      )}

      <Card flush>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TableProperties className="h-4 w-4 text-primary" aria-hidden="true" />
            Cuentas contables por operación
          </CardTitle>
          <CardDescription>
            Selecciona la cuenta del PCGE que corresponde a cada operación. Solo se muestran
            cuentas activas del Plan de Cuentas.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de Operación</TableHead>
                  <TableHead>Cuenta Contable (PCGE)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargando ? (
                  <TableRow>
                    <TableCell colSpan={2} align="center">
                      <span className="inline-flex items-center gap-2">
                        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                        Cargando cuentas y mapeo contable…
                      </span>
                    </TableCell>
                  </TableRow>
                ) : (
                  SIRE_MAPEO_TIPOS.map((tipo) => {
                    const seleccionada = values[tipo];
                    const existeEnCatalogo = accounts.some((account) => account.code === seleccionada);
                    return (
                      <TableRow key={tipo}>
                        <TableCell className="font-medium">{TIPO_LABELS[tipo]}</TableCell>
                        <TableCell>
                          <select
                            aria-label={`Cuenta contable de ${TIPO_LABELS[tipo]}`}
                            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs"
                            value={seleccionada}
                            disabled={isSaving}
                            onChange={(event) => {
                              resetMessages();
                              setCuenta(tipo, event.target.value);
                            }}
                          >
                            <option value="">Selecciona una cuenta…</option>
                            {seleccionada && !existeEnCatalogo && (
                              <option value={seleccionada}>{seleccionada} · Cuenta guardada</option>
                            )}
                            {accounts.map((account) => (
                              <option key={account.code} value={account.code}>
                                {account.code} - {account.name}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {saveError && <PageText variant="error">{saveError}</PageText>}

            <div className="flex flex-wrap items-center gap-3 px-4">
              <Button type="submit" disabled={cargando || isSaving} className="gap-2">
                {isSaving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                {isSaving ? 'Guardando…' : 'Guardar Mapeo'}
              </Button>
              <PageText variant="caption" className="text-muted-foreground">
                Se guardan las cinco operaciones a la vez.
              </PageText>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
};
