"use client";

import { useMemo, useState, type ReactNode } from "react";
import GlossaryTerm from "@/app/components/GlossaryTerm";
import GlossaryText from "@/app/components/GlossaryText";
import HelpIconButton from "@/app/components/HelpIconButton";
import HelpModal from "@/app/components/HelpModal";
import StnfIndicator from "@/app/components/StnfIndicator";
import MbtiMapCanvas from "@/app/components/MbtiMapCanvas";
import TypeBadges, { TypeBadgeLetter } from "@/app/components/TypeBadges";
import type { HelpTopicId } from "@/lib/terminologyGlossary";

export const STNF_TOOLTIP =
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
const TYPE_CODE_TEST = /\b[EI][NS][TF][JP]\b/;
const TYPE_CODE_WITH_UNKNOWN = /\b[EI\?][NS\?][TF\?][JP\?]\b/i;
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
  functionScores,
  mbtiMeta
}: {
  htmlFragment: string;
  functionScores: Record<string, number> | null;
  mbtiMeta?: {
    grantType?: string | null;
    axisType?: string | null;
    myersType?: string | null;
  } | null;
}) {
  const sections = useMemo(() => parseResultsFragment(htmlFragment), [htmlFragment]);
  const [activeHelpTopic, setActiveHelpTopic] = useState<HelpTopicId | null>(null);
  const renderValueWithBadges = (value: string) => {
    const matches = Array.from(value.matchAll(TYPE_CODE_PATTERN));
    const functionMatches = Array.from(value.matchAll(/\b(Te|Ti|Fe|Fi|Ne|Ni|Se|Si)\b/gi));
    const fallbackMatches = Array.from(value.matchAll(/[EISNTFJP\?]/gi));
    const activeMatches =
      matches.length > 0 ? matches : functionMatches.length > 0 ? functionMatches : fallbackMatches;
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
      const token = match[0];
      if (/^(Te|Ti|Fe|Fi|Ne|Ni|Se|Si)$/i.test(token)) {
        fragments.push(
          <GlossaryTerm key={`${token}-${index}`} term={token}>
            {token}
          </GlossaryTerm>
        );
      } else {
        const letters = token.split("");
        fragments.push(
          <span className="type-badges" key={`${token}-${index}`}>
            {letters.map((letter, letterIndex) => (
              <span
                key={`${token}-${letter}-${letterIndex}`}
                className={`type-letter ${letter.toLowerCase()}`}
              >
                {letter.toUpperCase()}
              </span>
            ))}
          </span>
        );
      }
      lastIndex = match.index + match[0].length;
      if (index === activeMatches.length - 1 && lastIndex < value.length) {
        fragments.push(value.slice(lastIndex));
      }
    });

    return fragments;
  };

  const shouldRenderBadges = (value: string) =>
    /\b(Te|Ti|Fe|Fi|Ne|Ni|Se|Si)\b/i.test(value) ||
    TYPE_CODE_WITH_UNKNOWN.test(value) ||
    TYPE_CODE_TEST.test(value);

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

  const hasMbtiPanel = Boolean(mbtiMeta);
  const isRelativeSection = (title: string) => title.toLowerCase().includes("relative");

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
            <div className="sakinorva-section-heading">
              <div className="sakinorva-section-title">Grant (Absolute)</div>
              <HelpIconButton
                label="How Grant scoring works"
                onClick={() => setActiveHelpTopic("grant_card")}
              />
            </div>
            <p className="helper result-card-subtext">
              Uses the highest absolute function scores to assemble the Grant stack (dominant → inferior)
              and derive the MBTI letters.
            </p>
            <div className="sakinorva-section-body">
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">Top scores</div>
                <div className="sakinorva-row-value calc-value">
                  {derived.sorted.slice(0, 4).map((entry) => (
                    <span key={entry.key} className="function-badge">
                      <GlossaryTerm term={entry.key}>{entry.key}</GlossaryTerm> {formatScore(entry.score)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">Dominant</div>
                <div className="sakinorva-row-value calc-value">
                  <span className="function-badge">
                    <GlossaryTerm term={derived.dominant.key}>{derived.dominant.key}</GlossaryTerm>{" "}
                    {formatScore(derived.dominant.score)}
                  </span>
                </div>
              </div>
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">Auxiliary (opposite attitude + category)</div>
                <div className="sakinorva-row-value calc-value">
                  {derived.auxiliary ? (
                    <span className="function-badge">
                      <GlossaryTerm term={derived.auxiliary.key}>{derived.auxiliary.key}</GlossaryTerm>{" "}
                      {formatScore(derived.auxiliary.score)}
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
                      <GlossaryTerm term={fn}>{fn}</GlossaryTerm>
                    </span>
                  ))}
                </div>
              </div>
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">Grant type</div>
                <div className="sakinorva-row-value">
                  <TypeBadges indicator="grant" functionScores={functionScores} />
                </div>
              </div>
            </div>
          </div>
          <div className="sakinorva-section">
            <div className="sakinorva-section-heading">
              <div className="sakinorva-section-title">Axis-Based (Absolute)</div>
              <HelpIconButton
                label="How Axis scoring works"
                onClick={() => setActiveHelpTopic("axis_card")}
              />
            </div>
            <p className="helper result-card-subtext">
              Compares extroverted vs. introverted totals for each axis, and sets J/P from the dominant
              attitude.
            </p>
            <div className="sakinorva-section-body">
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">E vs I</div>
                <div className="sakinorva-row-value calc-value">
                  <TypeBadgeLetter
                    indicator="axis"
                    letter="E"
                    letterKey="EI"
                    functionScores={functionScores}
                  />
                  <span className="calc-score">{formatScore(derived.sums.sumE)}</span>
                  <span className="calc-divider">vs</span>
                  <TypeBadgeLetter
                    indicator="axis"
                    letter="I"
                    letterKey="EI"
                    functionScores={functionScores}
                  />
                  <span className="calc-score">{formatScore(derived.sums.sumI)}</span>
                  <span className="calc-divider">→</span>
                  <TypeBadgeLetter
                    indicator="axis"
                    letter={derived.axisLetters.axisEI}
                    letterKey="EI"
                    functionScores={functionScores}
                  />
                </div>
              </div>
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">N vs S</div>
                <div className="sakinorva-row-value calc-value">
                  <TypeBadgeLetter
                    indicator="axis"
                    letter="N"
                    letterKey="SN"
                    functionScores={functionScores}
                  />
                  <span className="calc-score">{formatScore(derived.sums.sumN)}</span>
                  <span className="calc-divider">vs</span>
                  <TypeBadgeLetter
                    indicator="axis"
                    letter="S"
                    letterKey="SN"
                    functionScores={functionScores}
                  />
                  <span className="calc-score">{formatScore(derived.sums.sumS)}</span>
                  <span className="calc-divider">→</span>
                  <TypeBadgeLetter
                    indicator="axis"
                    letter={derived.axisLetters.axisSN}
                    letterKey="SN"
                    functionScores={functionScores}
                  />
                </div>
              </div>
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">T vs F</div>
                <div className="sakinorva-row-value calc-value">
                  <TypeBadgeLetter
                    indicator="axis"
                    letter="T"
                    letterKey="TF"
                    functionScores={functionScores}
                  />
                  <span className="calc-score">{formatScore(derived.sums.sumT)}</span>
                  <span className="calc-divider">vs</span>
                  <TypeBadgeLetter
                    indicator="axis"
                    letter="F"
                    letterKey="TF"
                    functionScores={functionScores}
                  />
                  <span className="calc-score">{formatScore(derived.sums.sumF)}</span>
                  <span className="calc-divider">→</span>
                  <TypeBadgeLetter
                    indicator="axis"
                    letter={derived.axisLetters.axisTF}
                    letterKey="TF"
                    functionScores={functionScores}
                  />
                </div>
              </div>
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">J vs P (by attitude)</div>
                <div className="sakinorva-row-value calc-value">
                  {derived.axisLetters.axisEI === "E" ? (
                    <>
                      <TypeBadgeLetter
                        indicator="axis"
                        letter="J"
                        letterKey="JP"
                        functionScores={functionScores}
                      />
                      <span className="calc-score">{formatScore(derived.sums.sumEJudging)}</span>
                      <span className="calc-divider">vs</span>
                      <TypeBadgeLetter
                        indicator="axis"
                        letter="P"
                        letterKey="JP"
                        functionScores={functionScores}
                      />
                      <span className="calc-score">{formatScore(derived.sums.sumEPerceiving)}</span>
                    </>
                  ) : derived.axisLetters.axisEI === "I" ? (
                    <>
                      <TypeBadgeLetter
                        indicator="axis"
                        letter="J"
                        letterKey="JP"
                        functionScores={functionScores}
                      />
                      <span className="calc-score">{formatScore(derived.sums.sumIJudging)}</span>
                      <span className="calc-divider">vs</span>
                      <TypeBadgeLetter
                        indicator="axis"
                        letter="P"
                        letterKey="JP"
                        functionScores={functionScores}
                      />
                      <span className="calc-score">{formatScore(derived.sums.sumIPerceiving)}</span>
                    </>
                  ) : (
                    <span className="helper">E/I tie; J/P undefined.</span>
                  )}
                  <span className="calc-divider">→</span>
                  <TypeBadgeLetter
                    indicator="axis"
                    letter={derived.axisLetters.axisJP}
                    letterKey="JP"
                    functionScores={functionScores}
                  />
                </div>
              </div>
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">Axis-based type</div>
                <div className="sakinorva-row-value">
                  <TypeBadges indicator="axis" functionScores={functionScores} />
                </div>
              </div>
            </div>
          </div>
          <div className="sakinorva-section">
            <div className="sakinorva-section-heading">
              <div className="sakinorva-section-title">Myers (Absolute)</div>
              <HelpIconButton
                label="How Myers scoring works"
                onClick={() => setActiveHelpTopic("myers_card")}
              />
            </div>
            <p className="helper result-card-subtext">
              Uses dichotomy totals (E/I, S/N, T/F, J/P) from absolute function scores.
            </p>
            <div className="sakinorva-section-body">
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">E vs I</div>
                <div className="sakinorva-row-value calc-value">
                  <TypeBadgeLetter
                    indicator="myers"
                    letter="E"
                    letterKey="EI"
                    functionScores={functionScores}
                  />
                  <span className="calc-score">{formatScore(derived.sums.sumE)}</span>
                  <span className="calc-divider">vs</span>
                  <TypeBadgeLetter
                    indicator="myers"
                    letter="I"
                    letterKey="EI"
                    functionScores={functionScores}
                  />
                  <span className="calc-score">{formatScore(derived.sums.sumI)}</span>
                  <span className="calc-divider">→</span>
                  <TypeBadgeLetter
                    indicator="myers"
                    letter={derived.myersLetters.myersEI}
                    letterKey="EI"
                    functionScores={functionScores}
                  />
                </div>
              </div>
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">S vs N</div>
                <div className="sakinorva-row-value calc-value">
                  <TypeBadgeLetter
                    indicator="myers"
                    letter="S"
                    letterKey="SN"
                    functionScores={functionScores}
                  />
                  <span className="calc-score">{formatScore(derived.sums.sumS)}</span>
                  <span className="calc-divider">vs</span>
                  <TypeBadgeLetter
                    indicator="myers"
                    letter="N"
                    letterKey="SN"
                    functionScores={functionScores}
                  />
                  <span className="calc-score">{formatScore(derived.sums.sumN)}</span>
                  <span className="calc-divider">→</span>
                  <TypeBadgeLetter
                    indicator="myers"
                    letter={derived.myersLetters.myersSN}
                    letterKey="SN"
                    functionScores={functionScores}
                  />
                </div>
              </div>
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">T vs F</div>
                <div className="sakinorva-row-value calc-value">
                  <TypeBadgeLetter
                    indicator="myers"
                    letter="T"
                    letterKey="TF"
                    functionScores={functionScores}
                  />
                  <span className="calc-score">{formatScore(derived.sums.sumT)}</span>
                  <span className="calc-divider">vs</span>
                  <TypeBadgeLetter
                    indicator="myers"
                    letter="F"
                    letterKey="TF"
                    functionScores={functionScores}
                  />
                  <span className="calc-score">{formatScore(derived.sums.sumF)}</span>
                  <span className="calc-divider">→</span>
                  <TypeBadgeLetter
                    indicator="myers"
                    letter={derived.myersLetters.myersTF}
                    letterKey="TF"
                    functionScores={functionScores}
                  />
                </div>
              </div>
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">J vs P (overall)</div>
                <div className="sakinorva-row-value calc-value">
                  <TypeBadgeLetter
                    indicator="myers"
                    letter="J"
                    letterKey="JP"
                    functionScores={functionScores}
                  />
                  <span className="calc-score">{formatScore(derived.sums.sumJudging)}</span>
                  <span className="calc-divider">vs</span>
                  <TypeBadgeLetter
                    indicator="myers"
                    letter="P"
                    letterKey="JP"
                    functionScores={functionScores}
                  />
                  <span className="calc-score">{formatScore(derived.sums.sumPerceiving)}</span>
                  <span className="calc-divider">→</span>
                  <TypeBadgeLetter
                    indicator="myers"
                    letter={derived.myersLetters.myersJP}
                    letterKey="JP"
                    functionScores={functionScores}
                  />
                </div>
              </div>
              <div className="sakinorva-row">
                <div className="sakinorva-row-label">Myers type</div>
                <div className="sakinorva-row-value">
                  <TypeBadges indicator="myers" functionScores={functionScores} />
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
      {sections.map((section, sectionIndex) => (
        <div key={`${section.title}-${sectionIndex}`}>
          <div className="sakinorva-section">
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
                    ) : shouldRenderBadges(row.value) ? (
                      renderValueWithBadges(row.value)
                    ) : (
                      <GlossaryText text={row.value} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {hasMbtiPanel && isRelativeSection(section.title) ? (
            <div className="sakinorva-section">
              <div className="sakinorva-section-heading">
                <div className="sakinorva-section-title">MBTI Axis Map</div>
                <HelpIconButton
                  label="How MBTI Axis Map scoring works"
                  onClick={() => setActiveHelpTopic("mbti_axis_map")}
                />
              </div>
              <div className="sakinorva-section-body">
                <p className="helper result-card-subtext">
                  Toggle layers to compare Grant, Axis, and Myers polygons. Hover a region to
                  emphasize the label.
                </p>
                <MbtiMapCanvas
                  grantType={mbtiMeta?.grantType}
                  axisType={mbtiMeta?.axisType}
                  myersType={mbtiMeta?.myersType}
                  functionScores={functionScores}
                />
              </div>
            </div>
          ) : null}
        </div>
      ))}
      <HelpModal topicId={activeHelpTopic} onClose={() => setActiveHelpTopic(null)} />
    </div>
  );
}
