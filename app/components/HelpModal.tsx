"use client";

import { useEffect } from "react";
import { type HelpTopicId, HELP_TOPICS } from "@/lib/terminologyGlossary";

type HelpModalProps = {
  topicId: HelpTopicId | null;
  onClose: () => void;
};

export default function HelpModal({ topicId, onClose }: HelpModalProps) {
  const topic = topicId ? HELP_TOPICS[topicId] : null;

  useEffect(() => {
    if (!topic) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [topic, onClose]);

  if (!topic) {
    return null;
  }

  return (
    <div className="modal-backdrop help-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-card help-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{topic.title}</h2>
          </div>
          <button type="button" className="button secondary" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">
          <div className="help-modal-copy">
            {topic.paragraphs.map((paragraph) => (
              <p key={`${topic.id}-${paragraph}`} className="helper">
                {paragraph}
              </p>
            ))}
            {topic.bullets?.length ? (
              <ul className="helper">
                {topic.bullets.map((bullet) => (
                  <li key={`${topic.id}-${bullet}`}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
