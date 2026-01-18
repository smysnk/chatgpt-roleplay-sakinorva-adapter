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
const FUNCTION_ORDER = ["Te", "Ti", "Fe", "Fi", "Ne", "Ni", "Se", "Si"] as const;
const OPPOSITE_FUNCTION: Record<string, string> = {
  Te: "Fi",
  Ti: "Fe",
  Fe: "Ti",
  Fi: "Te",
  Ne: "Si",
  Ni: "Se",
  Se: "Ni",
  Si: "Ne"
};

const formatScore = (value: number) => value.toFixed(2);

const getAttitude = (fn: string) => (fn[1]?.toLowerCase() === "e" ? "E" : "I");
const getCategory = (fn: string) => (/[TF]/i.test(fn[0]) ? "judging" : "perceiving");
const getTF = (fn: string) => (/^T/i.test(fn) ? "T" : "F");
const getSN = (fn: string) => (/^N/i.test(fn) ? "N" : "S");

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
  const renderTypeBadge = (letter: string, key: string) => (
    <span
      key={key}
      className={`type-letter ${letter === "?" ? "unknown" : letter.toLowerCase()}`}
    >
      {letter}
    </span>
  );

  const renderTypeCode = (typeCode: string, key: string) => (
    <span className="type-badges" key={key}>
      {typeCode.split("").map((letter, index) => renderTypeBadge(letter, `${letter}-${index}`))}
    </span>
  );

  const renderValueWithBadges = (value: string) => {
    const matches = Array.from(value.matchAll(TYPE_CODE_PATTERN));
    const fallbackMatches = Array.from(value.matchAll(/[EISNTFJP\?]/gi));
    const useFallback = !matches.length && fallbackMatches.length;
    const activeMatches = useFallback ? fallbackMatches : matches;
    if (!activeMatches.length) {
      return value;
    }

    const fragments: ReactNode[] = [];
    let lastIndex = 0;

    activeMatches.forEach((match, index) => {
      if (match.index === undefined) {
        return;
      }
      if (match.index > lastIndex) {
        fragments.push(value.slice(lastIndex, match.index));
      }
      const letter = match[0].toUpperCase();
      fragments.push(
        <span className="type-badges" key={`${letter}-${index}`}>
          {renderTypeBadge(letter, `${letter}-${index}`)}
        </span>
      );
      lastIndex = match.index + match[0].length;
      if (index === activeMatches.length - 1 && lastIndex < value.length) {
        fragments.push(value.slice(lastIndex));
      }
    });

    return fragments;
  };

  const derived = useMemo(() => {
    if (!functionScores) {
      return null;
    }
    const scoreFor = (key: string) => functionScores[key] ?? 0;
    const entries = FUNCTION_ORDER.map((key) => ({ key, score: scoreFor(key) }));
    const sorted = [...entries].sort((a, b) => b.score - a.score);
    const dominant = sorted[0];
    if (!dominant) {
      return null;
    }
    const dominantAttitude = getAttitude(dominant.key);
    const dominantCategory = getCategory(dominant.key);
    const auxiliaryCandidates = entries
      .filter(
        (entry) =>
          getAttitude(entry.key) !== dominantAttitude && getCategory(entry.key) !== dominantCategory
      )
      .sort((a, b) => b.score - a.score);
    const auxiliary = auxiliaryCandidates[0] ?? sorted[1];
    const auxiliaryCategory = auxiliary ? getCategory(auxiliary.key) : "judging";
    const grantType = `${dominantAttitude}${
      dominantCategory === "perceiving" ? getSN(dominant.key) : getSN(auxiliary?.key ?? "Ne")
    }${dominantCategory === "judging" ? getTF(dominant.key) : getTF(auxiliary?.key ?? "Ti")}${
      dominantAttitude === "E"
        ? dominantCategory === "judging"
          ? "J"
          : "P"
        : auxiliaryCategory === "judging"
          ? "J"
          : "P"
    }`;
    const grantStack = [
      dominant.key,
      auxiliary?.key,
      auxiliary?.key ? OPPOSITE_FUNCTION[auxiliary.key] : undefined,
      OPPOSITE_FUNCTION[dominant.key]
    ].filter(Boolean) as string[];

    const sumScores = (keys: string[]) => keys.reduce((acc, key) => acc + scoreFor(key), 0);
    const sumE = sumScores(["Te", "Fe", "Ne", "Se"]);
    const sumI = sumScores(["Ti", "Fi", "Ni", "Si"]);
    const sumN = sumScores(["Ne", "Ni"]);
    const sumS = sumScores(["Se", "Si"]);
    const sumT = sumScores(["Te", "Ti"]);
    const sumF = sumScores(["Fe", "Fi"]);
    const sumJudging = sumScores(["Te", "Ti", "Fe", "Fi"]);
    const sumPerceiving = sumScores(["Ne", "Ni", "Se", "Si"]);
    const sumEJudging = sumScores(["Te", "Fe"]);
    const sumEPerceiving = sumScores(["Ne", "Se"]);
    const sumIJudging = sumScores(["Ti", "Fi"]);
    const sumIPerceiving = sumScores(["Ni", "Si"]);

    const pickLetter = (left: number, right: number, leftLetter: string, rightLetter: string) => {
      if (left === right) {
        return "?";
      }
      return left > right ? leftLetter : rightLetter;
    };

    const axisEI = pickLetter(sumE, sumI, "E", "I");
    const axisSN = pickLetter(sumN, sumS, "N", "S");
    const axisTF = pickLetter(sumT, sumF, "T", "F");
    const axisJP =
      axisEI === "E"
        ? pickLetter(sumEJudging, sumEPerceiving, "J", "P")
        : axisEI === "I"
          ? pickLetter(sumIJudging, sumIPerceiving, "J", "P")
          : "?";
    const axisType = `${axisEI}${axisSN}${axisTF}${axisJP}`;
    const myersEI = axisEI;
    const myersSN = pickLetter(sumS, sumN, "S", "N");
    const myersTF = axisTF;
    const myersJP = pickLetter(sumJudging, sumPerceiving, "J", "P");
    const myersType = `${myersEI}${myersSN}${myersTF}${myersJP}`;

    return {
      entries,
      sorted,
      dominant,
      auxiliary,
      grantType,
      grantStack,
      sums: {
        sumE,
        sumI,
        sumN,
        sumS,
        sumT,
        sumF,
        sumJudging,
        sumPerceiving,
        sumEJudging,
        sumEPerceiving,
        sumIJudging,
        sumIPerceiving
      },
      axisType,
      myersType,
      axisLetters: { axisEI, axisSN, axisTF, axisJP },
      myersLetters: { myersEI, myersSN, myersTF, myersJP }
    };
  }, [functionScores]);

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
      {derived ? (
        <>
          <div className="sakinorva-section">
            <div className="sakinorva-section-title">Grant (Absolute)</div>
            <p className="helper" style={{ marginTop: "-8px" }}>
              Uses the highest absolute function scores to assemble the Grant stack (dominant → inferior)
              and derive the MBTI letters.
            </p>
            <div className="sakinorva-section-body">
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">Top scores</div>
                <div className="sakinorva-row-value calc-value">
                  {derived.sorted.slice(0, 4).map((entry) => (
                    <span key={entry.key} className="function-badge">
                      {entry.key} {formatScore(entry.score)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">Dominant</div>
                <div className="sakinorva-row-value calc-value">
                  <span className="function-badge">
                    {derived.dominant.key} {formatScore(derived.dominant.score)}
                  </span>
                </div>
              </div>
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">Auxiliary (opposite attitude + category)</div>
                <div className="sakinorva-row-value calc-value">
                  {derived.auxiliary ? (
                    <span className="function-badge">
                      {derived.auxiliary.key} {formatScore(derived.auxiliary.score)}
                    </span>
                  ) : (
                    <span className="helper">Unavailable</span>
                  )}
                </div>
              </div>
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">Grant stack</div>
                <div className="sakinorva-row-value calc-value">
                  {derived.grantStack.map((fn, index) => (
                    <span key={`${fn}-${index}`} className="function-badge">
                      {fn}
                    </span>
                  ))}
                </div>
              </div>
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">Grant type</div>
                <div className="sakinorva-row-value">
                  <span className="type-badges">
                    {derived.grantType.split("").map((letter, index) =>
                      renderTypeBadge(letter, `grant-${letter}-${index}`)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="sakinorva-section">
            <div className="sakinorva-section-title">Axis-Based (Absolute)</div>
            <p className="helper" style={{ marginTop: "-8px" }}>
              Compares extroverted vs. introverted totals for each axis, and sets J/P from the dominant
              attitude.
            </p>
            <div className="sakinorva-section-body">
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">E vs I</div>
                <div className="sakinorva-row-value calc-value">
                  {renderTypeBadge("E", "axis-e")}
                  <span className="calc-score">{formatScore(derived.sums.sumE)}</span>
                  <span className="calc-divider">vs</span>
                  {renderTypeBadge("I", "axis-i")}
                  <span className="calc-score">{formatScore(derived.sums.sumI)}</span>
                  <span className="calc-divider">→</span>
                  {renderTypeBadge(derived.axisLetters.axisEI, "axis-ei")}
                </div>
              </div>
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">N vs S</div>
                <div className="sakinorva-row-value calc-value">
                  {renderTypeBadge("N", "axis-n")}
                  <span className="calc-score">{formatScore(derived.sums.sumN)}</span>
                  <span className="calc-divider">vs</span>
                  {renderTypeBadge("S", "axis-s")}
                  <span className="calc-score">{formatScore(derived.sums.sumS)}</span>
                  <span className="calc-divider">→</span>
                  {renderTypeBadge(derived.axisLetters.axisSN, "axis-sn")}
                </div>
              </div>
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">T vs F</div>
                <div className="sakinorva-row-value calc-value">
                  {renderTypeBadge("T", "axis-t")}
                  <span className="calc-score">{formatScore(derived.sums.sumT)}</span>
                  <span className="calc-divider">vs</span>
                  {renderTypeBadge("F", "axis-f")}
                  <span className="calc-score">{formatScore(derived.sums.sumF)}</span>
                  <span className="calc-divider">→</span>
                  {renderTypeBadge(derived.axisLetters.axisTF, "axis-tf")}
                </div>
              </div>
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">J vs P (by attitude)</div>
                <div className="sakinorva-row-value calc-value">
                  {derived.axisLetters.axisEI === "E" ? (
                    <>
                      {renderTypeBadge("J", "axis-ej")}
                      <span className="calc-score">{formatScore(derived.sums.sumEJudging)}</span>
                      <span className="calc-divider">vs</span>
                      {renderTypeBadge("P", "axis-ep")}
                      <span className="calc-score">{formatScore(derived.sums.sumEPerceiving)}</span>
                    </>
                  ) : derived.axisLetters.axisEI === "I" ? (
                    <>
                      {renderTypeBadge("J", "axis-ij")}
                      <span className="calc-score">{formatScore(derived.sums.sumIJudging)}</span>
                      <span className="calc-divider">vs</span>
                      {renderTypeBadge("P", "axis-ip")}
                      <span className="calc-score">{formatScore(derived.sums.sumIPerceiving)}</span>
                    </>
                  ) : (
                    <span className="helper">E/I tie; J/P undefined.</span>
                  )}
                  <span className="calc-divider">→</span>
                  {renderTypeBadge(derived.axisLetters.axisJP, "axis-jp")}
                </div>
              </div>
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">Axis-based type</div>
                <div className="sakinorva-row-value">
                  <span className="type-badges">
                    {derived.axisType.split("").map((letter, index) =>
                      renderTypeBadge(letter, `axis-${letter}-${index}`)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="sakinorva-section">
            <div className="sakinorva-section-title">Myers (Absolute)</div>
            <p className="helper" style={{ marginTop: "-8px" }}>
              Uses dichotomy totals (E/I, S/N, T/F, J/P) from absolute function scores.
            </p>
            <div className="sakinorva-section-body">
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">E vs I</div>
                <div className="sakinorva-row-value calc-value">
                  {renderTypeBadge("E", "myers-e")}
                  <span className="calc-score">{formatScore(derived.sums.sumE)}</span>
                  <span className="calc-divider">vs</span>
                  {renderTypeBadge("I", "myers-i")}
                  <span className="calc-score">{formatScore(derived.sums.sumI)}</span>
                  <span className="calc-divider">→</span>
                  {renderTypeBadge(derived.myersLetters.myersEI, "myers-ei")}
                </div>
              </div>
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">S vs N</div>
                <div className="sakinorva-row-value calc-value">
                  {renderTypeBadge("S", "myers-s")}
                  <span className="calc-score">{formatScore(derived.sums.sumS)}</span>
                  <span className="calc-divider">vs</span>
                  {renderTypeBadge("N", "myers-n")}
                  <span className="calc-score">{formatScore(derived.sums.sumN)}</span>
                  <span className="calc-divider">→</span>
                  {renderTypeBadge(derived.myersLetters.myersSN, "myers-sn")}
                </div>
              </div>
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">T vs F</div>
                <div className="sakinorva-row-value calc-value">
                  {renderTypeBadge("T", "myers-t")}
                  <span className="calc-score">{formatScore(derived.sums.sumT)}</span>
                  <span className="calc-divider">vs</span>
                  {renderTypeBadge("F", "myers-f")}
                  <span className="calc-score">{formatScore(derived.sums.sumF)}</span>
                  <span className="calc-divider">→</span>
                  {renderTypeBadge(derived.myersLetters.myersTF, "myers-tf")}
                </div>
              </div>
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">J vs P (overall)</div>
                <div className="sakinorva-row-value calc-value">
                  {renderTypeBadge("J", "myers-j")}
                  <span className="calc-score">{formatScore(derived.sums.sumJudging)}</span>
                  <span className="calc-divider">vs</span>
                  {renderTypeBadge("P", "myers-p")}
                  <span className="calc-score">{formatScore(derived.sums.sumPerceiving)}</span>
                  <span className="calc-divider">→</span>
                  {renderTypeBadge(derived.myersLetters.myersJP, "myers-jp")}
                </div>
              </div>
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">Myers type</div>
                <div className="sakinorva-row-value">
                  <span className="type-badges">
                    {derived.myersType.split("").map((letter, index) =>
                      renderTypeBadge(letter, `myers-${letter}-${index}`)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
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
