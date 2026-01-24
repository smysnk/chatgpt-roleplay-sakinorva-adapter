"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <main>
      <div className="stack">
        <div className="app-card">
          <h1>Indicators</h1>
          <p className="helper">
            Choose an indicator from the menu above or jump directly to one of the tools below.
          </p>
        </div>
        <div className="grid two">
          <div className="app-card">
            <h2>Sakinorva</h2>
            <p className="helper">
              Run the 96-question Sakinorva test through AI roleplay or answer it yourself.
            </p>
            <div style={{ marginTop: "20px" }}>
              <Link className="button secondary" href="/sakinorva-adapter">
                Open Sakinorva
              </Link>
            </div>
          </div>
          <div className="app-card">
            <h2>JDB</h2>
            <p className="helper">
              Try the JDB indicator with roleplay mode or a self-scored run.
            </p>
            <div style={{ marginTop: "20px" }}>
              <Link className="button secondary" href="/jdb">
                Open JDB
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
