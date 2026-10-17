import {
  Card,
  PageText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { formatCurrency, formatDateToPeru } from '@/lib/formatters';
import { type SireVoucher } from '../types/sire.types';
import { MatchStatusBadge } from './MatchStatusBadge';

interface Props {
  vouchers: SireVoucher[];
  isLoading: boolean;
}

export const SireVouchersTable = ({ vouchers, isLoading }: Props) => (
  <Card flush>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Comprobante</TableHead>
          <TableHead>Emisor</TableHead>
          <TableHead>Fecha de emisión</TableHead>
          <TableHead align="right">Monto SUNAT</TableHead>
          <TableHead align="right">Monto ERP</TableHead>
          <TableHead align="center">Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow><TableCell colSpan={6} align="center">Consultando propuesta SIRE...</TableCell></TableRow>
        ) : vouchers.length ? (
          vouchers.map((voucher) => (
            <TableRow key={voucher.id}>
              <TableCell>{voucher.serie}-{voucher.numero}</TableCell>
              <TableCell>
                <PageText as="span" variant="label">{voucher.emisorRazonSocial}</PageText>
                <PageText as="span" variant="caption">RUC: {voucher.emisorRuc}</PageText>
              </TableCell>
              <TableCell>{formatDateToPeru(voucher.fechaEmision)}</TableCell>
              <TableCell align="right">{formatCurrency(voucher.montoSunat, 'PEN')}</TableCell>
              <TableCell align="right">
                {voucher.montoLocal === undefined ? '-' : formatCurrency(voucher.montoLocal, 'PEN')}
              </TableCell>
              <TableCell align="center"><MatchStatusBadge status={voucher.matchStatus} /></TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow><TableCell colSpan={6} align="center">No hay comprobantes para este período.</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  </Card>
);
