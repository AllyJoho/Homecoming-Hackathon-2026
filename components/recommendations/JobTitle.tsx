// @/components/recommendations/JobTitle.tsx
// A job card's heading, which is also the link out to the listing.
//
// Replaces the "View listing" link that used to sit at the bottom of each
// card: the title is the thing you'd click anyway, and spending a footer row on
// a second copy of it pushed the actual content down. Shared by JobCard and
// JobBrowseCard so the two headings stay identical.
//
// The classes match @/components/ui/Card's own `title` <h2> — Card renders a
// non-string title verbatim, so the styling has to come from here.

export interface JobTitleProps {
  title: string;
  /** The listing's URL. Absent for a stored job that never had one. */
  url?: string;
}

// A notch larger than Card's own title: on a list of listings the job name is
// the thing you scan for, and it's also the link out to the posting.
const HEADING = 'text-lg font-semibold leading-snug text-zinc-900 dark:text-zinc-50';

export function JobTitle({ title, url }: JobTitleProps) {
  // No URL means nothing to link to, so it stays plain text rather than
  // becoming a dead anchor.
  if (!url) {
    return <h2 className={HEADING}>{title}</h2>;
  }

  return (
    <h2 className={HEADING}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        // Underlined from the start, not only on hover: this is the one link on
        // the card that isn't obviously one from its shape.
        className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900 dark:decoration-zinc-600 dark:hover:decoration-zinc-50"
      >
        {title}
      </a>
    </h2>
  );
}
