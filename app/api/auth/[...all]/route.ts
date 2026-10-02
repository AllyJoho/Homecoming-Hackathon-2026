// @/app/api/auth/[...all]/route.ts
// Better Auth's own catch-all: sign-up, sign-in, sign-out, get-session, and
// (outside production) the demo-login endpoint all land here. The handlers come
// straight from the one auth instance in lib/auth/server.ts.

export { GET, POST } from '@/lib/auth/server';
