import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customsDeclarationsApi } from '../services/customsDeclarationsApi';
import { catalogsApi } from '../services/catalogsApi';
import {
  type CustomsDeclarationRecord,
  type RegisterDuaWizardPayload,
} from '../types';

const DRAFT_PREFIX = 'customs_dua_wizard_draft_';

export const useDuaWizard = (shipmentId: string) => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const draftKey = `${DRAFT_PREFIX}${shipmentId}`;

  // Carga del borrador persistido en LocalStorage (ISO 9241-110 Tolerancia a fallos)
  const [formData, setFormData] = useState<Partial<RegisterDuaWizardPayload>>(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignorar error de JSON parse
    }
    return {
      shipment_id: shipmentId,
      customs_code: '118',
      declaration_year: new Date().getFullYear(),
      dispatch_mode: '10',
      channel: 'VERDE',
      fob_total_usd: 0,
      freight_total_usd: 0,
      insurance_total_usd: 0,
      exchange_rate: 3.82,
      has_article_160_guarantee: false,
      items: [],
    };
  });

  // Guardado reactivo de borrador
  useEffect(() => {
    if (shipmentId) {
      try {
        localStorage.setItem(draftKey, JSON.stringify(formData));
      } catch {
        // Cuota excedida de LocalStorage
      }
    }
  }, [formData, draftKey, shipmentId]);

  const updateFormData = useCallback((partial: Partial<RegisterDuaWizardPayload>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(draftKey);
  }, [draftKey]);

  // Cálculo rápido de seguro supletorio TPPS si el seguro declarado es 0
  const computeCalculatedInsurance = useCallback(() => {
    if ((formData.insurance_total_usd ?? 0) > 0) {
      return formData.insurance_total_usd ?? 0;
    }
    const items = formData.items ?? [];
    if (items.length === 0) return 0;

    let computed = 0;
    for (const item of items) {
      const tppsRate = catalogsApi.getTppsRate(item.hs_code || '84');
      computed += item.fob_usd * (tppsRate / 100);
    }
    return Number(computed.toFixed(2));
  }, [formData.insurance_total_usd, formData.items]);

  const registerDuaMutation = useMutation<
    CustomsDeclarationRecord,
    Error,
    RegisterDuaWizardPayload
  >({
    mutationFn: customsDeclarationsApi.registerDuaWizard,
    onSuccess: () => {
      clearDraft();
      queryClient.invalidateQueries({ queryKey: ['customs-shipment', shipmentId] });
      queryClient.invalidateQueries({ queryKey: ['customs-declarations'] });
      queryClient.invalidateQueries({ queryKey: ['customs-settlements'] });
    },
  });

  return {
    currentStep,
    setCurrentStep,
    nextStep: () => setCurrentStep((prev) => Math.min(prev + 1, 4)),
    prevStep: () => setCurrentStep((prev) => Math.max(prev - 1, 1)),
    formData,
    updateFormData,
    clearDraft,
    calculatedInsurance: computeCalculatedInsurance(),
    submitDuaWizard: registerDuaMutation.mutateAsync,
    isSubmitting: registerDuaMutation.isPending,
    isSuccess: registerDuaMutation.isSuccess,
    declarationResult: registerDuaMutation.data,
  };
};
