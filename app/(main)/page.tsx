// @/app/(main)/page.tsx
// Home: every skill on the site, in three sections — Certified Skills (quiz
// passed), My Skills (claimed) and Skills (the rest of the vocabulary).
//
// A server component, so the catalog is read straight from the database — no
// loading state, no client fetch. SkillBoard is the one client component, and
// it owns only the search filter and the optimistic add/remove.

import Link from 'next/link';
import { requireSessionUser } from '@/lib/auth/session';
import { listSkillCatalog } from '@/prisma/queries';
import { SkillBoard } from '@/components/skills/SkillBoard';

export default async function HomePage() {
  const user = await requireSessionUser();
  const catalog = await listSkillCatalog(user.id);

  const claimed = catalog.certified.length + catalog.mine.length;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Hi, {user.name.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {catalog.certified.length > 0
              ? `${catalog.certified.length} certified of ${claimed} skills you've claimed — your matches update as you earn more.`
              : 'Add the skills you have, then prove them with a quiz.'}
          </p>
        </div>
        <Link href="/recommendations" className="text-sm font-medium underline underline-offset-4">
          See job matches
        </Link>
      </header>

      <SkillBoard catalog={catalog} />
    </div>
  );
}
