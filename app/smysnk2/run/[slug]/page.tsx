"use client";

import { useEffect, useMemo, useState } from "react";
import {
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

const formatPercent = (value: number) => `${value.toFixed(1)}%`;
const formatPercentInt = (value: number) => `${Math.round(value)}%`;

const formatStack = (stack: string[]) => stack.join(" > ");

type GrantStyle = "IEIE" | "EIEI";

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

const getMatchedTypeForFunction = (
  analysis: {
    typeMatching: {
      best: { type: string; confidence: number; stack: string[] } | null;
      alternatives: { type: string; confidence: number; stack: string[] }[];
    };
  },
  functionKey: string | null
) => {
  if (!functionKey) {
    return "-";
  }
  const candidates = [
    analysis.typeMatching.best,
    ...analysis.typeMatching.alternatives
  ].filter((candidate): candidate is { type: string; confidence: number; stack: string[] } => Boolean(candidate));
  if (!candidates.length) {
    return "-";
  }

  const ranked = [...candidates].sort((left, right) => {
    const leftIndex = left.stack.indexOf(functionKey);
    const rightIndex = right.stack.indexOf(functionKey);
    const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
    if (normalizedLeft !== normalizedRight) {
      return normalizedLeft - normalizedRight;
    }
    return right.confidence - left.confidence;
  });
  return ranked[0]?.type ?? "-";
};

const getTurbulentTopType = (analysis: Smysnk2Analysis) => {
  const tally = new Map<string, { sum: number; count: number }>();
  analysis.turbulentMode.contexts.forEach((context) => {
    const best = context.typeMatching.best;
    if (!best) {
      return;
    }
    const current = tally.get(best.type) ?? { sum: 0, count: 0 };
    current.sum += best.confidence;
    current.count += 1;
    tally.set(best.type, current);
  });

  const ranked = [...tally.entries()]
    .map(([type, value]) => ({
      type,
      confidence: value.count ? value.sum / value.count : 0,
      count: value.count
    }))
    .sort((left, right) => right.confidence - left.confidence || right.count - left.count || left.type.localeCompare(right.type));

  return ranked[0] ?? null;
};

export default function Smysnk2RunPage({ params }: { params: { slug: string } }) {
  const [data, setData] = useState<Smysnk2RunPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoringTab, setScoringTab] = useState<"assertive" | "turbulent">("assertive");
  const [manualTabSelection, setManualTabSelection] = useState(false);
  const [selectedAssertiveType, setSelectedAssertiveType] = useState<string | null>(null);

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

  const assertiveTotalResponses = useMemo(() => {
    const analysis = data?.analysis;
    if (!analysis) {
      return 0;
    }
    const fromAssertive = (analysis.assertiveMode as { totalResponses?: number } | undefined)?.totalResponses;
    return typeof fromAssertive === "number" ? fromAssertive : analysis.totalResponses;
  }, [data?.analysis]);

  const assertiveTypeOptions = useMemo(() => {
    if (!assertiveTypeMatching) {
      return [];
    }
    const raw = [
      assertiveTypeMatching.best,
      ...assertiveTypeMatching.alternatives
    ].filter(
      (match): match is NonNullable<typeof assertiveTypeMatching.best> => Boolean(match)
    );
    const unique = new Map<string, (typeof raw)[number]>();
    raw.forEach((match) => {
      if (!unique.has(match.type)) {
        unique.set(match.type, match);
      }
    });
    return [...unique.values()];
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
    setManualTabSelection(false);
    setSelectedAssertiveType(null);
  }, [params.slug]);

  return (
    <main>
      <div className="grid two">
        <div className="app-card">
          <h2>SMYSNK2 results</h2>
          {loading ? (
            <p style={{ marginTop: "20px" }}>Loading results...</p>
          ) : error ? (
            <div className="error">{error}</div>
          ) : data ? (
            <div style={{ marginTop: "20px" }}>
              <p className="helper">
                {data.subject ? <strong>{data.subject}</strong> : "Unnamed run"}
                {data.context ? ` - ${data.context}` : ""}
              </p>
              <p className="helper">Run mode: {data.runMode === "ai" ? "AI roleplay" : data.runMode === "reddit" ? "Reddit profile" : "Self answer"}</p>
              <p className="helper">Question mode: {getModeLabel(mode)}</p>
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

                          {scoringTab === "assertive" ? (
                            <div style={{ display: "grid", gap: "12px" }}>
                              <div className="answer-row">
                                <div className="answer-meta">
                                  <div className="answer-question">
                                    Assertive mode | {assertiveTotalResponses} responses
                                  </div>
                                  <div className="badge">
                                    {formatTypeWithConfidence(
                                      selectedAssertiveTypeMatch?.type ?? assertiveTypeMatching?.best?.type ?? null,
                                      selectedAssertiveTypeMatch?.confidence ??
                                        assertiveTypeMatching?.best?.confidence ??
                                        0
                                    )}
                                  </div>
                                </div>
                                <p className="helper">
                                  Assertive scoring is consolidated into a single MBTI decision using all archetype
                                  and shadow hits together.
                                </p>
                                <p className="helper">
                                  Grant style: {assertiveTypeMatching?.grantStyles[0]?.style ?? "-"}{" "}
                                  {formatPercent(assertiveTypeMatching?.grantStyles[0]?.confidence ?? 0)}
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

                                <div className="table-wrapper">
                                  <table className="data-table">
                                    <thead>
                                      <tr>
                                        <th>Archetype</th>
                                        <th>Function</th>
                                        <th>Confidence</th>
                                        <th>Hits</th>
                                        <th>Responses</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {assertiveArchetypeRows.map((row) => (
                                        <tr key={`assertive-${row.archetype}`}>
                                          <td>{row.label}</td>
                                          <td>{row.expectedFunction}</td>
                                          <td>{formatPercent(row.confidenceForType)}</td>
                                          <td>{row.hitsForType}</td>
                                          <td>{row.total}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: "grid", gap: "12px" }}>
                              <div className="answer-row">
                                <div className="answer-meta">
                                  <div className="answer-question">Turbulent mode</div>
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
                                  const bestType = context.typeMatching.best;
                                  const alternatives = context.typeMatching.alternatives
                                    .slice(0, 2)
                                    .map((alt) => `${alt.type} ${formatPercent(alt.confidence)}`)
                                    .join(" | ");
                                  const archetypeRows = context.archetypeBreakdown.filter((row) => row.total > 0);

                                  return (
                                    <div className="answer-row smysnk2-context-card" key={context.context}>
                                      <div className="answer-meta">
                                        <div>
                                          <div className="answer-question">{context.label}</div>
                                          <p className="helper" style={{ marginTop: "4px" }}>
                                            {context.polarity} | {context.totalResponses} responses
                                          </p>
                                        </div>
                                        <div className="badge">{bestType?.type ?? "-"}</div>
                                      </div>

                                      <div className="smysnk2-context-metrics">
                                        <div className="smysnk2-context-metric">
                                          <p className="helper">Best type</p>
                                          <p className="smysnk2-metric-value">{bestType?.type ?? "-"}</p>
                                          <p className="helper">{formatPercent(bestType?.confidence ?? 0)}</p>
                                        </div>
                                        <div className="smysnk2-context-metric">
                                          <p className="helper">Grant split</p>
                                          <div className="smysnk2-grant-split">
                                            <span>IEIE {formatPercent(ieie)}</span>
                                            <span>EIEI {formatPercent(eiei)}</span>
                                          </div>
                                          <div className="smysnk2-grant-track" role="img" aria-label={`IEIE ${formatPercent(ieie)}, EIEI ${formatPercent(eiei)}`}>
                                            <div className="smysnk2-grant-fill" style={{ width: `${ieie}%` }} />
                                          </div>
                                          <p className="helper">
                                            Delta {formatPercent(Math.abs(leadingStyleScore - trailingStyleScore))}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="smysnk2-context-chart">
                                        <div className="smysnk2-context-chart-head">
                                          <p className="helper">Archetype match chart</p>
                                          <p className="helper">Matched MBTI by function hit</p>
                                        </div>
                                        {archetypeRows.length ? (
                                          archetypeRows.map((row) => {
                                            const rowType = getMatchedTypeForFunction(
                                              context,
                                              row.leadingFunction
                                            );
                                            return (
                                              <div className="smysnk2-archetype-row" key={`${context.context}-${row.archetype}`}>
                                                <div className="smysnk2-archetype-meta">
                                                  <span className="smysnk2-archetype-name">{row.label}</span>
                                                  <span className="smysnk2-archetype-details">
                                                    {row.leadingFunction ?? "-"} | {rowType} | {row.total} responses
                                                  </span>
                                                </div>
                                                <div
                                                  className="smysnk2-archetype-track"
                                                  role="img"
                                                  aria-label={`${row.label} confidence ${formatPercent(row.confidence)}`}
                                                >
                                                  <div
                                                    className="smysnk2-archetype-fill"
                                                    style={{ width: `${row.confidence}%` }}
                                                  />
                                                </div>
                                              </div>
                                            );
                                          })
                                        ) : (
                                          <p className="helper">No archetype matches recorded for this context yet.</p>
                                        )}
                                      </div>

                                      <p className="helper">
                                        Next best: {alternatives || "-"}
                                      </p>
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

                      {data.analysis?.typeMatching.best ? (
                        <div className="answer-row">
                          <div className="answer-meta">
                            <div className="answer-question">
                              Overall best match: {data.analysis.typeMatching.best.type}
                            </div>
                            <div className="badge">{formatPercent(data.analysis.typeMatching.best.confidence)}</div>
                          </div>
                          <p className="helper">Grant style: {data.analysis.typeMatching.best.grantStyle}</p>
                          <p className="helper">Stack: {formatStack(data.analysis.typeMatching.best.stack)}</p>
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
