'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Agente } from '@/lib/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { ListSkeleton } from '@/components/shared/loading-skeleton';
import { Sparkles, Plus, Copy, Pause, Play, ExternalLink, Pencil } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const ESTADO_COLORS: Record<string, string> = {
  activo: 'bg-green-500/10 text-green-500',
  borrador: 'bg-gray-500/10 text-gray-500',
  pausado: 'bg-yellow-500/10 text-yellow-500',
  archivado: 'bg-red-500/10 text-red-500',
};

export default function AgentesPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: agentes, isLoading } = useQuery<Agente[]>({
    queryKey: ['agentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agentes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Agente[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, newState }: { id: string; newState: string }) => {
      const { error } = await supabase.from('agentes').update({ estado: newState }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agentes'] });
      toast.success('Estado actualizado');
    },
  });

  function copyEmbedCode(agentId: string) {
    const code = `<script src="${window.location.origin}/widget/${agentId}.js" async></script>`;
    navigator.clipboard.writeText(code);
    toast.success('Código embed copiado');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agentes IA</h1>
          <p className="text-muted-foreground">Chatbots inteligentes para tus clientes</p>
        </div>
        <Link
          href="/agentes/nuevo"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nuevo agente
        </Link>
      </div>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : !agentes?.length ? (
        <EmptyState
          icon={Sparkles}
          title="Sin agentes"
          description="Crea tu primer chatbot IA para desplegarlo en la web de un cliente"
          action={
            <Link
              href="/agentes/nuevo"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80"
            >
              <Plus className="h-4 w-4" /> Crear agente
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {agentes.map((a) => (
            <Card key={a.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{a.nombre}</p>
                    <Badge className={ESTADO_COLORS[a.estado] || ''} variant="secondary">{a.estado}</Badge>
                  </div>
                  <Badge variant="secondary">{a.tipo}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{a.business_context}</p>
                <div className="flex gap-2 flex-wrap">
                  <Link href={`/agentes/${a.id}`}>
                    <Button size="sm" variant="outline"><Pencil className="h-3 w-3 mr-1" /> Editar</Button>
                  </Link>
                  {a.estado === 'activo' ? (
                    <Button size="sm" variant="outline" onClick={() => toggleMutation.mutate({ id: a.id, newState: 'pausado' })}>
                      <Pause className="h-3 w-3 mr-1" /> Pausar
                    </Button>
                  ) : a.estado !== 'archivado' ? (
                    <Button size="sm" onClick={() => toggleMutation.mutate({ id: a.id, newState: 'activo' })}>
                      <Play className="h-3 w-3 mr-1" /> Activar
                    </Button>
                  ) : null}
                  {a.estado === 'activo' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => copyEmbedCode(a.id)}>
                        <Copy className="h-3 w-3 mr-1" /> Embed
                      </Button>
                      <Link href={`/chat/${a.id}`} target="_blank">
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-3 w-3 mr-1" /> Demo
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
