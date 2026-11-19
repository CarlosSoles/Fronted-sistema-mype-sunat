import { apiClient } from '@/lib/axios';
import { masterDataApi } from './masterDataApi';
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

export interface CountryItem {
  code: string;
  name: string;
  flag?: string;
}

/**
 * Tabla legal de Porcentajes Promedio de Seguro (TPPS) de SUNAT por capítulo arancelario.
 * Regla de cálculo aduanero oficial según procedimiento DESPA-PG.01.
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
  /** Obtiene las aduanas operativas desde la Base de Datos */
  getCustomsOffices: async (): Promise<CustomsOfficeItem[]> => {
    const response = await apiClient.get<CustomsOfficeItem[]>('/customs/catalogs/offices');
    return Array.isArray(response.data) ? response.data : [];
  },

  /** Obtiene los bancos autorizados para teledespacho desde la Base de Datos */
  getAuthorizedBanks: async (): Promise<BankItem[]> => {
    const response = await apiClient.get<BankItem[]>('/customs/catalogs/banks');
    return Array.isArray(response.data) ? response.data : [];
  },

  /** Obtiene las entidades de control previo VUCE desde la Base de Datos */
  getVuceEntities: async (): Promise<VuceEntityItem[]> => {
    const response = await apiClient.get<VuceEntityItem[]>('/customs/catalogs/vuce-entities');
    return Array.isArray(response.data) ? response.data : [];
  },

  /** Obtiene los países desde la Base de Datos */
  getCountries: async (): Promise<CountryItem[]> => {
    const data = await masterDataApi.getCountries();
    return Array.isArray(data)
      ? data.map((c) => ({
          code: c.code,
          name: c.name,
          flag: '🌐',
        }))
      : [];
  },

  /** Tasa legal de seguro TPPS según subpartida nacional */
  getTppsRate: (hsCode: string): number => {
    const chapter = hsCode.substring(0, 2);
    return TPPS_BY_CHAPTER[chapter] ?? TPPS_BY_CHAPTER.DEFAULT;
  },

  /** Búsqueda de agentes de aduana autorizados desde la Base de Datos */
  searchBrokers: async (query?: string): Promise<CustomsBrokerSummary[]> => {
    const response = await apiClient.get<CustomsBrokerSummary[]>('/customs/catalogs/brokers', {
      params: { q: query },
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  /** Proveedores internacionales registrados en la Base de Datos */
  getForeignSuppliers: async (): Promise<ForeignSupplierSummary[]> => {
    const response = await apiClient.get<ForeignSupplierSummary[]>('/customs/suppliers');
    return Array.isArray(response.data) ? response.data : [];
  },

  createForeignSupplier: async (
    payload: Record<string, unknown>,
  ): Promise<ForeignSupplierSummary> => {
    const response = await apiClient.post<ForeignSupplierSummary>('/customs/suppliers', payload);
    return response.data;
  },

  updateForeignSupplier: async (
    id: string,
    payload: Record<string, unknown>,
  ): Promise<ForeignSupplierSummary> => {
    const response = await apiClient.put<ForeignSupplierSummary>(`/customs/suppliers/${id}`, payload);
    return response.data;
  },

  deleteForeignSupplier: async (id: string): Promise<void> => {
    await apiClient.delete(`/customs/suppliers/${id}`);
  },

  getPorts: async (type?: string) => {
    return masterDataApi.getPorts(type);
  },
};
