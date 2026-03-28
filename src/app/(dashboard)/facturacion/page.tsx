'use client';

import { useState } from 'react';
import { useWorkspace } from '@/hooks/use-workspace';
import { useAuthFetch } from '@/hooks/use-auth-fetch';
import { PLANS } from '@/lib/constants';
import type { Plan } from '@/lib/types/database';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CreditCard, Check, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PLAN_KEYS: Plan[] = ['free', 'starter', 'pro', 'agency'];

const PLAN_COLORS: Record<Plan, string> = {
  free: 'bg-gray-100 dark:bg-gray-800',
  starter: 'bg-blue-50 dark:bg-blue-950',
  pro: 'bg-purple-50 dark:bg-purple-950',
  agency: 'bg-amber-50 dark:bg-amber-950',
};

const PLAN_BADGE_VARIANTS: Record<Plan, string> = {
  free: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  starter: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  pro: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  agency: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
};

export default function FacturacionPage() {
  const { data: workspace, isLoading } = useWorkspace();
  const { authFetch } = useAuthFetch();
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);

  const currentPlan: Plan = workspace?.plan ?? 'free';
  const creditosTotal = workspace?.creditos_total ?? 0;
  const creditosUsados = workspace?.creditos_usados ?? 0;
  const creditosDisponibles = creditosTotal - creditosUsados;
  const usagePercent = creditosTotal > 0 ? (creditosUsados / creditosTotal) * 100 : 0;

  async function handleSelectPlan(planKey: Plan) {
    if (planKey === currentPlan) return;
    if (planKey === 'free') {
      toast.info('Ya tienes acceso al plan Free.');
      return;
    }

    if (!workspace?.id) {
      toast.error('No se ha encontrado el workspace.');
      return;
    }

    setLoadingPlan(planKey);

    try {
      const res = await authFetch('/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan: planKey,
          workspaceId: workspace.id,
          userId: workspace.id, // will be overridden by auth on server
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Error al iniciar el proceso de pago.');
        setLoadingPlan(null);
        return;
      }

      if (!data.url) {
        toast.error('No se pudo obtener la URL de pago. Stripe puede no estar configurado.');
        setLoadingPlan(null);
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch {
      toast.error('Error de conexión al iniciar el pago.');
      setLoadingPlan(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Facturacion</h1>
        <p className="text-muted-foreground">
          Gestiona tu plan, creditos y pagos
        </p>
      </div>

      {/* Credits usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="size-4 text-amber-500" />
            Uso de creditos
          </CardTitle>
          <CardDescription>
            Tu consumo de creditos en el periodo actual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{creditosTotal}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{creditosUsados}</p>
                <p className="text-xs text-muted-foreground">Usados</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {creditosDisponibles}
                </p>
                <p className="text-xs text-muted-foreground">Disponibles</p>
              </div>
            </div>
            <Progress value={usagePercent}>
              <span className="text-sm text-muted-foreground">
                {Math.round(usagePercent)}% utilizado
              </span>
            </Progress>
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Planes disponibles</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_KEYS.map((planKey) => {
            const plan = PLANS[planKey];
            const isCurrent = planKey === currentPlan;

            return (
              <Card
                key={planKey}
                className={`relative ${isCurrent ? 'ring-2 ring-primary' : ''}`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className={PLAN_BADGE_VARIANTS[planKey]}>
                      Plan actual
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.nombre}</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-foreground">
                      {plan.precio_mensual}€
                    </span>
                    <span className="text-muted-foreground"> /mes</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-sm text-muted-foreground">
                    {plan.creditos === -1
                      ? 'Creditos ilimitados'
                      : `${plan.creditos} creditos/mes`}
                  </p>
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check className="mt-0.5 size-4 shrink-0 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isCurrent ? 'outline' : 'default'}
                    disabled={isCurrent || loadingPlan !== null}
                    onClick={() => handleSelectPlan(planKey)}
                  >
                    {loadingPlan === planKey ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Redirigiendo...
                      </>
                    ) : isCurrent ? (
                      'Plan actual'
                    ) : (
                      'Elegir plan'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
