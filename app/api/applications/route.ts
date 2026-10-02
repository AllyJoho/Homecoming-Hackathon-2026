// @/app/api/applications/route.ts
// Track a job, from either entry path.
//
// POST { jobId: "job-001" }                        → 201, saves an ingested listing
// POST { title, company, location?, url?, status? } → 201, a job added by hand
//
// Routes rather than server actions to match the rest of the app: the skills
// board already mutates through /api/skills, and one pattern is easier to
// follow than two.

import { NextResponse } from 'next/server';
import { getSessionUser, unauthorized } from '@/lib/auth/session';
import { createApplication } from '@/prisma/queries';
import { APPLICATION_STATUSES, type NewApplication } from '@/types/application';

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const body = (await request.json().catch(() => null)) as Partial<NewApplication> | null;
  if (!body) {
    return NextResponse.json({ error: 'A JSON body is required.' }, { status: 400 });
  }

  const jobId = body.jobId?.trim();
  const title = body.title?.trim();
  const company = body.company?.trim();

  // An ingested listing supplies its own title and company — see
  // createApplication, which reads them from the Job row. A manual entry has
  // nothing else to go on, so both are required there.
  if (!jobId && (!title || !company)) {
    return NextResponse.json({ error: 'A job title and company are required.' }, { status: 400 });
  }

  if (body.status && !APPLICATION_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: `Unknown status "${body.status}".` }, { status: 400 });
  }

  const application = await createApplication(user.id, {
    jobId,
    title: title ?? '',
    company: company ?? '',
    location: body.location?.trim() || undefined,
    url: body.url?.trim() || undefined,
    status: body.status,
    notes: body.notes?.trim() || undefined,
  });

  if (!application) {
    // jobId named a listing that isn't stored. Storing the row anyway would
    // leave an application pointing at nothing.
    return NextResponse.json({ error: "That listing isn't available anymore." }, { status: 400 });
  }

  return NextResponse.json(application, { status: 201 });
}
