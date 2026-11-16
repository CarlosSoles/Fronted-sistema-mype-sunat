import { useEffect, useRef, useState } from 'react';
import { rucValido } from '../lib/invoiceEmitValidation';
import { consultarDni, consultarRuc, type DatosRuc } from '../services/rucApi';

/** Consulta solo tras editar el documento; una edición manual invalida respuestas pendientes. */
export function useRucAutofill(onDatos: (datos: DatosRuc) => void) {
  const [aviso, setAviso] = useState('');
  const secuencia = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => { secuencia.current++; window.clearTimeout(timer.current); }, []);

  const cancelar = () => {
    secuencia.current++;
    window.clearTimeout(timer.current);
    setAviso('');
  };
  const consultar = (documento: string) => {
    cancelar();
    const esDni = /^\d{8}$/.test(documento);
    if (!esDni && !rucValido(documento)) return;
    const solicitud = secuencia.current;
    timer.current = window.setTimeout(() => {
      setAviso(`Consultando ${esDni ? 'DNI' : 'RUC'}… Puede continuar completando los datos.`);
      const solicitudDatos = esDni
        ? consultarDni(documento).then((dni): DatosRuc => ({ ruc: dni.dni, razonSocial: dni.nombreCompleto, direccionFiscal: null, ubigeo: null, estadoContribuyente: 'HABIDO', condicionDomicilio: 'DNI' }))
        : consultarRuc(documento);
      void solicitudDatos.then((datos) => {
        if (solicitud !== secuencia.current) return;
        onDatos(datos);
        setAviso(esDni
          ? 'Nombre del DNI completado. Puede editarlo si es necesario.'
          : datos.direccionFiscal
            ? 'Datos del RUC completados. Puede editar la razón social y la dirección.'
            : 'Razón social completada. El proveedor no informó dirección; complétela manualmente.');
      }).catch(() => {
        if (solicitud === secuencia.current) setAviso(`No se pudo consultar el ${esDni ? 'DNI' : 'RUC'}. Puede completar los datos manualmente.`);
      });
    }, 300);
  };
  return { consultar, cancelar, aviso };
}
