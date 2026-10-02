// @/app/(main)/applications/page.tsx
// The application tracker.
//
// The one screen in the app built on the student's own writing rather than on
// ingested content or a model call: rows come from the tracker table, which
// nothing else writes to. A plain database read, so it renders on load.

import { requireSessionUser } from '@/lib/auth/session';
import { listApplications } from '@/prisma/queries';
import { ApplicationTracker } from '@/components/applications/ApplicationTracker';
import { PageHeader } from '@/components/ui';

export default async function ApplicationsPage() {
  const user = await requireSessionUser();
  const applications = await listApplications(user.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Applications"
        description="Everything you've saved or applied to, in one place. Save a listing from your job matches, or add one you found elsewhere."
      />

      <ApplicationTracker applications={applications} />
    </div>
  );
}
