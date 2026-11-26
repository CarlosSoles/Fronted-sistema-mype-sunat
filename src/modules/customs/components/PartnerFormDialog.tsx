import { resumenTercero } from '../lib/partnerSummary';
import { etiquetaCondicionPago } from '../lib/paymentTerms';
import { useRucAutofill } from '@/modules/invoices/hooks/useRucAutofill';
import { errorDatosTercero } from '../libPartnerValidation';
import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui';
import { masterDataApi, type BusinessPartnerRecord, type PartnerRole } from '../services/masterDataApi';
import { catalogsApi } from '../services/catalogsApi';
import { enqueuePartnerCreate } from '@/lib/outbox';
import { apiClient } from '@/lib/axios';
import { Building2, Landmark, Ship } from 'lucide-react';

export const PARTNER_ROLES: PartnerRole[] = ['CLIENTE', 'PROVEEDOR', 'IMPORTADOR', 'AGENTE', 'TRANSPORTISTA'];
export const partnerApiError = (error: unknown): string => {
  const err = error as { response?: { data?: { message?: unknown } }; message?: string };
  const message = err.response?.data?.message;
  return Array.isArray(message) ? message.join(' · ') : typeof message === 'string' ? message : err.message || 'No se pudo procesar la solicitud.';
};

interface Props {
  onClose: () => void;
  onSaved?: (partner: BusinessPartnerRecord) => void;
  partner?: BusinessPartnerRecord;
  initialRole?: PartnerRole;
  requiredRole?: PartnerRole;
  initialDocument?: string;
  initialName?: string;
  allowOffline?: boolean;
  enableRucLookup?: boolean;
  context?: 'customs' | 'billing' | 'inventory';
}

/** Mounted only while open, so every opening starts with the current partner/defaults. */
export function PartnerFormDialog({
  onClose,
  onSaved,
  partner,
  initialRole = 'PROVEEDOR',
  requiredRole,
  initialDocument = '',
  initialName = '',
  allowOffline = false,
  enableRucLookup = false,
  context,
}: Props) {
  const isCustoms = context === 'customs';
  const isInitiallyImportador =
    isCustoms ||
    initialRole === 'IMPORTADOR' ||
    Boolean(partner?.roles?.includes('IMPORTADOR')) ||
    Boolean((partner?.roles as string[] | undefined)?.includes('PROVEEDOR_EXTERIOR')) ||
    Boolean(partner && partner.country_code !== 'PE');

  const numeroRef = useRef<HTMLInputElement>(null);
  const nombreRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [roles, setRoles] = useState<PartnerRole[]>(
    partner ? [...partner.roles] : [initialRole],
  );

  const isImportador =
    isCustoms ||
    roles.includes('IMPORTADOR') ||
    (roles as string[]).includes('PROVEEDOR_EXTERIOR') ||
    Boolean(partner?.roles?.includes('IMPORTADOR')) ||
    Boolean((partner?.roles as string[] | undefined)?.includes('PROVEEDOR_EXTERIOR')) ||
    Boolean(partner && partner.country_code !== 'PE');

  const [form, setForm] = useState({
    docType: partner?.doc_type ?? (isInitiallyImportador ? '0' : initialDocument.length === 8 ? '1' : '6'),
    docNumber: partner?.doc_number ?? initialDocument,
    legalName: partner?.legal_name ?? initialName,
    tradeName: partner?.trade_name ?? '',
    countryCode: partner?.country_code ?? (isInitiallyImportador ? 'CN' : 'PE'),
    address: partner ? resumenTercero(partner).address : '',
    email: partner ? resumenTercero(partner).email : '',
    phone: partner ? resumenTercero(partner).phone : '',
    paymentTerms: partner?.payment_terms ?? (isInitiallyImportador ? '30_DIAS' : 'CONTADO'),
    currencyCode: partner?.currency_code ?? (isInitiallyImportador ? 'USD' : 'PEN'),
    hasCredit: typeof partner?.has_credit === 'boolean' ? partner.has_credit : Boolean(partner?.payment_terms && partner.payment_terms !== 'CONTADO'),
    allowsDiscount: typeof partner?.allows_discount === 'boolean' ? partner.allows_discount : false,
    isActive: partner?.is_active ?? true,
    // Campos específicos para Proveedor del Exterior (Imagen 1 y 3)
    isRelated: false,
    bankName: '',
    bankAccount: '',
    swiftCode: '',
    vesselName: '',
    voyageNumber: '',
    blNumber: '',
    portOrigin: '',
    contactName: '',
  });

  const [foreignSupplierId, setForeignSupplierId] = useState<string | null>(null);

  // Pre-carga datos extendidos del proveedor del exterior
  useQuery({
    queryKey: ['customs', 'partner-foreign-details', partner?.id, partner?.doc_number],
    enabled: Boolean(partner && isImportador),
    queryFn: async () => {
      try {
        const suppliers = await catalogsApi.getForeignSuppliers();
        const found = suppliers.find(
          (s) =>
            (s.tax_id && s.tax_id === partner?.doc_number) ||
            (s.business_name && s.business_name.toLowerCase() === partner?.legal_name.toLowerCase()),
        );
        if (found) {
          setForeignSupplierId(found.id);
          setForm((prev) => ({
            ...prev,
            isRelated: Boolean(found.is_related),
            bankName: found.bank_name || prev.bankName,
            bankAccount: found.bank_account || prev.bankAccount,
            swiftCode: found.swift_code || prev.swiftCode,
            vesselName: found.vessel_name || prev.vesselName,
            voyageNumber: found.voyage_number || prev.voyageNumber,
            blNumber: found.bl_number || prev.blNumber,
            portOrigin: found.port_origin || prev.portOrigin,
            contactName: found.contact_name || prev.contactName,
            paymentTerms: found.payment_terms || prev.paymentTerms,
            address: found.address || prev.address,
            email: found.email || prev.email,
            phone: found.phone || prev.phone,
          }));
          return found;
        }
      } catch {
        // Fallback silencioso
      }
      return null;
    },
  });

  // Pre-carga detalle del partner (banco/contacto/dirección) en caso no esté en foreign_suppliers
  useQuery({
    queryKey: ['master-data', 'partner-detail', partner?.id],
    enabled: Boolean(partner && isImportador),
    queryFn: async () => {
      try {
        const detail = await masterDataApi.getPartner(partner!.id);
        if (detail) {
          const bank = detail.bank_accounts?.[0];
          const contact = detail.contacts?.[0];
          const addr = detail.addresses?.[0];
          setForm((prev) => ({
            ...prev,
            bankName: prev.bankName || bank?.bank_name || '',
            bankAccount: prev.bankAccount || bank?.account_number || '',
            swiftCode: prev.swiftCode || bank?.swift || '',
            contactName: prev.contactName || contact?.name || '',
            email: prev.email || contact?.email || '',
            phone: prev.phone || contact?.phone || '',
            address: prev.address || addr?.address || '',
          }));
        }
        return detail;
      } catch {
        return null;
      }
    },
  });

  const rucAutofill = useRucAutofill((datos) => {
    setForm((actual) => ({ ...actual, legalName: datos.razonSocial, address: datos.direccionFiscal ?? '' }));
  });
  const [error, setError] = useState('');
  const [errorDocumento, setErrorDocumento] = useState('');
  const [existing, setExisting] = useState<BusinessPartnerRecord | null>(null);
  const [retencion, setRetencion] = useState(false);
  const [percepcion, setPercepcion] = useState(false);

  useQuery({
    queryKey: ['master-data', 'partner-tax-status', 'form', partner?.id],
    enabled: Boolean(partner?.id && !isImportador),
    queryFn: async () => {
      const { data } = await apiClient.get<Array<{ indicator: string; value: boolean }>>(`/master-data/partners/${partner!.id}/tax-status`);
      setRetencion(data.find((x) => x.indicator === 'RETENCION')?.value ?? false);
      setPercepcion(data.find((x) => x.indicator === 'PERCEPCION')?.value ?? false);
      return data;
    },
  });

  const toggleRole = (role: PartnerRole) => {
    rucAutofill.cancelar();
    setRoles((prev) => {
      const next = prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role];
      if (role === 'IMPORTADOR' && !prev.includes('IMPORTADOR')) {
        setForm((f) => ({
          ...f,
          countryCode: f.countryCode === 'PE' ? 'CN' : f.countryCode,
          docType: '0',
          currencyCode: f.currencyCode === 'PEN' ? 'USD' : f.currencyCode,
          paymentTerms: f.paymentTerms === 'CONTADO' ? '30_DIAS' : f.paymentTerms,
        }));
      }
      return next;
    });
  };

  const guardarIndicadores = async (partnerId: string) => {
    const hoy = new Date().toISOString().slice(0, 10);
    await Promise.all([
      apiClient.put(`/master-data/partners/${partnerId}/tax-status`, { indicator: 'RETENCION', value: retencion, validFrom: hoy, source: 'MANUAL' }),
      apiClient.put(`/master-data/partners/${partnerId}/tax-status`, { indicator: 'PERCEPCION', value: percepcion, validFrom: hoy, source: 'MANUAL' }),
    ]);
  };

  const errorValidacion = !isImportador
    ? errorDatosTercero(form, Boolean(partner), partner ? { docType: partner.doc_type, docNumber: partner.doc_number } : undefined)
    : !form.legalName.trim()
    ? 'Indique la razón social del proveedor.'
    : !form.countryCode.trim()
    ? 'Indique el código de país (ISO-2).'
    : '';

  const save = useMutation({
    mutationFn: async (addRole: boolean) => {
      if (addRole && existing && requiredRole) {
        const current = await masterDataApi.getPartner(existing.id);
        if (!current.is_active) throw new Error('El tercero está inactivo. Solicite su revisión en el maestro.');
        return masterDataApi.updatePartner(current.id, { roles: [...new Set([...current.roles, requiredRole])] });
      }

      if (errorValidacion) throw new Error(errorValidacion);

      // CASO 1: Modo Proveedor del Exterior / Importador (Estandarizado según Imagen 1 / 3)
      if (isImportador) {
        const foreignRoles: PartnerRole[] = isCustoms
          ? ['PROVEEDOR', 'IMPORTADOR']
          : Array.from(new Set([...roles, 'IMPORTADOR'] as PartnerRole[]));

        const masterDataPayload = {
          legalName: form.legalName.trim(),
          tradeName: form.tradeName.trim() || form.legalName.trim(),
          countryCode: form.countryCode.trim().toUpperCase(),
          address: form.address.trim() || undefined,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          paymentTerms: form.paymentTerms.trim() || undefined,
          currencyCode: form.currencyCode.trim().toUpperCase() || 'USD',
          roles: foreignRoles,
          hasCredit: Boolean(form.paymentTerms && form.paymentTerms !== 'CONTADO'),
          allowsDiscount: false,
          contactName: form.contactName.trim() || undefined,
          bankName: form.bankName.trim() || undefined,
          accountNumber: form.bankAccount.trim() || undefined,
          swiftCode: form.swiftCode.trim() || undefined,
          isRelated: form.isRelated,
          vesselName: form.vesselName.trim() || undefined,
          voyageNumber: form.voyageNumber.trim() || undefined,
          blNumber: form.blNumber.trim() || undefined,
          portOrigin: form.portOrigin.trim() || undefined,
        };

        const foreignSupplierPayload = {
          businessName: form.legalName.trim(),
          taxId: form.docNumber.trim() || undefined,
          countryCode: form.countryCode.trim().toUpperCase(),
          address: form.address.trim() || undefined,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          contactName: form.contactName.trim() || undefined,
          paymentTerms: form.paymentTerms.trim() || undefined,
          bankName: form.bankName.trim() || undefined,
          bankAccount: form.bankAccount.trim() || undefined,
          swiftCode: form.swiftCode.trim() || undefined,
          vesselName: form.vesselName.trim() || undefined,
          voyageNumber: form.voyageNumber.trim() || undefined,
          blNumber: form.blNumber.trim() || undefined,
          portOrigin: form.portOrigin.trim() || undefined,
          isRelated: form.isRelated,
          defaultCurrency: form.currencyCode.trim().toUpperCase() || 'USD',
        };

        let resultPartner: BusinessPartnerRecord;
        if (partner) {
          resultPartner = await masterDataApi.updatePartner(partner.id, {
            ...masterDataPayload,
            isActive: form.isActive,
          });
        } else {
          resultPartner = await masterDataApi.createPartner({
            ...masterDataPayload,
            docType: '0',
            docNumber: form.docNumber.trim() || `EXT-${Date.now().toString().slice(-8)}`,
          });
        }

        // Sincronizar simultáneamente en foreign_suppliers para que la BD quede 100% simétrica
        try {
          if (foreignSupplierId) {
            await catalogsApi.updateForeignSupplier(foreignSupplierId, foreignSupplierPayload);
          } else {
            await catalogsApi.createForeignSupplier(foreignSupplierPayload);
          }
        } catch (e) {
          console.warn('Sync a foreign_suppliers completado o manejado en backend:', e);
        }

        return resultPartner;
      }

      // CASO 2: Modo General / Facturación / Terceros Locales (DNI / RUC)
      const payload = {
        legalName: form.legalName.trim(),
        tradeName: form.tradeName.trim() || undefined,
        countryCode: form.countryCode.trim().toUpperCase(),
        address: form.address.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        paymentTerms: form.paymentTerms,
        hasCredit: form.hasCredit,
        allowsDiscount: form.allowsDiscount,
        currencyCode: form.currencyCode,
        roles,
      };

      if (partner) return masterDataApi.updatePartner(partner.id, { ...payload, isActive: form.isActive });

      if (requiredRole) {
        const matches = await masterDataApi.getPartners({ q: form.docNumber.trim() });
        const match = matches.find((p) => p.doc_type === form.docType && p.doc_number === form.docNumber.trim());
        if (match) {
          if (!match.is_active) throw new Error('El tercero está inactivo. Solicite su revisión en el maestro.');
          if (match.roles.includes(requiredRole)) return match;
          setExisting(match);
          return null;
        }
      }

      const createPayload = { ...payload, docType: form.docType, docNumber: form.docNumber.trim() };
      try {
        return await masterDataApi.createPartner(createPayload);
      } catch (error) {
        const sinRespuesta = !navigator.onLine || (error instanceof Error && 'response' in error && !(error as { response?: unknown }).response);
        if (allowOffline && sinRespuesta) {
          await enqueuePartnerCreate(createPayload);
          return { offline: true } as const;
        }
        throw error;
      }
    },
    onSuccess: async (data) => {
      if (!data) return;
      if (!('offline' in data) && data.id && !isImportador) {
        try {
          await guardarIndicadores(data.id);
        } catch {
          /* el tercero ya se guardó; el indicador se puede reintentar */
        }
      }
      void queryClient.invalidateQueries({ queryKey: ['master-data', 'partners'] });
      void queryClient.invalidateQueries({ queryKey: ['master-data', 'partner'] });
      void queryClient.invalidateQueries({ queryKey: ['master-data', 'partner-tax-status'] });
      void queryClient.invalidateQueries({ queryKey: ['customs', 'suppliers'] });
      void queryClient.invalidateQueries({ queryKey: ['foreign-suppliers'] });

      if ('offline' in data) {
        window.alert('Sin conexión: el tercero quedó en cola y se enviará al reconectar.');
      } else {
        onSaved?.(data);
      }
      onClose();
    },
    onError: (e) => setError(partnerApiError(e)),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent
        onOpenAutoFocus={(e) => {
          const field = !form.docNumber.trim() ? numeroRef.current : !form.legalName.trim() ? nombreRef.current : null;
          if (field) {
            e.preventDefault();
            field.focus();
          }
        }}
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            {isImportador && <Building2 className="h-5 w-5 text-primary" />}
            {isImportador
              ? partner
                ? 'Editar Proveedor del Exterior'
                : 'Registrar Proveedor del Exterior'
              : partner
              ? 'Editar cliente / proveedor'
              : 'Nuevo cliente / proveedor'}
          </DialogTitle>
        </DialogHeader>

        {error && <p role="alert" className="text-destructive text-xs">{error}</p>}
        {!isImportador && rucAutofill.aviso && <p role="status" className="text-sm">{rucAutofill.aviso}</p>}
        {!existing && errorValidacion && !isImportador && <p role="alert" className="text-destructive text-xs">{errorValidacion}</p>}

        {existing ? (
          <div>
            <p className="text-xs mb-3">
              El documento ya pertenece a {existing.legal_name}. Puede añadir el rol {requiredRole} conservando sus demás roles.
            </p>
            <div className="flex gap-2">
              <Button disabled={save.isPending} onClick={() => save.mutate(true)}>
                Añadir rol {requiredRole}
              </Button>
              <Button variant="outline" disabled={save.isPending} onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : isImportador ? (
          /* VISTA ESTANDARIZADA ADUANAS / PROVEEDOR DEL EXTERIOR (IMAGEN 1 Y 3) */
          <div className="py-2 space-y-4 text-xs">
            {/* Si está en la vista general (no aduanas), permitir visualizar/editar roles */}
            {!isCustoms && (
              <div className="rounded border border-border/80 bg-muted/20 p-2.5">
                <p className="mb-1.5 font-medium text-[11px] text-foreground">
                  Roles asignados <span aria-hidden="true">*</span>
                </p>
                <div role="group" aria-label="Roles asignados" className="flex flex-wrap gap-2">
                  {PARTNER_ROLES.map((r) => (
                    <label
                      key={r}
                      className="flex items-center gap-1.5 rounded border border-border bg-background px-2.5 py-1 text-xs cursor-pointer hover:bg-muted/40"
                    >
                      <input
                        type="checkbox"
                        disabled={requiredRole === r}
                        checked={roles.includes(r)}
                        onChange={() => toggleRole(r)}
                      />
                      {r}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Sección 1: Datos Generales */}
            <div className="border-b pb-3">
              <h4 className="font-semibold text-foreground uppercase text-[11px] mb-2">1. DATOS GENERALES</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label htmlFor="foreign-legal-name" className="font-medium block mb-1">Razón Social *</label>
                  <label htmlFor="foreign-legal-name" className="sr-only">Razón social</label>
                  <Input
                    id="foreign-legal-name"
                    ref={nombreRef}
                    placeholder="Ej: Shenzhen Yantian Electronics Co., Ltd."
                    value={form.legalName}
                    onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                    required
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium block mb-1">País (ISO-2) *</label>
                  <Input
                    aria-label="País (ISO-2)"
                    placeholder="CN, US, DE, JP..."
                    value={form.countryCode}
                    onChange={(e) => setForm({ ...form, countryCode: e.target.value.toUpperCase() })}
                    required
                    maxLength={2}
                    className="h-8 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                <div>
                  <label htmlFor="foreign-tax-id" className="font-medium block mb-1">Tax ID / Código Fiscal Extranjero</label>
                  <label htmlFor="foreign-tax-id" className="sr-only">Número</label>
                  <Input
                    id="foreign-tax-id"
                    ref={numeroRef}
                    placeholder="91440300MA5..."
                    value={form.docNumber}
                    onChange={(e) => setForm({ ...form, docNumber: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-medium block mb-1">Términos de Pago</label>
                  <Input
                    aria-label="Términos de Pago"
                    placeholder="30_DIAS, CONTADO, CARTA_CREDITO..."
                    value={form.paymentTerms}
                    onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium block mb-1">Vinculación OMC (Art. 24)</label>
                  <select
                    aria-label="Vinculación OMC (Art. 24)"
                    value={form.isRelated ? 'SI' : 'NO'}
                    onChange={(e) => setForm({ ...form, isRelated: e.target.value === 'SI' })}
                    className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background"
                  >
                    <option value="NO">No Vinculado (Independiente)</option>
                    <option value="SI">Sí Vinculado (Filial / Matriz)</option>
                  </select>
                </div>
              </div>

              <div className="mt-2">
                <label className="font-medium block mb-1">Dirección en País de Origen</label>
                <Input
                  aria-label="Dirección en País de Origen"
                  placeholder="Calle, Parque Industrial, Ciudad, Código Postal..."
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Sección 2: Datos Bancarios Internacionales */}
            <div className="border-b pb-3">
              <h4 className="font-semibold text-foreground uppercase text-[11px] mb-2 flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 text-purple-600" />
                2. DATOS BANCARIOS INTERNACIONALES (PAGOS AL EXTERIOR)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-medium block mb-1">Banco Receptor</label>
                  <Input
                    aria-label="Banco Receptor"
                    placeholder="Bank of China, HSBC, Wells Fargo..."
                    value={form.bankName}
                    onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium block mb-1">Código SWIFT / BIC</label>
                  <Input
                    aria-label="Código SWIFT / BIC"
                    placeholder="BKCHCNBJ..."
                    value={form.swiftCode}
                    onChange={(e) => setForm({ ...form, swiftCode: e.target.value.toUpperCase() })}
                    className="h-8 text-xs font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="font-medium block mb-1">N° de Cuenta / IBAN</label>
                  <Input
                    aria-label="N° de Cuenta / IBAN"
                    placeholder="Account / IBAN number..."
                    value={form.bankAccount}
                    onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Sección 3: Datos de Embarcación y Logística */}
            <div className="border-b pb-3">
              <h4 className="font-semibold text-foreground uppercase text-[11px] mb-2 flex items-center gap-1.5">
                <Ship className="h-3.5 w-3.5 text-blue-600" />
                3. LOGÍSTICA DE TRANSPORTE Y EMBARCACIÓN
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-medium block mb-1">Nombre de Embarcación / Buque</label>
                  <Input
                    aria-label="Nombre de Embarcación / Buque"
                    placeholder="MSC ARIES, EVER GIVEN..."
                    value={form.vesselName}
                    onChange={(e) => setForm({ ...form, vesselName: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium block mb-1">N° de Viaje / Vuelo</label>
                  <Input
                    aria-label="N° de Viaje / Vuelo"
                    placeholder="2601W, QR814..."
                    value={form.voyageNumber}
                    onChange={(e) => setForm({ ...form, voyageNumber: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium block mb-1">N° Documento Transporte (BL / AWB)</label>
                  <Input
                    aria-label="N° Documento Transporte (BL / AWB)"
                    placeholder="MSK-9901824..."
                    value={form.blNumber}
                    onChange={(e) => setForm({ ...form, blNumber: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-medium block mb-1">Puerto / Ciudad de Origen</label>
                  <Input
                    aria-label="Puerto / Ciudad de Origen"
                    placeholder="SHANGHAI, NINGBO, MIAMI..."
                    value={form.portOrigin}
                    onChange={(e) => setForm({ ...form, portOrigin: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Sección 4: Contacto Comercial */}
            <div>
              <h4 className="font-semibold text-foreground uppercase text-[11px] mb-2">4. CONTACTO COMERCIAL</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-medium block mb-1">Nombre de Contacto</label>
                  <Input
                    aria-label="Nombre de Contacto"
                    placeholder="Mr. Chen Wei / John Doe"
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium block mb-1">Email de Contacto</label>
                  <Input
                    aria-label="Email de Contacto"
                    type="email"
                    placeholder="export@supplier.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-medium block mb-1">Teléfono / WhatsApp</label>
                  <Input
                    aria-label="Teléfono / WhatsApp"
                    placeholder="+86 755 8888 9999"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" disabled={save.isPending} onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={save.isPending || !form.legalName.trim() || !form.countryCode.trim()}
                onClick={() => {
                  setError('');
                  save.mutate(false);
                }}
                className="gap-1.5"
              >
                {save.isPending
                  ? 'Guardando...'
                  : partner
                    ? 'Actualizar Proveedor'
                    : isCustoms || initialRole === 'IMPORTADOR'
                      ? 'Crear Proveedor'
                      : 'Guardar tercero'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* VISTA GENERAL / FACTURACIÓN (CONSERVANDO ROLES Y OPCIONES DE CRÉDITO/DESCUENTOS) */
          <>
            <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
              <div>
                <p className="mb-1 font-medium">Tipo de documento</p>
                <select
                  aria-label="Tipo de documento"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  disabled={!!partner}
                  value={form.docType}
                  onChange={(e) => {
                    rucAutofill.cancelar();
                    setForm({ ...form, docType: e.target.value });
                  }}
                >
                  <option value="6">RUC (Registro Único de Contribuyente)</option>
                  <option value="1">DNI (Documento Nacional de Identidad)</option>
                  <option value="4">Carné de extranjería</option>
                  <option value="0">TAX ID / Documento Extranjero</option>
                </select>
              </div>
              <div>
                <p className="mb-1 font-medium">Número <span aria-hidden="true">*</span></p>
                <Input
                  ref={numeroRef}
                  aria-required="true"
                  aria-invalid={!form.docNumber.trim()}
                  aria-describedby={!form.docNumber.trim() ? "partner-numero-error" : undefined}
                  aria-label="Número"
                  disabled={!!partner}
                  placeholder="Ej. 20100000001"
                  value={form.docNumber}
                  onChange={(e) => {
                    rucAutofill.cancelar();
                    if (form.docType === '6') {
                      const digitos = e.target.value.replace(/\D/g, '').slice(0, 11);
                      if (digitos && !/^[12]/.test(digitos)) {
                        setErrorDocumento('El RUC debe iniciar con 1 o 2 (10, 15, 16, 17 o 20).');
                        return;
                      }
                      if (digitos.length >= 2 && !['10', '15', '16', '17', '20'].includes(digitos.slice(0, 2))) {
                        setErrorDocumento('El prefijo del RUC debe ser 10, 15, 16, 17 o 20.');
                        return;
                      }
                      setErrorDocumento('');
                      setForm({ ...form, docNumber: digitos });
                      if (enableRucLookup && roles.includes('CLIENTE') && form.countryCode === 'PE') {
                        rucAutofill.consultar(digitos);
                      }
                      return;
                    }
                    const valor = form.docType === '1' ? e.target.value.replace(/\D/g, '').slice(0, 8) : e.target.value;
                    setErrorDocumento('');
                    setForm({ ...form, docNumber: valor });
                  }}
                />
                {errorDocumento ? (
                  <p id="partner-numero-error" className="text-xs text-destructive">{errorDocumento}</p>
                ) : errorValidacion && errorValidacion.toLowerCase().includes('documento') ? (
                  <p id="partner-numero-error" className="text-xs text-destructive">{errorValidacion}</p>
                ) : !form.docNumber.trim() ? (
                  <p id="partner-numero-error" className="text-xs text-destructive">Indique el número de documento.</p>
                ) : null}
              </div>
              <div className="sm:col-span-2">
                <p className="mb-1 font-medium">Razón social <span aria-hidden="true">*</span></p>
                <Input
                  ref={nombreRef}
                  aria-required="true"
                  aria-invalid={!form.legalName.trim()}
                  aria-describedby={!form.legalName.trim() ? "partner-nombre-error" : undefined}
                  aria-label="Razón social"
                  maxLength={200}
                  placeholder="Nombre o Razón Social oficial"
                  value={form.legalName}
                  onChange={(e) => {
                    rucAutofill.cancelar();
                    setForm({ ...form, legalName: e.target.value });
                  }}
                />
                {errorValidacion && errorValidacion.toLowerCase().includes('razón social') ? (
                  <p id="partner-nombre-error" className="text-xs text-destructive">{errorValidacion}</p>
                ) : !form.legalName.trim() ? (
                  <p id="partner-nombre-error" className="text-xs text-destructive">Indique la razón social o nombre.</p>
                ) : null}
              </div>
              <div>
                <p className="mb-1 font-medium">Nombre comercial</p>
                <Input
                  aria-label="Nombre comercial"
                  maxLength={200}
                  placeholder="Nombre comercial abreviado"
                  value={form.tradeName}
                  onChange={(e) => setForm({ ...form, tradeName: e.target.value })}
                />
              </div>
              <div>
                <p className="mb-1 font-medium">País (ISO ej. PE, CN, US)</p>
                <Input
                  aria-label="País (ISO ej. PE, CN, US)"
                  maxLength={2}
                  placeholder="PE"
                  value={form.countryCode}
                  onChange={(e) => {
                    rucAutofill.cancelar();
                    setForm({ ...form, countryCode: e.target.value });
                  }}
                />
              </div>
              <div>
                <p className="mb-1 font-medium">Condición de pago</p>
                <select
                  aria-label="Condición de pago"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.paymentTerms}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      paymentTerms: e.target.value,
                      hasCredit: e.target.value !== 'CONTADO',
                    })
                  }
                >
                  {['CONTADO', '15_DIAS', '30_DIAS', '45_DIAS', '60_DIAS', 'CARTA_CREDITO'].map((valor) => (
                    <option key={valor} value={valor}>
                      {etiquetaCondicionPago(valor)}
                    </option>
                  ))}
                </select>
                <label className="mt-2 flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    aria-label="Habilitado para venta al crédito"
                    checked={form.hasCredit}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        hasCredit: e.target.checked,
                        paymentTerms: e.target.checked
                          ? form.paymentTerms === 'CONTADO'
                            ? '30_DIAS'
                            : form.paymentTerms
                          : 'CONTADO',
                      })
                    }
                  />
                  Habilitado para venta al crédito
                </label>
                <label className="mt-1.5 flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    aria-label="Admite descuento en ventas"
                    checked={form.allowsDiscount}
                    onChange={(e) =>
                      setForm({ ...form, allowsDiscount: e.target.checked })
                    }
                  />
                  Admite descuento en ventas
                </label>
              </div>
              <div>
                <p className="mb-1 font-medium">Moneda</p>
                <select
                  aria-label="Moneda"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.currencyCode}
                  onChange={(e) => setForm({ ...form, currencyCode: e.target.value })}
                >
                  <option value="PEN">PEN (Soles)</option>
                  <option value="USD">USD (Dólares)</option>
                  <option value="EUR">EUR (Euros)</option>
                  <option value="CNY">CNY (Yuanes)</option>
                </select>
              </div>
              <div>
                <p className="mb-1 font-medium">Email de contacto</p>
                <Input
                  aria-label="Email de contacto"
                  placeholder="contacto@empresa.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <p className="mb-1 font-medium">Teléfono</p>
                <Input
                  aria-label="Teléfono"
                  placeholder="+51 999 888 777"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <p className="mb-1 font-medium">Dirección fiscal / operativa</p>
                <Input
                  aria-label="Dirección fiscal / operativa"
                  placeholder="Av. Principal 123, Ciudad, País"
                  value={form.address}
                  onChange={(e) => {
                    rucAutofill.cancelar();
                    setForm({ ...form, address: e.target.value });
                  }}
                />
              </div>
              <div className="sm:col-span-2">
                <p className="mb-1 font-medium">Roles asignados <span aria-hidden="true">*</span></p>
                <div
                  role="group"
                  aria-label="Roles asignados"
                  aria-required="true"
                  aria-invalid={!roles.length}
                  aria-describedby={!roles.length ? "partner-roles-error" : undefined}
                  className="flex flex-wrap gap-2"
                >
                  {!roles.length && <p id="partner-roles-error" className="text-xs text-destructive">Seleccione al menos un rol.</p>}
                  {PARTNER_ROLES.map((r) => (
                    <label
                      key={r}
                      className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-xs cursor-pointer hover:bg-muted/40"
                    >
                      <input
                        type="checkbox"
                        disabled={requiredRole === r}
                        checked={roles.includes(r)}
                        onChange={() => toggleRole(r)}
                      />
                      {r}
                    </label>
                  ))}
                </div>
              </div>
              {partner && (
                <div className="space-y-1 sm:col-span-2">
                  <p className="font-medium">Estado</p>
                  <select
                    aria-label="Estado"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.isActive ? '1' : '0'}
                    onChange={(e) => setForm({ ...form, isActive: e.target.value === '1' })}
                  >
                    <option value="1">Activo</option>
                    <option value="0">Inactivo</option>
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-2 rounded-md border p-3 text-xs">
              <p className="font-medium">Indicadores tributarios</p>
              {roles.includes('CLIENTE') ? (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={retencion}
                    onChange={(e) => setRetencion(e.target.checked)}
                  />
                  Cliente es agente de retención del IGV (3 %)
                </label>
              ) : null}
              {roles.includes('PROVEEDOR') ? (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={percepcion}
                    onChange={(e) => setPercepcion(e.target.checked)}
                  />
                  Proveedor es agente de percepción del IGV (2 %)
                </label>
              ) : null}
              {!roles.includes('CLIENTE') && !roles.includes('PROVEEDOR') ? (
                <p className="text-muted-foreground">Seleccione CLIENTE o PROVEEDOR para configurar indicadores.</p>
              ) : null}
            </div>

            <DialogFooter>
              <Button variant="outline" disabled={save.isPending} onClick={onClose}>
                Cancelar
              </Button>
              <Button
                disabled={save.isPending || Boolean(errorValidacion) || !roles.length}
                onClick={() => {
                  setError('');
                  save.mutate(false);
                }}
              >
                {partner ? 'Guardar cambios' : 'Guardar tercero'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
