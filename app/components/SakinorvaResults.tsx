"use client";

import { useMemo } from "react";
import StnfIndicator from "@/app/components/StnfIndicator";
import MbtiMapCanvas from "@/app/components/MbtiMapCanvas";

export const STNF_TOOLTIP =
  "The STNF indicator visualizes cognitive function expression in a more Jungian interpretive lens where we possess the ability to express both introverted and extroverted functions based on situational context.";

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

export default function SakinorvaResults({
  functionScores,
  mbtiMeta
}: {
  functionScores: Record<string, number> | null;
  mbtiMeta?: {
    grantType?: string | null;
    axisType?: string | null;
    myersType?: string | null;
  } | null;
}) {
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

  const mapMeta = useMemo(
    () =>
      mbtiMeta ??
      (derived
        ? {
            grantType: derived.grantType,
            axisType: derived.axisType,
            myersType: derived.myersType
          }
        : null),
    [mbtiMeta, derived]
  );

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
      {mapMeta ? (
        <div className="sakinorva-section">
          <div className="sakinorva-section-title">MBTI axis map</div>
          <div className="sakinorva-section-body">
            <p className="helper">
              Toggle layers to compare Grant, Axis, and Myers polygons. Hover a region to emphasize
              the label.
            </p>
            <MbtiMapCanvas
              grantType={mapMeta.grantType}
              axisType={mapMeta.axisType}
              myersType={mapMeta.myersType}
              functionScores={functionScores}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
