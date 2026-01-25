"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QUESTIONS } from "@/lib/questions";
import SakinorvaResults, { STNF_TOOLTIP } from "@/app/components/SakinorvaResults";
import StnfMiniChart from "@/app/components/StnfMiniChart";
import RatingScaleHeader from "@/app/components/RatingScaleHeader";
import TypeBadges from "@/app/components/TypeBadges";
import { deriveTypesFromScores } from "@/lib/mbti";

const MIN_LENGTH = 2;
const MAX_LENGTH = 80;
const REDDIT_USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,20}$/;

type RunItem = {
  id: string;
  slug: string | null;
  character: string;
  context: string | null;
  grantType: string | null;
  axisType: string | null;
  myersType: string | null;
  functionScores: Record<string, number> | null;
  state: "QUEUED" | "PROCESSING" | "COMPLETED" | "ERROR";
  errors: number;
  createdAt: string;
  errorMessage?: string | null;
};

type RunApiItem = {
  id: string;
  slug: string;
  character: string;
  context: string | null;
  functionScores: Record<string, number> | null;
  state: "QUEUED" | "PROCESSING" | "COMPLETED" | "ERROR";
  errors: number;
  createdAt: string;
};

type RunDetail = {
  id: number;
  slug: string;
  character: string;
  context: string | null;
  redditProfile: { summary: string; persona: string; traits: string[] } | null;
  answers: number[] | null;
  explanations: string[] | null;
  functionScores: Record<string, number> | null;
  state: "QUEUED" | "PROCESSING" | "COMPLETED" | "ERROR";
  errors: number;
  createdAt: string;
};

type ResultsPayload = {
  runId: number;
  slug: string;
  character: string;
  context: string | null;
  functionScores: Record<string, number> | null;
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

const normalizeRedditUsername = (value: string) => value.trim().replace(/^u\//i, "");


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
  const [redditUsername, setRedditUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [redditError, setRedditError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [redditSubmitting, setRedditSubmitting] = useState(false);
  const [runs, setRuns] = useState<RunItem[]>([]);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [runsLoading, setRunsLoading] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(initialSlug ?? null);
  const [runDetail, setRunDetail] = useState<RunDetail | null>(null);
  const [runLoading, setRunLoading] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

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
          const items = (payload.items ?? []).map((item) => {
            const derived = item.functionScores ? deriveTypesFromScores(item.functionScores) : null;
            return {
              ...item,
              grantType: derived?.grantType ?? null,
              axisType: derived?.axisType ?? null,
              myersType: derived?.myersType ?? null,
              state: item.state ?? "COMPLETED",
              errors: item.errors ?? 0
            };
          });
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

  const derivedDetail = useMemo(
    () => (runDetail?.functionScores ? deriveTypesFromScores(runDetail.functionScores) : null),
    [runDetail]
  );

  const handleRowClick = (item: RunItem) => {
    if (item.state !== "COMPLETED" || !item.slug) {
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
      axisType: null,
      myersType: null,
      functionScores: null,
      state: "QUEUED",
      errors: 0,
      createdAt: new Date().toISOString(),
      errorMessage: null
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
      const derived = payload.functionScores ? deriveTypesFromScores(payload.functionScores) : null;
      setRuns((prev) =>
        prev.map((item) =>
          item.id === pendingId
            ? {
                ...item,
                id: payload.runId.toString(),
                slug: payload.slug,
                grantType: derived?.grantType ?? null,
                axisType: derived?.axisType ?? null,
                myersType: derived?.myersType ?? null,
                functionScores: payload.functionScores,
                createdAt: payload.createdAt,
                state: payload.state ?? "QUEUED",
                errors: payload.errors ?? 0
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
                state: "ERROR",
                errors: (item.errors ?? 0) + 1,
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

  const handleRedditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizeRedditUsername(redditUsername);
    if (!REDDIT_USERNAME_PATTERN.test(normalized)) {
      setRedditError("Reddit username must be 3-20 characters of letters, numbers, underscores, or hyphens.");
      return;
    }
    setRedditError(null);
    setRedditSubmitting(true);

    const pendingId = `pending-reddit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const pendingItem: RunItem = {
      id: pendingId,
      slug: null,
      character: `u/${normalized}`,
      context: null,
      grantType: null,
      axisType: null,
      myersType: null,
      functionScores: null,
      state: "QUEUED",
      errors: 0,
      createdAt: new Date().toISOString(),
      errorMessage: null
    };

    setRuns((prev) => [pendingItem, ...prev]);

    try {
      const response = await fetch("/api/run/reddit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: normalized
        })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to run the Reddit profile test.");
      }
      const payload = (await response.json()) as ResultsPayload;
      const derived = payload.functionScores ? deriveTypesFromScores(payload.functionScores) : null;
      setRuns((prev) =>
        prev.map((item) =>
          item.id === pendingId
            ? {
                ...item,
                id: payload.runId.toString(),
                slug: payload.slug,
                grantType: derived?.grantType ?? null,
                axisType: derived?.axisType ?? null,
                myersType: derived?.myersType ?? null,
                functionScores: payload.functionScores,
                createdAt: payload.createdAt,
                state: payload.state ?? "QUEUED",
                errors: payload.errors ?? 0,
                context: payload.context
              }
            : item
        )
      );
      setRedditUsername("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setRuns((prev) =>
        prev.map((item) =>
          item.id === pendingId
            ? {
                ...item,
                state: "ERROR",
                errors: (item.errors ?? 0) + 1,
                errorMessage: message
              }
            : item
        )
      );
      setRedditError(message);
    } finally {
      setRedditSubmitting(false);
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
          <h2>Run the Sakinorva test from Reddit activity</h2>
          <p className="helper">
            Enter a public Reddit username to build a psychological profile from their posts and
            comments, then run the test in their voice.
          </p>
          <form onSubmit={handleRedditSubmit} className="grid" style={{ marginTop: "24px" }}>
            <div className="form-grid">
              <div>
                <label className="label" htmlFor="reddit-username">
                  Reddit username
                </label>
                <input
                  id="reddit-username"
                  className="input"
                  value={redditUsername}
                  onChange={(event) => setRedditUsername(event.target.value)}
                  placeholder="u/username"
                  maxLength={25}
                  required
                />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <button type="submit" className="button" disabled={redditSubmitting}>
                {redditSubmitting ? "Loading…" : "Run Reddit Test"}
              </button>
              <span className="helper">Uses public Reddit posts and comments only.</span>
            </div>
            {redditError ? <div className="error">{redditError}</div> : null}
          </form>
        </div>
        <div className="app-card">
          <h2>Answer the Sakinorva test yourself</h2>
          <p className="helper">
            Respond directly on the 1–5 scale (1 = No, 5 = Yes) from a dedicated questions page.
          </p>
          <div style={{ marginTop: "20px" }}>
            <Link className="button secondary" href={`${basePath}/questions`}>
              Answer Sakinorva questions
            </Link>
          </div>
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
                    const isClickable = item.state === "COMPLETED" && !!item.slug;
                    const stnfValues = getStnfValues(item.functionScores);
                    const scoreRange = getScoreRange(item.functionScores);
                    const stateLabel = item.state === "PROCESSING" ? "QUEUED" : item.state;
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
                          <TypeBadges indicator="grant" functionScores={item.functionScores} />
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
                          <TypeBadges indicator="axis" functionScores={item.functionScores} />
                        </td>
                        <td>
                          <TypeBadges indicator="myers" functionScores={item.functionScores} />
                        </td>
                        <td>
                          <span
                            className={`status-pill ${
                              stateLabel === "QUEUED" ? "running" : stateLabel === "ERROR" ? "error" : ""
                            }`.trim()}
                            title={item.errorMessage || undefined}
                          >
                            {stateLabel}
                          </span>
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
                  {runDetail.state === "ERROR" ? (
                    <div className="error" style={{ marginTop: "20px" }}>
                      This run failed to complete after multiple attempts.
                    </div>
                  ) : runDetail.state !== "COMPLETED" ? (
                    <p className="helper" style={{ marginTop: "20px" }}>
                      Run is queued and will update once processing completes.
                    </p>
                  ) : (
                    <div style={{ marginTop: "20px" }}>
                      <SakinorvaResults
                        htmlFragment=""
                        functionScores={runDetail.functionScores}
                        mbtiMeta={derivedDetail}
                      />
                    </div>
                  )}
                </div>
                <div className="app-card">
                  <h3>Answers</h3>
                  <p className="helper">A 1–5 scale, where 1 is “No” and 5 is “Yes.”</p>
                  {runDetail.state === "COMPLETED" ? (
                    <div className="answers-list" style={{ marginTop: "20px" }}>
                      <RatingScaleHeader />
                      {(() => {
                        const answers = runDetail.answers ?? [];
                        const explanations = runDetail.explanations ?? [];
                        return QUESTIONS.map((question, index) => {
                          const answer = answers[index];
                          const explanation = explanations[index];
                          return (
                            <div className="answer-row" key={`${index}-${question}`}>
                              <div className="answer-meta">
                                <div className="answer-question">#{index + 1} {question}</div>
                                <div className="rating-bar" aria-label={`Answer ${answer ?? "—"}`}>
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
                        });
                      })()}
                    </div>
                  ) : (
                    <p className="helper" style={{ marginTop: "20px" }}>
                      Answers will appear once the run completes.
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
