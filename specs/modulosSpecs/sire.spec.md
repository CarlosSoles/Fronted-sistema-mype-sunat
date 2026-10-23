# Módulo SIRE: conciliación fiscal

## Alcance disponible

La pantalla permite enviar comprobantes locales al endpoint de conciliación y mostrar la respuesta calculada y persistida por el backend. El `companyId` se obtiene del usuario autenticado y no forma parte del cuerpo de la petición.

La importación de propuestas TXT está habilitada usando el formato interno provisional de nueve columnas descrito abajo. Este formato no es el layout oficial SUNAT y la pantalla debe advertirlo antes de cargar archivos. La generación de archivos planos RVIE/RCE de reemplazo sigue sin estar disponible.

## Importación de propuestas

`POST /api/v1/sire/import` requiere `multipart/form-data` con los campos `file` (`.txt`, máximo 5 MiB), `period` (`YYYYMM`) y `bookType` (`RVIE_VENTAS` o `RCE_COMPRAS`). El backend autentica al usuario y determina la empresa desde su JWT.

El parser provisional espera una fila por comprobante, separada por `|`, en este orden:

```text
RUC|tipo|serie|correlativo|fecha (YYYY-MM-DD)|base|IGV|total|CAR
```

La respuesta informa `imported`, `rejected` y `errors` con número de línea y motivo. La interfaz presenta estos totales y errores por fila. No presentar este flujo como compatible con los TXT oficiales de SUNAT hasta verificar e implementar el layout vigente para cada libro.

## Integración

`POST /api/v1/sire/reconcile` requiere `Authorization: Bearer <token>`.

El cuerpo tiene exactamente esta forma:

```json
{
  "period": "YYYYMM",
  "bookType": "RVIE_VENTAS",
  "localRecords": [
    {
      "emitterRuc": "12345678901",
      "documentType": "01",
      "series": "F001",
      "correlative": "00001234",
      "taxableBase": 100.00,
      "igvAmount": 18.00,
      "totalAmount": 118.00
    }
  ]
}
```

No agregar propiedades al contrato ni enviar `companyId`. Los tipos admitidos son `01`, `03`, `07` y `08`. El frontend adapta sus comprobantes al contrato `localRecords` del backend.

La API responde con conteos, `complianceRate` y `discrepancies`; el cliente adapta esos datos al modelo visual y no recalcula la conciliación. El porcentaje y las diferencias siempre provienen del backend.

`POST /api/v1/sire/close` recibe `period` y `bookType`. La interfaz requiere una confirmación explícita antes de cerrar el periodo conciliado. `GET /api/v1/sire/history?page=1&limit=20` lista los cierres de la empresa autenticada y se muestra con paginación.

## Escenarios y presentación

| Escenario | Etiqueta | Color |
| --- | --- | --- |
| `COINCIDENCIA_EXACTA` | Coincidencia exacta | Verde |
| `DIFERENCIA_MONTOS` | Diferencia de montos | Amarillo |
| `OMISION_LOCAL` | Falta en ERP local | Azul |
| `OMISION_SUNAT` | No lo reconoce SUNAT | Naranja |
| `DUPLICADO_LLAVE` | Llave duplicada · acción manual | Rojo |

Solo para `DUPLICADO_LLAVE`, mostrar `duplicateSource` (`LOCAL`, `SIRE` o `AMBOS`). El backend no elige un registro duplicado: advertir que el usuario debe resolverlo manualmente.

Los valores de porcentaje, diferencias y escenarios provienen del backend; el frontend no debe implementar lógica de conciliación ni persistencia adicional.

## Navegación del módulo

| Ruta | Vista | Disponibilidad |
| --- | --- | --- |
| `/sire/importar` | Importar Propuesta | Importación habilitada solo para el formato interno provisional de nueve columnas; no usar con TXT oficiales SUNAT. |
| `/sire/conciliacion` | Conciliación y Cruce | Conciliación activa mediante el endpoint descrito arriba. |
| `/sire/cierre` | Resumen de Cierre | Presenta las métricas de la última conciliación de la sesión y permite cerrar el periodo con confirmación; la generación de reemplazos sigue deshabilitada. |
| `/sire/historial` | Historial | Consulta periodos cerrados en el backend con paginación. |

La ruta anterior `/sire` redirige a `/sire/conciliacion`. El acceso de SIRE está limitado a `ADMIN`, `CONTADOR`, `AUDITOR` y `ACCOUNTANT`.
