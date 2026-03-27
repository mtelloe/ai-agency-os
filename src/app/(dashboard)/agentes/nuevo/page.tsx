'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/hooks/use-workspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, ArrowRight, Check, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const STEPS = ['Contexto', 'Personalizar', 'Desplegar'];

export default function NuevoAgentePage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    tipo: 'chat_web',
    tono: 'profesional',
    businessContext: '',
    welcomeMessage: 'Hola, ¿en qué puedo ayudarte?',
    qualificationQuestions: '',
    ctaAction: 'Reservar una cita',
    fallbackMessage: 'Lo siento, no puedo ayudarte con eso. ¿Quieres que te ponga en contacto con un humano?',
    handoffEnabled: true,
    handoffMessage: 'Te paso con un miembro del equipo. Un momento por favor.',
    primaryColor: '#6366f1',
  });
  const [createdAgent, setCreatedAgent] = useState<{ id: string } | null>(null);

  const router = useRouter();
  const supabase = createClient();
  const { data: workspace } = useWorkspace();

  function update(field: string, value: string | boolean | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate() {
    if (!workspace) return;
    setLoading(true);

    try {
      const questions = form.qualificationQuestions
        .split('\n')
        .map((q) => q.trim())
        .filter(Boolean);

      const { data, error } = await supabase
        .from('agentes')
        .insert({
          workspace_id: workspace.id,
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
          widget_config: { primaryColor: form.primaryColor, position: 'bottom-right', size: 'standard' },
          estado: 'activo',
        })
        .select('id')
        .single();

      if (error) throw error;

      setCreatedAgent(data);
      toast.success('Agente creado y desplegado');
      setStep(2);
    } catch (error) {
      toast.error('Error al crear el agente');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/agentes">
          <Button variant="ghost" size="icon-sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nuevo agente IA</h1>
          <p className="text-sm text-muted-foreground">Paso {step + 1} de 3: {STEPS[step]}</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className={cn('h-1.5 flex-1 rounded-full', i <= step ? 'bg-primary' : 'bg-muted')} />
        ))}
      </div>

      {/* Step 1: Context */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Contexto del negocio</CardTitle>
            <CardDescription>Describe el negocio para que el agente sepa de qué hablar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del agente</Label>
              <Input placeholder="Ej: Asistente de Clínica Dental Sol" value={form.nombre} onChange={(e) => update('nombre', e.target.value)} />
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
              <Label>Contexto del negocio</Label>
              <Textarea
                placeholder="Describe el negocio: qué hace, servicios, horarios, dirección, precios, etc."
                value={form.businessContext}
                onChange={(e) => update('businessContext', e.target.value)}
                rows={6}
              />
            </div>
            <Button onClick={() => setStep(1)} disabled={!form.nombre || !form.businessContext} className="w-full">
              Siguiente <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Customize */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Personalizar agente</CardTitle>
            <CardDescription>Ajusta el comportamiento del chatbot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Mensaje de bienvenida</Label>
              <Input value={form.welcomeMessage} onChange={(e) => update('welcomeMessage', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Preguntas de cualificación (una por línea)</Label>
              <Textarea
                placeholder={"¿Qué servicio te interesa?\n¿Cuál es tu presupuesto?\n¿Para cuándo lo necesitas?"}
                value={form.qualificationQuestions}
                onChange={(e) => update('qualificationQuestions', e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Acción CTA</Label>
              <Input placeholder="Ej: Reservar una cita" value={form.ctaAction} onChange={(e) => update('ctaAction', e.target.value)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Permitir derivar a humano</Label>
              <Switch checked={form.handoffEnabled} onCheckedChange={(v) => update('handoffEnabled', v)} />
            </div>
            <div className="space-y-2">
              <Label>Color del widget</Label>
              <Input type="color" value={form.primaryColor} onChange={(e) => update('primaryColor', e.target.value)} className="h-10 w-20" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(0)} className="flex-1">Atrás</Button>
              <Button onClick={handleCreate} disabled={loading} className="flex-1">
                {loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Creando...</> : <><Check className="h-4 w-4 mr-1" /> Crear y desplegar</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Deploy */}
      {step === 2 && createdAgent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-500">Agente desplegado</CardTitle>
            <CardDescription>Tu chatbot está listo para usar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Código embed (pegar en la web del cliente)</Label>
              <div className="bg-muted p-3 rounded-md">
                <code className="text-xs break-all">
                  {`<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget/${createdAgent.id}.js" async></script>`}
                </code>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`<script src="${window.location.origin}/widget/${createdAgent.id}.js" async></script>`);
                  toast.success('Copiado');
                }}
              >
                <Copy className="h-3 w-3 mr-1" /> Copiar código
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Link de demo (compartir por WhatsApp/email)</Label>
              <div className="bg-muted p-3 rounded-md">
                <code className="text-xs break-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/chat/${createdAgent.id}` : ''}
                </code>
              </div>
            </div>
            <div className="flex gap-3">
              <Link href={`/chat/${createdAgent.id}`} target="_blank" className="flex-1">
                <Button variant="outline" className="w-full">Probar agente</Button>
              </Link>
              <Button onClick={() => router.push('/agentes')} className="flex-1">
                Ir a mis agentes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
