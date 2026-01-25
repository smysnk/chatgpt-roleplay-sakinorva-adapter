"use client";

type IndicatorType = "grant" | "axis" | "myers";
type LetterKey = "EI" | "SN" | "TF" | "JP";

type ScoreEntry = {
  key: string;
  score: number;
};

type TypeBadgeDetails = {
  entries: ScoreEntry[];
  dominant: ScoreEntry;
  auxiliary: ScoreEntry | null;
  dominantAttitude: "E" | "I";
  dominantCategory: "judging" | "perceiving";
  auxiliaryCategory: "judging" | "perceiving";
  grantType: string;
  axisType: string;
  myersType: string;
  axisLetters: { axisEI: string; axisSN: string; axisTF: string; axisJP: string };
  myersLetters: { myersEI: string; myersSN: string; myersTF: string; myersJP: string };
  sums: {
    sumE: number;
    sumI: number;
    sumN: number;
    sumS: number;
    sumT: number;
    sumF: number;
    sumJudging: number;
    sumPerceiving: number;
    sumEJudging: number;
    sumEPerceiving: number;
    sumIJudging: number;
    sumIPerceiving: number;
  };
};

const FUNCTION_ORDER = ["Te", "Ti", "Fe", "Fi", "Ne", "Ni", "Se", "Si"] as const;

const getAttitude = (fn: string) => (fn[1]?.toLowerCase() === "e" ? "E" : "I");
const getCategory = (fn: string) => (/[TF]/i.test(fn[0]) ? "judging" : "perceiving");
const getTF = (fn: string) => (/^T/i.test(fn) ? "T" : "F");
const getSN = (fn: string) => (/^N/i.test(fn) ? "N" : "S");

const formatScore = (value: number) => value.toFixed(2);

const pickLetter = (left: number, right: number, leftLetter: string, rightLetter: string) => {
  if (left === right) {
    return "?";
  }
  return left > right ? leftLetter : rightLetter;
};

const sumScores = (scores: Record<string, number>, keys: string[]) =>
  keys.reduce((acc, key) => acc + (scores[key] ?? 0), 0);

const getTypeBadgeDetails = (
  functionScores: Record<string, number> | null
): TypeBadgeDetails | null => {
  if (!functionScores) {
    return null;
  }
  const entries = FUNCTION_ORDER.map((key) => ({ key, score: functionScores[key] ?? 0 }));
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
  const auxiliary = auxiliaryCandidates[0] ?? sorted[1] ?? null;
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

  const sumE = sumScores(functionScores, ["Te", "Fe", "Ne", "Se"]);
  const sumI = sumScores(functionScores, ["Ti", "Fi", "Ni", "Si"]);
  const sumN = sumScores(functionScores, ["Ne", "Ni"]);
  const sumS = sumScores(functionScores, ["Se", "Si"]);
  const sumT = sumScores(functionScores, ["Te", "Ti"]);
  const sumF = sumScores(functionScores, ["Fe", "Fi"]);
  const sumJudging = sumScores(functionScores, ["Te", "Ti", "Fe", "Fi"]);
  const sumPerceiving = sumScores(functionScores, ["Ne", "Ni", "Se", "Si"]);
  const sumEJudging = sumScores(functionScores, ["Te", "Fe"]);
  const sumEPerceiving = sumScores(functionScores, ["Ne", "Se"]);
  const sumIJudging = sumScores(functionScores, ["Ti", "Fi"]);
  const sumIPerceiving = sumScores(functionScores, ["Ni", "Si"]);

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
    dominant,
    auxiliary,
    dominantAttitude,
    dominantCategory,
    auxiliaryCategory,
    grantType,
    axisType,
    myersType,
    axisLetters: { axisEI, axisSN, axisTF, axisJP },
    myersLetters: { myersEI, myersSN, myersTF, myersJP },
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
    }
  };
};

const getIndicatorLetters = (details: TypeBadgeDetails, indicator: IndicatorType) => {
  if (indicator === "grant") {
    return details.grantType.split("");
  }
  if (indicator === "axis") {
    return details.axisType.split("");
  }
  return details.myersType.split("");
};

const getAxisTooltip = (details: TypeBadgeDetails, letter: string) => {
  const { sums, axisLetters } = details;
  if (letter === "E") {
    return `E: Te + Fe + Ne + Se = ${formatScore(sums.sumE)}`;
  }
  if (letter === "I") {
    return `I: Ti + Fi + Ni + Si = ${formatScore(sums.sumI)}`;
  }
  if (letter === "N") {
    return `N: Ne + Ni = ${formatScore(sums.sumN)}`;
  }
  if (letter === "S") {
    return `S: Se + Si = ${formatScore(sums.sumS)}`;
  }
  if (letter === "T") {
    return `T: Te + Ti = ${formatScore(sums.sumT)}`;
  }
  if (letter === "F") {
    return `F: Fe + Fi = ${formatScore(sums.sumF)}`;
  }
  if (letter === "J") {
    if (axisLetters.axisEI === "E") {
      return `J (extraverted judging): Te + Fe = ${formatScore(sums.sumEJudging)}`;
    }
    if (axisLetters.axisEI === "I") {
      return `J (introverted judging): Ti + Fi = ${formatScore(sums.sumIJudging)}`;
    }
    return "E/I tie: J/P undefined.";
  }
  if (letter === "P") {
    if (axisLetters.axisEI === "E") {
      return `P (extraverted perceiving): Ne + Se = ${formatScore(sums.sumEPerceiving)}`;
    }
    if (axisLetters.axisEI === "I") {
      return `P (introverted perceiving): Ni + Si = ${formatScore(sums.sumIPerceiving)}`;
    }
    return "E/I tie: J/P undefined.";
  }
  return "Tie between letters.";
};

const getMyersTooltip = (details: TypeBadgeDetails, letter: string) => {
  const { sums } = details;
  if (letter === "E") {
    return `E: Te + Fe + Ne + Se = ${formatScore(sums.sumE)}`;
  }
  if (letter === "I") {
    return `I: Ti + Fi + Ni + Si = ${formatScore(sums.sumI)}`;
  }
  if (letter === "N") {
    return `N: Ne + Ni = ${formatScore(sums.sumN)}`;
  }
  if (letter === "S") {
    return `S: Se + Si = ${formatScore(sums.sumS)}`;
  }
  if (letter === "T") {
    return `T: Te + Ti = ${formatScore(sums.sumT)}`;
  }
  if (letter === "F") {
    return `F: Fe + Fi = ${formatScore(sums.sumF)}`;
  }
  if (letter === "J") {
    return `J: Te + Ti + Fe + Fi = ${formatScore(sums.sumJudging)}`;
  }
  if (letter === "P") {
    return `P: Ne + Ni + Se + Si = ${formatScore(sums.sumPerceiving)}`;
  }
  return "Tie between letters.";
};

const getGrantTooltip = (details: TypeBadgeDetails, letter: string, letterKey: LetterKey) => {
  const { dominant, auxiliary, dominantAttitude, dominantCategory, auxiliaryCategory } = details;
  if (letterKey === "EI") {
    const attitudeLabel = dominantAttitude === "E" ? "extroverted" : "introverted";
    return `Dominant ${dominant.key} (${formatScore(
      dominant.score
    )}) is ${attitudeLabel} → ${dominantAttitude}.`;
  }
  if (letterKey === "SN") {
    const source =
      dominantCategory === "perceiving" ? dominant : auxiliary ?? dominant;
    const sourceLabel = dominantCategory === "perceiving" ? "dominant" : "auxiliary";
    return `${sourceLabel} ${source.key} (${formatScore(
      source.score
    )}) is ${getSN(source.key)} → ${letter}.`;
  }
  if (letterKey === "TF") {
    const source =
      dominantCategory === "judging" ? dominant : auxiliary ?? dominant;
    const sourceLabel = dominantCategory === "judging" ? "dominant" : "auxiliary";
    return `${sourceLabel} ${source.key} (${formatScore(
      source.score
    )}) is ${getTF(source.key)} → ${letter}.`;
  }
  const categorySource = dominantAttitude === "E" ? dominantCategory : auxiliaryCategory;
  const categoryLabel = dominantAttitude === "E" ? "dominant" : "auxiliary";
  const jpLetter = categorySource === "judging" ? "J" : "P";
  return `${categoryLabel} function category is ${categorySource} → ${jpLetter}.`;
};

const getLetterTooltip = (
  details: TypeBadgeDetails,
  indicator: IndicatorType,
  letter: string,
  letterKey: LetterKey
) => {
  if (letter === "?") {
    return "Tie between letters.";
  }
  if (indicator === "grant") {
    return getGrantTooltip(details, letter, letterKey);
  }
  if (indicator === "axis") {
    return getAxisTooltip(details, letter);
  }
  return getMyersTooltip(details, letter);
};

export function TypeBadgeLetter({
  indicator,
  letter,
  letterKey,
  functionScores,
  details,
  className
}: {
  indicator: IndicatorType;
  letter: string;
  letterKey: LetterKey;
  functionScores?: Record<string, number> | null;
  details?: TypeBadgeDetails | null;
  className?: string;
}) {
  const resolvedDetails = details ?? getTypeBadgeDetails(functionScores ?? null);
  const tooltip = resolvedDetails ? getLetterTooltip(resolvedDetails, indicator, letter, letterKey) : "";
  return (
    <span
      className={`type-letter ${letter === "?" ? "unknown" : letter.toLowerCase()} ${className ?? ""}`.trim()}
      title={tooltip}
    >
      {letter}
    </span>
  );
}

export default function TypeBadges({
  indicator,
  functionScores,
  className
}: {
  indicator: IndicatorType;
  functionScores: Record<string, number> | null;
  className?: string;
}) {
  const details = getTypeBadgeDetails(functionScores);
  if (!details) {
    return <span className="helper">—</span>;
  }
  const letters = getIndicatorLetters(details, indicator);
  const letterKeys: LetterKey[] = ["EI", "SN", "TF", "JP"];
  return (
    <span className={`type-badges ${className ?? ""}`.trim()}>
      {letters.map((letter, index) => (
        <TypeBadgeLetter
          key={`${indicator}-${letter}-${index}`}
          indicator={indicator}
          letter={letter}
          letterKey={letterKeys[index] ?? "EI"}
          details={details}
        />
      ))}
    </span>
  );
}

export type { IndicatorType, LetterKey, TypeBadgeDetails };
export { getTypeBadgeDetails };
