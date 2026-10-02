// @/lib/auth/demoLogin.ts
// A one-click sign-in for the seeded demo accounts, so a judge or teammate can
// get into the app without creating a password. This is an extra endpoint on
// the single auth instance (see lib/auth/server.ts), not a parallel auth
// server — the same pattern as purchasing's devLogin plugin.
//
// Two independent fences, because this endpoint hands out a session with no
// credential at all:
//   1. server.ts loads the plugin only when NODE_ENV !== 'production', so the
//      route does not exist in a production build.
//   2. the handler re-checks NODE_ENV, and will only ever issue a session for
//      a user whose `isDemo` is true — a real sign-up can never be targeted.

import { createAuthEndpoint, APIError } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import type { BetterAuthPlugin } from 'better-auth';
import { z } from 'zod';

export function demoLoginPlugin(): BetterAuthPlugin {
  return {
    id: 'demo-login',
    endpoints: {
      demoLogin: createAuthEndpoint(
        '/demo-login',
        { method: 'POST', body: z.object({ email: z.string().email() }) },
        async (ctx) => {
          if (process.env.NODE_ENV === 'production') {
            throw APIError.from('NOT_FOUND', { code: 'NOT_FOUND', message: 'Not found.' });
          }

          const user = await ctx.context.internalAdapter.findUserByEmail(
            ctx.body.email.toLowerCase(),
          );
          const found = user?.user as (Record<string, unknown> & { id: string }) | undefined;

          // Same 404 for "no such user" and "not a demo user": this endpoint
          // shouldn't become a way to probe which emails have accounts.
          if (!found || found.isDemo !== true) {
            throw APIError.from('NOT_FOUND', {
              code: 'DEMO_USER_NOT_FOUND',
              message: 'No demo account with that email.',
            });
          }

          const session = await ctx.context.internalAdapter.createSession(found.id, false);
          if (!session) {
            throw APIError.from('INTERNAL_SERVER_ERROR', {
              code: 'FAILED_TO_CREATE_SESSION',
              message: 'Failed to create session.',
            });
          }

          await setSessionCookie(ctx, { session, user: found as never });
          return ctx.json({ ok: true });
        },
      ),
    },
  };
}
