"use client";

import Link from "next/link";
import { useState } from "react";

const MIN_LENGTH = 2;
const MAX_LENGTH = 80;

export default function SmysnkIndicatorPage() {
  const [character, setCharacter] = useState("");
  const [context, setContext] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiSlug, setAiSlug] = useState<string | null>(null);

  const handleAiSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = character.trim();
    if (trimmed.length < MIN_LENGTH || trimmed.length > MAX_LENGTH) {
      setError(`Character name must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    setAiSlug(null);
    try {
      const response = await fetch("/api/smysnk", {
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
        throw new Error(payload?.error ?? "Failed to run the SMYSNK indicator.");
      }
      const payload = (await response.json()) as { slug: string };
      setAiSlug(payload.slug);
      setCharacter("");
      setContext("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main>
      <div className="stack">
        <div className="app-card">
          <h1>SMYSNK Indicator</h1>
          <p className="helper">
            Run the SMYSNK indicator with AI roleplay or answer the questions yourself on a dedicated page.
          </p>
        </div>
        <div className="app-card">
          <h2>Roleplay mode</h2>
          <p className="helper">
            Let AI answer the SMYSNK questions as a character. You will receive a permanent results link.
          </p>
          <form onSubmit={handleAiSubmit} className="grid" style={{ marginTop: "24px" }}>
            <div className="form-grid">
              <div>
                <label className="label" htmlFor="smysnk-character">
                  Character
                </label>
                <input
                  id="smysnk-character"
                  className="input"
                  value={character}
                  onChange={(event) => setCharacter(event.target.value)}
                  placeholder="Sokka"
                  maxLength={MAX_LENGTH}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="smysnk-context">
                  Context / portrayal notes (optional)
                </label>
                <textarea
                  id="smysnk-context"
                  className="textarea"
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  placeholder="Season 3, post-Black Sun."
                />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <button type="submit" className="button" disabled={submitting}>
                {submitting ? "Running…" : "Run SMYSNK indicator"}
              </button>
              {aiSlug ? (
                <Link className="button secondary" href={`/smysnk/run/${aiSlug}`}>
                  View results
                </Link>
              ) : null}
            </div>
            {error ? <div className="error">{error}</div> : null}
          </form>
        </div>
        <div className="app-card">
          <h2>Self-answer mode</h2>
          <p className="helper">
            Answer the SMYSNK questions on a separate page and receive a saved results link.
          </p>
          <div style={{ marginTop: "20px" }}>
            <Link className="button secondary" href="/smysnk/questions">
              Answer SMYSNK questions
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
