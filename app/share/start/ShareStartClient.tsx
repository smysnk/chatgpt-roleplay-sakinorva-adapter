"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

type LaunchPayload = {
  redirectPath: string;
  indicator: "smysnk2" | "smysnk3";
  slug: string;
  mode: 16 | 32 | 64;
  questionCount: number;
};

const parseIndicator = (value: string | null) => {
  if (value === "smysnk2") {
    return "smysnk2";
  }
  return "smysnk3";
};

const parseQuestions = (value: string | null) => {
  if (value === "16" || value === "32" || value === "64") {
    return Number(value) as 16 | 32 | 64;
  }
  return 32;
};

export default function ShareStartClient() {
  return (
    <Suspense fallback={<main><div className="app-card">Preparing shared test…</div></main>}>
      <ShareStartContent />
    </Suspense>
  );
}

function ShareStartContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestStartedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const payload = useMemo(
    () => ({
      indicator: parseIndicator(searchParams.get("test")),
      mode: parseQuestions(searchParams.get("questions")),
      name: (searchParams.get("name") ?? "").trim()
    }),
    [searchParams]
  );

  useEffect(() => {
    if (requestStartedRef.current) {
      return;
    }
    requestStartedRef.current = true;

    const launch = async () => {
      try {
        setError(null);
        const response = await fetch("/api/share/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
        const data = (await response.json().catch(() => ({}))) as Partial<LaunchPayload> & { error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "Unable to start shared test.");
        }
        if (!data.redirectPath) {
          throw new Error("No redirect path was returned.");
        }
        router.replace(data.redirectPath);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected error.");
      }
    };

    void launch();
  }, [payload, router]);

  return (
    <main>
      <div className="stack">
        <div className="app-card">
          <h1>Starting shared test</h1>
          <p className="helper">
            Creating your manual run now and redirecting you into the question flow.
          </p>
          <p className="helper" style={{ marginTop: "8px" }}>
            Test: {payload.indicator === "smysnk3" ? "SMYSNK3" : "SMYSNK2"} | Questions: {payload.mode}
            {payload.name ? ` | Name: ${payload.name}` : ""}
          </p>
          {error ? <div className="error">{error}</div> : null}
          {error ? (
            <div style={{ marginTop: "16px" }}>
              <Link className="button secondary" href="/">
                Back to home
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
