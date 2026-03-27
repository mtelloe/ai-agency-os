export const PLANS = {
  free: {
    nombre: 'Free',
    precio_mensual: 0,
    creditos: 3,
    limites: { auditorias: 3, leads: 10, agentes: 0, usuarios: 1, nichos_custom: 0 },
    features: ['3 auditorías', '10 leads', 'Dashboard básico'],
  },
  starter: {
    nombre: 'Starter',
    precio_mensual: 29,
    creditos: 50,
    limites: { auditorias: 20, leads: 50, agentes: 3, usuarios: 2, nichos_custom: 3 },
    features: ['20 auditorías/mes', '50 leads', '3 agentes IA', 'Propuestas y scripts', '2 usuarios'],
  },
  pro: {
    nombre: 'Pro',
    precio_mensual: 79,
    creditos: 200,
    limites: { auditorias: -1, leads: 500, agentes: 20, usuarios: 5, nichos_custom: 10 },
    features: ['Auditorías ilimitadas', '500 leads', '20 agentes IA', 'Prospección automática', 'Outreach automático', '5 usuarios'],
  },
  agency: {
    nombre: 'Agency',
    precio_mensual: 199,
    creditos: -1,
    limites: { auditorias: -1, leads: -1, agentes: -1, usuarios: -1, nichos_custom: -1 },
    features: ['Todo ilimitado', 'White-label', 'API access', 'Soporte prioritario'],
  },
} as const;

export const CREDIT_COSTS = {
  auditoria: 1,
  propuesta: 1,
  scripts: 1,
  prospeccion: 2,
  agente: 1,
} as const;

export const PIPELINE_STAGES: Array<{ key: string; label: string; color: string }> = [
  { key: 'Nuevo', label: 'Nuevo', color: 'bg-gray-500' },
  { key: 'Auditado', label: 'Auditado', color: 'bg-blue-500' },
  { key: 'Contactado', label: 'Contactado', color: 'bg-yellow-500' },
  { key: 'Demo creada', label: 'Demo creada', color: 'bg-purple-500' },
  { key: 'Propuesta enviada', label: 'Propuesta enviada', color: 'bg-indigo-500' },
  { key: 'Follow-up', label: 'Follow-up', color: 'bg-orange-500' },
  { key: 'Ganado', label: 'Ganado', color: 'bg-green-500' },
  { key: 'Perdido', label: 'Perdido', color: 'bg-red-500' },
];
