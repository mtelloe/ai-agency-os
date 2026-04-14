# Sales Orchestrator — Fase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tener un servicio Node corriendo 24/7 en Digital Ocean + EasyPanel que lee/escribe en la Supabase de `ai-agency-os`, carga los 8 agentes de ventas desde BD, y ejecuta uno de prueba (`sales-outbound-strategist`) cada hora contra un lead fake, dejando trazabilidad completa en `agent_executions`.

**Architecture:** Repo nuevo `sales-orchestrator` (Node 20 + TypeScript + Express + BullMQ + Redis) separado de `ai-agency-os`. Usa Supabase service role key para leer agentes y persistir ejecuciones. Un scheduler basado en node-cron lee `agent_schedules` cada minuto y encola jobs en BullMQ; un worker consume jobs, llama a Claude via Anthropic SDK, y guarda resultado+tokens+coste en `agent_executions`. Migración SQL y seed viven en `ai-agency-os/supabase/`. CI con GitHub Actions (lint+typecheck+tests) antes de auto-deploy a EasyPanel.

**Tech Stack:** Node 20, TypeScript 5.5, Express 4, @supabase/supabase-js 2.100, @anthropic-ai/sdk 0.80, BullMQ 5, ioredis 5, node-cron 3, pino 9, vitest 2, zod 3, tsx, Docker, GitHub Actions.

---

## File Structure

### En `ai-agency-os/` (modificaciones)
- `supabase/migrations/20260414_add_agents_tables.sql` — **Create** — tablas `agents`, `agent_schedules`, `agent_executions` + RLS + índices
- `supabase/seed_agents.ts` — **Create** — script TS que parsea `agency-agents/sales/*.md` e inserta filas en `agents`
- `src/app/api/orchestrator/heartbeat/route.ts` — **Create** — endpoint GET para que el orchestrator reporte estado

### En `~/sales-orchestrator/` (nuevo repo)
- `package.json`, `tsconfig.json`, `vitest.config.ts`, `.eslintrc.json`, `.gitignore`, `.env.example`, `README.md`
- `src/index.ts` — entry point; arranca Express + scheduler + worker
- `src/config/env.ts` — validación zod de variables de entorno
- `src/config/logger.ts` — pino logger configurado
- `src/db/supabase.ts` — singleton del cliente Supabase (service role)
- `src/db/agents.ts` — queries: `loadAgent(id)`, `listActiveSchedules()`
- `src/db/executions.ts` — queries: `createExecution`, `updateExecution`
- `src/llm/anthropic.ts` — wrapper de Anthropic SDK con cálculo de coste
- `src/agents/AgentRunner.ts` — ejecuta un agente: carga config → llama LLM → guarda execution
- `src/queue/redis.ts` — conexión ioredis
- `src/queue/worker.ts` — BullMQ worker consumiendo cola `agent-runs`
- `src/scheduler/Scheduler.ts` — node-cron cada minuto, encola jobs según `agent_schedules`
- `src/api/server.ts` — Express con `/health` y `/api/execute/:agentSlug`
- `tests/config/env.test.ts`, `tests/llm/anthropic.test.ts`, `tests/agents/AgentRunner.test.ts`, `tests/scheduler/Scheduler.test.ts`, `tests/integration/end-to-end.test.ts`
- `Dockerfile`, `docker-compose.yml`
- `.github/workflows/ci.yml`
- `deploy/EASYPANEL.md`

---

## Task 1: Supabase migration — tablas del orchestrator

**Files:**
- Create: `/Users/mariatelloesbri/ai-agency-analysis/ai-agency-os/supabase/migrations/20260414_add_agents_tables.sql`

- [ ] **Step 1: Escribir la migración completa**

```sql
-- 20260414_add_agents_tables.sql
-- Sales Orchestrator: catálogo de agentes, programación y ejecuciones

CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','paused','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, slug)
);

CREATE TABLE IF NOT EXISTS agent_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  cron_expression TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Madrid',
  input_template JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES agent_schedules(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','completed','failed','cancelled')),
  trigger TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (trigger IN ('scheduled','manual','webhook')),
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB,
  error TEXT,
  tokens_input INT NOT NULL DEFAULT 0,
  tokens_output INT NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_workspace ON agents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_schedules_active_next ON agent_schedules(next_run_at) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_executions_agent ON agent_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_workspace ON agent_executions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_executions_created ON agent_executions(created_at DESC);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_select_own_workspace" ON agents
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "schedules_select_own_workspace" ON agent_schedules
  FOR SELECT USING (
    agent_id IN (
      SELECT id FROM agents WHERE workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "executions_select_own_workspace" ON agent_executions
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- service_role ya tiene bypass de RLS por defecto en Supabase

CREATE OR REPLACE FUNCTION update_agent_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_agents_updated
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_agent_updated_at();
```

- [ ] **Step 2: Aplicar migración a Supabase local (o remoto)**

Run: `cd /Users/mariatelloesbri/ai-agency-analysis/ai-agency-os && npx supabase db push` (si tiene CLI) o pegarlo en el SQL editor del dashboard.
Expected: 3 tablas creadas, políticas RLS activas, sin errores.

- [ ] **Step 3: Verificar con query**

Run: `psql $SUPABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('agents','agent_schedules','agent_executions');"`
Expected: 3 filas devueltas.

- [ ] **Step 4: Commit**

```bash
cd /Users/mariatelloesbri/ai-agency-analysis/ai-agency-os
git add supabase/migrations/20260414_add_agents_tables.sql
git commit -m "feat(db): add agents, schedules and executions tables for orchestrator"
```

---

## Task 2: Seed script — cargar 8 agentes desde markdown

**Files:**
- Create: `/Users/mariatelloesbri/ai-agency-analysis/ai-agency-os/supabase/seed_agents.ts`

- [ ] **Step 1: Escribir el seed script**

```typescript
// supabase/seed_agents.ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import matter from 'gray-matter';

const SALES_DIR = '/Users/mariatelloesbri/ai-agency-analysis/agency-agents/sales';
const WORKSPACE_ID = process.env.SEED_WORKSPACE_ID;
if (!WORKSPACE_ID) throw new Error('SEED_WORKSPACE_ID env var required');

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const files = readdirSync(SALES_DIR).filter((f) => f.endsWith('.md'));
  for (const file of files) {
    const raw = readFileSync(join(SALES_DIR, file), 'utf8');
    const { data, content } = matter(raw);
    const slug = file.replace(/\.md$/, '');
    const row = {
      workspace_id: WORKSPACE_ID,
      slug,
      name: data.name ?? slug,
      role: slug.replace(/-/g, '_'),
      description: data.description ?? null,
      system_prompt: content.trim(),
      model: 'claude-sonnet-4-6',
      config: { color: data.color, emoji: data.emoji, vibe: data.vibe },
      status: 'active',
    };
    const { error } = await supabase
      .from('agents')
      .upsert(row, { onConflict: 'workspace_id,slug' });
    if (error) {
      console.error(`FAIL ${slug}:`, error.message);
      process.exit(1);
    }
    console.log(`OK   ${slug}`);
  }
}

main();
```

- [ ] **Step 2: Instalar dependencias del seed**

Run: `cd /Users/mariatelloesbri/ai-agency-analysis/ai-agency-os && npm install --save-dev gray-matter tsx`
Expected: packages añadidos a devDependencies.

- [ ] **Step 3: Ejecutar seed**

Run:
```bash
cd /Users/mariatelloesbri/ai-agency-analysis/ai-agency-os
export SEED_WORKSPACE_ID=<tu-workspace-uuid>
export SUPABASE_URL=<url>
export SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
npx tsx supabase/seed_agents.ts
```
Expected: 8 líneas "OK   sales-*".

- [ ] **Step 4: Verificar en BD**

Run en SQL editor Supabase: `SELECT slug, name FROM agents ORDER BY slug;`
Expected: 8 filas (sales-account-strategist, sales-coach, sales-deal-strategist, sales-discovery-coach, sales-engineer, sales-outbound-strategist, sales-pipeline-analyst, sales-proposal-strategist).

- [ ] **Step 5: Commit**

```bash
cd /Users/mariatelloesbri/ai-agency-analysis/ai-agency-os
git add supabase/seed_agents.ts package.json package-lock.json
git commit -m "feat(seed): load 8 sales agents from markdown into agents table"
```

---

## Task 3: Scaffold del repo `sales-orchestrator`

**Files:**
- Create: `/Users/mariatelloesbri/sales-orchestrator/package.json`
- Create: `/Users/mariatelloesbri/sales-orchestrator/tsconfig.json`
- Create: `/Users/mariatelloesbri/sales-orchestrator/vitest.config.ts`
- Create: `/Users/mariatelloesbri/sales-orchestrator/.gitignore`
- Create: `/Users/mariatelloesbri/sales-orchestrator/.env.example`
- Create: `/Users/mariatelloesbri/sales-orchestrator/README.md`

- [ ] **Step 1: Crear directorio e inicializar git**

Run:
```bash
mkdir -p /Users/mariatelloesbri/sales-orchestrator
cd /Users/mariatelloesbri/sales-orchestrator
git init
```

- [ ] **Step 2: Escribir `package.json`**

```json
{
  "name": "sales-orchestrator",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint 'src/**/*.ts' 'tests/**/*.ts'",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.80.0",
    "@supabase/supabase-js": "^2.100.1",
    "bullmq": "^5.0.0",
    "cron-parser": "^4.9.0",
    "express": "^4.19.2",
    "ioredis": "^5.4.1",
    "node-cron": "^3.0.3",
    "pino": "^9.0.0",
    "pino-pretty": "^11.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.12.0",
    "@types/node-cron": "^3.0.11",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.57.0",
    "tsx": "^4.7.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 3: Escribir `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: Escribir `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/**/*.test.ts'],
    testTimeout: 10_000,
  },
});
```

- [ ] **Step 5: Escribir `.gitignore`**

```
node_modules/
dist/
.env
.env.local
*.log
coverage/
.DS_Store
```

- [ ] **Step 6: Escribir `.env.example`**

```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx
DEFAULT_MODEL=claude-sonnet-4-6

# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=3100
NODE_ENV=development
LOG_LEVEL=info
API_SECRET_KEY=change-me-to-random-32-bytes

# Workspace
DEFAULT_WORKSPACE_ID=uuid-del-workspace
```

- [ ] **Step 7: Escribir `README.md` mínimo**

```markdown
# sales-orchestrator

Servicio Node 24/7 que ejecuta agentes de ventas definidos en Supabase.

## Run local
```
cp .env.example .env   # rellenar
npm install
docker compose up -d redis
npm run dev
```

## Test
`npm test`
```

- [ ] **Step 8: Instalar dependencias**

Run: `cd /Users/mariatelloesbri/sales-orchestrator && npm install`
Expected: `node_modules/` creado, sin errores críticos.

- [ ] **Step 9: Commit**

```bash
cd /Users/mariatelloesbri/sales-orchestrator
git add .
git commit -m "chore: scaffold sales-orchestrator repo"
```

---

## Task 4: Config module con validación zod (TDD)

**Files:**
- Create: `/Users/mariatelloesbri/sales-orchestrator/src/config/env.ts`
- Test: `/Users/mariatelloesbri/sales-orchestrator/tests/config/env.test.ts`

- [ ] **Step 1: Escribir el test (falla)**

```typescript
// tests/config/env.test.ts
import { describe, it, expect } from 'vitest';
import { loadEnv } from '../../src/config/env.js';

describe('loadEnv', () => {
  it('parses valid env into typed config', () => {
    const env = {
      SUPABASE_URL: 'https://x.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'key',
      ANTHROPIC_API_KEY: 'sk-ant-x',
      REDIS_URL: 'redis://localhost:6379',
      DEFAULT_WORKSPACE_ID: '00000000-0000-0000-0000-000000000001',
      API_SECRET_KEY: 'a'.repeat(32),
    };
    const cfg = loadEnv(env);
    expect(cfg.supabaseUrl).toBe('https://x.supabase.co');
    expect(cfg.port).toBe(3100);
    expect(cfg.defaultModel).toBe('claude-sonnet-4-6');
  });

  it('throws on missing required var', () => {
    expect(() => loadEnv({})).toThrowError(/SUPABASE_URL/);
  });

  it('rejects short API_SECRET_KEY', () => {
    expect(() => loadEnv({
      SUPABASE_URL: 'https://x.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'k',
      ANTHROPIC_API_KEY: 'k',
      REDIS_URL: 'redis://x',
      DEFAULT_WORKSPACE_ID: '00000000-0000-0000-0000-000000000001',
      API_SECRET_KEY: 'short',
    })).toThrowError(/API_SECRET_KEY/);
  });
});
```

- [ ] **Step 2: Run test, verify fails**

Run: `npm test -- tests/config/env.test.ts`
Expected: FAIL — "Cannot find module '../../src/config/env.js'"

- [ ] **Step 3: Implementar `src/config/env.ts`**

```typescript
import { z } from 'zod';

const schema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  DEFAULT_MODEL: z.string().default('claude-sonnet-4-6'),
  REDIS_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3100),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
  API_SECRET_KEY: z.string().min(32),
  DEFAULT_WORKSPACE_ID: z.string().uuid(),
});

export type AppConfig = {
  supabaseUrl: string;
  supabaseServiceKey: string;
  anthropicKey: string;
  defaultModel: string;
  redisUrl: string;
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  apiSecretKey: string;
  defaultWorkspaceId: string;
};

export function loadEnv(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): AppConfig {
  const parsed = schema.parse(env);
  return {
    supabaseUrl: parsed.SUPABASE_URL,
    supabaseServiceKey: parsed.SUPABASE_SERVICE_ROLE_KEY,
    anthropicKey: parsed.ANTHROPIC_API_KEY,
    defaultModel: parsed.DEFAULT_MODEL,
    redisUrl: parsed.REDIS_URL,
    port: parsed.PORT,
    nodeEnv: parsed.NODE_ENV,
    logLevel: parsed.LOG_LEVEL,
    apiSecretKey: parsed.API_SECRET_KEY,
    defaultWorkspaceId: parsed.DEFAULT_WORKSPACE_ID,
  };
}
```

- [ ] **Step 4: Run test, verify passes**

Run: `npm test -- tests/config/env.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/config/env.ts tests/config/env.test.ts
git commit -m "feat(config): add zod-validated env loader"
```

---

## Task 5: Logger module

**Files:**
- Create: `/Users/mariatelloesbri/sales-orchestrator/src/config/logger.ts`

- [ ] **Step 1: Implementar logger (no requiere test — wrapper trivial)**

```typescript
// src/config/logger.ts
import pino from 'pino';

export function createLogger(level: string, nodeEnv: string) {
  return pino({
    level,
    transport: nodeEnv === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
      : undefined,
  });
}

export type Logger = ReturnType<typeof createLogger>;
```

- [ ] **Step 2: Commit**

```bash
git add src/config/logger.ts
git commit -m "feat(config): add pino logger factory"
```

---

## Task 6: Supabase client + queries de agentes (TDD con mock)

**Files:**
- Create: `/Users/mariatelloesbri/sales-orchestrator/src/db/supabase.ts`
- Create: `/Users/mariatelloesbri/sales-orchestrator/src/db/agents.ts`
- Create: `/Users/mariatelloesbri/sales-orchestrator/src/db/executions.ts`
- Test: `/Users/mariatelloesbri/sales-orchestrator/tests/db/agents.test.ts`

- [ ] **Step 1: Escribir test**

```typescript
// tests/db/agents.test.ts
import { describe, it, expect, vi } from 'vitest';
import { loadAgentBySlug } from '../../src/db/agents.js';

describe('loadAgentBySlug', () => {
  it('returns agent row when found', async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'uuid', slug: 'sales-outbound-strategist', system_prompt: 'x', model: 'claude-sonnet-4-6', config: {}, status: 'active' },
        error: null,
      }),
    } as any;
    const agent = await loadAgentBySlug(mockClient, 'ws', 'sales-outbound-strategist');
    expect(agent.slug).toBe('sales-outbound-strategist');
  });

  it('throws on error', async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    } as any;
    await expect(loadAgentBySlug(mockClient, 'ws', 'missing')).rejects.toThrow(/not found/);
  });
});
```

- [ ] **Step 2: Run test, verify fails**

Run: `npm test -- tests/db/agents.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implementar `src/db/supabase.ts`**

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AppConfig } from '../config/env.js';

export function createSupabase(cfg: AppConfig): SupabaseClient {
  return createClient(cfg.supabaseUrl, cfg.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

- [ ] **Step 4: Implementar `src/db/agents.ts`**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';

export interface AgentRow {
  id: string;
  workspace_id: string;
  slug: string;
  name: string;
  role: string;
  system_prompt: string;
  model: string;
  config: Record<string, unknown>;
  status: 'active' | 'paused' | 'archived';
}

export interface ScheduleRow {
  id: string;
  agent_id: string;
  cron_expression: string;
  timezone: string;
  input_template: Record<string, unknown>;
  active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
}

export async function loadAgentBySlug(
  client: SupabaseClient,
  workspaceId: string,
  slug: string
): Promise<AgentRow> {
  const { data, error } = await client
    .from('agents')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('slug', slug)
    .single();
  if (error || !data) throw new Error(`Agent ${slug} not found: ${error?.message}`);
  return data as AgentRow;
}

export async function listActiveSchedules(client: SupabaseClient): Promise<ScheduleRow[]> {
  const { data, error } = await client
    .from('agent_schedules')
    .select('*')
    .eq('active', true);
  if (error) throw new Error(`listActiveSchedules: ${error.message}`);
  return (data ?? []) as ScheduleRow[];
}

export async function touchScheduleRun(
  client: SupabaseClient,
  scheduleId: string,
  nextRunAt: Date
): Promise<void> {
  const { error } = await client
    .from('agent_schedules')
    .update({ last_run_at: new Date().toISOString(), next_run_at: nextRunAt.toISOString() })
    .eq('id', scheduleId);
  if (error) throw new Error(`touchScheduleRun: ${error.message}`);
}
```

- [ ] **Step 5: Implementar `src/db/executions.ts`**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ExecutionInsert {
  agent_id: string;
  schedule_id?: string | null;
  workspace_id: string;
  trigger: 'scheduled' | 'manual' | 'webhook';
  input: Record<string, unknown>;
}

export interface ExecutionUpdate {
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  output?: Record<string, unknown> | null;
  error?: string | null;
  tokens_input?: number;
  tokens_output?: number;
  cost_usd?: number;
  started_at?: string;
  completed_at?: string;
}

export async function createExecution(
  client: SupabaseClient,
  payload: ExecutionInsert
): Promise<string> {
  const { data, error } = await client
    .from('agent_executions')
    .insert({ ...payload, status: 'pending' })
    .select('id')
    .single();
  if (error || !data) throw new Error(`createExecution: ${error?.message}`);
  return data.id as string;
}

export async function updateExecution(
  client: SupabaseClient,
  id: string,
  patch: ExecutionUpdate
): Promise<void> {
  const { error } = await client.from('agent_executions').update(patch).eq('id', id);
  if (error) throw new Error(`updateExecution: ${error.message}`);
}
```

- [ ] **Step 6: Run tests, verify pass**

Run: `npm test -- tests/db/agents.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add src/db tests/db
git commit -m "feat(db): add supabase client and agents/executions queries"
```

---

## Task 7: LLM wrapper con cálculo de coste (TDD)

**Files:**
- Create: `/Users/mariatelloesbri/sales-orchestrator/src/llm/anthropic.ts`
- Test: `/Users/mariatelloesbri/sales-orchestrator/tests/llm/anthropic.test.ts`

- [ ] **Step 1: Escribir test**

```typescript
// tests/llm/anthropic.test.ts
import { describe, it, expect, vi } from 'vitest';
import { runCompletion, estimateCost } from '../../src/llm/anthropic.js';

describe('estimateCost', () => {
  it('computes USD for sonnet-4-6', () => {
    // 1M input tokens at $3, 1M output at $15
    expect(estimateCost('claude-sonnet-4-6', 1_000_000, 1_000_000)).toBeCloseTo(18, 2);
  });
  it('returns 0 for unknown model', () => {
    expect(estimateCost('unknown', 1000, 1000)).toBe(0);
  });
});

describe('runCompletion', () => {
  it('calls client and returns text + token counts', async () => {
    const client = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'hello' }],
          usage: { input_tokens: 10, output_tokens: 20 },
        }),
      },
    } as any;
    const result = await runCompletion(client, {
      model: 'claude-sonnet-4-6',
      systemPrompt: 'sys',
      userInput: 'hi',
    });
    expect(result.text).toBe('hello');
    expect(result.inputTokens).toBe(10);
    expect(result.outputTokens).toBe(20);
    expect(result.costUsd).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test, verify fails**

Run: `npm test -- tests/llm/anthropic.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implementar `src/llm/anthropic.ts`**

```typescript
import Anthropic from '@anthropic-ai/sdk';

const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-opus-4-6': { input: 15, output: 75 },
  'claude-haiku-4-5-20251001': { input: 1, output: 5 },
};

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model];
  if (!p) return 0;
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}

export function createAnthropic(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}

export interface CompletionParams {
  model: string;
  systemPrompt: string;
  userInput: string;
  maxTokens?: number;
}

export interface CompletionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export async function runCompletion(
  client: Anthropic,
  params: CompletionParams
): Promise<CompletionResult> {
  const response = await client.messages.create({
    model: params.model,
    max_tokens: params.maxTokens ?? 2048,
    system: params.systemPrompt,
    messages: [{ role: 'user', content: params.userInput }],
  });
  const text = response.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n');
  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  return {
    text,
    inputTokens,
    outputTokens,
    costUsd: estimateCost(params.model, inputTokens, outputTokens),
  };
}
```

- [ ] **Step 4: Run test, verify passes**

Run: `npm test -- tests/llm/anthropic.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/llm tests/llm
git commit -m "feat(llm): add anthropic wrapper with cost calc"
```

---

## Task 8: AgentRunner — ejecuta un agente de punta a punta (TDD)

**Files:**
- Create: `/Users/mariatelloesbri/sales-orchestrator/src/agents/AgentRunner.ts`
- Test: `/Users/mariatelloesbri/sales-orchestrator/tests/agents/AgentRunner.test.ts`

- [ ] **Step 1: Escribir test**

```typescript
// tests/agents/AgentRunner.test.ts
import { describe, it, expect, vi } from 'vitest';
import { AgentRunner } from '../../src/agents/AgentRunner.js';

describe('AgentRunner', () => {
  it('loads agent, calls LLM, and records successful execution', async () => {
    const supabase = {} as any;
    const anthropic = {} as any;
    const logger = { info: vi.fn(), error: vi.fn(), child: vi.fn().mockReturnThis() } as any;

    const deps = {
      supabase,
      anthropic,
      logger,
      loadAgent: vi.fn().mockResolvedValue({
        id: 'agent-uuid',
        workspace_id: 'ws',
        slug: 'sales-outbound-strategist',
        system_prompt: 'You are a sales agent',
        model: 'claude-sonnet-4-6',
      }),
      createExec: vi.fn().mockResolvedValue('exec-uuid'),
      updateExec: vi.fn().mockResolvedValue(undefined),
      runLLM: vi.fn().mockResolvedValue({
        text: 'hello lead',
        inputTokens: 50,
        outputTokens: 100,
        costUsd: 0.001,
      }),
    };

    const runner = new AgentRunner(deps as any);
    const result = await runner.run({
      workspaceId: 'ws',
      agentSlug: 'sales-outbound-strategist',
      input: { lead: 'test' },
      trigger: 'manual',
    });

    expect(result.executionId).toBe('exec-uuid');
    expect(result.output).toBe('hello lead');
    expect(deps.updateExec).toHaveBeenCalledWith(supabase, 'exec-uuid', expect.objectContaining({ status: 'running' }));
    expect(deps.updateExec).toHaveBeenCalledWith(supabase, 'exec-uuid', expect.objectContaining({ status: 'completed', tokens_input: 50, tokens_output: 100 }));
  });

  it('records failure when LLM throws', async () => {
    const deps = {
      supabase: {} as any,
      anthropic: {} as any,
      logger: { info: vi.fn(), error: vi.fn(), child: vi.fn().mockReturnThis() } as any,
      loadAgent: vi.fn().mockResolvedValue({ id: 'a', workspace_id: 'ws', slug: 's', system_prompt: 'p', model: 'claude-sonnet-4-6' }),
      createExec: vi.fn().mockResolvedValue('exec-uuid'),
      updateExec: vi.fn().mockResolvedValue(undefined),
      runLLM: vi.fn().mockRejectedValue(new Error('api down')),
    };
    const runner = new AgentRunner(deps as any);
    await expect(runner.run({ workspaceId: 'ws', agentSlug: 's', input: {}, trigger: 'manual' }))
      .rejects.toThrow(/api down/);
    expect(deps.updateExec).toHaveBeenCalledWith(expect.anything(), 'exec-uuid', expect.objectContaining({ status: 'failed', error: 'api down' }));
  });
});
```

- [ ] **Step 2: Run test, verify fails**

Run: `npm test -- tests/agents/AgentRunner.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implementar `src/agents/AgentRunner.ts`**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type Anthropic from '@anthropic-ai/sdk';
import type { Logger } from '../config/logger.js';
import type { AgentRow } from '../db/agents.js';
import type { CompletionResult } from '../llm/anthropic.js';
import { loadAgentBySlug } from '../db/agents.js';
import { createExecution, updateExecution } from '../db/executions.js';
import { runCompletion } from '../llm/anthropic.js';

export interface RunRequest {
  workspaceId: string;
  agentSlug: string;
  input: Record<string, unknown>;
  trigger: 'scheduled' | 'manual' | 'webhook';
  scheduleId?: string | null;
}

export interface RunResult {
  executionId: string;
  output: string;
}

export interface AgentRunnerDeps {
  supabase: SupabaseClient;
  anthropic: Anthropic;
  logger: Logger;
  loadAgent?: typeof loadAgentBySlug;
  createExec?: typeof createExecution;
  updateExec?: typeof updateExecution;
  runLLM?: (client: Anthropic, params: { model: string; systemPrompt: string; userInput: string }) => Promise<CompletionResult>;
}

export class AgentRunner {
  private readonly deps: Required<AgentRunnerDeps>;

  constructor(deps: AgentRunnerDeps) {
    this.deps = {
      supabase: deps.supabase,
      anthropic: deps.anthropic,
      logger: deps.logger,
      loadAgent: deps.loadAgent ?? loadAgentBySlug,
      createExec: deps.createExec ?? createExecution,
      updateExec: deps.updateExec ?? updateExecution,
      runLLM: deps.runLLM ?? runCompletion,
    };
  }

  async run(req: RunRequest): Promise<RunResult> {
    const { supabase, anthropic, logger, loadAgent, createExec, updateExec, runLLM } = this.deps;
    const log = logger.child({ agentSlug: req.agentSlug, workspaceId: req.workspaceId });

    const agent: AgentRow = await loadAgent(supabase, req.workspaceId, req.agentSlug);

    const executionId = await createExec(supabase, {
      agent_id: agent.id,
      schedule_id: req.scheduleId ?? null,
      workspace_id: req.workspaceId,
      trigger: req.trigger,
      input: req.input,
    });

    const startedAt = new Date().toISOString();
    await updateExec(supabase, executionId, { status: 'running', started_at: startedAt });
    log.info({ executionId }, 'agent execution started');

    try {
      const userInput = typeof req.input === 'string' ? req.input : JSON.stringify(req.input);
      const completion = await runLLM(anthropic, {
        model: agent.model,
        systemPrompt: agent.system_prompt,
        userInput,
      });

      await updateExec(supabase, executionId, {
        status: 'completed',
        output: { text: completion.text },
        tokens_input: completion.inputTokens,
        tokens_output: completion.outputTokens,
        cost_usd: completion.costUsd,
        completed_at: new Date().toISOString(),
      });
      log.info({ executionId, tokens: completion.inputTokens + completion.outputTokens, costUsd: completion.costUsd }, 'agent execution completed');
      return { executionId, output: completion.text };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await updateExec(supabase, executionId, {
        status: 'failed',
        error: message,
        completed_at: new Date().toISOString(),
      });
      log.error({ executionId, err: message }, 'agent execution failed');
      throw err;
    }
  }
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- tests/agents/AgentRunner.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/agents tests/agents
git commit -m "feat(agents): add AgentRunner with full execution lifecycle"
```

---

## Task 9: Queue infra — Redis + BullMQ worker

**Files:**
- Create: `/Users/mariatelloesbri/sales-orchestrator/src/queue/redis.ts`
- Create: `/Users/mariatelloesbri/sales-orchestrator/src/queue/worker.ts`

- [ ] **Step 1: Implementar `src/queue/redis.ts`**

```typescript
import IORedis, { Redis } from 'ioredis';

export function createRedis(url: string): Redis {
  return new IORedis(url, { maxRetriesPerRequest: null });
}
```

- [ ] **Step 2: Implementar `src/queue/worker.ts`**

```typescript
import { Queue, Worker, Job } from 'bullmq';
import type { Redis } from 'ioredis';
import type { Logger } from '../config/logger.js';
import type { AgentRunner, RunRequest } from '../agents/AgentRunner.js';

export const QUEUE_NAME = 'agent-runs';

export function createQueue(redis: Redis): Queue<RunRequest> {
  return new Queue<RunRequest>(QUEUE_NAME, { connection: redis });
}

export function createWorker(
  redis: Redis,
  runner: AgentRunner,
  logger: Logger
): Worker<RunRequest> {
  return new Worker<RunRequest>(
    QUEUE_NAME,
    async (job: Job<RunRequest>) => {
      logger.info({ jobId: job.id, agentSlug: job.data.agentSlug }, 'processing job');
      return await runner.run(job.data);
    },
    {
      connection: redis,
      concurrency: 3,
    }
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/queue
git commit -m "feat(queue): add redis connection and bullmq worker"
```

---

## Task 10: Scheduler — encola jobs según agent_schedules (TDD)

**Files:**
- Create: `/Users/mariatelloesbri/sales-orchestrator/src/scheduler/Scheduler.ts`
- Test: `/Users/mariatelloesbri/sales-orchestrator/tests/scheduler/Scheduler.test.ts`

- [ ] **Step 1: Escribir test**

```typescript
// tests/scheduler/Scheduler.test.ts
import { describe, it, expect, vi } from 'vitest';
import { Scheduler } from '../../src/scheduler/Scheduler.js';

describe('Scheduler.tick', () => {
  it('enqueues schedules whose next_run_at is in the past', async () => {
    const pastIso = new Date(Date.now() - 60_000).toISOString();
    const deps = {
      listSchedules: vi.fn().mockResolvedValue([
        { id: 's1', agent_id: 'a1', cron_expression: '0 * * * *', timezone: 'UTC', input_template: { lead: 'fake' }, active: true, last_run_at: null, next_run_at: pastIso },
      ]),
      loadAgentById: vi.fn().mockResolvedValue({ slug: 'sales-outbound-strategist', workspace_id: 'ws' }),
      enqueue: vi.fn().mockResolvedValue(undefined),
      touchSchedule: vi.fn().mockResolvedValue(undefined),
      logger: { info: vi.fn(), error: vi.fn(), child: vi.fn().mockReturnThis() },
    };
    const scheduler = new Scheduler(deps as any);
    await scheduler.tick();
    expect(deps.enqueue).toHaveBeenCalledTimes(1);
    expect(deps.touchSchedule).toHaveBeenCalledWith('s1', expect.any(Date));
  });

  it('skips schedules whose next_run_at is in the future', async () => {
    const futureIso = new Date(Date.now() + 60_000).toISOString();
    const deps = {
      listSchedules: vi.fn().mockResolvedValue([
        { id: 's1', agent_id: 'a1', cron_expression: '0 * * * *', timezone: 'UTC', input_template: {}, active: true, last_run_at: null, next_run_at: futureIso },
      ]),
      loadAgentById: vi.fn(),
      enqueue: vi.fn(),
      touchSchedule: vi.fn(),
      logger: { info: vi.fn(), error: vi.fn(), child: vi.fn().mockReturnThis() },
    };
    const scheduler = new Scheduler(deps as any);
    await scheduler.tick();
    expect(deps.enqueue).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test, verify fails**

Run: `npm test -- tests/scheduler/Scheduler.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implementar `src/scheduler/Scheduler.ts`**

```typescript
import cronParser from 'cron-parser';
import type { Queue } from 'bullmq';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Logger } from '../config/logger.js';
import type { RunRequest } from '../agents/AgentRunner.js';
import type { ScheduleRow, AgentRow } from '../db/agents.js';
import { listActiveSchedules, touchScheduleRun } from '../db/agents.js';

export interface SchedulerDeps {
  supabase: SupabaseClient;
  queue: Queue<RunRequest>;
  logger: Logger;
  listSchedules?: (client: SupabaseClient) => Promise<ScheduleRow[]>;
  loadAgentById?: (client: SupabaseClient, id: string) => Promise<Pick<AgentRow, 'slug' | 'workspace_id'>>;
  enqueue?: (queue: Queue<RunRequest>, data: RunRequest) => Promise<void>;
  touchSchedule?: (id: string, nextRunAt: Date) => Promise<void>;
}

async function defaultLoadAgentById(client: SupabaseClient, id: string) {
  const { data, error } = await client.from('agents').select('slug,workspace_id').eq('id', id).single();
  if (error || !data) throw new Error(`agent ${id}: ${error?.message}`);
  return data as { slug: string; workspace_id: string };
}

export class Scheduler {
  private readonly deps: Required<SchedulerDeps>;

  constructor(deps: SchedulerDeps) {
    this.deps = {
      supabase: deps.supabase,
      queue: deps.queue,
      logger: deps.logger,
      listSchedules: deps.listSchedules ?? listActiveSchedules,
      loadAgentById: deps.loadAgentById ?? defaultLoadAgentById,
      enqueue: deps.enqueue ?? (async (q, d) => { await q.add('run', d); }),
      touchSchedule: deps.touchSchedule ?? (async (id, next) => touchScheduleRun(deps.supabase, id, next)),
    };
  }

  async tick(): Promise<void> {
    const { supabase, queue, logger, listSchedules, loadAgentById, enqueue, touchSchedule } = this.deps;
    const schedules = await listSchedules(supabase);
    const now = Date.now();

    for (const s of schedules) {
      const due = s.next_run_at ? new Date(s.next_run_at).getTime() <= now : true;
      if (!due) continue;
      try {
        const agent = await loadAgentById(supabase, s.agent_id);
        await enqueue(queue, {
          workspaceId: agent.workspace_id,
          agentSlug: agent.slug,
          input: s.input_template,
          trigger: 'scheduled',
          scheduleId: s.id,
        });
        const interval = cronParser.parseExpression(s.cron_expression, { tz: s.timezone });
        const nextRun = interval.next().toDate();
        await touchSchedule(s.id, nextRun);
        logger.info({ scheduleId: s.id, agentSlug: agent.slug, nextRun }, 'scheduled enqueued');
      } catch (err) {
        logger.error({ scheduleId: s.id, err: (err as Error).message }, 'scheduler tick failed');
      }
    }
  }
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- tests/scheduler/Scheduler.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scheduler tests/scheduler
git commit -m "feat(scheduler): add cron-driven scheduler that enqueues agent runs"
```

---

## Task 11: Express API — /health y /api/execute/:slug

**Files:**
- Create: `/Users/mariatelloesbri/sales-orchestrator/src/api/server.ts`

- [ ] **Step 1: Implementar `src/api/server.ts`**

```typescript
import express, { Request, Response, NextFunction } from 'express';
import type { Queue } from 'bullmq';
import type { AppConfig } from '../config/env.js';
import type { Logger } from '../config/logger.js';
import type { RunRequest } from '../agents/AgentRunner.js';

function auth(apiKey: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.header('authorization');
    if (header !== `Bearer ${apiKey}`) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    next();
  };
}

export function createServer(cfg: AppConfig, queue: Queue<RunRequest>, logger: Logger) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', ts: new Date().toISOString() });
  });

  app.post('/api/execute/:slug', auth(cfg.apiSecretKey), async (req, res) => {
    const slug = req.params.slug;
    const input = req.body?.input ?? {};
    try {
      const job = await queue.add('run', {
        workspaceId: cfg.defaultWorkspaceId,
        agentSlug: slug,
        input,
        trigger: 'manual',
      });
      res.status(202).json({ jobId: job.id, slug });
    } catch (err) {
      logger.error({ err: (err as Error).message }, 'enqueue failed');
      res.status(500).json({ error: 'enqueue_failed' });
    }
  });

  return app;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/api
git commit -m "feat(api): add express server with /health and /api/execute endpoints"
```

---

## Task 12: Entry point — arranca todo

**Files:**
- Create: `/Users/mariatelloesbri/sales-orchestrator/src/index.ts`

- [ ] **Step 1: Implementar `src/index.ts`**

```typescript
import cron from 'node-cron';
import { loadEnv } from './config/env.js';
import { createLogger } from './config/logger.js';
import { createSupabase } from './db/supabase.js';
import { createAnthropic } from './llm/anthropic.js';
import { createRedis } from './queue/redis.js';
import { createQueue, createWorker } from './queue/worker.js';
import { AgentRunner } from './agents/AgentRunner.js';
import { Scheduler } from './scheduler/Scheduler.js';
import { createServer } from './api/server.js';

async function main() {
  const cfg = loadEnv();
  const logger = createLogger(cfg.logLevel, cfg.nodeEnv);

  const supabase = createSupabase(cfg);
  const anthropic = createAnthropic(cfg.anthropicKey);
  const redis = createRedis(cfg.redisUrl);
  const queue = createQueue(redis);

  const runner = new AgentRunner({ supabase, anthropic, logger });
  const worker = createWorker(redis, runner, logger);
  worker.on('completed', (job) => logger.info({ jobId: job.id }, 'job completed'));
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err: err.message }, 'job failed'));

  const scheduler = new Scheduler({ supabase, queue, logger });
  cron.schedule('* * * * *', () => { scheduler.tick().catch((e) => logger.error({ e }, 'tick error')); });

  const app = createServer(cfg, queue, logger);
  app.listen(cfg.port, () => logger.info({ port: cfg.port }, 'orchestrator listening'));

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    await worker.close();
    await queue.close();
    await redis.quit();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/mariatelloesbri/sales-orchestrator && npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: add entry point wiring all components"
```

---

## Task 13: Docker + docker-compose

**Files:**
- Create: `/Users/mariatelloesbri/sales-orchestrator/Dockerfile`
- Create: `/Users/mariatelloesbri/sales-orchestrator/docker-compose.yml`
- Create: `/Users/mariatelloesbri/sales-orchestrator/.dockerignore`

- [ ] **Step 1: Escribir `Dockerfile`**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://localhost:3100/health || exit 1
CMD ["node", "dist/index.js"]
```

- [ ] **Step 2: Escribir `docker-compose.yml`**

```yaml
services:
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"

  orchestrator:
    build: .
    restart: unless-stopped
    env_file: .env
    ports:
      - "3100:3100"
    depends_on:
      - redis

volumes:
  redis-data:
```

- [ ] **Step 3: Escribir `.dockerignore`**

```
node_modules
dist
.git
.env
.env.local
tests
*.log
coverage
```

- [ ] **Step 4: Build local y smoke test**

Run:
```bash
cd /Users/mariatelloesbri/sales-orchestrator
docker compose build
docker compose up -d redis
npm run dev &
sleep 3
curl -s http://localhost:3100/health
```
Expected: `{"status":"ok","ts":"..."}`. Después: `kill %1 && docker compose down`.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile docker-compose.yml .dockerignore
git commit -m "chore(docker): add Dockerfile and docker-compose for local dev"
```

---

## Task 14: Heartbeat endpoint en ai-agency-os

**Files:**
- Create: `/Users/mariatelloesbri/ai-agency-analysis/ai-agency-os/src/app/api/orchestrator/heartbeat/route.ts`

- [ ] **Step 1: Implementar endpoint**

```typescript
// src/app/api/orchestrator/heartbeat/route.ts
import { NextRequest, NextResponse } from 'next/server';

const SECRET = process.env.ORCHESTRATOR_SECRET;

export async function POST(req: NextRequest) {
  if (!SECRET) return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  return NextResponse.json({
    ok: true,
    received: body,
    ts: new Date().toISOString(),
  });
}
```

- [ ] **Step 2: Añadir `ORCHESTRATOR_SECRET` a `.env.local` de ai-agency-os**

Edit `/Users/mariatelloesbri/ai-agency-analysis/ai-agency-os/.env.local` y añadir:
```
ORCHESTRATOR_SECRET=<mismo-valor-que-API_SECRET_KEY-del-orchestrator>
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mariatelloesbri/ai-agency-analysis/ai-agency-os
git add src/app/api/orchestrator/heartbeat/route.ts
git commit -m "feat(api): add orchestrator heartbeat endpoint"
```

---

## Task 15: Test de integración end-to-end

**Files:**
- Test: `/Users/mariatelloesbri/sales-orchestrator/tests/integration/end-to-end.test.ts`

- [ ] **Step 1: Escribir test (requiere Redis y Supabase de test corriendo)**

```typescript
// tests/integration/end-to-end.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadEnv } from '../../src/config/env.js';
import { createLogger } from '../../src/config/logger.js';
import { createSupabase } from '../../src/db/supabase.js';
import { createAnthropic } from '../../src/llm/anthropic.js';
import { createRedis } from '../../src/queue/redis.js';
import { createQueue, createWorker } from '../../src/queue/worker.js';
import { AgentRunner } from '../../src/agents/AgentRunner.js';
import type { Worker } from 'bullmq';

describe.skipIf(!process.env.RUN_INTEGRATION)('end-to-end', () => {
  let worker: Worker;
  let redis: ReturnType<typeof createRedis>;

  beforeAll(() => {
    const cfg = loadEnv();
    const logger = createLogger('error', 'test');
    const supabase = createSupabase(cfg);
    const anthropic = createAnthropic(cfg.anthropicKey);
    redis = createRedis(cfg.redisUrl);
    const queue = createQueue(redis);
    const runner = new AgentRunner({ supabase, anthropic, logger });
    worker = createWorker(redis, runner, logger);
  });

  afterAll(async () => {
    await worker?.close();
    await redis?.quit();
  });

  it('executes sales-outbound-strategist against fake lead', async () => {
    const cfg = loadEnv();
    const supabase = createSupabase(cfg);
    const runner = new AgentRunner({ supabase, anthropic: createAnthropic(cfg.anthropicKey), logger: createLogger('error', 'test') });
    const result = await runner.run({
      workspaceId: cfg.defaultWorkspaceId,
      agentSlug: 'sales-outbound-strategist',
      input: { lead: { name: 'Acme Corp', industry: 'SaaS', size: '50-200' } },
      trigger: 'manual',
    });
    expect(result.output.length).toBeGreaterThan(20);
    const { data } = await supabase.from('agent_executions').select('*').eq('id', result.executionId).single();
    expect(data?.status).toBe('completed');
    expect(data?.tokens_output).toBeGreaterThan(0);
  }, 60_000);
});
```

- [ ] **Step 2: Ejecutar el test de integración**

Run:
```bash
cd /Users/mariatelloesbri/sales-orchestrator
cp .env.example .env   # rellenar con valores reales
docker compose up -d redis
RUN_INTEGRATION=1 npm test -- tests/integration
```
Expected: PASS. Verificar en Supabase dashboard que hay nueva fila en `agent_executions` con status=completed.

- [ ] **Step 3: Crear schedule de prueba en Supabase**

Run en SQL editor:
```sql
INSERT INTO agent_schedules (agent_id, cron_expression, timezone, input_template, active, next_run_at)
SELECT id, '0 * * * *', 'Europe/Madrid',
       '{"lead":{"name":"Fake Corp","industry":"SaaS","size":"50-200"}}'::jsonb,
       TRUE, NOW()
FROM agents WHERE slug = 'sales-outbound-strategist' LIMIT 1;
```

- [ ] **Step 4: Correr orchestrator y esperar ejecución automática**

Run:
```bash
npm run dev
# esperar 2 min (cron cada minuto evalúa; next_run_at inicial es NOW())
```
Verificar: nueva fila en `agent_executions` con `trigger='scheduled'` y `status='completed'`.

- [ ] **Step 5: Commit**

```bash
git add tests/integration
git commit -m "test: add end-to-end integration test"
```

---

## Task 16: GitHub Actions CI

**Files:**
- Create: `/Users/mariatelloesbri/sales-orchestrator/.github/workflows/ci.yml`

- [ ] **Step 1: Escribir workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
```

- [ ] **Step 2: Crear repo en GitHub (privado) y push**

Run:
```bash
cd /Users/mariatelloesbri/sales-orchestrator
gh repo create sales-orchestrator --private --source=. --remote=origin --push
```
Verificar: Actions tab muestra workflow "CI" verde.

- [ ] **Step 3: Commit workflow inicial (si no estaba incluido en push)**

```bash
git add .github
git commit -m "ci: add github actions workflow (lint+typecheck+tests)"
git push
```

---

## Task 17: Deploy guide para EasyPanel

**Files:**
- Create: `/Users/mariatelloesbri/sales-orchestrator/deploy/EASYPANEL.md`

- [ ] **Step 1: Escribir guía**

````markdown
# Deploy en EasyPanel (Digital Ocean)

## Requisitos previos
- Droplet Ubuntu 24.04 con EasyPanel instalado (`curl -sSL https://get.easypanel.io | sh`)
- Dominio apuntando al droplet (opcional pero recomendado)
- Repo `sales-orchestrator` en GitHub

## Paso 1 — Proyecto
En EasyPanel → New Project → `sales-system`.

## Paso 2 — Redis (service)
- Template: Redis 7
- Name: `redis`
- Volume: `/data` persistente

## Paso 3 — Orchestrator (app)
- Source: GitHub → `sales-orchestrator` repo, branch `main`
- Build: Dockerfile (raíz)
- Port: 3100
- Domain: `agentes.tudominio.com` (EasyPanel configura SSL automático)
- Health check: `GET /health`
- Restart: always

### Env vars
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...
DEFAULT_MODEL=claude-sonnet-4-6
REDIS_URL=redis://redis:6379
PORT=3100
NODE_ENV=production
LOG_LEVEL=info
API_SECRET_KEY=<32+ chars random>
DEFAULT_WORKSPACE_ID=<uuid>
```

## Paso 4 — Acceso y seguridad
- Solo `orchestrator` tiene dominio público (HTTPS)
- `redis` es interno
- Delante del dominio poner Cloudflare Access (gratis) para que solo tú puedas llegar

## Paso 5 — Verificar
```
curl -H "Authorization: Bearer $API_SECRET_KEY" https://agentes.tudominio.com/health
```

## Paso 6 — Backups
- Redis: AOF ya activo (template default)
- Supabase: backups gestionados por Supabase (tier free = 7 días; tier paid = 30 días PITR)
- Opcional: `pg_dump` nocturno desde orchestrator a Digital Ocean Spaces (estrategia restic) — ver `deploy/BACKUPS.md` (pendiente)

## Paso 7 — Auto-deploy
EasyPanel hace rebuild en cada push a `main` si está configurado GitHub webhook (Settings → Auto-deploy on push).
````

- [ ] **Step 2: Commit**

```bash
git add deploy/EASYPANEL.md
git commit -m "docs: add easypanel deployment guide"
git push
```

---

## Task 18: Deploy real y humo test final

- [ ] **Step 1: Crear droplet + instalar EasyPanel**

Run en Digital Ocean:
1. Crear droplet: Ubuntu 24.04, plan $12/mes (2vCPU/2GB), region AMS3
2. SSH en droplet: `ssh root@IP`
3. `curl -sSL https://get.easypanel.io | sh`
4. Acceder `http://IP:3000`, crear admin

- [ ] **Step 2: Seguir `deploy/EASYPANEL.md`**

Crear proyecto `sales-system`, añadir redis + orchestrator. Rellenar env vars.

- [ ] **Step 3: Verificar health público**

Run:
```bash
curl https://agentes.tudominio.com/health
```
Expected: `{"status":"ok",...}`.

- [ ] **Step 4: Disparar ejecución manual remota**

Run:
```bash
curl -X POST https://agentes.tudominio.com/api/execute/sales-outbound-strategist \
  -H "Authorization: Bearer $API_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input":{"lead":{"name":"Test Remote"}}}'
```
Expected: `{"jobId":"...","slug":"..."}` (202). Verificar en Supabase que aparece nueva fila `agent_executions` con `status=completed`.

- [ ] **Step 5: Verificar scheduler automático en producción**

Esperar 1 hora (cron del schedule creado en Task 15 Step 3). Consultar:
```sql
SELECT status, trigger, tokens_output, cost_usd, created_at
FROM agent_executions
WHERE trigger = 'scheduled'
ORDER BY created_at DESC LIMIT 5;
```
Expected: al menos una fila nueva con `status='completed'`.

---

## Self-Review

**Spec coverage:**
- Orchestrator 24/7 en DO + EasyPanel ✓ (Task 17, 18)
- Auto-restart si falla ✓ (Docker `restart: unless-stopped`, EasyPanel health check)
- Acceso HTTPS desde cualquier lugar ✓ (Task 17 dominio + SSL)
- Modelo Claude actualizado ✓ (claude-sonnet-4-6 en defaults y pricing)
- LinkedIn alternativas oficiales → **no aplica a Fase 1** (se añade en Fase 2 con Apollo/Hunter MCPs)
- Seguridad personal ✓ (API_SECRET_KEY 32+ bytes, service role no expuesto, Cloudflare Access recomendado)
- Backups ✓ (mencionado en EASYPANEL.md, ampliación en Fase 2)
- CI pipeline ✓ (Task 16)
- Integración con ai-agency-os ✓ (misma Supabase, heartbeat endpoint, tablas compartidas)
- 1 agente ejecutándose cada hora contra lead fake ✓ (Task 15 Step 3 + Task 18 Step 5)

**Placeholder scan:** ningún "TBD"/"implement later"/"similar to".

**Type consistency:** `AgentRow`, `ScheduleRow`, `RunRequest`, `ExecutionInsert`/`Update`, `CompletionResult` — nombres coinciden en todas las tasks.

---

Plan completo.
