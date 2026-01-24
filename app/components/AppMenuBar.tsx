"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export default function AppMenuBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [indicator, setIndicator] = useState<"sakinorva" | "smysnk">("sakinorva");
  const [character, setCharacter] = useState("");
  const [context, setContext] = useState("");
  const [runError, setRunError] = useState<string | null>(null);
  const [runLoading, setRunLoading] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const indicatorLabel = indicator === "sakinorva" ? "Sakinorva" : "SMYSNK";

  const currentLabel = useMemo(() => {
    if (pathname?.startsWith("/sakinorva-adapter")) {
      return "Sakinorva";
    }
    if (pathname?.startsWith("/smysnk")) {
      return "SMYSNK";
    }
    return "Combined";
  }, [pathname]);

  useEffect(() => {
    if (currentLabel === "Sakinorva") {
      setIndicator("sakinorva");
    } else if (currentLabel === "SMYSNK") {
      setIndicator("smysnk");
    }
  }, [currentLabel]);

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
      const response = await fetch(indicator === "sakinorva" ? "/api/run" : "/api/smysnk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          character: trimmed,
          context: context.trim()
        })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to run the indicator.");
      }
      const payload = (await response.json()) as { slug: string };
      const runPath =
        indicator === "sakinorva" ? `/sakinorva-adapter/run/${payload.slug}` : `/smysnk/run/${payload.slug}`;
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
    const basePath = indicator === "sakinorva" ? "/sakinorva-adapter/questions" : "/smysnk/questions";
    const href = params.toString() ? `${basePath}?${params.toString()}` : basePath;
    setWizardOpen(false);
    router.push(href);
  };

  return (
    <header className="menu-bar">
      <div className="menu-bar-inner">
        <div className="menu-group" ref={menuRef}>
          <button
            type="button"
            className="menu-trigger"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="menu-trigger-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="presentation">
                <path d="M12 3.2 3.5 10v9.8a1 1 0 0 0 1 1h5.5v-6.2h4v6.2h5.5a1 1 0 0 0 1-1V10L12 3.2z" />
              </svg>
            </span>
            <span className="menu-trigger-label">Indicator</span>
            <span className="menu-trigger-value">{indicatorLabel}</span>
          </button>
          {menuOpen ? (
            <div className="menu-panel" role="menu">
              <Link className="menu-item" href="/sakinorva-adapter" role="menuitem">
                Sakinorva
              </Link>
              <Link className="menu-item" href="/smysnk" role="menuitem">
                SMYSNK
              </Link>
            </div>
          ) : null}
        </div>
        <button type="button" className="menu-run" onClick={() => setWizardOpen(true)}>
          <span className="menu-run-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="presentation">
              <path d="M6 5.5h5.3l1.7 2h5.5a1 1 0 0 1 1 1v9.8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1zm4.4 9.7 4.8-2.8-4.8-2.8v5.6z" />
            </svg>
          </span>
          Run
        </button>
        <span className="menu-current">{currentLabel}</span>
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
                onChange={(event) => setIndicator(event.target.value as "sakinorva" | "smysnk")}
              >
                <option value="sakinorva">Sakinorva</option>
                <option value="smysnk">SMYSNK</option>
              </select>
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
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
