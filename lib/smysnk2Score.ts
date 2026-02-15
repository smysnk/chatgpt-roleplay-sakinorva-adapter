import {
  getSmysnk2ScenarioById,
  SMYSNK2_ARCHETYPE_LABELS,
  SMYSNK2_ARCHETYPE_ORDER,
  SMYSNK2_CONTEXT_POLARITY_BY_CONTEXT,
  SMYSNK2_SITUATION_CONTEXT_LABELS,
  SMYSNK2_SITUATION_CONTEXT_ORDER,
  type Smysnk2Archetype,
  type Smysnk2ContextPolarity,
  type Smysnk2OptionKey,
  type Smysnk2SituationContext
} from "@/lib/smysnk2Questions";

const FUNCTION_KEYS = ["Ni", "Ne", "Si", "Se", "Ti", "Te", "Fi", "Fe"] as const;

type FunctionKey = (typeof FUNCTION_KEYS)[number];
type GrantStyle = "IEIE" | "EIEI";
export type Smysnk2TypeMatchScoringMode = "archetype_presence" | "weighted_archetype_hits";

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
  archetypeHitCount: number;
  archetypeOpportunityCount: number;
  slotHitVolume: number;
};

export type Smysnk2TypeMatchingSummary = {
  best: Smysnk2TypeMatch | null;
  alternatives: Smysnk2TypeMatch[];
  grantStyles: { style: GrantStyle; confidence: number }[];
};

export type Smysnk2ContextTypeAnalysis = {
  context: Smysnk2SituationContext;
  label: string;
  polarity: Smysnk2ContextPolarity;
  totalResponses: number;
  archetypeBreakdown: Smysnk2ArchetypeBreakdown[];
  typeMatching: Smysnk2TypeMatchingSummary;
  dominantGrantStyle: GrantStyle | null;
  dominantGrantStyleConfidence: number;
};

export type Smysnk2PolarityAnalysis = {
  polarity: Smysnk2ContextPolarity;
  label: string;
  totalResponses: number;
  archetypeBreakdown: Smysnk2ArchetypeBreakdown[];
  typeMatching: Smysnk2TypeMatchingSummary;
  dominantGrantStyle: GrantStyle | null;
  dominantGrantStyleConfidence: number;
};

export type Smysnk2AssertiveModeAnalysis = {
  overallGrantStyle: {
    style: GrantStyle | null;
    confidence: number;
  };
  totalResponses: number;
  archetypeBreakdown: Smysnk2ArchetypeBreakdown[];
  typeMatching: Smysnk2TypeMatchingSummary;
  dominantGrantStyle: GrantStyle | null;
  dominantGrantStyleConfidence: number;
};

export type Smysnk2TurbulentModeAnalysis = {
  contexts: Smysnk2ContextTypeAnalysis[];
};

export type Smysnk2TemperamentConfidence = {
  assertive: number;
  turbulent: number;
  leaning: "Assertive" | "Turbulent";
  personaShadowDelta: number;
  contextVariance: number;
  rationale: string;
};

export type Smysnk2Summary = {
  bestType: string | null;
  alternatives: string[];
  grantStyle: GrantStyle | null;
  grantStyleConfidence: number;
  assertive: number;
  turbulent: number;
  leaning: "Assertive" | "Turbulent";
};

export type Smysnk2Analysis = {
  totalResponses: number;
  archetypeBreakdown: Smysnk2ArchetypeBreakdown[];
  functionConfidence: Smysnk2FunctionConfidence[];
  typeMatching: Smysnk2TypeMatchingSummary;
  assertiveMode: Smysnk2AssertiveModeAnalysis;
  turbulentMode: Smysnk2TurbulentModeAnalysis;
  temperamentConfidence: Smysnk2TemperamentConfidence;
  summary: Smysnk2Summary;
};

export type Smysnk2ScoringResult = {
  functionScores: Record<FunctionKey, number>;
  analysis: Smysnk2Analysis;
};

export type Smysnk2ScoreOptions = {
  typeMatchScoringMode?: Smysnk2TypeMatchScoringMode;
};

type EvaluatedResponse = {
  questionId: string;
  functionKey: FunctionKey;
  archetype: Smysnk2Archetype;
  context: Smysnk2SituationContext;
  polarity: Smysnk2ContextPolarity;
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

const EMPTY_ARCHETYPE_TOTALS = () =>
  SMYSNK2_ARCHETYPE_ORDER.reduce(
    (acc, archetype) => {
      acc[archetype] = 0;
      return acc;
    },
    {} as Record<Smysnk2Archetype, number>
  );

const EMPTY_ARCHETYPE_COUNTS = () =>
  SMYSNK2_ARCHETYPE_ORDER.reduce(
    (acc, archetype) => {
      acc[archetype] = EMPTY_FUNCTION_RECORD();
      return acc;
    },
    {} as Record<Smysnk2Archetype, Record<FunctionKey, number>>
  );

const round2 = (value: number) => Math.round(value * 100) / 100;

const byScoreDesc = (scores: Record<FunctionKey, number>) =>
  [...FUNCTION_KEYS]
    .map((key) => ({ key, score: scores[key] ?? 0 }))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));

const getAttitude = (key: FunctionKey) => key[1];

const getCategory = (key: FunctionKey) => (key.startsWith("N") || key.startsWith("S") ? "perceiving" : "judging");

const flipAttitude = (key: FunctionKey): FunctionKey =>
  `${key[0]}${key[1] === "i" ? "e" : "i"}` as FunctionKey;

const pickDistinct = (candidates: FunctionKey[], used: Set<FunctionKey>, fallback: FunctionKey) => {
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

const scoreArchetypeSlot = ({
  slotHits,
  slotTotal,
  mode
}: {
  slotHits: number;
  slotTotal: number;
  mode: Smysnk2TypeMatchScoringMode;
}) => {
  if (mode === "weighted_archetype_hits") {
    return {
      score: slotHits > 0 ? 20 + Math.max(0, slotHits - 1) * 10 : 0,
      maxScore: slotTotal > 0 ? 20 + Math.max(0, slotTotal - 1) * 10 : 0
    };
  }
  return {
    score: slotHits > 0 ? 1 : 0,
    maxScore: slotTotal > 0 ? 1 : 0
  };
};

const computeTypeMatches = ({
  bucketCounts,
  bucketTotals,
  scoringMode
}: {
  bucketCounts: Record<Smysnk2Archetype, Record<FunctionKey, number>>;
  bucketTotals: Record<Smysnk2Archetype, number>;
  scoringMode: Smysnk2TypeMatchScoringMode;
}): Smysnk2TypeMatchingSummary => {
  const activeArchetypes = SMYSNK2_ARCHETYPE_ORDER.filter((archetype) => bucketTotals[archetype] > 0);
  const activeArchetypeCount = activeArchetypes.length;
  const archetypeIndex = new Map(
    SMYSNK2_ARCHETYPE_ORDER.map((archetype, index) => [archetype, index])
  );
  if (!activeArchetypeCount) {
    return {
      best: null,
      alternatives: [],
      grantStyles: [
        { style: "IEIE", confidence: 0 },
        { style: "EIEI", confidence: 0 }
      ]
    };
  }

  const ranked = Object.entries(TYPE_STACKS)
    .map(([type, stack]) => {
      const shadow: [FunctionKey, FunctionKey, FunctionKey, FunctionKey] = [
        flipAttitude(stack[0]),
        flipAttitude(stack[1]),
        flipAttitude(stack[2]),
        flipAttitude(stack[3])
      ];
      const expected: FunctionKey[] = [...stack, ...shadow];

      let archetypeHitCount = 0;
      let slotHitVolume = 0;
      let weightedScore = 0;
      let weightedOpportunity = 0;

      activeArchetypes.forEach((archetype) => {
        const index = archetypeIndex.get(archetype) ?? -1;
        if (index < 0) {
          return;
        }
        const expectedFunction = expected[index];
        const slotHits = bucketCounts[archetype][expectedFunction] ?? 0;
        const slotTotal = bucketTotals[archetype] ?? 0;
        const slotScore = scoreArchetypeSlot({
          slotHits,
          slotTotal,
          mode: scoringMode
        });

        if (slotHits > 0) {
          archetypeHitCount += 1;
          slotHitVolume += slotHits;
        }
        weightedScore += slotScore.score;
        weightedOpportunity += slotScore.maxScore;
      });

      const match: Smysnk2TypeMatch = {
        type,
        grantStyle: getGrantStyle(stack),
        confidence: round2(
          weightedOpportunity > 0 ? (weightedScore / weightedOpportunity) * 100 : 0
        ),
        stack,
        archetypeHitCount,
        archetypeOpportunityCount: activeArchetypeCount,
        slotHitVolume
      };

      return {
        match,
        weightedScore,
        archetypeHitCount,
        slotHitVolume
      };
    })
    .sort(
      (a, b) =>
        b.weightedScore - a.weightedScore ||
        b.archetypeHitCount - a.archetypeHitCount ||
        b.slotHitVolume - a.slotHitVolume ||
        a.match.type.localeCompare(b.match.type)
    );

  const matches = ranked.map((entry) => entry.match);

  const best = matches[0] ?? null;
  const alternatives = matches.slice(1, 4);

  const styleTotals = ranked.reduce(
    (acc, entry) => {
      acc[entry.match.grantStyle] = Math.max(acc[entry.match.grantStyle], entry.weightedScore);
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

const functionKeyFromAnswer = (questionId: string, answerKey: Smysnk2OptionKey) => {
  const question = getSmysnk2ScenarioById(questionId);
  const option = question?.options.find((item) => item.key === answerKey);
  if (!option) {
    return null;
  }
  return `${option.score.function}${option.score.orientation === "introverted" ? "i" : "e"}` as FunctionKey;
};

const getGrantStyleShare = (typeMatching: Smysnk2TypeMatchingSummary, style: GrantStyle) =>
  typeMatching.grantStyles.find((item) => item.style === style)?.confidence ?? 0;

const getDominantGrantStyle = (typeMatching: Smysnk2TypeMatchingSummary) => {
  const top = typeMatching.grantStyles[0];
  if (!top || top.confidence <= 0) {
    return { style: null, confidence: 0 };
  }
  return { style: top.style as GrantStyle, confidence: top.confidence };
};

const buildStats = ({
  evaluated,
  scoringMode
}: {
  evaluated: EvaluatedResponse[];
  scoringMode: Smysnk2TypeMatchScoringMode;
}) => {
  const globalCounts = EMPTY_FUNCTION_RECORD();
  const bucketTotals = EMPTY_ARCHETYPE_TOTALS();
  const bucketCounts = EMPTY_ARCHETYPE_COUNTS();

  let counted = 0;
  evaluated.forEach((item) => {
    counted += 1;
    globalCounts[item.functionKey] += 1;
    bucketTotals[item.archetype] += 1;
    bucketCounts[item.archetype][item.functionKey] += 1;
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

  return {
    counted,
    archetypeBreakdown,
    functionConfidence,
    functionScores,
    typeMatching: computeTypeMatches({
      bucketCounts,
      bucketTotals,
      scoringMode
    })
  };
};

const buildPolarityAnalysis = (
  polarity: Smysnk2ContextPolarity,
  evaluated: EvaluatedResponse[],
  scoringMode: Smysnk2TypeMatchScoringMode
): Smysnk2PolarityAnalysis => {
  const stats = buildStats({
    evaluated: evaluated.filter((item) => item.polarity === polarity),
    scoringMode
  });
  const dominant = getDominantGrantStyle(stats.typeMatching);
  return {
    polarity,
    label: polarity === "persona" ? "Persona" : "Shadow",
    totalResponses: stats.counted,
    archetypeBreakdown: stats.archetypeBreakdown,
    typeMatching: stats.typeMatching,
    dominantGrantStyle: dominant.style,
    dominantGrantStyleConfidence: dominant.confidence
  };
};

const buildContextAnalyses = ({
  evaluated,
  scoringMode
}: {
  evaluated: EvaluatedResponse[];
  scoringMode: Smysnk2TypeMatchScoringMode;
}): Smysnk2ContextTypeAnalysis[] =>
  SMYSNK2_SITUATION_CONTEXT_ORDER.map((context) => {
    const stats = buildStats({
      evaluated: evaluated.filter((item) => item.context === context),
      scoringMode
    });
    const dominant = getDominantGrantStyle(stats.typeMatching);
    return {
      context,
      label: SMYSNK2_SITUATION_CONTEXT_LABELS[context],
      polarity: SMYSNK2_CONTEXT_POLARITY_BY_CONTEXT[context],
      totalResponses: stats.counted,
      archetypeBreakdown: stats.archetypeBreakdown,
      typeMatching: stats.typeMatching,
      dominantGrantStyle: dominant.style,
      dominantGrantStyleConfidence: dominant.confidence
    };
  });

const buildTemperamentConfidence = ({
  persona,
  shadow,
  contexts
}: {
  persona: Smysnk2PolarityAnalysis;
  shadow: Smysnk2PolarityAnalysis;
  contexts: Smysnk2ContextTypeAnalysis[];
}): Smysnk2TemperamentConfidence => {
  const personaIEIE = getGrantStyleShare(persona.typeMatching, "IEIE");
  const shadowIEIE = getGrantStyleShare(shadow.typeMatching, "IEIE");
  const personaShadowDelta = round2(Math.abs(personaIEIE - shadowIEIE));
  const sameDirection =
    (personaIEIE >= 50 && shadowIEIE >= 50) || (personaIEIE < 50 && shadowIEIE < 50);
  const deltaStability = Math.max(0, 1 - personaShadowDelta / 100);

  const contextShares = contexts
    .filter((context) => context.totalResponses > 0)
    .map((context) => getGrantStyleShare(context.typeMatching, "IEIE"));
  const contextMean =
    contextShares.length > 0
      ? contextShares.reduce((acc, value) => acc + value, 0) / contextShares.length
      : 50;
  const contextVarianceRaw =
    contextShares.length > 0
      ? contextShares.reduce((acc, value) => acc + Math.abs(value - contextMean), 0) /
        contextShares.length
      : 0;
  const contextVariance = round2(contextVarianceRaw);
  const contextStability = Math.max(0, 1 - contextVariance / 50);

  const assertive = round2(
    Math.min(100, Math.max(0, ((sameDirection ? 1 : 0) * 0.45 + deltaStability * 0.35 + contextStability * 0.2) * 100))
  );
  const turbulent = round2(Math.max(0, 100 - assertive));
  const leaning = assertive >= turbulent ? "Assertive" : "Turbulent";

  return {
    assertive,
    turbulent,
    leaning,
    personaShadowDelta,
    contextVariance,
    rationale: sameDirection
      ? "Persona and shadow style signatures are directionally aligned."
      : "Persona and shadow style signatures diverge across contexts."
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

export const scoreSmysnk2Responses = (
  responses: Smysnk2Response[],
  options: Smysnk2ScoreOptions = {}
): Smysnk2ScoringResult => {
  const scoringMode = options.typeMatchScoringMode ?? "archetype_presence";
  const evaluated: EvaluatedResponse[] = responses.flatMap((response) => {
    const question = getSmysnk2ScenarioById(response.questionId);
    if (!question) {
      return [];
    }
    const key = functionKeyFromAnswer(response.questionId, response.answerKey);
    if (!key) {
      return [];
    }
    return [
      {
        questionId: response.questionId,
        functionKey: key,
        archetype: question.archetype,
        context: question.situationContext,
        polarity: question.contextPolarity
      }
    ];
  });

  const overallStats = buildStats({ evaluated, scoringMode });
  const persona = buildPolarityAnalysis("persona", evaluated, scoringMode);
  const shadow = buildPolarityAnalysis("shadow", evaluated, scoringMode);
  const contexts = buildContextAnalyses({ evaluated, scoringMode });
  const dominantOverallStyle = getDominantGrantStyle(overallStats.typeMatching);
  const temperamentConfidence = buildTemperamentConfidence({ persona, shadow, contexts });

  return {
    functionScores: overallStats.functionScores,
    analysis: {
      totalResponses: overallStats.counted,
      archetypeBreakdown: overallStats.archetypeBreakdown,
      functionConfidence: overallStats.functionConfidence,
      typeMatching: overallStats.typeMatching,
      assertiveMode: {
        overallGrantStyle: {
          style: dominantOverallStyle.style,
          confidence: dominantOverallStyle.confidence
        },
        totalResponses: overallStats.counted,
        archetypeBreakdown: overallStats.archetypeBreakdown,
        typeMatching: overallStats.typeMatching,
        dominantGrantStyle: dominantOverallStyle.style,
        dominantGrantStyleConfidence: dominantOverallStyle.confidence
      },
      turbulentMode: {
        contexts
      },
      temperamentConfidence,
      summary: {
        bestType: overallStats.typeMatching.best?.type ?? null,
        alternatives: overallStats.typeMatching.alternatives.map((item) => item.type),
        grantStyle: dominantOverallStyle.style,
        grantStyleConfidence: dominantOverallStyle.confidence,
        assertive: temperamentConfidence.assertive,
        turbulent: temperamentConfidence.turbulent,
        leaning: temperamentConfidence.leaning
      }
    }
  };
};

export const calculateSmysnk2Scores = (responses: Smysnk2Response[]) => scoreSmysnk2Responses(responses).functionScores;
