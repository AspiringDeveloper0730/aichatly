
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Allow iframe embedding
  response.headers.set('X-Frame-Options', 'ALLOWALL')
  response.headers.set('Content-Security-Policy', 'frame-ancestors *')

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
