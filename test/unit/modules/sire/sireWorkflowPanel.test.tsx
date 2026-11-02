import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { SireWorkflowPanel } from '@/modules/sire/components/SireWorkflowPanel';

afterEach(cleanup);

describe('SireWorkflowPanel', () => {
  it('muestra selectores, estado inicial, pestañas y estado vacío sin inventar datos', () => {
    render(<SireWorkflowPanel initialRuc="20123456789" />);

    expect(screen.getByText('Borrador')).toBeInTheDocument();
    expect(screen.getByLabelText('RUC de la propuesta')).toHaveValue('20123456789');
    expect(screen.getByRole('tab', { name: 'Propuesta' })).toBeInTheDocument();
    expect(screen.getByText('No hay propuesta consultada para este RUC y periodo.')).toBeInTheDocument();
    expect(screen.getByText(/No hay tickets pendientes\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aceptar Propuesta Completa' })).toBeDisabled();
  });

  it('permite cambiar de pestaña y conserva estados vacíos', async () => {
    const { getByRole } = render(<SireWorkflowPanel initialRuc="" />);

    fireEvent.click(getByRole('tab', { name: 'Preliminar' }));
    await waitFor(() => expect(screen.getByText(/No hay registros en el preliminar para este periodo\./)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Registrar Preliminar' })).toBeDisabled();
  });
});
