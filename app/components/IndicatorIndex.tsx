"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RunsTable, { type RunItem } from "@/app/components/RunsTable";
import { deriveTypesFromScores } from "@/lib/mbti";
import { INDICATOR_API_BASE, INDICATOR_LABELS, INDICATOR_RUN_BASE, type Indicator } from "@/lib/indicators";

type IndicatorRun = {
  id: string;
  slug: string;
  subject: string | null;
  character?: string | null;
  context: string | null;
  createdAt: string;
  functionScores: Record<string, number> | null;
  grantType?: string | null;
  axisType?: string | null;
  myersType?: string | null;
  state: "QUEUED" | "PROCESSING" | "COMPLETED" | "ERROR";
  errors: number;
  testLabel: string;
  runPath: string;
};

type IndicatorIndexProps = {
  title: string;
  description: string;
  mode: "combined" | "sakinorva" | "smysnk" | "smysnk2" | "smysnk3";
};

type IndicatorOnlyMode = Exclude<IndicatorIndexProps["mode"], "combined">;

type RunCreatedEventDetail = {
  indicator: IndicatorOnlyMode;
  slug: string;
  subject?: string | null;
  character?: string | null;
  context?: string | null;
  state?: IndicatorRun["state"];
  errors?: number;
  createdAt?: string;
};

const ENDPOINTS_BY_INDICATOR: Record<Indicator, { url: string; label: string; runBase: string }> = {
  sakinorva: {
    url: INDICATOR_API_BASE.sakinorva,
    label: INDICATOR_LABELS.sakinorva,
    runBase: INDICATOR_RUN_BASE.sakinorva
  },
  smysnk: {
    url: INDICATOR_API_BASE.smysnk,
    label: INDICATOR_LABELS.smysnk,
    runBase: INDICATOR_RUN_BASE.smysnk
  },
  smysnk2: {
    url: INDICATOR_API_BASE.smysnk2,
    label: INDICATOR_LABELS.smysnk2,
    runBase: INDICATOR_RUN_BASE.smysnk2
  },
  smysnk3: {
    url: INDICATOR_API_BASE.smysnk3,
    label: INDICATOR_LABELS.smysnk3,
    runBase: INDICATOR_RUN_BASE.smysnk3
  }
};

const sortByCreatedAtDesc = (runs: IndicatorRun[]) =>
  [...runs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

const getIndicatorEndpoints = (mode: IndicatorIndexProps["mode"]) =>
  mode === "combined"
    ? Object.values(ENDPOINTS_BY_INDICATOR)
    : [ENDPOINTS_BY_INDICATOR[mode]];

export default function IndicatorIndex({ title, description, mode }: IndicatorIndexProps) {
  const router = useRouter();
  const [items, setItems] = useState<IndicatorRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorRun, setErrorRun] = useState<RunItem | null>(null);
  const loadRuns = useCallback(
    async ({ withLoading = false }: { withLoading?: boolean } = {}) => {
      if (withLoading) {
        setLoading(true);
      }
      setError(null);
      try {
        const endpoints = getIndicatorEndpoints(mode);
        const responses = await Promise.all(
          endpoints.map(async (endpoint) => {
            const response = await fetch(endpoint.url);
            if (!response.ok) {
              throw new Error("Failed to load runs.");
            }
            const payload = await response.json();
            return (payload.items ?? []).map((item: IndicatorRun) => ({
              id: item.id,
              slug: item.slug,
              subject: item.subject ?? item.character ?? "Self",
              context: item.context ?? null,
              createdAt: item.createdAt,
              functionScores: item.functionScores ?? null,
              grantType: item.grantType ?? null,
              axisType: item.axisType ?? null,
              myersType: item.myersType ?? null,
              state: item.state ?? "COMPLETED",
              errors: item.errors ?? 0,
              testLabel: endpoint.label,
              runPath: `${endpoint.runBase}${item.slug}`
            }));
          })
        );
        const combined = responses
          .flat()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setItems(combined);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected error.");
      } finally {
        if (withLoading) {
          setLoading(false);
        }
      }
    },
    [mode]
  );

  useEffect(() => {
    void loadRuns({ withLoading: true });
  }, [loadRuns]);

  useEffect(() => {
    const onRunCreated = (event: Event) => {
      const detail = (event as CustomEvent<RunCreatedEventDetail>).detail;
      if (!detail?.indicator || !detail?.slug) {
        return;
      }
      if (mode !== "combined" && mode !== detail.indicator) {
        return;
      }
      const indicatorMeta = ENDPOINTS_BY_INDICATOR[detail.indicator];
      if (!indicatorMeta) {
        return;
      }
      const optimisticRun: IndicatorRun = {
        id: `pending-${detail.slug}`,
        slug: detail.slug,
        subject: detail.subject ?? detail.character ?? "Self",
        context: detail.context ?? null,
        createdAt: detail.createdAt ?? new Date().toISOString(),
        functionScores: null,
        grantType: null,
        axisType: null,
        myersType: null,
        state: detail.state ?? "QUEUED",
        errors: detail.errors ?? 0,
        testLabel: indicatorMeta.label,
        runPath: `${indicatorMeta.runBase}${detail.slug}`
      };
      setItems((current) => sortByCreatedAtDesc([optimisticRun, ...current.filter((item) => item.slug !== detail.slug)]));
    };

    window.addEventListener("indicator-run-created", onRunCreated);
    return () => {
      window.removeEventListener("indicator-run-created", onRunCreated);
    };
  }, [mode]);

  const hasPendingRuns = useMemo(
    () => items.some((item) => item.state === "QUEUED" || item.state === "PROCESSING"),
    [items]
  );

  useEffect(() => {
    if (!hasPendingRuns) {
      return;
    }
    const interval = setInterval(() => {
      void loadRuns();
    }, 4000);
    return () => {
      clearInterval(interval);
    };
  }, [hasPendingRuns, loadRuns]);

  const tableItems = useMemo(() => {
    return items.map((item) => {
      const derived = item.functionScores ? deriveTypesFromScores(item.functionScores) : null;
      return {
        id: item.id,
        slug: item.slug,
        testLabel: item.testLabel,
        character: item.subject ?? "Self",
        context: item.context,
        grantType: item.grantType ?? derived?.grantType ?? null,
        axisType: item.axisType ?? derived?.axisType ?? null,
        myersType: item.myersType ?? derived?.myersType ?? null,
        functionScores: item.functionScores,
        state: item.state,
        errors: item.errors,
        createdAt: item.createdAt,
        runPath: item.runPath
      };
    });
  }, [items]);

  const getIndexPathForLabel = (label: string) => {
    if (label === "SMYSNK3") {
      return "/smysnk3";
    }
    if (label === "SMYSNK2") {
      return "/smysnk2";
    }
    if (label === "SMYSNK") {
      return "/smysnk";
    }
    return "/sakinorva-adapter";
  };

  return (
    <main>
      <div className="stack">
        <div className="app-card">
          <h1>{title}</h1>
          <p className="helper">{description}</p>
        </div>
        <RunsTable
          title="Runs"
          description="Click a row to revisit results."
          items={tableItems}
          loading={loading}
          error={error}
          onRowClick={(item) => {
            if (item.state === "ERROR") {
              setErrorRun(item);
              return;
            }
            if (item.state === "COMPLETED") {
              router.push(item.runPath);
            }
          }}
        />
      </div>
      {errorRun ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" style={{ alignItems: "center" }}>
          <div className="modal-card" style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <div>
                <h2>Run failed</h2>
                <p className="helper">
                  This run encountered errors while processing. You can retry or return to the index.
                </p>
              </div>
              <button type="button" className="button secondary" onClick={() => setErrorRun(null)}>
                Close
              </button>
            </div>
            <div className="modal-body" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="button"
                onClick={async () => {
                  await fetch(`/api/runs/retry/${errorRun.slug}`, { method: "POST" });
                  setErrorRun(null);
                  router.push(getIndexPathForLabel(errorRun.testLabel));
                }}
              >
                Retry
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setErrorRun(null);
                  router.push(getIndexPathForLabel(errorRun.testLabel));
                }}
              >
                Return to Index
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
