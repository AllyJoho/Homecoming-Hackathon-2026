// Public homepage — what a signed-out visitor sees.
//
// Server component (no hooks, no 'use client'). It only depends on APP_NAME
// from @/lib/appConfig and on next/link, so it doesn't rely on the Button/Card
// props in @/components/ui. All CTAs point at /login, which handles both
// sign-in and account creation.
//
// Statistics below are all from the cited sources at the bottom of the page.
//
// The hero visual renders the REAL CertificateView and the REAL Tag, with
// illustrative data. It used to be bespoke markup, and it had drifted into
// describing a different product: a progress bar reading "18 of 20 test cases
// passed", when this app asks fifteen questions and awards a level. Rendering
// the actual components is what stops that happening again — the example can
// only look wrong now if the certificate itself looks wrong.

// Signed-in users never see this page: it carries no site nav (it sits outside
// the (main) group on purpose, so a visitor isn't shown an app bar they can't
// use), and without the redirect below a signed-in student clicking "Home"
// landed here with no way back into the app and nothing but /login to click.
//
// `getSessionUser` rather than `requireSessionUser`: a visitor with no session
// is the audience for this page, not someone to bounce to /login.

import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import Link from 'next/link';
import { APP_NAME } from '@/lib/appConfig';
import { CertificateView } from '@/components/certificate/CertificateView';
import { Tag } from '@/components/ui';

const LOGIN_HREF = '/login';

type Stat = {
  figure: string;
  claim: string;
  source: string;
  sourceHref: string;
};

const PROBLEM_STATS: Stat[] = [
  {
    figure: '9.7 months',
    claim:
      'The average job search for tech workers, with more than 100 applications along the way. That is the longest of any industry surveyed.',
    source: 'United Way of the National Capital Area, 2026 survey',
    sourceHref: 'https://unitedwaynca.org/blog/how-long-does-it-take-to-find-a-job-2026-survey/',
  },
  {
    figure: '63%',
    claim:
      'of job seekers in one field experiment rated their skills higher than an assessment measured. Only 19% rated them lower. People who misjudge their skills apply to the wrong jobs.',
    source: 'Oxford Blavatnik School research summary of an Upjohn Institute study',
    sourceHref: 'https://mbrg.bsg.ox.ac.uk/node/374',
  },
  {
    figure: '46% and 45%',
    claim:
      'of U.S. tech job postings ask for Python and SQL, respectively. Most postings list more than one language, so one skill rarely covers a job.',
    source: 'Oxylabs analysis of postings, Jan 2025 to Mar 2026',
    sourceHref:
      'https://www.thetechoutlook.com/press-release/new-research-sql-rivals-python-as-americas-most-in-demand-programming-language-and-its-needed-far-beyond-silicon-valley/',
  },
];

/**
 * The hero certificate. Illustrative, but it obeys the real rules: 13 of 15
 * correct is 87%, which @/lib/quiz/levels puts in the Proficient band (>= 80%,
 * under Expert's 93.3%), and "JavaScript Fundamentals" is a real quiz title
 * from data/quizzes. Fixed date so the page doesn't change day to day.
 */
const EXAMPLE_CERTIFICATE = {
  holderName: 'Jordan Avery',
  title: 'JavaScript Fundamentals',
  level: 'Proficient' as const,
  correct: 13,
  questions: 15,
  score: 87,
  issuedAt: '2026-09-18T12:00:00.000Z',
};

/**
 * Two ranked listings shaped like @/components/recommendations/JobCard: a
 * percentage fit rather than "4 of 5 skills", because the real matcher scores
 * weighted coverage of what a listing asked for (@/lib/jobs/match); the
 * company/location/level line; and the skills that are not proven yet, which
 * inside the app link to the quiz that would prove them. Titles are real
 * occupation names from data/careers.json.
 */
const EXAMPLE_MATCHES = [
  {
    title: 'Software Developers',
    company: 'Northgate Labs',
    location: 'Provo, UT',
    level: 'internship',
    score: 84,
    notProven: null,
  },
  {
    title: 'Web Developers',
    company: 'Mesa Interactive',
    location: 'Remote',
    level: 'entry',
    score: 61,
    notProven: 'Database Design & Modeling',
  },
];

const STEPS = [
  {
    title: 'Take a skills test',
    body: 'Pick from 46 skills across engineering, data, security, design, and the business side. Fifteen questions each: multiple choice, true/false, multi-select, short answer, and code questions where you find the bug or put the lines back in order.',
  },
  {
    title: 'Get graded automatically',
    body: 'Every answer is checked against the answer key the moment you submit. The same answers always earn the same score, and nobody reads your work and forms an opinion about it.',
  },
  {
    title: 'Earn a certificate',
    body: 'Score 53% or better and you earn a certificate at one of three levels, Foundational, Proficient or Expert, with a public link you can add to a resume, portfolio, or profile.',
  },
  {
    title: 'See jobs that match',
    body: 'Your skills are scored against the weighted requirements on each listing, so every job shows a percentage fit and names the skills that would raise it.',
  },
];

const TRUST_POINTS = [
  {
    title: 'Graded against an answer key, not an opinion',
    body: 'Every question carries its correct answer, and grading is a direct comparison run the moment you submit. Two people who answer the same way always get the same result.',
  },
  {
    title: 'Anyone can check it',
    body: 'Your certificate lives at a public link. A recruiter, professor, or friend can open it and see exactly what you earned.',
  },
  {
    title: 'Free for job seekers',
    body: 'Taking tests, earning certificates, and viewing job matches costs you nothing.',
  },
];

const BENEFITS = [
  'Find out where your skills actually stand before you apply.',
  'Have proof to show instead of a list of claims on a resume.',
  'Spend your applications on jobs you are competitive for.',
  'See which skills would unlock more of the jobs you want.',
];

const LINK_FOCUS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:focus-visible:outline-indigo-400';

const PRIMARY_BUTTON = `inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-3 text-base font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 ${LINK_FOCUS}`;

const SECONDARY_BUTTON = `inline-flex items-center justify-center rounded-lg border border-zinc-300 px-5 py-3 text-base font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900 ${LINK_FOCUS}`;

export default async function HomePage() {
  // Already signed in? The dashboard is the useful page, not the pitch.
  if (await getSessionUser()) redirect('/home');

  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold">{APP_NAME}</span>
        <Link
          href={LOGIN_HREF}
          className={`rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900 ${LINK_FOCUS}`}
        >
          Sign in
        </Link>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section
          aria-labelledby="hero-heading"
          className="mx-auto grid w-full max-w-6xl gap-12 px-6 pb-20 pt-12 md:grid-cols-[1.1fr_0.9fr] md:items-center md:pt-20"
        >
          <div>
            <h1
              id="hero-heading"
              className="max-w-xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl"
            >
              Prove what you can code. Apply where you fit.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
              {APP_NAME} gives early-career developers free skills tests, graded automatically,
              with a shareable certificate for every one you pass and a clear view of the jobs your
              skills match.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={LOGIN_HREF} className={PRIMARY_BUTTON}>
                Create a free account
              </Link>
              <a href="#how-it-works" className={SECONDARY_BUTTON}>
                See how it works
              </a>
            </div>
          </div>

          {/* The one visual "moment" on the page. `showScore` is false so this
              is exactly what the public share link renders for a recruiter —
              the student's own score lives in the strip underneath, which is
              where the app shows it. */}
          <figure className="flex flex-col gap-4">
            <figcaption className="flex items-baseline justify-between gap-4">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                What a recruiter opens
              </span>
              <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                Example only
              </span>
            </figcaption>

            <CertificateView
              size="compact"
              showScore={false}
              holderName={EXAMPLE_CERTIFICATE.holderName}
              title={EXAMPLE_CERTIFICATE.title}
              level={EXAMPLE_CERTIFICATE.level}
              score={EXAMPLE_CERTIFICATE.score}
              issuedAt={EXAMPLE_CERTIFICATE.issuedAt}
            />

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Your result
              </p>
              <p className="mt-1.5 text-sm tabular-nums text-zinc-700 dark:text-zinc-300">
                {EXAMPLE_CERTIFICATE.correct} of {EXAMPLE_CERTIFICATE.questions} correct ·{' '}
                {EXAMPLE_CERTIFICATE.score}% · {EXAMPLE_CERTIFICATE.level}
              </p>

              <hr className="my-5 border-zinc-200 dark:border-zinc-800" />

              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Jobs ranked against your skills
              </p>
              <ul className="mt-3 flex flex-col gap-4">
                {EXAMPLE_MATCHES.map((match) => (
                  <li key={match.title}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">{match.title}</span>
                      {/* Same thresholds as JobCard's fit pill. */}
                      <Tag
                        variant={match.score >= 80 ? 'success' : match.score >= 50 ? 'info' : 'neutral'}
                      >
                        {match.score}% fit
                      </Tag>
                    </div>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {match.company} · {match.location} · {match.level}
                    </p>
                    {match.notProven && (
                      <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                        Not proven yet: {match.notProven}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </figure>
        </section>

        {/* The problem */}
        <section
          aria-labelledby="problem-heading"
          className="border-t border-zinc-200 dark:border-zinc-800"
        >
          <div className="mx-auto w-full max-w-6xl px-6 py-20">
            <h2 id="problem-heading" className="max-w-2xl text-3xl font-semibold tracking-tight">
              The job hunt is slow, and it is hard to know where you fit
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
              Early-career developers send out application after application without knowing which
              jobs they are ready for, and without a simple way to prove what they can do.
            </p>

            <dl className="mt-12 grid gap-10 md:grid-cols-3">
              {PROBLEM_STATS.map((stat) => (
                <div key={stat.figure} className="border-l-2 border-indigo-600 pl-5 dark:border-indigo-400">
                  <dt className="text-3xl font-semibold">{stat.figure}</dt>
                  <dd className="mt-3 text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {stat.claim}
                  </dd>
                  <dd className="mt-3 text-sm">
                    <a
                      href={stat.sourceHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-zinc-600 underline underline-offset-4 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 ${LINK_FOCUS}`}
                    >
                      {stat.source}
                    </a>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          aria-labelledby="how-heading"
          className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50"
        >
          <div className="mx-auto w-full max-w-6xl px-6 py-20">
            <h2 id="how-heading" className="text-3xl font-semibold tracking-tight">
              How {APP_NAME} works
            </h2>
            <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
                  >
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Why trust it */}
        <section aria-labelledby="trust-heading" className="border-t border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-20 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 id="trust-heading" className="text-3xl font-semibold tracking-tight">
                Why you can trust your results
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
                A certificate is only useful if people believe it. Ours names the level you
                reached and what you reached it in.
              </p>
            </div>
            <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
              {TRUST_POINTS.map((point) => (
                <li key={point.title} className="py-6 first:pt-0 last:pb-0">
                  <h3 className="text-lg font-semibold">{point.title}</h3>
                  <p className="mt-2 max-w-xl leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {point.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Why use it */}
        <section
          aria-labelledby="why-heading"
          className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50"
        >
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-20 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 id="why-heading" className="text-3xl font-semibold tracking-tight">
                Why use {APP_NAME}
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
                In the research above, job seekers who saw their measured skills shifted their
                applications toward jobs that matched their strengths.
              </p>
            </div>
            <ul className="flex flex-col gap-4">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex gap-3 text-lg leading-relaxed">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="mt-1.5 h-5 w-5 flex-none text-indigo-600 dark:text-indigo-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 10.5l4 4 8-9" />
                  </svg>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Final call to action */}
        <section aria-labelledby="cta-heading" className="border-t border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto w-full max-w-6xl px-6 py-20">
            <h2 id="cta-heading" className="max-w-xl text-3xl font-semibold tracking-tight">
              Take your first test today
            </h2>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
              Create a free account, pick a skill, and see where you stand.
            </p>
            <div className="mt-8">
              <Link href={LOGIN_HREF} className={PRIMARY_BUTTON}>
                Create a free account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto w-full max-w-6xl px-6 py-8 text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            Statistics are from the linked sources. The Oxford summary describes a study of young
            job seekers in South Africa that measured communication and numeracy skills. The
            certificate and job matches at the top of this page are the real components with
            illustrative data rather than a real result.
          </p>
          <p className="mt-4">
            &copy; {new Date().getFullYear()} {APP_NAME}
          </p>
        </div>
      </footer>
    </div>
  );
}