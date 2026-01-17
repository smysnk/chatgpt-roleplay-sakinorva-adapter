"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { QUESTIONS } from "@/lib/questions";


const sanitizeHtml = (input: string) => {
  if (typeof window === "undefined") {
    return "";
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, "text/html");
  const allowedTags = new Set(["DIV", "SPAN", "STYLE"]);
  const allowedAttrs = new Set(["class", "id"]);

  const walk = (node: Element) => {
    Array.from(node.children).forEach((child) => {
      if (!allowedTags.has(child.tagName)) {
        child.remove();
        return;
      }
      Array.from(child.attributes).forEach((attr) => {
        if (!allowedAttrs.has(attr.name)) {
          child.removeAttribute(attr.name);
        }
        if (attr.name.startsWith("on")) {
          child.removeAttribute(attr.name);
        }
      });
      walk(child);
    });
  };

  if (doc.body) {
    walk(doc.body);
  }

  return doc.body?.innerHTML ?? "";
};

type ResultsPayload = {
  runId: number;
  slug: string;
  answers: number[];
  explanations: string[];
  formBody: string;
  resultsHtmlFragment: string;
  resultsCss: string;
};

export default function ResultsPage() {
  return (
    <Suspense fallback={<div>Loading results…</div>}>
      <Page />
    </Suspense>
  );
}

function Page() {
  const searchParams = useSearchParams();
  const character = searchParams.get("character") ?? "";
  const context = searchParams.get("context") ?? "";
  const [data, setData] = useState<ResultsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) {
      return;
    }
    if (!character) {
      setError("Missing character in the query string.");
      return;
    }
    hasRunRef.current = true;
    let active = true;
    const run = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ character, context })
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Failed to run the test.");
        }
        const payload = (await response.json()) as ResultsPayload;
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

    run();

    return () => {
      active = false;
    };
  }, [character, context]);

  const sanitizedResults = useMemo(() => {
    if (!data?.resultsHtmlFragment) {
      return "";
    }
    return sanitizeHtml(data.resultsHtmlFragment);
  }, [data?.resultsHtmlFragment]);

  const handleCopy = async () => {
    if (!data?.formBody) {
      return;
    }
    await navigator.clipboard.writeText(data.formBody);
  };

  return (
    <main>
      <div className="grid two">
        <div className="app-card">
          <h2>Results</h2>
          <p className="helper">
            Generated for <strong>{character}</strong>
            {context ? ` — ${context}` : ""}
          </p>
          {loading ? (
            <p style={{ marginTop: "20px" }}>Running the test…</p>
          ) : error ? (
            <div className="error">{error}</div>
          ) : data ? (
            <div style={{ marginTop: "20px" }}>
              <div className="sakinorva-results" dangerouslySetInnerHTML={{ __html: sanitizedResults }} />
              <style>{data.resultsCss}</style>
            </div>
          ) : null}
          <div style={{ display: "flex", gap: "12px", marginTop: "24px", flexWrap: "wrap" }}>
            <button className="button secondary" type="button" onClick={handleCopy} disabled={!data}>
              Copy form body
            </button>
            {data?.slug ? (
              <Link className="button secondary" href={`/run/${data.slug}`}>
                View run
              </Link>
            ) : null}
            <Link className="button secondary" href="/">
              Run another character
            </Link>
          </div>
        </div>
        <div className="app-card">
          <h2>Answers</h2>
          <p className="helper">A 1–5 scale, where 1 is “No” and 5 is “Yes.”</p>
          {loading ? (
            <p style={{ marginTop: "20px" }}>Generating answers…</p>
          ) : error ? (
            <div className="error">{error}</div>
          ) : data ? (
            <div className="answers-list" style={{ marginTop: "20px" }}>
              {QUESTIONS.map((question, index) => {
                const answer = data.answers[index];
                const explanation = data.explanations[index];
                return (
                  <div className="answer-row" key={`${index}-${question}`}>
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
