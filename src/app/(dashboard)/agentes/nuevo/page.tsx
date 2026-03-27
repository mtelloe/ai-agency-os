'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { Sparkles } from 'lucide-react';

export default function NuevoAgentePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nuevo agente</h1>
        <p className="text-muted-foreground">Configura y despliega un chatbot IA</p>
      </div>
      <EmptyState
        icon={Sparkles}
        title="Próximamente"
        description="Este módulo está en desarrollo"
      />
    </div>
  );
}
