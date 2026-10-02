// @/app/api/applications/[id]/route.ts
// Move one application along the pipeline, or drop it.
//
// PATCH  { status?, notes? } → 200 with the updated row
// DELETE                     → 204
//
// Both scope the row by session user inside the query (see updateApplication /
// deleteApplication), so an id belonging to someone else reads as missing
// rather than as forbidden — same reasoning as the attempt routes.

import { NextResponse } from 'next/server';
import { getSessionUser, unauthorized } from '@/lib/auth/session';
import { deleteApplication, updateApplication } from '@/prisma/queries';
import { APPLICATION_STATUSES, type ApplicationStatus } from '@/types/application';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as {
    status?: ApplicationStatus;
    notes?: string | null;
  } | null;

  if (!body || (body.status === undefined && body.notes === undefined)) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  if (body.status !== undefined && !APPLICATION_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: `Unknown status "${body.status}".` }, { status: 400 });
  }

  const application = await updateApplication(user.id, id, {
    status: body.status,
    // An empty notes field means "cleared", which is a null column rather than
    // an empty string — otherwise `notes?: string` on the way back out would
    // read as present-but-blank.
    notes: body.notes === undefined ? undefined : body.notes?.trim() || null,
  });

  if (!application) {
    return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
  }

  return NextResponse.json(application);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const removed = await deleteApplication(user.id, id);
  if (!removed) {
    return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
