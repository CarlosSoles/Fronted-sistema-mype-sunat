import { useState, type FormEvent } from 'react';
import { sireApi } from '../services/sireApi';
import type { ImportSireProposalResponse, SireBookType } from '../types/sire.types';

const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const useSireProposalImport = () => {
  const [period, setPeriod] = useState(currentPeriod);
  const [bookType, setBookType] = useState<SireBookType>('RVIE_VENTAS');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportSireProposalResponse | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!/^(?!0000)\d{4}(0[1-9]|1[0-2])$/.test(period)) {
      setError('Ingresa un periodo válido con formato YYYYMM.');
      return;
    }
    if (!file) {
      setError('Selecciona el archivo TXT de la propuesta.');
      return;
    }
    if (!/\.txt$/i.test(file.name)) {
      setError('Solo se permiten archivos .txt.');
      return;
    }
    if (file.size === 0) {
      setError('El archivo está vacío.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo no debe superar los 5 MiB.');
      return;
    }

    setLoading(true);
    try {
      setResult(await sireApi.importProposal(period, bookType, file));
    } catch (cause) {
      setError(cause instanceof Error
        ? cause.message
        : 'Ocurrió un error inesperado al importar la propuesta.');
    } finally {
      setLoading(false);
    }
  };

  const changePeriod = (value: string) => {
    setPeriod(value);
    setError(null);
    setResult(null);
  };

  const changeBookType = (value: string) => {
    if (value !== 'RVIE_VENTAS' && value !== 'RCE_COMPRAS') return;
    setBookType(value);
    setError(null);
    setResult(null);
  };

  const selectFile = (value: File | null) => {
    setFile(value);
    setError(null);
    setResult(null);
  };

  return {
    period,
    bookType,
    file,
    loading,
    error,
    result,
    handleSubmit,
    changePeriod,
    changeBookType,
    selectFile,
  };
};
