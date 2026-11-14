import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import {
  AccountDistributionEditor,
  toDistributionPayload,
  type DistributionRow,
} from '@/modules/accounting/components/AccountDistributionEditor';

const CUENTAS = [
  { code: '63111', name: 'Servicios de terceros' },
  { code: '63421', name: 'Fletes' },
];

function Wrapper({ total = 100, inicial = [] as DistributionRow[], onChange }: {
  total?: number;
  inicial?: DistributionRow[];
  onChange?: (rows: DistributionRow[]) => void;
}) {
  const [rows, setRows] = useState<DistributionRow[]>(inicial);
  return (
    <AccountDistributionEditor
      label="Distribución de la base"
      total={total}
      accounts={CUENTAS}
      rows={rows}
      onChange={(nuevas) => { setRows(nuevas); onChange?.(nuevas); }}
    />
  );
}

describe('AccountDistributionEditor', () => {
  afterEach(cleanup);

  it('avisa que sin reparto se usa la cuenta de las reglas', () => {
    render(<Wrapper />);
    expect(screen.getByText(/se contabiliza en la cuenta de las reglas/i)).toBeTruthy();
  });

  it('agrega una línea y deja elegir cuenta e importe', () => {
    const onChange = vi.fn();
    render(<Wrapper onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Agregar cuenta' }));
    expect(onChange).toHaveBeenCalledWith([{ accountCode: '', amount: '' }]);
  });

  it('calcula cuánto falta para cuadrar el reparto', () => {
    const { container } = render(
      <Wrapper total={100} inicial={[{ accountCode: '63111', amount: '60' }]} />,
    );
    const texto = container.textContent ?? '';
    expect(texto).toMatch(/Repartido .* de /);
    expect(texto).toMatch(/faltan/);
  });

  it('marca el reparto como cuadrado cuando suma el total', () => {
    const { container } = render(
      <Wrapper
        total={100}
        inicial={[
          { accountCode: '63111', amount: '60' },
          { accountCode: '63421', amount: '40' },
        ]}
      />,
    );
    expect(container.textContent).toContain('cuadra');
  });

  it('convierte las filas al contrato del backend ignorando vacías', () => {
    expect(
      toDistributionPayload([
        { accountCode: '63111', amount: '60' },
        { accountCode: '', amount: '10' },
        { accountCode: '63421', amount: '0' },
      ]),
    ).toEqual([{ accountCode: '63111', amount: 60 }]);
  });
});
