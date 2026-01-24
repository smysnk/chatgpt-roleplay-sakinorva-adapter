"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { SMYSNK_QUESTIONS } from "@/lib/smysnkQuestions";
import RatingScaleHeader from "@/app/components/RatingScaleHeader";

const MIN_LENGTH = 2;
const MAX_LENGTH = 80;

const shuffleQuestions = (items: typeof SMYSNK_QUESTIONS) => {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function SmysnkQuestionsPage() {
  const searchParams = useSearchParams();
  const shuffledQuestions = useMemo(() => shuffleQuestions(SMYSNK_QUESTIONS), []);
  const [participant, setParticipant] = useState(searchParams.get("label") ?? "");
  const [manualContext, setManualContext] = useState(searchParams.get("notes") ?? "");
  const [manualAnswers, setManualAnswers] = useState<Record<string, number>>({});
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSlug, setManualSlug] = useState<string | null>(null);

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
    const missing = SMYSNK_QUESTIONS.find((question) => !manualAnswers[question.id]);
    if (missing) {
      setManualError("Please answer every question before submitting.");
      return;
    }
    setManualError(null);
    setManualSubmitting(true);
    setManualSlug(null);
    try {
      const response = await fetch("/api/smysnk/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subject: label,
          context: manualContext.trim(),
          responses: SMYSNK_QUESTIONS.map((question) => ({
            questionId: question.id,
            answer: manualAnswers[question.id],
            rationale: `User selected ${manualAnswers[question.id]}.`
          }))
        })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to submit the SMYSNK responses.");
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
          <h1>SMYSNK Questions</h1>
          <p className="helper">
            Answer each statement on a 1–5 scale (1 = disagree, 5 = agree). All answers are saved and
            scored from 0–40.
          </p>
        </div>
        <div className="app-card">
          <form onSubmit={handleManualSubmit} className="grid" style={{ marginTop: "24px" }}>
            <div className="form-grid">
              <div>
                <label className="label" htmlFor="smysnk-participant">
                  Participant label
                </label>
                <input
                  id="smysnk-participant"
                  className="input"
                  value={participant}
                  onChange={(event) => setParticipant(event.target.value)}
                  placeholder="Self"
                  maxLength={MAX_LENGTH}
                />
              </div>
              <div>
                <label className="label" htmlFor="smysnk-manual-context">
                  Notes (optional)
                </label>
                <textarea
                  id="smysnk-manual-context"
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
                <Link className="button secondary" href={`/smysnk/run/${manualSlug}`}>
                  View saved results
                </Link>
              ) : null}
              <Link className="button secondary" href="/smysnk">
                Back to SMYSNK
              </Link>
            </div>
            {manualError ? <div className="error">{manualError}</div> : null}
          </form>
        </div>
      </div>
    </main>
  );
}
