'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Propuesta } from '@/lib/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ListSkeleton } from '@/components/shared/loading-skeleton';
import { ArrowLeft, Copy, Send, DollarSign, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function PropuestaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();

  const { data: propuesta, isLoading } = useQuery<Propuesta>({
    queryKey: ['propuesta', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('propuestas')
        .select('*, empresas(nombre)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Propuesta;
    },
  });

  function copyFullText() {
    if (!propuesta) return;
    const text = [
      propuesta.titulo,
      '',
      'RESUMEN EJECUTIVO',
      propuesta.resumen_ejecutivo,
      '',
      'PROBLEMAS DETECTADOS',
      propuesta.problemas,
      '',
      'SOLUCIÓN PROPUESTA',
      propuesta.solucion,
      '',
      'STACK TECNOLÓGICO',
      propuesta.stack,
      '',
      'CRONOGRAMA',
      propuesta.cronograma,
      '',
      'INVERSIÓN',
      `Setup: ${propuesta.precio_setup}€`,
      `Mensualidad: ${propuesta.precio_mensual}€/mes`,
      '',
      'ROI ESTIMADO',
      propuesta.roi,
      '',
      propuesta.cta_cierre,
    ].join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Propuesta copiada al portapapeles');
  }

  async function markAsSent() {
    await supabase.from('propuestas').update({ estado: 'enviada' }).eq('id', id);
    toast.success('Propuesta marcada como enviada');
  }

  if (isLoading) return <ListSkeleton rows={8} />;
  if (!propuesta) return <p>Propuesta no encontrada</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/propuestas">
          <Button variant="ghost" size="icon-sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{propuesta.titulo}</h1>
          <Badge className="mt-1">{propuesta.estado}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyFullText}>
            <Copy className="h-4 w-4 mr-1" /> Copiar
          </Button>
          {propuesta.estado === 'borrador' && (
            <Button size="sm" onClick={markAsSent}>
              <Send className="h-4 w-4 mr-1" /> Marcar enviada
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Resumen ejecutivo</CardTitle></CardHeader>
        <CardContent><p className="text-sm whitespace-pre-wrap">{propuesta.resumen_ejecutivo}</p></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Problemas detectados</CardTitle></CardHeader>
        <CardContent><p className="text-sm whitespace-pre-wrap">{propuesta.problemas}</p></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Solución propuesta</CardTitle></CardHeader>
        <CardContent><p className="text-sm whitespace-pre-wrap">{propuesta.solucion}</p></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Stack tecnológico</CardTitle></CardHeader>
        <CardContent><p className="text-sm whitespace-pre-wrap">{propuesta.stack}</p></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Cronograma</CardTitle></CardHeader>
        <CardContent><p className="text-sm whitespace-pre-wrap">{propuesta.cronograma}</p></CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Inversión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-muted-foreground">Setup</p>
                <p className="text-2xl font-bold">{propuesta.precio_setup}€</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mensual</p>
                <p className="text-2xl font-bold">{propuesta.precio_mensual}€/mes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" /> ROI estimado
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-sm">{propuesta.roi}</p></CardContent>
        </Card>
      </div>

      {propuesta.cta_cierre && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6 text-center">
            <p className="text-lg font-medium">{propuesta.cta_cierre}</p>
          </CardContent>
        </Card>
      )}

      {propuesta.share_token && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-2">Link público de la propuesta:</p>
            <code className="text-xs bg-muted p-2 rounded block break-all">
              {typeof window !== 'undefined' ? window.location.origin : ''}/propuesta/{propuesta.share_token}
            </code>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
