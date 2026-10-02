// @/components/quiz/QuizCard.tsx
// One quiz on the selection screen. Server component — no interactivity
// beyond the link.

import Link from 'next/link';
import type { Quiz } from '@/types/quiz';
import { Card, Tag } from '@/components/ui';

export interface QuizCardProps {
  quiz: Quiz;
  /** Set when the student has already earned this certificate. */
  earned?: boolean;
}

export function QuizCard({ quiz, earned }: QuizCardProps) {
  return (
    <Card
      title={quiz.title}
      action={earned ? <Tag tone="success">Earned</Tag> : undefined}
    >
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{quiz.description}</p>
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
        {quiz.questions.length} questions
        {quiz.timeLimitSeconds ? ` · ${Math.round(quiz.timeLimitSeconds / 60)} min` : ''}
      </p>
      <Link
        href={`/quizzes/${quiz.id}`}
        className="mt-4 inline-block text-sm font-medium underline underline-offset-4"
      >
        {earned ? 'Retake quiz' : 'Start quiz'}
      </Link>
    </Card>
  );
}
