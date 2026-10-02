// @/app/(main)/page.tsx
// Home: the student's skills and the certificates they've earned.
//
// A server component, so the profile is read directly from the database — no
// loading state, no client fetch. The two interactive pieces (AddSkillForm,
// SkillList) are the only client components on the page.

import Link from 'next/link';
import { requireSessionUser } from '@/lib/auth/session';
import { buildProfile } from '@/lib/profile/buildProfile';
import { AddSkillForm } from '@/components/skills/AddSkillForm';
import { SkillList } from '@/components/skills/SkillList';
import { CertList } from '@/components/certifications/CertList';
import { Button, Card } from '@/components/ui';

export default async function HomePage() {
  const user = await requireSessionUser();
  const profile = await buildProfile(user.id);

  // The layout guard means the session is valid, so a missing profile here
  // would be a genuine inconsistency.
  if (!profile) throw new Error(`No profile for session user ${user.id}`);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Hi, {profile.name.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {profile.certifications.length > 0
            ? 'Your matches update as you earn more certificates.'
            : 'Add the skills you have, then prove them with a quiz.'}
        </p>
      </div>

      <Card
        title="Your skills"
        action={
          <Link href="/quizzes">
            <Button size="sm" variant="secondary">
              Prove a skill
            </Button>
          </Link>
        }
        footer={<AddSkillForm />}
      >
        <SkillList skills={profile.skills} />
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          A ✓ means you passed the quiz for it — job matches weight those higher.
        </p>
      </Card>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Certificates</h2>
          <Link
            href="/recommendations"
            className="text-sm font-medium underline underline-offset-4"
          >
            See job matches
          </Link>
        </div>
        <CertList certifications={profile.certifications} />
      </section>
    </div>
  );
}
