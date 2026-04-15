import { NextRequest, NextResponse } from 'next/server';

const SECRET = process.env.ORCHESTRATOR_SECRET;

export async function POST(req: NextRequest) {
  if (!SECRET) return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  return NextResponse.json({
    ok: true,
    received: body,
    ts: new Date().toISOString(),
  });
}
