export type Plan = 'free' | 'starter' | 'pro' | 'agency';
export type UserRole = 'owner' | 'admin' | 'member';
export type EstadoAuditoria = 'pendiente' | 'procesando' | 'completada' | 'error';
export type EstadoPipeline = 'Nuevo' | 'Auditado' | 'Contactado' | 'Demo creada' | 'Propuesta enviada' | 'Follow-up' | 'Ganado' | 'Perdido';
export type EstadoPropuesta = 'borrador' | 'enviada' | 'aceptada' | 'rechazada' | 'negociando';
export type EstadoAgente = 'borrador' | 'activo' | 'pausado' | 'archivado';
export type TipoAgente = 'chat_web' | 'whatsapp' | 'captador_leads' | 'reservas' | 'seguimiento' | 'soporte' | 'reactivacion' | 'faq';
export type TonoAgente = 'profesional' | 'cercano' | 'premium' | 'informal';
export type CategoriaPlantilla = 'captacion_leads' | 'seguimiento_clientes' | 'reactivacion_clientes' | 'agente_whatsapp' | 'agente_voz' | 'crm_pipeline' | 'email_marketing';
export type TipoMovimiento = 'cargo' | 'abono';

export interface Workspace {
  id: string;
  nombre: string;
  slug: string;
  logo_url: string | null;
  plan: Plan;
  creditos_total: number;
  creditos_usados: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  config_autonomia: {
    auto_outreach: boolean;
    auto_followup: boolean;
    auto_prospecting: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  workspace_id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  ultimo_login: string | null;
  created_at: string;
}

export interface Empresa {
  id: string;
  workspace_id: string;
  nombre: string;
  website: string | null;
  telefono: string | null;
  email: string | null;
  ciudad: string | null;
  pais: string;
  nicho: string | null;
  tamano: string;
  origen: string;
  estado: string;
  created_at: string;
  updated_at: string;
}

export interface Auditoria {
  id: string;
  workspace_id: string;
  empresa_id: string | null;
  url: string;
  estado: EstadoAuditoria;
  score_oportunidad: number | null;
  resumen_negocio: string | null;
  cliente_ideal: string | null;
  servicios: string | null;
  problemas: string[];
  oportunidades: string[];
  automatizaciones_recomendadas: Array<{ nombre: string; descripcion: string; impacto: string }>;
  agentes_recomendados: Array<{ nombre: string; tipo: string; descripcion: string; precio: number }>;
  mejoras_web: string[];
  roi_estimado: string | null;
  pricing_sugerido: { setup: number; mensual: number } | null;
  raw_scraping: Record<string, unknown> | null;
  raw_ai_response: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  empresa?: Empresa;
}

export type EnrichmentStatus = 'pending' | 'full' | 'partial' | 'no_contact';

export interface Lead {
  id: string;
  workspace_id: string;
  empresa_id: string | null;
  nombre_contacto: string;
  cargo: string | null;
  email: string | null;
  telefono: string | null;
  estado_pipeline: EstadoPipeline;
  valor_estimado: number | null;
  score: number | null;
  fuente: string | null;
  proximo_paso: string | null;
  owner_user_id: string | null;
  ultima_actividad_at: string;
  created_at: string;
  updated_at: string;
  // Enrichment fields (Apollo)
  decisor_nombre: string | null;
  decisor_cargo: string | null;
  decisor_email: string | null;
  decisor_movil: string | null;
  decisor_linkedin: string | null;
  enrichment_status: EnrichmentStatus;
  enrichment_source: string | null;
  empresa?: Empresa;
}

export interface Propuesta {
  id: string;
  workspace_id: string;
  empresa_id: string | null;
  lead_id: string | null;
  auditoria_id: string | null;
  titulo: string;
  resumen_ejecutivo: string | null;
  problemas: string | null;
  solucion: string | null;
  stack: string | null;
  cronograma: string | null;
  precio_setup: number | null;
  precio_mensual: number | null;
  roi: string | null;
  cta_cierre: string | null;
  estado: EstadoPropuesta;
  share_token: string;
  version: number;
  created_at: string;
  updated_at: string;
  empresa?: Empresa;
  auditoria?: Auditoria;
}

export interface Script {
  id: string;
  workspace_id: string;
  empresa_id: string | null;
  auditoria_id: string | null;
  cold_email: string | null;
  script_llamada: string | null;
  mensaje_whatsapp: string | null;
  follow_up: string | null;
  pitch_demo: string | null;
  objeciones: Array<{ objecion: string; respuesta: string }>;
  created_at: string;
}

export interface Agente {
  id: string;
  workspace_id: string;
  empresa_id: string | null;
  nombre: string;
  tipo: TipoAgente;
  system_prompt: string | null;
  welcome_message: string | null;
  conversation_flow: Array<{ step: string; message: string }>;
  qualification_questions: string[];
  cta_action: string | null;
  tono: TonoAgente;
  idioma: string;
  business_context: string | null;
  fallback_message: string;
  handoff_enabled: boolean;
  handoff_message: string;
  widget_config: {
    primaryColor: string;
    position: string;
    size: string;
  };
  estado: EstadoAgente;
  deploy_url: string | null;
  knowledge: string | null;
  restricciones: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversacion {
  id: string;
  agente_id: string;
  visitor_id: string | null;
  visitor_name: string | null;
  visitor_email: string | null;
  visitor_phone: string | null;
  messages: Array<{ role: 'assistant' | 'user'; content: string; timestamp: string }>;
  estado: string;
  qualified: boolean;
  qualification_data: Record<string, unknown> | null;
  canal: string;
  created_at: string;
  updated_at: string;
}

export interface Nicho {
  id: string;
  workspace_id: string | null;
  nombre: string;
  problemas_comunes: string[];
  ofertas_recomendadas: string[];
  automatizaciones_tipicas: string[];
  precio_base_setup: number | null;
  precio_base_mensual: number | null;
  script_base: string | null;
  activo: boolean;
  created_at: string;
}

export interface CreditoLedger {
  id: string;
  workspace_id: string;
  user_id: string | null;
  accion: string;
  creditos: number;
  tipo_movimiento: TipoMovimiento;
  referencia_tipo: string | null;
  referencia_id: string | null;
  descripcion: string | null;
  balance_despues: number;
  created_at: string;
}

export interface Actividad {
  id: string;
  workspace_id: string;
  user_id: string | null;
  tipo_evento: string;
  entidad_tipo: string | null;
  entidad_id: string | null;
  descripcion: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PlantillaAutomatizacion {
  id: string;
  workspace_id: string | null;
  nombre: string;
  nicho: string | null;
  categoria: CategoriaPlantilla;
  descripcion: string | null;
  trigger_desc: string | null;
  pasos: Array<{ orden: number; descripcion: string; herramienta: string }>;
  integraciones: string[];
  n8n_template: Record<string, unknown> | null;
  make_template: Record<string, unknown> | null;
  created_at: string;
}

export interface Suscripcion {
  id: string;
  workspace_id: string;
  plan: Plan;
  billing_cycle: string;
  estado: string;
  precio: number | null;
  creditos_incluidos: number | null;
  limites: {
    auditorias: number;
    leads: number;
    agentes: number;
    usuarios: number;
    nichos_custom: number;
  };
  stripe_subscription_id: string | null;
  renovacion_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingEvent {
  id: string;
  workspace_id: string;
  user_id: string | null;
  tipo: string;
  amount: number;
  currency: string;
  status: string;
  stripe_event_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─── Sales Orchestrator types ─────────────────────────────────────────────────

export type AgentStatus = 'active' | 'paused' | 'archived';

export interface SalesAgentRow {
  id: string;
  workspace_id: string;
  slug: string;
  name: string;
  role: string;
  system_prompt: string;
  model: string;
  config: Record<string, unknown>;
  status: AgentStatus;
}

export interface AgentScheduleRow {
  id: string;
  agent_id: string;
  cron_expression: string;
  timezone: string;
  input_template: Record<string, unknown>;
  active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
}

export type OutreachStatus = 'pending' | 'sent' | 'failed' | 'bounced' | 'replied';

export interface OutreachLogRow {
  id: string;
  workspace_id: string;
  contact_id: string;
  template_id: string;
  agent_execution_id: string | null;
  status: OutreachStatus;
  gmail_message_id: string | null;
  error: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface EmailTemplateRow {
  id: string;
  workspace_id: string;
  slug: string;
  name: string;
  subject: string;
  body_text: string;
  body_html: string | null;
  variables: string[];
  active: boolean;
}

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface AgentExecutionRow {
  id: string;
  agent_id: string;
  workspace_id: string;
  trigger: 'scheduled' | 'manual' | 'webhook';
  status: ExecutionStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface OutreachContactRow {
  id: string;
  workspace_id: string;
  first_name: string;
  last_name: string;
  email: string;
  title: string | null;
  company_name: string | null;
  industry: string | null;
  created_at: string;
}
