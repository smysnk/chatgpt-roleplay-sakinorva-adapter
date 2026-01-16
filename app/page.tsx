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

const MIN_LENGTH = 2;
const MAX_LENGTH = 80;

export default function HomePage() {
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
          throw new Error("Failed to load previous results.");
        }
        const payload = (await response.json()) as { items: HistoryItem[] };
        if (active) {
          setHistory(payload.items ?? []);
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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = character.trim();
    if (trimmed.length < MIN_LENGTH || trimmed.length > MAX_LENGTH) {
      setError(`Character name must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    const params = new URLSearchParams({ character: trimmed });
    if (context.trim()) {
      params.set("context", context.trim());
    }
    router.push(`/results?${params.toString()}`);
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
                  {history.map((item) => (
                    <tr
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(`/history/${item.id}`)}
                      onKeyDown={(event) => {
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
                      <td>{formatDate(item.createdAt)}</td>
                    </tr>
                  ))}
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
