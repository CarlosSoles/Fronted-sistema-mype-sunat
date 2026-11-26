import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PartnerFormDialog } from '@/modules/customs/components/PartnerFormDialog';
import type { BusinessPartnerRecord } from '@/modules/customs/services/masterDataApi';

afterEach(cleanup);

describe('PartnerFormDialog: Estandarización de Proveedor del Exterior vs Vista General', () => {
  it('en modo customs (Importaciones), renderiza el formulario estandarizado de 4 secciones y oculta los checkboxes de roles', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <PartnerFormDialog context="customs" onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    // Título y secciones estandarizadas (Imagen 1 y 3)
    expect(screen.getByText('Registrar Proveedor del Exterior')).toBeInTheDocument();
    expect(screen.getByText(/1\. DATOS GENERALES/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. DATOS BANCARIOS INTERNACIONALES/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. LOGÍSTICA DE TRANSPORTE Y EMBARCACIÓN/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. CONTACTO COMERCIAL/i)).toBeInTheDocument();

    // Campos específicos presentes
    expect(screen.getByLabelText(/Razón Social/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/País \(ISO-2\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tax ID \/ Código Fiscal Extranjero/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Términos de Pago/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Vinculación OMC \(Art\. 24\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Dirección en País de Origen/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Banco Receptor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Código SWIFT \/ BIC/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/N° de Cuenta \/ IBAN/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre de Embarcación \/ Buque/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/N° de Viaje \/ Vuelo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/N° Documento Transporte \(BL \/ AWB\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Puerto \/ Ciudad de Origen/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre de Contacto/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email de Contacto/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Teléfono \/ WhatsApp/i)).toBeInTheDocument();

    // Checkboxes de roles de negocio NO deben existir en importaciones
    expect(screen.queryByText(/Roles asignados/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('CLIENTE')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('AGENTE')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('TRANSPORTISTA')).not.toBeInTheDocument();

    // Opciones locales de facturación tampoco deben estar
    expect(screen.queryByText(/Habilitado para venta al crédito/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Admite descuento en ventas/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Indicadores tributarios/i)).not.toBeInTheDocument();

    // Botones estandarizados
    expect(screen.getByRole('button', { name: /Crear Proveedor|Guardar tercero/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();

    qc.clear();
  });

  it('en Clientes y Proveedores (context=billing) con initialRole="IMPORTADOR", muestra el formulario de 4 secciones y conserva roles', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <PartnerFormDialog context="billing" initialRole="IMPORTADOR" onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    // Título estandarizado
    expect(screen.getByText('Registrar Proveedor del Exterior')).toBeInTheDocument();
    expect(screen.getByText(/1\. DATOS GENERALES/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. DATOS BANCARIOS INTERNACIONALES/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. LOGÍSTICA DE TRANSPORTE Y EMBARCACIÓN/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. CONTACTO COMERCIAL/i)).toBeInTheDocument();

    // En vista general sí se muestra la barra de roles para permitir conmutar o asociar roles
    expect(screen.getByText(/Roles asignados/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Crear Proveedor|Guardar tercero/i })).toBeInTheDocument();

    qc.clear();
  });

  it('en vista general, al hacer check en IMPORTADOR conmute dinámicamente al formulario de 4 secciones', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <PartnerFormDialog context="billing" initialRole="CLIENTE" onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    // Comienza en formulario local
    expect(screen.getByText('Nuevo cliente / proveedor')).toBeInTheDocument();
    expect(screen.queryByText(/2\. DATOS BANCARIOS INTERNACIONALES/i)).not.toBeInTheDocument();

    // Marcamos el checkbox IMPORTADOR
    const importadorCheckbox = screen.getByLabelText('IMPORTADOR');
    fireEvent.click(importadorCheckbox);

    // Debe conmutar automáticamente al formulario estandarizado de Proveedor del Exterior
    expect(screen.getByText('Registrar Proveedor del Exterior')).toBeInTheDocument();
    expect(screen.getByText(/1\. DATOS GENERALES/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. DATOS BANCARIOS INTERNACIONALES/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. LOGÍSTICA DE TRANSPORTE Y EMBARCACIÓN/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. CONTACTO COMERCIAL/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Crear Proveedor|Guardar tercero/i })).toBeInTheDocument();

    qc.clear();
  });

  it('en modo billing al editar un tercero que tiene rol IMPORTADOR, muestra "Editar Proveedor del Exterior" y las 4 secciones', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const mockPartner: BusinessPartnerRecord = {
      id: 'partner-123',
      company_id: 'comp-1',
      doc_type: '0',
      doc_number: 'DE301948275',
      legal_name: 'Hamburg Logistics & Spare Parts GmbH',
      country_code: 'DE',
      roles: ['PROVEEDOR', 'IMPORTADOR'],
      is_active: true,
      payment_terms: '60_DIAS',
      currency_code: 'EUR',
    };

    render(
      <QueryClientProvider client={qc}>
        <PartnerFormDialog context="billing" partner={mockPartner} onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Editar Proveedor del Exterior')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actualizar Proveedor' })).toBeInTheDocument();
    expect(screen.getByText(/1\. DATOS GENERALES/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. DATOS BANCARIOS INTERNACIONALES/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. LOGÍSTICA DE TRANSPORTE Y EMBARCACIÓN/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. CONTACTO COMERCIAL/i)).toBeInTheDocument();

    qc.clear();
  });

  it('en modo billing con solo rol CLIENTE, conserva la vista general con los campos de RUC/DNI e indicadores tributarios', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <PartnerFormDialog context="billing" initialRole="CLIENTE" onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    // Título general
    expect(screen.getByText('Nuevo cliente / proveedor')).toBeInTheDocument();

    // Checkboxes de roles de negocio DEBEN estar presentes
    expect(screen.getByText(/Roles asignados/i)).toBeInTheDocument();
    expect(screen.getByText('CLIENTE')).toBeInTheDocument();
    expect(screen.getByText('PROVEEDOR')).toBeInTheDocument();
    expect(screen.getByText('IMPORTADOR')).toBeInTheDocument();
    expect(screen.getByText('AGENTE')).toBeInTheDocument();
    expect(screen.getByText('TRANSPORTISTA')).toBeInTheDocument();

    // Opciones comerciales y tributarias
    expect(screen.getByText(/Habilitado para venta al crédito/i)).toBeInTheDocument();
    expect(screen.getByText(/Admite descuento en ventas/i)).toBeInTheDocument();
    expect(screen.getByText(/Indicadores tributarios/i)).toBeInTheDocument();

    // Botones generales
    expect(screen.getByRole('button', { name: 'Guardar tercero' })).toBeInTheDocument();

    qc.clear();
  });
});
