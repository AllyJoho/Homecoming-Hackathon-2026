// @/components/certifications/CertList.tsx

import type { Certification } from '@/types/profile';
import { CertCard } from './CertCard';

export interface CertListProps {
  certifications: Certification[];
}

export function CertList({ certifications }: CertListProps) {
  if (certifications.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No certificates yet — pass a quiz to earn your first one.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {certifications.map((certification) => (
        <CertCard key={certification.id} certification={certification} />
      ))}
    </div>
  );
}
