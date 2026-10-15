# Especificación Técnica de Módulo: 04_SIRE (Conciliación Fiscal SIRE)
## Guía Operativa para Desarrolladores y Agentes de IA

**Módulo:** `src/modules/sire/`  
**Responsable Técnico:** Diego Toledo  
**Normativa SUNAT:** R.S. N° 112-2021/SUNAT y R.S. N° 040-2022/SUNAT (Sistema Integrado de Registros Electrónicos)  
**Estatus:** 🔒 VINCULANTE (Spec-Driven Development)

---

## 1. Alcance y Propósito del Módulo
El módulo `sire` es responsable de:
1. Gestión del **RVIE** (Registro de Ventas e Ingresos Electrónico) y **RCE** (Registro de Compras Electrónico).
2. Descarga y visualización de la **Propuesta Oficial de SUNAT** para el período fiscal (AAAAMM).
3. **Cruce y Conciliación Automática** entre la Propuesta de SUNAT y los comprobantes registrados en el ERP:
   * `CONCILIADO`: Coinciden serie, número, RUC y montos dentro de la tolerancia de $\pm S/ 0.05$.
   * `DISCREPANCIA`: Diferencia en base imponible, IGV o tipo de comprobante.
   * `SOLO_SUNAT`: Comprobante que SUNAT propone pero que no existe en el sistema local de la MYPE.
   * `SOLO_LOCAL`: Comprobante que la MYPE emitió/registró pero que SUNAT no tiene en su propuesta.
4. Generación del ticket de aceptación, complementación o reemplazo de la propuesta SIRE.

---

## 2. Mapa de Carpetas y Responsabilidades

```text
src/modules/sire/
├── components/       # MatchStatusBadge.tsx, DiscrepancyTable.tsx, SireUploadDropzone.tsx, SireSummaryCards.tsx
├── hooks/            # useSireReconciliation.ts, useSireAcceptProposal.ts, useSireImport.ts
├── pages/            # SireReconciliationPage.tsx, SireDiscrepanciesPage.tsx
├── services/         # sireApi.ts (endpoints /sire/reconcile, /sire/accept-proposal, /sire/upload)
├── types/            # sire.types.ts (SireVoucher, MatchStatus, SireReconciliationSummary)
└── validators/       # sireSchema.ts (validación Zod de períodos y filtros de cruce)
```

---

## 3. Normativa de Desarrollo (Qué SÍ y qué NO se puede hacer)

### ✅ Lo que SÍ se debe hacer:
* Toda tabla de cruce debe identificar el estado de conciliación mediante [MatchStatusBadge.tsx](file:///c:/Users/Carlos%20Ahumada%20Soles/OneDrive/Documentos/taller-integrador/fronted-mype-sunat/src/modules/sire/components/MatchStatusBadge.tsx).
* Las discrepancias monetarias deben resaltarse visualmente en color destructivo/rojo para alertar al contador antes de enviar el registro a SUNAT.
* El componente de carga masiva de archivos debe validar que los nombres sigan la nomenclatura reglamentaria de SUNAT (`LE + RUC + AAAAMM + ...`).
* Implementar filtros accesibles por estado (`Todos`, `Solo Discrepancias`, `Solo SUNAT`, `Conciliados`).

### 🚫 Lo que está TERMINANTEMENTE PROHIBIDO:
* **PROHIBIDO** permitir la aceptación de la propuesta si existen discrepancias críticas sin advertencia modal previa.
* **PROHIBIDO** manipular o redondear montos fiscales sin respetar la precisión de 2 decimales exigida por SUNAT.
* **PROHIBIDO** hacer la lógica de cruce de datos dentro del componente visual; el cálculo de discrepancias viene del backend o se orquesta en `useSireReconciliation.ts`.
* **PROHIBIDO** sobrepasar las 120 líneas por componente.

---

  1. No altere los tipos de `MatchStatus` sin verificar la consistencia con el backend.
  2. Asegure que la tabla de discrepancias soporte scroll horizontal en pantallas pequeñas sin romper el layout.
  3. Verifique que `npm run build` pase con 0 errores tras cualquier edición.
  4. Toda prueba debe escribirse en `test/unit/modules/sire/`, nunca dentro de `src/`.

---

## 5. Estrategia de Pruebas Unitarias (`test/unit/modules/sire/`)

* **Ubicación Exclusiva:** `test/unit/modules/sire/`
* **Casos Críticos a Probar:**
  1. **`sireComparator.test.ts`:** Identificación de diferencias en Base Imponible e IGV mayores a S/ 0.01 entre el ERP y la propuesta SUNAT.
  2. **`sireFilenameValidator.test.ts`:** Verificación estricta del patrón de nombres de archivo SIRE (`LE<RUC><AÑO><MES>...`).
  3. **`sireFilter.test.ts`:** Filtrado correcto de registros por estados `MATCH`, `DISCREPANCY`, `ONLY_INTERNAL` y `ONLY_SUNAT`.

