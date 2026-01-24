"use client";

import { useEffect, useMemo, useState } from "react";
import { SMYSNK_QUESTIONS } from "@/lib/smysnkQuestions";
import SakinorvaResults from "@/app/components/SakinorvaResults";
import RatingScaleHeader from "@/app/components/RatingScaleHeader";
import MbtiMapCanvas from "@/app/components/MbtiMapCanvas";

type SmysnkRunPayload = {
  slug: string;
  runMode: "ai" | "user";
  subject: string | null;
  context: string | null;
  responses: { questionId: string; answer: number; rationale: string }[] | null;
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


export default function SmysnkRunPage({ params }: { params: { slug: string } }) {
  const [data, setData] = useState<SmysnkRunPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/smysnk/slug/${params.slug}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Failed to load SMYSNK run.");
        }
        const payload = (await response.json()) as SmysnkRunPayload;
        if (active) {
          setData(payload);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unexpected error.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [params.slug]);

  const responseMap = useMemo(() => {
    if (!data?.responses?.length) {
      return new Map<string, number>();
    }
    return new Map(data.responses.map((response) => [response.questionId, response.answer]));
  }, [data]);

  const rationaleMap = useMemo(() => {
    if (!data?.responses?.length) {
      return new Map<string, string>();
    }
    return new Map(data.responses.map((response) => [response.questionId, response.rationale]));
  }, [data]);

  const hasScores = useMemo(() => Boolean(data?.scores && Object.keys(data.scores).length), [data]);

  return (
    <main>
      <div className="grid two">
        <div className="app-card">
          <h2>SMYSNK results</h2>
          {loading ? (
            <p style={{ marginTop: "20px" }}>Loading results…</p>
          ) : error ? (
            <div className="error">{error}</div>
          ) : data ? (
            <div style={{ marginTop: "20px" }}>
              <p className="helper">
                {data.subject ? <strong>{data.subject}</strong> : "Unnamed run"}
                {data.context ? ` — ${data.context}` : ""}
              </p>
              <p className="helper">Run mode: {data.runMode === "ai" ? "AI roleplay" : "Self answer"}</p>
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
        <div className="app-card">
          <h2>Answers</h2>
          <p className="helper">A 1–5 scale, where 1 is “Disagree” and 5 is “Agree.”</p>
          {loading ? (
            <p style={{ marginTop: "20px" }}>Loading answers…</p>
          ) : error ? (
            <div className="error">{error}</div>
          ) : data && data.responses?.length ? (
            <div className="answers-list" style={{ marginTop: "20px" }}>
              <RatingScaleHeader />
              {SMYSNK_QUESTIONS.map((question, index) => {
                const answer = responseMap.get(question.id) ?? 0;
                return (
                  <div className="answer-row" key={question.id}>
                    <div className="answer-meta">
                      <div className="answer-question">#{index + 1} {question.question}</div>
                      <div className="rating-bar" aria-label={`Answer ${answer}`}>
                        {[1, 2, 3, 4, 5].map((value) => (
                          <span
                            key={value}
                            className={`rating-pill value-${value} ${value === answer ? "active" : ""}`}
                          >
                            {value}
                          </span>
                        ))}
                      </div>
                    </div>
                    {rationaleMap.get(question.id) ? (
                      <div className="helper">{rationaleMap.get(question.id)}</div>
                    ) : null}
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
