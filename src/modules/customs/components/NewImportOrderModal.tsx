import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Ship,
  Plus,
  Trash2,
  DollarSign,
  Loader2,
  AlertCircle,
  Building2,
  Anchor,
  ShieldAlert,
  Mail,
  Phone,
  MapPin,
  Search,
} from 'lucide-react';
import {
  importOrdersApi,
  type CreateImportOrderPayload,
} from '../services/importOrdersApi';
import {
  masterDataApi,
  type BusinessPartnerRecord,
  type CountryRecord,
  type PortRecord,
} from '../services/masterDataApi';
import { inventoryApi } from '@/modules/inventory/services/inventoryApi';
import type { InventoryBalance } from '@/modules/inventory/types/inventory.types';

interface OrderItemRow {
  productCode: string;
  description: string;
  hsCode: string;
  quantity: number;
  unitPriceFob: number;
}

interface NewImportOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewImportOrderModal: React.FC<NewImportOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [orderNumber, setOrderNumber] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierCountry, setSupplierCountry] = useState('CN');
  const [supplierTaxId, setSupplierTaxId] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierCondition, setSupplierCondition] = useState('FABRICANTE');
  const [isRelated, setIsRelated] = useState(false);
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [catalogo, setCatalogo] = useState<InventoryBalance[]>([]);
  const [incoterm, setIncoterm] = useState('FOB');
  const [incoterms, setIncoterms] = useState<string[]>([]);
  useEffect(() => {
    const consulta = masterDataApi.getIncoterms?.();
    if (!consulta) return;
    consulta
      .then((data) => setIncoterms(data.filter((i) => i.is_active).map((i) => i.code)))
      .catch(() => setIncoterms([]));
  }, []);
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [transportMode, setTransportMode] = useState('MARITIMO');
  const [portOfOrigin, setPortOfOrigin] = useState('');
  const [portOfDestination, setPortOfDestination] = useState('CALLAO');
  const [estimatedFreight, setEstimatedFreight] = useState(0);
  const [estimatedInsurance, setEstimatedInsurance] = useState(0);
  const [proformaNumber, setProformaNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItemRow[]>([
    { productCode: '', description: '', hsCode: '', quantity: 10, unitPriceFob: 0 },
  ]);

  const [registeredSuppliers, setRegisteredSuppliers] = useState<BusinessPartnerRecord[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('MANUAL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [registeredCurrencies, setRegisteredCurrencies] = useState<string[]>(['USD', 'EUR', 'PEN', 'CNY', 'GBP', 'JPY']);
  const [partnerBankInfo, setPartnerBankInfo] = useState<{ swift?: string; iban?: string; bank_name?: string } | null>(null);
  const [dbCountries, setDbCountries] = useState<CountryRecord[]>([]);
  const [dbPorts, setDbPorts] = useState<PortRecord[]>([]);
  const [isCustomOriginPort, setIsCustomOriginPort] = useState(false);
  const [isCustomDestPort, setIsCustomDestPort] = useState(false);
  const [activeTab, setActiveTab] = useState<'LOGISTICS' | 'ITEMS'>('LOGISTICS');
  const [isCompactTabs, setIsCompactTabs] = useState<boolean>(true);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  // Autofocus al abrir el modal
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        firstFieldRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Cargar catálogo de proveedores registrados, monedas, países y puertos de la BD
  useEffect(() => {
    if (!isOpen) return;
    void inventoryApi.getStockBalances()
      .then((data) => setCatalogo(data.balances ?? []))
      .catch(() => setCatalogo([]));
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      masterDataApi
        .getPartners({ role: 'PROVEEDOR' })
        .then((data) => setRegisteredSuppliers(data || []))
        .catch(() => setRegisteredSuppliers([]));

      masterDataApi
        .getCurrencies?.()
        ?.then((currs) => {
          if (currs && currs.length > 0) {
            setRegisteredCurrencies(currs.filter((c) => c.is_active).map((c) => c.code));
          }
        })
        .catch(() => {});

      masterDataApi
        .getCountries?.()
        ?.then((data) => setDbCountries(data || []))
        .catch(() => {});

      masterDataApi
        .getPorts?.()
        ?.then((data) => {
          setDbPorts(data || []);
          if (data && data.length > 0) {
            const defaultOrigin = data.find((p) => p.type === 'ORIGIN' || p.type === 'BOTH');
            if (defaultOrigin && !portOfOrigin) {
              setPortOfOrigin(defaultOrigin.name.toUpperCase());
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleSelectPartner = (partnerId: string) => {
    setSelectedPartnerId(partnerId);
    if (partnerId === 'MANUAL') {
      setPartnerBankInfo(null);
      return;
    }
    const found = registeredSuppliers.find((p) => p.id === partnerId);
    if (found) {
      setSupplierName(found.legal_name);
      setSupplierCountry(found.country_code || 'CN');
      setSupplierTaxId(found.doc_number || '');
      setSupplierAddress(found.address || '');
      setSupplierEmail(found.email || '');
      setSupplierPhone(found.phone || '');
      if (found.currency_code) {
        setCurrencyCode(found.currency_code);
      }
      if (found.country_code) {
        const countryPort = dbPorts.find(
          (p) => p.country_code === found.country_code && (p.type === 'ORIGIN' || p.type === 'BOTH')
        );
        if (countryPort) {
          setPortOfOrigin(countryPort.name.toUpperCase());
          setIsCustomOriginPort(false);
        }
      }
      // Cargar cuenta bancaria del proveedor si existe
      masterDataApi
        .getPartner(found.id)
        .then((detail) => {
          if (detail.bank_accounts && detail.bank_accounts.length > 0) {
            const defBank = detail.bank_accounts.find((b) => b.is_default) || detail.bank_accounts[0];
            setPartnerBankInfo({
              swift: defBank.swift || undefined,
              iban: defBank.iban || defBank.account_number || undefined,
              bank_name: defBank.bank_name,
            });
          } else {
            setPartnerBankInfo(null);
          }
        })
        .catch(() => setPartnerBankInfo(null));
    }
  };

  // Cálculos en vivo
  const totalFob = items.reduce(
    (acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unitPriceFob) || 0),
    0
  );
  const totalCif = totalFob + (Number(estimatedFreight) || 0) + (Number(estimatedInsurance) || 0);

  const handleAddItem = (autoFocus = false) => {
    const nextIdx = items.length;
    setItems((prev) => [
      ...prev,
      { productCode: '', description: '', hsCode: '', quantity: 1, unitPriceFob: 0 },
    ]);
    if (autoFocus) {
      setTimeout(() => {
        const nextElem =
          document.getElementById(`item-desc-${nextIdx}`) ||
          document.getElementById(`item-qty-${nextIdx}`);
        nextElem?.focus();
      }, 50);
    }
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof OrderItemRow, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!supplierName.trim()) {
      setErrorMessage('La razón social del proveedor del exterior es obligatoria.');
      return;
    }

    const invalidItem = items.find((it) => !it.description.trim() || it.quantity <= 0);
    if (invalidItem) {
      setErrorMessage('Todos los ítems deben tener descripción válida y cantidad > 0.');
      return;
    }

    const payload: CreateImportOrderPayload = {
      orderNumber: orderNumber.trim() || undefined,
      supplierName: supplierName.trim(),
      supplierCountry,
      supplierTaxId: supplierTaxId.trim() || undefined,
      supplierAddress: supplierAddress.trim() || undefined,
      supplierCondition,
      isRelated,
      supplierEmail: supplierEmail.trim() || undefined,
      supplierPhone: supplierPhone.trim() || undefined,
      incoterm,
      currencyCode,
      transportMode,
      portOfOrigin: portOfOrigin.trim() || undefined,
      portOfDestination: portOfDestination.trim() || 'CALLAO',
      estimatedFreight: Number(estimatedFreight) || 0,
      estimatedInsurance: Number(estimatedInsurance) || 0,
      proformaNumber: proformaNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      responsible: 'Operador Comercio Exterior',
      items: items.map((it) => ({
        productCode: it.productCode.trim() || undefined,
        description: it.description.trim(),
        hsCode: it.hsCode.trim() || undefined,
        quantity: Number(it.quantity),
        unitPriceFob: Number(it.unitPriceFob),
      })),
    };

    setIsSubmitting(true);
    try {
      await importOrdersApi.createOrder(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Error al emitir la orden de importación.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Ship className="h-5 w-5 text-primary" />
            Nueva Orden de Compra Internacional
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Emisión de pedido al exterior conforme a Incoterms 2020 (CCI) y normativa de Valoración Aduanera SUNAT (Acuerdo de Valor OMC).
          </p>
        </DialogHeader>

        {errorMessage && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Selector de modo de visualización y pestañas (optimización para laptops) */}
          <div className="flex items-center justify-between border-b border-border/70 pb-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('LOGISTICS')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  !isCompactTabs || activeTab === 'LOGISTICS'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/70 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                1. Proveedor y Logística
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ITEMS')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  isCompactTabs && activeTab === 'ITEMS'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/70 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Ship className="h-3.5 w-3.5" />
                2. Mercancías y Precios ({items.length} {items.length === 1 ? 'ítem' : 'ítems'})
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsCompactTabs(!isCompactTabs)}
              className="text-[11px] text-muted-foreground hover:text-primary underline hidden sm:inline"
              title="Alternar entre modo por pestañas (ideal para laptops) o vista continua completa (monitores grandes)"
            >
              {isCompactTabs ? 'Vista continua (Monitores grandes)' : 'Modo pestañas (Laptop)'}
            </button>
          </div>

          {/* Bloque 1: Proveedor y Logística */}
          {(!isCompactTabs || activeTab === 'LOGISTICS') && (
            <div className="space-y-3">
          {/* Proveedor y Origen */}
          <div className="bg-muted/40 p-3.5 rounded-lg border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
              <h3 className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                <Building2 className="h-4 w-4 text-primary" />
                Proveedor y Origen (Formato B SUNAT / Casillas 3.1 - 3.9)
              </h3>
              {registeredSuppliers.length > 0 && (
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-muted-foreground">Cargar del Catálogo:</span>
                  <select
                    value={selectedPartnerId}
                    onChange={(e) => handleSelectPartner(e.target.value)}
                    className="h-7 text-xs bg-background border rounded px-2 font-medium"
                  >
                    <option value="MANUAL">+ Escribir / Registrar nuevo</option>
                    {registeredSuppliers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.legal_name} ({p.country_code} - {p.doc_number || 'S/N'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Fila 1: Razón Social, Tax ID, País, N° OC */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5">
                <label className="font-medium text-muted-foreground uppercase text-[10px]">
                  Proveedor Extranjero (Razón Social) *
                </label>
                <Input
                  ref={firstFieldRef}
                  placeholder="ej: SHENZHEN TECH ELECTRONICS CO., LTD."
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="mt-1 h-8 text-xs uppercase font-medium"
                  required
                />
              </div>

              <div className="sm:col-span-3">
                <label className="font-medium text-muted-foreground uppercase text-[10px]">
                  Tax ID / TIN Exterior
                </label>
                <Input
                  placeholder="ej: USCI-91440300MA5"
                  value={supplierTaxId}
                  onChange={(e) => setSupplierTaxId(e.target.value)}
                  className="mt-1 h-8 text-xs uppercase font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-medium text-muted-foreground uppercase text-[10px]">
                  País de Origen *
                </label>
                <select
                  value={supplierCountry}
                  onChange={(e) => setSupplierCountry(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1"
                >
                  {dbCountries.length > 0 ? (
                    dbCountries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.code})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="CN">China (CN)</option>
                      <option value="US">Estados Unidos (US)</option>
                      <option value="DE">Alemania (DE)</option>
                      <option value="JP">Japón (JP)</option>
                      <option value="KR">Corea del Sur (KR)</option>
                      <option value="BR">Brasil (BR)</option>
                      <option value="IT">Italia (IT)</option>
                      <option value="ES">España (ES)</option>
                      <option value="MX">México (MX)</option>
                      <option value="IN">India (IN)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="font-medium text-muted-foreground uppercase text-[10px]">
                  N° OC (Opcional)
                </label>
                <Input
                  placeholder="Auto-correlativo"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="mt-1 h-8 text-xs uppercase font-mono"
                />
              </div>
            </div>

            {/* Fila 2: Dirección en el exterior, Condición SUNAT, Vinculación Económica OMC */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
              <div className="sm:col-span-5">
                <label className="font-medium text-muted-foreground uppercase text-[10px] flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  Domicilio / Ciudad en el Exterior
                </label>
                <Input
                  placeholder="ej: High-Tech Industrial Park, Nanshan, Shenzhen"
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="font-medium text-muted-foreground uppercase text-[10px]">
                  Condición Proveedor (Casilla 3.2)
                </label>
                <select
                  value={supplierCondition}
                  onChange={(e) => setSupplierCondition(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1 font-medium"
                >
                  <option value="FABRICANTE">Fabricante / Productor</option>
                  <option value="DISTRIBUIDOR">Distribuidor Oficial</option>
                  <option value="COMERCIANTE">Comerciante / Dealer</option>
                  <option value="BROKER">Intermediario / Broker</option>
                </select>
              </div>

              <div className="sm:col-span-4">
                <label className="font-medium text-muted-foreground uppercase text-[10px] flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3 text-amber-500" />
                  Vinculación Económica (Art. 24 OMC)
                </label>
                <select
                  value={isRelated ? 'SI' : 'NO'}
                  onChange={(e) => setIsRelated(e.target.value === 'SI')}
                  className={`w-full h-8 rounded-md border border-input px-2 text-xs mt-1 font-medium ${
                    isRelated ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold' : 'bg-background'
                  }`}
                >
                  <option value="NO">No Vinculado (Partes Independientes)</option>
                  <option value="SI">Sí Vinculado (Filial / Matriz / Control)</option>
                </select>
              </div>
            </div>

            {/* Fila 3: Contacto (Email, Teléfono) y Banco Internacional */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
              <div className="sm:col-span-4">
                <label className="font-medium text-muted-foreground uppercase text-[10px] flex items-center gap-1">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  Email de Contacto Comercial
                </label>
                <Input
                  type="email"
                  placeholder="sales@shenzhen-tech.cn"
                  value={supplierEmail}
                  onChange={(e) => setSupplierEmail(e.target.value)}
                  className="mt-1 h-8 text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="font-medium text-muted-foreground uppercase text-[10px] flex items-center gap-1">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  Teléfono / WhatsApp
                </label>
                <Input
                  placeholder="+86 755 8888 9999"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  className="mt-1 h-8 text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="font-medium text-muted-foreground uppercase text-[10px] flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-emerald-500" />
                  Banco Exterior (SWIFT / IBAN)
                </label>
                <div className="mt-1 h-8 px-2 rounded-md border bg-muted/60 flex items-center text-[11px] font-mono truncate">
                  {partnerBankInfo ? (
                    <span className="text-emerald-500 font-semibold truncate" title={`${partnerBankInfo.bank_name} - SWIFT: ${partnerBankInfo.swift}`}>
                      SWIFT: {partnerBankInfo.swift || 'N/A'} · {partnerBankInfo.iban || ''}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">Giro bancario directo</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Negociación & Logística */}
          <div className="bg-muted/40 p-3.5 rounded-lg border space-y-2">
            <h3 className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
              <Anchor className="h-4 w-4 text-primary" />
              Términos de Negociación (Incoterms 2020) y Flete
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div>
                <label className="font-medium text-muted-foreground uppercase text-[10px]">Incoterm *</label>
                <select
                  value={incoterm}
                  onChange={(e) => setIncoterm(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1 font-semibold"
                >
                  {(incoterms.length > 0 ? incoterms : [incoterm]).map((inc) => (
                    <option key={inc} value={inc}>
                      {inc} 2020
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-medium text-muted-foreground uppercase text-[10px]">Moneda *</label>
                <select
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1 font-mono font-semibold"
                >
                  {registeredCurrencies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-medium text-muted-foreground uppercase text-[10px]">Transporte *</label>
                <select
                  value={transportMode}
                  onChange={(e) => setTransportMode(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1"
                >
                  <option value="MARITIMO">Marítimo</option>
                  <option value="AEREO">Aéreo</option>
                  <option value="TERRESTRE">Terrestre</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="font-medium text-muted-foreground uppercase text-[10px]">Puerto Origen</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomOriginPort(!isCustomOriginPort)}
                    className="text-[9px] text-primary hover:underline font-mono"
                  >
                    {isCustomOriginPort ? 'Ver lista' : 'Escribir manual'}
                  </button>
                </div>
                {isCustomOriginPort ? (
                  <Input
                    placeholder="ej: SHANGHAI, NINGBO"
                    value={portOfOrigin}
                    onChange={(e) => setPortOfOrigin(e.target.value.toUpperCase())}
                    className="mt-1 h-8 text-xs uppercase"
                  />
                ) : (
                  <select
                    value={portOfOrigin}
                    onChange={(e) => {
                      if (e.target.value === '__CUSTOM__') {
                        setIsCustomOriginPort(true);
                      } else {
                        setPortOfOrigin(e.target.value);
                      }
                    }}
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1 font-medium"
                  >
                    <option value="">Seleccione puerto origen...</option>
                    {dbPorts
                      .filter((p) => p.type === 'ORIGIN' || p.type === 'BOTH')
                      .map((p) => (
                        <option key={p.code} value={p.name.toUpperCase()}>
                          {p.name} ({p.country_code} - {p.code})
                        </option>
                      ))}
                    <option value="__CUSTOM__">+ Otro (Escribir nombre manual)...</option>
                  </select>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="font-medium text-muted-foreground uppercase text-[10px]">Puerto Destino</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomDestPort(!isCustomDestPort)}
                    className="text-[9px] text-primary hover:underline font-mono"
                  >
                    {isCustomDestPort ? 'Ver lista' : 'Escribir manual'}
                  </button>
                </div>
                {isCustomDestPort ? (
                  <Input
                    placeholder="ej: CALLAO, PAITA, CHANCAY"
                    value={portOfDestination}
                    onChange={(e) => setPortOfDestination(e.target.value.toUpperCase())}
                    className="mt-1 h-8 text-xs uppercase"
                  />
                ) : (
                  <select
                    value={portOfDestination}
                    onChange={(e) => {
                      if (e.target.value === '__CUSTOM__') {
                        setIsCustomDestPort(true);
                      } else {
                        setPortOfDestination(e.target.value);
                      }
                    }}
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1 font-medium"
                  >
                    {dbPorts
                      .filter((p) => p.type === 'DESTINATION' || p.type === 'BOTH')
                      .map((p) => (
                        <option key={p.code} value={p.name.toUpperCase()}>
                          {p.name} ({p.country_code} - {p.code})
                        </option>
                      ))}
                    <option value="__CUSTOM__">+ Otro (Escribir nombre manual)...</option>
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
              <div>
                <label className="font-medium text-muted-foreground uppercase text-[10px]">Flete Estimado ({currencyCode})</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={estimatedFreight}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEstimatedFreight(parseFloat(e.target.value) || 0)}
                  className="mt-1 h-8 text-xs font-mono"
                />
              </div>
              <div>
                <label className="font-medium text-muted-foreground uppercase text-[10px]">Seguro Estimado ({currencyCode})</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={estimatedInsurance}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEstimatedInsurance(parseFloat(e.target.value) || 0)}
                  className="mt-1 h-8 text-xs font-mono"
                />
              </div>
              <div>
                <label className="font-medium text-muted-foreground uppercase text-[10px]">N° Proforma</label>
                <Input
                  placeholder="ej: PI-2026-99"
                  value={proformaNumber}
                  onChange={(e) => setProformaNumber(e.target.value)}
                  className="mt-1 h-8 text-xs uppercase font-mono"
                />
              </div>
              <div>
                <label className="font-medium text-muted-foreground uppercase text-[10px]">Observaciones</label>
                <Input
                  placeholder="Términos de entrega, notas..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>
          </div>

          {isCompactTabs && (
            <div className="flex justify-end pt-1">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setActiveTab('ITEMS')}
                className="gap-1.5 text-xs font-semibold"
              >
                Continuar a Mercancías ➔
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Bloque 2: Mercancías y Precios */}
      {(!isCompactTabs || activeTab === 'ITEMS') && (
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div className="flex items-center gap-2">
              {isCompactTabs && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('LOGISTICS')}
                  className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                >
                  ⬅ Volver a Proveedor
                </Button>
              )}
              <h3 className="font-semibold text-foreground text-xs">
                Mercancías y Precios Unitarios FOB ({items.length} {items.length === 1 ? 'ítem' : 'ítems'})
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {/* SKU Quick Search Selector */}
              {catalogo.length > 0 && (
                <div className="relative flex items-center">
                  <Search className="absolute left-2 h-3 w-3 text-muted-foreground pointer-events-none" />
                  <input
                    list="catalog-quick-sku-list"
                    placeholder="Buscar SKU del catálogo…"
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      const found = catalogo.find(
                        (c) => c.sku.toLowerCase() === val.toLowerCase() || `${c.sku} - ${c.description}`.toLowerCase() === val.toLowerCase()
                      );
                      if (found) {
                        const lastItem = items[items.length - 1];
                        const isLastEmpty = !lastItem.productCode && !lastItem.description && Number(lastItem.quantity) === 1 && Number(lastItem.unitPriceFob) === 0;
                        if (isLastEmpty) {
                          handleItemChange(items.length - 1, 'productCode', found.sku);
                          handleItemChange(items.length - 1, 'description', found.description);
                          handleItemChange(items.length - 1, 'hsCode', found.hsCode ?? '');
                        } else {
                          setItems((prev) => [
                            ...prev,
                            {
                              productCode: found.sku,
                              description: found.description,
                              hsCode: found.hsCode ?? '',
                              quantity: 1,
                              unitPriceFob: 0,
                            },
                          ]);
                        }
                        e.target.value = '';
                        setTimeout(() => {
                          const targetIdx = isLastEmpty ? items.length - 1 : items.length;
                          document.getElementById(`item-fob-${targetIdx}`)?.focus();
                        }, 50);
                      }
                    }}
                    className="h-7 w-48 pl-7 pr-2 text-xs rounded-md border border-input bg-background font-mono placeholder:font-sans placeholder:text-muted-foreground"
                  />
                  <datalist id="catalog-quick-sku-list">
                    {catalogo.map((p) => (
                      <option key={`${p.warehouseCode}-${p.sku}`} value={p.sku}>
                        {p.sku} — {p.description}
                      </option>
                    ))}
                  </datalist>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddItem(true)}
                className="h-7 text-xs gap-1 font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar Fila
              </Button>
            </div>
          </div>

          <div className="border rounded-md overflow-x-auto bg-card">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b bg-muted/60 text-muted-foreground uppercase text-[10px]">
                  <th className="p-2 w-28">Código / SKU</th>
                  <th className="p-2">Descripción Arancelaria *</th>
                  <th className="p-2 w-32">Partida (SPN)</th>
                  <th className="p-2 w-24 text-right">Cantidad *</th>
                  <th className="p-2 w-28 text-right">P. Unit FOB *</th>
                  <th className="p-2 w-28 text-right">Total FOB</th>
                  <th className="p-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((it, idx) => {
                  const lineFob = (Number(it.quantity) || 0) * (Number(it.unitPriceFob) || 0);
                  return (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="p-2">
                        <select
                          value={it.productCode}
                          onChange={(e) => {
                            const codigo = e.target.value;
                            const producto = catalogo.find((p) => p.sku === codigo);
                            handleItemChange(idx, 'productCode', codigo);
                            if (producto) {
                              handleItemChange(idx, 'description', producto.description);
                              handleItemChange(idx, 'hsCode', producto.hsCode ?? '');
                            }
                          }}
                          className="h-7 w-full rounded-md border border-input bg-background px-1 text-xs font-mono"
                        >
                          <option value="">Seleccionar SKU…</option>
                          {catalogo.map((p) => (
                            <option key={`${p.warehouseCode}-${p.sku}`} value={p.sku}>
                              {p.sku} — {p.description}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <Input
                          id={`item-desc-${idx}`}
                          placeholder="Descripción comercial y técnica..."
                          value={it.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              document.getElementById(`item-qty-${idx}`)?.focus();
                            }
                          }}
                          className="h-7 text-xs"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          placeholder="8517.13.00.00"
                          value={it.hsCode}
                          onChange={(e) => handleItemChange(idx, 'hsCode', e.target.value)}
                          className="h-7 text-xs font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          id={`item-qty-${idx}`}
                          type="number"
                          min="0.0001"
                          step="any"
                          value={it.quantity}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              document.getElementById(`item-fob-${idx}`)?.focus();
                            }
                          }}
                          className="h-7 text-xs text-right font-mono"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          id={`item-fob-${idx}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={it.unitPriceFob}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleItemChange(idx, 'unitPriceFob', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (idx === items.length - 1) {
                                handleAddItem(true);
                              } else {
                                document.getElementById(`item-desc-${idx + 1}`)?.focus();
                              }
                            }
                          }}
                          className="h-7 text-xs text-right font-mono font-medium"
                          required
                        />
                      </td>
                      <td className="p-2 text-right font-mono font-bold">
                        {currencyCode} {lineFob.toFixed(2)}
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={items.length <= 1}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          title="Eliminar fila"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 pt-1">
            <span>
              💡 <b>Navegación ágil:</b> Presiona <kbd className="px-1 py-0.5 bg-muted rounded border font-mono text-[10px]">Enter</kbd> en el precio para crear una nueva fila automáticamente.
            </span>
            <span>
              Valores numéricos seleccionables al tabular/enfocar.
            </span>
          </div>
        </div>
      )}

          {/* Resumen Totalizador */}
          <div className="bg-muted p-3.5 rounded-lg border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5 text-muted-foreground text-[11px]">
              <div>Total Ítems: <span className="font-bold text-foreground">{items.length}</span></div>
              <div>Moneda de la Operación: <span className="font-bold text-foreground">{currencyCode}</span></div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block">Total FOB</span>
                <span className="font-mono font-bold text-sm">
                  {currencyCode} {totalFob.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block">Flete + Seguro</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {currencyCode} {(Number(estimatedFreight) + Number(estimatedInsurance)).toFixed(2)}
                </span>
              </div>
              <div className="pl-3 border-l">
                <span className="text-[10px] text-primary uppercase font-bold block">Valor CIF Estimado</span>
                <span className="font-mono font-extrabold text-base text-primary">
                  {currencyCode} {totalCif.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5 bg-primary">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Emitiendo Orden...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4" />
                  Emitir Orden de Importación
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
