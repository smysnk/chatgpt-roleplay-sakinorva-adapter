"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type HistoryItem = {
  id: number;
  character: string;
  context: string | null;
  resultsSummary: string;
  createdAt: string;
};

type HistoryRow =
  | (HistoryItem & { status: "complete" })
  | {
    id: string;
    character: string;
    context: string | null;
    resultsSummary: string;
    createdAt: string;
    status: "pending" | "error";
    errorMessage?: string;
  };

const MIN_LENGTH = 2;
const MAX_LENGTH = 80;

export default function HomePage() {
  const router = useRouter();
  const [character, setCharacter] = useState("");
  const [context, setContext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const response = await fetch("/api/history");
        if (!response.ok) {
          throw new Error("Failed to load previous results.");
        }
        const payload = (await response.json()) as { items: HistoryItem[] };
        if (active) {
          const items = (payload.items ?? []).map((item) => ({
            ...item,
            status: "complete" as const
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

  const formatDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString();
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
    const pendingId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const contextValue = context.trim() || null;
    const pendingRow: HistoryRow = {
      id: pendingId,
      character: trimmed,
      context: contextValue,
      resultsSummary: "Running test…",
      createdAt: new Date().toISOString(),
      status: "pending"
    };
    setHistory((prev) => [pendingRow, ...prev]);
    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ character: trimmed, context: contextValue ?? "" })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to run the test.");
      }
      const payload = (await response.json()) as {
        historyId: number;
        resultsSummary: string;
        createdAt: string;
      };
      setHistory((prev) =>
        prev.map((row) =>
          row.id === pendingId
            ? {
              id: payload.historyId,
              character: trimmed,
              context: contextValue,
              resultsSummary: payload.resultsSummary,
              createdAt: payload.createdAt,
              status: "complete"
            }
            : row
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setHistory((prev) =>
        prev.map((row) =>
          row.id === pendingId
            ? {
              ...row,
              status: "error",
              resultsSummary: "Error running test.",
              errorMessage: message
            }
            : row
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main>
      <div className="grid two">
        <div className="app-card">
          <h1>Run the Sakinorva test as a character</h1>
          <p className="helper">
            Generate a full 96-question Sakinorva response in the voice of a fictional or historical
            figure, submit it to the official test, and review the results.
          </p>
          <form onSubmit={handleSubmit} className="grid" style={{ marginTop: "24px" }}>
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
          <h2>Previous characters</h2>
          <p className="helper">
            Click any row to revisit the full answers and Sakinorva results.
          </p>
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
                    <th>Summary</th>
                    <th>Ran</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => {
                    const isClickable = item.status === "complete";
                    const ranContent =
                      item.status === "pending" ? (
                        <span className="status-badge status-pending">Running…</span>
                      ) : item.status === "error" ? (
                        <span className="status-badge status-error" title={item.errorMessage ?? "Run failed."}>
                          Error
                        </span>
                      ) : (
                        formatDate(item.createdAt)
                      );
                    return (
                      <tr
                        key={item.id}
                        className={isClickable ? "" : "is-disabled"}
                        role={isClickable ? "button" : undefined}
                        tabIndex={isClickable ? 0 : -1}
                        aria-disabled={!isClickable}
                        onClick={
                          isClickable
                            ? () => {
                              router.push(`/history/${item.id}`);
                            }
                            : undefined
                        }
                        onKeyDown={
                          isClickable
                            ? (event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                router.push(`/history/${item.id}`);
                              }
                            }
                            : undefined
                        }
                      >
                        <td>{item.character}</td>
                        <td>{item.context || "—"}</td>
                        <td>{item.resultsSummary}</td>
                        <td>{ranContent}</td>
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
    </main>
  );
}
