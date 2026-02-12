"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  SMYSNK2_MODE_LABELS,
  SMYSNK2_MODES,
  getSmysnk2ContextCounts,
  getSmysnk2Scenarios,
  parseSmysnk2Mode,
  type Smysnk2Mode,
  type Smysnk2OptionKey,
  type Smysnk2Scenario
} from "@/lib/smysnk2Questions";

const MIN_LENGTH = 2;
const MAX_LENGTH = 80;

const shuffleScenarios = (items: Smysnk2Scenario[]) => {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function Smysnk2QuestionsPage() {
  return (
    <Suspense fallback={<div>Loading questions...</div>}>
      <Smysnk2QuestionsContent />
    </Suspense>
  );
}

function Smysnk2QuestionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const modeParam = searchParams.get("mode");
  const [mode, setMode] = useState<Smysnk2Mode>(() => parseSmysnk2Mode(modeParam));
  const [participant, setParticipant] = useState(searchParams.get("label") ?? "");
  const [manualContext, setManualContext] = useState(searchParams.get("notes") ?? "");
  const [manualAnswers, setManualAnswers] = useState<Record<string, Smysnk2OptionKey>>({});
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  useEffect(() => {
    setMode(parseSmysnk2Mode(modeParam));
  }, [modeParam]);

  useEffect(() => {
    setManualAnswers({});
    setManualError(null);
  }, [mode]);

  const scenarios = useMemo(() => shuffleScenarios(getSmysnk2Scenarios(mode)), [mode]);
  const contextCounts = useMemo(() => getSmysnk2ContextCounts(mode), [mode]);

  const handleManualAnswer = (questionId: string, value: Smysnk2OptionKey) => {
    setManualAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleManualSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const label = participant.trim() || "Self";
    if (label.length < MIN_LENGTH || label.length > MAX_LENGTH) {
      setManualError(`Participant label must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters.`);
      return;
    }

    const missing = scenarios.find((question) => !manualAnswers[question.id]);
    if (missing) {
      setManualError("Please answer every scenario before submitting.");
      return;
    }

    setManualError(null);
    setManualSubmitting(true);
    try {
      const response = await fetch("/api/smysnk2/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subject: label,
          context: manualContext.trim(),
          mode,
          responses: scenarios.map((question) => ({
            questionId: question.id,
            answer: manualAnswers[question.id],
            rationale: `User selected ${manualAnswers[question.id]}.`
          }))
        })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to submit SMYSNK2 responses.");
      }
      const payload = (await response.json()) as { slug: string };
      router.push(`/smysnk2/run/${payload.slug}`);
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
          <h1>SMYSNK2 Questions</h1>
          <p className="helper">
            Scenario format with 8 options per item (A-H), one option per cognitive function. Select the
            response that best matches your first move.
          </p>
          <p className="helper" style={{ marginTop: "8px" }}>
            Mode {mode}: {contextCounts.default} default, {contextCounts.moderate} moderate, {contextCounts.stress} stress.
          </p>
        </div>
        <div className="app-card">
          <form onSubmit={handleManualSubmit} className="grid" style={{ marginTop: "24px" }}>
            <div className="form-grid">
              <div>
                <label className="label" htmlFor="smysnk2-participant">
                  Participant label
                </label>
                <input
                  id="smysnk2-participant"
                  className="input"
                  value={participant}
                  onChange={(event) => setParticipant(event.target.value)}
                  placeholder="Self"
                  maxLength={MAX_LENGTH}
                />
              </div>
              <div>
                <label className="label" htmlFor="smysnk2-manual-context">
                  Notes (optional)
                </label>
                <textarea
                  id="smysnk2-manual-context"
                  className="textarea"
                  value={manualContext}
                  onChange={(event) => setManualContext(event.target.value)}
                  placeholder="Anything you want to remember about this run."
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="smysnk2-mode">
                Question mode
              </label>
              <select
                id="smysnk2-mode"
                className="input"
                value={mode}
                onChange={(event) => setMode(parseSmysnk2Mode(event.target.value))}
              >
                {SMYSNK2_MODES.map((itemMode) => (
                  <option key={itemMode} value={itemMode}>
                    {SMYSNK2_MODE_LABELS[itemMode]}
                  </option>
                ))}
              </select>
            </div>
            <div className="answers-list">
              {scenarios.map((question, index) => (
                <div className="answer-row" key={question.id}>
                  <div className="answer-meta" style={{ alignItems: "flex-start" }}>
                    <div className="answer-question">
                      #{index + 1} {question.scenario}
                    </div>
                  </div>
                  <div className="scenario-option-grid" role="radiogroup" aria-label={`Answer for ${question.id}`}>
                    {question.options.map((option) => {
                      const isSelected = manualAnswers[question.id] === option.key;
                      return (
                        <button
                          type="button"
                          key={`${question.id}-${option.key}`}
                          className={`scenario-option ${isSelected ? "active" : ""}`.trim()}
                          onClick={() => handleManualAnswer(question.id, option.key)}
                          aria-pressed={isSelected}
                        >
                          <span className="scenario-option-key">{option.key}</span>
                          <span>{option.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <button type="submit" className="button" disabled={manualSubmitting}>
                {manualSubmitting ? "Saving..." : "Submit"}
              </button>
            </div>
            {manualError ? <div className="error">{manualError}</div> : null}
          </form>
        </div>
      </div>
    </main>
  );
}
