import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PLANS } from '@/lib/constants';
import type { Plan } from '@/lib/types/database';

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: 'Stripe no está configurado en este entorno.' },
      { status: 503 },
    );
  }

  const stripe = new Stripe(secretKey);

  // Validate auth token is present
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body: { plan: string; workspaceId: string; userId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { plan, workspaceId, userId } = body;

  // Validate plan
  if (!plan || !['starter', 'pro', 'agency'].includes(plan)) {
    return NextResponse.json(
      { error: 'Plan inválido. Planes disponibles: starter, pro, agency.' },
      { status: 400 },
    );
  }

  if (!workspaceId || !userId) {
    return NextResponse.json(
      { error: 'workspaceId y userId son obligatorios.' },
      { status: 400 },
    );
  }

  const planData = PLANS[plan as Plan];
  const unitAmount = planData.precio_mensual * 100; // cents

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `AI Agency OS - Plan ${planData.nombre}`,
              description: `${planData.creditos === -1 ? 'Créditos ilimitados' : `${planData.creditos} créditos/mes`}`,
            },
            unit_amount: unitAmount,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        workspaceId,
        userId,
        plan,
      },
      success_url: `${baseUrl}/facturacion?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/facturacion`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[Stripe Checkout] Error creating session:', err);
    return NextResponse.json(
      { error: 'Error al crear la sesión de pago.' },
      { status: 500 },
    );
  }
}
