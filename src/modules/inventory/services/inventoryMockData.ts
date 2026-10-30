import {
  type StockSummaryResponse,
  type KardexLedgerResponse,
  type InventoryMovement,
  type InventoryBookObligation,
} from '../types/inventory.types';
import { type PleExportFormData } from '../validators/pleExportSchema';

export const mockStockBalances: StockSummaryResponse = {
  totalValuationPen: 166314.0,
  totalItemsCount: 80,
  balances: [
    {
      id: 'bal-demo-1',
      sku: 'LAP-001',
      description: 'Laptop Intel i7 16GB 512GB SSD (Nacionalizada)',
      warehouseCode: 'ALM-01',
      currentStock: 80,
      sunatUnitCode: 'NIU',
      averageUnitCost: 2078.925,
      totalInventoryValue: 166314.0,
      lastMovementAt: '2026-10-20T14:30:00.000Z',
    },
  ],
};

export const getMockKardex = (sku: string): KardexLedgerResponse => ({
  product: {
    id: 'prod-demo-1',
    sku: (sku || 'LAP-001').toUpperCase(),
    description: 'Laptop Intel i7 16GB 512GB SSD (Importación Régimen 10)',
    sunatTypeCode: '01',
    sunatUnitCode: 'NIU',
  },
  movements: [
    {
      id: 'mov-1',
      warehouseCode: 'ALM-01',
      sku: (sku || 'LAP-001').toUpperCase(),
      description: 'Laptop Intel i7 16GB 512GB SSD',
      movementNumber: 'MOV-2026-0001',
      movementDate: '2026-10-16',
      operationTypeCode: '18',
      documentTypeCode: '50',
      documentSerial: '118',
      documentNumber: '2026-10-048291',
      direction: 'ENTRADA',
      quantity: 100,
      unitCost: 2078.925,
      totalCost: 207892.5,
      previousStock: 0,
      resultingStock: 100,
      resultingAverageCost: 2078.925,
      resultingTotalValue: 207892.5,
    },
    {
      id: 'mov-2',
      warehouseCode: 'ALM-01',
      sku: (sku || 'LAP-001').toUpperCase(),
      description: 'Laptop Intel i7 16GB 512GB SSD',
      movementNumber: 'MOV-2026-0002',
      movementDate: '2026-10-20',
      operationTypeCode: '01',
      documentTypeCode: '01',
      documentSerial: 'F001',
      documentNumber: '00001245',
      direction: 'SALIDA',
      quantity: 20,
      unitCost: 2078.925,
      totalCost: 41578.5,
      previousStock: 100,
      resultingStock: 80,
      resultingAverageCost: 2078.925,
      resultingTotalValue: 166314.0,
    },
  ],
});

export const mockMovementsList: { total: number; items: InventoryMovement[] } = {
  total: 2,
  items: [
    {
      id: 'mov-1',
      warehouseCode: 'ALM-01',
      sku: 'LAP-001',
      description: 'Laptop Intel i7 16GB 512GB SSD',
      movementNumber: 'MOV-2026-0001',
      movementDate: '2026-10-16',
      operationTypeCode: '18',
      documentTypeCode: '50',
      documentSerial: '118',
      documentNumber: '2026-10-048291',
      direction: 'ENTRADA',
      quantity: 100,
      unitCost: 2078.925,
      totalCost: 207892.5,
      previousStock: 0,
      resultingStock: 100,
      resultingAverageCost: 2078.925,
      resultingTotalValue: 207892.5,
    },
    {
      id: 'mov-2',
      warehouseCode: 'ALM-01',
      sku: 'LAP-001',
      description: 'Laptop Intel i7 16GB 512GB SSD',
      movementNumber: 'MOV-2026-0002',
      movementDate: '2026-10-20',
      operationTypeCode: '01',
      documentTypeCode: '01',
      documentSerial: 'F001',
      documentNumber: '00001245',
      direction: 'SALIDA',
      quantity: 20,
      unitCost: 2078.925,
      totalCost: 41578.5,
      previousStock: 100,
      resultingStock: 80,
      resultingAverageCost: 2078.925,
      resultingTotalValue: 166314.0,
    },
  ],
};

export const evaluateLocalObligation = (
  uit: number,
  fiscalYear: number,
  regime: string
): InventoryBookObligation => {
  let ple12_1Status: 'OBLIGATORIO' | 'EXCEPTUADO' | 'VOLUNTARIO' = 'EXCEPTUADO';
  let ple13_1Status: 'OBLIGATORIO' | 'EXCEPTUADO' | 'VOLUNTARIO' = 'EXCEPTUADO';
  let legalBasisNotes = '';

  if (uit <= 300) {
    legalBasisNotes =
      'Art. 35 LIR: Hasta 300 UIT solo obliga a inventario físico al cierre. Exceptuado de PLE 12.1 y 13.1.';
  } else if (uit <= 500) {
    ple12_1Status = 'OBLIGATORIO';
    legalBasisNotes =
      'Art. 35 inc. a) LIR: Más de 300 hasta 500 UIT obliga a Registro en Unidades Físicas (PLE 12.1).';
  } else if (uit <= 1500) {
    ple13_1Status = 'OBLIGATORIO';
    legalBasisNotes =
      'Art. 35 inc. b) LIR: Más de 500 hasta 1,500 UIT obliga a Kardex Permanente Valorizado (PLE 13.1).';
  } else {
    ple13_1Status = 'OBLIGATORIO';
    legalBasisNotes =
      'Art. 35 LIR: Más de 1,500 UIT obliga a Contabilidad de Costos y Kardex Valorizado (PLE 13.1).';
  }

  return {
    companyId: 'company-demo',
    fiscalYear,
    annualRevenueUit: uit,
    taxRegime: regime,
    ple12_1Status,
    ple13_1Status,
    legalBasisNotes,
  };
};

export const generateFallbackPle = (payload: PleExportFormData) => {
  const bookCode = payload.book_type === '12.1' ? '120100' : '130100';
  const fileName = `LE20601012341${payload.fiscal_year}00${bookCode}001111.txt`;
  let content = '';

  if (payload.book_type === '13.1') {
    content =
      `${payload.fiscal_year}0000|CUO-001|M00001|0000||01|LAP-001||16/10/${payload.fiscal_year}|50|118|048291|18|Laptop Intel i7 16GB|NIU|2|100.0000|2078.9250|207892.50|0.0000|0.0000|0.00|100.0000|2078.9250|207892.50|1|\r\n` +
      `${payload.fiscal_year}0000|CUO-002|M00002|0000||01|LAP-001||20/10/${payload.fiscal_year}|01|F001|00001245|01|Laptop Intel i7 16GB|NIU|2|0.0000|0.0000|0.00|20.0000|2078.9250|41578.50|80.0000|2078.9250|166314.00|1|`;
  } else {
    content =
      `${payload.fiscal_year}0000|CUO-001|M00001|0000||01|LAP-001||16/10/${payload.fiscal_year}|50|118|048291|18|Laptop Intel i7 16GB|NIU|100.0000|0.0000|100.0000|1|\r\n` +
      `${payload.fiscal_year}0000|CUO-002|M00002|0000||01|LAP-001||20/10/${payload.fiscal_year}|01|F001|00001245|01|Laptop Intel i7 16GB|NIU|0.0000|20.0000|80.0000|1|`;
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  return { blob, fileName, recordsCount: 2 };
};
