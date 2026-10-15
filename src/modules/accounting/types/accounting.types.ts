export interface AccountingMovement {
  cuentaContable: string; // Ej: 1212, 40111, 70121
  denominacion: string;
  debe: number;
  haber: number;
}

export interface AccountingEntry {
  id: string;
  numeroAsiento: string;
  fechaContable: string;
  glosa: string;
  totalDebe: number;
  totalHaber: number;
  estaCuadrado: boolean;
  movimientos: AccountingMovement[];
}

export interface PleExportConfig {
  periodo: string; // AAAAMM
  libro: '5.1_DIARIO' | '6.1_MAYOR' | '8.1_COMPRAS' | '14.1_VENTAS';
  indicadorContenido: '1_CON_INFORMACION' | '0_CIERRE_OPERACIONES';
}
