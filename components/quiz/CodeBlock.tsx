// @/components/quiz/CodeBlock.tsx
// A read-only, syntax-highlighted snippet with line numbers. Used under a
// question's prompt whenever the question carries `code`.
//
// Rendered as one row per line (not one <pre> blob) so find-the-bug can pass
// `onToggleLine` and get each line back as a toggle button.
//
// Colours come from the `.code-token-*` rules in app/globals.css rather than a
// Prism theme object, so light/dark follows the same prefers-color-scheme
// media query as the rest of the app.

import { Highlight, type PrismTheme } from 'prism-react-renderer';
import type { QuestionCode } from '@/types/quiz';

// An empty theme: Prism still tokenizes and hands back `token keyword`-style
// class names, but no inline colours that would fight the stylesheet.
const CLASS_ONLY_THEME: PrismTheme = { plain: {}, styles: [] };

export interface CodeBlockProps {
  code: QuestionCode;
  /** 1-based. Only meaningful alongside `onToggleLine`. */
  selectedLines?: number[];
  /** When present, every line becomes a toggle button. */
  onToggleLine?: (lineNumber: number) => void;
  disabled?: boolean;
}

export function CodeBlock({ code, selectedLines = [], onToggleLine, disabled }: CodeBlockProps) {
  // Authored JSON tends to end with a newline, which would render as an empty
  // trailing line with its own number.
  const source = code.source.replace(/\n+$/, '');

  return (
    <Highlight code={source} language={code.language} theme={CLASS_ONLY_THEME}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <div className="code-block overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 py-3 font-mono text-sm leading-6 dark:border-surface-border dark:bg-surface-raised">
          {/* Not a <table>: screen readers should read this as code, so the
              numbers are hidden from them and the lines read top to bottom. */}
          <pre className="min-w-max" aria-label={`${code.language} code`}>
            {tokens.map((line, i) => {
              const { className, ...lineProps } = getLineProps({ line });
              const lineNumber = i + 1;
              const content = (
                <>
                  <span
                    aria-hidden
                    className="w-10 shrink-0 select-none pr-4 text-right tabular-nums text-zinc-400 dark:text-zinc-600"
                  >
                    {lineNumber}
                  </span>
                  <code className="pr-4">
                    {line.map((token, j) => (
                      <span key={j} {...getTokenProps({ token })} />
                    ))}
                  </code>
                </>
              );

              if (!onToggleLine) {
                return (
                  <div key={i} {...lineProps} className={`${className} flex`}>
                    {content}
                  </div>
                );
              }

              const selected = selectedLines.includes(lineNumber);
              return (
                <button
                  key={i}
                  type="button"
                  {...lineProps}
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => onToggleLine(lineNumber)}
                  className={`${className} flex w-full border-l-4 text-left hover:bg-zinc-200/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-zinc-900 dark:hover:bg-zinc-800/60 dark:focus-visible:outline-zinc-50 ${
                    selected
                      ? 'border-red-500 bg-red-100 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-950/60'
                      : 'border-transparent'
                  }`}
                >
                  <span className="sr-only">Line {lineNumber}: </span>
                  {content}
                </button>
              );
            })}
          </pre>
        </div>
      )}
    </Highlight>
  );
}
