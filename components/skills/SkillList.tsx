'use client';

// @/components/skills/SkillList.tsx
// Shows a profile's skills and lets self-reported ones be removed.
//
// QUIZ-sourced skills are deliberately not removable: they're evidence of a
// passed quiz, so deleting one would contradict the certificate.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProfileSkill } from '@/types/profile';
import { Tag } from '@/components/ui';

export interface SkillListProps {
  skills: ProfileSkill[];
}

export function SkillList({ skills }: SkillListProps) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);

  async function remove(slug: string) {
    setRemoving(slug);
    try {
      await fetch(`/api/skills?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setRemoving(null);
    }
  }

  if (skills.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No skills yet. Add a few, or pass a quiz to earn one.
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <li key={skill.slug}>
          <Tag tone={skill.source === 'QUIZ' ? 'success' : 'neutral'}>
            {skill.name}
            {skill.source === 'QUIZ' && <span title="Proven by quiz">✓</span>}
            {skill.source === 'SELF_REPORTED' && (
              <button
                type="button"
                onClick={() => remove(skill.slug)}
                disabled={removing === skill.slug}
                aria-label={`Remove ${skill.name}`}
                className="ml-0.5 text-zinc-500 hover:text-zinc-900 disabled:opacity-50 dark:hover:text-zinc-50"
              >
                ×
              </button>
            )}
          </Tag>
        </li>
      ))}
    </ul>
  );
}
