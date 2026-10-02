'use client';

// @/components/quiz/QuizRunner.tsx
// Holds the answer state for one quiz sitting, paginates one question at a
// time, and POSTs the sheet when the student finishes.
//
// It receives a PublicQuiz — the answer key is never sent to the browser, so
// grading happens in the submit route and this component can't leak it.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import type { Answer, AnswerSheet, PublicQuiz } from '@/types/quiz';
import { Button, Modal } from '@/components/ui';
import { QuestionRenderer } from './QuestionRenderer';

export interface QuizRunnerProps {
  quiz: PublicQuiz;
}

export function QuizRunner({ quiz }: QuizRunnerProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<AnswerSheet>({});
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingBlanks, setConfirmingBlanks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = quiz.questions[current];
  const isLast = current === quiz.questions.length - 1;
  const answeredCount = Object.keys(answers).length;

  function setAnswer(answer: Answer) {
    setAnswers((prev) => ({ ...prev, [question.id]: answer }));
  }

  const blankCount = quiz.questions.length - answeredCount;

  // Unanswered questions grade as incorrect, so confirm before submitting
  // rather than blocking it — and only at the moment it matters.
  function handleSubmitClick() {
    if (blankCount > 0) {
      setConfirmingBlanks(true);
      return;
    }
    void submit();
  }

  async function submit() {
    setConfirmingBlanks(false);
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/quizzes/${quiz.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Could not submit the quiz.');
      }

      const { attemptId } = (await response.json()) as { attemptId: string };
      // The results page reads the attempt back from the DB, so a reload or a
      // shared link still works — the score isn't carried in component state.
      router.push(`/quizzes/${quiz.id}/results?attempt=${attemptId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Progress is answered-count, not page position — skipping ahead
          shouldn't look like progress. */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full bg-zinc-900 transition-[width] dark:bg-zinc-50"
          style={{ width: `${(answeredCount / quiz.questions.length) * 100}%` }}
        />
      </div>

      <QuestionRenderer
        question={question}
        answer={answers[question.id]}
        onChange={setAnswer}
        disabled={submitting}
        index={current + 1}
        total={quiz.questions.length}
      />

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          className="bg-white dark:bg-surface"
          onClick={() => setCurrent((i) => Math.max(0, i - 1))}
          disabled={current === 0 || submitting}
        >
          Back
        </Button>

        {isLast ? (
          <Button onClick={handleSubmitClick} disabled={submitting}>
            {submitting ? 'Grading…' : 'Submit quiz'}
          </Button>
        ) : (
          <Button
            onClick={() => setCurrent((i) => Math.min(quiz.questions.length - 1, i + 1))}
            disabled={submitting}
          >
            Next
          </Button>
        )}
      </div>

      <Modal
        open={confirmingBlanks}
        onClose={() => setConfirmingBlanks(false)}
        title="Submit with blank answers?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmingBlanks(false)}>
              Keep working
            </Button>
            <Button onClick={submit}>Submit anyway</Button>
          </>
        }
      >
        <p>
          {blankCount} question{blankCount === 1 ? '' : 's'} still blank. Blank answers are marked
          incorrect.
        </p>
      </Modal>
    </div>
  );
}
