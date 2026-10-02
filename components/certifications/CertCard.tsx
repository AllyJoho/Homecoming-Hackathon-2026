// @/components/certifications/CertCard.tsx
// One earned certificate, as it appears on the home screen.

import Link from 'next/link';
import type { Certification } from '@/types/profile';
import { LEVEL_TONE } from '@/lib/quiz/levels';
import { Card, Tag } from '@/components/ui';

export interface CertCardProps {
  certification: Certification;
}

export function CertCard({ certification }: CertCardProps) {
  return (
    <Card
      title={certification.title}
      action={<Tag tone={LEVEL_TONE[certification.level]}>{certification.level}</Tag>}
    >
      <p className="text-sm tabular-nums text-zinc-700 dark:text-zinc-300">
        {certification.score}%
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Earned{' '}
        {new Date(certification.issuedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </p>
      <Link
        href={`/certificates/${certification.shareSlug}`}
        className="mt-3 inline-block text-sm font-medium underline underline-offset-4"
      >
        View certificate
      </Link>
    </Card>
  );
}
