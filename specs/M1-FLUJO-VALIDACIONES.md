# M1: validaciones y hallazgos de flujo (auditoría 2)

## Validaciones previas por interfaz

| Regla | Formulario de factura/boleta | Diálogo de notas |
| --- | --- | --- |
| Fecha de emisión | Comprueba fecha en el campo y al confirmar | Comprueba fecha y muestra motivos antes de confirmar |
| Documento | Valida por tipo y muestra mensaje; acepta entrada manual | Valida por tipo y muestra mensaje |
| Razón social | Exige texto antes de enviar | No aparece una comprobación equivalente en motivosPendientes; pendiente de evaluación |
| Líneas, unidad, cantidad y descuentos | validarItems y liquidación global | Las mismas funciones |
| Inventario | revisarGrilla antes de enviar | revisarGrilla en motivosPendientes |
| Crédito | validarCronograma antes de enviar | validarCronograma y problemaDeCronograma |
| Origen, motivo y saldo de nota | No aplica a factura/boleta | problemasDeNota y consulta de saldo para notas de crédito |
| Detracción | Se calcula por línea y aplica umbral | El modal comprueba su código de cabecera para no notas |
| Serie | Serie fija según tipo | Longitud de serie y reglas de nota |

Las reglas del servidor continúan siendo decisivas; esta tabla solo compara comprobaciones de presentación. Las diferencias que no aplican al formulario de factura o dependen de otros procesos no se alteraron.
