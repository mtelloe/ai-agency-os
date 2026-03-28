// Middleware disabled - auth check moved to dashboard layout
// Next.js 16 deprecated middleware in favor of proxy

import { NextResponse, type NextRequest } from 'next/server';

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
