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
import { CheckCircle2, Eye, EyeOff, LoaderCircle, Pencil, Save, ShieldCheck } from 'lucide-react';
import { useSireConfiguracion } from '../hooks/useSireConfiguracion';
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
    configured,
    error,
    saveError,
    successMessage,
    save,
    resetMessages,
  } = useSireConfiguracion();

  const [isEditing, setIsEditing] = useState(false);
  const [showSolPassword, setShowSolPassword] = useState(false);
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
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
      setShowSolPassword(false);
      setIsEditing(false);
    }
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

      {!isLoading && !error && configured && !isEditing && (
        <div className="space-y-4">
          <Alert>
            <AlertTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
              Credenciales ya configuradas
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

              {validationError && <PageText variant="error">{validationError}</PageText>}
              {saveError && (
                <Alert variant="destructive">
                  <AlertTitle>No se pudieron guardar las credenciales</AlertTitle>
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isSaving} className="gap-2">
                  {isSaving ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Save className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isSaving ? 'Guardando…' : 'Guardar Credenciales'}
                </Button>
                {configured && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSaving}
                    onClick={() => {
                      setIsEditing(false);
                      setValues(EMPTY_FORM);
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
