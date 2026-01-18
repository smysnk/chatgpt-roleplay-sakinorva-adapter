"use client";

import { useMemo, type ReactNode } from "react";
import StnfIndicator from "@/app/components/StnfIndicator";

const STNF_TOOLTIP =
  "The STNF indicator visualizes cognitive function expression in a more Jungian interpretive lens where we possess the ability to express both introverted and extroverted functions based on situational context.";

type ResultRow =
  | {
      kind: "text";
      label: string;
      value: string;
      className: string;
      isFunctionRow: boolean;
    }
  | {
      kind: "letters";
      label: string;
      letters: string[];
      className: string;
      isFunctionRow: boolean;
    };

type ResultSection = {
  title: string;
  rows: ResultRow[];
};

const TYPE_CODE_PATTERN = /\b[EI][NS][TF][JP]\b/g;

const parseResultsFragment = (htmlFragment: string): ResultSection[] => {
  if (typeof window === "undefined") {
    return [];
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlFragment, "text/html");
  const root = doc.querySelector("#my_results.kekka") ?? doc.querySelector(".kekka");

  if (!root) {
    return [];
  }

  const sections: ResultSection[] = [];
  let currentSection: ResultSection | null = null;

  Array.from(root.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) {
      return;
    }

    if (child.classList.contains("zuhyou")) {
      return;
    }

    if (child.classList.contains("header")) {
      const title = child.textContent?.trim() ?? "";
      currentSection = { title: title || "Results", rows: [] };
      sections.push(currentSection);
      return;
    }

    if (child.classList.contains("row")) {
      const label = child.querySelector("div:first-child span")?.textContent?.trim() ?? "";
      const valueContainer = child.querySelector("div:last-child");
      if (!label || !valueContainer) {
        return;
      }

      const isFunctionRow = child.classList.contains("kinou");
      const className = child.className;

      if (child.classList.contains("myers_letter_type")) {
        const letters = Array.from(valueContainer.querySelectorAll("span"))
          .map((span) => span.textContent?.trim())
          .filter(Boolean) as string[];

        if (!letters.length) {
          return;
        }

        if (!currentSection) {
          currentSection = { title: "Results", rows: [] };
          sections.push(currentSection);
        }

        currentSection.rows.push({
          kind: "letters",
          label,
          letters,
          className,
          isFunctionRow
        });
        return;
      }

      const value = valueContainer.textContent?.trim() ?? "";
      if (!value) {
        return;
      }

      if (!currentSection) {
        currentSection = { title: "Results", rows: [] };
        sections.push(currentSection);
      }

      currentSection.rows.push({
        kind: "text",
        label,
        value,
        className,
        isFunctionRow
      });
    }
  });

  return sections.filter((section) => section.rows.length > 0);
};

export default function SakinorvaResults({
  htmlFragment,
  functionScores
}: {
  htmlFragment: string;
  functionScores: Record<string, number> | null;
}) {
  const sections = useMemo(() => parseResultsFragment(htmlFragment), [htmlFragment]);
  const renderTypeCode = (typeCode: string, key: string) => (
    <span className="type-badges" key={key}>
      {typeCode.split("").map((letter, index) => (
        <span key={`${letter}-${index}`} className={`type-letter ${letter.toLowerCase()}`}>
          {letter}
        </span>
      ))}
    </span>
  );

  const renderValueWithBadges = (value: string) => {
    const matches = Array.from(value.matchAll(TYPE_CODE_PATTERN));
    if (!matches.length) {
      return value;
    }

    const fragments: ReactNode[] = [];
    let lastIndex = 0;

    matches.forEach((match, index) => {
      if (match.index === undefined) {
        return;
      }
      if (match.index > lastIndex) {
        fragments.push(value.slice(lastIndex, match.index));
      }
      fragments.push(renderTypeCode(match[0], `${match[0]}-${index}`));
      lastIndex = match.index + match[0].length;
      if (index === matches.length - 1 && lastIndex < value.length) {
        fragments.push(value.slice(lastIndex));
      }
    });

    return fragments;
  };

  return (
    <div className="sakinorva-results custom">
      <div className="sakinorva-section stnf-section">
        <div className="sakinorva-section-title">
          <span>STNF</span>
          <span className="stnf-help" title={STNF_TOOLTIP} aria-label={STNF_TOOLTIP}>
            ?
          </span>
        </div>
        {functionScores ? (
          <StnfIndicator functionScores={functionScores} />
        ) : (
          <p className="helper">STNF data unavailable.</p>
        )}
      </div>
      {sections.map((section, sectionIndex) => (
        <div className="sakinorva-section" key={`${section.title}-${sectionIndex}`}>
          <div className="sakinorva-section-title">{section.title}</div>
          <div className="sakinorva-section-body">
            {section.rows.map((row, rowIndex) => (
              <div
                className={`sakinorva-row ${row.isFunctionRow ? "is-function" : ""}`.trim()}
                key={`${row.label}-${rowIndex}`}
              >
                <div className="sakinorva-row-label">{row.label}</div>
                <div className="sakinorva-row-value">
                  {row.kind === "letters" ? (
                    <span className="type-badges">
                      {row.letters.map((letter, index) => (
                        <span
                          key={`${letter}-${index}`}
                          className={`type-letter ${letter.toLowerCase()}`}
                        >
                          {letter}
                        </span>
                      ))}
                    </span>
                  ) : section.title.toLowerCase().includes("absolute") ? (
                    renderValueWithBadges(row.value)
                  ) : (
                    row.value
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
