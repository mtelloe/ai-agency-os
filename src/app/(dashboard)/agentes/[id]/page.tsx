'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Agente } from '@/lib/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListSkeleton } from '@/components/shared/loading-skeleton';
import { ArrowLeft, Save, Loader2, Copy, ExternalLink, Brain, ShieldAlert, BookOpen, Settings } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function EditAgentePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    tipo: 'chat_web',
    tono: 'profesional',
    businessContext: '',
    welcomeMessage: '',
    qualificationQuestions: '',
    ctaAction: '',
    fallbackMessage: '',
    handoffEnabled: true,
    handoffMessage: '',
    knowledge: '',
    restricciones: '',
    primaryColor: '#6366f1',
  });

  const { data: agente, isLoading } = useQuery<Agente & { knowledge?: string; restricciones?: string }>({
    queryKey: ['agente', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agentes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (agente) {
      setForm({
        nombre: agente.nombre,
        tipo: agente.tipo,
        tono: agente.tono,
        businessContext: agente.business_context || '',
        welcomeMessage: agente.welcome_message || '',
        qualificationQuestions: (agente.qualification_questions || []).join('\n'),
        ctaAction: agente.cta_action || '',
        fallbackMessage: agente.fallback_message || '',
        handoffEnabled: agente.handoff_enabled,
        handoffMessage: agente.handoff_message || '',
        knowledge: agente.knowledge || '',
        restricciones: agente.restricciones || '',
        primaryColor: agente.widget_config?.primaryColor || '#6366f1',
      });
    }
  }, [agente]);

  function update(field: string, value: string | boolean | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const questions = form.qualificationQuestions.split('\n').map((q) => q.trim()).filter(Boolean);

      const { error } = await supabase
        .from('agentes')
        .update({
          nombre: form.nombre,
          tipo: form.tipo,
          tono: form.tono,
          business_context: form.businessContext,
          welcome_message: form.welcomeMessage,
          qualification_questions: questions,
          cta_action: form.ctaAction,
          fallback_message: form.fallbackMessage,
          handoff_enabled: form.handoffEnabled,
          handoff_message: form.handoffMessage,
          knowledge: form.knowledge,
          restricciones: form.restricciones,
          widget_config: { primaryColor: form.primaryColor, position: 'bottom-right', size: 'standard' },
          system_prompt: null, // Reset to auto-generate from fields
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['agente', id] });
      queryClient.invalidateQueries({ queryKey: ['agentes'] });
      toast.success('Agente actualizado');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <ListSkeleton rows={6} />;
  if (!agente) return <p>Agente no encontrado</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/agentes">
            <Button variant="ghost" size="icon-sm"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{agente.nombre}</h1>
            <p className="text-sm text-muted-foreground">Editar configuración del agente</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/chat/${id}`} target="_blank">
            <Button variant="outline" size="sm"><ExternalLink className="h-3 w-3 mr-1" /> Demo</Button>
          </Link>
          <Button size="sm" onClick={() => {
            navigator.clipboard.writeText(`<script src="${window.location.origin}/widget/${id}.js" async></script>`);
            toast.success('Código embed copiado');
          }}>
            <Copy className="h-3 w-3 mr-1" /> Embed
          </Button>
        </div>
      </div>

      <Tabs defaultValue="knowledge">
        <TabsList className="w-full">
          <TabsTrigger value="knowledge" className="flex-1"><BookOpen className="h-3.5 w-3.5 mr-1" /> Conocimiento</TabsTrigger>
          <TabsTrigger value="restrictions" className="flex-1"><ShieldAlert className="h-3.5 w-3.5 mr-1" /> Restricciones</TabsTrigger>
          <TabsTrigger value="behavior" className="flex-1"><Brain className="h-3.5 w-3.5 mr-1" /> Comportamiento</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1"><Settings className="h-3.5 w-3.5 mr-1" /> Ajustes</TabsTrigger>
        </TabsList>

        <TabsContent value="knowledge" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Base de conocimiento</CardTitle>
              <CardDescription>
                Pega aquí toda la información que el agente necesita saber: servicios, precios, horarios,
                FAQ, políticas, etc. Cuanto más detallado, mejores respuestas dará.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder={"Servicios:\n- Corte de pelo: 25€\n- Tinte completo: 60€\n- Mechas: 80€\n\nHorarios:\n- Lunes a viernes: 9:00 - 20:00\n- Sábados: 9:00 - 14:00\n- Domingos: cerrado\n\nDirección: Calle Mayor 15, Madrid\n\nPolítica de cancelación:\n- Cancelar con 24h de antelación\n- Sin coste de cancelación\n\nPreguntas frecuentes:\n- ¿Aceptáis tarjeta? Sí\n- ¿Hay parking? Sí, parking gratuito"}
                value={form.knowledge}
                onChange={(e) => update('knowledge', e.target.value)}
                rows={16}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {form.knowledge.length} caracteres · El agente usará esta información para responder con precisión
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contexto del negocio</CardTitle>
              <CardDescription>Descripción general del negocio</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Somos una peluquería premium en el centro de Madrid especializada en coloración..."
                value={form.businessContext}
                onChange={(e) => update('businessContext', e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="restrictions" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                Lo que el agente NO puede hacer
              </CardTitle>
              <CardDescription>
                Define los límites del agente. Una restricción por línea.
                Si un visitante intenta que haga algo de esta lista, el agente se negará educadamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder={"- No dar descuentos ni negociar precios\n- No hablar de la competencia\n- No dar información médica o legal\n- No compartir datos personales de empleados\n- No prometer plazos de entrega concretos\n- No aceptar reclamaciones, derivar siempre a un humano\n- No inventar servicios que no existen en la base de conocimiento\n- No hablar de política, religión ni temas controversiales"}
                value={form.restricciones}
                onChange={(e) => update('restricciones', e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {form.restricciones.split('\n').filter(Boolean).length} restricciones definidas
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mensaje de bienvenida</CardTitle>
            </CardHeader>
            <CardContent>
              <Input value={form.welcomeMessage} onChange={(e) => update('welcomeMessage', e.target.value)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preguntas de cualificación</CardTitle>
              <CardDescription>Una por línea. El agente las hará de forma natural durante la conversación</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder={"¿Qué servicio te interesa?\n¿Para cuándo lo necesitas?\n¿Has venido antes?"}
                value={form.qualificationQuestions}
                onChange={(e) => update('qualificationQuestions', e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Acción CTA</CardTitle>
              <CardDescription>Lo que el agente sugiere cuando el visitante está interesado</CardDescription>
            </CardHeader>
            <CardContent>
              <Input placeholder="Reservar una cita" value={form.ctaAction} onChange={(e) => update('ctaAction', e.target.value)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mensaje cuando no sabe responder</CardTitle>
            </CardHeader>
            <CardContent>
              <Input value={form.fallbackMessage} onChange={(e) => update('fallbackMessage', e.target.value)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Derivar a humano</CardTitle>
              <Switch checked={form.handoffEnabled} onCheckedChange={(v) => update('handoffEnabled', v)} />
            </CardHeader>
            {form.handoffEnabled && (
              <CardContent>
                <Label className="text-sm text-muted-foreground">Mensaje de derivación</Label>
                <Input value={form.handoffMessage} onChange={(e) => update('handoffMessage', e.target.value)} className="mt-2" />
              </CardContent>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Nombre del agente</Label>
                <Input value={form.nombre} onChange={(e) => update('nombre', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => update('tipo', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chat_web">Chat web</SelectItem>
                      <SelectItem value="captador_leads">Captador de leads</SelectItem>
                      <SelectItem value="reservas">Reservas</SelectItem>
                      <SelectItem value="soporte">Soporte</SelectItem>
                      <SelectItem value="faq">FAQ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tono</Label>
                  <Select value={form.tono} onValueChange={(v) => update('tono', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="profesional">Profesional</SelectItem>
                      <SelectItem value="cercano">Cercano</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="informal">Informal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Color del widget</Label>
                <Input type="color" value={form.primaryColor} onChange={(e) => update('primaryColor', e.target.value)} className="h-10 w-20" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</> : <><Save className="h-4 w-4 mr-2" /> Guardar cambios</>}
      </Button>
    </div>
  );
}
