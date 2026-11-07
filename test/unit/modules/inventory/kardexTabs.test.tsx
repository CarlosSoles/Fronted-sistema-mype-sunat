import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { KardexTabs } from '@/modules/inventory/components/KardexTabs';

describe('KardexTabs', () => {
  it('muestra las tres vistas del único módulo Kardex', () => {
    render(
      <MemoryRouter initialEntries={['/kardex/general']}>
        <KardexTabs />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Kardex general' }).getAttribute('href')).toBe('/kardex/general');
    expect(screen.getByRole('link', { name: 'Por producto' }).getAttribute('href')).toBe('/kardex/producto');
    expect(screen.getByRole('link', { name: 'Libros PLE 12.1 / 13.1' }).getAttribute('href')).toBe('/kardex/ple');
  });
});
