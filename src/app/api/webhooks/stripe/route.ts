import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { PLANS } from '@/lib/constants';
import type { Plan } from '@/lib/types/database';

function getSupabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: 'Stripe no está configurado.' },
      { status: 503 },
    );
  }

  const stripe = new Stripe(secretKey);
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event: Stripe.Event;

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET no configurado, rechazando peticion');
    return NextResponse.json(
      { error: 'Webhook no configurado.' },
      { status: 503 },
    );
  }

  if (!signature) {
    return NextResponse.json(
      { error: 'Falta la cabecera stripe-signature.' },
      { status: 400 },
    );
  }

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err);
    return NextResponse.json(
      { error: 'Firma del webhook inválida.' },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { workspaceId, plan } = session.metadata ?? {};

        if (!workspaceId || !plan) {
          console.error('[Stripe Webhook] Missing metadata in checkout session');
          break;
        }

        const planKey = plan as Plan;
        const planData = PLANS[planKey];

        if (!planData) {
          console.error('[Stripe Webhook] Unknown plan:', plan);
          break;
        }

        // -1 means unlimited; store a high number for unlimited plans
        const creditosTotal = planData.creditos === -1 ? 999999 : planData.creditos;

        const { error } = await supabase
          .from('workspaces')
          .update({
            plan: planKey,
            creditos_total: creditosTotal,
            creditos_usados: 0,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            updated_at: new Date().toISOString(),
          })
          .eq('id', workspaceId);

        if (error) {
          console.error('[Stripe Webhook] Error updating workspace:', error);
          return NextResponse.json(
            { error: 'Error actualizando workspace.' },
            { status: 500 },
          );
        }

        console.log(`[Stripe Webhook] Workspace ${workspaceId} upgraded to ${planKey}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find workspace by stripe_customer_id and reset to free
        const freePlan = PLANS.free;

        const { error } = await supabase
          .from('workspaces')
          .update({
            plan: 'free' as Plan,
            creditos_total: freePlan.creditos,
            creditos_usados: 0,
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        if (error) {
          console.error('[Stripe Webhook] Error resetting workspace to free:', error);
          return NextResponse.json(
            { error: 'Error reseteando workspace.' },
            { status: 500 },
          );
        }

        console.log(`[Stripe Webhook] Customer ${customerId} subscription cancelled, reset to free`);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error('[Stripe Webhook] Error processing event:', err);
    return NextResponse.json(
      { error: 'Error procesando evento.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
