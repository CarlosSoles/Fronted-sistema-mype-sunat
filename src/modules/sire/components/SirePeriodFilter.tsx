import {
  Button,
  FilterBar,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { type SireBookType } from '../types/sire.types';
interface Props {
  period: string;
  bookType: SireBookType;
  isFetching: boolean;
  onPeriodChange: (period: string) => void;
  onBookTypeChange: (bookType: SireBookType) => void;
  onApply: () => void;
}
const periods = Array.from({ length: 12 }, (_, index) => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - index);
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
});

const isBookType = (value: string): value is SireBookType =>
  value === 'RVIE_VENTAS' || value === 'RCE_COMPRAS';

export const SirePeriodFilter = ({
  period,
  bookType,
  isFetching,
  onPeriodChange,
  onBookTypeChange,
  onApply,
}: Props) => (
  <FilterBar>
    <Select value={period} onValueChange={onPeriodChange}>
      <SelectTrigger aria-label="Período fiscal"><SelectValue /></SelectTrigger>
      <SelectContent>
        {periods.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
      </SelectContent>
    </Select>
    <Select
      value={bookType}
      onValueChange={(value) => {
        if (isBookType(value)) onBookTypeChange(value);
      }}
    >
      <SelectTrigger aria-label="Libro electrónico"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="RVIE_VENTAS">RVIE - Ventas</SelectItem>
        <SelectItem value="RCE_COMPRAS">RCE - Compras</SelectItem>
      </SelectContent>
    </Select>
    <Button type="button" onClick={onApply} disabled={isFetching}>Consultar</Button>
  </FilterBar>
);
