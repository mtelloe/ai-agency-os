'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { Users } from 'lucide-react';

export default function PipelinePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pipeline CRM</h1>
        <p className="text-muted-foreground">Gestión visual de leads</p>
      </div>
      <EmptyState
        icon={Users}
        title="Próximamente"
        description="Este módulo está en desarrollo"
      />
    </div>
  );
}
