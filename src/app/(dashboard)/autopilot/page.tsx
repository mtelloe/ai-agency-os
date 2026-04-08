'use client';

import { useState, useCallback } from 'react';
import { useWorkspace } from '@/hooks/use-workspace';
import { useUser } from '@/hooks/use-user';
import { useAuthFetch } from '@/hooks/use-auth-fetch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Rocket,
  Loader2,
  Check,
  AlertCircle,
  Search,
  ScanSearch,
  FileText,
  PenTool,
  Send,
  ArrowRight,
  Sparkles,
  Zap,
  CreditCard,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

// ─── Constants ──────────────────────────────────────────────────────

const NICHOS = [
  'Restaurantes',
  'Clinicas dentales',
  'Inmobiliarias',
  'Centros de estetica',
  'Abogados',
  'Gimnasios',
  'Autoescuelas',
  'Clinicas veterinarias',
  'Academias de idiomas',
  'Talleres mecanicos',
];

const CANTIDADES = [
  { value: '5', label: '5 empresas' },
  { value: '10', label: '10 empresas' },
  { value: '15', label: '15 empresas' },
];

// ─── Types ──────────────────────────────────────────────────────────

type StepStatus = 'pending' | 'running' | 'done' | 'error';

interface StepState {
  status: StepStatus;
  message: string;
  detail?: string;
}

interface ProspectResult {
  empresaId: string;
  nombre: string;
  website: string;
  email: string;
}

interface AuditResult {
  empresaId: string;
  nombre: string;
  auditoriaId: string;
  contactoEmail: string | null;
  score: number | null;
}

interface GenerateResult {
  empresaId: string;
  nombre: string;
  propuestaId: string;
  scriptId: string;
}

interface SkippedResult {
  empresaId: string;
  nombre: string;
  reason: string;
}

interface SendResult {
  empresaId: string;
  nombre: string;
  emailId: string;
}

// ─── Page ───────────────────────────────────────────────────────────

export default function AutopilotPage() {
  const { data: workspace, isLoading: wsLoading } = useWorkspace();
  const { data: user } = useUser();
  const { authFetch } = useAuthFetch();

  // Config state
  const [nicho, setNicho] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [cantidad, setCantidad] = useState('5');
  const [sendEmails, setSendEmails] = useState(false);

  // Execution state
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [steps, setSteps] = useState<Record<string, StepState>>({
    prospect: { status: 'pending', message: 'Buscando empresas...' },
    audit: { status: 'pending', message: 'Auditando webs...' },
    generate: { status: 'pending', message: 'Generando propuestas y scripts...' },
    send: { status: 'pending', message: 'Enviando emails...' },
  });

  // Results
  const [prospects, setProspects] = useState<ProspectResult[]>([]);
  const [audits, setAudits] = useState<AuditResult[]>([]);
  const [generated, setGenerated] = useState<GenerateResult[]>([]);
  const [sent, setSent] = useState<SendResult[]>([]);
  const [skipped, setSkipped] = useState<SkippedResult[]>([]);

  // Credit estimate
  const creditEstimate = 2 + 3 * Number(cantidad);

  // ─── Step updater ─────────────────────────────────────────────────

  const updateStep = useCallback((key: string, update: Partial<StepState>) => {
    setSteps(prev => ({
      ...prev,
      [key]: { ...prev[key], ...update },
    }));
  }, []);

  // ─── API call helper ──────────────────────────────────────────────

  async function apiCall(body: Record<string, unknown>) {
    const res = await authFetch('/api/autopilot/run', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Error del servidor (${res.status})`);
    }
    if (!res.ok) {
      const msg = data?.error || `Error del servidor (${res.status})`;
      toast.error(msg);
      throw new Error(msg);
    }
    return data;
  }

  // ─── Launch campaign ──────────────────────────────────────────────

  async function launch() {
    if (!workspace || !user) return;
    if (!nicho || !ciudad) {
      toast.error('Selecciona un nicho y una ciudad');
      return;
    }

    setRunning(true);
    setFinished(false);
    setProspects([]);
    setAudits([]);
    setGenerated([]);
    setSent([]);
    setSkipped([]);
    setSteps({
      prospect: { status: 'pending', message: 'Buscando empresas...' },
      audit: { status: 'pending', message: 'Auditando webs...' },
      generate: { status: 'pending', message: 'Generando propuestas y scripts...' },
      send: { status: 'pending', message: 'Enviando emails...' },
    });

    try {
      // ── Step 1: Prospect ──
      updateStep('prospect', { status: 'running', message: 'Buscando empresas...' });

      const prospectData = await apiCall({
        action: 'prospect',
        nicho,
        ciudad,
        cantidad: Number(cantidad),
        workspaceId: workspace.id,
        userId: user.id,
      });

      const prospectResults: ProspectResult[] = prospectData.prospects || [];
      setProspects(prospectResults);

      if (prospectResults.length === 0) {
        updateStep('prospect', {
          status: 'error',
          message: 'No se encontraron empresas',
          detail: 'Intenta con otro nicho o ciudad',
        });
        setRunning(false);
        setFinished(true);
        return;
      }

      updateStep('prospect', {
        status: 'done',
        message: `${prospectResults.length} empresas encontradas`,
      });

      // ── Step 2: Audit each prospect ──
      updateStep('audit', { status: 'running', message: `Auditando webs... 0/${prospectResults.length}` });

      const auditResults: AuditResult[] = [];
      let auditCount = 0;

      for (const prospect of prospectResults) {
        if (!prospect.website) {
          auditCount++;
          updateStep('audit', {
            status: 'running',
            message: `Auditando webs... ${auditCount}/${prospectResults.length}`,
          });
          continue;
        }

        try {
          const auditData = await apiCall({
            action: 'audit',
            empresaId: prospect.empresaId,
            url: prospect.website,
            workspaceId: workspace.id,
            userId: user.id,
          });

          auditResults.push({
            empresaId: prospect.empresaId,
            nombre: prospect.nombre,
            auditoriaId: auditData.auditoriaId,
            contactoEmail: auditData.contactoEmail,
            score: auditData.score,
          });
          setAudits([...auditResults]);
        } catch (err) {
          console.error(`Error auditando ${prospect.nombre}:`, err);
          // Continue with rest
        }

        auditCount++;
        updateStep('audit', {
          status: 'running',
          message: `Auditando webs... ${auditCount}/${prospectResults.length}`,
        });
      }

      if (auditResults.length === 0) {
        updateStep('audit', {
          status: 'error',
          message: 'No se pudo auditar ninguna web',
          detail: 'Las webs no estaban disponibles',
        });
        updateStep('generate', { status: 'pending', message: 'Sin auditorias para generar' });
        updateStep('send', { status: 'pending', message: 'Sin scripts para enviar' });
        setRunning(false);
        setFinished(true);
        return;
      }

      updateStep('audit', {
        status: 'done',
        message: `${auditResults.length}/${prospectResults.length} auditorias completadas`,
      });

      // ── Step 3: Generate proposals + scripts ──
      updateStep('generate', { status: 'running', message: `Generando... 0/${auditResults.length}` });

      const generateResults: GenerateResult[] = [];
      let genCount = 0;

      for (const audit of auditResults) {
        try {
          const genData = await apiCall({
            action: 'generate',
            auditoriaId: audit.auditoriaId,
            workspaceId: workspace.id,
            userId: user.id,
          });

          if (genData.skipped) {
            const skippedResults = [...skipped, { empresaId: audit.empresaId, nombre: audit.nombre, reason: genData.reason }];
            setSkipped(skippedResults);
          } else {
            generateResults.push({
              empresaId: audit.empresaId,
              nombre: audit.nombre,
              propuestaId: genData.propuestaId,
              scriptId: genData.scriptId,
            });
            setGenerated([...generateResults]);
          }
        } catch (err) {
          console.error(`Error generando para ${audit.nombre}:`, err);
        }

        genCount++;
        updateStep('generate', {
          status: 'running',
          message: `Generando... ${genCount}/${auditResults.length}`,
        });
      }

      updateStep('generate', {
        status: generateResults.length > 0 ? 'done' : 'error',
        message: generateResults.length > 0
          ? `${generateResults.length} propuestas y scripts generados`
          : 'No se pudo generar ninguna propuesta',
      });

      // ── Step 4: Send emails (if enabled) ──
      if (sendEmails && generateResults.length > 0) {
        updateStep('send', { status: 'running', message: 'Enviando emails...' });

        const sendResults: SendResult[] = [];
        let sendCount = 0;

        for (const gen of generateResults) {
          // Find email: first check audit contactoEmail, then prospect email
          const audit = auditResults.find(a => a.empresaId === gen.empresaId);
          const prospect = prospectResults.find(p => p.empresaId === gen.empresaId);
          const email = audit?.contactoEmail || prospect?.email;

          if (!email) {
            sendCount++;
            updateStep('send', {
              status: 'running',
              message: `Enviando emails... ${sendCount}/${generateResults.length}`,
            });
            continue;
          }

          try {
            const sendData = await apiCall({
              action: 'send',
              scriptId: gen.scriptId,
              to: email,
              workspaceId: workspace.id,
              userId: user.id,
            });

            sendResults.push({
              empresaId: gen.empresaId,
              nombre: gen.nombre,
              emailId: sendData.emailId,
            });
            setSent([...sendResults]);
          } catch (err) {
            console.error(`Error enviando email a ${gen.nombre}:`, err);
          }

          sendCount++;
          updateStep('send', {
            status: 'running',
            message: `Enviando emails... ${sendCount}/${generateResults.length}`,
          });
        }

        updateStep('send', {
          status: sendResults.length > 0 ? 'done' : 'error',
          message: sendResults.length > 0
            ? `${sendResults.length} emails enviados`
            : 'No se pudo enviar ningun email',
        });
      } else if (!sendEmails) {
        updateStep('send', {
          status: 'done',
          message: 'Envio de emails desactivado',
        });
      }

      setFinished(true);
      toast.success('Campaña completada');
    } catch (err) {
      console.error('Autopilot error:', err);
      toast.error(err instanceof Error ? err.message : 'Error en el piloto automático');
      // Show results even if there was an error partway through
      setFinished(true);
    } finally {
      setRunning(false);
      // Scroll to results
      setTimeout(() => {
        document.getElementById('autopilot-results')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  }

  // ─── Reset ────────────────────────────────────────────────────────

  function reset() {
    setRunning(false);
    setFinished(false);
    setNicho('');
    setCiudad('');
    setCantidad('5');
    setSendEmails(false);
    setProspects([]);
    setAudits([]);
    setGenerated([]);
    setSent([]);
    setSkipped([]);
    setSteps({
      prospect: { status: 'pending', message: 'Buscando empresas...' },
      audit: { status: 'pending', message: 'Auditando webs...' },
      generate: { status: 'pending', message: 'Generando propuestas y scripts...' },
      send: { status: 'pending', message: 'Enviando emails...' },
    });
  }

  // ─── Step icon ────────────────────────────────────────────────────

  function StepIcon({ status }: { status: StepStatus }) {
    if (status === 'running') return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    if (status === 'done') return <Check className="h-5 w-5 text-green-500" />;
    if (status === 'error') return <AlertCircle className="h-5 w-5 text-red-500" />;
    return <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />;
  }

  const STEP_ICONS = {
    prospect: Search,
    audit: ScanSearch,
    generate: FileText,
    send: Send,
  };

  // ─── Loading ──────────────────────────────────────────────────────

  if (wsLoading) {
    return (
      <div className="space-y-8 p-6">
        <div>
          <Skeleton className="h-8 w-72 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!workspace || !user) return null;

  const showProgress = running || finished;

  return (
    <div className="space-y-8 p-6 max-w-4xl mx-auto">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 mb-4">
          <Rocket className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">La funcion estrella</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Piloto automatico</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Lanza una campaña completa con un click. Prospectamos, auditamos, generamos propuestas y enviamos emails. Todo automatico.
        </p>
      </div>

      {/* ── Configuration card ──────────────────────────────────────── */}
      {!showProgress && (
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Configura tu campaña</CardTitle>
                <CardDescription>
                  Define el nicho, la ciudad y la cantidad de empresas a prospectar
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Nicho */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Nicho</label>
              <Select value={nicho} onValueChange={(v) => setNicho(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un nicho" />
                </SelectTrigger>
                <SelectContent>
                  {NICHOS.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ciudad */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Ciudad</label>
              <Input
                placeholder="Madrid, Barcelona, Valencia..."
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
              />
            </div>

            {/* Cantidad */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Cantidad de empresas</label>
              <Select value={cantidad} onValueChange={(v) => setCantidad(v ?? '5')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANTIDADES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Send emails switch */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Enviar cold emails automaticamente</label>
                <p className="text-xs text-muted-foreground">
                  {sendEmails ? (
                    <span className="text-amber-600 font-medium">
                      Se enviaran emails reales a las empresas prospectadas
                    </span>
                  ) : (
                    'Los emails se generaran pero no se enviaran'
                  )}
                </p>
              </div>
              <Switch checked={sendEmails} onCheckedChange={setSendEmails} />
            </div>

            {/* Credit estimate */}
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-4">
              <CreditCard className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm">
                  Esta campaña costara aproximadamente{' '}
                  <span className="font-bold text-primary">{creditEstimate} creditos</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  2 (prospeccion) + {Number(cantidad)} (auditorias) + {Number(cantidad)} (propuestas) + {Number(cantidad)} (scripts)
                </p>
              </div>
            </div>

            {/* Launch button */}
            <Button
              size="lg"
              className="w-full h-14 text-lg font-semibold gap-3"
              onClick={launch}
              disabled={running || !nicho || !ciudad}
            >
              {running ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Ejecutando campaña...
                </>
              ) : (
                <>
                  <Rocket className="h-5 w-5" />
                  Lanzar campaña
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Progress section ────────────────────────────────────────── */}
      {showProgress && (
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>
                  {finished ? 'Campaña completada' : 'Ejecutando campaña...'}
                </CardTitle>
                <CardDescription>
                  {nicho} en {ciudad} &middot; {cantidad} empresas
                  {sendEmails && ' &middot; Con envio de emails'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {/* Vertical stepper */}
            {(['prospect', 'audit', 'generate', 'send'] as const).map((key, idx) => {
              const step = steps[key];
              const Icon = STEP_ICONS[key];
              const isLast = key === 'send';

              // Skip send step display if emails not enabled and not finished
              if (key === 'send' && !sendEmails && step.status === 'pending') return null;

              return (
                <div key={key} className="flex gap-4">
                  {/* Timeline line + icon */}
                  <div className="flex flex-col items-center">
                    <div
                      className={
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors ' +
                        (step.status === 'done'
                          ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                          : step.status === 'running'
                          ? 'border-primary bg-primary/10'
                          : step.status === 'error'
                          ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                          : 'border-muted bg-muted/30')
                      }
                    >
                      {step.status === 'running' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : step.status === 'done' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : step.status === 'error' ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    {!isLast && (
                      <div
                        className={
                          'w-0.5 flex-1 min-h-6 transition-colors ' +
                          (step.status === 'done' ? 'bg-green-500' : 'bg-muted')
                        }
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-6 pt-2 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={
                          'text-sm font-medium ' +
                          (step.status === 'done'
                            ? 'text-green-600'
                            : step.status === 'running'
                            ? 'text-primary'
                            : step.status === 'error'
                            ? 'text-red-500'
                            : 'text-muted-foreground')
                        }
                      >
                        {step.message}
                      </p>
                      {step.status === 'done' && (
                        <Badge variant="secondary" className="text-xs">
                          Completado
                        </Badge>
                      )}
                    </div>
                    {step.detail && (
                      <p className="text-xs text-muted-foreground mt-1">{step.detail}</p>
                    )}

                    {/* Inline results for this step */}
                    {key === 'prospect' && step.status === 'done' && prospects.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {prospects.map((p) => (
                          <div key={p.empresaId} className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="font-medium text-foreground">{p.nombre}</span>
                            <span className="truncate">&middot; {p.website}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {key === 'audit' && audits.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {audits.map((a) => (
                          <div key={a.auditoriaId} className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="font-medium text-foreground">{a.nombre}</span>
                            {a.score && (
                              <Badge variant="secondary" className="text-xs py-0">
                                Score: {a.score}
                              </Badge>
                            )}
                            {a.contactoEmail && (
                              <span className="text-green-600">{a.contactoEmail}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ── Results section ─────────────────────────────────────────── */}
      {finished && (
        <div id="autopilot-results" className="space-y-6">
          {/* Summary card */}
          <Card className="bg-gradient-to-br from-primary/5 via-background to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-950/30 mx-auto">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold">Campaña completada</h2>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {prospects.length} empresas prospectadas
                  </Badge>
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {audits.length} auditorias
                  </Badge>
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {generated.length} propuestas generadas
                  </Badge>
                  {skipped.length > 0 && (
                    <Badge variant="destructive" className="text-sm px-3 py-1">
                      {skipped.length} sin contacto — saltadas
                    </Badge>
                  )}
                  {sendEmails && (
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      {sent.length} emails enviados
                    </Badge>
                  )}
                </div>
                {skipped.length > 0 && (
                  <div className="mt-4 text-left bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 space-y-1">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">
                      Empresas saltadas por falta de datos de contacto:
                    </p>
                    {skipped.map((s) => (
                      <div key={s.empresaId} className="text-xs text-amber-600 dark:text-amber-500 flex items-start gap-1">
                        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                        <span><span className="font-medium">{s.nombre}</span> — {s.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/pipeline">
              <Button variant="outline" className="gap-2">
                Ver pipeline
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/auditorias">
              <Button variant="outline" className="gap-2">
                Ver auditorias
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/propuestas">
              <Button variant="outline" className="gap-2">
                Ver propuestas
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button onClick={reset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Lanzar otra campaña
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
