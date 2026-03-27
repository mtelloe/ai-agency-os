'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { Sparkles } from 'lucide-react';

export default function AgentesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agentes IA</h1>
        <p className="text-muted-foreground">Chatbots inteligentes para tus clientes</p>
      </div>
      <EmptyState
        icon={Sparkles}
        title="Próximamente"
        description="Este módulo está en desarrollo"
      />
    </div>
  );
}
