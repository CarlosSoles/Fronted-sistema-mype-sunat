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
  "ruc": "12345678901",
  "comprobantes": [
    {
      "tipoComprobante": "01",
      "serie": "F001",
      "correlativo": "00001234",
      "baseImponible": 100.00,
      "igv": 18.00,
      "total": 118.00
    }
  ]
}
```

No agregar propiedades al contrato ni enviar `companyId`. Los tipos admitidos son `01`, `03`, `07` y `08`. El backend valida período, RUC e importes; el frontend muestra feedback de formato y presenta los errores de validación.

La respuesta contiene `period`, `summary` y `results`. Mostrar el `porcentajeCumplimiento` enviado por el backend sin recalcularlo y mostrar `diferenciaBase` y `diferenciaIgv` en cada resultado.

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
| `/sire/cierre` | Resumen de Cierre | Presenta el resumen de la última conciliación de la sesión; la generación de reemplazos está deshabilitada. |
| `/sire/historial` | Historial | Placeholder hasta que exista un endpoint de periodos conciliados y cerrados. |

La ruta anterior `/sire` redirige a `/sire/conciliacion`. No simular importaciones, cierres ni registros históricos.
