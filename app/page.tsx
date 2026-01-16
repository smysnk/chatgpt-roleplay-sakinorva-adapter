"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type HistoryItem = {
  id: number;
  character: string;
  context: string | null;
  gft: string | null;
  second: string | null;
  third: string | null;
  axis: string | null;
  myers: string | null;
  createdAt: string;
};

type HistoryRow = HistoryItem & {
  id: number | string;
  status: "ready" | "running" | "error";
  errorMessage?: string | null;
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
          setHistory((payload.items ?? []).map((item) => ({ ...item, status: "ready" })));
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

  const createPendingRow = (name: string, notes: string) => ({
    id: `pending-${Date.now()}`,
    character: name,
    context: notes || null,
    gft: null,
    second: null,
    third: null,
    axis: null,
    myers: null,
    createdAt: new Date().toISOString(),
    status: "running" as const,
    errorMessage: null
  });

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
    const trimmedContext = context.trim();
    const pendingRow = createPendingRow(trimmed, trimmedContext);
    setHistory((prev) => [pendingRow, ...prev]);
    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ character: trimmed, context: trimmedContext })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to run the test.");
      }
      const payload = (await response.json()) as { historyId?: number };
      const historyResponse = await fetch("/api/history");
      if (historyResponse.ok) {
        const historyPayload = (await historyResponse.json()) as { items: HistoryItem[] };
        setHistory((historyPayload.items ?? []).map((item) => ({ ...item, status: "ready" })));
      } else {
        setHistory((prev) =>
          prev.map((item) =>
            item.id === pendingRow.id
              ? {
                  ...item,
                  id: payload.historyId ?? item.id,
                  status: "ready"
                }
              : item
          )
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setHistory((prev) =>
        prev.map((item) =>
          item.id === pendingRow.id
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
          <form onSubmit={handleSubmit} className="grid" style={{ marginTop: "24px" }}>
            <div className="grid form-grid">
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
                    <th>GFT</th>
                    <th>2nd</th>
                    <th>3rd</th>
                    <th>Axis</th>
                    <th>Myers</th>
                    <th>Ran</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => {
                    const isReady = item.status === "ready";
                    const isErrored = item.status === "error";
                    return (
                    <tr
                      key={item.id}
                      role={isReady ? "button" : undefined}
                      tabIndex={isReady ? 0 : -1}
                      aria-disabled={!isReady}
                      className={isReady ? "" : "is-disabled"}
                      onClick={() => {
                        if (isReady) {
                          router.push(`/history/${item.id}`);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (!isReady) {
                          return;
                        }
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(`/history/${item.id}`);
                        }
                      }}
                    >
                      <td>{item.character}</td>
                      <td>
                        <span
                          className={`context-badge ${item.context ? "" : "muted"}`}
                          title={item.context || "No context provided."}
                        >
                          Context
                        </span>
                      </td>
                      <td>{item.gft || "—"}</td>
                      <td>{item.second || "—"}</td>
                      <td>{item.third || "—"}</td>
                      <td>{item.axis || "—"}</td>
                      <td>{item.myers || "—"}</td>
                      <td>
                        {isReady ? (
                          formatDate(item.createdAt)
                        ) : isErrored ? (
                          <span className="status-badge error" title={item.errorMessage ?? "Run failed."}>
                            Error
                          </span>
                        ) : (
                          <span className="status-badge running">Running…</span>
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
    </main>
  );
}
