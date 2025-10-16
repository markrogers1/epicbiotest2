import { NextResponse } from 'next/server';

export function middleware(req) {
  const rateLimit = 100;
  const rateLimitWindow = 60 * 1000;
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const key = `rate-limit:${ip}`;
  const count = parseInt(localStorage.getItem(key) || '0', 10);
  if (count >= rateLimit) {
    return new NextResponse('Too many requests', { status: 429 });
  }
  localStorage.setItem(key, count + 1);
  setTimeout(() => localStorage.removeItem(key), rateLimitWindow);
  const headers = new Headers(req.headers);
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net https://www.googletagmanager.com; style-src 'self' https://fonts.googleapis.com; img-src 'self' https://*.instagram.com; frame-src https://www.youtube.com");
  return NextResponse.next({ headers });
}