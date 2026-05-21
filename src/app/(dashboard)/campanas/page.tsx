'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/hooks/use-workspace';
import { useAuthFetch } from '@/hooks/use-auth-fetch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Mail, Copy, Check, Sparkles, MapPin, Phone } from 'lucide-react';
import { toast } from 'sonner';

const BEAUTY_NICHOS = ['centros de estetica', 'peluquerias', 'belleza', 'spa', 'depilacion', 'nail'];
const PRO_NICHOS = ['asesorias', 'gestorias', 'abogados', 'inmobiliarias', 'arquitectos', 'consultoras', 'construccion', 'administradores', 'agencias', 'contables'];

type Empresa = {
  id: string;
  nombre: string;
  nicho: string | null;
  ciudad: string | null;
  auditoria_id: string;
  contacto_nombre: string | null;
  contacto_email: string | null;
  contacto_telefono: string | null;
  score_oportunidad: number | null;
  resumen_negocio: string | null;
};

function EmailCard({ empresa, tipo }: { empresa: Empresa; tipo: 'fidelity' | 'asistente' }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { authFetch } = useAuthFetch();

  async function generate() {
    setLoading(true);
    try {
      const res = await authFetch('/api/campanas/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          empresa: empresa.nombre,
          ciudad: empresa.ciudad,
          resumen: empresa.resumen_negocio,
          contacto_nombre: empresa.contacto_nombre,
        }),
      });
      const data = await res.json();
      if (data.email) setEmail(data.email);
      else toast.error('Error al generar el email');
    } catch {
      toast.error('Error al generar el email');
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Email copiado');
  }

  return (
    <Card className="border-white/10 bg-zinc-900/50">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="font-medium text-sm truncate">{empresa.nombre}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {empresa.ciudad && (
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{empresa.ciudad}</span>
              )}
              {empresa.contacto_telefono && (
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{empresa.contacto_telefono}</span>
              )}
            </div>
            <a href={`mailto:${empresa.contacto_email}`} className="text-xs text-violet-400 hover:underline">
              {empresa.contacto_email}
            </a>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {empresa.score_oportunidad && (
              <Badge variant="outline" className="text-xs">
                Score {empresa.score_oportunidad}
              </Badge>
            )}
          </div>
        </div>

        {!email ? (
          <Button size="sm" variant="outline" onClick={generate} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="h-3 w-3 mr-2 animate-spin" />Generando...</> : <><Sparkles className="h-3 w-3 mr-2" />Generar email</>}
          </Button>
        ) : (
          <div className="space-y-2">
            <pre className="text-xs bg-zinc-800 rounded-md p-3 whitespace-pre-wrap font-sans text-zinc-200 leading-relaxed max-h-48 overflow-y-auto">
              {email}
            </pre>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copy} className="flex-1">
                {copied ? <><Check className="h-3 w-3 mr-2" />Copiado</> : <><Copy className="h-3 w-3 mr-2" />Copiar</>}
              </Button>
              <Button size="sm" variant="outline" onClick={generate} disabled={loading}>
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              </Button>
              <a href={`mailto:${empresa.contacto_email}`}>
                <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                  <Mail className="h-3 w-3 mr-2" />Enviar
                </Button>
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CampanasPage() {
  const { data: workspace } = useWorkspace();
  const supabase = createClient();

  const { data: auditorias, isLoading } = useQuery({
    queryKey: ['campanas', workspace?.id],
    enabled: !!workspace?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('auditorias')
        .select('id, contacto_nombre, contacto_email, contacto_telefono, score_oportunidad, resumen_negocio, empresas(id, nombre, nicho, ciudad)')
        .eq('workspace_id', workspace!.id)
        .eq('estado', 'completada')
        .not('contacto_email', 'is', null)
        .not('contacto_email', 'ilike', '%No encontrado%')
        .order('score_oportunidad', { ascending: false });
      return data || [];
    },
  });

  const fidelityEmpresas: Empresa[] = (auditorias || [])
    .filter((a: any) => {
      const nicho = (a.empresas?.nicho || '').toLowerCase();
      const resumen = (a.resumen_negocio || '').toLowerCase();
      return BEAUTY_NICHOS.some(n => nicho.includes(n)) ||
        ['estética', 'peluquer', 'cita', 'tratamiento', 'belleza', 'spa'].some(k => resumen.includes(k));
    })
    .map((a: any) => ({
      id: a.empresas?.id,
      nombre: a.empresas?.nombre || '—',
      nicho: a.empresas?.nicho,
      ciudad: a.empresas?.ciudad,
      auditoria_id: a.id,
      contacto_nombre: a.contacto_nombre,
      contacto_email: a.contacto_email,
      contacto_telefono: a.contacto_telefono,
      score_oportunidad: a.score_oportunidad,
      resumen_negocio: a.resumen_negocio,
    }));

  const asistenteEmpresas: Empresa[] = (auditorias || [])
    .filter((a: any) => {
      const nicho = (a.empresas?.nicho || '').toLowerCase();
      return PRO_NICHOS.some(n => nicho.includes(n));
    })
    .map((a: any) => ({
      id: a.empresas?.id,
      nombre: a.empresas?.nombre || '—',
      nicho: a.empresas?.nicho,
      ciudad: a.empresas?.ciudad,
      auditoria_id: a.id,
      contacto_nombre: a.contacto_nombre,
      contacto_email: a.contacto_email,
      contacto_telefono: a.contacto_telefono,
      score_oportunidad: a.score_oportunidad,
      resumen_negocio: a.resumen_negocio,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Campañas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Empresas auditadas segmentadas por oferta. Genera emails personalizados y envíalos directamente.
        </p>
      </div>

      <Tabs defaultValue="fidelity">
        <TabsList className="bg-zinc-900 border border-white/10">
          <TabsTrigger value="fidelity" className="data-[state=active]:bg-violet-600">
            Fidelity
            <Badge variant="secondary" className="ml-2 text-xs">{isLoading ? '…' : fidelityEmpresas.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="asistente" className="data-[state=active]:bg-violet-600">
            Asistente Directivos
            <Badge variant="secondary" className="ml-2 text-xs">{isLoading ? '…' : asistenteEmpresas.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fidelity" className="mt-4 space-y-4">
          <Card className="border-white/10 bg-zinc-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pitch Fidelity</CardTitle>
              <CardDescription className="text-xs">
                No perder más clientas — recordatorios automáticos, seguimiento post-cita, reseñas Google, recuperación de clientas dormidas. Desde 39€/mes.
              </CardDescription>
            </CardHeader>
          </Card>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : fidelityEmpresas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No hay empresas de belleza auditadas con email disponible.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {fidelityEmpresas.map((e) => (
                <EmailCard key={e.auditoria_id} empresa={e} tipo="fidelity" />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="asistente" className="mt-4 space-y-4">
          <Card className="border-white/10 bg-zinc-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pitch Asistente Directivos</CardTitle>
              <CardDescription className="text-xs">
                Asistente Personal IA por WhatsApp — resume reuniones, redacta emails, gestiona recordatorios. 500€ setup + 50€/mes. Extensible a todo el equipo directivo.
              </CardDescription>
            </CardHeader>
          </Card>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : asistenteEmpresas.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-muted-foreground">Aún no hay empresas profesionales auditadas.</p>
              <p className="text-xs text-muted-foreground">Ve a <strong>Prospección</strong> y audita asesorías, despachos de abogados, inmobiliarias o consultoras.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {asistenteEmpresas.map((e) => (
                <EmailCard key={e.auditoria_id} empresa={e} tipo="asistente" />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
