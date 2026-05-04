import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DEMO = process.env.NEXT_PUBLIC_DEMO === 'true';

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

// When DEMO is true, clerkMiddleware is never called — Clerk's handshake is skipped entirely.
const clerkHandler = DEMO
  ? null
  : clerkMiddleware(async (auth, req) => {
      if (!isPublicRoute(req)) await auth.protect();
    });

function passthroughMiddleware(_req: NextRequest) {
  return NextResponse.next();
}

export default DEMO ? passthroughMiddleware : clerkHandler!;

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
};
