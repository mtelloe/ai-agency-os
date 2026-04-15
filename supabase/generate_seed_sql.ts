import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const SALES_DIR = '/Users/mariatelloesbri/ai-agency-analysis/agency-agents/sales';
const WORKSPACE_ID = '9131555f-e22b-49e3-ab52-66f6f11a91f0';

const esc = (s: string) => s.replace(/'/g, "''");

const files = readdirSync(SALES_DIR).filter((f) => f.endsWith('.md'));
let i = 0;
for (const file of files) {
  i++;
  const raw = readFileSync(join(SALES_DIR, file), 'utf8');
  const { data, content } = matter(raw);
  const slug = file.replace(/\.md$/, '');
  const name = (data.name as string) ?? slug;
  const role = slug.replace(/-/g, '_');
  const description = (data.description as string) ?? '';
  const systemPrompt = content.trim();
  const config = JSON.stringify({ color: data.color, emoji: data.emoji, vibe: data.vibe });
  const sql = `INSERT INTO agents (workspace_id, slug, name, role, description, system_prompt, model, config, status) VALUES ('${WORKSPACE_ID}','${esc(slug)}','${esc(name)}','${esc(role)}','${esc(description)}','${esc(systemPrompt)}','claude-sonnet-4-6','${esc(config)}'::jsonb,'active') ON CONFLICT (workspace_id, slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, system_prompt=EXCLUDED.system_prompt, model=EXCLUDED.model, config=EXCLUDED.config, status=EXCLUDED.status, updated_at=now();`;
  writeFileSync(`/tmp/seed_agent_${i}.sql`, sql);
  console.log(`${i}. ${slug} → /tmp/seed_agent_${i}.sql (${sql.length} bytes)`);
}
