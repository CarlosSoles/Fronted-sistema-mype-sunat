import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, PageHeader, Button, Card, Badge, FilterBar, FilterSearch } from '@/components/ui';
import { PlusCircle, RefreshCw, Eye, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { type CustomsDeclarationRecord, type CustomsChannel } from '../types';
import { DamFormatsViewerModal } from '../components/DamFormatsViewerModal';
import { customsDeclarationsApi } from '../services/customsDeclarationsApi';
import { useQuery } from '@tanstack/react-query';

const DEMO_DECLARATIONS: CustomsDeclarationRecord[] = [
  {
    id: 'dam-001',
    company_id: 'demo-company',
    shipment_id: 'EXP-2026-00042',
    dua_number: '118-2026-10-045892',
    customs_code: '118',
    declaration_year: 2026,
    regime_code: '10',
    correlative_number: '045892',
    numeration_date: '2026-10-24 10:30',
    dispatch_mode: '10',
    channel: 'VERDE',
    transport_doc_number: 'B/L MAEU20268712',
    fob_total_usd: 50000,
    freight_total_usd: 1200,
    insurance_total_usd: 375,
    cif_total_usd: 51575,
    exchange_rate: 3.82,
    cif_total_pen: 197016.5,
    total_ad_valorem_pen: 0,
    total_igv_pen: 31522.64,
    total_ipm_pen: 3940.33,
    total_perception_pen: 8136.78,
    has_article_160_guarantee: false,
    version: 1,
    created_at: '2026-10-24T10:30:00Z',
    series: [
      {
        series_order: 1,
        product_code: 'LAP-GAMER-01',
        hs_code: '8471300000',
        commercial_description: 'Laptop Gamer Intel Core i7 16GB RAM 512GB SSD',
        destination_type: 'MERCADERIA',
        physical_quantity: 100,
        physical_unit: 'NIU',
        net_weight_kg: 250,
        gross_weight_kg: 280,
        fob_usd: 50000,
        ad_valorem_rate: 0,
      },
    ],
  },
  {
    id: 'dam-002',
    company_id: 'demo-company',
    shipment_id: 'EXP-2026-00043',
    dua_number: '118-2026-10-048123',
    customs_code: '118',
    declaration_year: 2026,
    regime_code: '10',
    correlative_number: '048123',
    numeration_date: '2026-10-27 15:45',
    dispatch_mode: '10',
    channel: 'NARANJA',
    transport_doc_number: 'B/L MSCU98124570',
    fob_total_usd: 32000,
    freight_total_usd: 950,
    insurance_total_usd: 240,
    cif_total_usd: 33190,
    exchange_rate: 3.82,
    cif_total_pen: 126785.8,
    total_ad_valorem_pen: 7607.15,
    total_igv_pen: 20830.9,
    total_ipm_pen: 3359.8,
    total_perception_pen: 5549.7,
    has_article_160_guarantee: true,
    version: 1,
    created_at: '2026-10-27T15:45:00Z',
    series: [],
  },
];

export default function DeclarationsListPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [selectedDam, setSelectedDam] = useState<CustomsDeclarationRecord | null>(null);

  const { data: declarations = DEMO_DECLARATIONS, refetch } = useQuery<CustomsDeclarationRecord[]>({
    queryKey: ['customs-declarations-list'],
    queryFn: async () => {
      const res = await customsDeclarationsApi.getDeclarations();
      return res.length > 0 ? res : DEMO_DECLARATIONS;
    },
  });

  const filteredDams = declarations.filter((d) => {
    const matchesSearch =
      d.dua_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.shipment_id || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesChannel = channelFilter === 'ALL' || d.channel === channelFilter;
    return matchesSearch && matchesChannel;
  });

  const getChannelBadge = (ch: CustomsChannel) => {
    switch (ch) {
      case 'VERDE':
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[10px]">
            <CheckCircle2 className="h-3 w-3" /> Verde (Levante Inmediato)
          </Badge>
        );
      case 'NARANJA':
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1 text-[10px]">
            <AlertTriangle className="h-3 w-3" /> Naranja (Doc. Aduanas)
          </Badge>
        );
      case 'ROJO':
        return (
          <Badge className="bg-rose-600 hover:bg-rose-700 text-white gap-1 text-[10px]">
            <ShieldAlert className="h-3 w-3" /> Rojo (Aforo Físico)
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-[10px]">Pendiente</Badge>;
    }
  };

  return (
    <Page>
      <PageHeader
        title="DAM y Valoración Aduanera"
        description="Gestión oficial de declaraciones aduaneras (DUA/DAM), asignación de canales de control y revisión de Formatos A, B y C."
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs gap-1.5 h-8">
            <RefreshCw className="h-3.5 w-3.5" />
            Actualizar
          </Button>
          <Button size="sm" onClick={() => navigate('/customs/declarations/new')} className="text-xs gap-1.5 h-8 font-semibold">
            <PlusCircle className="h-3.5 w-3.5" />
            + Nueva DAM (Asistente Wizard)
          </Button>
        </div>
      </PageHeader>

      <div className="space-y-4">
        {/* Barra de Filtros */}
        <FilterBar>
          <FilterSearch
            placeholder="Buscar por N° DAM (ej. 118-2026-10-...) o Expediente..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="max-w-md"
          />
          <div className="flex gap-1.5 ml-auto text-xs">
            {['ALL', 'VERDE', 'NARANJA', 'ROJO'].map((ch) => (
              <Button
                key={ch}
                size="sm"
                variant={channelFilter === ch ? 'default' : 'ghost'}
                onClick={() => setChannelFilter(ch)}
                className="h-8 text-xs px-2.5"
              >
                {ch === 'ALL' ? 'Todos los Canales' : ch}
              </Button>
            ))}
          </div>
        </FilterBar>

        {/* Tabla de DAMs */}
        <Card className="p-0 overflow-hidden border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-[11px] font-semibold text-muted-foreground border-b uppercase tracking-wider">
                <tr>
                  <th className="p-3">N° DAM Oficial</th>
                  <th className="p-3">Expediente</th>
                  <th className="p-3">Modalidad</th>
                  <th className="p-3">Fecha Registro</th>
                  <th className="p-3">Canal</th>
                  <th className="p-3 text-right">CIF (USD)</th>
                  <th className="p-3 text-right">Deuda (PEN)</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDams.map((dam) => {
                  const totalTaxPen = (dam.total_ad_valorem_pen || 0) + (dam.total_igv_pen || 0) + (dam.total_ipm_pen || 0) + (dam.total_perception_pen || 0);
                  return (
                    <tr key={dam.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-primary">{dam.dua_number}</td>
                      <td className="p-3 font-mono">{dam.shipment_id}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px]">
                          {dam.dispatch_mode === '10' ? 'Anticipado 01' : 'Diferido 02'}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{dam.numeration_date}</td>
                      <td className="p-3">{getChannelBadge(dam.channel)}</td>
                      <td className="p-3 text-right font-mono font-bold">{formatCurrency(dam.cif_total_usd, 'USD')}</td>
                      <td className="p-3 text-right font-mono font-bold text-foreground">
                        {formatCurrency(totalTaxPen || 43599.75, 'PEN')}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedDam(dam)}
                            className="h-7 text-[11px] gap-1 px-2 text-primary"
                          >
                            <Eye className="h-3 w-3" />
                            Formatos A/B/C
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/customs/declarations/new?edit=${dam.id}`)}
                            className="h-7 text-[11px] px-2 text-muted-foreground"
                          >
                            Asistente
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <DamFormatsViewerModal
        declaration={selectedDam}
        isOpen={Boolean(selectedDam)}
        onClose={() => setSelectedDam(null)}
      />
    </Page>
  );
}
