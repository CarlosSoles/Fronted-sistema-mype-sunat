import { useState, type FormEvent } from 'react';
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
  Input,
  Page,
  PageField,
  PageHeader,
  PageText,
} from '@/components/ui';
import { CheckCircle2, Eye, EyeOff, KeyRound, LoaderCircle, Save } from 'lucide-react';
import { DatosEmpresaForm } from '@/modules/company/components/DatosEmpresaForm';
import { EmpresaSelector } from '@/modules/company/components/EmpresaSelector';
import { useEmpresasAdmin } from '@/modules/company/hooks/useEmpresasAdmin';
import { useSireCredentials } from '@/modules/sire/hooks/useSireCredentials';
import {
  getClientIdFeedback,
  getClientSecretFeedback,
  getSolPasswordFeedback,
  getSolUserFeedback,
} from '@/modules/sire/validators/sireSchema';
import { useAuthStore } from '@/stores/authStore';

interface FormValues {
  clientId: string;
  clientSecret: string;
  solUser: string;
  solPassword: string;
}

const EMPTY_FORM: FormValues = {
  clientId: '',
  clientSecret: '',
  solUser: '',
  solPassword: '',
};

/**
 * Credenciales globales de la empresa para SUNAT.
 *
 * Un ADMIN puede elegir la empresa (Multi-RUC); el estado y el guardado se
 * resuelven con `companyId`. El backend cifra las credenciales y las usa en
 * SIRE y en las consultas tributarias.
 */
export default function CredencialesEmpresaPage() {
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
        title="Credenciales de Empresa"
        description="Registra los accesos globales a SUNAT de la empresa. El backend los cifra y los usa automáticamente en SIRE y en las consultas tributarias."
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

      <CredencialesEmpresaContent
        key={companyId ?? 'session'}
        companyId={companyId}
      />

      <DatosEmpresaForm key={`datos-${companyId ?? 'session'}`} companyId={companyId} />
    </Page>
  );
}

const CredencialesEmpresaContent = ({ companyId }: { companyId?: string }) => {
  const {
    isLoading,
    isSaving,
    configured,
    error,
    saveError,
    successMessage,
    save,
    resetMessages,
  } = useSireCredentials(companyId);

  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showSolPassword, setShowSolPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const updateValue = (field: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setValidationError(null);
    resetMessages();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const feedback =
      getClientIdFeedback(values.clientId) ??
      getClientSecretFeedback(values.clientSecret) ??
      getSolUserFeedback(values.solUser) ??
      getSolPasswordFeedback(values.solPassword);

    if (feedback) {
      setValidationError(feedback);
      return;
    }

    setValidationError(null);
    const saved = await save({
      clientId: values.clientId.trim(),
      clientSecret: values.clientSecret,
      solUser: values.solUser.trim(),
      solPassword: values.solPassword,
    });

    if (saved) {
      setValues(EMPTY_FORM);
      setShowClientSecret(false);
      setShowSolPassword(false);
    }
  };

  return (
    <>
      {isLoading && (
        <PageText variant="caption" className="flex items-center gap-2 text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          Consultando el estado de las credenciales…
        </PageText>
      )}

      {!isLoading && error && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo consultar la configuración</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && configured && !successMessage && (
        <Alert>
          <AlertTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
            Credenciales ya configuradas
          </AlertTitle>
          <AlertDescription>
            La empresa ya tiene guardados sus accesos a SUNAT. Puedes reemplazarlos ingresando los
            nuevos valores y guardando.
          </AlertDescription>
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

      {saveError && (
        <Alert variant="destructive">
          <AlertTitle>No se pudieron guardar las credenciales</AlertTitle>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
            Credenciales SUNAT
          </CardTitle>
          <CardDescription>
            Ingresa el Client ID, Client Secret, Usuario SOL y Clave SOL de la empresa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <PageField label="Client ID" htmlFor="credenciales-empresa-client-id">
                <Input
                  id="credenciales-empresa-client-id"
                  aria-label="Client ID"
                  autoComplete="off"
                  maxLength={200}
                  placeholder="Client ID de la aplicación SUNAT"
                  value={values.clientId}
                  disabled={isSaving}
                  onChange={(event) => updateValue('clientId', event.target.value)}
                />
              </PageField>

              <PageField label="Client Secret" htmlFor="credenciales-empresa-client-secret">
                <div className="relative">
                  <Input
                    id="credenciales-empresa-client-secret"
                    aria-label="Client Secret"
                    autoComplete="off"
                    type={showClientSecret ? 'text' : 'password'}
                    maxLength={400}
                    placeholder="Client Secret de la aplicación SUNAT"
                    className="pr-10"
                    value={values.clientSecret}
                    disabled={isSaving}
                    onChange={(event) => updateValue('clientSecret', event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowClientSecret((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showClientSecret ? 'Ocultar Client Secret' : 'Mostrar Client Secret'}
                  >
                    {showClientSecret ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </PageField>

              <PageField label="Usuario SOL" htmlFor="credenciales-empresa-sol-user">
                <Input
                  id="credenciales-empresa-sol-user"
                  aria-label="Usuario SOL"
                  autoComplete="off"
                  maxLength={50}
                  placeholder="MODDATOS"
                  value={values.solUser}
                  disabled={isSaving}
                  onChange={(event) => updateValue('solUser', event.target.value)}
                />
              </PageField>

              <PageField label="Clave SOL" htmlFor="credenciales-empresa-sol-password">
                <div className="relative">
                  <Input
                    id="credenciales-empresa-sol-password"
                    aria-label="Clave SOL"
                    autoComplete="new-password"
                    type={showSolPassword ? 'text' : 'password'}
                    maxLength={128}
                    placeholder="Clave SOL de la empresa"
                    className="pr-10"
                    value={values.solPassword}
                    disabled={isSaving}
                    onChange={(event) => updateValue('solPassword', event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSolPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showSolPassword ? 'Ocultar Clave SOL' : 'Mostrar Clave SOL'}
                  >
                    {showSolPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </PageField>
            </div>

            {validationError && <PageText variant="error">{validationError}</PageText>}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                {isSaving ? 'Guardando…' : 'Guardar Credenciales'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
};
