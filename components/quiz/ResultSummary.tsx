// @/components/quiz/ResultSummary.tsx
// The score screen: percentage, the certificate level it earned (if any), and
// a per-question review.
//
// A certificate needs 8 of 15 correct; the levels and cutoffs live in
// @/lib/quiz/levels. The explanations come from `result.graded` (built
// server-side), not from `quiz.questions`, which has them stripped.

import Link from 'next/link';
import type { PublicQuiz, QuizResult } from '@/types/quiz';
import { LEVEL_TONE, levelMinPercent, nextLevel } from '@/lib/quiz/levels';
import { Card, Tag } from '@/components/ui';
import { QuestionCoach } from '@/components/quiz/QuestionCoach';
import { CodeBlock } from '@/components/quiz/CodeBlock';

export interface ResultSummaryProps {
  quiz: PublicQuiz;
  result: QuizResult;
  /** QuizAttempt id, so each question's coach can ask for feedback on it. */
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
  const next = nextLevel(result.pointsEarned, result.pointsPossible);

  return (
    <div className="flex flex-col gap-6">
      <Card
        title={quiz.title}
        action={
          result.level ? (
            <Tag tone={LEVEL_TONE[result.level]}>{result.level}</Tag>
          ) : (
            <Tag tone="warning">No certificate</Tag>
          )
        }
      >
        <p className="text-4xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {result.score}%
        </p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {result.pointsEarned} of {result.pointsPossible} points
        </p>

        {result.level ? (
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
        ) : (
          <p className="mt-4 text-sm text-zinc-700 dark:text-zinc-300">
            No certificate this time. Review the explanations below, then try again.
          </p>
        )}

        {/* A retake keeps the better certificate, so there's no downside to
            pointing at the next level up. On an unweighted quiz a point is
            one question. */}
        {next && (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {next.pointsNeeded} more correct answer{next.pointsNeeded === 1 ? '' : 's'} would have
            earned <strong>{next.level}</strong> ({levelMinPercent(next.level)}%).{' '}
            <Link href={`/quizzes/${quiz.id}`} className="font-medium underline underline-offset-4">
              Retake the quiz
            </Link>
            .
          </p>
        )}
      </Card>

      {/* The coaching used to be one card above this list, explaining every
          missed question at once. It's inside the list now, one tutor per
          question: the student doesn't have to match an explanation back to a
          question, and the thread knows what it's about, so they can ask
          follow-ups. See components/quiz/QuestionCoach. */}
      <Card title="Question review">
        <ol className="flex flex-col gap-4">
          {result.graded.map((graded, i) => {
            const question = quiz.questions.find((q) => q.id === graded.questionId);
            return (
              <li key={graded.questionId} className="flex gap-3 text-sm">
                <Tag tone={graded.correct ? 'success' : 'warning'}>{i + 1}</Tag>
                <div className="flex min-w-0 flex-col gap-2">
                  <p className="text-zinc-900 dark:text-zinc-50">{question?.prompt}</p>
                  {/* A "what does this log?" prompt means nothing without its
                      snippet, so the review shows it again. */}
                  {question?.code && <CodeBlock code={question.code} />}
                  {/* whitespace-pre-line because an order_lines answer is a
                      numbered list, not one line. */}
                  <p className="whitespace-pre-line text-zinc-600 dark:text-zinc-400">
                    Your answer:{' '}
                    <span
                      className={
                        graded.correct
                          ? 'font-medium text-zinc-900 dark:text-zinc-50'
                          : 'font-medium text-amber-700 dark:text-amber-400'
                      }
                    >
                      {graded.yourAnswer}
                    </span>
                  </p>
                  {graded.explanation && (
                    <p className="text-zinc-600 dark:text-zinc-400">{graded.explanation}</p>
                  )}
                  {/* Offered on correct questions too — a lucky guess is worth
                      asking about, and the button says which case it is. */}
                  <QuestionCoach
                    attemptId={attemptId}
                    questionId={graded.questionId}
                    correct={graded.correct}
                    language={question?.code?.language}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}
