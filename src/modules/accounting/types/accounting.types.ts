export interface AccountingMovement {
  cuentaContable: string; // Ej: 1212, 40111, 70121
  denominacion: string;
  debe: number;
  haber: number;
}

export interface AccountingEntry {
  id: string;
  period?: string;
  entryNumber?: number;
  numeroAsiento?: string;
  fechaContable?: string;
  entryDate?: string;
  glosa: string;
  observation?: string | null;
  responsible?: string | null;
  journalCode?: string | null;
  sourceModule?: string;
  createdAt?: string;
  status?: 'BORRADOR' | 'ASENTADO' | 'ANULADO';
  totalDebe?: number;
  totalHaber?: number;
  estaCuadrado?: boolean;
  lines?: Array<{ accountCode: string; accountName: string; debitAmount: number; creditAmount: number }>;
  movimientos?: AccountingMovement[];
}

export interface AccountingAccount {
  code: string;
  name: string;
  element: string;
  nature: 'Deudora' | 'Acreedora';
  parentCode: string | null;
  level: number;
  isActive: boolean;
}

/**
 * Cuenta del mapeo contable global de la empresa.
 *
 * El backend devuelve los defaults del AccountingMappingService y los
 * reemplaza por la cuenta guardada de la empresa cuando existe. `isCustom`
 * indica si la empresa ya personalizó ese proceso/rol.
 */
export interface AccountingGlobalMapping {
  processCode: string;
  roleCode: string;
  accountCode: string;
  description: string;
  isCustom: boolean;
}

/** Respuesta al editar una cuenta: incluye la cascada y los avisos. */
export interface UpdateAccountResponse {
  account: AccountingAccount;
  /** Subcuentas activadas o desactivadas junto con la cuenta. */
  descendientesAfectados: number;
  /** Avisos que no impiden la operación (reglas, tesorería). */
  advertencias: string[];
}

export interface AccountingPeriod {
  companyId: string;
  period: string; // YYYY-MM
  year: number;
  month: number;
  status: 'ABIERTO' | 'CERRADO';
  openedAt: string;
  closedAt?: string | null;
}

/** Vista previa del asiento de cierre anual. */
export interface ClosingPreview {
  year: number;
  totalIngresos: number;
  totalGastos: number;
  resultado: number;
  tipo: 'UTILIDAD' | 'PÉRDIDA' | 'SIN RESULTADO';
  lineas: Array<{ accountCode: string; accountName: string; debitAmount: number; creditAmount: number }>;
  tieneAsientoCierre: boolean;
}

export interface AccountingLineInput {
  lineOrder: number;
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
}

export interface CreateAccountingEntryInput {
  period: string;
  entryDate: string;
  glosa: string;
  sourceModule: string;
  /** Clave estable para que el reintento no duplique el asiento. */
  idempotencyKey?: string;
  lines: AccountingLineInput[];
}

export interface LedgerMovement {
  entryId: string;
  entryNumber: number;
  entryDate: string;
  glosa: string;
  sourceModule: string;
  /** Documento que originó el asiento (factura, DAM, etc.), si lo hay. */
  sourceReferenceId?: string | null;
  accountCode: string;
  accountName: string;
  /** Estado del asiento: ANULADO se marca en el mayor. */
  status?: 'BORRADOR' | 'ASENTADO' | 'ANULADO';
  debit: number;
  credit: number;
  saldo: number;
}

export interface LedgerResponse {
  period: string;
  accountCode: string;
  accountName: string;
  nature: string;
  openingBalance: number;
  movements: LedgerMovement[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  /** Subcuentas incluidas cuando se consulta una cuenta de mayor. */
  subcuentas?: string[];
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  /** Saldo que venía de períodos anteriores (deudor positivo). */
  openingBalance?: number;
  debit: number;
  credit: number;
  balance: number;
}

export interface TrialBalanceResponse {
  period: string;
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  /** Saldo de arrastre de los períodos anteriores (opcional: backend antiguo). */
  totalOpening?: number;
  totalBalance?: number;
}

export interface IncomeStatementLine {
  accountCode: string;
  accountName: string;
  amount: number;
}

export interface BalanceSheetLine {
  accountCode: string;
  accountName: string;
  amount: number;
}

export interface IncomeStatementGroup {
  key: 'ingresos' | 'costoVentas' | 'gastosOperativos';
  label: string;
  lines: IncomeStatementLine[];
  total: number;
}

export interface IncomeStatementResponse {
  period: string;
  groups: IncomeStatementGroup[];
  ingresos: number;
  costoVentas: number;
  gastosOperativos: number;
  resultadoBruto: number;
  resultadoOperativo: number;
}

export interface BalanceSheetGroup {
  key: 'activo' | 'pasivo' | 'patrimonio';
  label: string;
  lines: BalanceSheetLine[];
  total: number;
}

export interface BalanceSheetResponse {
  period: string;
  activo: BalanceSheetGroup;
  pasivo: BalanceSheetGroup;
  patrimonio: BalanceSheetGroup;
  resultadoEjercicio: number;
  totalActivo: number;
  totalPatrimonio: number;
  totalPasivoPatrimonio: number;
  cuadra: boolean;
}

export interface PleExportConfig {
  periodo: string; // AAAAMM
  libro: '5.1_DIARIO' | '6.1_MAYOR' | '8.1_COMPRAS' | '14.1_VENTAS';
  indicadorContenido: '1_CON_INFORMACION' | '0_CIERRE_OPERACIONES';
}
