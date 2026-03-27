'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { BookOpen } from 'lucide-react';

export default function NichosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Biblioteca de nichos</h1>
        <p className="text-muted-foreground">Templates por industria</p>
      </div>
      <EmptyState
        icon={BookOpen}
        title="Próximamente"
        description="Este módulo está en desarrollo"
      />
    </div>
  );
}
