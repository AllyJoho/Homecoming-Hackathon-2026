// @/components/experience/ResumeDocument.tsx
// The rendered resume: the student's experience entries and proven skills,
// laid out to print on one page.
//
// Print, not PDF generation. The browser already turns a page into a PDF
// faithfully, and a print stylesheet is a fraction of the work (and weight) of
// a PDF library — so the @media print rules below ARE the export feature.
//
// Deliberately plain. A student sends this to an employer, so it follows the
// conventions a recruiter expects rather than this app's visual style: serif
// body, black on white, no cards, no colour.

import type { Experience } from '@/types/experience';
import { EXPERIENCE_KINDS, formatDateRange } from '@/types/experience';
import type { ProfileSkill } from '@/types/profile';

export interface ResumeDocumentProps {
  name: string;
  email: string;
  experiences: Experience[];
  skills: ProfileSkill[];
}

export function ResumeDocument({ name, email, experiences, skills }: ResumeDocumentProps) {
  // Proven first, then resume-evidenced. Typed-in claims are left off: this
  // document goes to an employer, and an unbacked claim is the one line that
  // could embarrass the student in an interview.
  const proven = skills.filter((skill) => skill.source === 'QUIZ');
  const evidenced = skills.filter((skill) => skill.source === 'RESUME');

  return (
    <article className="resume-document mx-auto w-full max-w-[8.5in] bg-white px-10 py-10 font-serif text-[11pt] leading-snug text-black">
      <header className="mb-5 border-b border-black pb-3 text-center">
        <h1 className="text-[20pt] font-bold tracking-tight">{name}</h1>
        <p className="mt-1 text-[10pt]">{email}</p>
      </header>

      {EXPERIENCE_KINDS.map(({ kind, label }) => {
        const section = experiences.filter((entry) => entry.kind === kind);
        if (section.length === 0) return null;

        return (
          <section key={kind} className="mb-4 break-inside-avoid">
            <h2 className="mb-2 border-b border-black pb-0.5 text-[11pt] font-bold uppercase tracking-wide">
              {label}
            </h2>

            {section.map((entry) => (
              <div key={entry.id} className="mb-3 break-inside-avoid last:mb-0">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-bold">
                    {entry.title || entry.organization}
                    {entry.title && entry.organization && (
                      <span className="font-normal"> — {entry.organization}</span>
                    )}
                  </p>
                  <p className="shrink-0 text-[10pt] italic">{formatDateRange(entry)}</p>
                </div>

                {entry.location && <p className="text-[10pt] italic">{entry.location}</p>}

                {entry.bullets.length > 0 && (
                  <ul className="mt-1 list-disc pl-5">
                    {entry.bullets.map((bullet, i) => (
                      <li key={i} className="mb-0.5">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        );
      })}

      {(proven.length > 0 || evidenced.length > 0) && (
        <section className="break-inside-avoid">
          <h2 className="mb-2 border-b border-black pb-0.5 text-[11pt] font-bold uppercase tracking-wide">
            Skills
          </h2>

          {proven.length > 0 && (
            <p className="mb-1">
              <span className="font-bold">Certified:</span>{' '}
              {proven.map((skill) => skill.name).join(' · ')}
            </p>
          )}
          {evidenced.length > 0 && (
            <p>
              <span className="font-bold">Additional:</span>{' '}
              {evidenced.map((skill) => skill.name).join(' · ')}
            </p>
          )}
        </section>
      )}
    </article>
  );
}
