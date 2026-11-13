# Módulo SIRE: importación de propuesta y conciliación

## Alcance habilitado

El frontend expone la importación/consulta de propuestas, la consulta manual simulada, la conciliación, el resumen de cierre y el historial:

- `/sire/importar`: carga un TXT con el formato interno provisional descrito abajo.
- `/sire/periodos`: consulta a SUNAT los periodos de un libro mediante el proceso asíncrono del backend (cola de trabajos).
- `/sire/conciliacion`: consulta la propuesta, registra comprobantes locales y solicita la conciliación.
- `/sire/cierre`: presenta el resumen de conciliación y permite solicitar el cierre del periodo con confirmación.
- `/sire/historial`: consulta las conciliaciones/cierres guardados en el backend con paginación.

Las pantallas no fabrican registros ni métricas. Solo muestran datos entregados por respuestas válidas del backend; errores HTTP y respuestas inválidas permanecen como errores.

El repositorio no incluye el código fuente del backend ni una especificación OpenAPI publicada. Los endpoints SIRE del frontend requieren autenticación Bearer. Los contratos de solicitud/respuesta deben mantenerse sincronizados con los DTO del backend.

## Empresa autenticada

La empresa se determina por la sesión autenticada. El frontend no ofrece selector de empresa para SIRE ni envía `companyId`. La conciliación usa el RUC de `activeCompany` en la sesión, validado antes del envío, como `emitterRuc` de cada `localRecord`. El RUC no se puede editar en la pantalla.

La consulta de periodos solicita temporalmente una clave SOL en un campo de contraseña. El valor se envía en el cuerpo de la solicitud, no se guarda en estado React, almacenamiento web, analítica ni logs, se elimina del campo al enviar la solicitud y no se vuelve a presentar. Las demás pantallas del módulo no solicitan ni conservan credenciales SOL.

## Consulta asíncrona de periodos

El backend procesa la consulta a SUNAT en segundo plano (cola de trabajos), por lo que la pantalla no espera una respuesta síncrona: encola el trabajo y sigue su avance.

`POST /api/v1/sire/periodos` requiere sesión autenticada y recibe:

```json
{
  "bookCode": "140000",
  "solUser": "MODDATOS",
  "solPassword": "CLAVE_SOL"
}
```

`bookCode` solo admite `140000` (RVIE) u `080000` (RCE); `solUser` admite hasta 50 caracteres sin espacios y `solPassword` hasta 128.

Responde `HTTP 202 Accepted` con `{ "messageId": "...", "status": "PENDING" }`. El `messageId` identifica el trabajo encolado y es el único dato que la pantalla necesita para seguirlo.

Si la cola no pudo publicar el trabajo, el backend responde el mismo `HTTP 202` con `{ messageId, status: "FAILED", errorCode, message, error }`: el frontend trata ese caso como error y muestra el texto `message` del backend, nunca un mensaje genérico.

`GET /api/v1/sire/periodos/status/:messageId` devuelve el avance del trabajo:

```json
{
  "messageId": "…",
  "status": "COMPLETED",
  "bookCode": "140000",
  "periods": { "periodos": ["202601", "202602"] },
  "createdAt": "…",
  "completedAt": "…"
}
```

Los estados posibles son `PENDING`, `PROCESSING`, `COMPLETED` y `FAILED`. `FAILED` incluye `error`/`message` con el texto accionable del catálogo de errores del backend y `errorCode` con el código persistido. `periods` es el JSON literal que devolvió SUNAT: puede ser un arreglo (`["202601"]`), un arreglo de objetos (`[{ "codigoPeriodo": "202601" }]`) o un objeto con la lista dentro (`{ "periodos": [...] }`); el frontend lo normaliza a una tabla de filas y, si no reconoce la forma, muestra que no devolvió periodos en vez de inventar datos.

Reglas de la pantalla:

- Mientras el trabajo está `PENDING` o `PROCESSING` se muestra “Consultando a SUNAT…”, el botón de consulta permanece deshabilitado y no se muestra ninguna tabla.
- La tabla de periodos se renderiza solo cuando el estado es `COMPLETED` y hay periodos que mostrar. Un `FAILED` o un error HTTP se presentan como error, nunca como resultado vacío.
- El sondeo del estado se hace cada 3 segundos y se cancela al concluir el trabajo, al iniciar una consulta nueva y al desmontar la pantalla. Tras 120 sondeos sin concluir (≈6 min, el horizonte de reintentos del backend antes de su cola de muertos) la consulta se cierra con un error de tiempo de espera.
- El POST y el GET de estado llevan tope de espera (20 s y 15 s): una cola lenta no puede dejar la pantalla bloqueada.

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

## Cierre e historial de periodos

`POST /api/v1/sire/close` recibe `{ period, bookType }`. La pantalla solicita confirmación explícita, y solo presenta el cierre como completado si el backend responde el mismo `period`, el mismo `bookType` y `status: "CERRADO"`. `GET /api/v1/sire/history?page=<page>&limit=<limit>` devuelve `{ page, limit, total, items }`; cada elemento contiene `id`, `period`, `bookType`, `status`, `createdAt`, `complianceRate` y `totalsByScenario`. La empresa se determina por la sesión Bearer; no se envía `companyId`.

## Dashboard de conexión y resiliencia

La pantalla de conciliación consulta `GET /api/v1/sire/dashboard/metrics` y `GET /api/v1/sire/dashboard/history?start=<ISO>&end=<ISO>&granularity=minute|hour|day&limit=<n>&offset=<n>`. Se envía el token Bearer y no se envía `companyId`.

Las métricas incluyen `state`, `recentFailedCalls`, `failureRate`, `slowCallRate`, `bufferedInvoicesCount`, `totalCalls`, `successfulCalls`, `failedCalls`, `totalRetries`, `lastStateChange`, `circuitBreakerScope`, `activityScope`, `mttdSeconds`, `mttrSeconds` y `mtbfSeconds`. Los puntos históricos contienen `timestamp`, `retries`, `availabilityPercent`, `observedCalls`, `successfulCalls` y `failedCalls`. Una disponibilidad nula no se dibuja como cero. Ante HTTP 404 el dashboard no se presenta; ante otros errores se muestra el error sin bloquear la conciliación.

## Pendiente de integración

La consulta de periodos encola un trabajo en el backend y el frontend solo refleja el estado que éste informa; no se fabrican periodos ni se afirma que SUNAT haya validado la clave SOL. El cierre de periodo persiste el estado que confirme el backend y no equivale por sí mismo a cerrar un periodo ante SUNAT. Antes de ampliar la integración real se requiere contrato OpenAPI/DTO del backend y homologación del layout oficial por tipo de libro. No implementar envío, aceptación, complementación, generación ni cierre contra SUNAT mientras no exista esa integración.
