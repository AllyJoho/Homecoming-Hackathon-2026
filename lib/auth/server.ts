// @/lib/auth/server.ts
// The one Better Auth instance. Mirrors the purchasing app's shape, minus the
// parts that need infrastructure we don't have here: no Okta (this is an MVP,
// so email + password is the credential) and no Redis, so sessions live in
// Postgres rather than in secondaryStorage.
//
// Better Auth writes directly into the domain `User` table — its default `user`
// model resolves to prisma.user — so the id on a session is already the one
// every foreign key in the schema references.

import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { toNextJsHandler } from 'better-auth/next-js';
import { prisma } from '@/prisma/client';
import { demoLoginPlugin } from './demoLogin';

// Dev convenience only: without a secret Better Auth can't sign cookies, and a
// hard failure at import time is better than silently unsigned sessions. The
// fallback keeps `npm run dev` working on a fresh clone that hasn't set one.
const secret = process.env.BETTER_AUTH_SECRET;
if (!secret && process.env.NODE_ENV === 'production') {
  throw new Error('BETTER_AUTH_SECRET must be set in production.');
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  secret: secret ?? 'dev-only-insecure-secret-change-me',

  // Postgres owns users, accounts, sessions and verification.
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  emailAndPassword: {
    enabled: true,
    // No mail server in this project, so there's nothing to send a
    // confirmation through. Sign-up signs you straight in.
    requireEmailVerification: false,
    minPasswordLength: 8,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // one week
    updateAge: 60 * 60 * 24, // refresh the expiry after a day of activity
    // A 60s signed cookie copy, so the common case is no database round trip.
    cookieCache: { enabled: true, maxAge: 60 },
  },

  user: {
    additionalFields: {
      // Set by the seed on the demo accounts. The demo-login endpoint will only
      // issue a session for a user carrying this, so it can never be pointed at
      // a real account someone signed up for.
      isDemo: { type: 'boolean', required: false, input: false, defaultValue: false },
    },
  },

  // An extra sign-in path on this same instance, not a parallel server — the
  // pattern purchasing uses for devLogin. Loaded only outside production, which
  // is what keeps the endpoint absent there.
  plugins: [...(process.env.NODE_ENV !== 'production' ? [demoLoginPlugin()] : [])],
});

// Catch-all handlers, re-exported by app/api/auth/[...all].
export const { GET, POST } = toNextJsHandler(auth);
