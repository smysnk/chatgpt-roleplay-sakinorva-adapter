"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  SMYSNK2_MODE_LABELS,
  SMYSNK2_MODES,
  getSmysnk2ContextCounts,
  getSmysnk2Scenarios,
  parseSmysnk2Mode,
  type Smysnk2Mode,
  type Smysnk2OptionKey
} from "@/lib/smysnk2Questions";

const MIN_LENGTH = 2;
const MAX_LENGTH = 80;
const ACTIVE_SESSION_STORAGE_KEY = "smysnk2-active-session";

type SessionPayload = {
  slug: string;
  runMode: "user";
  subject: string;
  context: string | null;
  questionMode: number | string | null;
  questionCount: number;
  responses: { questionId: string; answer: Smysnk2OptionKey; rationale: string }[];
  answeredCount: number;
  totalCount: number;
  state: "QUEUED" | "PROCESSING" | "COMPLETED" | "ERROR";
  createdAt: string;
  updatedAt: string;
};

const toAnswerMap = (responses: SessionPayload["responses"]) => {
  const map: Record<string, Smysnk2OptionKey> = {};
  responses.forEach((response) => {
    map[response.questionId] = response.answer;
  });
  return map;
};

const getFirstUnansweredIndex = (ids: string[], answers: Record<string, Smysnk2OptionKey>) => {
  const index = ids.findIndex((id) => !answers[id]);
  return index === -1 ? ids.length - 1 : index;
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
  const slugParam = searchParams.get("slug");

  const [mode, setMode] = useState<Smysnk2Mode>(() => parseSmysnk2Mode(modeParam));
  const [participant, setParticipant] = useState(searchParams.get("label") ?? "");
  const [manualContext, setManualContext] = useState(searchParams.get("notes") ?? "");
  const [answers, setAnswers] = useState<Record<string, Smysnk2OptionKey>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionSlug, setSessionSlug] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [savingAnswer, setSavingAnswer] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [navigatedBack, setNavigatedBack] = useState(false);

  const createSessionPromiseRef = useRef<Promise<string | null> | null>(null);

  const scenarios = useMemo(() => getSmysnk2Scenarios(mode), [mode]);
  const scenarioIds = useMemo(() => scenarios.map((scenario) => scenario.id), [scenarios]);
  const contextCounts = useMemo(() => getSmysnk2ContextCounts(mode), [mode]);

  const answeredCount = useMemo(
    () => scenarioIds.reduce((count, id) => count + (answers[id] ? 1 : 0), 0),
    [answers, scenarioIds]
  );

  const totalCount = scenarios.length;
  const remainingCount = Math.max(0, totalCount - answeredCount);
  const percentComplete = totalCount ? Math.round((answeredCount / totalCount) * 100) : 0;

  const currentQuestion = scenarios[currentIndex] ?? null;

  const canGoPrev = useMemo(() => {
    if (!currentQuestion || currentIndex < 1) {
      return false;
    }
    return answeredCount > 0;
  }, [answeredCount, currentIndex, currentQuestion]);

  const canGoNext = useMemo(() => {
    if (!currentQuestion || !navigatedBack || currentIndex >= scenarios.length - 1) {
      return false;
    }
    return true;
  }, [currentIndex, currentQuestion, navigatedBack, scenarios.length]);

  const syncQuery = (nextSlug: string | null, nextMode: Smysnk2Mode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", nextMode.toString());
    if (nextSlug) {
      params.set("slug", nextSlug);
    } else {
      params.delete("slug");
    }
    if (participant.trim()) {
      params.set("label", participant.trim());
    }
    if (manualContext.trim()) {
      params.set("notes", manualContext.trim());
    }
    const query = params.toString();
    router.replace(query ? `/smysnk2/questions?${query}` : "/smysnk2/questions", { scroll: false });
  };

  const hydrateFromSession = (payload: SessionPayload, sourceSlug: string) => {
    const resolvedMode = parseSmysnk2Mode(payload.questionMode ?? payload.questionCount);
    const resolvedScenarios = getSmysnk2Scenarios(resolvedMode);
    const resolvedIds = resolvedScenarios.map((scenario) => scenario.id);
    const nextAnswers = toAnswerMap(payload.responses ?? []);

    setMode(resolvedMode);
    setParticipant(payload.subject || "Self");
    setManualContext(payload.context ?? "");
    setAnswers(nextAnswers);
    setCurrentIndex(Math.max(0, getFirstUnansweredIndex(resolvedIds, nextAnswers)));
    setSessionSlug(sourceSlug);
    setNavigatedBack(false);
    setManualError(null);

    try {
      window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, sourceSlug);
    } catch {
      // ignore storage errors
    }

    syncQuery(sourceSlug, resolvedMode);
  };

  useEffect(() => {
    let active = true;

    const loadExistingSession = async () => {
      setLoadingSession(true);

      let candidateSlug = slugParam;
      if (!candidateSlug) {
        try {
          candidateSlug = window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
        } catch {
          candidateSlug = null;
        }
      }

      if (!candidateSlug) {
        if (active) {
          setMode(parseSmysnk2Mode(modeParam));
          setLoadingSession(false);
        }
        return;
      }

      try {
        const response = await fetch(`/api/smysnk2/manual/session/${candidateSlug}`);
        if (!response.ok) {
          throw new Error("Unable to load saved SMYSNK2 session.");
        }
        const payload = (await response.json()) as SessionPayload;
        if (!active) {
          return;
        }

        if (payload.state === "COMPLETED") {
          try {
            const stored = window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
            if (stored === candidateSlug) {
              window.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
            }
          } catch {
            // ignore storage errors
          }
          router.replace(`/smysnk2/run/${candidateSlug}`);
          return;
        }

        hydrateFromSession(payload, candidateSlug);
      } catch (error) {
        if (active) {
          try {
            const stored = window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
            if (stored === candidateSlug) {
              window.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
            }
          } catch {
            // ignore storage errors
          }
          setManualError(error instanceof Error ? error.message : "Unexpected error.");
        }
      } finally {
        if (active) {
          setLoadingSession(false);
        }
      }
    };

    loadExistingSession();

    return () => {
      active = false;
    };
  }, [modeParam, router, searchParams, slugParam]);

  const ensureSession = async () => {
    if (sessionSlug) {
      return sessionSlug;
    }

    if (createSessionPromiseRef.current) {
      return createSessionPromiseRef.current;
    }

    const label = participant.trim() || "Self";
    if (label.length < MIN_LENGTH || label.length > MAX_LENGTH) {
      setManualError(`Participant label must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters.`);
      return null;
    }

    createSessionPromiseRef.current = (async () => {
      const response = await fetch("/api/smysnk2/manual/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subject: label,
          context: manualContext.trim(),
          mode
        })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to create SMYSNK2 session.");
      }
      const payload = (await response.json()) as SessionPayload;
      hydrateFromSession(payload, payload.slug);
      return payload.slug;
    })();

    try {
      return await createSessionPromiseRef.current;
    } finally {
      createSessionPromiseRef.current = null;
    }
  };

  const handleSelectAnswer = async (answer: Smysnk2OptionKey) => {
    if (!currentQuestion || savingAnswer || loadingSession || finalizing) {
      return;
    }

    setSavingAnswer(true);
    setManualError(null);

    try {
      const slug = await ensureSession();
      if (!slug) {
        return;
      }

      const response = await fetch(`/api/smysnk2/manual/session/${slug}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subject: participant.trim() || "Self",
          context: manualContext.trim(),
          questionId: currentQuestion.id,
          answer,
          rationale: `User selected ${answer}.`
        })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to save answer.");
      }
      const payload = (await response.json()) as SessionPayload;

      const nextAnswers = toAnswerMap(payload.responses ?? []);
      setAnswers(nextAnswers);
      setSessionSlug(payload.slug);
      setNavigatedBack(false);

      if (currentIndex < scenarios.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    } catch (error) {
      setManualError(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setSavingAnswer(false);
    }
  };

  const handlePrev = () => {
    if (!canGoPrev || savingAnswer || loadingSession || finalizing) {
      return;
    }
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    setNavigatedBack(true);
  };

  const handleNext = () => {
    if (!canGoNext || savingAnswer || loadingSession || finalizing) {
      return;
    }
    setCurrentIndex((prev) => Math.min(scenarios.length - 1, prev + 1));
  };

  const handleFinalize = async () => {
    if (answeredCount !== totalCount || finalizing || loadingSession || savingAnswer) {
      return;
    }

    setManualError(null);
    setFinalizing(true);

    try {
      const slug = await ensureSession();
      if (!slug) {
        return;
      }
      const response = await fetch(`/api/smysnk2/manual/session/${slug}/finalize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subject: participant.trim() || "Self",
          context: manualContext.trim()
        })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to finalize session.");
      }

      try {
        const stored = window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
        if (stored === slug) {
          window.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
        }
      } catch {
        // ignore storage errors
      }

      router.push(`/smysnk2/run/${slug}`);
    } catch (error) {
      setManualError(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <main>
      <div className="stack">
        <div className="app-card">
          <h1>SMYSNK2 Questions</h1>
          <p className="helper">
            One scenario at a time. Answers save automatically as you go, and unfinished sessions can be resumed.
          </p>
          <p className="helper" style={{ marginTop: "8px" }}>
            Mode {mode}: {contextCounts.default} default, {contextCounts.moderate} moderate, {contextCounts.stress} stress.
          </p>
        </div>

        <div className="app-card">
          <div className="form-grid" style={{ marginBottom: "16px" }}>
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
                disabled={loadingSession || finalizing}
              />
            </div>
            <div>
              <label className="label" htmlFor="smysnk2-context">
                Notes (optional)
              </label>
              <textarea
                id="smysnk2-context"
                className="textarea"
                value={manualContext}
                onChange={(event) => setManualContext(event.target.value)}
                placeholder="Anything you want to remember about this run."
                disabled={loadingSession || finalizing}
              />
            </div>
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label className="label" htmlFor="smysnk2-mode">
              Question mode
            </label>
            <select
              id="smysnk2-mode"
              className="input"
              value={mode}
              onChange={(event) => setMode(parseSmysnk2Mode(event.target.value))}
              disabled={Boolean(sessionSlug) || loadingSession || savingAnswer || finalizing}
            >
              {SMYSNK2_MODES.map((itemMode) => (
                <option key={itemMode} value={itemMode}>
                  {SMYSNK2_MODE_LABELS[itemMode]}
                </option>
              ))}
            </select>
            {sessionSlug ? (
              <p className="helper" style={{ marginTop: "8px" }}>
                Active session: {sessionSlug}
              </p>
            ) : null}
          </div>

          <div className="progress-wrap" aria-live="polite">
            <div className="progress-meta">
              <span>
                {answeredCount} answered
              </span>
              <span>
                {remainingCount} left
              </span>
              <span>
                {percentComplete}% complete
              </span>
            </div>
            <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentComplete}>
              <div className="progress-fill" style={{ width: `${percentComplete}%` }} />
            </div>
          </div>

          {loadingSession ? (
            <p style={{ marginTop: "20px" }}>Loading session...</p>
          ) : currentQuestion ? (
            <div className="answer-row" style={{ marginTop: "20px" }}>
              <div className="answer-meta" style={{ alignItems: "flex-start" }}>
                <div className="answer-question">
                  #{currentIndex + 1} of {scenarios.length} {currentQuestion.scenario}
                </div>
              </div>

              <div className="scenario-option-grid" role="radiogroup" aria-label={`Answer for ${currentQuestion.id}`}>
                {currentQuestion.options.map((option) => {
                  const isSelected = answers[currentQuestion.id] === option.key;
                  return (
                    <button
                      type="button"
                      key={`${currentQuestion.id}-${option.key}`}
                      className={`scenario-option ${isSelected ? "active" : ""}`.trim()}
                      onClick={() => handleSelectAnswer(option.key)}
                      aria-pressed={isSelected}
                      disabled={savingAnswer || finalizing}
                    >
                      <span className="scenario-option-key">{option.key}</span>
                      <span>{option.text}</span>
                    </button>
                  );
                })}
              </div>

              <div className="question-nav-row">
                <button type="button" className="button secondary" onClick={handlePrev} disabled={!canGoPrev || savingAnswer || finalizing}>
                  Previous
                </button>
                <button type="button" className="button secondary" onClick={handleNext} disabled={!canGoNext || savingAnswer || finalizing}>
                  Next
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={handleFinalize}
                  disabled={answeredCount !== totalCount || savingAnswer || finalizing}
                >
                  {finalizing ? "Finalizing..." : "Finalize"}
                </button>
              </div>
            </div>
          ) : (
            <p style={{ marginTop: "20px" }}>No scenarios available for this mode.</p>
          )}

          {savingAnswer ? <p className="helper">Saving answer...</p> : null}
          {manualError ? <div className="error">{manualError}</div> : null}
        </div>
      </div>
    </main>
  );
}
