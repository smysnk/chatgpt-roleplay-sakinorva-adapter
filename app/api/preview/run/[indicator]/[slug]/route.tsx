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
          padding: "56px",
          fontFamily: "Arial"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div
            style={{
              display: "inline-flex",
              fontSize: "24px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#d6b25a"
            }}
          >
            Cognitive Functions
          </div>
          <div style={{ fontSize: "56px", fontWeight: 700, lineHeight: 1.1 }}>{heading}</div>
          <div style={{ fontSize: "42px", lineHeight: 1.2 }}>{subject}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontSize: "24px", color: "#d8deeb", lineHeight: 1.35 }}>{description}</div>
          {tops ? <div style={{ fontSize: "22px", color: "#9fb1d4" }}>{tops}</div> : null}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630
    }
  );
}
