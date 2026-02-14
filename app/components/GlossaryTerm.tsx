"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import type { GlossaryEntry } from "@/lib/terminologyGlossary";
import { getGlossaryEntry } from "@/lib/terminologyGlossary";

type GlossaryTermProps = {
  term: string;
  children?: ReactNode;
  className?: string;
  interactive?: boolean;
};

const getDescription = (entry: GlossaryEntry | null, term: string) =>
  entry?.description ?? `${term} definition is unavailable.`;

export default function GlossaryTerm({
  term,
  children,
  className,
  interactive = true
}: GlossaryTermProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const entry = useMemo(() => getGlossaryEntry(term), [term]);
  const description = getDescription(entry, term);

  return (
    <span className={`glossary-term-wrap ${className ?? ""}`.trim()}>
      <span
        tabIndex={interactive ? 0 : undefined}
        role={interactive ? "button" : undefined}
        aria-describedby={tooltipId}
        aria-label={`${term}: ${description}`}
        className="glossary-term"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={interactive ? () => setOpen(true) : undefined}
        onBlur={interactive ? () => setOpen(false) : undefined}
        onClick={
          interactive
            ? (event) => {
                event.preventDefault();
                setOpen((value) => !value);
              }
            : undefined
        }
        onKeyDown={
          interactive
            ? (event) => {
                if (event.key === "Escape") {
                  setOpen(false);
                }
              }
            : undefined
        }
      >
        {children ?? term}
      </span>
      <span
        id={tooltipId}
        role="tooltip"
        className={`glossary-tooltip ${open ? "open" : ""}`.trim()}
      >
        {description}
      </span>
    </span>
  );
}
