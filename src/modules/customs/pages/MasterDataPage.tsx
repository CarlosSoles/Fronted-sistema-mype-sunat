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
} from 'lucide-react';
import {
  masterDataApi,
  type CurrencyRecord,
  type IncotermRecord,
  type DocumentTypeRecord,
  type CountryRecord,
  type PortRecord,
  type ExchangeRateRecord,
} from '../services/masterDataApi';
import {
  inventoryLedgerApi,
  type AccountingMappingRecord,
} from '@/modules/inventory/services/inventoryLedgerApi';

type TabKey = 'currencies' | 'rates' | 'incoterms' | 'countries' | 'ports' | 'documents' | 'mappings';
type DialogKey = 'currency' | 'rate' | 'incoterm' | 'document' | 'mapping' | 'country' | 'port' | null;

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
  { key: 'documents', label: 'Documentos', icon: FileText },
  { key: 'mappings', label: 'Cuentas PCGE', icon: BookOpen },
];

export default function MasterDataPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabKey) || 'currencies';
  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    const qTab = searchParams.get('tab') as TabKey;
    if (qTab && ['currencies', 'rates', 'incoterms', 'countries', 'ports', 'documents', 'mappings'].includes(qTab)) {
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
  const [mappingForm, setMappingForm] = useState<AccountingMappingRecord | null>(null);

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
  const documents = useQuery({
    queryKey: ['master-data', 'documents'],
    queryFn: masterDataApi.getDocumentTypes,
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

  // Guardar Mapeo contable
  const mappingMutation = useMutation({
    mutationFn: (mapping: { process_code: string; role_code: string; account_code: string }) =>
      inventoryLedgerApi.updateAccountingMapping(mapping),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting', 'mappings'] });
      setDialog(null);
      setError(null);
    },
    onError: (e) => setError(apiError(e)),
  });

  const loadError =
    currencies.error ?? rates.error ?? incoterms.error ?? countries.error ?? ports.error ?? documents.error ?? mappings.error;

  const refresh = () => {
    if (tab === 'currencies') currencies.refetch();
    if (tab === 'rates') rates.refetch();
    if (tab === 'incoterms') incoterms.refetch();
    if (tab === 'countries') countries.refetch();
    if (tab === 'ports') ports.refetch();
    if (tab === 'documents') documents.refetch();
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
    if (tab === 'documents') {
      setDocumentForm({ code: '', name: '', stage: 'EMBARQUE', isRequired: false, isActive: true });
      setDialog('document');
    }
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

        {/* Mappings Contables PCGE */}
        {tab === 'mappings' && (
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground uppercase">
              <tr>
                <th className="p-3">Proceso Operativo</th>
                <th className="p-3">Rol Contable</th>
                <th className="p-3">Cuenta PCGE 2019</th>
                <th className="p-3">Descripción de Afectación</th>
                <th className="p-3 text-center">Tipo</th>
                <th className="p-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {mappings.isLoading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    Cargando mapa de cuentas contables...
                  </td>
                </tr>
              ) : (mappings.data ?? []).map((m) => (
                <tr key={`${m.process_code}:${m.role_code}`} className="border-t hover:bg-muted/20">
                  <td className="p-3 font-semibold text-primary">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {m.process_code}
                    </Badge>
                  </td>
                  <td className="p-3 font-mono font-medium">{m.role_code}</td>
                  <td className="p-3 font-mono font-bold text-base text-foreground">
                    {m.account_code}
                  </td>
                  <td className="p-3 text-muted-foreground">{m.description}</td>
                  <td className="p-3 text-center">
                    <Badge variant={m.is_custom ? 'default' : 'secondary'}>
                      {m.is_custom ? 'Personalizada' : 'Estándar PCGE'}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMappingForm(m);
                        setDialog('mapping');
                      }}
                      className="h-7 w-7 p-0"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {/* Mapeo Contable */}
      <Dialog open={dialog === 'mapping'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Cuenta Contable PCGE 2019</DialogTitle>
          </DialogHeader>
          {mappingForm && (
            <div className="grid gap-3 text-xs">
              <div>
                <p className="font-semibold text-muted-foreground uppercase text-[10px]">Proceso Operativo</p>
                <p className="font-bold text-sm text-primary">{mappingForm.process_code}</p>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground uppercase text-[10px]">Rol en el Asiento</p>
                <p className="font-mono font-medium">{mappingForm.role_code}</p>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground uppercase text-[10px]">Descripción</p>
                <p className="text-muted-foreground">{mappingForm.description}</p>
              </div>
              <div>
                <label className="font-semibold uppercase text-[10px] block mb-1">
                  Código de Cuenta PCGE 2019 *
                </label>
                <Input
                  placeholder="ej. 12121, 40111, 20111"
                  value={mappingForm.account_code}
                  onChange={(e) => setMappingForm({ ...mappingForm, account_code: e.target.value.trim() })}
                  className="font-mono font-bold"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Debe ser una cuenta válida del catálogo PCGE 2019 oficial de SUNAT.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (mappingForm) {
                  mappingMutation.mutate({
                    process_code: mappingForm.process_code,
                    role_code: mappingForm.role_code,
                    account_code: mappingForm.account_code,
                  });
                }
              }}
              disabled={mappingMutation.isPending || !mappingForm?.account_code}
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" /> Guardar Asignación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}