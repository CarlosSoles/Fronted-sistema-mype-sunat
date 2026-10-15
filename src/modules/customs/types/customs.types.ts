export interface DuaInput {
  numeroDua: string;
  regimenAduanero: 'IMPORTACION_CONSUMO' | 'ADMISIÓN_TEMPORAL';
  valorFob: number;
  flete: number;
  seguro: number;
  tasaAdValorem: number; // Porcentaje (ej. 0%, 4%, 6%, 11%)
  aplicaPercepcion: boolean;
  tasaPercepcion?: number; // 3.5% o 5%
}

export interface DuaCalculationResult {
  valorCif: number;
  adValorem: number;
  igvAduanero: number; // 16%
  ipmAduanero: number; // 2%
  percepcionMonto: number;
  totalTributosAduaneros: number;
  costoTotalLandedCost: number;
}

export interface KardexMovement {
  id: string;
  codigoProducto: string;
  descripcion: string;
  fecha: string;
  tipoOperacion: 'IMPORTACION_DUA' | 'VENTA_LOCAL' | 'AJUSTE_INVENTARIO';
  documentoReferencia: string;
  cantidadEntrada: number;
  cantidadSalida: number;
  saldoCantidad: number;
  costoUnitario: number;
  costoTotal: number;
}
