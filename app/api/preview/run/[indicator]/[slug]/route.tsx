import { ImageResponse } from "next/og";
import { buildRunDescription, getRunPreview, type RunIndicator } from "@/lib/runPreview";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const INDICATOR_LABEL: Record<RunIndicator, string> = {
  sakinorva: "Sakinorva",
  smysnk: "SMYSNK",
  smysnk2: "SMYSNK2"
};

const isIndicator = (value: string): value is RunIndicator =>
  value === "sakinorva" || value === "smysnk" || value === "smysnk2";

const titleForState = (state: string) => {
  if (state === "COMPLETED") {
    return "Result Ready";
  }
  if (state === "ERROR") {
    return "Run Error";
  }
  return "Run In Progress";
};

const AXES = [
  {
    key: "T",
    label: "THINKING",
    extroKey: "Te",
    introKey: "Ti",
    extroColor: "#4b8bff",
    introColor: "#3cc7ff"
  },
  {
    key: "N",
    label: "INTUITION",
    extroKey: "Ne",
    introKey: "Ni",
    extroColor: "#41d89d",
    introColor: "#2fb36f"
  },
  {
    key: "S",
    label: "SENSING",
    extroKey: "Se",
    introKey: "Si",
    extroColor: "#f1b44b",
    introColor: "#d98b3a"
  },
  {
    key: "F",
    label: "FEELING",
    extroKey: "Fe",
    introKey: "Fi",
    extroColor: "#e45b6f",
    introColor: "#a05cff"
  }
] as const;

const getScore = (scores: Record<string, number> | null, key: string) => {
  if (!scores) {
    return 0;
  }
  const value = scores[key];
  return Number.isFinite(value) ? value : 0;
};

const getRange = (scores: Record<string, number> | null) => {
  if (!scores) {
    return { min: 0, max: 40 };
  }
  const values = Object.values(scores).filter((value) => Number.isFinite(value));
  if (!values.length) {
    return { min: 0, max: 40 };
  }
  return {
    min: Math.min(...values),
    max: Math.max(...values)
  };
};

const toPercent = (value: number, min: number, max: number) => {
  const range = max - min;
  if (range <= 0) {
    return Math.max(0, Math.min(100, Math.round((Math.abs(value) / 40) * 100)));
  }
  const normalized = (value - min) / range;
  return Math.max(0, Math.min(100, Math.round(normalized * 100)));
};

const barWidth = (percent: number) => {
  if (percent <= 0) {
    return "0%";
  }
  return `${Math.max(10, percent)}%`;
};

const topFunctionsText = (scores: Record<string, number> | null) => {
  if (!scores) {
    return null;
  }
  const tops = Object.entries(scores)
    .filter(([, value]) => Number.isFinite(value))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([key, value]) => `${key} ${Math.round(value * 100) / 100}`);
  if (!tops.length) {
    return null;
  }
  return `Top functions: ${tops.join("  |  ")}`;
};

export async function GET(
  _request: Request,
  { params }: { params: { indicator: string; slug: string } }
) {
  if (!isIndicator(params.indicator)) {
    return new Response("Unknown indicator", { status: 404 });
  }

  const preview = await getRunPreview(params.indicator, params.slug);

  const indicatorLabel = INDICATOR_LABEL[params.indicator];
  const heading = preview ? `${indicatorLabel} · ${titleForState(preview.state)}` : `${indicatorLabel} · Result`;
  const subject = preview?.subject ?? "Run not found";
  const description = preview ? buildRunDescription(preview) : "The requested result could not be found.";
  const tops = preview ? topFunctionsText(preview.functionScores) : null;
  const { min, max } = getRange(preview?.functionScores ?? null);
  const axisData = AXES.map((axis) => {
    const extro = getScore(preview?.functionScores ?? null, axis.extroKey);
    const intro = getScore(preview?.functionScores ?? null, axis.introKey);
    return {
      ...axis,
      extro,
      intro,
      extroPercent: toPercent(extro, min, max),
      introPercent: toPercent(intro, min, max)
    };
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0b0d12 0%, #161b27 62%, #1f2739 100%)",
          color: "#f5f7fb",
          padding: "38px",
          fontFamily: "Arial"
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div
              style={{
                display: "inline-flex",
                fontSize: "20px",
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: "#d6b25a"
              }}
            >
              {heading}
            </div>
            <div style={{ fontSize: "38px", fontWeight: 700, lineHeight: 1.1 }}>{subject}</div>
          </div>
          <div style={{ fontSize: "18px", color: "#9fb1d4" }}>Static STNF preview</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            border: "1px solid rgba(119, 145, 197, 0.35)",
            borderRadius: "20px",
            padding: "20px 22px",
            background: "linear-gradient(180deg, rgba(7,12,22,0.92) 0%, rgba(5,9,15,0.92) 100%)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                fontSize: "36px",
                letterSpacing: "0.22em",
                fontWeight: 700,
                color: "#d6b25a"
              }}
            >
              STNF
            </div>
          </div>
          <div style={{ display: "flex", gap: "18px", width: "100%" }}>
            {axisData.map((axis) => (
              <div
                key={axis.key}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  gap: "8px",
                  alignItems: "center"
                }}
              >
                <div style={{ fontSize: "34px", fontWeight: 700, color: "#aab5c9", letterSpacing: "0.08em" }}>
                  {axis.key}
                </div>
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    minHeight: "244px",
                    borderRadius: "18px",
                    padding: "10px",
                    background: "rgba(255,255,255,0.03)"
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      borderRadius: "12px",
                      background: "rgba(255,255,255,0.03)",
                      display: "flex",
                      alignItems: "center",
                      padding: "0 12px"
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: barWidth(axis.extroPercent),
                        height: "24px",
                        borderRadius: "999px",
                        background: axis.extroColor,
                        opacity: axis.extroPercent > 0 ? 1 : 0
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: "0",
                          transform: "translateX(-50%)",
                          width: "46%",
                          height: "100%",
                          borderRadius: "999px",
                          background: "rgba(255,255,255,0.24)"
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ height: "3px", borderRadius: "999px", background: "rgba(79, 95, 129, 0.55)" }} />
                  <div
                    style={{
                      flex: 1,
                      borderRadius: "12px",
                      background: "rgba(255,255,255,0.03)",
                      display: "flex",
                      alignItems: "center",
                      padding: "0 12px"
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: barWidth(axis.introPercent),
                        height: "24px",
                        borderRadius: "999px",
                        background: axis.introColor,
                        opacity: axis.introPercent > 0 ? 1 : 0
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: "0",
                          transform: "translateX(-50%)",
                          width: "46%",
                          height: "100%",
                          borderRadius: "999px",
                          background: "rgba(255,255,255,0.24)"
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: "16px", color: "#aab5c9", letterSpacing: "0.12em" }}>{axis.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "19px", color: "#d8deeb", lineHeight: 1.3 }}>{description}</div>
          {tops ? <div style={{ fontSize: "17px", color: "#9fb1d4" }}>{tops}</div> : null}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630
    }
  );
}
