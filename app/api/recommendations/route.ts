// @/app/api/recommendations/route.ts
// Builds the student's profile and asks Claude to rank the seeded listings.
//
// POST rather than GET because this is an expensive, non-idempotent-feeling
// operation that the user triggers explicitly — and because it must never be
// cached or prefetched.

import { NextResponse } from 'next/server';
import { getSessionUser, unauthorized } from '@/lib/auth/session';
import { buildProfile } from '@/lib/profile/buildProfile';
import { RecommendationError, recommendJobs } from '@/lib/jobs/recommend';

export async function POST() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const profile = await buildProfile(user.id);
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
  }

  if (profile.skills.length === 0) {
    // Don't spend a model call on an empty profile.
    return NextResponse.json({
      matches: [],
      message: 'Add a few skills or pass a quiz first — there is nothing to match on yet.',
    });
  }

  try {
    const matches = await recommendJobs(profile);
    return NextResponse.json({ matches });
  } catch (error) {
    if (error instanceof RecommendationError) {
      // Already a user-facing message (missing key, rate limit, unusable
      // response) — 502 because the upstream call is what failed.
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
}
