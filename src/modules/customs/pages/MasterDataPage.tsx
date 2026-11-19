import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Page,
  PageHeader,
  Button,
  Badge,
  Card,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui';
import {
  Coins,
  ArrowLeftRight,
  Ship,
  FileText,
  Plus,
  RefreshCw,
  Save,
  BookOpen,
  Edit2,
  Trash2,
  Globe,
  Anchor,
  Wrench,
  Building2,
  Landmark,
} from 'lucide-react';
import {
  masterDataApi,
  type CurrencyRecord,
  type IncotermRecord,
  type DocumentTypeRecord,
  type CountryRecord,
  type PortRecord,
  type ExchangeRateRecord,
  type CustomsServiceRecord,
  type CustomsOfficeRecord,
  type AuthorizedBankRecord,
} from '../services/masterDataApi';
import {
  inventoryLedgerApi,
} from '@/modules/inventory/services/inventoryLedgerApi';

type TabKey = 'currencies' | 'rates' | 'incoterms' | 'countries' | 'ports' | 'offices' | 'banks' | 'documents' | 'services' | 'mappings';
type DialogKey = 'currency' | 'rate' | 'incoterm' | 'document' | 'country' | 'port' | 'office' | 'bank' | 'service' | null;

const today = () => new Date().toISOString().slice(0, 10);

const apiError = (error: unknown): string => {
  const err = error as { response?: { data?: { message?: unknown } }; message?: string };
  const message = err.response?.data?.message;
  if (Array.isArray(message)) return message.join(' · ');
  if (typeof message === 'string') return message;
  return err.message || 'No se pudo guardar el registro.';
};

const TABS: Array<{ key: TabKey; label: string; icon: typeof Coins }> = [
  { key: 'currencies', label: 'Monedas', icon: Coins },
  { key: 'rates', label: 'Tipos de cambio', icon: ArrowLeftRight },
  { key: 'incoterms', label: 'Incoterms', icon: Ship },
  { key: 'countries', label: 'Países', icon: Globe },
  { key: 'ports', label: 'Puertos', icon: Anchor },
  { key: 'offices', label: 'Aduanas SUNAT', icon: Building2 },
  { key: 'banks', label: 'Bancos Autorizados', icon: Landmark },
  { key: 'documents', label: 'Documentos', icon: FileText },
  { key: 'services', label: 'Servicios Aduaneros / Gastos de Despacho', icon: Wrench },
  { key: 'mappings', label: 'Cuentas PCGE', icon: BookOpen },
];

export default function MasterDataPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabKey) || 'currencies';
  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    const qTab = searchParams.get('tab') as TabKey;
    if (qTab && ['currencies', 'rates', 'incoterms', 'countries', 'ports', 'offices', 'banks', 'documents', 'services', 'mappings'].includes(qTab)) {
      setTab(qTab);
    }
  }, [searchParams]);
  const [dialog, setDialog] = useState<DialogKey>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currencyForm, setCurrencyForm] = useState({
    code: '',
    name: '',
    symbol: '',
    decimals: 2,
    isActive: true,
  });
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [rateForm, setRateForm] = useState({
    baseCurrency: 'USD',
    quoteCurrency: 'PEN',
    rate: 3.75,
    date: today(),
  });
  const [incotermForm, setIncotermForm] = useState({
    code: '',
    name: '',
    version: '2020',
    namedPlaceRequired: true,
    isActive: true,
  });
  const [countryForm, setCountryForm] = useState({
    code: '',
    name: '',
    status: 'ACTIVE',
  });
  const [portTypeFilter, setPortTypeFilter] = useState<'ALL' | 'ORIGIN' | 'DESTINATION'>('ALL');
  const [portForm, setPortForm] = useState({
    code: '',
    name: '',
    countryCode: 'PE',
    type: 'DESTINATION',
    status: 'ACTIVE',
  });
  const [documentForm, setDocumentForm] = useState({
    code: '',
    name: '',
    stage: 'EMBARQUE',
    isRequired: false,
    isActive: true,
  });
  const [serviceForm, setServiceForm] = useState({
    sku: '',
    description: '',
    category: 'SERVICIOS_ADUANEROS',
    sunatUnitCode: 'ZZ',
    taxAffectation: '10',
    costPrice: 0,
    salePrice: 0,
    isActive: true,
  });

  const [officeForm, setOfficeForm] = useState({
    code: '',
    name: '',
    isActive: true,
  });
  const [bankForm, setBankForm] = useState({
    code: '',
    name: '',
    isActive: true,
  });

  const currencies = useQuery({
    queryKey: ['master-data', 'currencies'],
    queryFn: masterDataApi.getCurrencies,
  });
  const rates = useQuery({
    queryKey: ['master-data', 'rates'],
    queryFn: masterDataApi.getExchangeRates,
  });
  const incoterms = useQuery({
    queryKey: ['master-data', 'incoterms'],
    queryFn: masterDataApi.getIncoterms,
  });
  const countries = useQuery({
    queryKey: ['master-data', 'countries'],
    queryFn: masterDataApi.getCountries,
  });
  const ports = useQuery({
    queryKey: ['master-data', 'ports', portTypeFilter],
    queryFn: () => masterDataApi.getPorts(portTypeFilter === 'ALL' ? undefined : portTypeFilter),
  });
  const offices = useQuery({
    queryKey: ['master-data', 'customs-offices'],
    queryFn: masterDataApi.getCustomsOffices,
    enabled: tab === 'offices',
  });
  const banks = useQuery({
    queryKey: ['master-data', 'authorized-banks'],
    queryFn: masterDataApi.getAuthorizedBanks,
    enabled: tab === 'banks',
  });
  const documents = useQuery({
    queryKey: ['master-data', 'documents'],
    queryFn: masterDataApi.getDocumentTypes,
  });
  const customsServices = useQuery({
    queryKey: ['master-data', 'services'],
    queryFn: masterDataApi.getCustomsServices,
    enabled: tab === 'services',
  });
  const mappings = useQuery({
    queryKey: ['accounting', 'mappings'],
    queryFn: inventoryLedgerApi.getAccountingMappings,
    enabled: tab === 'mappings',
  });

  const invalidate = (key: string) =>
    queryClient.invalidateQueries({ queryKey: ['master-data', key] });

  // Guardar Moneda (Crear / Actualizar)
  const currencyMutation = useMutation({
    mutationFn: () =>
      masterDataApi.upsertCurrency({
        code: currencyForm.code.trim().toUpperCase(),
        name: currencyForm.name.trim(),
        symbol: currencyForm.symbol.trim(),
        decimals: Number(currencyForm.decimals),
        is_active: currencyForm.isActive,
      }),
    onSuccess: () => {
      invalidate('currencies');
      setDialog(null);
      setError(null);
    },
    onError: (e) => setError(apiError(e)),
  });

  const deleteCurrencyMutation = useMutation({
    mutationFn: (code: string) => masterDataApi.deleteCurrency(code),
    onSuccess: () => invalidate('currencies'),
    onError: (e) => alert(apiError(e)),
  });

  // Guardar / Actualizar Tipo de cambio
  const rateMutation = useMutation({
    mutationFn: () => {
      if (editingRateId) {
        return masterDataApi.updateExchangeRate(editingRateId, {
          rate: Number(rateForm.rate),
          source: 'SUNAT (Actualizado)',
        });
      }
      return masterDataApi.createExchangeRate({
        baseCurrency: rateForm.baseCurrency.toUpperCase(),
        quoteCurrency: rateForm.quoteCurrency.toUpperCase(),
        rate: Number(rateForm.rate),
        date: rateForm.date,
      });
    },
    onSuccess: () => {
      invalidate('rates');
      setDialog(null);
      setEditingRateId(null);
      setError(null);
    },
    onError: (e) => setError(apiError(e)),
  });

  const syncTodayRateMutation = useMutation({
    mutationFn: () => masterDataApi.syncTodayExchangeRate(),
    onSuccess: () => {
      invalidate('rates');
      setError(null);
    },
    onError: (e) => setError(apiError(e)),
  });

  const deleteRateMutation = useMutation({
    mutationFn: (id: string) => masterDataApi.deleteExchangeRate(id),
    onSuccess: () => invalidate('rates'),
    onError: (e) => alert(apiError(e)),
  });

  // Guardar País (Crear / Actualizar)
  const countryMutation = useMutation({
    mutationFn: () =>
      masterDataApi.upsertCountry({
        code: countryForm.code.trim().toUpperCase(),
        name: countryForm.name.trim(),
        status: countryForm.status,
      }),
    onSuccess: () => {
      invalidate('countries');
      setDialog(null);
      setError(null);
    },
    onError: (e) => setError(apiError(e)),
  });

  const deleteCountryMutation = useMutation({
    mutationFn: (code: string) => masterDataApi.deleteCountry(code),
    onSuccess: () => invalidate('countries'),
    onError: (e) => alert(apiError(e)),
  });

  // Guardar Puerto (Crear / Actualizar)
  const portMutation = useMutation({
    mutationFn: () =>
      masterDataApi.upsertPort({
        code: portForm.code.trim().toUpperCase(),
        name: portForm.name.trim(),
        countryCode: portForm.countryCode.trim().toUpperCase(),
        type: portForm.type,
        status: portForm.status,
      }),
    onSuccess: () => {
      invalidate('ports');
      setDialog(null);
      setError(null);
    },
    onError: (e) => setError(apiError(e)),
  });

  const deletePortMutation = useMutation({
    mutationFn: (code: string) => masterDataApi.deletePort(code),
    onSuccess: () => invalidate('ports'),
    onError: (e) => alert(apiError(e)),
  });

  // Guardar Incoterm (Crear / Actualizar)
  const incotermMutation = useMutation({
    mutationFn: () =>
      masterDataApi.upsertIncoterm({
        code: incotermForm.code.trim().toUpperCase(),
        name: incotermForm.name.trim(),
        version: incotermForm.version.trim() || '2020',
        named_place_required: incotermForm.namedPlaceRequired,
        is_active: incotermForm.isActive,
      }),
    onSuccess: () => {
      invalidate('incoterms');
      setDialog(null);
      setError(null);
    },
    onError: (e) => setError(apiError(e)),
  });

  const deleteIncotermMutation = useMutation({
    mutationFn: (code: string) => masterDataApi.deleteIncoterm(code),
    onSuccess: () => invalidate('incoterms'),
    onError: (e) => alert(apiError(e)),
  });

  // Guardar Documento (Crear / Actualizar)
  const documentMutation = useMutation({
    mutationFn: () =>
      masterDataApi.upsertDocumentType({
        code: documentForm.code.trim().toUpperCase(),
        name: documentForm.name.trim(),
        stage: documentForm.stage,
        isRequired: documentForm.isRequired,
        isActive: documentForm.isActive,
      }),
    onSuccess: () => {
      invalidate('documents');
      setDialog(null);
      setError(null);
    },
    onError: (e) => setError(apiError(e)),
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (code: string) => masterDataApi.deleteDocumentType(code),
    onSuccess: () => invalidate('documents'),
    onError: (e) => alert(apiError(e)),
  });

  // Guardar / Actualizar Servicio Aduanero
  const serviceMutation = useMutation({
    mutationFn: () => masterDataApi.upsertCustomsService(serviceForm),
    onSuccess: () => {
      invalidate('services');
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      setDialog(null);
      setError(null);
    },
    onError: (e) => setError(apiError(e)),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (sku: string) => masterDataApi.deleteCustomsService(sku),
    onSuccess: () => {
      invalidate('services');
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
    },
    onError: (e) => alert(apiError(e)),
  });

  // Guardar Aduana SUNAT
  const officeMutation = useMutation({
    mutationFn: () =>
      masterDataApi.upsertCustomsOffice({
        code: officeForm.code.trim(),
        name: officeForm.name.trim(),
        isActive: officeForm.isActive,
      }),
    onSuccess: () => {
      invalidate('customs-offices');
      setDialog(null);
      setError(null);
    },
    onError: (e) => setError(apiError(e)),
  });

  const deleteOfficeMutation = useMutation({
    mutationFn: (code: string) => masterDataApi.deleteCustomsOffice(code),
    onSuccess: () => invalidate('customs-offices'),
    onError: (e) => alert(apiError(e)),
  });

  // Guardar Banco Autorizado SUNAT
  const bankMutation = useMutation({
    mutationFn: () =>
      masterDataApi.upsertAuthorizedBank({
        code: bankForm.code.trim(),
        name: bankForm.name.trim(),
        isActive: bankForm.isActive,
      }),
    onSuccess: () => {
      invalidate('authorized-banks');
      setDialog(null);
      setError(null);
    },
    onError: (e) => setError(apiError(e)),
  });

  const deleteBankMutation = useMutation({
    mutationFn: (code: string) => masterDataApi.deleteAuthorizedBank(code),
    onSuccess: () => invalidate('authorized-banks'),
    onError: (e) => alert(apiError(e)),
  });

  const loadError =
    currencies.error ?? rates.error ?? incoterms.error ?? countries.error ?? ports.error ?? offices.error ?? banks.error ?? documents.error ?? customsServices.error ?? mappings.error;

  const refresh = () => {
    if (tab === 'currencies') currencies.refetch();
    if (tab === 'rates') rates.refetch();
    if (tab === 'incoterms') incoterms.refetch();
    if (tab === 'countries') countries.refetch();
    if (tab === 'ports') ports.refetch();
    if (tab === 'offices') offices.refetch();
    if (tab === 'banks') banks.refetch();
    if (tab === 'documents') documents.refetch();
    if (tab === 'services') customsServices.refetch();
    if (tab === 'mappings') mappings.refetch();
  };

  const openNew = () => {
    setError(null);
    setIsEditing(false);
    setEditingRateId(null);
    if (tab === 'currencies') {
      setCurrencyForm({ code: '', name: '', symbol: '', decimals: 2, isActive: true });
      setDialog('currency');
    }
    if (tab === 'rates') {
      setRateForm({ baseCurrency: 'USD', quoteCurrency: 'PEN', rate: 3.75, date: today() });
      setDialog('rate');
    }
    if (tab === 'incoterms') {
      setIncotermForm({ code: '', name: '', version: '2020', namedPlaceRequired: true, isActive: true });
      setDialog('incoterm');
    }
    if (tab === 'countries') {
      setCountryForm({ code: '', name: '', status: 'ACTIVE' });
      setDialog('country');
    }
    if (tab === 'ports') {
      setPortForm({ code: '', name: '', countryCode: 'PE', type: 'DESTINATION', status: 'ACTIVE' });
      setDialog('port');
    }
    if (tab === 'offices') {
      setOfficeForm({ code: '', name: '', isActive: true });
      setDialog('office');
    }
    if (tab === 'banks') {
      setBankForm({ code: '', name: '', isActive: true });
      setDialog('bank');
    }
    if (tab === 'documents') {
      setDocumentForm({ code: '', name: '', stage: 'EMBARQUE', isRequired: false, isActive: true });
      setDialog('document');
    }
    if (tab === 'services') {
      setServiceForm({
        sku: '',
        description: '',
        category: 'SERVICIOS_ADUANEROS',
        sunatUnitCode: 'ZZ',
        taxAffectation: '10',
        costPrice: 0,
        salePrice: 0,
        isActive: true,
      });
      setDialog('service');
    }
  };

  const startEditService = (s: CustomsServiceRecord) => {
    setError(null);
    setIsEditing(true);
    setServiceForm({
      sku: s.sku,
      description: s.description,
      category: s.category || 'AGENCIA_ADUANA',
      sunatUnitCode: s.sunat_unit_code || 'ZZ',
      taxAffectation: s.tax_affectation || '10',
      costPrice: Number(s.cost_price || 0),
      salePrice: Number(s.sale_price || 0),
      isActive: s.is_active !== false,
    });
    setDialog('service');
  };

  const startEditRate = (r: ExchangeRateRecord) => {
    setError(null);
    setIsEditing(true);
    setEditingRateId(r.id);
    setRateForm({
      baseCurrency: r.base_currency,
      quoteCurrency: r.quote_currency,
      rate: Number(r.rate),
      date: String(r.date).slice(0, 10),
    });
    setDialog('rate');
  };

  const startEditCountry = (c: CountryRecord) => {
    setError(null);
    setIsEditing(true);
    setCountryForm({
      code: c.code,
      name: c.name,
      status: c.status,
    });
    setDialog('country');
  };

  const startEditPort = (p: PortRecord) => {
    setError(null);
    setIsEditing(true);
    setPortForm({
      code: p.code,
      name: p.name,
      countryCode: p.country_code,
      type: p.type,
      status: p.status,
    });
    setDialog('port');
  };

  const startEditCurrency = (c: CurrencyRecord) => {
    setError(null);
    setIsEditing(true);
    setCurrencyForm({
      code: c.code,
      name: c.name,
      symbol: c.symbol,
      decimals: c.decimals,
      isActive: c.is_active,
    });
    setDialog('currency');
  };

  const startEditIncoterm = (i: IncotermRecord) => {
    setError(null);
    setIsEditing(true);
    setIncotermForm({
      code: i.code,
      name: i.name,
      version: i.version,
      namedPlaceRequired: i.named_place_required,
      isActive: i.is_active,
    });
    setDialog('incoterm');
  };

  const startEditDocument = (d: DocumentTypeRecord) => {
    setError(null);
    setIsEditing(true);
    setDocumentForm({
      code: d.code,
      name: d.name,
      stage: d.stage,
      isRequired: d.is_required,
      isActive: d.is_active,
    });
    setDialog('document');
  };

  const startEditOffice = (o: CustomsOfficeRecord) => {
    setError(null);
    setIsEditing(true);
    setOfficeForm({
      code: o.code,
      name: o.name,
      isActive: o.is_active,
    });
    setDialog('office');
  };

  const startEditBank = (b: AuthorizedBankRecord) => {
    setError(null);
    setIsEditing(true);
    setBankForm({
      code: b.code,
      name: b.name,
      isActive: b.is_active,
    });
    setDialog('bank');
  };

  return (
    <Page>
      <PageHeader
        title="Configuración de importaciones"
        description="Monedas, tipos de cambio, incoterms, países, puertos y documentos que alimentan el expediente de importación."
      >
        {tab === 'rates' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncTodayRateMutation.mutate()}
            disabled={syncTodayRateMutation.isPending}
            className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncTodayRateMutation.isPending ? 'animate-spin' : ''}`} />
            Sincronizar SUNAT Hoy
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={refresh} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Actualizar
        </Button>
        {tab !== 'mappings' && (
          <Button size="sm" onClick={openNew} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Nuevo
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-wrap gap-1 border-b pb-2">
        {TABS.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.key}
              size="sm"
              variant={tab === item.key ? 'default' : 'ghost'}
              onClick={() => setTab(item.key)}
              className="gap-1.5 text-xs"
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {loadError && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          No se pudieron cargar los maestros. Verifica que el backend local esté en
          el puerto 3000 y que `VITE_API_URL` apunte a `/api/v1`.
          <span className="ml-1 opacity-70">({apiError(loadError)})</span>
        </div>
      )}

      <Card className="overflow-hidden">
        {/* Monedas */}
        {tab === 'currencies' && (
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground uppercase">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Moneda</th>
                <th className="p-3">Símbolo</th>
                <th className="p-3 text-center">Decimales</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {currencies.isLoading ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Cargando monedas...</td></tr>
              ) : (currencies.data ?? []).map((c) => (
                <tr key={c.code} className="border-t hover:bg-muted/20">
                  <td className="p-3 font-mono font-bold text-primary">{c.code}</td>
                  <td className="p-3">{c.name}</td>
                  <td className="p-3 font-mono">{c.symbol}</td>
                  <td className="p-3 text-center">{c.decimals}</td>
                  <td className="p-3 text-center">
                    <Badge variant={c.is_active ? 'default' : 'secondary'}>
                      {c.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Editar moneda"
                        onClick={() => startEditCurrency(c)}
                        className="h-7 w-7 p-0 text-primary hover:text-primary/80"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Eliminar moneda"
                        disabled={deleteCurrencyMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`¿Está seguro de eliminar la moneda ${c.code} (${c.name})?`)) {
                            deleteCurrencyMutation.mutate(c.code);
                          }
                        }}
                        className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Tipos de cambio */}
        {tab === 'rates' && (
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground uppercase">
              <tr>
                <th className="p-3">Fecha</th>
                <th className="p-3">Par</th>
                <th className="p-3 text-right">Tipo de cambio</th>
                <th className="p-3">Fuente</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rates.isLoading ? (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Cargando tipos de cambio...</td></tr>
              ) : (rates.data ?? []).map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/20">
                  <td className="p-3 font-mono">{String(r.date).slice(0, 10)}</td>
                  <td className="p-3 font-mono font-bold">{r.base_currency} / {r.quote_currency}</td>
                  <td className="p-3 text-right font-mono">{Number(r.rate).toFixed(4)}</td>
                  <td className="p-3">{r.source}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Editar tipo de cambio"
                        onClick={() => startEditRate(r)}
                        className="h-7 w-7 p-0 text-primary hover:text-primary/80"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Eliminar registro"
                        disabled={deleteRateMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`¿Desea eliminar el tipo de cambio del ${String(r.date).slice(0, 10)} (${r.base_currency}/${r.quote_currency})?`)) {
                            deleteRateMutation.mutate(r.id);
                          }
                        }}
                        className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Incoterms */}
        {tab === 'incoterms' && (
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground uppercase">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Nombre</th>
                <th className="p-3">Versión</th>
                <th className="p-3 text-center">Plaza requerida</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {incoterms.isLoading ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Cargando incoterms...</td></tr>
              ) : (incoterms.data ?? []).map((i) => (
                <tr key={i.code} className="border-t hover:bg-muted/20">
                  <td className="p-3 font-mono font-bold text-primary">{i.code}</td>
                  <td className="p-3">{i.name}</td>
                  <td className="p-3">{i.version}</td>
                  <td className="p-3 text-center">{i.named_place_required ? 'Sí' : 'No'}</td>
                  <td className="p-3 text-center">
                    <Badge variant={i.is_active ? 'default' : 'secondary'}>
                      {i.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Editar Incoterm"
                        onClick={() => startEditIncoterm(i)}
                        className="h-7 w-7 p-0 text-primary hover:text-primary/80"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Eliminar Incoterm"
                        disabled={deleteIncotermMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`¿Está seguro de eliminar el Incoterm ${i.code} (${i.name})?`)) {
                            deleteIncotermMutation.mutate(i.code);
                          }
                        }}
                        className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Países */}
        {tab === 'countries' && (
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground uppercase">
              <tr>
                <th className="p-3">Código ISO</th>
                <th className="p-3">Nombre del País</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {countries.isLoading ? (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Cargando países...</td></tr>
              ) : (countries.data ?? []).length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No hay países registrados.</td></tr>
              ) : (countries.data ?? []).map((c) => (
                <tr key={c.code} className="border-t hover:bg-muted/20">
                  <td className="p-3 font-mono font-bold text-primary">{c.code}</td>
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 text-center">
                    <Badge variant={c.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {c.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Editar país"
                        onClick={() => startEditCountry(c)}
                        className="h-7 w-7 p-0 text-primary hover:text-primary/80"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Eliminar país"
                        disabled={deleteCountryMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`¿Está seguro de eliminar el país ${c.code} (${c.name})?`)) {
                            deleteCountryMutation.mutate(c.code);
                          }
                        }}
                        className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Puertos */}
        {tab === 'ports' && (
          <div>
            <div className="flex items-center gap-2 border-b bg-muted/20 p-2.5 text-xs">
              <span className="font-semibold text-muted-foreground">Filtro de puertos:</span>
              <Button
                size="sm"
                variant={portTypeFilter === 'ALL' ? 'default' : 'outline'}
                onClick={() => setPortTypeFilter('ALL')}
                className="h-7 text-xs"
              >
                Todos
              </Button>
              <Button
                size="sm"
                variant={portTypeFilter === 'ORIGIN' ? 'default' : 'outline'}
                onClick={() => setPortTypeFilter('ORIGIN')}
                className="h-7 text-xs"
              >
                Puertos de Origen
              </Button>
              <Button
                size="sm"
                variant={portTypeFilter === 'DESTINATION' ? 'default' : 'outline'}
                onClick={() => setPortTypeFilter('DESTINATION')}
                className="h-7 text-xs"
              >
                Puertos de Destino
              </Button>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground uppercase">
                <tr>
                  <th className="p-3">Código UN/LOCODE</th>
                  <th className="p-3">Nombre del Puerto</th>
                  <th className="p-3">País</th>
                  <th className="p-3 text-center">Tipo</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ports.isLoading ? (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Cargando puertos...</td></tr>
                ) : (ports.data ?? []).length === 0 ? (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No se encontraron puertos para este filtro.</td></tr>
                ) : (ports.data ?? []).map((p) => (
                  <tr key={p.code} className="border-t hover:bg-muted/20">
                    <td className="p-3 font-mono font-bold text-primary">{p.code}</td>
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3 font-mono text-muted-foreground">{p.country_code}</td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className="text-[10px]">
                        {p.type === 'ORIGIN' ? 'Origen' : p.type === 'DESTINATION' ? 'Destino' : 'Ambos'}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={p.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {p.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Editar puerto"
                          onClick={() => startEditPort(p)}
                          className="h-7 w-7 p-0 text-primary hover:text-primary/80"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Eliminar puerto"
                          disabled={deletePortMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`¿Está seguro de eliminar el puerto ${p.code} (${p.name})?`)) {
                              deletePortMutation.mutate(p.code);
                            }
                          }}
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Aduanas SUNAT */}
        {tab === 'offices' && (
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground uppercase">
              <tr>
                <th className="p-3">Código SUNAT</th>
                <th className="p-3">Nombre de la Aduana</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {offices.isLoading ? (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Cargando aduanas...</td></tr>
              ) : (offices.data ?? []).length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No hay aduanas registradas.</td></tr>
              ) : (offices.data ?? []).map((o) => (
                <tr key={o.code} className="border-t hover:bg-muted/20">
                  <td className="p-3 font-mono font-bold text-primary">{o.code}</td>
                  <td className="p-3 font-medium">{o.name}</td>
                  <td className="p-3 text-center">
                    <Badge variant={o.is_active ? 'default' : 'secondary'}>
                      {o.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Editar aduana"
                        onClick={() => startEditOffice(o)}
                        className="h-7 w-7 p-0 text-primary hover:text-primary/80"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Desactivar aduana"
                        disabled={deleteOfficeMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`¿Está seguro de desactivar la aduana ${o.code} (${o.name})?`)) {
                            deleteOfficeMutation.mutate(o.code);
                          }
                        }}
                        className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Bancos Autorizados */}
        {tab === 'banks' && (
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground uppercase">
              <tr>
                <th className="p-3">Código Entidad</th>
                <th className="p-3">Nombre del Banco</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {banks.isLoading ? (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Cargando bancos autorizados...</td></tr>
              ) : (banks.data ?? []).length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No hay bancos registrados.</td></tr>
              ) : (banks.data ?? []).map((b) => (
                <tr key={b.code} className="border-t hover:bg-muted/20">
                  <td className="p-3 font-mono font-bold text-primary">{b.code}</td>
                  <td className="p-3 font-medium">{b.name}</td>
                  <td className="p-3 text-center">
                    <Badge variant={b.is_active ? 'default' : 'secondary'}>
                      {b.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Editar banco"
                        onClick={() => startEditBank(b)}
                        className="h-7 w-7 p-0 text-primary hover:text-primary/80"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Desactivar banco"
                        disabled={deleteBankMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`¿Está seguro de desactivar el banco ${b.code} (${b.name})?`)) {
                            deleteBankMutation.mutate(b.code);
                          }
                        }}
                        className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Documentos */}
        {tab === 'documents' && (
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground uppercase">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Tipo de Documento</th>
                <th className="p-3">Etapa Aduanera</th>
                <th className="p-3 text-center">Obligatorio</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {documents.isLoading ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Cargando tipos de documentos...</td></tr>
              ) : (documents.data ?? []).length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No hay documentos registrados.</td></tr>
              ) : (documents.data ?? []).map((d) => (
                <tr key={d.code} className="border-t hover:bg-muted/20">
                  <td className="p-3 font-mono font-bold text-primary">{d.code}</td>
                  <td className="p-3 font-medium">{d.name}</td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-[10px]">
                      {d.stage}
                    </Badge>
                  </td>
                  <td className="p-3 text-center">
                    {d.is_required ? (
                      <span className="font-semibold text-amber-500">Obligatorio</span>
                    ) : (
                      <span className="text-muted-foreground">Opcional</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <Badge variant={d.is_active ? 'default' : 'secondary'}>
                      {d.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Editar Documento"
                        onClick={() => startEditDocument(d)}
                        className="h-7 w-7 p-0 text-primary hover:text-primary/80"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Eliminar Documento"
                        disabled={deleteDocumentMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`¿Está seguro de eliminar el tipo de documento ${d.code} (${d.name})?`)) {
                            deleteDocumentMutation.mutate(d.code);
                          }
                        }}
                        className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Servicios Aduaneros */}
        {tab === 'services' && (
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground uppercase">
              <tr>
                <th className="p-3">Código / SKU</th>
                <th className="p-3">Descripción del Servicio</th>
                <th className="p-3">Categoría Aduanera</th>
                <th className="p-3 text-center">Unidad SUNAT</th>
                <th className="p-3 text-right">Costo Ref. (S/)</th>
                <th className="p-3 text-center">Afectación</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {customsServices.isLoading ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted-foreground">
                    Cargando servicios aduaneros sincronizados...
                  </td>
                </tr>
              ) : (customsServices.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted-foreground">
                    No hay servicios aduaneros registrados. Presiona "+ Nuevo" para crear uno.
                  </td>
                </tr>
              ) : (
                (customsServices.data ?? []).map((s) => (
                  <tr key={s.id || s.sku} className="border-t hover:bg-muted/20">
                    <td className="p-3 font-mono font-bold text-primary">{s.sku}</td>
                    <td className="p-3 font-medium text-foreground">{s.description}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px]">
                        {s.category || 'SERVICIOS_ADUANEROS'}
                      </Badge>
                    </td>
                    <td className="p-3 text-center font-mono">{s.sunat_unit_code || 'ZZ'}</td>
                    <td className="p-3 text-right font-mono font-medium">
                      {s.cost_price ? `S/ ${Number(s.cost_price).toFixed(2)}` : '—'}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="secondary" className="text-[10px]">
                        {s.tax_affectation === '10' ? '10 Gravado (18%)' : s.tax_affectation || '10'}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={s.is_active ? 'default' : 'secondary'}>
                        {s.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditService(s)}
                          className="h-7 w-7 p-0 text-primary hover:text-primary/80"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deleteServiceMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`¿Está seguro de desactivar el servicio aduanero ${s.sku}?`)) {
                              deleteServiceMutation.mutate(s.sku);
                            }
                          }}
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Mappings Contables PCGE */}
        {tab === 'mappings' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/30 border-b text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="h-4 w-4 text-primary" />
                <span>
                  <strong>Vista de Solo Lectura:</strong> Las cuentas contables se encuentran centralizadas y sincronizadas directamente con el catálogo del <strong>Plan Contable General Empresarial (PCGE 2019)</strong> del módulo de Contabilidad.
                </span>
              </div>
              <Badge variant="outline" className="text-[11px] font-medium bg-background text-primary border-primary/30">
                Sincronizado con Contabilidad
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/70 text-muted-foreground uppercase text-[11px] font-semibold border-b">
                  <tr>
                    <th className="p-3 w-40">Proceso Operativo</th>
                    <th className="p-3 w-48">Rol Contable</th>
                    <th className="p-3 w-36">Cuenta PCGE 2019</th>
                    <th className="p-3">Descripción de Afectación</th>
                    <th className="p-3 text-center w-36">Tipo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {mappings.isLoading ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">
                        Cargando mapa de cuentas contables...
                      </td>
                    </tr>
                  ) : (mappings.data ?? []).map((m) => (
                    <tr key={`${m.process_code}:${m.role_code}`} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-semibold">
                          <Badge
                            variant="outline"
                            className={`font-mono text-[10px] font-bold ${
                              m.process_code === 'IMPORTACION'
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                : m.process_code === 'COMPRA'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                : m.process_code === 'VENTA'
                                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
                                : m.process_code === 'TRANSFERENCIA'
                                ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30'
                                : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                            }`}
                          >
                            {m.process_code}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono font-medium text-foreground">{m.role_code}</td>
                        <td className="p-3 font-mono font-bold text-sm text-primary">
                          {m.account_code}
                        </td>
                        <td className="p-3 text-muted-foreground font-normal">{m.description}</td>
                        <td className="p-3 text-center">
                          <Badge variant={m.is_custom ? 'default' : 'secondary'} className="text-[10px]">
                            {m.is_custom ? 'Personalizada' : 'Estándar PCGE'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {/* Modal Moneda */}
      <Dialog open={dialog === 'currency'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar moneda' : 'Nueva moneda'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div>
              <p className="mb-1 font-medium">Código ISO</p>
              <Input
                placeholder="Código ISO (ej. USD, PEN, EUR)"
                value={currencyForm.code}
                disabled={isEditing}
                onChange={(e) => setCurrencyForm({ ...currencyForm, code: e.target.value })}
                className="font-mono font-bold"
              />
            </div>
            <div>
              <p className="mb-1 font-medium">Nombre de la moneda</p>
              <Input
                placeholder="Nombre (ej. Dólar estadounidense)"
                value={currencyForm.name}
                onChange={(e) => setCurrencyForm({ ...currencyForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 font-medium">Símbolo</p>
                <Input
                  placeholder="Símbolo (ej. $, S/, €)"
                  value={currencyForm.symbol}
                  onChange={(e) => setCurrencyForm({ ...currencyForm, symbol: e.target.value })}
                />
              </div>
              <div>
                <p className="mb-1 font-medium">Decimales</p>
                <Input
                  type="number"
                  placeholder="2"
                  value={currencyForm.decimals}
                  onChange={(e) => setCurrencyForm({ ...currencyForm, decimals: Number(e.target.value) })}
                />
              </div>
            </div>
            {isEditing && (
              <div>
                <p className="mb-1 font-medium">Estado</p>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={currencyForm.isActive ? '1' : '0'}
                  onChange={(e) => setCurrencyForm({ ...currencyForm, isActive: e.target.value === '1' })}
                >
                  <option value="1">Activa</option>
                  <option value="0">Inactiva</option>
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button onClick={() => currencyMutation.mutate()} disabled={currencyMutation.isPending || !currencyForm.code || !currencyForm.name} className="gap-1.5">
              <Save className="h-3.5 w-3.5" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tipo de cambio */}
      <Dialog open={dialog === 'rate'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRateId ? 'Editar tipo de cambio' : 'Nuevo tipo de cambio'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="mb-1 font-medium">Moneda Base</p>
              <Input
                placeholder="Base (USD)"
                value={rateForm.baseCurrency}
                disabled={Boolean(editingRateId)}
                onChange={(e) => setRateForm({ ...rateForm, baseCurrency: e.target.value })}
              />
            </div>
            <div>
              <p className="mb-1 font-medium">Moneda Destino</p>
              <Input
                placeholder="Destino (PEN)"
                value={rateForm.quoteCurrency}
                disabled={Boolean(editingRateId)}
                onChange={(e) => setRateForm({ ...rateForm, quoteCurrency: e.target.value })}
              />
            </div>
            <div>
              <p className="mb-1 font-medium">Valor de Cambio</p>
              <Input
                type="number"
                step="0.0001"
                placeholder="Tipo de cambio"
                value={rateForm.rate}
                onChange={(e) => setRateForm({ ...rateForm, rate: Number(e.target.value) })}
              />
            </div>
            <div>
              <p className="mb-1 font-medium">Fecha</p>
              <Input
                type="date"
                value={rateForm.date}
                onChange={(e) => setRateForm({ ...rateForm, date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button onClick={() => rateMutation.mutate()} disabled={rateMutation.isPending || !rateForm.rate} className="gap-1.5">
              <Save className="h-3.5 w-3.5" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal País */}
      <Dialog open={dialog === 'country'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar país' : 'Nuevo país'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div>
              <p className="mb-1 font-medium">Código ISO (2 letras)</p>
              <Input
                placeholder="Código (ej. CN, US, PE)"
                value={countryForm.code}
                disabled={isEditing}
                maxLength={3}
                onChange={(e) => setCountryForm({ ...countryForm, code: e.target.value.toUpperCase() })}
                className="font-mono font-bold"
              />
            </div>
            <div>
              <p className="mb-1 font-medium">Nombre del país</p>
              <Input
                placeholder="Nombre (ej. China, Estados Unidos)"
                value={countryForm.name}
                onChange={(e) => setCountryForm({ ...countryForm, name: e.target.value })}
              />
            </div>
            <div>
              <p className="mb-1 font-medium">Estado</p>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={countryForm.status}
                onChange={(e) => setCountryForm({ ...countryForm, status: e.target.value })}
              >
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button
              onClick={() => countryMutation.mutate()}
              disabled={countryMutation.isPending || !countryForm.code || !countryForm.name}
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Puerto */}
      <Dialog open={dialog === 'port'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar puerto' : 'Nuevo puerto'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div>
              <p className="mb-1 font-medium">Código UN/LOCODE</p>
              <Input
                placeholder="Código (ej. CNCWN, PECAL, USLAX)"
                value={portForm.code}
                disabled={isEditing}
                maxLength={10}
                onChange={(e) => setPortForm({ ...portForm, code: e.target.value.toUpperCase() })}
                className="font-mono font-bold"
              />
            </div>
            <div>
              <p className="mb-1 font-medium">Nombre del puerto</p>
              <Input
                placeholder="Nombre (ej. Chiwan, Callao, Ningbo)"
                value={portForm.name}
                onChange={(e) => setPortForm({ ...portForm, name: e.target.value })}
              />
            </div>
            <div>
              <p className="mb-1 font-medium">País</p>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={portForm.countryCode}
                onChange={(e) => setPortForm({ ...portForm, countryCode: e.target.value })}
              >
                {(countries.data ?? []).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="mb-1 font-medium">Tipo de puerto</p>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={portForm.type}
                onChange={(e) => setPortForm({ ...portForm, type: e.target.value })}
              >
                <option value="ORIGIN">Puerto de Origen (Embarque)</option>
                <option value="DESTINATION">Puerto de Destino (Arribo)</option>
                <option value="BOTH">Ambos</option>
              </select>
            </div>
            <div>
              <p className="mb-1 font-medium">Estado</p>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={portForm.status}
                onChange={(e) => setPortForm({ ...portForm, status: e.target.value })}
              >
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button
              onClick={() => portMutation.mutate()}
              disabled={portMutation.isPending || !portForm.code || !portForm.name}
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Incoterm */}
      <Dialog open={dialog === 'incoterm'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Incoterm' : 'Nuevo Incoterm'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div>
              <p className="mb-1 font-medium">Código Incoterm (3 letras)</p>
              <Input
                placeholder="Código (ej. FOB, CIF, CFR)"
                value={incotermForm.code}
                disabled={isEditing}
                onChange={(e) => setIncotermForm({ ...incotermForm, code: e.target.value })}
                className="font-mono font-bold"
              />
            </div>
            <div>
              <p className="mb-1 font-medium">Descripción</p>
              <Input placeholder="Nombre (ej. Free on Board)" value={incotermForm.name} onChange={(e) => setIncotermForm({ ...incotermForm, name: e.target.value })} />
            </div>
            <div>
              <p className="mb-1 font-medium">Versión CCI</p>
              <Input placeholder="Versión (ej. 2020)" value={incotermForm.version} onChange={(e) => setIncotermForm({ ...incotermForm, version: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={incotermForm.namedPlaceRequired}
                onChange={(e) => setIncotermForm({ ...incotermForm, namedPlaceRequired: e.target.checked })}
              />
              Requiere especificar lugar o puerto convenido
            </label>
            {isEditing && (
              <div>
                <p className="mb-1 font-medium">Estado</p>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={incotermForm.isActive ? '1' : '0'}
                  onChange={(e) => setIncotermForm({ ...incotermForm, isActive: e.target.value === '1' })}
                >
                  <option value="1">Activo</option>
                  <option value="0">Inactivo</option>
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button onClick={() => incotermMutation.mutate()} disabled={incotermMutation.isPending || !incotermForm.code || !incotermForm.name} className="gap-1.5">
              <Save className="h-3.5 w-3.5" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Aduana SUNAT */}
      <Dialog open={dialog === 'office'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Aduana SUNAT' : 'Nueva Aduana SUNAT'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div>
              <p className="mb-1 font-medium">Código SUNAT (3 dígitos) *</p>
              <Input
                placeholder="ej. 118"
                value={officeForm.code}
                disabled={isEditing}
                maxLength={3}
                onChange={(e) => setOfficeForm({ ...officeForm, code: e.target.value })}
                className="font-mono font-bold"
              />
            </div>
            <div>
              <p className="mb-1 font-medium">Nombre de la Aduana / Intendencia *</p>
              <Input
                placeholder="ej. Marítima del Callao"
                value={officeForm.name}
                onChange={(e) => setOfficeForm({ ...officeForm, name: e.target.value })}
              />
            </div>
            {isEditing && (
              <div>
                <p className="mb-1 font-medium">Estado</p>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={officeForm.isActive ? '1' : '0'}
                  onChange={(e) => setOfficeForm({ ...officeForm, isActive: e.target.value === '1' })}
                >
                  <option value="1">Activo</option>
                  <option value="0">Inactivo</option>
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button
              onClick={() => officeMutation.mutate()}
              disabled={officeMutation.isPending || !officeForm.code || !officeForm.name}
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Banco Autorizado SUNAT */}
      <Dialog open={dialog === 'bank'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Banco Autorizado' : 'Nuevo Banco Autorizado'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div>
              <p className="mb-1 font-medium">Código Entidad Bancaria (3 dígitos) *</p>
              <Input
                placeholder="ej. 002"
                value={bankForm.code}
                disabled={isEditing}
                maxLength={3}
                onChange={(e) => setBankForm({ ...bankForm, code: e.target.value })}
                className="font-mono font-bold"
              />
            </div>
            <div>
              <p className="mb-1 font-medium">Nombre de la Entidad Bancaria *</p>
              <Input
                placeholder="ej. Banco de Crédito del Perú (BCP)"
                value={bankForm.name}
                onChange={(e) => setBankForm({ ...bankForm, name: e.target.value })}
              />
            </div>
            {isEditing && (
              <div>
                <p className="mb-1 font-medium">Estado</p>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={bankForm.isActive ? '1' : '0'}
                  onChange={(e) => setBankForm({ ...bankForm, isActive: e.target.value === '1' })}
                >
                  <option value="1">Activo</option>
                  <option value="0">Inactivo</option>
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button
              onClick={() => bankMutation.mutate()}
              disabled={bankMutation.isPending || !bankForm.code || !bankForm.name}
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Documento */}
      <Dialog open={dialog === 'document'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar tipo de documento' : 'Nuevo tipo de documento'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div>
              <p className="mb-1 font-medium">Código de Documento</p>
              <Input
                placeholder="Código (ej. BL, FACTURA_COMERCIAL, PACKING_LIST)"
                value={documentForm.code}
                disabled={isEditing}
                onChange={(e) => setDocumentForm({ ...documentForm, code: e.target.value })}
                className="font-mono font-bold"
              />
            </div>
            <div>
              <p className="mb-1 font-medium">Nombre descriptivo</p>
              <Input placeholder="Nombre del documento" value={documentForm.name} onChange={(e) => setDocumentForm({ ...documentForm, name: e.target.value })} />
            </div>
            <div>
              <p className="mb-1 font-medium">Etapa Aduanera asignada</p>
              <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={documentForm.stage} onChange={(e) => setDocumentForm({ ...documentForm, stage: e.target.value })}>
                <option value="SOLICITUD">Solicitud</option>
                <option value="EMBARQUE">Embarque</option>
                <option value="ADUANA">Aduana</option>
                <option value="RECEPCION">Recepción</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={documentForm.isRequired} onChange={(e) => setDocumentForm({ ...documentForm, isRequired: e.target.checked })} />
              Obligatorio para avanzar de etapa operativa
            </label>
            {isEditing && (
              <div>
                <p className="mb-1 font-medium">Estado</p>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={documentForm.isActive ? '1' : '0'}
                  onChange={(e) => setDocumentForm({ ...documentForm, isActive: e.target.value === '1' })}
                >
                  <option value="1">Activo</option>
                  <option value="0">Inactivo</option>
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button onClick={() => documentMutation.mutate()} disabled={documentMutation.isPending || !documentForm.code || !documentForm.name} className="gap-1.5">
              <Save className="h-3.5 w-3.5" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Servicio Aduanero */}
      <Dialog open={dialog === 'service'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Servicio Aduanero' : 'Nuevo Servicio Aduanero'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div>
              <p className="mb-1 font-medium">Código / SKU *</p>
              <Input
                placeholder="ej. SRV-AGENCIA-ADU"
                value={serviceForm.sku}
                disabled={isEditing}
                onChange={(e) => setServiceForm({ ...serviceForm, sku: e.target.value.toUpperCase() })}
                className="font-mono uppercase font-bold"
              />
            </div>
            <div>
              <p className="mb-1 font-medium">Descripción del Servicio *</p>
              <Input
                placeholder="ej. Servicio de Agenciamiento Aduanero y Despacho"
                value={serviceForm.description}
                onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 font-medium">Categoría Aduanera</p>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                  value={serviceForm.category}
                  onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                >
                  <option value="SERVICIOS_ADUANEROS">SERVICIOS_ADUANEROS (Gastos de Despacho)</option>
                  <option value="ORIGEN_IMPORTACION">ORIGEN_IMPORTACION (Gastos en Origen)</option>
                  <option value="AGENCIA_ADUANA">Agencia de Aduana</option>
                  <option value="FLETE_LOCAL">Flete Local / Transporte Callao</option>
                  <option value="ALMACENAJE">Almacén Portuario (APM/DPW)</option>
                  <option value="ESTIBA">Cuadrilla / Estiba</option>
                  <option value="INSPECCION">Inspección / SENASA / DIGESA</option>
                  <option value="OTROS">Otros Gastos Aduaneros</option>
                </select>
              </div>
              <div>
                <p className="mb-1 font-medium">Unidad SUNAT</p>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-mono"
                  value={serviceForm.sunatUnitCode}
                  onChange={(e) => setServiceForm({ ...serviceForm, sunatUnitCode: e.target.value })}
                >
                  <option value="ZZ">ZZ - Servicio</option>
                  <option value="NIU">NIU - Unidad</option>
                  <option value="E48">E48 - Unidad de Servicio</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 font-medium">Costo Referencial (S/)</p>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={serviceForm.costPrice}
                  onChange={(e) => setServiceForm({ ...serviceForm, costPrice: Number(e.target.value) })}
                />
              </div>
              <div>
                <p className="mb-1 font-medium">Afectación IGV</p>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                  value={serviceForm.taxAffectation}
                  onChange={(e) => setServiceForm({ ...serviceForm, taxAffectation: e.target.value })}
                >
                  <option value="10">10 - Gravado Operación Onerosa (18%)</option>
                  <option value="20">20 - Exonerado</option>
                  <option value="30">30 - Inafecto</option>
                </select>
              </div>
            </div>
            {isEditing && (
              <div>
                <p className="mb-1 font-medium">Estado</p>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                  value={serviceForm.isActive ? '1' : '0'}
                  onChange={(e) => setServiceForm({ ...serviceForm, isActive: e.target.value === '1' })}
                >
                  <option value="1">Activo</option>
                  <option value="0">Inactivo</option>
                </select>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded border">
              ℹ️ Este servicio se sincroniza automáticamente con el catálogo general de <strong>inventarios</strong> con tipo <code>is_service: true</code> para ser facturable en Compras sin generar stock físico.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button
              onClick={() => serviceMutation.mutate()}
              disabled={serviceMutation.isPending || !serviceForm.sku.trim() || !serviceForm.description.trim()}
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" /> Guardar Servicio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}