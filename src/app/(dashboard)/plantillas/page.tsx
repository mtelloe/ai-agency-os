'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { LayoutTemplate } from 'lucide-react';

export default function PlantillasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Plantillas de automatización</h1>
        <p className="text-muted-foreground">Workflows reutilizables</p>
      </div>
      <EmptyState
        icon={LayoutTemplate}
        title="Próximamente"
        description="Este módulo está en desarrollo"
      />
    </div>
  );
}
