// @/components/quiz/ResultSummary.tsx
// The score screen: percentage, the level it earned, and a per-question review.
//
// There is no pass/fail — every completed quiz earns a certificate, and the
// level is the outcome. The explanations come from `result.graded` (built
// server-side), not from `quiz.questions`, which has them stripped.

import Link from 'next/link';
import type { PublicQuiz, QuizResult } from '@/types/quiz';
import { LEVEL_TONE, nextLevelThreshold } from '@/lib/quiz/levels';
import { Card, Tag } from '@/components/ui';

export interface ResultSummaryProps {
  quiz: PublicQuiz;
  result: QuizResult;
  certificateSlug?: string | null;
}

export function ResultSummary({ quiz, result, certificateSlug }: ResultSummaryProps) {
  const next = nextLevelThreshold(result.score);

  return (
    <div className="flex flex-col gap-6">
      <Card title={quiz.title} action={<Tag tone={LEVEL_TONE[result.level]}>{result.level}</Tag>}>
        <p className="text-4xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {result.score}%
        </p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {result.pointsEarned} of {result.pointsPossible} points
        </p>

        <p className="mt-4 text-sm text-zinc-700 dark:text-zinc-300">
          You earned a <strong>{result.level}</strong> certificate.{' '}
          {certificateSlug && (
            <Link
              href={`/certificates/${certificateSlug}`}
              className="font-medium underline underline-offset-4"
            >
              View it
            </Link>
          )}
        </p>

        {/* A retake keeps the better certificate, so there's no downside to
            pointing at the next level up. */}
        {next && (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {next.min - result.score} more point{next.min - result.score === 1 ? '' : 's'} would
            have reached <strong>{next.level}</strong>.{' '}
            <Link href={`/quizzes/${quiz.id}`} className="font-medium underline underline-offset-4">
              Retake the quiz
            </Link>
            .
          </p>
        )}
      </Card>

      <Card title="Question review">
        <ol className="flex flex-col gap-4">
          {result.graded.map((graded, i) => {
            const question = quiz.questions.find((q) => q.id === graded.questionId);
            return (
              <li key={graded.questionId} className="flex gap-3 text-sm">
                <Tag tone={graded.correct ? 'success' : 'warning'}>{i + 1}</Tag>
                <div>
                  <p className="text-zinc-900 dark:text-zinc-50">{question?.prompt}</p>
                  {graded.explanation && (
                    <p className="mt-1 text-zinc-600 dark:text-zinc-400">{graded.explanation}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}
