/**
 * Normaliza el rol en el borde de sesión.
 *
 * El backend puede devolver el nombre visible ("Administrador") o el código en
 * minúsculas; los permisos y rutas comparan códigos técnicos en mayúsculas.
 * Los alias no crean roles nuevos.
 */
export const normalizeRoleCode = (code: string): string => {
  const value = (code ?? '').trim().toUpperCase();
  if (value === 'ADMINISTRADOR') return 'ADMIN';
  if (value === 'ACCOUNTANT') return 'CONTADOR';
  if (value === 'OPERATOR') return 'OPERADOR_FACTURACION';
  return value;
};
