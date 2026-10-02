// @/app/(main)/skills/page.tsx
// The skills catalog: the whole vocabulary, plus what to add next.
//
// Split off home deliberately. Home answers "where do I stand and what do I do
// next"; this answers "what is there, and what have I got". Managing forty-odd
// skills is a browse-and-search task, which was crowding the dashboard out of
// its own page.
//
// Quizzes are reached through the skill they certify rather than from a list of
// their own: the vocabulary and the quiz catalog are one-to-one, so a separate
// quiz grid would be the same cards twice. /quizzes still resolves for a direct
// link; it just isn't in the nav.
//
// A server component, so the catalog is read straight from the database — no
// loading state, no client fetch. SkillCatalogBrowser is the one client
// component, and it owns only the search filter and the optimistic add/remove.

import { requireSessionUser } from '@/lib/auth/session';
import { listSkillCatalog } from '@/prisma/queries';
import { SkillCatalogBrowser } from '@/components/skills/SkillCatalogBrowser';
import { PageHeader } from '@/components/ui';

export default async function SkillsPage() {
  const user = await requireSessionUser();
  const catalog = await listSkillCatalog(user.id);

  // `recommended` is promoted out of `available`, not copied from it, so the
  // total has to count it or the page undersells the catalog by a handful.
  const total =
    catalog.certified.length +
    catalog.mine.length +
    catalog.recommended.length +
    catalog.available.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Skills"
        description={describe(catalog.certified.length, catalog.mine.length, total)}
      />

      <SkillCatalogBrowser catalog={catalog} />
    </div>
  );
}

function describe(certified: number, mine: number, total: number): string {
  if (certified === 0 && mine === 0) {
    return `All ${total} skills we track. Add the ones you have, then prove them with a quiz.`;
  }
  if (certified === 0) {
    return `${mine} claimed of ${total}. Pass a quiz on one and it turns into a certification.`;
  }
  return `${certified} certified and ${mine} claimed, out of ${total} we track.`;
}
