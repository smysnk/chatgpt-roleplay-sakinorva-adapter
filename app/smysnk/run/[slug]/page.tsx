"use client";

import { useEffect, useMemo, useState } from "react";
import HelpIconButton from "@/app/components/HelpIconButton";
import HelpModal from "@/app/components/HelpModal";
import { SMYSNK_QUESTIONS } from "@/lib/smysnkQuestions";
import SakinorvaResults from "@/app/components/SakinorvaResults";
import RatingScaleHeader from "@/app/components/RatingScaleHeader";
import MbtiMapCanvas from "@/app/components/MbtiMapCanvas";
import type { HelpTopicId } from "@/lib/terminologyGlossary";

type SmysnkRunPayload = {
  slug: string;
  runMode: "ai" | "user" | "reddit";
  subject: string | null;
  context: string | null;
  redditProfile: { summary: string; persona: string; traits: string[] } | null;
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

const formatRunMode = (runMode: SmysnkRunPayload["runMode"]) => {
  if (runMode === "ai") {
    return "AI roleplay";
  }
  if (runMode === "reddit") {
    return "Reddit profile";
  }
  return "Self answer";
};


export default function SmysnkRunPage({ params }: { params: { slug: string } }) {
  const [data, setData] = useState<SmysnkRunPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeHelpTopic, setActiveHelpTopic] = useState<HelpTopicId | null>(null);

  useEffect(() => {
    let active = true;
    const load = async (withLoading = false) => {
      if (withLoading) {
        setLoading(true);
      }
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
          if (withLoading) {
            setLoading(false);
          }
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
          <h2>{data?.subject?.trim() || "Unnamed run"}</h2>
          {loading ? (
            <p style={{ marginTop: "20px" }}>Loading results…</p>
          ) : error ? (
            <div className="error">{error}</div>
          ) : data ? (
            <div style={{ marginTop: "20px" }}>
              {data.context ? <p className="helper">{data.context}</p> : null}
              <p className="helper">{`SMYSNK | ${formatRunMode(data.runMode)}`}</p>
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
                      <div className="answer-row smysnk2-context-card axis-map-result-card">
                        <div className="sakinorva-section-heading result-card-heading">
                          <div className="sakinorva-section-title">MBTI Axis Map</div>
                          <HelpIconButton
                            label="How MBTI Axis Map scoring works"
                            onClick={() => setActiveHelpTopic("mbti_axis_map")}
                          />
                        </div>
                        <p className="helper result-card-subtext">
                          Click the map to pause rotation. Move the speed slider right to rotate faster.
                        </p>
                        <MbtiMapCanvas functionScores={data.scores} />
                      </div>
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
      <HelpModal topicId={activeHelpTopic} onClose={() => setActiveHelpTopic(null)} />
    </main>
  );
}
