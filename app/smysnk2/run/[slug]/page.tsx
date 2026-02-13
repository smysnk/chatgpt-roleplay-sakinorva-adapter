"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SMYSNK2_ARCHETYPE_LABELS,
  SMYSNK2_ARCHETYPE_ORDER,
  getSmysnk2Scenarios,
  parseSmysnk2Mode,
  type Smysnk2Mode,
  type Smysnk2OptionKey
} from "@/lib/smysnk2Questions";
import type { Smysnk2Analysis } from "@/lib/smysnk2Score";
import { normalizeSmysnk2OptionKey } from "@/lib/smysnk2Score";
import SakinorvaResults from "@/app/components/SakinorvaResults";
import MbtiMapCanvas from "@/app/components/MbtiMapCanvas";

type Smysnk2RunPayload = {
  slug: string;
  runMode: "ai" | "user" | "reddit";
  subject: string | null;
  context: string | null;
  questionMode: string | null;
  questionCount: number | null;
  questionIds: string[] | null;
  redditProfile: { summary: string; persona: string; traits: string[] } | null;
  responses: { questionId: string; answer: string; rationale: string }[] | null;
  scores: Record<string, number> | null;
  analysis: Smysnk2Analysis | null;
  state: "QUEUED" | "PROCESSING" | "COMPLETED" | "ERROR";
  errors: number;
  createdAt: string;
};

const formatDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
};

const getModeLabel = (mode: Smysnk2Mode) => {
  if (mode === 16) {
    return "16 (fast)";
  }
  if (mode === 64) {
    return "64 (high confidence)";
  }
  return "32 (balanced)";
};

const formatRunMode = (runMode: Smysnk2RunPayload["runMode"]) => {
  if (runMode === "ai") {
    return "AI roleplay";
  }
  if (runMode === "reddit") {
    return "Reddit profile";
  }
  return "Self answer";
};

const formatPercent = (value: number) => `${value.toFixed(1)}%`;
const formatPercentInt = (value: number) => `${Math.round(value)}%`;

type GrantStyle = "IEIE" | "EIEI";
type HeatmapFunctionKey = "Ni" | "Ne" | "Si" | "Se" | "Ti" | "Te" | "Fi" | "Fe";
const HEATMAP_FUNCTION_ORDER: HeatmapFunctionKey[] = ["Ni", "Ne", "Si", "Se", "Ti", "Te", "Fi", "Fe"];
const HEATMAP_BY_FUNCTION_OPTION = "BY_FUNCTION";

const getGrantStyleScore = (
  analysis: {
    typeMatching: { grantStyles: { style: string; confidence: number }[] };
  },
  style: GrantStyle
) => analysis.typeMatching.grantStyles.find((entry) => entry.style === style)?.confidence ?? 0;

const flipFunctionAttitude = (functionKey: string) => {
  if (functionKey.length < 2) {
    return functionKey;
  }
  const attitude = functionKey.slice(1);
  if (attitude === "i") {
    return `${functionKey[0]}e`;
  }
  if (attitude === "e") {
    return `${functionKey[0]}i`;
  }
  return functionKey;
};

const formatTypeWithConfidence = (type: string | null | undefined, confidence: number | null | undefined) => {
  if (!type) {
    return "-";
  }
  return `${type} ${formatPercentInt(confidence ?? 0)}`;
};

type TypeMatchOption = {
  type: string;
  confidence: number;
  stack: string[];
  archetypeHitCount?: number;
  archetypeOpportunityCount?: number;
  slotHitVolume?: number;
};

type TypeMatchingLike = {
  best: TypeMatchOption | null;
  alternatives: TypeMatchOption[];
};

const MBTI_TYPE_OPTIONS = [
  "ISTJ",
  "ISFJ",
  "INFJ",
  "INTJ",
  "ISTP",
  "ISFP",
  "INFP",
  "INTP",
  "ESTP",
  "ESFP",
  "ENFP",
  "ENTP",
  "ESTJ",
  "ESFJ",
  "ENFJ",
  "ENTJ"
] as const;

const MBTI_STACKS: Record<string, [HeatmapFunctionKey, HeatmapFunctionKey, HeatmapFunctionKey, HeatmapFunctionKey]> = {
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

const CONTEXT_SHORT_LABELS: Record<string, string> = {
  leisure_with_friends: "Friends",
  alone_time_relax: "Alone",
  work_time_constraints: "Timed Work",
  overwhelming_work_tasks: "Overload",
  unexpected_interpersonal_conflict: "Conflict",
  emergency_medical_situation: "Medical",
  creative_expression_hobby: "Creative"
};
const HEATMAP_LABEL_COLUMN_WIDTH = 112;

type HeatmapContextEntry = { key: string; label: string; shortLabel: string };
type HeatmapCell = { contextKey: string; functionKey: HeatmapFunctionKey; hits: number; intensity: number };
type HeatmapRow = {
  archetype: string;
  archetypeLabel: string;
  functionKey: HeatmapFunctionKey;
  cells: HeatmapCell[];
};
type HeatmapModel = {
  selectedType: string;
  showArchetypeLabel: boolean;
  contexts: HeatmapContextEntry[];
  rows: HeatmapRow[];
  maxHits: number;
};

const getTypeOptions = (typeMatching: TypeMatchingLike | null | undefined): TypeMatchOption[] => {
  if (!typeMatching) {
    return [];
  }
  const raw = [typeMatching.best, ...typeMatching.alternatives].filter(
    (match): match is TypeMatchOption => Boolean(match)
  );
  const unique = new Map<string, TypeMatchOption>();
  raw.forEach((match) => {
    if (!unique.has(match.type)) {
      unique.set(match.type, match);
    }
  });
  return [...unique.values()];
};

const buildHeatmapModel = (
  contexts: Smysnk2Analysis["turbulentMode"]["contexts"],
  selectedType: string
): HeatmapModel | null => {
  const contextEntries: HeatmapContextEntry[] = contexts.map((context) => ({
    key: context.context,
    label: context.label,
    shortLabel: CONTEXT_SHORT_LABELS[context.context] ?? context.label
  }));
  const hitsByFunction = HEATMAP_FUNCTION_ORDER.reduce(
    (acc, functionKey) => {
      acc[functionKey] = contextEntries.reduce(
        (inner, contextEntry) => {
          inner[contextEntry.key] = 0;
          return inner;
        },
        {} as Record<string, number>
      );
      return acc;
    },
    {} as Record<HeatmapFunctionKey, Record<string, number>>
  );

  contexts.forEach((context) => {
    context.archetypeBreakdown.forEach((row) => {
      if (!row || row.total <= 0) {
        return;
      }
      HEATMAP_FUNCTION_ORDER.forEach((functionKey) => {
        const confidence = row.distribution[functionKey] ?? 0;
        if (confidence <= 0) {
          return;
        }
        const hits = Math.round((confidence / 100) * row.total);
        if (hits > 0) {
          hitsByFunction[functionKey][context.context] += hits;
        }
      });
    });
  });

  if (selectedType === HEATMAP_BY_FUNCTION_OPTION) {
    const maxHits = Math.max(
      0,
      ...HEATMAP_FUNCTION_ORDER.flatMap((functionKey) =>
        contextEntries.map((contextEntry) => hitsByFunction[functionKey][contextEntry.key] ?? 0)
      )
    );
    const rows: HeatmapRow[] = HEATMAP_FUNCTION_ORDER.map((functionKey) => ({
      archetype: `function-${functionKey}`,
      archetypeLabel: "",
      functionKey,
      cells: contextEntries.map((contextEntry) => {
        const hits = hitsByFunction[functionKey][contextEntry.key] ?? 0;
        return {
          contextKey: contextEntry.key,
          functionKey,
          hits,
          intensity: maxHits ? hits / maxHits : 0
        };
      })
    }));

    return {
      selectedType,
      showArchetypeLabel: false,
      contexts: contextEntries,
      rows,
      maxHits
    };
  }

  const stack = MBTI_STACKS[selectedType];
  if (!stack) {
    return null;
  }
  const shadow = stack.map((functionKey) => flipFunctionAttitude(functionKey)) as [
    HeatmapFunctionKey,
    HeatmapFunctionKey,
    HeatmapFunctionKey,
    HeatmapFunctionKey
  ];
  const expectedByArchetype = new Map(
    SMYSNK2_ARCHETYPE_ORDER.map((archetype, index) => [
      archetype,
      ([...stack, ...shadow][index] ?? stack[0]) as HeatmapFunctionKey
    ])
  );

  const hitsByArchetype = SMYSNK2_ARCHETYPE_ORDER.reduce(
    (acc, archetype) => {
      acc[archetype] = contextEntries.reduce(
        (inner, contextEntry) => {
          inner[contextEntry.key] = 0;
          return inner;
        },
        {} as Record<string, number>
      );
      return acc;
    },
    {} as Record<(typeof SMYSNK2_ARCHETYPE_ORDER)[number], Record<string, number>>
  );

  contexts.forEach((context) => {
    const byArchetype = new Map(context.archetypeBreakdown.map((row) => [row.archetype, row]));
    SMYSNK2_ARCHETYPE_ORDER.forEach((archetype) => {
      const row = byArchetype.get(archetype);
      if (!row || row.total <= 0) {
        return;
      }
      const expectedFunction = expectedByArchetype.get(archetype) ?? stack[0];
      const confidence = row.distribution[expectedFunction as keyof typeof row.distribution] ?? 0;
      const hits = Math.round((confidence / 100) * row.total);
      if (hits > 0) {
        hitsByArchetype[archetype][context.context] += hits;
      }
    });
  });

  const maxHits = Math.max(
    0,
    ...SMYSNK2_ARCHETYPE_ORDER.flatMap((archetype) =>
      contextEntries.map((contextEntry) => hitsByArchetype[archetype][contextEntry.key] ?? 0)
    )
  );
  const rows: HeatmapRow[] = SMYSNK2_ARCHETYPE_ORDER.map((archetype) => ({
    archetype,
    archetypeLabel: SMYSNK2_ARCHETYPE_LABELS[archetype],
    functionKey: expectedByArchetype.get(archetype) ?? stack[0],
    cells: contextEntries.map((contextEntry) => {
      const hits = hitsByArchetype[archetype][contextEntry.key] ?? 0;
      return {
        contextKey: contextEntry.key,
        functionKey: expectedByArchetype.get(archetype) ?? stack[0],
        hits,
        intensity: maxHits ? hits / maxHits : 0
      };
    })
  }));

  return {
    selectedType,
    showArchetypeLabel: true,
    contexts: contextEntries,
    rows,
    maxHits
  };
};

const getTurbulentTopType = (analysis: Smysnk2Analysis) => {
  const tally = new Map<string, { contextWins: number; archetypeHits: number; confidenceSum: number }>();
  analysis.turbulentMode.contexts.forEach((context) => {
    const best = context.typeMatching.best;
    if (!best) {
      return;
    }
    const activeArchetypes = context.archetypeBreakdown.reduce(
      (count, row) => count + (row.total > 0 ? 1 : 0),
      0
    );
    const inferredHits = Math.round((best.confidence / 100) * Math.max(activeArchetypes, 1));
    const hitCount = best.archetypeHitCount ?? inferredHits;

    const current = tally.get(best.type) ?? { contextWins: 0, archetypeHits: 0, confidenceSum: 0 };
    current.contextWins += 1;
    current.archetypeHits += hitCount;
    current.confidenceSum += best.confidence;
    tally.set(best.type, current);
  });

  const ranked = [...tally.entries()]
    .map(([type, value]) => ({
      type,
      confidence: value.contextWins ? value.confidenceSum / value.contextWins : 0,
      count: value.contextWins,
      hits: value.archetypeHits
    }))
    .sort(
      (left, right) =>
        right.count - left.count ||
        right.hits - left.hits ||
        right.confidence - left.confidence ||
        left.type.localeCompare(right.type)
    );

  return ranked[0] ?? null;
};

export default function Smysnk2RunPage({ params }: { params: { slug: string } }) {
  const [data, setData] = useState<Smysnk2RunPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoringTab, setScoringTab] = useState<"assertive" | "turbulent">("assertive");
  const [manualTabSelection, setManualTabSelection] = useState(false);
  const [selectedAssertiveType, setSelectedAssertiveType] = useState<string | null>(null);
  const [selectedTurbulentTypes, setSelectedTurbulentTypes] = useState<Record<string, string>>({});
  const [selectedHeatmapType, setSelectedHeatmapType] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async (withLoading = false) => {
      if (withLoading) {
        setLoading(true);
      }
      setError(null);
      try {
        const response = await fetch(`/api/smysnk2/slug/${params.slug}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Failed to load SMYSNK2 run.");
        }
        const payload = (await response.json()) as Smysnk2RunPayload;
        if (active) {
          setData(payload);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unexpected error.");
        }
      } finally {
        if (active && withLoading) {
          setLoading(false);
        }
      }
    };

    load(true);
    const shouldPoll = data?.state !== "COMPLETED" && data?.state !== "ERROR";
    const interval = shouldPoll ? setInterval(() => load(false), 5000) : null;

    return () => {
      active = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [params.slug, data?.state]);

  const mode = useMemo(
    () => parseSmysnk2Mode(data?.questionMode ?? data?.questionCount ?? 32),
    [data?.questionMode, data?.questionCount]
  );

  const responseMap = useMemo(() => {
    if (!data?.responses?.length) {
      return new Map<string, { answer: Smysnk2OptionKey | null; rationale: string }>();
    }
    return new Map(
      data.responses.map((response) => [
        response.questionId,
        {
          answer: normalizeSmysnk2OptionKey(response.answer),
          rationale: response.rationale
        }
      ])
    );
  }, [data]);

  const runScenarios = useMemo(
    () =>
      getSmysnk2Scenarios(
        mode,
        data?.questionIds,
        data?.questionIds?.length ? data?.slug ?? null : null
      ),
    [mode, data?.questionIds, data?.slug]
  );

  const hasScores = useMemo(() => Boolean(data?.scores && Object.keys(data.scores).length), [data]);
  const hasAnalysis = useMemo(
    () => Boolean(data?.analysis && data.analysis.totalResponses > 0),
    [data]
  );
  const hasModeScoring = useMemo(
    () => Boolean(data?.analysis?.assertiveMode && data?.analysis?.turbulentMode && data?.analysis?.summary),
    [data]
  );

  const assertiveTypeMatching = useMemo(() => {
    const analysis = data?.analysis;
    if (!analysis) {
      return null;
    }
    const fromAssertive = (analysis.assertiveMode as { typeMatching?: Smysnk2Analysis["typeMatching"] } | undefined)
      ?.typeMatching;
    return fromAssertive ?? analysis.typeMatching;
  }, [data?.analysis]);

  const assertiveTypeOptions = useMemo(() => {
    return getTypeOptions(assertiveTypeMatching as TypeMatchingLike | null);
  }, [assertiveTypeMatching]);

  const selectedAssertiveTypeMatch = useMemo(() => {
    if (!assertiveTypeOptions.length) {
      return null;
    }
    if (!selectedAssertiveType) {
      return assertiveTypeOptions[0];
    }
    return (
      assertiveTypeOptions.find((match) => match.type === selectedAssertiveType) ??
      assertiveTypeOptions[0]
    );
  }, [assertiveTypeOptions, selectedAssertiveType]);

  const assertiveArchetypeRows = useMemo(() => {
    const analysis = data?.analysis;
    if (!analysis) {
      return [];
    }
    const stack = selectedAssertiveTypeMatch?.stack ?? [];
    const shadow = stack.map((functionKey) => flipFunctionAttitude(functionKey));
    const expectedFunctions = [...stack, ...shadow];
    const indexByArchetype = new Map(
      SMYSNK2_ARCHETYPE_ORDER.map((archetype, index) => [archetype, index])
    );

    const rows = (
      analysis.assertiveMode?.archetypeBreakdown?.length
        ? analysis.assertiveMode.archetypeBreakdown
        : analysis.archetypeBreakdown
    ).filter((row) => row.total > 0);

    return rows.map((row) => {
      const archetypeIndex = indexByArchetype.get(row.archetype) ?? -1;
      const expectedFunction =
        (archetypeIndex >= 0 ? expectedFunctions[archetypeIndex] : null) ?? row.leadingFunction;
      const confidence =
        expectedFunction && expectedFunction in row.distribution
          ? row.distribution[expectedFunction as keyof typeof row.distribution]
          : 0;
      const hits = Math.round((confidence / 100) * row.total);
      return {
        ...row,
        expectedFunction: expectedFunction ?? "-",
        confidenceForType: confidence,
        hitsForType: hits
      };
    });
  }, [data?.analysis, selectedAssertiveTypeMatch]);

  const orderedFunctionConfidence = useMemo(() => {
    const analysis = data?.analysis;
    if (!analysis?.functionConfidence?.length) {
      return [];
    }

    const bestStack = analysis.typeMatching.best?.stack;
    if (!bestStack?.length) {
      return analysis.functionConfidence;
    }

    const shadowStack = bestStack.map((functionKey) => flipFunctionAttitude(functionKey));
    const stackOrder = [...bestStack, ...shadowStack];
    const stackIndex = new Map(stackOrder.map((functionKey, index) => [functionKey, index]));

    return [...analysis.functionConfidence].sort((left, right) => {
      const leftIndex = stackIndex.get(left.functionKey) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = stackIndex.get(right.functionKey) ?? Number.MAX_SAFE_INTEGER;
      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }
      return right.confidence - left.confidence;
    });
  }, [data?.analysis]);

  const favoredScoringTab = useMemo<"assertive" | "turbulent">(() => {
    const analysis = data?.analysis;
    if (!analysis) {
      return "assertive";
    }
    return analysis.summary.turbulent > analysis.summary.assertive ? "turbulent" : "assertive";
  }, [data?.analysis]);

  const turbulentTopType = useMemo(() => {
    if (!data?.analysis) {
      return null;
    }
    return getTurbulentTopType(data.analysis);
  }, [data?.analysis]);

  const assertivePreferenceSummary = useMemo(() => {
    const analysis = data?.analysis;
    if (!analysis) {
      return null;
    }
    const assertiveScore = analysis.summary.assertive;
    const turbulentScore = analysis.summary.turbulent;
    const preferred = assertiveScore >= turbulentScore;
    const reason = preferred ? "preferred" : "not preferred";
    return `Assertive combines persona and shadow contexts into one stable stack decision. It is ${reason} for this run because Assertive is ${formatPercent(assertiveScore)} versus Turbulent ${formatPercent(turbulentScore)} (persona/shadow delta ${formatPercent(
      analysis.temperamentConfidence.personaShadowDelta
    )}, context variance ${formatPercent(analysis.temperamentConfidence.contextVariance)}).`;
  }, [data?.analysis]);

  const contextHeatmap = useMemo<HeatmapModel | null>(() => {
    const analysis = data?.analysis;
    if (!analysis || !selectedHeatmapType) {
      return null;
    }
    return buildHeatmapModel(analysis.turbulentMode.contexts, selectedHeatmapType);
  }, [data?.analysis, selectedHeatmapType]);

  useEffect(() => {
    if (!data?.analysis || manualTabSelection) {
      return;
    }
    setScoringTab(favoredScoringTab);
  }, [data?.analysis, favoredScoringTab, manualTabSelection]);

  useEffect(() => {
    if (!assertiveTypeOptions.length) {
      setSelectedAssertiveType(null);
      return;
    }
    if (!selectedAssertiveType || !assertiveTypeOptions.some((match) => match.type === selectedAssertiveType)) {
      setSelectedAssertiveType(assertiveTypeOptions[0].type);
    }
  }, [assertiveTypeOptions, selectedAssertiveType]);

  useEffect(() => {
    const analysis = data?.analysis;
    if (!analysis) {
      setSelectedTurbulentTypes({});
      return;
    }
    setSelectedTurbulentTypes((current) => {
      const next: Record<string, string> = {};
      analysis.turbulentMode.contexts.forEach((context) => {
        const options = getTypeOptions(context.typeMatching as TypeMatchingLike);
        if (!options.length) {
          return;
        }
        const existing = current[context.context];
        next[context.context] =
          existing && options.some((option) => option.type === existing) ? existing : options[0].type;
      });
      return next;
    });
  }, [data?.analysis]);

  useEffect(() => {
    setManualTabSelection(false);
    setSelectedAssertiveType(null);
    setSelectedTurbulentTypes({});
    setSelectedHeatmapType(null);
  }, [params.slug]);

  useEffect(() => {
    const analysis = data?.analysis;
    if (!analysis) {
      setSelectedHeatmapType(null);
      return;
    }
    const fallback =
      selectedAssertiveTypeMatch?.type ??
      assertiveTypeMatching?.best?.type ??
      analysis.typeMatching.best?.type ??
      MBTI_TYPE_OPTIONS[0];
    setSelectedHeatmapType((current) => {
      if (current === HEATMAP_BY_FUNCTION_OPTION || (current && MBTI_STACKS[current])) {
        return current;
      }
      return fallback;
    });
  }, [data?.analysis, assertiveTypeMatching?.best?.type, selectedAssertiveTypeMatch?.type]);

  return (
    <main>
      <div className="grid two">
        <div className="app-card">
          <h2>{data?.subject?.trim() || "Unnamed run"}</h2>
          {loading ? (
            <p style={{ marginTop: "20px" }}>Loading results...</p>
          ) : error ? (
            <div className="error">{error}</div>
          ) : data ? (
            <div style={{ marginTop: "20px" }}>
              {data.context ? <p className="helper">{data.context}</p> : null}
              <p className="helper">{`SMYSNK2 ${getModeLabel(mode)} | ${formatRunMode(data.runMode)}`}</p>
              <p className="helper">Created: {formatDate(data.createdAt)}</p>
              {data.state === "ERROR" ? (
                <div className="error" style={{ marginTop: "20px" }}>
                  This run failed to complete after multiple attempts.
                </div>
              ) : data.state !== "COMPLETED" ? (
                <p className="helper" style={{ marginTop: "20px" }}>
                  Run is queued and will update once processing completes.
                </p>
              ) : (
                <>
                  <div style={{ marginTop: "20px" }}>
                    <SakinorvaResults htmlFragment="" functionScores={data.scores} mbtiMeta={null} />
                  </div>
                  {hasScores ? (
                    <div style={{ marginTop: "24px" }}>
                      <h3 style={{ marginBottom: "12px" }}>MBTI Axis Map</h3>
                      <MbtiMapCanvas functionScores={data.scores} />
                    </div>
                  ) : null}
                  {hasAnalysis ? (
                    <div style={{ marginTop: "24px", display: "grid", gap: "16px" }}>
                      <h3 style={{ marginBottom: 0 }}>SMYSNK2 scoring summary</h3>
                      <p className="helper">Based on {data.analysis?.totalResponses ?? 0} answered scenarios.</p>
                      {hasModeScoring && data.analysis ? (
                        <>
                          <div className="answer-row">
                            <div className="answer-meta">
                              <div className="answer-question">
                                {data.analysis.summary.bestType
                                  ? `Best fit ${data.analysis.summary.bestType}`
                                  : "Best fit unresolved"}
                              </div>
                              <div className="badge">{data.analysis.summary.leaning}</div>
                            </div>
                            <p className="helper">
                              Grant style: {data.analysis.summary.grantStyle ?? "-"} (
                              {formatPercent(data.analysis.summary.grantStyleConfidence)})
                            </p>
                            <p className="helper">
                              Assertive {formatPercent(data.analysis.summary.assertive)} | Turbulent{" "}
                              {formatPercent(data.analysis.summary.turbulent)}
                            </p>
                            <p className="helper">
                              {data.analysis.temperamentConfidence.rationale} Persona/shadow delta{" "}
                              {formatPercent(data.analysis.temperamentConfidence.personaShadowDelta)} | Context
                              variance {formatPercent(data.analysis.temperamentConfidence.contextVariance)}
                            </p>
                          </div>

                          <div className="smysnk2-mode-tabs" role="tablist" aria-label="Scoring mode">
                            <button
                              type="button"
                              role="tab"
                              aria-selected={scoringTab === "assertive"}
                              className={`button secondary smysnk2-mode-tab ${scoringTab === "assertive" ? "active" : ""}`.trim()}
                              onClick={() => {
                                setManualTabSelection(true);
                                setScoringTab("assertive");
                              }}
                            >
                              <span>Assertive</span>
                              <span className="smysnk2-mode-tab-value">
                                {formatPercent(data.analysis.summary.assertive)}
                              </span>
                            </button>
                            <button
                              type="button"
                              role="tab"
                              aria-selected={scoringTab === "turbulent"}
                              className={`button secondary smysnk2-mode-tab ${scoringTab === "turbulent" ? "active" : ""}`.trim()}
                              onClick={() => {
                                setManualTabSelection(true);
                                setScoringTab("turbulent");
                              }}
                            >
                              <span>Turbulent</span>
                              <span className="smysnk2-mode-tab-value">
                                {formatPercent(data.analysis.summary.turbulent)}
                              </span>
                            </button>
                          </div>

                          {assertivePreferenceSummary ? (
                            <p className="helper">{assertivePreferenceSummary}</p>
                          ) : null}

                          {scoringTab === "assertive" ? (
                            <div style={{ display: "grid", gap: "12px" }}>
                              <div className="smysnk2-context-grid">
                                <div className="answer-row smysnk2-context-card">
                                  <div className="answer-meta">
                                    <div>
                                      <div className="answer-question">Assertive</div>
                                    </div>
                                  </div>
                                  <p className="helper">
                                    Selected type {formatTypeWithConfidence(
                                      selectedAssertiveTypeMatch?.type ?? assertiveTypeMatching?.best?.type ?? null,
                                      selectedAssertiveTypeMatch?.confidence ??
                                        assertiveTypeMatching?.best?.confidence ??
                                        0
                                    )}{" "}
                                    | Grant style {assertiveTypeMatching?.grantStyles[0]?.style ?? "-"}{" "}
                                    {formatPercent(assertiveTypeMatching?.grantStyles[0]?.confidence ?? 0)}
                                  </p>
                                  <p className="helper">
                                    Assertive scoring is consolidated into a single MBTI decision using all archetype
                                    and shadow hits together.
                                  </p>

                                  {assertiveTypeOptions.length ? (
                                    <div className="smysnk2-type-chip-row" role="tablist" aria-label="Assertive type view">
                                      {assertiveTypeOptions.map((match) => (
                                        <button
                                          type="button"
                                          role="tab"
                                          aria-selected={selectedAssertiveTypeMatch?.type === match.type}
                                          key={`assertive-type-${match.type}`}
                                          className={`button secondary smysnk2-type-chip ${
                                            selectedAssertiveTypeMatch?.type === match.type ? "active" : ""
                                          }`.trim()}
                                          onClick={() => setSelectedAssertiveType(match.type)}
                                        >
                                          {match.type} {formatPercentInt(match.confidence)}
                                        </button>
                                      ))}
                                    </div>
                                  ) : null}

                                  <div className="smysnk2-context-chart">
                                    <div className="smysnk2-context-chart-head">
                                      <p className="helper">Archetype match chart</p>
                                      <p className="helper">
                                        Hits for {selectedAssertiveTypeMatch?.type ?? "selected type"} stack
                                      </p>
                                    </div>
                                    {assertiveArchetypeRows.filter((row) => row.hitsForType > 0).length ? (
                                      assertiveArchetypeRows
                                        .filter((row) => row.hitsForType > 0)
                                        .map((row) => (
                                          <div className="smysnk2-archetype-row" key={`assertive-${row.archetype}`}>
                                            <div className="smysnk2-archetype-meta">
                                              <span className="smysnk2-archetype-name">{row.label}</span>
                                              <span className="smysnk2-archetype-details">
                                                {row.expectedFunction} | {row.hitsForType}/{row.total} hits
                                              </span>
                                            </div>
                                            <div
                                              className="smysnk2-archetype-track"
                                              role="img"
                                              aria-label={`${row.label} confidence ${formatPercent(
                                                row.confidenceForType
                                              )}`}
                                            >
                                              <div
                                                className="smysnk2-archetype-fill"
                                                style={{ width: `${row.confidenceForType}%` }}
                                              />
                                            </div>
                                          </div>
                                        ))
                                    ) : (
                                      <p className="helper">No archetype hits recorded for this type yet.</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: "grid", gap: "12px" }}>
                              <div className="answer-row">
                                <div className="answer-meta">
                                  <div className="answer-question">Turbulent</div>
                                  <div className="badge">
                                    {formatTypeWithConfidence(
                                      turbulentTopType?.type ?? null,
                                      turbulentTopType?.confidence ?? 0
                                    )}
                                  </div>
                                </div>
                                <p className="helper">
                                  Each context gets its own type fit and IEIE/EIEI split, so you can see exactly where
                                  the stack stays stable or flips.
                                </p>
                              </div>

                              <div className="smysnk2-context-grid">
                                {data.analysis.turbulentMode.contexts.map((context) => {
                                  const ieie = getGrantStyleScore(context, "IEIE");
                                  const eiei = getGrantStyleScore(context, "EIEI");
                                  const leadingStyleScore = Math.max(ieie, eiei);
                                  const trailingStyleScore = Math.min(ieie, eiei);
                                  const contextTypeOptions = getTypeOptions(
                                    context.typeMatching as TypeMatchingLike
                                  );
                                  const selectedContextType = selectedTurbulentTypes[context.context];
                                  const selectedContextTypeMatch =
                                    contextTypeOptions.find((match) => match.type === selectedContextType) ??
                                    contextTypeOptions[0] ??
                                    null;
                                  const stack = selectedContextTypeMatch?.stack ?? [];
                                  const shadow = stack.map((functionKey) => flipFunctionAttitude(functionKey));
                                  const expectedFunctions = [...stack, ...shadow];
                                  const indexByArchetype = new Map(
                                    SMYSNK2_ARCHETYPE_ORDER.map((archetype, index) => [archetype, index])
                                  );
                                  const archetypeRows = context.archetypeBreakdown
                                    .filter((row) => row.total > 0)
                                    .map((row) => {
                                      const archetypeIndex = indexByArchetype.get(row.archetype) ?? -1;
                                      const expectedFunction =
                                        (archetypeIndex >= 0 ? expectedFunctions[archetypeIndex] : null) ??
                                        row.leadingFunction;
                                      const confidence =
                                        expectedFunction && expectedFunction in row.distribution
                                          ? row.distribution[
                                              expectedFunction as keyof typeof row.distribution
                                            ]
                                          : 0;
                                      const hits = Math.round((confidence / 100) * row.total);
                                      return {
                                        ...row,
                                        expectedFunction: expectedFunction ?? "-",
                                        confidenceForType: confidence,
                                        hitsForType: hits
                                      };
                                    })
                                    .filter((row) => row.hitsForType > 0);

                                  return (
                                    <div className="answer-row smysnk2-context-card" key={context.context}>
                                      <div className="answer-meta">
                                        <div>
                                          <div className="answer-question">{context.label}</div>
                                          <p className="helper" style={{ marginTop: "4px" }}>
                                            {context.polarity} | {context.totalResponses} responses
                                          </p>
                                        </div>
                                      </div>
                                      <p className="helper">
                                        Selected type {formatTypeWithConfidence(
                                          selectedContextTypeMatch?.type ?? context.typeMatching.best?.type ?? null,
                                          selectedContextTypeMatch?.confidence ??
                                            context.typeMatching.best?.confidence ??
                                            0
                                        )}{" "}
                                        | Grant split IEIE {formatPercent(ieie)} / EIEI {formatPercent(eiei)} | Delta{" "}
                                        {formatPercent(Math.abs(leadingStyleScore - trailingStyleScore))}
                                      </p>

                                      {contextTypeOptions.length ? (
                                        <div
                                          className="smysnk2-type-chip-row"
                                          role="tablist"
                                          aria-label={`${context.label} type view`}
                                        >
                                          {contextTypeOptions.map((match) => (
                                            <button
                                              type="button"
                                              role="tab"
                                              aria-selected={selectedContextTypeMatch?.type === match.type}
                                              key={`${context.context}-${match.type}`}
                                              className={`button secondary smysnk2-type-chip ${
                                                selectedContextTypeMatch?.type === match.type ? "active" : ""
                                              }`.trim()}
                                              onClick={() =>
                                                setSelectedTurbulentTypes((current) => ({
                                                  ...current,
                                                  [context.context]: match.type
                                                }))
                                              }
                                            >
                                              {match.type} {formatPercentInt(match.confidence)}
                                            </button>
                                          ))}
                                        </div>
                                      ) : null}

                                      <div className="smysnk2-context-chart">
                                        <div className="smysnk2-context-chart-head">
                                          <p className="helper">Archetype match chart</p>
                                          <p className="helper">
                                            Hits for {selectedContextTypeMatch?.type ?? "selected type"} stack
                                          </p>
                                        </div>
                                        {archetypeRows.length ? (
                                          archetypeRows.map((row) => {
                                            return (
                                              <div className="smysnk2-archetype-row" key={`${context.context}-${row.archetype}`}>
                                                <div className="smysnk2-archetype-meta">
                                                  <span className="smysnk2-archetype-name">{row.label}</span>
                                                  <span className="smysnk2-archetype-details">
                                                    {row.expectedFunction} | {row.hitsForType}/{row.total} hits
                                                  </span>
                                                </div>
                                                <div
                                                  className="smysnk2-archetype-track"
                                                  role="img"
                                                  aria-label={`${row.label} confidence ${formatPercent(
                                                    row.confidenceForType
                                                  )}`}
                                                >
                                                  <div
                                                    className="smysnk2-archetype-fill"
                                                    style={{ width: `${row.confidenceForType}%` }}
                                                  />
                                                </div>
                                              </div>
                                            );
                                          })
                                        ) : (
                                          <p className="helper">No archetype matches recorded for this context yet.</p>
                                        )}
                                      </div>

                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      ) : null}

                      <h3 style={{ marginBottom: 0 }}>Overall function confidence</h3>
                      <div className="table-wrapper">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Function</th>
                              <th>Confidence</th>
                              <th>Selection share</th>
                              <th>Count</th>
                              <th>Archetype wins</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orderedFunctionConfidence.map((row) => (
                              <tr key={row.functionKey}>
                                <td>{row.functionKey}</td>
                                <td>{formatPercent(row.confidence)}</td>
                                <td>{formatPercent(row.percentage)}</td>
                                <td>{row.count}</td>
                                <td>{row.archetypeWins}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {hasModeScoring && data.analysis ? (
                        <div style={{ display: "grid", gap: "12px" }}>
                          <h3 style={{ marginBottom: 0 }}>Context Function Heat Map</h3>
                          <p className="helper">
                            Y-axis shows functions and X-axis shows contexts. Brighter yellow cells mean more
                            archetype hits for that function/context pair.
                          </p>
                          <div className="answer-row smysnk2-context-card smysnk2-heatmap-card">
                            {contextHeatmap && contextHeatmap.contexts.length ? (
                              <div className="smysnk2-heatmap">
                                <div className="smysnk2-heatmap-type-picker">
                                  <select
                                    id="smysnk2-heatmap-type"
                                    className="select smysnk2-heatmap-select"
                                    value={selectedHeatmapType ?? contextHeatmap.selectedType}
                                    onChange={(event) => setSelectedHeatmapType(event.target.value)}
                                  >
                                    <option value={HEATMAP_BY_FUNCTION_OPTION}>By function</option>
                                    {MBTI_TYPE_OPTIONS.map((type) => (
                                      <option key={`heatmap-type-${type}`} value={type}>
                                        {type}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div
                                  className="smysnk2-heatmap-axis-row"
                                  style={{
                                    gridTemplateColumns: `${HEATMAP_LABEL_COLUMN_WIDTH}px repeat(${Math.max(
                                      contextHeatmap.contexts.length,
                                      1
                                    )}, minmax(34px, 1fr))`
                                  }}
                                >
                                  <span />
                                  <span className="helper smysnk2-heatmap-xaxis">Contexts</span>
                                </div>
                                <div
                                  className="smysnk2-heatmap-head"
                                  style={{
                                    gridTemplateColumns: `${HEATMAP_LABEL_COLUMN_WIDTH}px repeat(${Math.max(
                                      contextHeatmap.contexts.length,
                                      1
                                    )}, minmax(34px, 1fr))`
                                  }}
                                >
                                  <span className="smysnk2-heatmap-corner">Function</span>
                                  {contextHeatmap.contexts.map((contextEntry) => (
                                    <span
                                      key={`heatmap-head-${contextEntry.key}`}
                                      className="smysnk2-heatmap-context-label"
                                      title={contextEntry.label}
                                    >
                                      {contextEntry.shortLabel}
                                    </span>
                                  ))}
                                </div>
                                {contextHeatmap.rows.map((row) => (
                                  <div
                                    className="smysnk2-heatmap-row"
                                    key={`heatmap-${row.archetype}`}
                                    style={{
                                      gridTemplateColumns: `${HEATMAP_LABEL_COLUMN_WIDTH}px repeat(${Math.max(
                                        contextHeatmap.contexts.length,
                                        1
                                      )}, minmax(34px, 1fr))`
                                    }}
                                  >
                                    <span className="smysnk2-heatmap-function-label">
                                      <span className="smysnk2-heatmap-function">{row.functionKey}</span>
                                      {contextHeatmap.showArchetypeLabel ? (
                                        <span className="smysnk2-heatmap-archetype">{row.archetypeLabel}</span>
                                      ) : null}
                                    </span>
                                    {row.cells.map((cell) => {
                                      const alpha = cell.intensity > 0 ? 0.14 + cell.intensity * 0.78 : 0.05;
                                      const background = `rgba(240, 201, 106, ${alpha})`;
                                      return (
                                        <div
                                          key={`heatmap-${row.archetype}-${row.functionKey}-${cell.contextKey}`}
                                          className="smysnk2-heatmap-cell"
                                          style={{ background }}
                                          title={`${
                                            contextHeatmap.showArchetypeLabel
                                              ? `${row.archetypeLabel} | `
                                              : ""
                                          }${row.functionKey} | ${
                                            contextHeatmap.contexts.find((entry) => entry.key === cell.contextKey)
                                              ?.label ?? cell.contextKey
                                          } | ${cell.hits} hits`}
                                        >
                                          {cell.hits > 0 ? cell.hits : ""}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="helper">No context hit data available.</p>
                            )}
                          </div>
                        </div>
                      ) : null}

                    </div>
                  ) : data.state === "COMPLETED" ? (
                    <p className="helper" style={{ marginTop: "24px" }}>
                      Detailed SMYSNK2 archetype confidence is unavailable for this run.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
        {data?.runMode === "reddit" && data.redditProfile ? (
          <div className="app-card">
            <h2>Psychological profile</h2>
            <p className="helper" style={{ marginTop: "16px" }}>
              {data.redditProfile.summary}
            </p>
            <div style={{ marginTop: "16px" }}>
              <h3 style={{ marginBottom: "8px" }}>Persona snapshot</h3>
              <p className="helper">{data.redditProfile.persona}</p>
            </div>
            <div style={{ marginTop: "16px" }}>
              <h3 style={{ marginBottom: "8px" }}>Traits</h3>
              <ul className="helper">
                {data.redditProfile.traits.map((trait, index) => (
                  <li key={`${trait}-${index}`}>{trait}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
        <div className="app-card">
          <h2>Answers</h2>
          <p className="helper">One option per scenario (A-H).</p>
          {loading ? (
            <p style={{ marginTop: "20px" }}>Loading answers...</p>
          ) : error ? (
            <div className="error">{error}</div>
          ) : data && data.responses?.length ? (
            <div className="answers-list" style={{ marginTop: "20px" }}>
              {runScenarios.map((question, index) => {
                const response = responseMap.get(question.id);
                return (
                  <div className="answer-row" key={question.id}>
                    <div className="answer-meta" style={{ alignItems: "flex-start" }}>
                      <div className="answer-question">
                        #{index + 1} {question.scenario}
                      </div>
                    </div>
                    <div className="scenario-option-grid">
                      {question.options.map((option) => (
                        <div
                          key={`${question.id}-${option.key}`}
                          className={`scenario-option ${response?.answer === option.key ? "active" : ""}`.trim()}
                        >
                          <span className="scenario-option-key">{option.key}</span>
                          <span>{option.text}</span>
                        </div>
                      ))}
                    </div>
                    {response?.rationale ? <div className="helper">{response.rationale}</div> : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
