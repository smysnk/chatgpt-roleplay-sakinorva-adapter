import {
  getSmysnk2ScenarioById,
  SMYSNK2_ARCHETYPE_LABELS,
  SMYSNK2_ARCHETYPE_ORDER,
  type Smysnk2Archetype,
  type Smysnk2OptionKey
} from "@/lib/smysnk2Questions";

const FUNCTION_KEYS = ["Ni", "Ne", "Si", "Se", "Ti", "Te", "Fi", "Fe"] as const;

type FunctionKey = (typeof FUNCTION_KEYS)[number];

type GrantStyle = "IEIE" | "EIEI";

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

export type Smysnk2ArchetypeBreakdown = {
  archetype: Smysnk2Archetype;
  label: string;
  total: number;
  leadingFunction: FunctionKey | null;
  leadingCount: number;
  confidence: number;
  distribution: Record<FunctionKey, number>;
};

export type Smysnk2FunctionConfidence = {
  functionKey: FunctionKey;
  count: number;
  percentage: number;
  archetypeWins: number;
  confidence: number;
};

export type Smysnk2TypeMatch = {
  type: string;
  grantStyle: GrantStyle;
  confidence: number;
  stack: [FunctionKey, FunctionKey, FunctionKey, FunctionKey];
};

export type Smysnk2TypeMatchingSummary = {
  best: Smysnk2TypeMatch | null;
  alternatives: Smysnk2TypeMatch[];
  grantStyles: { style: GrantStyle; confidence: number }[];
};

export type Smysnk2Analysis = {
  totalResponses: number;
  archetypeBreakdown: Smysnk2ArchetypeBreakdown[];
  functionConfidence: Smysnk2FunctionConfidence[];
  typeMatching: Smysnk2TypeMatchingSummary;
};

export type Smysnk2ScoringResult = {
  functionScores: Record<FunctionKey, number>;
  analysis: Smysnk2Analysis;
};

const OPTION_KEY_SET = new Set<Smysnk2OptionKey>(["A", "B", "C", "D", "E", "F", "G", "H"]);

const EMPTY_FUNCTION_RECORD = () =>
  FUNCTION_KEYS.reduce(
    (acc, key) => {
      acc[key] = 0;
      return acc;
    },
    {} as Record<FunctionKey, number>
  );

const round2 = (value: number) => Math.round(value * 100) / 100;

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

const TYPE_STACKS: Record<string, [FunctionKey, FunctionKey, FunctionKey, FunctionKey]> = {
  INTJ: ["Ni", "Te", "Fi", "Se"],
  INFJ: ["Ni", "Fe", "Ti", "Se"],
  ISTJ: ["Si", "Te", "Fi", "Ne"],
  ISFJ: ["Si", "Fe", "Ti", "Ne"],
  INTP: ["Ti", "Ne", "Si", "Fe"],
  INFP: ["Fi", "Ne", "Si", "Te"],
  ISTP: ["Ti", "Se", "Ni", "Fe"],
  ISFP: ["Fi", "Se", "Ni", "Te"],
  ENTJ: ["Te", "Ni", "Se", "Fi"],
  ENFJ: ["Fe", "Ni", "Se", "Ti"],
  ESTJ: ["Te", "Si", "Ne", "Fi"],
  ESFJ: ["Fe", "Si", "Ne", "Ti"],
  ENTP: ["Ne", "Ti", "Fe", "Si"],
  ENFP: ["Ne", "Fi", "Te", "Si"],
  ESTP: ["Se", "Ti", "Fe", "Ni"],
  ESFP: ["Se", "Fi", "Te", "Ni"]
};

const getGrantStyle = (stack: [FunctionKey, FunctionKey, FunctionKey, FunctionKey]): GrantStyle =>
  stack[0].endsWith("i") ? "IEIE" : "EIEI";

const computeTypeMatches = ({
  bucketCounts,
  bucketTotals
}: {
  bucketCounts: Record<Smysnk2Archetype, Record<FunctionKey, number>>;
  bucketTotals: Record<Smysnk2Archetype, number>;
}): Smysnk2TypeMatchingSummary => {
  const weights = SMYSNK2_ARCHETYPE_ORDER.map((_, index) => (index < 4 ? 1.25 : 1));

  const matches: Smysnk2TypeMatch[] = Object.entries(TYPE_STACKS)
    .map(([type, stack]) => {
      const shadow: [FunctionKey, FunctionKey, FunctionKey, FunctionKey] = [
        flipAttitude(stack[0]),
        flipAttitude(stack[1]),
        flipAttitude(stack[2]),
        flipAttitude(stack[3])
      ];
      const expected: FunctionKey[] = [...stack, ...shadow];

      let score = 0;
      let maxScore = 0;

      SMYSNK2_ARCHETYPE_ORDER.forEach((archetype, index) => {
        const total = bucketTotals[archetype];
        const weight = weights[index] ?? 1;
        maxScore += weight;
        if (!total) {
          return;
        }
        const expectedFunction = expected[index];
        const hits = bucketCounts[archetype][expectedFunction] ?? 0;
        score += (hits / total) * weight;
      });

      return {
        type,
        grantStyle: getGrantStyle(stack),
        confidence: maxScore ? round2((score / maxScore) * 100) : 0,
        stack
      };
    })
    .sort((a, b) => b.confidence - a.confidence);

  const best = matches[0] ?? null;
  const alternatives = matches.slice(1, 4);

  const styleTotals = matches.reduce(
    (acc, match) => {
      acc[match.grantStyle] += match.confidence;
      return acc;
    },
    { IEIE: 0, EIEI: 0 }
  );
  const styleSum = styleTotals.IEIE + styleTotals.EIEI || 1;

  const grantStyles = (["IEIE", "EIEI"] as GrantStyle[])
    .map((style) => ({ style, confidence: round2((styleTotals[style] / styleSum) * 100) }))
    .sort((a, b) => b.confidence - a.confidence);

  return {
    best,
    alternatives,
    grantStyles
  };
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

export const scoreSmysnk2Responses = (responses: Smysnk2Response[]): Smysnk2ScoringResult => {
  const globalCounts = EMPTY_FUNCTION_RECORD();
  const bucketTotals = SMYSNK2_ARCHETYPE_ORDER.reduce(
    (acc, archetype) => {
      acc[archetype] = 0;
      return acc;
    },
    {} as Record<Smysnk2Archetype, number>
  );
  const bucketCounts = SMYSNK2_ARCHETYPE_ORDER.reduce(
    (acc, archetype) => {
      acc[archetype] = EMPTY_FUNCTION_RECORD();
      return acc;
    },
    {} as Record<Smysnk2Archetype, Record<FunctionKey, number>>
  );

  let counted = 0;

  responses.forEach((response) => {
    const question = getSmysnk2ScenarioById(response.questionId);
    if (!question) {
      return;
    }
    const key = functionKeyFromAnswer(response.questionId, response.answerKey);
    if (!key) {
      return;
    }

    counted += 1;
    globalCounts[key] += 1;
    bucketTotals[question.archetype] += 1;
    bucketCounts[question.archetype][key] += 1;
  });

  const archetypeBreakdown: Smysnk2ArchetypeBreakdown[] = SMYSNK2_ARCHETYPE_ORDER.map((archetype) => {
    const total = bucketTotals[archetype];
    const ranked = byScoreDesc(bucketCounts[archetype]);
    const leading = ranked[0] ?? null;
    const second = ranked[1] ?? null;
    const leadingCount = leading?.score ?? 0;
    const secondCount = second?.score ?? 0;
    const dominance = total ? leadingCount / total : 0;
    const separation = total ? Math.max(0, leadingCount - secondCount) / total : 0;
    const confidence = round2((dominance * 0.75 + separation * 0.25) * 100);

    const distribution = FUNCTION_KEYS.reduce(
      (acc, key) => {
        acc[key] = total ? round2((bucketCounts[archetype][key] / total) * 100) : 0;
        return acc;
      },
      {} as Record<FunctionKey, number>
    );

    return {
      archetype,
      label: SMYSNK2_ARCHETYPE_LABELS[archetype],
      total,
      leadingFunction: leading?.key ?? null,
      leadingCount,
      confidence,
      distribution
    };
  });

  const archetypeWins = FUNCTION_KEYS.reduce(
    (acc, key) => {
      acc[key] = archetypeBreakdown.reduce(
        (count, archetype) => count + (archetype.leadingFunction === key ? 1 : 0),
        0
      );
      return acc;
    },
    {} as Record<FunctionKey, number>
  );

  const functionConfidence: Smysnk2FunctionConfidence[] = FUNCTION_KEYS.map((key) => {
    const count = globalCounts[key];
    const percentage = counted ? round2((count / counted) * 100) : 0;
    const archetypeSupport = round2((archetypeWins[key] / SMYSNK2_ARCHETYPE_ORDER.length) * 100);
    const confidence = round2(percentage * 0.7 + archetypeSupport * 0.3);
    return {
      functionKey: key,
      count,
      percentage,
      archetypeWins: archetypeWins[key],
      confidence
    };
  }).sort((a, b) => b.confidence - a.confidence);

  const functionScores = FUNCTION_KEYS.reduce(
    (acc, key) => {
      acc[key] = counted ? round2((globalCounts[key] / counted) * 40) : 0;
      return acc;
    },
    {} as Record<FunctionKey, number>
  );

  const typeMatching = computeTypeMatches({ bucketCounts, bucketTotals });

  return {
    functionScores,
    analysis: {
      totalResponses: counted,
      archetypeBreakdown,
      functionConfidence,
      typeMatching
    }
  };
};

export const calculateSmysnk2Scores = (responses: Smysnk2Response[]) => scoreSmysnk2Responses(responses).functionScores;
