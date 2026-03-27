'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { ShieldCheck } from 'lucide-react';

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Administración</h1>
        <p className="text-muted-foreground">Gestión del workspace</p>
      </div>
      <EmptyState
        icon={ShieldCheck}
        title="Próximamente"
        description="Este módulo está en desarrollo"
      />
    </div>
  );
}
