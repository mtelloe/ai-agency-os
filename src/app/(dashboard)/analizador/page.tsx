'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/hooks/use-workspace';
import { useUser } from '@/hooks/use-user';
import { useAuthFetch } from '@/hooks/use-auth-fetch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cpu, Loader2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

type AuditStatus = 'idle' | 'submitting' | 'processing' | 'completed' | 'error';

export default function AnalizadorPage() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<AuditStatus>('idle');
  const [auditId, setAuditId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();
  const { data: workspace } = useWorkspace();
  const { data: user } = useUser();
  const { authFetch } = useAuthFetch();

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function startPolling(id: string) {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await authFetch(`/api/auditorias/${id}`);
        if (!res.ok) return;

        const audit = await res.json();

        if (audit.estado === 'completada') {
          if (pollRef.current) clearInterval(pollRef.current);
          setStatus('completed');
          toast.success('Auditoría completada');
          setTimeout(() => router.push(`/auditorias/${id}`), 1000);
        } else if (audit.estado === 'error') {
          if (pollRef.current) clearInterval(pollRef.current);
          setStatus('error');
          setErrorMsg(audit.error_message || 'Error durante el análisis');
          toast.error('Error en la auditoría');
        }
      } catch {
        // Ignore polling errors, will retry
      }
    }, 5000);
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace || !user) return;

    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await authFetch('/api/ai/analyze', {
        method: 'POST',
        body: JSON.stringify({
          url: normalizedUrl,
          workspaceId: workspace.id,
          userId: user.id,
        }),
      });

      if (res.status === 402) {
        toast.error('No tienes créditos suficientes. Actualiza tu plan.');
        setStatus('idle');
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al analizar');
      }

      const data = await res.json();
      setAuditId(data.id);
      setStatus('processing');

      // Start polling for completion
      startPolling(data.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al analizar la web');
      setStatus('idle');
    }
  }

  function handleRetry() {
    setStatus('idle');
    setAuditId(null);
    setErrorMsg('');
  }

  const creditos = workspace ? workspace.creditos_total - workspace.creditos_usados : 0;
  const isLoading = status === 'submitting' || status === 'processing';

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
                disabled={isLoading}
                required
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || creditos <= 0 || status === 'completed'}>
                {status === 'submitting' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
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

      {status === 'processing' && (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
            <p className="font-medium">Analizando la web...</p>
            <p className="text-sm text-muted-foreground mt-1">
              Escaneando contenido, recopilando datos de múltiples fuentes y analizando con 3 agentes IA especializados.
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              Esto puede tardar 1-2 minutos. No cierres esta página.
            </p>
          </CardContent>
        </Card>
      )}

      {status === 'completed' && (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-4" />
            <p className="font-medium">Auditoría completada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Redirigiendo al informe...
            </p>
          </CardContent>
        </Card>
      )}

      {status === 'error' && (
        <Card>
          <CardContent className="p-8 text-center">
            <XCircle className="h-8 w-8 mx-auto text-destructive mb-4" />
            <p className="font-medium">Error en la auditoría</p>
            <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
            <Button variant="outline" onClick={handleRetry} className="mt-4">
              Intentar de nuevo
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
