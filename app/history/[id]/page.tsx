"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { QUESTIONS } from "@/lib/questions";
import { sanitizeHtml } from "@/lib/sanitize";

type HistoryDetail = {
  id: number;
  character: string;
  context: string | null;
  answers: number[];
  explanations: string[];
  resultsHtmlFragment: string;
  resultsCss: string;
  createdAt: string;
};

export default function HistoryDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<HistoryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!params?.id) {
      setError("Missing history entry.");
      return;
    }
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/history/${params.id}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Failed to load run details.");
        }
        const payload = (await response.json()) as HistoryDetail;
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
  }, [params?.id]);

  const sanitizedResults = useMemo(() => {
    if (!data?.resultsHtmlFragment) {
      return "";
    }
    return sanitizeHtml(data.resultsHtmlFragment);
  }, [data?.resultsHtmlFragment]);

  return (
    <main>
      <div className="grid two">
        <div className="app-card">
          <h2>Run</h2>
          {data ? (
            <p className="helper">
              Generated for <strong>{data.character}</strong>
              {data.context ? ` — ${data.context}` : ""}
            </p>
          ) : null}
          {loading ? (
            <p style={{ marginTop: "20px" }}>Loading run…</p>
          ) : error ? (
            <div className="error">{error}</div>
          ) : data ? (
            <div style={{ marginTop: "20px" }}>
              <div className="sakinorva-results" dangerouslySetInnerHTML={{ __html: sanitizedResults }} />
              <style>{data.resultsCss}</style>
            </div>
          ) : null}
          <div style={{ display: "flex", gap: "12px", marginTop: "24px", flexWrap: "wrap" }}>
            <Link className="button secondary" href="/">
              Back to home
            </Link>
          </div>
        </div>
        <div className="app-card">
          <h2>Answers</h2>
          <p className="helper">A 1–5 scale, where 1 is “No” and 5 is “Yes.”</p>
          {loading ? (
            <p style={{ marginTop: "20px" }}>Loading answers…</p>
          ) : error ? (
            <div className="error">{error}</div>
          ) : data ? (
            <div className="answers-list" style={{ marginTop: "20px" }}>
              {QUESTIONS.map((question, index) => {
                const answer = data.answers[index];
                const explanation = data.explanations[index];
                return (
                  <div className="answer-row" key={question}>
                    <div className="answer-meta">
                      <div className="answer-question">#{index + 1} {question}</div>
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
                    <div className="helper">{explanation}</div>
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
