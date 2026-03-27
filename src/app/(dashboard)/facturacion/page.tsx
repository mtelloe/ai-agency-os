'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { CreditCard } from 'lucide-react';

export default function FacturacionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Facturación</h1>
        <p className="text-muted-foreground">Planes, pagos y créditos</p>
      </div>
      <EmptyState
        icon={CreditCard}
        title="Próximamente"
        description="Este módulo está en desarrollo"
      />
    </div>
  );
}
