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
import { Building2, CheckCircle2, LoaderCircle, Save, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useSireConfiguracion } from '../hooks/useSireConfiguracion';
import { getRucFeedback } from '../validators/sireSchema';

/**
 * Pantalla de datos globales de la empresa para SIRE.
 *
 * Solo administra el RUC, el nombre, la dirección, el estado y la condición.
 * Las credenciales SIRE/SUNAT se configuran en la pantalla de credenciales.
 */
export default function SireConfiguracionPage() {
  const {
    isSavingCompany,
    isValidatingRuc,
    companyError,
    rucError,
    companySuccessMessage,
    saveCompany,
    validateRuc,
    resetMessages,
  } = useSireConfiguracion();

  const activeCompany = useAuthStore((state) => state.activeCompany);

  const [ruc, setRuc] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [direccion, setDireccion] = useState('');
  const [estado, setEstado] = useState('');
  const [condicion, setCondicion] = useState('');
  const [rucValidated, setRucValidated] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const updateRuc = (value: string) => {
    setRuc(value.replace(/\D/g, '').slice(0, 11));
    setRucValidated(false);
    setValidationError(null);
    resetMessages();
  };

  const updateField =
    (setter: (value: string) => void) =>
    (value: string) => {
      setter(value);
      setValidationError(null);
      resetMessages();
    };

  const handleValidateRuc = async () => {
    const feedback = getRucFeedback(ruc);
    if (feedback) {
      setValidationError(feedback);
      return;
    }

    setValidationError(null);
    setRucValidated(false);
    resetMessages();
    const result = await validateRuc(ruc);
    if (!result) return;

    setRuc(result.ruc);
    setCompanyName(result.razonSocial);
    setDireccion(result.direccion ?? '');
    setEstado(result.estado ?? '');
    setCondicion(result.condicion ?? '');
    setRucValidated(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const rucValue = ruc.trim();
    const feedback = rucValue ? getRucFeedback(rucValue) : null;
    if (feedback) {
      setValidationError(feedback);
      return;
    }

    setValidationError(null);
    const razonSocial = companyName.trim();
    const saved = await saveCompany({
      ruc: rucValue || undefined,
      razonSocial: razonSocial || undefined,
      direccion: direccion.trim() || undefined,
      estado: estado.trim() || undefined,
      condicion: condicion.trim() || undefined,
    });
    if (!saved) return;

    if (activeCompany) {
      useAuthStore.getState().setActiveCompany({
        ...activeCompany,
        ruc: rucValue || activeCompany.ruc,
        razonSocial: razonSocial || activeCompany.razonSocial,
      });
    }
  };

  return (
    <Page>
      <PageHeader
        title="Configuración SUNAT"
        description="Administra el RUC, el nombre, la dirección, el estado y la condición de la empresa. Valida el RUC contra Decolecta para autocompletar los datos."
      />

      {companySuccessMessage && (
        <Alert>
          <AlertTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
            {companySuccessMessage}
          </AlertTitle>
        </Alert>
      )}

      {companyError && (
        <Alert variant="destructive">
          <AlertTitle>No se pudieron guardar los datos de la empresa</AlertTitle>
          <AlertDescription>{companyError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
            Datos de la Empresa
          </CardTitle>
          <CardDescription>
            Actualiza la información global de la empresa activa. El RUC se puede validar contra
            Decolecta para autocompletar el nombre, la dirección, el estado y la condición.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
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
                      placeholder="RUC de la empresa"
                      className="pr-10"
                      value={ruc}
                      disabled={isSavingCompany || isValidatingRuc}
                      onChange={(event) => updateRuc(event.target.value)}
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
                    disabled={isValidatingRuc || isSavingCompany}
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
                    RUC validado con Decolecta. Datos autocompletados.
                  </PageText>
                )}
                {validationError && <PageText variant="error">{validationError}</PageText>}
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
                  disabled={isSavingCompany}
                  onChange={(event) => updateField(setCompanyName)(event.target.value)}
                />
              </PageField>

              <div className="md:col-span-2">
                <PageField label="Dirección" htmlFor="sire-company-address">
                  <Input
                    id="sire-company-address"
                    aria-label="Dirección"
                    autoComplete="off"
                    maxLength={300}
                    placeholder="Dirección fiscal de la empresa"
                    value={direccion}
                    disabled={isSavingCompany}
                    onChange={(event) => updateField(setDireccion)(event.target.value)}
                  />
                </PageField>
              </div>

              <PageField label="Estado" htmlFor="sire-company-status">
                <Input
                  id="sire-company-status"
                  aria-label="Estado"
                  autoComplete="off"
                  maxLength={100}
                  placeholder="Estado del contribuyente"
                  value={estado}
                  disabled={isSavingCompany}
                  onChange={(event) => updateField(setEstado)(event.target.value)}
                />
              </PageField>

              <PageField label="Condición" htmlFor="sire-company-condition">
                <Input
                  id="sire-company-condition"
                  aria-label="Condición"
                  autoComplete="off"
                  maxLength={100}
                  placeholder="Condición de domicilio"
                  value={condicion}
                  disabled={isSavingCompany}
                  onChange={(event) => updateField(setCondicion)(event.target.value)}
                />
              </PageField>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                disabled={isSavingCompany || isValidatingRuc}
                className="gap-2"
              >
                {isSavingCompany ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                {isSavingCompany ? 'Guardando…' : 'Guardar Datos de la Empresa'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Page>
  );
}
