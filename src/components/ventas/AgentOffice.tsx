'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { SalesAgentRow, AgentExecutionRow } from '@/lib/types/database';

interface AgentState {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'archived';
  bubble: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  bobOffset: number;
  color: string;
}

const AGENT_COLORS = ['#8ac47a', '#f4a7b9', '#7ab5c4', '#c4a77a'];

const CANVAS_W = 640;
const CANVAS_H = 360;
const TILE = 40;

const DESK_SLOTS = [
  { x: 100, y: 70 },
  { x: 380, y: 70 },
  { x: 100, y: 240 },
  { x: 380, y: 240 },
];

function drawFloor(ctx: CanvasRenderingContext2D) {
  const cols = Math.ceil(CANVAS_W / TILE);
  const rows = Math.ceil(CANVAS_H / TILE);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#f5f0e8' : '#fff9f0';
      ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
    }
  }
}

function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#d4cbbf';
  ctx.beginPath();
  ctx.roundRect(x, y, 80, 48, 6);
  ctx.fill();

  ctx.fillStyle = '#5a5050';
  ctx.beginPath();
  ctx.roundRect(x + 25, y + 6, 30, 22, 3);
  ctx.fill();
  ctx.fillStyle = '#1a1010';
  ctx.beginPath();
  ctx.roundRect(x + 27, y + 8, 26, 18, 2);
  ctx.fill();

  ctx.fillStyle = '#b0a898';
  ctx.beginPath();
  ctx.roundRect(x + 18, y + 34, 44, 9, 2);
  ctx.fill();
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#c4845a';
  ctx.beginPath();
  ctx.roundRect(x - 8, y + 4, 16, 12, 3);
  ctx.fill();
  ctx.fillStyle = '#6aaa5a';
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(angle) * 8, y + Math.sin(angle) * 8, 6, 10, angle, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
) {
  const maxLen = 22;
  const label = text.length > maxLen ? text.slice(0, maxLen - 1) + '\u2026' : text;
  ctx.font = '9px monospace';
  const tw = ctx.measureText(label).width;
  const bw = tw + 12;
  const bh = 16;
  const bx = x - bw / 2;
  const by = y - bh - 6;

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 4);
  ctx.fill();
  ctx.strokeStyle = '#d0c8bc';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.moveTo(x - 3, by + bh);
  ctx.lineTo(x + 3, by + bh);
  ctx.lineTo(x, by + bh + 5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#3a3030';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, by + bh / 2);
}

function drawAgent(
  ctx: CanvasRenderingContext2D,
  agent: AgentState,
  time: number,
) {
  const bob = agent.status === 'active' ? Math.sin(time * 0.003 + agent.bobOffset) * 2 : 0;
  const cx = agent.x;
  const cy = agent.y + bob;

  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 13, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = agent.color;
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.arc(cx - 4, cy - 2, 2, 0, Math.PI * 2);
  ctx.arc(cx + 4, cy - 2, 2, 0, Math.PI * 2);
  ctx.fill();

  if (agent.status === 'active') {
    for (let i = 0; i < 3; i++) {
      const phase = Math.sin(time * 0.004 + i * 1.2);
      ctx.fillStyle = agent.color;
      ctx.globalAlpha = 0.5 + phase * 0.5;
      ctx.beginPath();
      ctx.arc(cx - 6 + i * 6, cy + 20, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawSpeechBubble(ctx, cx, cy - 14, agent.bubble);
}

function buildAgentStates(
  agents: SalesAgentRow[],
  executions: AgentExecutionRow[],
): AgentState[] {
  const latestExec: Record<string, string> = {};
  for (const ex of executions) {
    if (!latestExec[ex.agent_id]) {
      const out = ex.output as { summary?: string; step?: string } | null;
      latestExec[ex.agent_id] =
        out?.summary ?? out?.step ?? (ex.status === 'running' ? 'Trabajando...' : ex.status);
    }
  }

  return agents
    .filter((a) => a.status !== 'archived')
    .slice(0, 4)
    .map((a, i) => {
      const slot = DESK_SLOTS[i];
      const isActive = a.status === 'active';
      return {
        id: a.id,
        name: a.name,
        status: a.status as 'active' | 'paused',
        bubble: isActive ? (latestExec[a.id] ?? 'Buscando leads...') : 'zzz pausado',
        x: isActive ? slot.x + 40 : slot.x + 40 + (Math.random() - 0.5) * 60,
        y: isActive ? slot.y + 72 : slot.y + 72 + (Math.random() - 0.5) * 40,
        vx: isActive ? 0 : (Math.random() > 0.5 ? 0.4 : -0.4),
        vy: isActive ? 0 : (Math.random() > 0.5 ? 0.3 : -0.3),
        bobOffset: i * 1.3,
        color: AGENT_COLORS[i % AGENT_COLORS.length],
      };
    });
}

export function AgentOffice({ workspaceId }: { workspaceId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const agentsRef = useRef<AgentState[]>([]);
  const rafRef = useRef<ReturnType<typeof requestAnimationFrame>>(0);
  const supabase = createClient();

  const { data: agents } = useQuery<SalesAgentRow[]>({
    queryKey: ['ventas-agents-canvas', workspaceId],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('workspace_id', workspaceId)
        .neq('status', 'archived');
      if (error) throw error;
      return (data ?? []) as SalesAgentRow[];
    },
  });

  const { data: executions } = useQuery<AgentExecutionRow[]>({
    queryKey: ['ventas-executions-canvas', workspaceId],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_executions')
        .select('id, agent_id, workspace_id, trigger, status, input, output, error, started_at, completed_at, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as AgentExecutionRow[];
    },
  });

  useEffect(() => {
    if (!agents) return;
    agentsRef.current = buildAgentStates(agents, executions ?? []);
  }, [agents, executions]);

  const animate = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawFloor(ctx);

    DESK_SLOTS.forEach((slot) => drawDesk(ctx, slot.x, slot.y));
    drawPlant(ctx, 20, 20);
    drawPlant(ctx, CANVAS_W - 20, 20);
    drawPlant(ctx, 20, CANVAS_H - 20);
    drawPlant(ctx, CANVAS_W - 20, CANVAS_H - 20);

    agentsRef.current = agentsRef.current.map((a) => {
      if (a.status === 'paused') {
        let nx = a.x + a.vx;
        let ny = a.y + a.vy;
        let nvx = a.vx;
        let nvy = a.vy;
        if (nx < 20 || nx > CANVAS_W - 20) nvx = -nvx;
        if (ny < 20 || ny > CANVAS_H - 20) nvy = -nvy;
        nx = Math.max(20, Math.min(CANVAS_W - 20, nx));
        ny = Math.max(20, Math.min(CANVAS_H - 20, ny));
        return { ...a, x: nx, y: ny, vx: nvx, vy: nvy };
      }
      return a;
    });

    agentsRef.current.forEach((a) => drawAgent(ctx, a, time));

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  return (
    <div className="rounded-xl overflow-hidden border" style={{ background: '#f5f0e8' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="w-full h-auto"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}
