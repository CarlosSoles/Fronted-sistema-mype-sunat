import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { KardexTabs } from '@/modules/inventory/components/KardexTabs';

describe('KardexTabs', () => {
  it('muestra las vistas de Kardex sin PLE', () => {
    render(
      <MemoryRouter initialEntries={['/kardex/general']}>
        <KardexTabs />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Kardex general' }).getAttribute('href')).toBe('/kardex/general');
    expect(screen.getByRole('link', { name: 'Por producto' }).getAttribute('href')).toBe('/kardex/producto');
  });
});
