"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RunsTable from "@/app/components/RunsTable";
import { deriveTypesFromScores } from "@/lib/mbti";

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
  testLabel: string;
  runPath: string;
};

type IndicatorIndexProps = {
  title: string;
  description: string;
  mode: "combined" | "sakinorva" | "smysnk";
};

export default function IndicatorIndex({ title, description, mode }: IndicatorIndexProps) {
  const router = useRouter();
  const [items, setItems] = useState<IndicatorRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const endpoints =
          mode === "combined"
            ? [
                { url: "/api/run", label: "Sakinorva", runBase: "/sakinorva-adapter/run/" },
                { url: "/api/smysnk", label: "SMYSNK", runBase: "/smysnk/run/" }
              ]
            : mode === "sakinorva"
              ? [{ url: "/api/run", label: "Sakinorva", runBase: "/sakinorva-adapter/run/" }]
              : [{ url: "/api/smysnk", label: "SMYSNK", runBase: "/smysnk/run/" }];
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
              testLabel: endpoint.label,
              runPath: `${endpoint.runBase}${item.slug}`
            }));
          })
        );
        if (!active) {
          return;
        }
        const combined = responses.flat();
        setItems(combined);
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
  }, [mode]);

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
        createdAt: item.createdAt,
        runPath: item.runPath
      };
    });
  }, [items]);

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
          onRowClick={(path) => router.push(path)}
        />
      </div>
    </main>
  );
}
