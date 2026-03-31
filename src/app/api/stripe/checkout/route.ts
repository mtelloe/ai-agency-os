import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

/**
 * Mapeo de planes a Stripe Price IDs reales.
 * Estos IDs se obtienen de los productos/precios creados en el Dashboard de Stripe.
 * Configúralos en .env.local con las variables STRIPE_PRICE_ID_STARTER, etc.
 */
const STRIPE_PRICE_IDS: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_ID_STARTER,
  pro: process.env.STRIPE_PRICE_ID_PRO,
  agency: process.env.STRIPE_PRICE_ID_AGENCY,
};

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

  const priceId = STRIPE_PRICE_IDS[plan];
  if (!priceId) {
    return NextResponse.json(
      { error: `Stripe Price ID no configurado para el plan "${plan}". Añade STRIPE_PRICE_ID_${plan.toUpperCase()} en .env.local.` },
      { status: 503 },
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
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
      { error: 'Error al crear la sesión de pago. Inténtalo de nuevo más tarde.' },
      { status: 500 },
    );
  }
}
