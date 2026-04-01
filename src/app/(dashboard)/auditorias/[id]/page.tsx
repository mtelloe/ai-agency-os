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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ListSkeleton } from '@/components/shared/loading-skeleton';
import {
  AlertTriangle, CheckCircle, Lightbulb, Bot, Wrench, TrendingUp,
  DollarSign, FileText, PenTool, Loader2, ArrowLeft, Pencil, Save, X, Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
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

interface EditForm {
  score_oportunidad: number;
  resumen_negocio: string;
  cliente_ideal: string;
  servicios: string;
  problemas: string[];
  oportunidades: string[];
  mejoras_web: string[];
  roi_estimado: string;
  pricing_sugerido: { setup: number; mensual: number };
  automatizaciones_recomendadas: Array<{ nombre: string; descripcion: string; impacto: string }>;
  agentes_recomendados: Array<{ nombre: string; tipo: string; descripcion: string; precio: number }>;
  contacto_nombre: string;
  contacto_cargo: string;
  contacto_email: string;
  contacto_telefono: string;
}

function initEditForm(auditoria: Auditoria): EditForm {
  return {
    score_oportunidad: auditoria.score_oportunidad || 0,
    resumen_negocio: auditoria.resumen_negocio || '',
    cliente_ideal: auditoria.cliente_ideal || '',
    servicios: auditoria.servicios || '',
    problemas: [...(auditoria.problemas || [])],
    oportunidades: [...(auditoria.oportunidades || [])],
    mejoras_web: [...(auditoria.mejoras_web || [])],
    roi_estimado: auditoria.roi_estimado || '',
    pricing_sugerido: { setup: auditoria.pricing_sugerido?.setup || 0, mensual: auditoria.pricing_sugerido?.mensual || 0 },
    automatizaciones_recomendadas: (auditoria.automatizaciones_recomendadas || []).map(a => ({ ...a })),
    agentes_recomendados: (auditoria.agentes_recomendados || []).map(a => ({ ...a })),
    contacto_nombre: ((auditoria as unknown as Record<string, string>).contacto_nombre) || '',
    contacto_cargo: ((auditoria as unknown as Record<string, string>).contacto_cargo) || '',
    contacto_email: ((auditoria as unknown as Record<string, string>).contacto_email) || '',
    contacto_telefono: ((auditoria as unknown as Record<string, string>).contacto_telefono) || '',
  };
}

function ContactSection({ auditoria, auditoriaId }: { auditoria: Auditoria; auditoriaId: string }) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const a = auditoria as unknown as Record<string, string>;
  const hasName = !!a.contacto_nombre;

  const [contacto, setContacto] = useState({
    nombre: a.contacto_nombre || '',
    cargo: a.contacto_cargo || '',
    email: a.contacto_email || '',
    telefono: a.contacto_telefono || '',
  });
  const [saving, setSaving] = useState(false);

  async function saveContact() {
    setSaving(true);
    const { error } = await supabase
      .from('auditorias')
      .update({
        contacto_nombre: contacto.nombre || null,
        contacto_cargo: contacto.cargo || null,
        contacto_email: contacto.email || null,
        contacto_telefono: contacto.telefono || null,
      })
      .eq('id', auditoriaId);
    setSaving(false);
    if (error) {
      toast.error('Error al guardar');
    } else {
      toast.success('Contacto guardado');
      queryClient.invalidateQueries({ queryKey: ['auditoria', auditoriaId] });
    }
  }

  return (
    <Card className={hasName ? 'border-blue-500/20' : 'border-yellow-500/30 bg-yellow-500/5'}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {hasName ? (
            <><span className="text-blue-500">👤</span> Contacto detectado</>
          ) : (
            <><AlertTriangle className="h-4 w-4 text-yellow-500" /> Contacto no encontrado — rellénalo para personalizar el cold email</>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Nombre *</p>
            <Input
              value={contacto.nombre}
              onChange={(e) => setContacto(prev => ({ ...prev, nombre: e.target.value }))}
              placeholder="Nombre del responsable"
              className={!contacto.nombre ? 'border-yellow-500/50' : ''}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Cargo</p>
            <Input
              value={contacto.cargo}
              onChange={(e) => setContacto(prev => ({ ...prev, cargo: e.target.value }))}
              placeholder="CEO, Director, Propietario..."
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Email</p>
            <Input
              type="email"
              value={contacto.email}
              onChange={(e) => setContacto(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@empresa.com"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Teléfono</p>
            <Input
              value={contacto.telefono}
              onChange={(e) => setContacto(prev => ({ ...prev, telefono: e.target.value }))}
              placeholder="+34 600 000 000"
            />
          </div>
        </div>
        <Button size="sm" onClick={saveContact} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
          Guardar contacto
        </Button>
      </CardContent>
    </Card>
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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

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

  useEffect(() => {
    if (auditoria && !editForm) {
      setEditForm(initEditForm(auditoria));
    }
  }, [auditoria, editForm]);

  function startEditing() {
    if (!auditoria) return;
    setEditForm(initEditForm(auditoria));
    setEditing(true);
  }

  function cancelEditing() {
    if (!auditoria) return;
    setEditForm(initEditForm(auditoria));
    setEditing(false);
  }

  function updateField<K extends keyof EditForm>(field: K, value: EditForm[K]) {
    setEditForm(prev => prev ? { ...prev, [field]: value } : prev);
  }

  function updateListItem(field: 'problemas' | 'oportunidades' | 'mejoras_web', index: number, value: string) {
    setEditForm(prev => {
      if (!prev) return prev;
      const arr = [...prev[field]];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  }

  function removeListItem(field: 'problemas' | 'oportunidades' | 'mejoras_web', index: number) {
    setEditForm(prev => {
      if (!prev) return prev;
      const arr = [...prev[field]];
      arr.splice(index, 1);
      return { ...prev, [field]: arr };
    });
  }

  function addListItem(field: 'problemas' | 'oportunidades' | 'mejoras_web', defaultValue: string) {
    setEditForm(prev => {
      if (!prev) return prev;
      return { ...prev, [field]: [...prev[field], defaultValue] };
    });
  }

  function updateAutomatizacion(index: number, key: keyof EditForm['automatizaciones_recomendadas'][0], value: string) {
    setEditForm(prev => {
      if (!prev) return prev;
      const arr = prev.automatizaciones_recomendadas.map((a, i) => i === index ? { ...a, [key]: value } : a);
      return { ...prev, automatizaciones_recomendadas: arr };
    });
  }

  function removeAutomatizacion(index: number) {
    setEditForm(prev => {
      if (!prev) return prev;
      const arr = [...prev.automatizaciones_recomendadas];
      arr.splice(index, 1);
      return { ...prev, automatizaciones_recomendadas: arr };
    });
  }

  function addAutomatizacion() {
    setEditForm(prev => {
      if (!prev) return prev;
      return { ...prev, automatizaciones_recomendadas: [...prev.automatizaciones_recomendadas, { nombre: '', descripcion: '', impacto: 'Medio' }] };
    });
  }

  function updateAgente(index: number, key: keyof EditForm['agentes_recomendados'][0], value: string | number) {
    setEditForm(prev => {
      if (!prev) return prev;
      const arr = prev.agentes_recomendados.map((a, i) => i === index ? { ...a, [key]: value } : a);
      return { ...prev, agentes_recomendados: arr };
    });
  }

  function removeAgente(index: number) {
    setEditForm(prev => {
      if (!prev) return prev;
      const arr = [...prev.agentes_recomendados];
      arr.splice(index, 1);
      return { ...prev, agentes_recomendados: arr };
    });
  }

  function addAgente() {
    setEditForm(prev => {
      if (!prev) return prev;
      return { ...prev, agentes_recomendados: [...prev.agentes_recomendados, { nombre: '', tipo: '', descripcion: '', precio: 0 }] };
    });
  }

  async function handleSave() {
    if (!editForm) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('auditorias')
        .update({
          score_oportunidad: editForm.score_oportunidad,
          resumen_negocio: editForm.resumen_negocio,
          cliente_ideal: editForm.cliente_ideal,
          servicios: editForm.servicios,
          problemas: editForm.problemas,
          oportunidades: editForm.oportunidades,
          mejoras_web: editForm.mejoras_web,
          roi_estimado: editForm.roi_estimado,
          pricing_sugerido: editForm.pricing_sugerido,
          automatizaciones_recomendadas: editForm.automatizaciones_recomendadas,
          agentes_recomendados: editForm.agentes_recomendados,
          contacto_nombre: editForm.contacto_nombre || null,
          contacto_cargo: editForm.contacto_cargo || null,
          contacto_email: editForm.contacto_email || null,
          contacto_telefono: editForm.contacto_telefono || null,
        })
        .eq('id', id);
      if (error) throw error;
      toast.success('Cambios guardados correctamente');
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['auditoria', id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  }

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
  if (!auditoria) return <p>Auditoria no encontrada</p>;

  const empresa = auditoria.empresa as (typeof auditoria.empresa & { nombre?: string; nicho?: string }) | undefined;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/auditorias">
          <Button variant="ghost" size="icon-sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{empresa?.nombre || new URL(auditoria.url).hostname}</h1>
          <p className="text-sm text-muted-foreground">{auditoria.url}</p>
        </div>
        {auditoria.estado === 'completada' && !editing && (
          <ScoreCircle score={auditoria.score_oportunidad || 0} />
        )}
        {auditoria.estado === 'completada' && editing && editForm && (
          <div className="flex flex-col items-center gap-1">
            <ScoreCircle score={editForm.score_oportunidad} />
            <Input
              type="number"
              min={0}
              max={100}
              value={editForm.score_oportunidad}
              onChange={(e) => updateField('score_oportunidad', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-20 text-center text-sm"
            />
          </div>
        )}
        {auditoria.estado === 'completada' && (
          <div className="flex gap-2">
            {!editing ? (
              <Button variant="outline" size="sm" onClick={startEditing}>
                <Pencil className="h-4 w-4 mr-1.5" />
                Editar
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={cancelEditing} disabled={saving}>
                  <X className="h-4 w-4 mr-1.5" />
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                  Guardar
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {auditoria.estado === 'error' && (
        <Card className="border-destructive">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Error en la auditoria</p>
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

          {/* Contacto — siempre editable inline */}
          <ContactSection auditoria={auditoria} auditoriaId={id} />

          {/* Resumen */}
          <Card>
            <CardHeader><CardTitle className="text-base">Resumen del negocio</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {editing && editForm ? (
                <Textarea
                  value={editForm.resumen_negocio}
                  onChange={(e) => updateField('resumen_negocio', e.target.value)}
                  rows={4}
                  placeholder="Resumen del negocio..."
                />
              ) : (
                <p>{auditoria.resumen_negocio}</p>
              )}
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Cliente ideal</p>
                {editing && editForm ? (
                  <Textarea
                    value={editForm.cliente_ideal}
                    onChange={(e) => updateField('cliente_ideal', e.target.value)}
                    rows={2}
                    placeholder="Cliente ideal..."
                  />
                ) : (
                  <p className="text-sm">{auditoria.cliente_ideal}</p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Servicios principales</p>
                {editing && editForm ? (
                  <Textarea
                    value={editForm.servicios}
                    onChange={(e) => updateField('servicios', e.target.value)}
                    rows={2}
                    placeholder="Servicios principales..."
                  />
                ) : (
                  <p className="text-sm">{auditoria.servicios}</p>
                )}
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
              {editing && editForm ? (
                <div className="space-y-2">
                  {editForm.problemas.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-red-500 shrink-0">•</span>
                      <Input
                        value={p}
                        onChange={(e) => updateListItem('problemas', i, e.target.value)}
                        className="flex-1"
                      />
                      <Button variant="ghost" size="icon-xs" onClick={() => removeListItem('problemas', i)}>
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addListItem('problemas', '')}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Añadir
                  </Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {(auditoria.problemas || []).map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-red-500 mt-0.5">•</span>
                      {p}
                    </li>
                  ))}
                </ul>
              )}
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
              {editing && editForm ? (
                <div className="space-y-2">
                  {editForm.oportunidades.map((o, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      <Input
                        value={o}
                        onChange={(e) => updateListItem('oportunidades', i, e.target.value)}
                        className="flex-1"
                      />
                      <Button variant="ghost" size="icon-xs" onClick={() => removeListItem('oportunidades', i)}>
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addListItem('oportunidades', '')}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Añadir
                  </Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {(auditoria.oportunidades || []).map((o, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      {o}
                    </li>
                  ))}
                </ul>
              )}
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
              {editing && editForm ? (
                <div className="space-y-4">
                  {editForm.automatizaciones_recomendadas.map((a, i) => (
                    <div key={i} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={a.nombre}
                          onChange={(e) => updateAutomatizacion(i, 'nombre', e.target.value)}
                          placeholder="Nombre"
                          className="flex-1 font-medium"
                        />
                        <select
                          value={a.impacto}
                          onChange={(e) => updateAutomatizacion(i, 'impacto', e.target.value)}
                          className={cn(
                            'h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none',
                            'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
                          )}
                        >
                          <option value="Alto">Alto</option>
                          <option value="Medio">Medio</option>
                          <option value="Bajo">Bajo</option>
                        </select>
                        <Button variant="ghost" size="icon-xs" onClick={() => removeAutomatizacion(i)}>
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                      <Input
                        value={a.descripcion}
                        onChange={(e) => updateAutomatizacion(i, 'descripcion', e.target.value)}
                        placeholder="Descripcion..."
                        className="text-sm"
                      />
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addAutomatizacion}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Añadir
                  </Button>
                </div>
              ) : (
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
              )}
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
              {editing && editForm ? (
                <div className="space-y-4">
                  {editForm.agentes_recomendados.map((a, i) => (
                    <div key={i} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={a.nombre}
                          onChange={(e) => updateAgente(i, 'nombre', e.target.value)}
                          placeholder="Nombre"
                          className="flex-1 font-medium"
                        />
                        <Button variant="ghost" size="icon-xs" onClick={() => removeAgente(i)}>
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={a.tipo}
                          onChange={(e) => updateAgente(i, 'tipo', e.target.value)}
                          placeholder="Tipo"
                          className="text-sm"
                        />
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={a.precio}
                            onChange={(e) => updateAgente(i, 'precio', parseFloat(e.target.value) || 0)}
                            placeholder="Precio"
                            className="text-sm"
                          />
                          <span className="text-xs text-muted-foreground shrink-0">/mes</span>
                        </div>
                      </div>
                      <Input
                        value={a.descripcion}
                        onChange={(e) => updateAgente(i, 'descripcion', e.target.value)}
                        placeholder="Descripcion..."
                        className="text-sm"
                      />
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addAgente}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Añadir
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {(auditoria.agentes_recomendados || []).map((a, i) => (
                    <Card key={i}>
                      <CardContent className="p-3">
                        <p className="text-sm font-medium">{a.nombre}</p>
                        <Badge variant="secondary" className="text-xs mt-1">{a.tipo}</Badge>
                        <p className="text-xs text-muted-foreground mt-2">{a.descripcion}</p>
                        <p className="text-sm font-bold text-primary mt-2">{a.precio}/mes</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mejoras web */}
          <Card>
            <CardHeader><CardTitle className="text-base">Mejoras web</CardTitle></CardHeader>
            <CardContent>
              {editing && editForm ? (
                <div className="space-y-2">
                  {editForm.mejoras_web.map((m, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <Input
                        value={m}
                        onChange={(e) => updateListItem('mejoras_web', i, e.target.value)}
                        className="flex-1"
                      />
                      <Button variant="ghost" size="icon-xs" onClick={() => removeListItem('mejoras_web', i)}>
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addListItem('mejoras_web', '')}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Añadir
                  </Button>
                </div>
              ) : (
                <ul className="space-y-1">
                  {(auditoria.mejoras_web || []).map((m, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {m}
                    </li>
                  ))}
                </ul>
              )}
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
                {editing && editForm ? (
                  <Textarea
                    value={editForm.roi_estimado}
                    onChange={(e) => updateField('roi_estimado', e.target.value)}
                    rows={3}
                    placeholder="ROI estimado..."
                  />
                ) : (
                  <p className="text-sm">{auditoria.roi_estimado}</p>
                )}
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
                {editing && editForm ? (
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Setup</p>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={editForm.pricing_sugerido.setup}
                          onChange={(e) => updateField('pricing_sugerido', { ...editForm.pricing_sugerido, setup: parseFloat(e.target.value) || 0 })}
                        />
                        <span className="text-sm text-muted-foreground shrink-0">&euro;</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Mensual</p>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={editForm.pricing_sugerido.mensual}
                          onChange={(e) => updateField('pricing_sugerido', { ...editForm.pricing_sugerido, mensual: parseFloat(e.target.value) || 0 })}
                        />
                        <span className="text-sm text-muted-foreground shrink-0">&euro;/mes</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-6">
                    <div>
                      <p className="text-xs text-muted-foreground">Setup</p>
                      <p className="text-xl font-bold">{auditoria.pricing_sugerido?.setup || '\u2014'}&euro;</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Mensual</p>
                      <p className="text-xl font-bold">{auditoria.pricing_sugerido?.mensual || '\u2014'}&euro;/mes</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
