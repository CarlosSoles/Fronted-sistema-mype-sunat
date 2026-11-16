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
import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  Pencil,
  Save,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useSireConfiguracion } from '../hooks/useSireConfiguracion';
import { normalizeSeries } from '../services/empresaApi';
import {
  getClientIdFeedback,
  getClientSecretFeedback,
  getSolPasswordFeedback,
  getSolUserFeedback,
} from '../validators/sireSchema';

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
 * Pantalla de Configuración SUNAT (SIRE).
 *
 * Las credenciales se guardan una sola vez y cifradas en el backend: la
 * pantalla consulta `GET /sire/configuracion/status` al montar y, si la
 * empresa ya está configurada, muestra "Credenciales ya configuradas" y un botón "Editar".
 */
export default function SireConfiguracionPage() {
  const {
    isLoading,
    isSaving,
    isSavingCompany,
    isValidatingRuc,
    configured,
    error,
    saveError,
    companyError,
    rucError,
    successMessage,
    companySuccessMessage,
    save,
    saveCompany,
    validateRuc,
    resetMessages,
  } = useSireConfiguracion();

  const activeCompany = useAuthStore((state) => state.activeCompany);
  const sessionRuc = activeCompany?.ruc ?? '';

  const [isEditing, setIsEditing] = useState(false);
  const [showSolPassword, setShowSolPassword] = useState(false);
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [companyNameInput, setCompanyNameInput] = useState<string | null>(null);
  const [rucInput, setRucInput] = useState<string | null>(null);
  const [rucValidated, setRucValidated] = useState(false);
  const [seriesText, setSeriesText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const companyName = companyNameInput ?? activeCompany?.razonSocial ?? '';
  const rucValue = rucInput ?? sessionRuc;

  const updateValue = (field: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setValidationError(null);
    resetMessages();
  };

  const updateCompanyName = (value: string) => {
    setCompanyNameInput(value);
    setValidationError(null);
    resetMessages();
  };

  const updateSeries = (value: string) => {
    setSeriesText(value);
    setValidationError(null);
    resetMessages();
  };

  const updateRuc = (value: string) => {
    setRucInput(value);
    setRucValidated(false);
    setValidationError(null);
    resetMessages();
  };

  const handleValidateRuc = async () => {
    setValidationError(null);
    const result = await validateRuc(rucValue);
    if (!result) return;
    setRucInput(result.ruc);
    setRucValidated(true);
    setCompanyNameInput(result.razonSocial);
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

    if (!saved) return;

    const razonSocial = companyName.trim();
    const series = normalizeSeries(seriesText.split(','));
    if (rucValue || razonSocial || series.length > 0) {
      const companySaved = await saveCompany({
        ruc: rucValue.trim() || undefined,
        razonSocial: razonSocial || undefined,
        series,
      });
      if (companySaved && activeCompany && razonSocial) {
        useAuthStore.getState().setActiveCompany({ ...activeCompany, razonSocial });
      }
    }

    setValues(EMPTY_FORM);
    setShowSolPassword(false);
    setIsEditing(false);
  };

  const showForm = isEditing || !configured;

  return (
    <Page>
      <PageHeader
        title="Configuración SUNAT"
        description="Guarda las credenciales de la API SIRE de SUNAT y de la clave SOL de la empresa. Se almacenan cifradas y el backend las usa automáticamente en cada consulta a SUNAT."
      />

      {isLoading && (
        <Card>
          <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            Consultando el estado de la configuración…
          </CardContent>
        </Card>
      )}

      {!isLoading && error && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo consultar la configuración SIRE</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
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

      {companySuccessMessage && (
        <Alert>
          <AlertTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
            {companySuccessMessage}
          </AlertTitle>
        </Alert>
      )}

      {!isLoading && !error && configured && !isEditing && (
        <div className="space-y-4">
          <Alert>
            <AlertTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
              <span>Credenciales ya configuradas</span>
              <span className="text-xs font-normal text-muted-foreground">(Ya configurado)</span>
            </AlertTitle>
            <AlertDescription>
              La empresa ya tiene guardadas sus credenciales de SUNAT y su clave SOL. No hace falta
              enviarlas en cada consulta: el backend las resuelve de forma automática.
            </AlertDescription>
          </Alert>

          <div>
            <Button type="button" onClick={() => setIsEditing(true)} className="gap-2">
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Editar
            </Button>
          </div>
        </div>
      )}

      {showForm && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              Credenciales SIRE/SUNAT
            </CardTitle>
            <CardDescription>
              Ingresa el Client ID, Client Secret, Usuario SOL y Clave SOL para conectar con SUNAT.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <PageField label="Client ID" htmlFor="sire-client-id">
                  <Input
                    id="sire-client-id"
                    aria-label="Client ID"
                    autoComplete="off"
                    maxLength={200}
                    placeholder="Client ID de la aplicación SIRE"
                    value={values.clientId}
                    disabled={isSaving}
                    onChange={(event) => updateValue('clientId', event.target.value)}
                  />
                </PageField>

                <PageField label="Client Secret" htmlFor="sire-client-secret">
                  <Input
                    id="sire-client-secret"
                    aria-label="Client Secret"
                    autoComplete="off"
                    type="password"
                    maxLength={400}
                    placeholder="Client Secret de la aplicación SIRE"
                    value={values.clientSecret}
                    disabled={isSaving}
                    onChange={(event) => updateValue('clientSecret', event.target.value)}
                  />
                </PageField>

                <PageField label="Usuario SOL" htmlFor="sire-sol-user">
                  <Input
                    id="sire-sol-user"
                    aria-label="Usuario SOL"
                    autoComplete="off"
                    maxLength={50}
                    placeholder="MODDATOS"
                    value={values.solUser}
                    disabled={isSaving}
                    onChange={(event) => updateValue('solUser', event.target.value)}
                  />
                </PageField>

                <PageField label="Clave SOL" htmlFor="sire-sol-password">
                  <div className="relative">
                    <Input
                      id="sire-sol-password"
                      aria-label="Clave SOL"
                      autoComplete="new-password"
                      type={showSolPassword ? 'text' : 'password'}
                      maxLength={128}
                      placeholder="Clave de la clave SOL"
                      className="pr-10"
                      value={values.solPassword}
                      disabled={isSaving}
                      onChange={(event) => updateValue('solPassword', event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSolPassword((current) => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showSolPassword ? 'Ocultar' : 'Mostrar'}
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

              <div className="space-y-4 border-t pt-4">
                <div className="space-y-1">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
                    Datos de la Empresa
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Estos datos se guardan junto con las credenciales y se usan como variables
                    globales de la empresa.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <PageField label="RUC de la Empresa" htmlFor="sire-company-ruc">
                    <div className="flex items-start gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="sire-company-ruc"
                          aria-label="RUC de la Empresa"
                          autoComplete="off"
                          inputMode="numeric"
                          maxLength={11}
                          placeholder="RUC de la empresa activa"
                          className={rucValidated ? 'bg-muted pr-10' : 'pr-10'}
                          readOnly={rucValidated}
                          value={rucValue}
                          disabled={isSaving || isSavingCompany || isValidatingRuc}
                          onChange={(event) =>
                            updateRuc(event.target.value.replace(/\D/g, '').slice(0, 11))
                          }
                        />
                        {isValidatingRuc && (
                          <LoaderCircle
                            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0 gap-2"
                        disabled={isValidatingRuc || isSaving || isSavingCompany || rucValidated}
                        onClick={() => void handleValidateRuc()}
                      >
                        {isValidatingRuc ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Search className="h-4 w-4" aria-hidden="true" />
                        )}
                        {isValidatingRuc ? 'Validando…' : 'Validar'}
                      </Button>
                    </div>
                    {rucValidated && (
                      <PageText variant="caption" className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        RUC validado con Decolecta. Nombre autocompletado.
                      </PageText>
                    )}
                    {rucError && <PageText variant="error">{rucError}</PageText>}
                  </PageField>

                  <PageField label="Nombre de la Empresa" htmlFor="sire-company-name">
                    <Input
                      id="sire-company-name"
                      aria-label="Nombre de la Empresa"
                      autoComplete="off"
                      maxLength={200}
                      placeholder="Razón social de la empresa"
                      value={companyName}
                      disabled={isSaving || isSavingCompany}
                      onChange={(event) => updateCompanyName(event.target.value)}
                    />
                  </PageField>

                  <div className="md:col-span-2">
                    <PageField label="Series" htmlFor="sire-company-series">
                      <Input
                        id="sire-company-series"
                        aria-label="Series"
                        autoComplete="off"
                        placeholder="F001, B001"
                        value={seriesText}
                        disabled={isSaving || isSavingCompany}
                        onChange={(event) => updateSeries(event.target.value)}
                      />
                    </PageField>
                    <PageText variant="caption" className="mt-1 text-muted-foreground">
                      Escribe las series separadas por comas. Ejemplo: F001, B001.
                    </PageText>
                  </div>
                </div>
              </div>

              {validationError && <PageText variant="error">{validationError}</PageText>}
              {saveError && (
                <Alert variant="destructive">
                  <AlertTitle>No se pudieron guardar las credenciales</AlertTitle>
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              )}
              {companyError && (
                <Alert variant="destructive">
                  <AlertTitle>No se pudieron guardar los datos de la empresa</AlertTitle>
                  <AlertDescription>{companyError}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isSaving || isSavingCompany} className="gap-2">
                  {isSaving || isSavingCompany ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Save className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isSaving || isSavingCompany ? 'Guardando…' : 'Guardar Credenciales'}
                </Button>
                {configured && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSaving || isSavingCompany}
                    onClick={() => {
                      setIsEditing(false);
                      setValues(EMPTY_FORM);
                      setSeriesText('');
                      setCompanyNameInput(null);
                      setRucInput(null);
                      setRucValidated(false);
                      setValidationError(null);
                      resetMessages();
                    }}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </Page>
  );
}
