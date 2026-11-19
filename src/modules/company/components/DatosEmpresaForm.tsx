import { useEffect, useState, type FormEvent } from 'react';
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
  PageField,
  PageText,
} from '@/components/ui';
import { Building2, CheckCircle2, LoaderCircle, Save, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useSireConfiguracion } from '@/modules/sire/hooks/useSireConfiguracion';
import { normalizeSeries } from '@/modules/sire/services/empresaApi';
import { getRucFeedback } from '@/modules/sire/validators/sireSchema';

/**
 * Datos fiscales de la empresa activa.
 *
 * Se muestran junto con las credenciales globales. El RUC se valida contra
 * Decolecta para autocompletar los datos; el guardado usa el contrato real del
 * backend (`businessName`/`tradeName`) sin enviar el RUC, que sale de la sesión.
 */
export const DatosEmpresaForm = () => {
  const {
    isLoadingCompany,
    isSavingCompany,
    isValidatingRuc,
    companyLoadError,
    companyError,
    rucError,
    companySuccessMessage,
    loadCompany,
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

  useEffect(() => {
    let active = true;
    void loadCompany().then((company) => {
      if (!active || !company) return;
      setRuc(company.ruc);
      setRazonSocial(company.razonSocial);
      setNombreComercial(company.nombreComercial);
      setDireccion(company.direccion);
      setEstado(company.estado);
      setCondicion(company.condicion);
      setSeriesText(company.series.join(', '));
    });
    return () => {
      active = false;
    };
  }, [loadCompany]);

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

  const guardando = isSavingCompany || isValidatingRuc || isLoadingCompany;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
          Datos de la Empresa
        </CardTitle>
        <CardDescription>
          Información fiscal de la empresa activa. Valida el RUC para autocompletar la razón social,
          el nombre comercial, la dirección, el estado y la condición.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingCompany && (
          <PageText variant="caption" className="mb-4 flex items-center gap-2 text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            Cargando datos de la empresa…
          </PageText>
        )}

        {companyLoadError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>No se pudieron cargar los datos de la empresa</AlertTitle>
            <AlertDescription>{companyLoadError}</AlertDescription>
          </Alert>
        )}

        {companySuccessMessage && (
          <Alert className="mb-4">
            <AlertTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
              {companySuccessMessage}
            </AlertTitle>
          </Alert>
        )}

        {companyError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>No se pudieron guardar los datos de la empresa</AlertTitle>
            <AlertDescription>{companyError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <PageField label="RUC de la Empresa" htmlFor="empresa-datos-ruc">
              <div className="flex items-start gap-2">
                <div className="relative flex-1">
                  <Input
                    id="empresa-datos-ruc"
                    aria-label="RUC de la Empresa"
                    autoComplete="off"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="RUC de la empresa"
                    className="pr-10"
                    value={ruc}
                    disabled={guardando}
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
                  disabled={guardando}
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

            <PageField label="Razón Social" htmlFor="empresa-datos-razon-social">
              <Input
                id="empresa-datos-razon-social"
                aria-label="Razón Social"
                autoComplete="off"
                maxLength={200}
                placeholder="Razón social de la empresa"
                value={razonSocial}
                disabled={guardando}
                onChange={(event) => updateField(setRazonSocial)(event.target.value)}
              />
            </PageField>

            <PageField label="Nombre Comercial" htmlFor="empresa-datos-nombre-comercial">
              <Input
                id="empresa-datos-nombre-comercial"
                aria-label="Nombre Comercial"
                autoComplete="off"
                maxLength={200}
                placeholder="Nombre comercial de la empresa"
                value={nombreComercial}
                disabled={guardando}
                onChange={(event) => updateField(setNombreComercial)(event.target.value)}
              />
            </PageField>

            <PageField label="Dirección Fiscal" htmlFor="empresa-datos-direccion">
              <Input
                id="empresa-datos-direccion"
                aria-label="Dirección Fiscal"
                autoComplete="off"
                maxLength={300}
                placeholder="Dirección fiscal de la empresa"
                value={direccion}
                disabled={guardando}
                onChange={(event) => updateField(setDireccion)(event.target.value)}
              />
            </PageField>

            <PageField label="Estado SUNAT" htmlFor="empresa-datos-estado">
              <Input
                id="empresa-datos-estado"
                aria-label="Estado SUNAT"
                autoComplete="off"
                maxLength={100}
                placeholder="Estado del contribuyente"
                className="bg-muted"
                readOnly
                value={estado}
              />
            </PageField>

            <PageField label="Condición" htmlFor="empresa-datos-condicion">
              <Input
                id="empresa-datos-condicion"
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
              <PageField label="Series" htmlFor="empresa-datos-series">
                <Input
                  id="empresa-datos-series"
                  aria-label="Series"
                  autoComplete="off"
                  placeholder="F001, B001"
                  value={seriesText}
                  disabled={guardando}
                  onChange={(event) => updateField(setSeriesText)(event.target.value)}
                />
              </PageField>
              <PageText variant="caption" className="mt-1 text-muted-foreground">
                Escribe las series separadas por comas. Ejemplo: F001, B001.
              </PageText>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={guardando} className="gap-2">
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
  );
};
