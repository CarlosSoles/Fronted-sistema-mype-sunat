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
import { normalizeSeries } from '../services/empresaApi';
import { getRucFeedback } from '../validators/sireSchema';

/**
 * Pantalla de datos globales de la empresa para SIRE.
 *
 * Solo administra el RUC, la razón social y las series. Las credenciales
 * SIRE/SUNAT se configuran en la pantalla de credenciales.
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
  const sessionRuc = activeCompany?.ruc ?? '';

  const [companyNameInput, setCompanyNameInput] = useState<string | null>(null);
  const [rucInput, setRucInput] = useState<string | null>(null);
  const [rucValidated, setRucValidated] = useState(false);
  const [seriesText, setSeriesText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const companyName = companyNameInput ?? activeCompany?.razonSocial ?? '';
  const rucValue = rucInput ?? sessionRuc;

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
    const feedback = getRucFeedback(rucValue);
    if (feedback) {
      setValidationError(feedback);
      return;
    }

    setValidationError(null);
    const result = await validateRuc(rucValue);
    if (!result) return;

    setRucInput(result.ruc);
    setRucValidated(true);
    setCompanyNameInput(result.razonSocial);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const feedback = rucValue.trim() ? getRucFeedback(rucValue) : null;
    if (feedback) {
      setValidationError(feedback);
      return;
    }

    setValidationError(null);
    const ruc = rucValue.trim();
    const razonSocial = companyName.trim();
    const series = normalizeSeries(seriesText.split(','));

    const saved = await saveCompany({
      ruc: ruc || undefined,
      razonSocial: razonSocial || undefined,
      series,
    });
    if (!saved) return;

    if (activeCompany) {
      useAuthStore.getState().setActiveCompany({
        ...activeCompany,
        ruc: ruc || activeCompany.ruc,
        razonSocial: razonSocial || activeCompany.razonSocial,
      });
    }
  };

  return (
    <Page>
      <PageHeader
        title="Configuración SUNAT"
        description="Administra el RUC, la razón social y las series de la empresa. Estos datos se usan como variables globales en las operaciones SIRE."
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
            Decolecta para autocompletar la razón social.
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
                      value={rucValue}
                      disabled={isSavingCompany || isValidatingRuc}
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
                    RUC validado con Decolecta. Nombre autocompletado.
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
                    disabled={isSavingCompany}
                    onChange={(event) => updateSeries(event.target.value)}
                  />
                </PageField>
                <PageText variant="caption" className="mt-1 text-muted-foreground">
                  Escribe las series separadas por comas. Ejemplo: F001, B001.
                </PageText>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isSavingCompany} className="gap-2">
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
