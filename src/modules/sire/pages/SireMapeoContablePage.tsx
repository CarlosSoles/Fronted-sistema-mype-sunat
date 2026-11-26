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
    globalMappings,
    isLoadingGlobalMappings,
    globalMappingsError,
    inheritedAccounts,
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

  const accountNames = new Map(accounts.map((account) => [account.code, account.name]));
  const globalRelevant = globalMappings.filter((mapping) =>
    ['VENTA', 'COMPRA'].includes(mapping.processCode.toUpperCase()),
  );
  const cargando = isLoading || isLoadingAccounts || isLoadingGlobalMappings;

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
            Cuentas Globales (Heredadas)
          </CardTitle>
          <CardDescription>
            Cuentas del mapeo contable global de la empresa para ventas y compras. SIRE las hereda
            mientras no definas una sobrescritura propia.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {isLoadingGlobalMappings ? (
            <PageText variant="caption" className="flex items-center gap-2 px-4 text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              Cargando cuentas globales…
            </PageText>
          ) : globalMappingsError ? (
            <Alert variant="destructive" className="mx-4">
              <AlertTitle>No se pudo cargar el mapeo global</AlertTitle>
              <AlertDescription>{globalMappingsError}</AlertDescription>
            </Alert>
          ) : globalRelevant.length === 0 ? (
            <PageText variant="caption" className="px-4 text-muted-foreground">
              El backend no devolvió cuentas globales para ventas o compras.
            </PageText>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proceso</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Origen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {globalRelevant.map((mapping) => (
                  <TableRow key={`${mapping.processCode}-${mapping.roleCode}`}>
                    <TableCell className="font-medium">{mapping.processCode}</TableCell>
                    <TableCell>{mapping.roleCode}</TableCell>
                    <TableCell className="font-mono">
                      {accountNames.get(mapping.accountCode)
                        ? `${mapping.accountCode} - ${accountNames.get(mapping.accountCode)}`
                        : mapping.accountCode}
                    </TableCell>
                    <TableCell>{mapping.description || '—'}</TableCell>
                    <TableCell>
                      {mapping.isCustom ? (
                        <span className="text-xs font-medium text-primary">Personalizada</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Global</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card flush>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TableProperties className="h-4 w-4 text-primary" aria-hidden="true" />
            Sobrescrituras SIRE por operación
          </CardTitle>
          <CardDescription>
            Selecciona una cuenta solo si quieres reemplazar la global para SIRE. Las operaciones
            vacías heredan la cuenta global.
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
                    const heredadas = inheritedAccounts[tipo];
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
                            <option value="">
                              {heredadas.length > 0
                                ? `Heredar global: ${heredadas
                                    .map((cuenta) => `${cuenta.code} - ${cuenta.name}`)
                                    .join(' / ')}`
                                : 'Selecciona una cuenta…'}
                            </option>
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
                Solo se guardan las cuentas que sobrescribas; las vacías heredan la cuenta global.
              </PageText>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
};
