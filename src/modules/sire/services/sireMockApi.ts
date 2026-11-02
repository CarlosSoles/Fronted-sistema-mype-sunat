import type {
  SireAcceptRequest,
  SirePreliminaryRequest,
  SireRecordActionRequest,
  SireWorkflowRequest,
  SireWorkflowResponse,
} from '../types/sire.types';

const mockRecord = {
  proposalId: 'proposal-001',
  carSunat: 'CAR-MOCK-001',
  emitterRuc: '20123456789',
  documentType: '01' as const,
  series: 'F001',
  correlative: '001',
  issueDate: '2026-11-15',
  taxableBase: 100,
  igvAmount: 18,
  totalAmount: 118,
  origin: 'SUNAT' as const,
  status: 'INCLUIDO',
};

export const createSireMockApi = () => {
  let state: SireWorkflowResponse = {
    ruc: mockRecord.emitterRuc,
    period: '202611',
    bookType: 'RCE_COMPRAS',
    state: 'PROPUESTA',
    ticket: null,
    records: [mockRecord],
    error: null,
  };

  const response = (request: SireWorkflowRequest): SireWorkflowResponse => ({
    ...state,
    ...request,
    records: state.records ? [...state.records] : undefined,
  });

  return {
    getProposal: async (request: SireWorkflowRequest) => response(request),
    getPreliminary: async (request: SireWorkflowRequest) => response(request),
    getGenerated: async (request: SireWorkflowRequest) => response(request),
    exclude: async (request: SireRecordActionRequest) => {
      state = { ...state, state: 'PROCESANDO_PRELIMINAR', ticket: 'TICKET-MOCK-001', status: 'PENDIENTE' };
      return response(request);
    },
    restore: async (request: SireRecordActionRequest) => response(request),
    acceptProposal: async (request: SireAcceptRequest) => {
      state = { ...state, state: 'PROCESANDO_PRELIMINAR', ticket: 'TICKET-MOCK-002', status: 'PENDIENTE' };
      return response(request);
    },
    registerPreliminary: async (request: SirePreliminaryRequest) => {
      state = { ...state, state: 'PROCESANDO_PRELIMINAR', ticket: 'TICKET-MOCK-003', status: 'PENDIENTE', records: request.records };
      return response(request);
    },
    getStatus: async (request: SireWorkflowRequest & { ticket?: string }) => {
      state = { ...state, state: 'CON_PRELIMINAR', status: 'TERMINADO', ticket: request.ticket ?? state.ticket };
      return response(request);
    },
  };
};
