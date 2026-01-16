"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QUESTIONS } from "@/lib/questions";

const MIN_LENGTH = 2;
const MAX_LENGTH = 80;

const FUNCTION_ORDER = ["Te", "Ti", "Fe", "Fi", "Ne", "Ni", "Se", "Si"] as const;

type HistoryItem = {
  id: string;
  slug: string | null;
  character: string;
  context: string | null;
  grantType: string | null;
  secondType: string | null;
  thirdType: string | null;
  axisType: string | null;
  myersType: string | null;
  createdAt: string;
  status: "ready" | "running" | "error";
  errorMessage?: string | null;
};

type HistoryApiItem = Omit<HistoryItem, "status" | "errorMessage">;

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
  createdAt: string;
};

type ResultsPayload = {
  historyId: number;
  slug: string;
  character: string;
  context: string | null;
  grantType: string | null;
  secondType: string | null;
  thirdType: string | null;
  axisType: string | null;
  myersType: string | null;
  createdAt: string;
};

const sanitizeHtml = (input: string) => {
  if (typeof window === "undefined") {
    return "";
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, "text/html");
  const allowedTags = new Set(["DIV", "SPAN", "STYLE"]);
  const allowedAttrs = new Set(["class", "id"]);

  const walk = (node: Element) => {
    Array.from(node.children).forEach((child) => {
      if (!allowedTags.has(child.tagName)) {
        child.remove();
        return;
      }
      Array.from(child.attributes).forEach((attr) => {
        if (!allowedAttrs.has(attr.name)) {
          child.removeAttribute(attr.name);
        }
        if (attr.name.startsWith("on")) {
          child.removeAttribute(attr.name);
        }
      });
      walk(child);
    });
  };

  if (doc.body) {
    walk(doc.body);
  }

  return doc.body?.innerHTML ?? "";
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

export default function HomePage({ initialSlug }: { initialSlug?: string | null }) {
  const router = useRouter();
  const [character, setCharacter] = useState("");
  const [context, setContext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(initialSlug ?? null);
  const [runDetail, setRunDetail] = useState<RunDetail | null>(null);
  const [runLoading, setRunLoading] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    setActiveSlug(initialSlug ?? null);
  }, [initialSlug]);

  useEffect(() => {
    let active = true;
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const response = await fetch("/api/history");
        if (!response.ok) {
          throw new Error("Failed to load previous results.");
        }
        const payload = (await response.json()) as { items: HistoryApiItem[] };
        if (active) {
          const items = (payload.items ?? []).map((item) => ({
            ...item,
            status: "ready" as const
          }));
          setHistory(items);
        }
      } catch (err) {
        if (active) {
          setHistoryError(err instanceof Error ? err.message : "Unexpected error.");
        }
      } finally {
        if (active) {
          setHistoryLoading(false);
        }
      }
    };

    loadHistory();

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
        const response = await fetch(`/api/history/slug/${activeSlug}`);
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

  const sanitizedResults = useMemo(() => {
    if (!runDetail?.resultsHtmlFragment) {
      return "";
    }
    return sanitizeHtml(runDetail.resultsHtmlFragment);
  }, [runDetail?.resultsHtmlFragment]);

  const scoreIntensity = useMemo(() => normalizeScores(runDetail?.functionScores ?? null), [runDetail]);

  const handleRowClick = (item: HistoryItem) => {
    if (item.status !== "ready" || !item.slug) {
      return;
    }
    setActiveSlug(item.slug);
    router.push(`/sakinorva/${item.slug}`);
  };

  const handleModalClose = () => {
    setActiveSlug(null);
    router.push("/");
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
    const pendingItem: HistoryItem = {
      id: pendingId,
      slug: null,
      character: trimmed,
      context: context.trim() || null,
      grantType: null,
      secondType: null,
      thirdType: null,
      axisType: null,
      myersType: null,
      createdAt: new Date().toISOString(),
      status: "running"
    };

    setHistory((prev) => [pendingItem, ...prev]);

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
      setHistory((prev) =>
        prev.map((item) =>
          item.id === pendingId
            ? {
                ...item,
                id: payload.historyId.toString(),
                slug: payload.slug,
                grantType: payload.grantType,
                secondType: payload.secondType,
                thirdType: payload.thirdType,
                axisType: payload.axisType,
                myersType: payload.myersType,
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
      setHistory((prev) =>
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
          <h2>Runs</h2>
          <p className="helper">Click a completed row to revisit the full answers and Sakinorva results.</p>
          {historyLoading ? (
            <p style={{ marginTop: "20px" }}>Loading history…</p>
          ) : historyError ? (
            <div className="error">{historyError}</div>
          ) : history.length ? (
            <div className="table-wrapper" style={{ marginTop: "20px" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Character</th>
                    <th>Context</th>
                    <th>GFT</th>
                    <th>2nd</th>
                    <th>3rd</th>
                    <th>Axis</th>
                    <th>Myers</th>
                    <th>Run</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => {
                    const isClickable = item.status === "ready" && !!item.slug;
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
                          {renderTypeCell(item.thirdType)}
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
                            <span className="status-pill">{formatDate(item.createdAt)}</span>
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
            <div className="function-row">
              {FUNCTION_ORDER.map((func) => {
                const score = runDetail?.functionScores?.[func];
                const intensity = scoreIntensity?.[func] ?? 0.7;
                return (
                  <span
                    key={func}
                    className={`function-pill function-${func.toLowerCase()}`}
                    style={{ opacity: intensity }}
                    title={score !== undefined ? `${func}: ${score}` : `${func}: score unavailable`}
                  >
                    {func}
                  </span>
                );
              })}
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
                    <div className="sakinorva-results" dangerouslySetInnerHTML={{ __html: sanitizedResults }} />
                    <style>{runDetail.resultsCss}</style>
                  </div>
                </div>
                <div className="app-card">
                  <h3>Answers</h3>
                  <p className="helper">A 1–5 scale, where 1 is “No” and 5 is “Yes.”</p>
                  <div className="answers-list" style={{ marginTop: "20px" }}>
                    {QUESTIONS.map((question, index) => {
                      const answer = runDetail.answers[index];
                      const explanation = runDetail.explanations[index];
                      return (
                        <div className="answer-row" key={question}>
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
