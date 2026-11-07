# Módulo SIRE: importación de propuesta y conciliación

## Alcance habilitado

El frontend expone únicamente la importación/consulta de propuestas y la conciliación:

- `/sire/importar`: carga un TXT con el formato interno provisional descrito abajo.
- `/sire/conciliacion`: consulta la propuesta, registra comprobantes locales y solicita la conciliación.

No se exponen acciones de aceptación, exclusión, reemplazo, complementación, generación, exportación, cierre o consulta de períodos cerrados. Las rutas históricas de cierre e historial redirigen a conciliación.

El repositorio no incluye el código fuente del backend ni una especificación OpenAPI publicada. El backend desplegado exige autenticación en `POST /api/v1/sire/import`, `POST /api/v1/sire/proposal` y `POST /api/v1/sire/reconcile` (respuesta HTTP 401 sin credenciales). Los contratos de solicitud/respuesta usados por el frontend son los documentados en el código existente del proyecto y deben mantenerse sincronizados con los DTO del backend.

## Empresa autenticada

La empresa se determina por la sesión autenticada. El frontend no ofrece selector de empresa para SIRE ni envía `companyId`. La conciliación usa el RUC de `activeCompany` en la sesión, validado antes del envío, como `emitterRuc` de cada `localRecord`. El RUC no se puede editar en la pantalla.

No se solicitan ni conservan credenciales SOL. Ningún formulario del módulo debe aceptar una clave SOL.

## Importación provisional

`POST /api/v1/sire/import` recibe `multipart/form-data` con `file` (`.txt`, máximo 5 MiB), `period` (`YYYYMM`) y `bookType` (`RVIE_VENTAS` o `RCE_COMPRAS`). El navegador asigna el `Content-Type` y su boundary.

El formato provisional interno espera una fila por comprobante, separada por `|`, en este orden:

```text
RUC|tipo|serie|correlativo|fecha (YYYY-MM-DD)|base|IGV|total|CAR
```

Este formato de nueve columnas **no es oficial de SUNAT** y no debe usarse con archivos TXT oficiales. El resultado informado contiene `imported`, `rejected` y `errors` (número de línea y motivo). Una solicitud en curso se muestra como pendiente; solo una respuesta válida del backend termina la operación. Los rechazos se presentan como resultado parcial o sin comprobantes importados, nunca como éxito completo.

## Consulta de propuesta

`POST /api/v1/sire/proposal` recibe únicamente `{ period, bookType }`. La respuesta contiene `proposals`, cuyos registros incluyen `id`, `carSunat`, `emitterRuc`, `documentType`, `series`, `correlative`, `issueDate`, `taxableBase`, `igvAmount`, `totalAmount` y `origin`. No se envían RUC ni `companyId` en esta solicitud.

## Conciliación

`POST /api/v1/sire/reconcile` recibe el siguiente contrato, sin `companyId`:

```json
{
  "period": "YYYYMM",
  "bookType": "RVIE_VENTAS",
  "localRecords": [
    {
      "emitterRuc": "obtenido de la empresa autenticada",
      "documentType": "01",
      "series": "serie local",
      "correlative": "correlativo local",
      "taxableBase": 100.00,
      "igvAmount": 18.00,
      "totalAmount": 118.00
    }
  ]
}
```

Los tipos admitidos son `01`, `03`, `07` y `08`. El frontend muestra el resultado comunicado por el backend y no ejecuta su propio algoritmo de conciliación.

Los escenarios disponibles son `COINCIDENCIA_EXACTA`, `DIFERENCIA_MONTOS`, `OMISION_LOCAL`, `OMISION_SUNAT` y `DUPLICADO_LLAVE`. Para duplicados se muestra `duplicateSource` (`LOCAL`, `SIRE` o `AMBOS`) y se indica que requieren revisión manual.

HTTP 409 se presenta como conflicto con el detalle recibido. No se reintenta automáticamente ni se recomienda borrar o reemplazar información. Errores HTTP, respuestas inválidas y solicitudes aún pendientes no se presentan como resultados exitosos.

## Pendiente de integración

La integración SIRE real con SUNAT no está habilitada en el backend. Antes de ampliar el módulo se requiere contrato OpenAPI/DTO del backend y homologación del layout oficial por tipo de libro. No implementar envío, aceptación, complementación, generación ni cierre contra SUNAT mientras no exista esa integración.
