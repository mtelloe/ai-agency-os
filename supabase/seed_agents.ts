// Seed de los 8 agentes de ventas desde agency-agents/sales/*.md
// Run:
//   export SUPABASE_URL=https://ttpduldgqbdbkdpnfuvj.supabase.co
//   export SUPABASE_SERVICE_ROLE_KEY=...
//   export SEED_WORKSPACE_ID=9131555f-e22b-49e3-ab52-66f6f11a91f0
//   npx tsx supabase/seed_agents.ts

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import matter from 'gray-matter';

const SALES_DIR = '/Users/mariatelloesbri/ai-agency-analysis/agency-agents/sales';
const WORKSPACE_ID = process.env.SEED_WORKSPACE_ID;
if (!WORKSPACE_ID) throw new Error('SEED_WORKSPACE_ID env var required');
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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
      name: (data.name as string) ?? slug,
      role: slug.replace(/-/g, '_'),
      description: (data.description as string) ?? null,
      system_prompt: content.trim(),
      model: 'claude-sonnet-4-6',
      config: {
        color: data.color,
        emoji: data.emoji,
        vibe: data.vibe,
      },
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
  console.log('\nDone. Verify:');
  console.log(`  SELECT slug, name FROM agents WHERE workspace_id = '${WORKSPACE_ID}';`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
