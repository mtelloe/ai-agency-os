'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/hooks/use-workspace';
import { useUser } from '@/hooks/use-user';
import { useAuthFetch } from '@/hooks/use-auth-fetch';
import type { Auditoria } from '@/lib/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ListSkeleton } from '@/components/shared/loading-skeleton';
import {
  AlertTriangle, CheckCircle, Lightbulb, Bot, Wrench, TrendingUp,
  DollarSign, FileText, PenTool, Loader2, ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 71 ? 'text-green-500 border-green-500' : score >= 41 ? 'text-yellow-500 border-yellow-500' : 'text-red-500 border-red-500';
  return (
    <div className={cn('w-24 h-24 rounded-full border-4 flex items-center justify-center', color)}>
      <span className="text-3xl font-bold">{score}</span>
    </div>
  );
}

export default function AuditoriaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { data: workspace } = useWorkspace();
  const { data: user } = useUser();
  const { authFetch } = useAuthFetch();
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [generatingScripts, setGeneratingScripts] = useState(false);

  const { data: auditoria, isLoading } = useQuery<Auditoria>({
    queryKey: ['auditoria', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auditorias')
        .select('*, empresas(nombre, nicho)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Auditoria;
    },
  });

  async function handleGenerateProposal() {
    if (!workspace || !user) return;
    setGeneratingProposal(true);
    try {
      const res = await authFetch('/api/ai/generate-proposal', {
        method: 'POST',
        body: JSON.stringify({ auditoriaId: id, workspaceId: workspace.id, userId: user.id }),
      });
      if (res.status === 402) { toast.error('Sin créditos'); return; }
      if (!res.ok) throw new Error('Error al generar');
      const propuesta = await res.json();
      toast.success('Propuesta generada');
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      router.push(`/propuestas/${propuesta.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setGeneratingProposal(false);
    }
  }

  async function handleGenerateScripts() {
    if (!workspace || !user) return;
    setGeneratingScripts(true);
    try {
      const res = await authFetch('/api/ai/generate-scripts', {
        method: 'POST',
        body: JSON.stringify({ auditoriaId: id, workspaceId: workspace.id, userId: user.id }),
      });
      if (res.status === 402) { toast.error('Sin créditos'); return; }
      if (!res.ok) throw new Error('Error al generar');
      const script = await res.json();
      toast.success('Scripts generados');
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      router.push(`/scripts/${script.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setGeneratingScripts(false);
    }
  }

  if (isLoading) return <ListSkeleton rows={8} />;
  if (!auditoria) return <p>Auditoría no encontrada</p>;

  const empresa = auditoria.empresa as (typeof auditoria.empresa & { nombre?: string; nicho?: string }) | undefined;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/auditorias">
          <Button variant="ghost" size="icon-sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{empresa?.nombre || new URL(auditoria.url).hostname}</h1>
          <p className="text-sm text-muted-foreground">{auditoria.url}</p>
        </div>
        {auditoria.estado === 'completada' && (
          <ScoreCircle score={auditoria.score_oportunidad || 0} />
        )}
      </div>

      {auditoria.estado === 'error' && (
        <Card className="border-destructive">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Error en la auditoría</p>
              <p className="text-sm text-muted-foreground">{auditoria.error_message || 'Error desconocido'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {auditoria.estado === 'completada' && (
        <>
          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleGenerateProposal} disabled={generatingProposal}>
              {generatingProposal ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Generar propuesta
            </Button>
            <Button variant="outline" onClick={handleGenerateScripts} disabled={generatingScripts}>
              {generatingScripts ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PenTool className="h-4 w-4 mr-2" />}
              Generar scripts
            </Button>
          </div>

          {/* Resumen */}
          <Card>
            <CardHeader><CardTitle className="text-base">Resumen del negocio</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p>{auditoria.resumen_negocio}</p>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cliente ideal</p>
                <p className="text-sm">{auditoria.cliente_ideal}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Servicios principales</p>
                <p className="text-sm">{auditoria.servicios}</p>
              </div>
            </CardContent>
          </Card>

          {/* Problemas */}
          <Card className="border-red-500/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Problemas detectados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {(auditoria.problemas || []).map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-red-500 mt-0.5">•</span>
                    {p}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Oportunidades */}
          <Card className="border-green-500/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-green-500" />
                Oportunidades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {(auditoria.oportunidades || []).map((o, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    {o}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Automatizaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4 text-blue-500" />
                Automatizaciones recomendadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(auditoria.automatizaciones_recomendadas || []).map((a, i) => (
                  <div key={i} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{a.nombre}</p>
                      <p className="text-xs text-muted-foreground">{a.descripcion}</p>
                    </div>
                    <Badge variant={a.impacto === 'Alto' ? 'default' : 'secondary'}>{a.impacto}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Agentes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4 text-purple-500" />
                Agentes IA recomendados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {(auditoria.agentes_recomendados || []).map((a, i) => (
                  <Card key={i}>
                    <CardContent className="p-3">
                      <p className="text-sm font-medium">{a.nombre}</p>
                      <Badge variant="secondary" className="text-xs mt-1">{a.tipo}</Badge>
                      <p className="text-xs text-muted-foreground mt-2">{a.descripcion}</p>
                      <p className="text-sm font-bold text-primary mt-2">{a.precio}€/mes</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Mejoras web */}
          <Card>
            <CardHeader><CardTitle className="text-base">Mejoras web</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {(auditoria.mejoras_web || []).map((m, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {m}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* ROI y Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-green-500/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  ROI estimado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{auditoria.roi_estimado}</p>
              </CardContent>
            </Card>
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Pricing sugerido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground">Setup</p>
                    <p className="text-xl font-bold">{auditoria.pricing_sugerido?.setup || '—'}€</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Mensual</p>
                    <p className="text-xl font-bold">{auditoria.pricing_sugerido?.mensual || '—'}€/mes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
