import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle, Button, Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { LoaderCircle, Search } from 'lucide-react';
import { sireApi } from '../services/sireApi';
import type { SireBookType, SireProposalDto } from '../types/sire.types';

interface Props {
  period: string;
  bookType: SireBookType;
}

export const SireProposalPanel = ({ period, bookType }: Props) => {
  const [proposals, setProposals] = useState<SireProposalDto[] | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestKey = `${period}:${bookType}`;
  const visibleProposals = loadedFor === requestKey ? proposals : null;

  const loadProposal = async () => {
    setLoading(true);
    setError(null);
    setProposals(null);
    setLoadedFor(null);
    try {
      const response = await sireApi.getProposal(period, bookType);
      setProposals(response.proposals);
      setLoadedFor(requestKey);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar la propuesta SIRE.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consulta de propuesta SIRE</CardTitle>
        <p className="text-sm text-muted-foreground">
          Consulta la propuesta disponible en el backend autenticado; esta pantalla no se conecta directamente con SUNAT.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button type="button" variant="outline" disabled={loading} onClick={() => void loadProposal()}>
          {loading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Search aria-hidden="true" />}
          {loading ? 'Cargando propuesta…' : 'Cargar propuesta'}
        </Button>
        {loading && <p role="status">La solicitud sigue pendiente.</p>}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>No se pudo cargar la propuesta</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {visibleProposals && (
          <div role="status" className="text-sm font-medium">
            Propuesta cargada: {visibleProposals.length} comprobantes.
          </div>
        )}
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RUC emisor</TableHead>
                <TableHead>Comprobante</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead align="right">Base</TableHead>
                <TableHead align="right">IGV</TableHead>
                <TableHead align="right">Total</TableHead>
                <TableHead>CAR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleProposals?.length ? visibleProposals.map((proposal) => (
                <TableRow key={proposal.id}>
                  <TableCell>{proposal.emitterRuc}</TableCell>
                  <TableCell>{proposal.documentType} · {proposal.series}-{proposal.correlative}</TableCell>
                  <TableCell>{proposal.issueDate}</TableCell>
                  <TableCell align="right">{proposal.taxableBase.toFixed(2)}</TableCell>
                  <TableCell align="right">{proposal.igvAmount.toFixed(2)}</TableCell>
                  <TableCell align="right">{proposal.totalAmount.toFixed(2)}</TableCell>
                  <TableCell>{proposal.carSunat}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    {visibleProposals ? 'La propuesta no contiene comprobantes.' : 'Carga una propuesta para consultar sus comprobantes.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
