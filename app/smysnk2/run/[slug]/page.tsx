"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getSmysnk2Scenarios,
  parseSmysnk2Mode,
  type Smysnk2Mode,
  type Smysnk2OptionKey
} from "@/lib/smysnk2Questions";
import { normalizeSmysnk2OptionKey } from "@/lib/smysnk2Score";
import SakinorvaResults from "@/app/components/SakinorvaResults";
import MbtiMapCanvas from "@/app/components/MbtiMapCanvas";

type Smysnk2RunPayload = {
  slug: string;
  runMode: "ai" | "user" | "reddit";
  subject: string | null;
  context: string | null;
  questionMode: string | null;
  questionCount: number | null;
  redditProfile: { summary: string; persona: string; traits: string[] } | null;
  responses: { questionId: string; answer: string; rationale: string }[] | null;
  scores: Record<string, number> | null;
  state: "QUEUED" | "PROCESSING" | "COMPLETED" | "ERROR";
  errors: number;
  createdAt: string;
};

const formatDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
};

const getModeLabel = (mode: Smysnk2Mode) => {
  if (mode === 16) {
    return "16 (fast)";
  }
  if (mode === 64) {
    return "64 (high confidence)";
  }
  return "32 (balanced)";
};

export default function Smysnk2RunPage({ params }: { params: { slug: string } }) {
  const [data, setData] = useState<Smysnk2RunPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async (withLoading = false) => {
      if (withLoading) {
        setLoading(true);
      }
      setError(null);
      try {
        const response = await fetch(`/api/smysnk2/slug/${params.slug}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Failed to load SMYSNK2 run.");
        }
        const payload = (await response.json()) as Smysnk2RunPayload;
        if (active) {
          setData(payload);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unexpected error.");
        }
      } finally {
        if (active && withLoading) {
          setLoading(false);
        }
      }
    };

    load(true);
    const shouldPoll = data?.state !== "COMPLETED" && data?.state !== "ERROR";
    const interval = shouldPoll ? setInterval(() => load(false), 5000) : null;

    return () => {
      active = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [params.slug, data?.state]);

  const mode = useMemo(
    () => parseSmysnk2Mode(data?.questionMode ?? data?.questionCount ?? 32),
    [data?.questionMode, data?.questionCount]
  );

  const responseMap = useMemo(() => {
    if (!data?.responses?.length) {
      return new Map<string, { answer: Smysnk2OptionKey | null; rationale: string }>();
    }
    return new Map(
      data.responses.map((response) => [
        response.questionId,
        {
          answer: normalizeSmysnk2OptionKey(response.answer),
          rationale: response.rationale
        }
      ])
    );
  }, [data]);

  const hasScores = useMemo(() => Boolean(data?.scores && Object.keys(data.scores).length), [data]);

  return (
    <main>
      <div className="grid two">
        <div className="app-card">
          <h2>SMYSNK2 results</h2>
          {loading ? (
            <p style={{ marginTop: "20px" }}>Loading results...</p>
          ) : error ? (
            <div className="error">{error}</div>
          ) : data ? (
            <div style={{ marginTop: "20px" }}>
              <p className="helper">
                {data.subject ? <strong>{data.subject}</strong> : "Unnamed run"}
                {data.context ? ` - ${data.context}` : ""}
              </p>
              <p className="helper">Run mode: {data.runMode === "ai" ? "AI roleplay" : data.runMode === "reddit" ? "Reddit profile" : "Self answer"}</p>
              <p className="helper">Question mode: {getModeLabel(mode)}</p>
              <p className="helper">Created: {formatDate(data.createdAt)}</p>
              {data.state === "ERROR" ? (
                <div className="error" style={{ marginTop: "20px" }}>
                  This run failed to complete after multiple attempts.
                </div>
              ) : data.state !== "COMPLETED" ? (
                <p className="helper" style={{ marginTop: "20px" }}>
                  Run is queued and will update once processing completes.
                </p>
              ) : (
                <>
                  <div style={{ marginTop: "20px" }}>
                    <SakinorvaResults htmlFragment="" functionScores={data.scores} mbtiMeta={null} />
                  </div>
                  {hasScores ? (
                    <div style={{ marginTop: "24px" }}>
                      <h3 style={{ marginBottom: "12px" }}>MBTI Axis Map</h3>
                      <MbtiMapCanvas functionScores={data.scores} />
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
        {data?.runMode === "reddit" && data.redditProfile ? (
          <div className="app-card">
            <h2>Psychological profile</h2>
            <p className="helper" style={{ marginTop: "16px" }}>
              {data.redditProfile.summary}
            </p>
            <div style={{ marginTop: "16px" }}>
              <h3 style={{ marginBottom: "8px" }}>Persona snapshot</h3>
              <p className="helper">{data.redditProfile.persona}</p>
            </div>
            <div style={{ marginTop: "16px" }}>
              <h3 style={{ marginBottom: "8px" }}>Traits</h3>
              <ul className="helper">
                {data.redditProfile.traits.map((trait, index) => (
                  <li key={`${trait}-${index}`}>{trait}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
        <div className="app-card">
          <h2>Answers</h2>
          <p className="helper">One option per scenario (A-H).</p>
          {loading ? (
            <p style={{ marginTop: "20px" }}>Loading answers...</p>
          ) : error ? (
            <div className="error">{error}</div>
          ) : data && data.responses?.length ? (
            <div className="answers-list" style={{ marginTop: "20px" }}>
              {getSmysnk2Scenarios(mode).map((question, index) => {
                const response = responseMap.get(question.id);
                return (
                  <div className="answer-row" key={question.id}>
                    <div className="answer-meta" style={{ alignItems: "flex-start" }}>
                      <div className="answer-question">
                        #{index + 1} [{question.contextType}] {question.scenario}
                      </div>
                    </div>
                    <div className="scenario-option-grid">
                      {question.options.map((option) => (
                        <div
                          key={`${question.id}-${option.key}`}
                          className={`scenario-option ${response?.answer === option.key ? "active" : ""}`.trim()}
                        >
                          <span className="scenario-option-key">{option.key}</span>
                          <span>{option.text}</span>
                        </div>
                      ))}
                    </div>
                    {response?.rationale ? <div className="helper">{response.rationale}</div> : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
