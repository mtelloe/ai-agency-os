'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/hooks/use-workspace';
import { useUser } from '@/hooks/use-user';
import type { UserProfile, Actividad } from '@/lib/types/database';
import { PLANS } from '@/lib/constants';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { MetricCard } from '@/components/dashboard/metric-card';
import {
  Users,
  Settings,
  BarChart3,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Save,
  Loader2,
  Trash2,
  RotateCcw,
  UserMinus,
  Crown,
  FileText,
  Target,
  FileSpreadsheet,
  ScrollText,
  Bot,
  MessageSquare,
  Zap,
  ExternalLink,
  RefreshCw,
  Circle,
  Power,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthFetch } from '@/hooks/use-auth-fetch';

// ──────────────────────────── Tab: Usuarios ────────────────────────────

function TabUsuarios({ workspaceId }: { workspaceId: string }) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery<UserProfile[]>({
    queryKey: ['admin-users', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users_profile')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as UserProfile[];
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: 'admin' | 'member' }) => {
      const { error } = await supabase
        .from('users_profile')
        .update({ rol: newRole })
        .eq('id', userId)
        .eq('workspace_id', workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users', workspaceId] });
      toast.success('Rol actualizado correctamente');
    },
    onError: () => toast.error('Error al cambiar el rol'),
  });

  const removeUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('users_profile')
        .delete()
        .eq('id', userId)
        .eq('workspace_id', workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users', workspaceId] });
      toast.success('Usuario eliminado del workspace');
    },
    onError: () => toast.error('Error al eliminar al usuario'),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {users?.length ?? 0} usuario{(users?.length ?? 0) !== 1 ? 's' : ''} en el workspace
        </p>
      </div>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <span>Nombre</span>
          <span>Email</span>
          <span>Rol</span>
          <span>Ultimo login</span>
          <span>Acciones</span>
        </div>
        {users?.map((user) => (
          <div
            key={user.id}
            className="grid grid-cols-[1fr_1fr_auto_auto_auto] items-center gap-4 border-b px-4 py-3 last:border-b-0"
          >
            <span className="text-sm font-medium truncate">{user.nombre}</span>
            <span className="text-sm text-muted-foreground truncate">{user.email}</span>
            <Badge variant={user.rol === 'owner' ? 'default' : 'secondary'}>
              {user.rol === 'owner' && <Crown className="mr-1 size-3" />}
              {user.rol}
            </Badge>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {user.ultimo_login
                ? new Date(user.ultimo_login).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Nunca'}
            </span>
            <div className="flex items-center gap-1">
              {user.rol !== 'owner' && (
                <>
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={changeRole.isPending}
                    onClick={() =>
                      changeRole.mutate({
                        userId: user.id,
                        newRole: user.rol === 'admin' ? 'member' : 'admin',
                      })
                    }
                  >
                    {user.rol === 'admin' ? 'Hacer member' : 'Hacer admin'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon-xs"
                    disabled={removeUser.isPending}
                    onClick={() => removeUser.mutate(user.id)}
                  >
                    <UserMinus className="size-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────── Tab: Workspace ────────────────────────────

function TabWorkspace({ workspaceId }: { workspaceId: string }) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: workspace, isLoading } = useWorkspace();

  const [nombre, setNombre] = useState('');
  const [nombreInit, setNombreInit] = useState(false);
  const [savingName, setSavingName] = useState(false);

  const [autonomia, setAutonomia] = useState<{
    auto_outreach: boolean;
    auto_followup: boolean;
    auto_prospecting: boolean;
  }>({ auto_outreach: false, auto_followup: false, auto_prospecting: false });
  const [autonomiaInit, setAutonomiaInit] = useState(false);

  // Init state from workspace data
  if (workspace && !nombreInit) {
    setNombre(workspace.nombre);
    setNombreInit(true);
  }
  if (workspace && !autonomiaInit) {
    setAutonomia(workspace.config_autonomia ?? {
      auto_outreach: false,
      auto_followup: false,
      auto_prospecting: false,
    });
    setAutonomiaInit(true);
  }

  async function handleSaveName() {
    setSavingName(true);
    const { error } = await supabase
      .from('workspaces')
      .update({ nombre })
      .eq('id', workspaceId);
    setSavingName(false);
    if (error) {
      toast.error('Error al guardar el nombre');
    } else {
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      toast.success('Nombre actualizado');
    }
  }

  async function handleToggleAutonomia(
    key: 'auto_outreach' | 'auto_followup' | 'auto_prospecting',
    value: boolean
  ) {
    const updated = { ...autonomia, [key]: value };
    setAutonomia(updated);
    const { error } = await supabase
      .from('workspaces')
      .update({ config_autonomia: updated })
      .eq('id', workspaceId);
    if (error) {
      toast.error('Error al guardar la configuracion');
      setAutonomia(autonomia); // revert
    } else {
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      toast.success('Configuracion actualizada');
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!workspace) return null;

  return (
    <div className="space-y-6">
      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Detalles del workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Slug</p>
              <p className="font-medium">{workspace.slug}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Plan</p>
              <Badge variant="secondary">{PLANS[workspace.plan]?.nombre ?? workspace.plan}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Creado el</p>
              <p className="font-medium">
                {new Date(workspace.created_at).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ws-name">Nombre del workspace</Label>
            <div className="flex gap-2">
              <Input
                id="ws-name"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del workspace"
              />
              <Button onClick={handleSaveName} disabled={savingName || nombre === workspace.nombre}>
                {savingName ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Guardar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Autonomia config */}
      <Card>
        <CardHeader>
          <CardTitle>Configuracion de autonomia</CardTitle>
          <CardDescription>
            Activa o desactiva las acciones automaticas del sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto Outreach</p>
              <p className="text-xs text-muted-foreground">
                Enviar mensajes de captacion automaticamente
              </p>
            </div>
            <Switch
              checked={autonomia.auto_outreach}
              onCheckedChange={(v) => handleToggleAutonomia('auto_outreach', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto Follow-up</p>
              <p className="text-xs text-muted-foreground">
                Enviar seguimientos automaticos a leads sin respuesta
              </p>
            </div>
            <Switch
              checked={autonomia.auto_followup}
              onCheckedChange={(v) => handleToggleAutonomia('auto_followup', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto Prospecting</p>
              <p className="text-xs text-muted-foreground">
                Buscar y cualificar nuevos leads automaticamente
              </p>
            </div>
            <Switch
              checked={autonomia.auto_prospecting}
              onCheckedChange={(v) => handleToggleAutonomia('auto_prospecting', v)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────── Tab: Uso del sistema ────────────────────────────

function TabUso({ workspaceId }: { workspaceId: string }) {
  const supabase = createClient();
  const { data: workspace } = useWorkspace();

  const { data: counts, isLoading } = useQuery({
    queryKey: ['admin-usage', workspaceId],
    queryFn: async () => {
      const [auditorias, leads, propuestas, scripts, agentes, conversaciones] = await Promise.all([
        supabase.from('auditorias').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
        supabase.from('propuestas').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
        supabase.from('scripts').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
        supabase.from('agentes').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
        supabase.from('conversaciones').select('id', { count: 'exact', head: true }),
      ]);
      return {
        auditorias: auditorias.count ?? 0,
        leads: leads.count ?? 0,
        propuestas: propuestas.count ?? 0,
        scripts: scripts.count ?? 0,
        agentes: agentes.count ?? 0,
        conversaciones: conversaciones.count ?? 0,
      };
    },
  });

  const creditosTotal = workspace?.creditos_total ?? 0;
  const creditosUsados = workspace?.creditos_usados ?? 0;
  const creditosDisponibles = creditosTotal - creditosUsados;
  const usagePercent = creditosTotal > 0 ? (creditosUsados / creditosTotal) * 100 : 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <MetricCard title="Auditorias" value={counts?.auditorias ?? 0} icon={FileText} />
        <MetricCard title="Leads" value={counts?.leads ?? 0} icon={Target} />
        <MetricCard title="Propuestas" value={counts?.propuestas ?? 0} icon={FileSpreadsheet} />
        <MetricCard title="Scripts" value={counts?.scripts ?? 0} icon={ScrollText} />
        <MetricCard title="Agentes" value={counts?.agentes ?? 0} icon={Bot} />
        <MetricCard title="Conversaciones" value={counts?.conversaciones ?? 0} icon={MessageSquare} />
      </div>

      {/* Credits */}
      <Card>
        <CardHeader>
          <CardTitle>Creditos</CardTitle>
          <CardDescription>Uso de creditos del workspace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{creditosTotal}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{creditosUsados}</p>
              <p className="text-xs text-muted-foreground">Usados</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{creditosDisponibles}</p>
              <p className="text-xs text-muted-foreground">Disponibles</p>
            </div>
          </div>
          <Progress value={usagePercent}>
            <span className="text-sm text-muted-foreground">
              {Math.round(usagePercent)}% utilizado
            </span>
          </Progress>
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────── Tab: Actividad ────────────────────────────

function TabActividad({ workspaceId }: { workspaceId: string }) {
  const supabase = createClient();

  const { data: actividades, isLoading } = useQuery<Actividad[]>({
    queryKey: ['admin-actividad', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('actividad')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Actividad[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!actividades?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Activity className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No hay actividad registrada todavia</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {actividades.map((act) => (
        <div
          key={act.id}
          className="flex items-start gap-3 rounded-lg border px-4 py-3"
        >
          <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm">{act.descripcion}</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {act.tipo_evento}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(act.created_at).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────── Tab: n8n ────────────────────────────

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

function TabN8n() {
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<{
    configured: boolean;
    workflows: N8nWorkflow[];
    error?: string;
  }>({
    queryKey: ['admin-n8n-workflows'],
    queryFn: async () => {
      const res = await authFetch('/api/n8n/workflows');
      if (!res.ok && res.status !== 200) {
        throw new Error('Error al conectar con n8n');
      }
      return res.json();
    },
  });

  const toggleWorkflow = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await authFetch('/api/n8n/workflows', {
        method: 'PATCH',
        body: JSON.stringify({ id, active }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Error al cambiar el estado');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-n8n-workflows'] });
      toast.success('Estado del workflow actualizado');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const n8nBaseUrl = process.env.NEXT_PUBLIC_N8N_BASE_URL;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const configured = data?.configured ?? false;
  const workflows = data?.workflows ?? [];
  const connectionError = error || (!configured && data?.error);

  return (
    <div className="space-y-6">
      {/* Estado de conexion */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="size-5 text-yellow-500" />
              <div>
                <CardTitle>Conexion con n8n</CardTitle>
                <CardDescription>Automatizaciones y workflows</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {configured ? (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  <Circle className="mr-1 size-2 fill-green-500 text-green-500" />
                  Conectado
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-red-500/20">
                  <Circle className="mr-1 size-2 fill-red-500 text-red-500" />
                  No configurado
                </Badge>
              )}
              <Button variant="outline" size="xs" onClick={() => refetch()}>
                <RefreshCw className="size-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        {!configured && (
          <CardContent>
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
              <p className="text-sm font-medium text-yellow-700">n8n no esta configurado</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Anade las variables de entorno <code className="rounded bg-muted px-1 py-0.5">N8N_BASE_URL</code> y{' '}
                <code className="rounded bg-muted px-1 py-0.5">N8N_API_KEY</code> para conectar con tu instancia de n8n.
              </p>
            </div>
          </CardContent>
        )}
        {connectionError && configured && (
          <CardContent>
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-sm font-medium text-red-700">Error de conexion</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {error instanceof Error ? error.message : 'No se pudo conectar con n8n. Comprueba la configuracion.'}
              </p>
            </div>
          </CardContent>
        )}
        {configured && n8nBaseUrl && (
          <CardFooter>
            <a
              href={n8nBaseUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-1 size-3" />
                Abrir panel de n8n
              </Button>
            </a>
          </CardFooter>
        )}
      </Card>

      {/* Lista de workflows */}
      {configured && workflows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Workflows ({workflows.length})</CardTitle>
            <CardDescription>Lista de automatizaciones configuradas en n8n</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span>Nombre</span>
                <span>ID</span>
                <span>Estado</span>
                <span>Accion</span>
              </div>
              {workflows.map((wf) => (
                <div
                  key={wf.id}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b px-4 py-3 last:border-b-0"
                >
                  <span className="text-sm font-medium truncate">{wf.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{wf.id}</span>
                  <Badge
                    className={
                      wf.active
                        ? 'bg-green-500/10 text-green-600 border-green-500/20'
                        : 'bg-red-500/10 text-red-600 border-red-500/20'
                    }
                  >
                    <Circle
                      className={`mr-1 size-2 ${wf.active ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'}`}
                    />
                    {wf.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={toggleWorkflow.isPending}
                    onClick={() => toggleWorkflow.mutate({ id: wf.id, active: !wf.active })}
                  >
                    <Power className="size-3 mr-1" />
                    {wf.active ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {configured && workflows.length === 0 && !connectionError && (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No hay workflows creados en n8n todavia</p>
            {n8nBaseUrl && (
              <a href={n8nBaseUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="mt-4">
                  <ExternalLink className="mr-1 size-3" />
                  Crear workflow en n8n
                </Button>
              </a>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ──────────────────────────── Tab: Peligro ────────────────────────────

function TabPeligro({ workspaceId }: { workspaceId: string }) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleDeleteAll() {
    if (confirmText !== 'ELIMINAR') return;
    setDeleting(true);
    try {
      // Delete in order to respect FK constraints
      await supabase.from('actividad').delete().eq('workspace_id', workspaceId);
      await supabase.from('credito_ledger').delete().eq('workspace_id', workspaceId);
      await supabase.from('conversaciones').delete().neq('id', '');
      await supabase.from('scripts').delete().eq('workspace_id', workspaceId);
      await supabase.from('propuestas').delete().eq('workspace_id', workspaceId);
      await supabase.from('agentes').delete().eq('workspace_id', workspaceId);
      await supabase.from('auditorias').delete().eq('workspace_id', workspaceId);
      await supabase.from('leads').delete().eq('workspace_id', workspaceId);
      await supabase.from('empresas').delete().eq('workspace_id', workspaceId);

      queryClient.invalidateQueries();
      toast.success('Todos los datos han sido eliminados');
      setDeleteOpen(false);
      setConfirmText('');
    } catch {
      toast.error('Error al eliminar los datos');
    } finally {
      setDeleting(false);
    }
  }

  async function handleResetCredits() {
    setResetting(true);
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({ creditos_usados: 0 })
        .eq('id', workspaceId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      toast.success('Creditos reseteados a 0 usados');
      setResetOpen(false);
    } catch {
      toast.error('Error al resetear los creditos');
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            Zona de peligro
          </CardTitle>
          <CardDescription>
            Estas acciones son irreversibles. Procede con extremo cuidado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Delete all data */}
          <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div>
              <p className="text-sm font-medium">Eliminar todos los datos</p>
              <p className="text-xs text-muted-foreground">
                Se eliminaran todas las auditorias, leads, propuestas, scripts, agentes y actividad.
              </p>
            </div>
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger render={<Button variant="destructive" size="sm" />}>
                <Trash2 className="size-4 mr-1" />
                Eliminar todo
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar eliminacion total</DialogTitle>
                  <DialogDescription>
                    Esta accion eliminara TODOS los datos del workspace de forma permanente.
                    Escribe <strong>ELIMINAR</strong> para confirmar.
                  </DialogDescription>
                </DialogHeader>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder='Escribe "ELIMINAR" para confirmar'
                />
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>
                    Cancelar
                  </DialogClose>
                  <Button
                    variant="destructive"
                    disabled={confirmText !== 'ELIMINAR' || deleting}
                    onClick={handleDeleteAll}
                  >
                    {deleting && <Loader2 className="size-4 animate-spin mr-1" />}
                    Eliminar todos los datos
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Reset credits */}
          <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div>
              <p className="text-sm font-medium">Resetear creditos</p>
              <p className="text-xs text-muted-foreground">
                Pone a cero los creditos usados del workspace.
              </p>
            </div>
            <Dialog open={resetOpen} onOpenChange={setResetOpen}>
              <DialogTrigger render={<Button variant="destructive" size="sm" />}>
                <RotateCcw className="size-4 mr-1" />
                Resetear
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Resetear creditos</DialogTitle>
                  <DialogDescription>
                    Esto pondra a cero los creditos usados del workspace. Los creditos totales
                    no se modificaran.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>
                    Cancelar
                  </DialogClose>
                  <Button
                    variant="destructive"
                    disabled={resetting}
                    onClick={handleResetCredits}
                  >
                    {resetting && <Loader2 className="size-4 animate-spin mr-1" />}
                    Confirmar reseteo
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────── Main Page ────────────────────────────

export default function AdminPage() {
  const { data: user, isLoading: userLoading } = useUser();
  const { data: workspace, isLoading: wsLoading } = useWorkspace();

  if (userLoading || wsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Only owner or admin can access
  if (!user || (user.rol !== 'owner' && user.rol !== 'admin')) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldCheck className="mb-4 size-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Acceso restringido</h2>
        <p className="text-sm text-muted-foreground">
          Necesitas ser propietario o administrador para acceder a este panel.
        </p>
      </div>
    );
  }

  if (!workspace) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Administracion</h1>
        <p className="text-muted-foreground">Gestion completa del workspace</p>
      </div>

      <Tabs defaultValue="usuarios">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="usuarios">
            <Users className="size-4 mr-1" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="workspace">
            <Settings className="size-4 mr-1" />
            Workspace
          </TabsTrigger>
          <TabsTrigger value="uso">
            <BarChart3 className="size-4 mr-1" />
            Uso del sistema
          </TabsTrigger>
          <TabsTrigger value="actividad">
            <Activity className="size-4 mr-1" />
            Actividad
          </TabsTrigger>
          <TabsTrigger value="n8n">
            <Zap className="size-4 mr-1" />
            n8n
          </TabsTrigger>
          <TabsTrigger value="peligro">
            <AlertTriangle className="size-4 mr-1" />
            Peligro
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-4">
          <TabUsuarios workspaceId={workspace.id} />
        </TabsContent>
        <TabsContent value="workspace" className="mt-4">
          <TabWorkspace workspaceId={workspace.id} />
        </TabsContent>
        <TabsContent value="uso" className="mt-4">
          <TabUso workspaceId={workspace.id} />
        </TabsContent>
        <TabsContent value="actividad" className="mt-4">
          <TabActividad workspaceId={workspace.id} />
        </TabsContent>
        <TabsContent value="n8n" className="mt-4">
          <TabN8n />
        </TabsContent>
        <TabsContent value="peligro" className="mt-4">
          <TabPeligro workspaceId={workspace.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
