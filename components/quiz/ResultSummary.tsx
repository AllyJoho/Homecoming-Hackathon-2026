// @/components/quiz/ResultSummary.tsx
// The score screen. Shows per-question outcomes and the explanation text,
// which the student only sees after grading.
//
// The explanations come from `result.graded` (built server-side), not from
// `quiz.questions` — toPublicQuiz strips them from the quiz itself.

import Link from 'next/link';
import type { PublicQuiz, QuizResult } from '@/types/quiz';
import { Card, Tag } from '@/components/ui';
import { FeedbackPanel } from '@/components/quiz/FeedbackPanel';

export interface ResultSummaryProps {
  quiz: PublicQuiz;
  result: QuizResult;
  /** QuizAttempt id, so the Coaching card can ask for feedback on it. */
  attemptId: string;
  /** Present when this attempt earned a certificate. */
  certificateSlug?: string | null;
}

export function ResultSummary({
  quiz,
  result,
  attemptId,
  certificateSlug,
}: ResultSummaryProps) {
  const missedCount = result.graded.filter((graded) => !graded.correct).length;

  return (
    <div className="flex flex-col gap-6">
      <Card
        title={quiz.title}
        action={
          result.passed ? <Tag tone="success">Passed</Tag> : <Tag tone="warning">Not yet</Tag>
        }
      >
        <p className="text-4xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {result.score}%
        </p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {result.pointsEarned} of {result.pointsPossible} points · {quiz.passingScore}% needed
        </p>

        {result.passed ? (
          <p className="mt-4 text-sm text-zinc-700 dark:text-zinc-300">
            Certificate added to your profile.{' '}
            {certificateSlug && (
              <Link
                href={`/certificates/${certificateSlug}`}
                className="font-medium underline underline-offset-4"
              >
                View it
              </Link>
            )}
          </p>
        ) : (
          <p className="mt-4 text-sm text-zinc-700 dark:text-zinc-300">
            Review the answers below and{' '}
            <Link href={`/quizzes/${quiz.id}`} className="font-medium underline underline-offset-4">
              try again
            </Link>
            .
          </p>
        )}
      </Card>

      {/* Above the per-question list on purpose: when a student fails, the
          explanation of *why* is the thing they came for. Hidden on a perfect
          score, which the feedback route would only answer with a no-op. */}
      {missedCount > 0 && <FeedbackPanel attemptId={attemptId} missedCount={missedCount} />}

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
