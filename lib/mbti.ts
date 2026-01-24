type DerivedTypes = {
  grantType: string;
  axisType: string;
  myersType: string;
};

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

const getAttitude = (fn: string) => (fn[1]?.toLowerCase() === "e" ? "E" : "I");
const getCategory = (fn: string) => (/[TF]/i.test(fn[0]) ? "judging" : "perceiving");
const getTF = (fn: string) => (/^T/i.test(fn) ? "T" : "F");
const getSN = (fn: string) => (/^N/i.test(fn) ? "N" : "S");

const pickLetter = (left: number, right: number, leftLetter: string, rightLetter: string) => {
  if (left === right) {
    return "?";
  }
  return left > right ? leftLetter : rightLetter;
};

export const deriveTypesFromScores = (
  functionScores: Record<string, number> | null
): DerivedTypes | null => {
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
      (entry) => getAttitude(entry.key) !== dominantAttitude && getCategory(entry.key) !== dominantCategory
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

  const hasUnknown = grantType.includes("?") || axisType.includes("?") || myersType.includes("?");
  if (hasUnknown) {
    return {
      grantType,
      axisType,
      myersType
    };
  }

  return {
    grantType,
    axisType,
    myersType
  };
};
