'use client';

import { useWorkspace } from '@/hooks/use-workspace';
import { Progress } from '@/components/ui/progress';
import { CreditCard } from 'lucide-react';

export function CreditsBadge() {
  const { data: workspace } = useWorkspace();

  if (!workspace) return null;

  const total = workspace.creditos_total;
  const usados = workspace.creditos_usados;
  const disponibles = total - usados;
  const porcentaje = total > 0 ? ((total - usados) / total) * 100 : 0;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
      <CreditCard className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium">{disponibles} créditos</p>
        <Progress value={porcentaje} className="h-1.5 mt-1" />
      </div>
    </div>
  );
}
