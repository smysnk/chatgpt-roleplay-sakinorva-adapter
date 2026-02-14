"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { QUESTIONS } from "@/lib/questions";
import RatingScaleHeader from "@/app/components/RatingScaleHeader";

const MIN_LENGTH = 2;
const MAX_LENGTH = 80;

export default function SakinorvaQuestionsPage() {
  return (
    <Suspense fallback={<div>Loading questions…</div>}>
      <SakinorvaQuestionsContent />
    </Suspense>
  );
}

function SakinorvaQuestionsContent() {
  const searchParams = useSearchParams();
  const [manualName, setManualName] = useState(searchParams.get("label") ?? "");
  const [manualNotes, setManualNotes] = useState(searchParams.get("notes") ?? "");
  const [started, setStarted] = useState(false);
  const [manualAnswers, setManualAnswers] = useState<number[]>(
    () => Array.from({ length: QUESTIONS.length }, () => 0)
  );
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSlug, setManualSlug] = useState<string | null>(null);

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
          <h1>Sakinorva Questions</h1>
          <p className="helper">
            Answer each statement on a 1–5 scale (1 = No, 5 = Yes). Your results will be saved to a
            shareable link.
          </p>
          <p className="helper" style={{ marginTop: "8px" }}>
            This run has {QUESTIONS.length} questions. Choose the response that best matches your typical
            first instinct.
          </p>
          {!started ? (
            <div style={{ marginTop: "16px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button type="button" className="button" onClick={() => setStarted(true)}>
                Start questions
              </button>
              <Link className="button secondary" href="/sakinorva-adapter">
                Back to Sakinorva
              </Link>
            </div>
          ) : null}
        </div>
        {started ? (
          <div className="app-card">
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
                <Link className="button secondary" href={`/sakinorva-adapter/run/${manualSlug}`}>
                  View saved results
                </Link>
              ) : null}
              <Link className="button secondary" href="/sakinorva-adapter">
                Back to Sakinorva
              </Link>
            </div>
            {manualError ? <div className="error">{manualError}</div> : null}
            </form>
          </div>
        ) : null}
      </div>
    </main>
  );
}
