import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type ForeignSupplierSummary } from '../types';
import { catalogsApi } from '../services/catalogsApi';
import { Check } from 'lucide-react';

interface SupplierSelectorProps {
  suppliers: ForeignSupplierSummary[];
  onSuppliersChange: (updated: ForeignSupplierSummary[]) => void;
  selectedSupplierId: string;
  onSelectSupplier: (id: string) => void;
  countryCode?: string;
  errorMessage?: string;
}

const vacio = {
  businessName: '', taxId: '', address: '', email: '', phone: '', contactName: '',
  paymentTerms: '', bankName: '', bankAccount: '', swiftCode: '',
  vesselName: '', voyageNumber: '', blNumber: '', portOrigin: '',
};

export const SupplierSelector: React.FC<SupplierSelectorProps> = ({
  suppliers, onSuppliersChange, selectedSupplierId, onSelectSupplier,
  countryCode = 'CN', errorMessage,
}) => {
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState(vacio);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cambiar = (campo: keyof typeof form, valor: string) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const guardar = async () => {
    if (form.businessName.trim().length < 2) return;
    setGuardando(true);
    setError('');
    try {
      const nuevo = await catalogsApi.createForeignSupplier({
        businessName: form.businessName.trim(),
        taxId: form.taxId.trim() || undefined,
        countryCode,
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
      });
      onSuppliersChange([nuevo, ...suppliers.filter((s) => s.id !== nuevo.id)]);
      onSelectSupplier(nuevo.id);
      setForm(vacio);
      setAbierto(false);
    } catch {
      setError('No se pudo guardar el proveedor. Revisa la conexión.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <label className="font-medium text-foreground block">Proveedor del Exterior <span className="text-red-500">*</span></label>
        <button type="button" onClick={() => setAbierto(!abierto)} className="text-[10px] text-primary hover:underline font-semibold">
          {abierto ? '✕ Cancelar' : '+ Nuevo Proveedor'}
        </button>
      </div>

      {abierto ? (
        <div className="space-y-2 rounded-md border p-2">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Razón social *" value={form.businessName} onChange={(e) => cambiar('businessName', e.target.value)} className="h-8 text-xs" />
            <Input placeholder="Tax ID" value={form.taxId} onChange={(e) => cambiar('taxId', e.target.value)} className="h-8 text-xs" />
            <Input placeholder="Dirección" value={form.address} onChange={(e) => cambiar('address', e.target.value)} className="h-8 text-xs" />
            <Input placeholder="Contacto" value={form.contactName} onChange={(e) => cambiar('contactName', e.target.value)} className="h-8 text-xs" />
            <Input placeholder="Email" value={form.email} onChange={(e) => cambiar('email', e.target.value)} className="h-8 text-xs" />
            <Input placeholder="Teléfono" value={form.phone} onChange={(e) => cambiar('phone', e.target.value)} className="h-8 text-xs" />
            <Input placeholder="Banco" value={form.bankName} onChange={(e) => cambiar('bankName', e.target.value)} className="h-8 text-xs" />
            <Input placeholder="Cuenta bancaria" value={form.bankAccount} onChange={(e) => cambiar('bankAccount', e.target.value)} className="h-8 text-xs" />
            <Input placeholder="SWIFT" value={form.swiftCode} onChange={(e) => cambiar('swiftCode', e.target.value)} className="h-8 text-xs" />
            <Input placeholder="Condición de pago" value={form.paymentTerms} onChange={(e) => cambiar('paymentTerms', e.target.value)} className="h-8 text-xs" />
            <Input placeholder="Buque" value={form.vesselName} onChange={(e) => cambiar('vesselName', e.target.value)} className="h-8 text-xs" />
            <Input placeholder="Viaje" value={form.voyageNumber} onChange={(e) => cambiar('voyageNumber', e.target.value)} className="h-8 text-xs" />
            <Input placeholder="BL / Guía" value={form.blNumber} onChange={(e) => cambiar('blNumber', e.target.value)} className="h-8 text-xs" />
            <Input placeholder="Puerto de origen" value={form.portOrigin} onChange={(e) => cambiar('portOrigin', e.target.value)} className="h-8 text-xs" />
          </div>
          {error && <p className="text-[11px] text-red-500">{error}</p>}
          <Button type="button" size="sm" onClick={() => void guardar()} disabled={guardando} className="h-8 text-xs">
            <Check className="h-3.5 w-3.5 mr-1" /> {guardando ? 'Guardando…' : 'Guardar proveedor'}
          </Button>
        </div>
      ) : (
        <select value={selectedSupplierId} onChange={(e) => onSelectSupplier(e.target.value)} className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background font-medium">
          <option value="">Seleccionar proveedor…</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.business_name} ({s.tax_id ?? 'sin Tax ID'})</option>)}
        </select>
      )}
      {errorMessage && <p className="text-[11px] text-red-500 mt-0.5">{errorMessage}</p>}
    </div>
  );
};
