'use client';

import { useState } from 'react';
import { useWorkspace } from '@/hooks/use-workspace';
import { KpiCards } from '@/components/ventas/KpiCards';
import { AgentOffice } from '@/components/ventas/AgentOffice';
import { VentasActivityFeed } from '@/components/ventas/VentasActivityFeed';
import { VentasSidePanel } from '@/components/ventas/VentasSidePanel';
import { NuevaCampanaModal } from '@/components/ventas/NuevaCampanaModal';
import { EditarTemplateModal } from '@/components/ventas/EditarTemplateModal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Play } from 'lucide-react';
import type { EmailTemplateRow } from '@/lib/types/database';

export default function VentasPage() {
  const { data: workspace, isLoading } = useWorkspace();
  const [campanaOpen, setCampanaOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<EmailTemplateRow | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (!workspace) return null;
  const workspaceId = workspace.id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ventas IA</h1>
          <p className="text-muted-foreground text-sm">
            Sales Orchestrator — tiempo real
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setCampanaOpen(true)}
          style={{ background: '#8ac47a', color: '#fff' }}
        >
          <Play className="h-4 w-4 mr-1" />
          Nueva campaña
        </Button>
      </div>

      {/* KPIs */}
      <KpiCards workspaceId={workspaceId} />

      {/* Main grid: Office + Activity + SidePanel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Office canvas (spans 2 cols) + Activity Feed below */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-sm font-semibold mb-2">Oficina de agentes</h2>
            <AgentOffice workspaceId={workspaceId} />
          </div>
          <VentasActivityFeed workspaceId={workspaceId} />
        </div>

        {/* Side panel */}
        <VentasSidePanel
          workspaceId={workspaceId}
          onEditTemplate={setEditTemplate}
        />
      </div>

      {/* Modals */}
      <NuevaCampanaModal
        open={campanaOpen}
        onClose={() => setCampanaOpen(false)}
        workspaceId={workspaceId}
      />
      <EditarTemplateModal
        template={editTemplate}
        onClose={() => setEditTemplate(null)}
        workspaceId={workspaceId}
      />
    </div>
  );
}
