"use client";

import { Fragment, useMemo } from "react";
import GlossaryTerm from "@/app/components/GlossaryTerm";
import { renderGlossaryText } from "@/lib/terminologyGlossary";

export default function GlossaryText({ text }: { text: string }) {
  const segments = useMemo(() => renderGlossaryText(text), [text]);
  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <Fragment key={`text-${index}`}>{segment.value}</Fragment>;
        }
        return (
          <GlossaryTerm key={`term-${segment.entry.key}-${index}`} term={segment.entry.term}>
            {segment.value}
          </GlossaryTerm>
        );
      })}
    </>
  );
}
