'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Script } from '@/lib/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ListSkeleton } from '@/components/shared/loading-skeleton';
import { ArrowLeft, Copy, Mail, Phone, MessageCircle, RotateCcw, Presentation, ShieldQuestion } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

function ScriptCard({ title, icon: Icon, content }: { title: string; icon: React.ComponentType<{ className?: string }>; content: string | null }) {
  if (!content) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => { navigator.clipboard.writeText(content); toast.success('Copiado'); }}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </CardContent>
    </Card>
  );
}

export default function ScriptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();

  const { data: script, isLoading } = useQuery<Script>({
    queryKey: ['script', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scripts')
        .select('*, empresas(nombre)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Script;
    },
  });

  if (isLoading) return <ListSkeleton rows={6} />;
  if (!script) return <p>Scripts no encontrados</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/scripts">
          <Button variant="ghost" size="icon-sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Scripts de venta</h1>
          <p className="text-sm text-muted-foreground">
            {(script as Script & { empresas?: { nombre: string } }).empresas?.nombre || 'Empresa'}
          </p>
        </div>
      </div>

      <ScriptCard title="Cold Email" icon={Mail} content={script.cold_email} />
      <ScriptCard title="Guión de llamada" icon={Phone} content={script.script_llamada} />
      <ScriptCard title="Mensaje WhatsApp" icon={MessageCircle} content={script.mensaje_whatsapp} />
      <ScriptCard title="Follow-up (3 días)" icon={RotateCcw} content={script.follow_up} />
      <ScriptCard title="Pitch de demo" icon={Presentation} content={script.pitch_demo} />

      {script.objeciones?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldQuestion className="h-4 w-4" />
              Objeciones frecuentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {script.objeciones.map((o, i) => (
              <div key={i}>
                <p className="text-sm font-medium text-destructive">&quot;{o.objecion}&quot;</p>
                <p className="text-sm text-muted-foreground mt-1">{o.respuesta}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
