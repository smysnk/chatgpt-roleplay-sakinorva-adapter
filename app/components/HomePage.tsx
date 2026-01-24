"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QUESTIONS } from "@/lib/questions";
import SakinorvaResults, { STNF_TOOLTIP } from "@/app/components/SakinorvaResults";
import StnfMiniChart from "@/app/components/StnfMiniChart";
import RatingScaleHeader from "@/app/components/RatingScaleHeader";

const MIN_LENGTH = 2;
const MAX_LENGTH = 80;

type RunItem = {
  id: string;
  slug: string | null;
  character: string;
  context: string | null;
  grantType: string | null;
  secondType: string | null;
  thirdType: string | null;
  axisType: string | null;
  myersType: string | null;
  functionScores: Record<string, number> | null;
  createdAt: string;
  status: "ready" | "running" | "error";
  errorMessage?: string | null;
};

type RunApiItem = Omit<RunItem, "status" | "errorMessage">;

type RunDetail = {
  id: number;
  slug: string;
  character: string;
  context: string | null;
  answers: number[];
  explanations: string[];
  resultsHtmlFragment: string;
  resultsCss: string;
  functionScores: Record<string, number> | null;
  grantType: string | null;
  axisType: string | null;
  myersType: string | null;
  createdAt: string;
};

type ResultsPayload = {
  runId: number;
  slug: string;
  character: string;
  context: string | null;
  grantType: string | null;
  secondType: string | null;
  thirdType: string | null;
  axisType: string | null;
  myersType: string | null;
  functionScores: Record<string, number> | null;
  createdAt: string;
};


const formatDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
};

const getTypeLetters = (typeValue: string | null) => {
  if (!typeValue) {
    return [];
  }
  return typeValue
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .split("")
    .filter(Boolean);
};

const renderTypeCell = (typeValue: string | null) => {
  const letters = getTypeLetters(typeValue);
  if (!letters.length) {
    return <span className="helper">—</span>;
  }
  return (
    <span className="type-badges">
      {letters.map((letter, index) => (
        <span key={`${letter}-${index}`} className={`type-letter ${letter.toLowerCase()}`}>
          {letter}
        </span>
      ))}
    </span>
  );
};

const normalizeScores = (scores: Record<string, number> | null) => {
  if (!scores) {
    return null;
  }
  const values = Object.values(scores).filter((value) => Number.isFinite(value));
  if (!values.length) {
    return null;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return Object.fromEntries(Object.keys(scores).map((key) => [key, 0.85]));
  }
  return Object.fromEntries(
    Object.entries(scores).map(([key, value]) => {
      const normalized = (value - min) / (max - min);
      const intensity = 0.35 + normalized * 0.65;
      return [key, Number.isFinite(intensity) ? intensity : 0.6];
    })
  );
};

const getStnfValues = (scores: Record<string, number> | null) => {
  if (!scores) {
    return null;
  }
  const value = (key: string) => scores?.[key] ?? 0;
  return {
    sensing: { extroverted: value("Se"), introverted: value("Si") },
    thinking: { extroverted: value("Te"), introverted: value("Ti") },
    intuition: { extroverted: value("Ne"), introverted: value("Ni") },
    feeling: { extroverted: value("Fe"), introverted: value("Fi") }
  };
};

const getScoreRange = (scores: Record<string, number> | null) => {
  if (!scores) {
    return null;
  }
  const values = Object.values(scores).filter((value) => Number.isFinite(value));
  if (!values.length) {
    return null;
  }
  return {
    min: Math.min(...values),
    max: Math.max(...values)
  };
};

export default function HomePage({ initialSlug }: { initialSlug?: string | null }) {
  const router = useRouter();
  const basePath = "/sakinorva-adapter";
  const [character, setCharacter] = useState("");
  const [context, setContext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [runs, setRuns] = useState<RunItem[]>([]);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [runsLoading, setRunsLoading] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(initialSlug ?? null);
  const [runDetail, setRunDetail] = useState<RunDetail | null>(null);
  const [runLoading, setRunLoading] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [manualAnswers, setManualAnswers] = useState<number[]>(
    () => Array.from({ length: QUESTIONS.length }, () => 0)
  );
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSlug, setManualSlug] = useState<string | null>(null);

  useEffect(() => {
    setActiveSlug(initialSlug ?? null);
  }, [initialSlug]);

  useEffect(() => {
    let active = true;
    const loadRuns = async () => {
      setRunsLoading(true);
      try {
        const response = await fetch("/api/run");
        if (!response.ok) {
          throw new Error("Failed to load previous results.");
        }
        const payload = (await response.json()) as { items: RunApiItem[] };
        if (active) {
          const items = (payload.items ?? []).map((item) => ({
            ...item,
            status: "ready" as const
          }));
          setRuns(items);
        }
      } catch (err) {
        if (active) {
          setRunsError(err instanceof Error ? err.message : "Unexpected error.");
        }
      } finally {
        if (active) {
          setRunsLoading(false);
        }
      }
    };

    loadRuns();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!activeSlug) {
      setRunDetail(null);
      setRunError(null);
      return;
    }
    let active = true;
    const loadRun = async () => {
      setRunLoading(true);
      setRunError(null);
      try {
        const response = await fetch(`/api/run/slug/${activeSlug}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Failed to load run details.");
        }
        const payload = (await response.json()) as RunDetail;
        if (active) {
          setRunDetail(payload);
        }
      } catch (err) {
        if (active) {
          setRunError(err instanceof Error ? err.message : "Unexpected error.");
        }
      } finally {
        if (active) {
          setRunLoading(false);
        }
      }
    };

    loadRun();

    return () => {
      active = false;
    };
  }, [activeSlug]);

  const scoreIntensity = useMemo(() => normalizeScores(runDetail?.functionScores ?? null), [runDetail]);

  const handleRowClick = (item: RunItem) => {
    if (item.status !== "ready" || !item.slug) {
      return;
    }
    setActiveSlug(item.slug);
    router.push(`${basePath}/run/${item.slug}`);
  };

  const handleModalClose = () => {
    setActiveSlug(null);
    router.push(basePath);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = character.trim();
    if (trimmed.length < MIN_LENGTH || trimmed.length > MAX_LENGTH) {
      setError(`Character name must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters.`);
      return;
    }
    setError(null);
    setSubmitting(true);

    const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const pendingItem: RunItem = {
      id: pendingId,
      slug: null,
      character: trimmed,
      context: context.trim() || null,
      grantType: null,
      secondType: null,
      thirdType: null,
      axisType: null,
      myersType: null,
      functionScores: null,
      createdAt: new Date().toISOString(),
      status: "running"
    };

    setRuns((prev) => [pendingItem, ...prev]);

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          character: trimmed,
          context: context.trim()
        })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to run the test.");
      }
      const payload = (await response.json()) as ResultsPayload;
      setRuns((prev) =>
        prev.map((item) =>
          item.id === pendingId
            ? {
                ...item,
                id: payload.runId.toString(),
                slug: payload.slug,
                grantType: payload.grantType,
                secondType: payload.secondType,
                thirdType: payload.thirdType,
                axisType: payload.axisType,
                myersType: payload.myersType,
                functionScores: payload.functionScores,
                createdAt: payload.createdAt,
                status: "ready"
              }
            : item
        )
      );
      setCharacter("");
      setContext("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setRuns((prev) =>
        prev.map((item) =>
          item.id === pendingId
            ? {
                ...item,
                status: "error",
                errorMessage: message
              }
            : item
        )
      );
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualAnswer = (index: number, value: number) => {
    setManualAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleManualSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const label = manualName.trim() || "Self";
    if (label.length < MIN_LENGTH || label.length > MAX_LENGTH) {
      setManualError(`Run label must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters.`);
      return;
    }
    if (manualAnswers.some((answer) => answer < 1 || answer > 5)) {
      setManualError("Please answer every question on the 1–5 scale.");
      return;
    }
    setManualError(null);
    setManualSubmitting(true);
    setManualSlug(null);
    try {
      const response = await fetch("/api/run/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          character: label,
          context: manualNotes.trim(),
          answers: manualAnswers
        })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to submit the manual run.");
      }
      const payload = (await response.json()) as ResultsPayload;
      setManualSlug(payload.slug);
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setManualSubmitting(false);
    }
  };

  return (
    <main>
      <div className="stack">
        <div className="app-card">
          <h1>Run the Sakinorva test as a character</h1>
          <p className="helper">
            Generate a full 96-question Sakinorva response in the voice of a fictional or historical
            figure, submit it to the official test, and review the results.
          </p>
          <form onSubmit={handleSubmit} className="grid" style={{ marginTop: "24px" }}>
            <div className="form-grid">
              <div>
                <label className="label" htmlFor="character">
                  Character
                </label>
                <input
                  id="character"
                  className="input"
                  value={character}
                  onChange={(event) => setCharacter(event.target.value)}
                  placeholder="Sherlock Holmes"
                  maxLength={MAX_LENGTH}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="context">
                  Context / portrayal notes (optional)
                </label>
                <textarea
                  id="context"
                  className="textarea"
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  placeholder="BBC Sherlock S2–S3, Original Trilogy only, etc."
                />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <button type="submit" className="button" disabled={submitting}>
                {submitting ? "Loading…" : "Run Test"}
              </button>
              <span className="helper">OpenAI is called server-side only.</span>
            </div>
            {error ? <div className="error">{error}</div> : null}
          </form>
        </div>
        <div className="app-card">
          <h2>Answer the Sakinorva test yourself</h2>
          <p className="helper">
            Respond directly on the 1–5 scale (1 = No, 5 = Yes). We will submit your answers to
            Sakinorva and save a permalink to the results.
          </p>
          <form onSubmit={handleManualSubmit} className="grid" style={{ marginTop: "24px" }}>
            <div className="form-grid">
              <div>
                <label className="label" htmlFor="manual-name">
                  Run label
                </label>
                <input
                  id="manual-name"
                  className="input"
                  value={manualName}
                  onChange={(event) => setManualName(event.target.value)}
                  placeholder="Self"
                  maxLength={MAX_LENGTH}
                />
              </div>
              <div>
                <label className="label" htmlFor="manual-notes">
                  Notes (optional)
                </label>
                <textarea
                  id="manual-notes"
                  className="textarea"
                  value={manualNotes}
                  onChange={(event) => setManualNotes(event.target.value)}
                  placeholder="Any context you want to save with the run."
                />
              </div>
            </div>
            <div className="answers-list">
              <RatingScaleHeader />
              {QUESTIONS.map((question, index) => (
                <div className="answer-row" key={`${index}-${question}`}>
                  <div className="answer-meta">
                    <div className="answer-question">#{index + 1} {question}</div>
                    <div className="rating-bar" aria-label={`Manual answer ${index + 1}`}>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          type="button"
                          key={value}
                          className={`rating-pill value-${value} ${
                            manualAnswers[index] === value ? "active" : ""
                          }`}
                          onClick={() => handleManualAnswer(index, value)}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <button type="submit" className="button" disabled={manualSubmitting}>
                {manualSubmitting ? "Submitting…" : "Save manual run"}
              </button>
              {manualSlug ? (
                <Link className="button secondary" href={`${basePath}/run/${manualSlug}`}>
                  View saved results
                </Link>
              ) : null}
            </div>
            {manualError ? <div className="error">{manualError}</div> : null}
          </form>
        </div>
        <div className="app-card">
          <h2>Runs</h2>
          <p className="helper">
            AI roleplay runs appear here. Click a completed row to revisit the full answers and
            Sakinorva results.
          </p>
          {runsLoading ? (
            <p style={{ marginTop: "20px" }}>Loading runs…</p>
          ) : runsError ? (
            <div className="error">{runsError}</div>
          ) : runs.length ? (
            <div className="table-wrapper" style={{ marginTop: "20px" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Character</th>
                    <th>Context</th>
                    <th>GFT</th>
                    <th>2nd</th>
                    <th>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        STNF
                        <span className="stnf-help" title={STNF_TOOLTIP} aria-label={STNF_TOOLTIP}>
                          ?
                        </span>
                      </span>
                    </th>
                    <th>Axis</th>
                    <th>Myers</th>
                    <th>Run</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((item) => {
                    const isClickable = item.status === "ready" && !!item.slug;
                    const stnfValues = getStnfValues(item.functionScores);
                    const scoreRange = getScoreRange(item.functionScores);
                    return (
                      <tr
                        key={item.id}
                        className={isClickable ? "is-clickable" : "is-disabled"}
                        role={isClickable ? "button" : undefined}
                        tabIndex={isClickable ? 0 : -1}
                        onClick={() => handleRowClick(item)}
                        onKeyDown={(event) => {
                          if (!isClickable) {
                            return;
                          }
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleRowClick(item);
                          }
                        }}
                        aria-disabled={!isClickable}
                      >
                        <td>{item.character}</td>
                        <td>
                          <span
                            className={`badge ${item.context ? "" : "muted"}`}
                            title={item.context || "No context provided."}
                          >
                            Context
                          </span>
                        </td>
                        <td>
                          {renderTypeCell(item.grantType)}
                        </td>
                        <td>
                          {renderTypeCell(item.secondType)}
                        </td>
                        <td>
                          {stnfValues ? (
                            <StnfMiniChart
                              sensing={stnfValues.sensing}
                              thinking={stnfValues.thinking}
                              intuition={stnfValues.intuition}
                              feeling={stnfValues.feeling}
                              minScore={scoreRange?.min}
                              maxScore={scoreRange?.max}
                            />
                          ) : (
                            <span className="helper">—</span>
                          )}
                        </td>
                        <td>
                          {renderTypeCell(item.axisType)}
                        </td>
                        <td>
                          {renderTypeCell(item.myersType)}
                        </td>
                        <td>
                          {item.status === "running" ? (
                            <span className="status-pill running">Running…</span>
                          ) : item.status === "error" ? (
                            <span className="status-pill error" title={item.errorMessage || "Run failed."}>
                              Error
                            </span>
                          ) : (
                            formatDate(item.createdAt)
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ marginTop: "20px" }} className="helper">
              No runs saved yet. Start by running a character.
            </p>
          )}
        </div>
      </div>
      {activeSlug ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2>Run</h2>
                {runDetail ? (
                  <p className="helper">
                    Generated for <strong>{runDetail.character}</strong>
                    {runDetail.context ? ` — ${runDetail.context}` : ""}
                  </p>
                ) : null}
              </div>
              <button type="button" className="button secondary" onClick={handleModalClose}>
                Close
              </button>
            </div>
            {runLoading ? (
              <p style={{ marginTop: "20px" }}>Loading run…</p>
            ) : runError ? (
              <div className="error">{runError}</div>
            ) : runDetail ? (
              <div className="modal-body grid two" style={{ marginTop: "20px" }}>
                <div className="app-card">
                  <h3>Results</h3>
                  <div style={{ marginTop: "20px" }}>
                    <SakinorvaResults
                      htmlFragment={runDetail.resultsHtmlFragment}
                      functionScores={runDetail.functionScores}
                      mbtiMeta={{
                        grantType: runDetail.grantType,
                        axisType: runDetail.axisType,
                        myersType: runDetail.myersType
                      }}
                    />
                  </div>
                </div>
                <div className="app-card">
                  <h3>Answers</h3>
                  <p className="helper">A 1–5 scale, where 1 is “No” and 5 is “Yes.”</p>
                  <div className="answers-list" style={{ marginTop: "20px" }}>
                    <RatingScaleHeader />
                    {QUESTIONS.map((question, index) => {
                      const answer = runDetail.answers[index];
                      const explanation = runDetail.explanations[index];
                      return (
                        <div className="answer-row" key={`${index}-${question}`}>
                          <div className="answer-meta">
                            <div className="answer-question">#{index + 1} {question}</div>
                            <div className="rating-bar" aria-label={`Answer ${answer}`}>
                              {[1, 2, 3, 4, 5].map((value) => (
                                <span
                                  key={value}
                                  className={`rating-pill value-${value} ${value === answer ? "active" : ""}`}
                                >
                                  {value}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="helper">{explanation}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
