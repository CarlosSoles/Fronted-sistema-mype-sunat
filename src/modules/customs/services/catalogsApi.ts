import { apiClient } from '@/lib/axios';
import { type ForeignSupplierSummary, type CustomsBrokerSummary } from '../types';

export interface CustomsOfficeItem {
  code: string;
  name: string;
  is_active: boolean;
}

export interface BankItem {
  code: string;
  name: string;
}

export interface VuceEntityItem {
  code: string;
  name: string;
  sector: string;
}

export const CUSTOMS_OFFICES: CustomsOfficeItem[] = [
  { code: '118', name: 'Marítima del Callao', is_active: true },
  { code: '235', name: 'Aérea del Callao', is_active: true },
  { code: '370', name: 'Chancay', is_active: true },
  { code: '046', name: 'Paita', is_active: true },
  { code: '019', name: 'Tumbes', is_active: true },
  { code: '172', name: 'Ilo', is_active: true },
  { code: '181', name: 'Matarani (Mollendo)', is_active: true },
  { code: '217', name: 'Salaverry', is_active: true },
  { code: '127', name: 'Pisco', is_active: true },
  { code: '055', name: 'Chimbote', is_active: true },
  { code: '145', name: 'Iquitos', is_active: true },
  { code: '028', name: 'Tacna', is_active: true },
  { code: '082', name: 'Puno', is_active: true },
  { code: '091', name: 'Cusco', is_active: true },
  { code: '262', name: 'Desaguadero', is_active: true },
  { code: '280', name: 'Puerto Maldonado', is_active: true },
  { code: '299', name: 'Tarapoto', is_active: true },
];

export const AUTHORIZED_BANKS: BankItem[] = [
  { code: '002', name: 'Banco de Crédito del Perú (BCP)' },
  { code: '011', name: 'BBVA Perú' },
  { code: '003', name: 'Interbank' },
  { code: '009', name: 'Scotiabank Perú' },
  { code: '018', name: 'Banco de la Nación' },
];

export const VUCE_ENTITIES: VuceEntityItem[] = [
  { code: '08', name: 'MTC', sector: 'Telecomunicaciones e internamiento de equipos Wi-Fi' },
  { code: '03', name: 'DIGEMID', sector: 'Medicamentos, cosméticos y dispositivos médicos' },
  { code: '04', name: 'DIGESA', sector: 'Alimentos elaborados, bebidas y juguetes' },
  { code: '05', name: 'SENASA', sector: 'Sanidad agraria y pecuaria' },
  { code: '02', name: 'SUCAMEC', sector: 'Armas, municiones y explosivos' },
  { code: '17', name: 'PRODUCE', sector: 'Insumos químicos y productos industriales' },
  { code: '28', name: 'SANIPES', sector: 'Recursos hidrobiológicos y pesqueros' },
];

/**
 * Tabla de Porcentajes Promedio de Seguro (TPPS) de SUNAT por capítulo arancelario
 */
export const TPPS_BY_CHAPTER: Record<string, number> = {
  '84': 0.75, // Computadoras, reactores nucleares, calderas, aparatos mecánicos
  '85': 0.75, // Máquinas, aparatos y material eléctrico, telefonía
  '87': 1.00, // Vehículos automóviles, tractores
  '90': 0.75, // Instrumentos y aparatos de óptica, fotografía, médico-quirúrgicos
  '39': 1.50, // Materias plásticas y sus manufacturas
  '73': 1.50, // Manufacturas de fundición, hierro o acero
  DEFAULT: 1.50,
};

export const catalogsApi = {
  getCustomsOffices: () => CUSTOMS_OFFICES,
  getAuthorizedBanks: () => AUTHORIZED_BANKS,
  getVuceEntities: () => VUCE_ENTITIES,
  getTppsRate: (hsCode: string): number => {
    const chapter = hsCode.substring(0, 2);
    return TPPS_BY_CHAPTER[chapter] ?? TPPS_BY_CHAPTER.DEFAULT;
  },

  searchBrokers: async (query?: string): Promise<CustomsBrokerSummary[]> => {
    try {
      const response = await apiClient.get<CustomsBrokerSummary[]>('/customs/catalogs/brokers', {
        params: { q: query },
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      // Fallback local en caso de pruebas offline
      return [
        { id: 'b1', broker_code: '1188', business_name: 'Agencia Aduanera del Callao S.A.C.', mandate_active: true },
        { id: 'b2', broker_code: '2045', business_name: 'Despachos & Aduanas del Pacífico S.A.', mandate_active: true },
      ];
    }
  },

  getForeignSuppliers: async (): Promise<ForeignSupplierSummary[]> => {
    try {
      const response = await apiClient.get<ForeignSupplierSummary[]>('/customs/catalogs/suppliers');
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [
        { id: 's1', business_name: 'Shenzhen Tech Ltd.', country_code: 'CN', tax_id: '91440300MA5' },
        { id: 's2', business_name: 'Global Componentes Inc.', country_code: 'US', tax_id: 'US-98745612' },
        { id: 's3', business_name: 'Hamburg Logistics GmbH', country_code: 'DE', tax_id: 'DE-849201' },
      ];
    }
  },
};
