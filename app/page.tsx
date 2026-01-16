"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const MIN_LENGTH = 2;
const MAX_LENGTH = 80;

export default function HomePage() {
  const router = useRouter();
  const [character, setCharacter] = useState("");
  const [context, setContext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    </main>
  );
}
