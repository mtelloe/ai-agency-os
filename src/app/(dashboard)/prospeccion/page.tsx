'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '@/hooks/use-workspace';
import { useUser } from '@/hooks/use-user';
import { useAuthFetch } from '@/hooks/use-auth-fetch';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Radar, Loader2, AlertCircle, ExternalLink, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import type { Lead, Empresa } from '@/lib/types/database';

const NICHOS = [
  'Restaurantes',
  'Clinicas dentales',
  'Inmobiliarias',
  'Centros de estetica',
  'Abogados',
  'Gimnasios',
  'Autoescuelas',
  'Clinicas veterinarias',
  'Academias de idiomas',
  'Talleres mecanicos',
];

const CANTIDADES = ['5', '10', '15', '20'];

type LeadWithEmpresa = Lead & { empresa: Empresa };

export default function ProspeccionPage() {
  const [nicho, setNicho] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [cantidad, setCantidad] = useState('5');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LeadWithEmpresa[] | null>(null);

  const { data: workspace } = useWorkspace();
  const { data: user } = useUser();
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();
  const supabase = createClient();

  const creditos = workspace ? workspace.creditos_total - workspace.creditos_usados : 0;

  // History: recent leads from AI prospecting
  const { data: history } = useQuery<LeadWithEmpresa[]>({
    queryKey: ['prospeccion-history', workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data, error } = await supabase
        .from('leads')
        .select('*, empresa:empresas(*)')
        .eq('workspace_id', workspace.id)
        .eq('fuente', 'Prospección IA')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as LeadWithEmpresa[];
    },
    enabled: !!workspace,
  });

  async function handleProspect(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace || !user || !nicho || !ciudad) return;

    setLoading(true);
    setResults(null);

    try {
      const res = await authFetch('/api/ai/prospect', {
        method: 'POST',
        body: JSON.stringify({
          nicho,
          ciudad: ciudad.trim(),
          cantidad: parseInt(cantidad),
          workspaceId: workspace.id,
          userId: user.id,
        }),
      });

      if (res.status === 402) {
        toast.error('No tienes creditos suficientes. Actualiza tu plan.');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al prospectar');
      }

      const data = await res.json();

      if (data.async) {
        // n8n pipeline triggered — leads will appear asynchronously
        toast.success('Prospeccion iniciada. Los leads apareceran en el pipeline en 1-2 minutos con datos del decisor.');
        queryClient.invalidateQueries({ queryKey: ['workspace'] });
      } else {
        // Direct Apify fallback — leads returned immediately
        setResults(data.leads);
        toast.success(`${data.total} leads encontrados y anadidos al pipeline`);
        queryClient.invalidateQueries({ queryKey: ['prospeccion-history'] });
        queryClient.invalidateQueries({ queryKey: ['workspace'] });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al prospectar');
    } finally {
      setLoading(false);
    }
  }

  function getScoreColor(score: number | null) {
    if (!score) return 'text-muted-foreground';
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-orange-600';
  }

  function getScoreBg(score: number | null) {
    if (!score) return 'bg-muted';
    if (score >= 85) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 70) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-orange-100 dark:bg-orange-900/30';
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Prospeccion</h1>
        <p className="text-muted-foreground">Encuentra negocios potenciales para tu agencia con IA</p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-primary" />
            Nueva prospeccion
          </CardTitle>
          <CardDescription>
            Busca negocios reales en Google Maps y encuentra al decisor con email y movil.
            Coste: 2 creditos. Tienes {creditos} creditos disponibles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProspect} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nicho</label>
                <Select value={nicho} onValueChange={(v) => setNicho(v ?? '')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un nicho" />
                  </SelectTrigger>
                  <SelectContent>
                    {NICHOS.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ciudad</label>
                <Input
                  placeholder="Madrid"
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cantidad</label>
                <Select value={cantidad} onValueChange={(v) => setCantidad(v ?? '5')}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CANTIDADES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c} negocios
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button type="submit" disabled={loading || creditos < 2 || !nicho || !ciudad.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Prospectando...
                  </>
                ) : (
                  <>
                    <Radar className="h-4 w-4 mr-2" />
                    Prospectar
                  </>
                )}
              </Button>
              <span className="text-sm text-muted-foreground">Coste: 2 creditos</span>
            </div>

            {creditos < 2 && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                Sin creditos suficientes. Necesitas al menos 2 creditos.
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Loading state */}
      {loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
            <p className="font-medium">Buscando negocios reales...</p>
            <p className="text-sm text-muted-foreground mt-1">
              Buscando {nicho} en {ciudad} en Google Maps y enriqueciendo con datos del decisor.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {results.length} leads encontrados
            </h2>
            <Link href="/pipeline">
              <Button variant="outline" size="sm">
                Ver en pipeline
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

          <p className="text-sm text-muted-foreground">
            {results.length} leads añadidos al pipeline como &quot;Nuevo&quot;
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((lead) => (
              <Card key={lead.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <h3 className="font-medium truncate">{lead.empresa?.nombre || lead.nombre_contacto}</h3>
                      {lead.empresa?.website && (
                        <a
                          href={lead.empresa.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">{lead.empresa.website}</span>
                        </a>
                      )}
                      <p className="text-sm text-muted-foreground">{lead.empresa?.ciudad}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-3">
                      <span className={`text-sm font-bold px-2 py-0.5 rounded ${getScoreBg(lead.score)} ${getScoreColor(lead.score)}`}>
                        {lead.score}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {lead.valor_estimado?.toLocaleString('es-ES')} EUR
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {results && results.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No se pudieron generar prospectos. Intenta de nuevo.</p>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history && history.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Historial de prospeccion</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {history.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{lead.empresa?.nombre || lead.nombre_contacto}</p>
                      <p className="text-xs text-muted-foreground">{lead.empresa?.ciudad}</p>
                    </div>
                    <div className="flex items-center gap-4 ml-3">
                      <span className={`text-sm font-semibold ${getScoreColor(lead.score)}`}>
                        {lead.score}
                      </span>
                      <span className="text-xs text-muted-foreground w-20 text-right">
                        {new Date(lead.created_at).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
