'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/hooks/use-workspace';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cpu, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AnalizadorPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: workspace } = useWorkspace();
  const { data: user } = useUser();

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace || !user) return;

    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: normalizedUrl,
          workspaceId: workspace.id,
          userId: user.id,
        }),
      });

      if (res.status === 402) {
        toast.error('No tienes créditos suficientes. Actualiza tu plan.');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al analizar');
      }

      const auditoria = await res.json();
      toast.success('Auditoría completada');
      router.push(`/auditorias/${auditoria.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al analizar la web');
      setLoading(false);
    }
  }

  const creditos = workspace ? workspace.creditos_total - workspace.creditos_usados : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analizador de negocios</h1>
        <p className="text-muted-foreground">Introduce la URL de un negocio para analizarlo con IA</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            Nueva auditoría
          </CardTitle>
          <CardDescription>
            La IA escaneará la web, analizará el negocio y generará un informe con oportunidades, problemas y recomendaciones.
            Coste: 1 crédito. Tienes {creditos} créditos disponibles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="https://ejemplo.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                required
                className="flex-1"
              />
              <Button type="submit" disabled={loading || creditos <= 0}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  'Analizar'
                )}
              </Button>
            </div>

            {creditos <= 0 && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                Sin créditos. Actualiza tu plan para continuar.
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
            <p className="font-medium">Analizando la web...</p>
            <p className="text-sm text-muted-foreground mt-1">
              Escaneando contenido, analizando con IA y generando informe. Esto puede tardar 30-60 segundos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
