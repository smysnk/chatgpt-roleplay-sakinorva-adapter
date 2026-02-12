import {
  getSmysnk2ScenarioById,
  type Smysnk2OptionKey
} from "@/lib/smysnk2Questions";

const FUNCTION_KEYS = ["Ni", "Ne", "Si", "Se", "Ti", "Te", "Fi", "Fe"] as const;

type FunctionKey = (typeof FUNCTION_KEYS)[number];

export type Smysnk2Response = {
  questionId: string;
  answerKey: Smysnk2OptionKey;
};

export type Smysnk2StackSummary = {
  ordered: FunctionKey[];
  dominant: FunctionKey;
  auxiliary: FunctionKey;
  tertiary: FunctionKey;
  inferior: FunctionKey;
  shadow: [FunctionKey, FunctionKey, FunctionKey, FunctionKey];
};

const OPTION_KEY_SET = new Set<Smysnk2OptionKey>(["A", "B", "C", "D", "E", "F", "G", "H"]);

const functionKeyFromAnswer = (questionId: string, answerKey: Smysnk2OptionKey) => {
  const question = getSmysnk2ScenarioById(questionId);
  const option = question?.options.find((item) => item.key === answerKey);
  if (!option) {
    return null;
  }
  return `${option.score.function}${option.score.orientation === "introverted" ? "i" : "e"}` as FunctionKey;
};

const byScoreDesc = (scores: Record<FunctionKey, number>) =>
  [...FUNCTION_KEYS]
    .map((key) => ({ key, score: scores[key] ?? 0 }))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));

const getAttitude = (key: FunctionKey) => key[1];

const getCategory = (key: FunctionKey) => (key.startsWith("N") || key.startsWith("S") ? "perceiving" : "judging");

const flipAttitude = (key: FunctionKey): FunctionKey =>
  `${key[0]}${key[1] === "i" ? "e" : "i"}` as FunctionKey;

const pickDistinct = (
  candidates: FunctionKey[],
  used: Set<FunctionKey>,
  fallback: FunctionKey
) => {
  const picked = candidates.find((candidate) => !used.has(candidate));
  if (picked) {
    used.add(picked);
    return picked;
  }
  used.add(fallback);
  return fallback;
};

export const deriveSmysnk2Stack = (scores: Record<string, number>): Smysnk2StackSummary => {
  const normalizedScores = FUNCTION_KEYS.reduce(
    (acc, key) => {
      acc[key] = scores[key] ?? 0;
      return acc;
    },
    {} as Record<FunctionKey, number>
  );

  const ranked = byScoreDesc(normalizedScores).map((entry) => entry.key);
  const dominant = ranked[0] ?? "Ni";
  const dominantAttitude = getAttitude(dominant);
  const dominantCategory = getCategory(dominant);

  const auxiliaryCandidates = ranked.filter(
    (key) => getAttitude(key) !== dominantAttitude && getCategory(key) !== dominantCategory
  );

  const tertiaryCandidates = ranked.filter(
    (key) => getAttitude(key) === dominantAttitude && getCategory(key) !== dominantCategory
  );

  const inferior = flipAttitude(dominant);

  const used = new Set<FunctionKey>([dominant]);
  const auxiliary = pickDistinct(auxiliaryCandidates, used, ranked[1] ?? inferior);
  const tertiary = pickDistinct(tertiaryCandidates, used, ranked[2] ?? flipAttitude(auxiliary));

  const egoStack: [FunctionKey, FunctionKey, FunctionKey, FunctionKey] = [
    dominant,
    auxiliary,
    tertiary,
    inferior
  ];

  const shadow: [FunctionKey, FunctionKey, FunctionKey, FunctionKey] = [
    flipAttitude(egoStack[0]),
    flipAttitude(egoStack[1]),
    flipAttitude(egoStack[2]),
    flipAttitude(egoStack[3])
  ];

  return {
    ordered: ranked,
    dominant,
    auxiliary,
    tertiary,
    inferior,
    shadow
  };
};

export const isSmysnk2OptionKey = (value: unknown): value is Smysnk2OptionKey =>
  typeof value === "string" && OPTION_KEY_SET.has(value.toUpperCase() as Smysnk2OptionKey);

export const normalizeSmysnk2OptionKey = (value: unknown): Smysnk2OptionKey | null => {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 8) {
    return (["A", "B", "C", "D", "E", "F", "G", "H"][value - 1] ?? null) as Smysnk2OptionKey | null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const upper = value.trim().toUpperCase();
  return isSmysnk2OptionKey(upper) ? upper : null;
};

export const calculateSmysnk2Scores = (responses: Smysnk2Response[]) => {
  const totals = FUNCTION_KEYS.reduce(
    (acc, key) => {
      acc[key] = 0;
      return acc;
    },
    {} as Record<FunctionKey, number>
  );

  let counted = 0;
  responses.forEach((response) => {
    const key = functionKeyFromAnswer(response.questionId, response.answerKey);
    if (!key) {
      return;
    }
    counted += 1;
    totals[key] += 1;
  });

  if (!counted) {
    return totals as Record<string, number>;
  }

  return FUNCTION_KEYS.reduce(
    (acc, key) => {
      // Normalize to 0-40 for compatibility with existing result views.
      acc[key] = Math.round((totals[key] / counted) * 40 * 100) / 100;
      return acc;
    },
    {} as Record<string, number>
  );
};
