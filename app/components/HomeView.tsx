"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type CSSProperties } from "react";
import { QUESTIONS } from "@/lib/questions";
import { extractRunId } from "@/lib/slug";
import { sanitizeHtml } from "@/lib/sanitize";

const MIN_LENGTH = 2;
const MAX_LENGTH = 80;

const FUNCTION_ORDER = ["Se", "Si", "Ne", "Ni", "Te", "Ti", "Fe", "Fi"] as const;

type TypeSummary = {
  gft?: string;
  second?: string;
  third?: string;
  axis?: string;
  myers?: string;
};

type HistoryItem = {
  id: number | string;
  character: string;
  context: string | null;
  createdAt?: string;
  slug?: string;
  typeSummary?: TypeSummary;
  status: "complete" | "pending" | "error";
  errorMessage?: string;
};

type HistoryResponse = {
  items: Array<{
    id: number;
    character: string;
    context: string | null;
    createdAt: string;
    slug: string;
    typeSummary?: TypeSummary;
  }>;
};

type RunDetail = {
  id: number;
  character: string;
  context: string | null;
  answers: number[];
  explanations: string[];
  resultsHtmlFragment: string;
  resultsCss: string;
  createdAt: string;
  slug: string;
  typeSummary?: TypeSummary;
  functionScores?: Array<{ function: string; score: number }>;
};

type RunResponse = {
  historyId: number;
  slug: string;
  createdAt: string;
  typeSummary?: TypeSummary;
};

type HomeViewProps = {
  modalSlug?: string | null;
};

const formatDate = (value: string | undefined) => {
  if (!value) {
    return "—";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
};

const renderTypeBadge = (value?: string) => {
  if (!value) {
    return <span className="type-empty">—</span>;
  }
  return (
    <span className="type-badge" aria-label={`Type ${value}`}>
      {value.split("").map((letter, index) => {
        const normalized = letter.toUpperCase();
        const className =
          normalized === "F"
            ? "type-letter type-letter-f"
            : normalized === "T"
              ? "type-letter type-letter-t"
              : normalized === "N"
                ? "type-letter type-letter-n"
                : normalized === "S"
                  ? "type-letter type-letter-s"
                  : "type-letter";
        return (
          <span key={`${letter}-${index}`} className={className}>
            {letter}
          </span>
        );
      })}
    </span>
  );
};

function RunModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [data, setData] = useState<RunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = extractRunId(slug);
    if (!id) {
      setError("Invalid run identifier.");
      return;
    }
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/history/${id}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Failed to load run details.");
        }
        const payload = (await response.json()) as RunDetail;
        if (active) {
          setData(payload);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unexpected error.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [slug]);

  const sanitizedResults = useMemo(() => {
    if (!data?.resultsHtmlFragment) {
      return "";
    }
    return sanitizeHtml(data.resultsHtmlFragment);
  }, [data?.resultsHtmlFragment]);

  const functionScores = useMemo(() => {
    const map = new Map<string, number>();
    data?.functionScores?.forEach((entry) => {
      map.set(entry.function, entry.score);
    });
    return map;
  }, [data?.functionScores]);

  const maxScore = useMemo(() => {
    if (!data?.functionScores?.length) {
      return 0;
    }
    return Math.max(...data.functionScores.map((score) => score.score));
  }, [data?.functionScores]);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <h2>Run</h2>
            {data ? (
              <p className="helper">
                Generated for <strong>{data.character}</strong>
                {data.context ? ` — ${data.context}` : ""}
              </p>
            ) : null}
          </div>
          <button type="button" className="button secondary" onClick={onClose}>
            Close
          </button>
        </div>
        {loading ? (
          <p style={{ marginTop: "20px" }}>Loading run…</p>
        ) : error ? (
          <div className="error">{error}</div>
        ) : data ? (
          <div className="modal-body">
            <div className="function-score-grid">
              {FUNCTION_ORDER.map((functionLabel) => {
                const score = functionScores.get(functionLabel) ?? 0;
                const intensity = maxScore > 0 ? score / maxScore : 0.25;
                return (
                  <span
                    key={functionLabel}
                    className="function-score"
                    data-function={functionLabel}
                    style={{ "--intensity": intensity } as CSSProperties}
                    title={`${functionLabel}: ${score || "—"}`}
                  >
                    {functionLabel}
                  </span>
                );
              })}
            </div>
            <div className="modal-grid">
              <div>
                <div className="sakinorva-results" dangerouslySetInnerHTML={{ __html: sanitizedResults }} />
                <style>{data.resultsCss}</style>
              </div>
              <div>
                <h3>Answers</h3>
                <p className="helper">A 1–5 scale, where 1 is “No” and 5 is “Yes.”</p>
                <div className="answers-list" style={{ marginTop: "20px" }}>
                  {QUESTIONS.map((question, index) => {
                    const answer = data.answers[index];
                    const explanation = data.explanations[index];
                    return (
                      <div className="answer-row" key={question}>
                        <div className="answer-meta">
                          <div className="answer-question">
                            #{index + 1} {question}
                          </div>
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
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function HomeView({ modalSlug }: HomeViewProps) {
  const router = useRouter();
  const [character, setCharacter] = useState("");
  const [context, setContext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const response = await fetch("/api/history");
        if (!response.ok) {
          throw new Error("Failed to load previous runs.");
        }
        const payload = (await response.json()) as HistoryResponse;
        if (active) {
          setHistory(
            (payload.items ?? []).map((item) => ({
              ...item,
              status: "complete" as const
            }))
          );
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = character.trim();
    if (trimmed.length < MIN_LENGTH || trimmed.length > MAX_LENGTH) {
      setError(`Character name must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters.`);
      return;
    }
    setError(null);
    setSubmitting(true);

    const tempId = `pending-${Date.now()}`;
    const pendingItem: HistoryItem = {
      id: tempId,
      character: trimmed,
      context: context.trim() || null,
      status: "pending"
    };

    setHistory((prev) => [pendingItem, ...prev]);

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ character: trimmed, context })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to run the test.");
      }
      const payload = (await response.json()) as RunResponse;
      setHistory((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? {
                id: payload.historyId,
                character: trimmed,
                context: context.trim() || null,
                createdAt: payload.createdAt,
                slug: payload.slug,
                typeSummary: payload.typeSummary,
                status: "complete"
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
          item.id === tempId
            ? {
                ...item,
                status: "error",
                errorMessage: message
              }
            : item
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main>
      <div className="grid">
        <div className="app-card">
          <h1>Run the Sakinorva test as a character</h1>
          <p className="helper">
            Generate a full 96-question Sakinorva response in the voice of a fictional or historical
            figure, submit it to the official test, and review the results.
          </p>
          <form onSubmit={handleSubmit} className="grid form-grid" style={{ marginTop: "24px" }}>
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
            <div className="form-actions">
              <button type="submit" className="button" disabled={submitting}>
                {submitting ? "Running…" : "Run Test"}
              </button>
              <span className="helper">OpenAI is called server-side only.</span>
            </div>
            {error ? <div className="error">{error}</div> : null}
          </form>
        </div>
        <div className="app-card">
          <h2>Runs</h2>
          <p className="helper">Click any row to revisit the full answers and Sakinorva results.</p>
          {historyLoading ? (
            <p style={{ marginTop: "20px" }}>Loading runs…</p>
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
                    const isInteractive = item.status === "complete" && item.slug;
                    return (
                      <tr
                        key={item.id}
                        role={isInteractive ? "button" : undefined}
                        tabIndex={isInteractive ? 0 : -1}
                        aria-disabled={!isInteractive}
                        className={isInteractive ? "" : "row-disabled"}
                        onClick={() => {
                          if (isInteractive) {
                            router.push(`/sakinorva/${item.slug}`);
                          }
                        }}
                        onKeyDown={(event) => {
                          if (!isInteractive) {
                            return;
                          }
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(`/sakinorva/${item.slug}`);
                          }
                        }}
                      >
                        <td>{item.character}</td>
                        <td>
                          <span
                            className={`context-badge ${item.context ? "" : "context-badge-muted"}`}
                            title={item.context || "No context provided."}
                          >
                            Context
                          </span>
                        </td>
                        <td>{renderTypeBadge(item.typeSummary?.gft)}</td>
                        <td>{renderTypeBadge(item.typeSummary?.second)}</td>
                        <td>{renderTypeBadge(item.typeSummary?.third)}</td>
                        <td>{renderTypeBadge(item.typeSummary?.axis)}</td>
                        <td>{renderTypeBadge(item.typeSummary?.myers)}</td>
                        <td>
                          {item.status === "pending" ? (
                            <span className="status-badge status-working">Working…</span>
                          ) : item.status === "error" ? (
                            <span className="status-badge status-error" title={item.errorMessage || "Run failed."}>
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
      {modalSlug ? (
        <Suspense fallback={null}>
          <RunModal slug={modalSlug} onClose={() => router.push("/")} />
        </Suspense>
      ) : null}
    </main>
  );
}
