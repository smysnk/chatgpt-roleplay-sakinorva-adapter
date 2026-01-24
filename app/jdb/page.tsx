"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { JDB_QUESTIONS } from "@/lib/jdbQuestions";
import RatingScaleHeader from "@/app/components/RatingScaleHeader";

const MIN_LENGTH = 2;
const MAX_LENGTH = 80;

const shuffleQuestions = (items: typeof JDB_QUESTIONS) => {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function JdbIndicatorPage() {
  const shuffledQuestions = useMemo(() => shuffleQuestions(JDB_QUESTIONS), []);
  const [character, setCharacter] = useState("");
  const [context, setContext] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiSlug, setAiSlug] = useState<string | null>(null);

  const [participant, setParticipant] = useState("");
  const [manualContext, setManualContext] = useState("");
  const [manualAnswers, setManualAnswers] = useState<Record<string, number>>({});
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSlug, setManualSlug] = useState<string | null>(null);

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
      const response = await fetch("/api/jdb", {
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
        throw new Error(payload?.error ?? "Failed to run the JDB indicator.");
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

  const handleManualAnswer = (questionId: string, value: number) => {
    setManualAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleManualSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const label = participant.trim() || "Self";
    if (label.length < MIN_LENGTH || label.length > MAX_LENGTH) {
      setManualError(`Participant label must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters.`);
      return;
    }
    const missing = JDB_QUESTIONS.find((question) => !manualAnswers[question.id]);
    if (missing) {
      setManualError("Please answer every question before submitting.");
      return;
    }
    setManualError(null);
    setManualSubmitting(true);
    setManualSlug(null);
    try {
      const response = await fetch("/api/jdb/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subject: label,
          context: manualContext.trim(),
          responses: JDB_QUESTIONS.map((question) => ({
            questionId: question.id,
            answer: manualAnswers[question.id],
            rationale: `User selected ${manualAnswers[question.id]}.`
          }))
        })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to submit the JDB responses.");
      }
      const payload = (await response.json()) as { slug: string };
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
          <h1>JDB Indicator</h1>
          <p className="helper">
            Run the JDB indicator with AI roleplay or submit your own answers. Questions are randomized
            on each load.
          </p>
        </div>
        <div className="app-card">
          <h2>Roleplay mode</h2>
          <p className="helper">
            Let AI answer the JDB questions as a character. You will receive a permanent results link.
          </p>
          <form onSubmit={handleAiSubmit} className="grid" style={{ marginTop: "24px" }}>
            <div className="form-grid">
              <div>
                <label className="label" htmlFor="jdb-character">
                  Character
                </label>
                <input
                  id="jdb-character"
                  className="input"
                  value={character}
                  onChange={(event) => setCharacter(event.target.value)}
                  placeholder="Sokka"
                  maxLength={MAX_LENGTH}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="jdb-context">
                  Context / portrayal notes (optional)
                </label>
                <textarea
                  id="jdb-context"
                  className="textarea"
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  placeholder="Season 3, post-Black Sun."
                />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <button type="submit" className="button" disabled={submitting}>
                {submitting ? "Running…" : "Run JDB indicator"}
              </button>
              {aiSlug ? (
                <Link className="button secondary" href={`/jdb/run/${aiSlug}`}>
                  View results
                </Link>
              ) : null}
            </div>
            {error ? <div className="error">{error}</div> : null}
          </form>
        </div>
        <div className="app-card">
          <h2>Answer the questions yourself</h2>
          <p className="helper">
            Use the 1–5 scale (1 = disagree, 5 = agree). All answers are saved and scored from 0–40.
          </p>
          <form onSubmit={handleManualSubmit} className="grid" style={{ marginTop: "24px" }}>
            <div className="form-grid">
              <div>
                <label className="label" htmlFor="jdb-participant">
                  Participant label
                </label>
                <input
                  id="jdb-participant"
                  className="input"
                  value={participant}
                  onChange={(event) => setParticipant(event.target.value)}
                  placeholder="Self"
                  maxLength={MAX_LENGTH}
                />
              </div>
              <div>
                <label className="label" htmlFor="jdb-manual-context">
                  Notes (optional)
                </label>
                <textarea
                  id="jdb-manual-context"
                  className="textarea"
                  value={manualContext}
                  onChange={(event) => setManualContext(event.target.value)}
                  placeholder="Anything you want to remember about this run."
                />
              </div>
            </div>
            <div className="answers-list">
              <RatingScaleHeader />
              {shuffledQuestions.map((question, index) => (
                <div className="answer-row" key={question.id}>
                  <div className="answer-meta">
                    <div className="answer-question">#{index + 1} {question.question}</div>
                    <div className="rating-bar" aria-label={`Answer for ${question.id}`}>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          type="button"
                          key={value}
                          className={`rating-pill value-${value} ${
                            manualAnswers[question.id] === value ? "active" : ""
                          }`}
                          onClick={() => handleManualAnswer(question.id, value)}
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
                {manualSubmitting ? "Saving…" : "Save results"}
              </button>
              {manualSlug ? (
                <Link className="button secondary" href={`/jdb/run/${manualSlug}`}>
                  View saved results
                </Link>
              ) : null}
            </div>
            {manualError ? <div className="error">{manualError}</div> : null}
          </form>
        </div>
      </div>
    </main>
  );
}
