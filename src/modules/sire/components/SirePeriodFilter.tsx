import { Input } from '@/components/ui';
import { getPeriodFeedback, getRucFeedback } from '../validators/sireSchema';

interface Props {
  period: string;
  companyRuc: string;
  disabled: boolean;
  showFeedback: boolean;
  onPeriodChange: (value: string) => void;
}

export const SirePeriodFilter = ({
  period,
  companyRuc,
  disabled,
  showFeedback,
  onPeriodChange,
}: Props) => {
  const periodFeedback = showFeedback ? getPeriodFeedback(period) : null;
  const rucFeedback = showFeedback ? getRucFeedback(companyRuc) : null;

  return (
    <div className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-2">
      <label className="space-y-1.5 text-sm font-medium">
        Período (YYYYMM)
        <Input
          aria-label="Período (YYYYMM)"
          inputMode="numeric"
          maxLength={6}
          placeholder="202610"
          value={period}
          disabled={disabled}
          onChange={(event) => onPeriodChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
          aria-invalid={!!periodFeedback}
        />
        {periodFeedback && <span className="block text-xs text-amber-700">{periodFeedback}</span>}
      </label>
      <div aria-label="RUC de la empresa autenticada" className="space-y-1.5 text-sm">
        <p className="font-medium">RUC de la empresa autenticada</p>
        <p className="rounded-lg border bg-muted/30 px-3 py-2">{companyRuc || 'No disponible en la sesión'}</p>
        {rucFeedback && <p role="alert" className="text-xs text-destructive">{rucFeedback}</p>}
      </div>
    </div>
  );
};
