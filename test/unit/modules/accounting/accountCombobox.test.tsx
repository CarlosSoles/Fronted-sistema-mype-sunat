import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountCombobox } from '@/modules/accounting/components/AccountCombobox';
import type { AccountingAccount } from '@/modules/accounting/types/accounting.types';

afterEach(() => cleanup());

const cuenta = (
  code: string,
  name: string,
  parentCode: string | null,
  isActive = true,
): AccountingAccount => ({
  code,
  name,
  element: 'Activo',
  nature: 'Deudora',
  parentCode,
  level: code.length,
  isActive,
});

const CUENTAS: AccountingAccount[] = [
  cuenta('1', 'Activo', null),
  cuenta('10', 'Efectivo y equivalentes', '1'),
  cuenta('101', 'Caja', '10'),
  cuenta('1011', 'Caja principal', '101'),
  cuenta('12', 'Cuentas por cobrar', '1'),
  cuenta('1212', 'Emitidas en cartera', '12', false),
];

describe('AccountCombobox', () => {
  it('muestra el camino jerárquico de cada cuenta', async () => {
    render(<AccountCombobox idPrefijo="t" accounts={CUENTAS} value="" onChange={() => {}} />);

    await userEvent.setup().click(screen.getByRole('combobox'));
    // El camino son los ancestros, de la raíz a la cuenta padre.
    expect(screen.getByText('1 Activo › 10 Efectivo y equivalentes › 101 Caja')).toBeTruthy();
  });

  it('marca las cuentas inactivas', async () => {
    render(<AccountCombobox idPrefijo="t" accounts={CUENTAS} value="" onChange={() => {}} />);

    await userEvent.setup().type(screen.getByRole('combobox'), 'cartera');
    expect(screen.getByText('Inactiva')).toBeTruthy();
  });

  it('busca sin distinguir tildes ni mayúsculas', async () => {
    render(<AccountCombobox idPrefijo="t" accounts={CUENTAS} value="" onChange={() => {}} />);

    // "CAJA" debe encontrar "Caja" y "Caja principal".
    await userEvent.setup().type(screen.getByRole('combobox'), 'CAJA');
    expect(screen.getByText('Caja')).toBeTruthy();
    expect(screen.getByText('Caja principal')).toBeTruthy();
  });

  it('avisa cuando hay más resultados que el límite', async () => {
    const muchas = Array.from({ length: 60 }, (_, indice) =>
      cuenta(`9${String(indice).padStart(3, '0')}`, `Cuenta ${indice}`, '9'),
    );
    const conRaiz = [cuenta('9', 'Raíz', null), ...muchas];
    render(<AccountCombobox idPrefijo="t" accounts={conRaiz} value="" onChange={() => {}} />);

    await userEvent.setup().click(screen.getByRole('combobox'));
    expect(screen.getByText(/Mostrando 50 de 61/)).toBeTruthy();
  });

  it('notifica la cuenta elegida', async () => {
    let elegida = '';
    render(
      <AccountCombobox idPrefijo="t" accounts={CUENTAS} value="" onChange={(code) => { elegida = code; }} />,
    );

    await userEvent.setup().click(screen.getByRole('combobox'));
    await userEvent.setup().click(screen.getByText('Caja principal'));

    expect(elegida).toBe('1011');
  });
});
