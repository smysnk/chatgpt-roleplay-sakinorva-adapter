"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  INDICATOR_API_BASE,
  INDICATOR_INDEX_PATH,
  INDICATOR_LABELS,
  INDICATOR_QUESTIONS_PATH,
  type Indicator
} from "@/lib/indicators";
import { DEFAULT_SMYSNK2_MODE, SMYSNK2_MODE_LABELS, SMYSNK2_MODES, parseSmysnk2Mode } from "@/lib/smysnk2Questions";

export default function AppMenuBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [indicator, setIndicator] = useState<Indicator>("smysnk2");
  const [smysnk2Mode, setSmysnk2Mode] = useState(DEFAULT_SMYSNK2_MODE);
  const [character, setCharacter] = useState("");
  const [context, setContext] = useState("");
  const [runError, setRunError] = useState<string | null>(null);
  const [runLoading, setRunLoading] = useState(false);
  const [redditUsername, setRedditUsername] = useState("");
  const [redditError, setRedditError] = useState<string | null>(null);
  const [redditLoading, setRedditLoading] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const currentIndicator = useMemo<Indicator | null>(() => {
    if (pathname?.startsWith("/sakinorva-adapter")) {
      return "sakinorva";
    }
    if (pathname?.startsWith("/smysnk3")) {
      return "smysnk3";
    }
    if (pathname?.startsWith("/smysnk2")) {
      return "smysnk2";
    }
    if (pathname?.startsWith("/smysnk")) {
      return "smysnk";
    }
    return null;
  }, [pathname]);

  const currentLabel = currentIndicator ? INDICATOR_LABELS[currentIndicator] : "Combined";

  const indicatorLabel = currentLabel === "Combined" ? "Indicators" : currentLabel;
  const isIndicatorSelected = currentLabel !== "Combined";

  useEffect(() => {
    if (currentIndicator) {
      setIndicator(currentIndicator);
    }
    setRedditError(null);
  }, [currentIndicator]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);

  const handleRun = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = character.trim();
    if (trimmed.length < 2 || trimmed.length > 80) {
      setRunError("Character name must be between 2 and 80 characters.");
      return;
    }
    setRunError(null);
    setRunLoading(true);
    try {
      const response = await fetch(INDICATOR_API_BASE[indicator], {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          character: trimmed,
          context: context.trim(),
          ...(indicator === "smysnk2" || indicator === "smysnk3" ? { mode: smysnk2Mode } : {})
        })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to run the indicator.");
      }
      await response.json();
      const runPath = INDICATOR_INDEX_PATH[indicator];
      setWizardOpen(false);
      setCharacter("");
      setContext("");
      router.push(runPath);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setRunLoading(false);
    }
  };

  const handleManualLaunch = () => {
    const params = new URLSearchParams();
    if (manualName.trim()) {
      params.set("label", manualName.trim());
    }
    if (manualNotes.trim()) {
      params.set("notes", manualNotes.trim());
    }
    if (indicator === "smysnk2" || indicator === "smysnk3") {
      params.set("mode", smysnk2Mode.toString());
    }
    const basePath = INDICATOR_QUESTIONS_PATH[indicator];
    const href = params.toString() ? `${basePath}?${params.toString()}` : basePath;
    setWizardOpen(false);
    router.push(href);
  };

  const handleRedditRun = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = redditUsername.trim().replace(/^u\//i, "");
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(normalized)) {
      setRedditError("Reddit username must be 3-20 characters of letters, numbers, underscores, or hyphens.");
      return;
    }
    setRedditError(null);
    setRedditLoading(true);
    try {
      const response = await fetch(`${INDICATOR_API_BASE[indicator]}/reddit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: normalized,
          ...(indicator === "smysnk2" || indicator === "smysnk3" ? { mode: smysnk2Mode } : {})
        })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to run the Reddit profile test.");
      }
      await response.json();
      setWizardOpen(false);
      setRedditUsername("");
      const runPath = INDICATOR_INDEX_PATH[indicator];
      router.push(runPath);
    } catch (err) {
      setRedditError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setRedditLoading(false);
    }
  };

  return (
    <header className="menu-bar">
      <div className="menu-bar-inner">
        <button
          type="button"
          className="menu-home"
          onClick={() => {
            setMenuOpen(false);
            router.push("/");
          }}
          aria-label="Home"
        >
          <span className="menu-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="presentation" focusable="false">
              <path
                d="M3 10.5L12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 19.5v-9Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M9 21v-6h6v6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          Home
        </button>
        <div className="menu-group" ref={menuRef}>
          <button
            type="button"
            className="menu-trigger"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="menu-icon" aria-hidden="true">
              {isIndicatorSelected ? (
                <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                  <path
                    d="M3 10.5L12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 19.5v-9Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 21v-6h6v6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                  <path
                    d="M4 6.5h16M4 12h16M4 17.5h16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </span>
            {indicatorLabel}
          </button>
          {menuOpen ? (
            <div className="menu-panel" role="menu">
              <Link className="menu-item" href="/" role="menuitem">
                <span className="menu-item-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                    <path
                      d="M4 5.5h16M4 12h16M4 18.5h16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                Indicators
              </Link>
              <Link className="menu-item" href="/sakinorva-adapter" role="menuitem">
                <span className="menu-item-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                    <circle cx="12" cy="7.5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <path
                      d="M5 20.5c1.8-3.5 5-5 7-5s5.2 1.5 7 5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                Sakinorva
              </Link>
              <Link className="menu-item" href="/smysnk" role="menuitem">
                <span className="menu-item-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                    <path
                      d="M15.5 6.5c-1.5-1.5-5-1.5-5 1 0 3 6 1.5 6 5s-4 3-6.5 1.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="16.5" cy="5.5" r="0.8" fill="currentColor" />
                  </svg>
                </span>
                SMYSNK
              </Link>
              <Link className="menu-item" href="/smysnk2" role="menuitem">
                <span className="menu-item-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                    <path
                      d="M6 6.5h12v4H6zM6 13.5h12v4H6z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9 8.5h2m4 0h-2m-4 7h2m4 0h-2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                SMYSNK2
              </Link>
              <Link className="menu-item" href="/smysnk3" role="menuitem">
                <span className="menu-item-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                    <path
                      d="M6 6.5h12v4H6zM6 13.5h12v4H6z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9 8.5h2m4 0h-2m-4 7h2m4 0h-2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M18.5 5.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm0 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                </span>
                SMYSNK3
              </Link>
            </div>
          ) : null}
        </div>
        <button type="button" className="menu-run" onClick={() => setWizardOpen(true)}>
          <span className="menu-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="presentation" focusable="false">
              <path
                d="M5 3.5v17l14-8.5-14-8.5Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          Run
        </button>
        <a
          className="menu-github"
          href="https://github.com/smysnk/chatgpt-roleplay-sakinorva-adapter"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Fork on GitHub"
        >
          <span className="menu-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="presentation" focusable="false">
              <path
                d="M12 2.2A9.8 9.8 0 0 0 2.2 12c0 4.3 2.8 7.9 6.7 9.2.5.1.7-.2.7-.5v-1.8c-2.7.6-3.3-1.2-3.3-1.2-.4-1.1-1-1.4-1-1.4-.8-.5.1-.5.1-.5.9.1 1.4.9 1.4.9.8 1.4 2.2 1 2.7.8.1-.6.3-1 .5-1.3-2.2-.3-4.6-1.1-4.6-5A3.9 3.9 0 0 1 6.4 8c-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.2 9.2 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7a3.9 3.9 0 0 1 1 2.7c0 3.9-2.3 4.7-4.6 5 .4.3.6.9.6 1.9v2.8c0 .3.2.6.7.5A9.8 9.8 0 0 0 21.8 12 9.8 9.8 0 0 0 12 2.2Z"
                fill="currentColor"
              />
            </svg>
          </span>
          Fork
        </a>
      </div>
      {wizardOpen ? (
        <div className="wizard-backdrop" role="dialog" aria-modal="true">
          <div className="wizard-card">
            <div className="wizard-header">
              <div>
                <h2>Run indicator</h2>
                <p className="helper">Choose how you want to run the selected indicator.</p>
              </div>
              <button type="button" className="button secondary" onClick={() => setWizardOpen(false)}>
                Close
              </button>
            </div>
            <div className="wizard-controls">
              <label className="label" htmlFor="wizard-indicator">
                Indicator
              </label>
              <select
                id="wizard-indicator"
                className="input"
                value={indicator}
                onChange={(event) => setIndicator(event.target.value as Indicator)}
              >
                <option value="sakinorva">Sakinorva</option>
                <option value="smysnk">SMYSNK</option>
                <option value="smysnk2">SMYSNK2</option>
                <option value="smysnk3">SMYSNK3</option>
              </select>
              {indicator === "smysnk2" || indicator === "smysnk3" ? (
                <>
                  <label className="label" htmlFor="wizard-smysnk2-mode">
                    Question mode
                  </label>
                  <select
                    id="wizard-smysnk2-mode"
                    className="input"
                    value={smysnk2Mode}
                    onChange={(event) => setSmysnk2Mode(parseSmysnk2Mode(event.target.value))}
                  >
                    {SMYSNK2_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {SMYSNK2_MODE_LABELS[mode]}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}
            </div>
            <div className="wizard-body">
              <form className="wizard-column" onSubmit={handleRun}>
                <h3>AI roleplay as character</h3>
                <label className="label" htmlFor="wizard-character">
                  Character
                </label>
                <input
                  id="wizard-character"
                  className="input"
                  value={character}
                  onChange={(event) => setCharacter(event.target.value)}
                  placeholder="Sherlock Holmes"
                  maxLength={80}
                  required
                />
                <label className="label" htmlFor="wizard-context">
                  Context (optional)
                </label>
                <textarea
                  id="wizard-context"
                  className="textarea"
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  placeholder="Portrayal notes or guidance."
                />
                <button type="submit" className="button" disabled={runLoading}>
                  {runLoading ? "Running…" : "Run test"}
                </button>
                {runError ? <div className="error">{runError}</div> : null}
              </form>
              <div className="wizard-column">
                <h3>Answer manually</h3>
                <label className="label" htmlFor="wizard-manual-name">
                  Run label
                </label>
                <input
                  id="wizard-manual-name"
                  className="input"
                  value={manualName}
                  onChange={(event) => setManualName(event.target.value)}
                  placeholder="Self"
                  maxLength={80}
                />
                <label className="label" htmlFor="wizard-manual-notes">
                  Notes (optional)
                </label>
                <textarea
                  id="wizard-manual-notes"
                  className="textarea"
                  value={manualNotes}
                  onChange={(event) => setManualNotes(event.target.value)}
                  placeholder="Anything you want to remember about this run."
                />
                <button type="button" className="button secondary" onClick={handleManualLaunch}>
                  Answer questions
                </button>
              </div>
              <form className="wizard-column" onSubmit={handleRedditRun}>
                <h3>From Reddit profile</h3>
                <label className="label" htmlFor="wizard-reddit-username">
                  Reddit username
                </label>
                <input
                  id="wizard-reddit-username"
                  className="input"
                  value={redditUsername}
                  onChange={(event) => setRedditUsername(event.target.value)}
                  placeholder="u/username"
                  maxLength={25}
                  required
                />
                <p className="helper">
                  Uses public Reddit posts and comments to build the profile.
                </p>
                <button type="submit" className="button" disabled={redditLoading}>
                  {redditLoading ? "Running…" : "Run Reddit test"}
                </button>
                {redditError ? <div className="error">{redditError}</div> : null}
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
