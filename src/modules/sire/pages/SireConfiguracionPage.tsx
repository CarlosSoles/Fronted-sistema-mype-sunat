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
 * Administra el RUC, la razón social, el nombre comercial, la dirección
 * fiscal, el estado, la condición y las series de la empresa. Las credenciales
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

  const [ruc, setRuc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [nombreComercial, setNombreComercial] = useState('');
  const [direccion, setDireccion] = useState('');
  const [estado, setEstado] = useState('');
  const [condicion, setCondicion] = useState('');
  const [seriesText, setSeriesText] = useState('');
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
    setRazonSocial(result.razonSocial);
    setNombreComercial(result.nombreComercial ?? '');
    setDireccion(result.direccion ?? '');
    setEstado(result.estado ?? '');
    setCondicion(result.condicion ?? '');
    if (result.series) setSeriesText(result.series.join(', '));
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
    const razonSocialValue = razonSocial.trim();
    const saved = await saveCompany({
      ruc: rucValue || undefined,
      razonSocial: razonSocialValue || undefined,
      nombreComercial: nombreComercial.trim() || undefined,
      direccion: direccion.trim() || undefined,
      estado: estado.trim() || undefined,
      condicion: condicion.trim() || undefined,
      series: normalizeSeries(seriesText.split(',')),
    });
    if (!saved) return;

    if (activeCompany) {
      useAuthStore.getState().setActiveCompany({
        ...activeCompany,
        ruc: rucValue || activeCompany.ruc,
        razonSocial: razonSocialValue || activeCompany.razonSocial,
      });
    }
  };

  return (
    <Page>
      <PageHeader
        title="Datos de la Empresa"
        description="Administra el RUC, la razón social, el nombre comercial, la dirección fiscal, el estado, la condición y las series de la empresa. Valida el RUC para autocompletar los datos."
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
            Decolecta para autocompletar la razón social, el nombre comercial, la dirección, el
            estado y la condición.
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

              <PageField label="Razón Social" htmlFor="sire-company-name">
                <Input
                  id="sire-company-name"
                  aria-label="Razón Social"
                  autoComplete="off"
                  maxLength={200}
                  placeholder="Razón social de la empresa"
                  value={razonSocial}
                  disabled={isSavingCompany}
                  onChange={(event) => updateField(setRazonSocial)(event.target.value)}
                />
              </PageField>

              <PageField label="Nombre Comercial" htmlFor="sire-company-commercial-name">
                <Input
                  id="sire-company-commercial-name"
                  aria-label="Nombre Comercial"
                  autoComplete="off"
                  maxLength={200}
                  placeholder="Nombre comercial de la empresa"
                  value={nombreComercial}
                  disabled={isSavingCompany}
                  onChange={(event) => updateField(setNombreComercial)(event.target.value)}
                />
              </PageField>

              <PageField label="Dirección Fiscal" htmlFor="sire-company-address">
                <Input
                  id="sire-company-address"
                  aria-label="Dirección Fiscal"
                  autoComplete="off"
                  maxLength={300}
                  placeholder="Dirección fiscal de la empresa"
                  value={direccion}
                  disabled={isSavingCompany}
                  onChange={(event) => updateField(setDireccion)(event.target.value)}
                />
              </PageField>

              <PageField label="Estado SUNAT" htmlFor="sire-company-status">
                <Input
                  id="sire-company-status"
                  aria-label="Estado SUNAT"
                  autoComplete="off"
                  maxLength={100}
                  placeholder="Estado del contribuyente"
                  className="bg-muted"
                  readOnly
                  value={estado}
                />
              </PageField>

              <PageField label="Condición" htmlFor="sire-company-condition">
                <Input
                  id="sire-company-condition"
                  aria-label="Condición"
                  autoComplete="off"
                  maxLength={100}
                  placeholder="Condición de domicilio"
                  className="bg-muted"
                  readOnly
                  value={condicion}
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
                    onChange={(event) => updateField(setSeriesText)(event.target.value)}
                  />
                </PageField>
                <PageText variant="caption" className="mt-1 text-muted-foreground">
                  Escribe las series separadas por comas. Ejemplo: F001, B001.
                </PageText>
              </div>
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
