'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { Radar } from 'lucide-react';

export default function ProspeccionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Prospección</h1>
        <p className="text-muted-foreground">Encuentra negocios para tu agencia</p>
      </div>
      <EmptyState
        icon={Radar}
        title="Próximamente"
        description="Este módulo está en desarrollo"
      />
    </div>
  );
}
