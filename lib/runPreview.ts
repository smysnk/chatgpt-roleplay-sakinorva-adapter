import type { Metadata } from "next";
import { deriveTypesFromScores } from "@/lib/mbti";
import { initializeDatabase } from "@/lib/db";
import { initializeRunModel, Run } from "@/lib/models/Run";
import { getSiteUrl } from "@/lib/siteUrl";

export type RunIndicator = "sakinorva" | "smysnk" | "smysnk2" | "smysnk3";

export type RunPreview = {
  slug: string;
  indicator: RunIndicator;
  subject: string;
  context: string | null;
  runMode: "ai" | "user" | "reddit";
  state: "QUEUED" | "PROCESSING" | "COMPLETED" | "ERROR";
  functionScores: Record<string, number> | null;
  createdAt: string;
};

const INDICATOR_LABEL: Record<RunIndicator, string> = {
  sakinorva: "Sakinorva",
  smysnk: "SMYSNK",
  smysnk2: "SMYSNK2",
  smysnk3: "SMYSNK3"
};

const toDateString = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

const getTopFunctions = (scores: Record<string, number> | null, top = 3) => {
  if (!scores) {
    return [] as string[];
  }
  return Object.entries(scores)
    .filter(([, value]) => Number.isFinite(value))
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([key, value]) => `${key} ${Math.round(value * 100) / 100}`);
};

export const getRunPreview = async (indicator: RunIndicator, slug: string): Promise<RunPreview | null> => {
  initializeRunModel();
  await initializeDatabase();

  const run = await Run.findOne({
    where: { indicator, slug },
    attributes: [
      "slug",
      "indicator",
      "subject",
      "context",
      "runMode",
      "state",
      "functionScores",
      "createdAt"
    ]
  });

  if (!run) {
    return null;
  }

  return {
    slug: run.slug,
    indicator: run.indicator,
    subject: run.subject || "Self",
    context: run.context,
    runMode: run.runMode,
    state: run.state,
    functionScores: run.functionScores,
    createdAt: run.createdAt?.toISOString?.() ?? new Date().toISOString()
  };
};

export const buildRunDescription = (preview: RunPreview | null) => {
  if (!preview) {
    return "Run result not found.";
  }

  const label = INDICATOR_LABEL[preview.indicator];
  const date = toDateString(preview.createdAt);
  const statusSegment =
    preview.state === "COMPLETED"
      ? "Completed"
      : preview.state === "ERROR"
        ? "Failed"
        : "In progress";

  if (preview.state !== "COMPLETED") {
    const contextSegment = preview.context ? ` ${preview.context}` : "";
    return `${label} result for ${preview.subject}. ${statusSegment} (${date}).${contextSegment}`.trim();
  }

  const derived = preview.functionScores ? deriveTypesFromScores(preview.functionScores) : null;
  const typeSegment = derived
    ? `Grant ${derived.grantType}, Axis ${derived.axisType}, Myers ${derived.myersType}.`
    : "Function scores available.";
  const tops = getTopFunctions(preview.functionScores, 3);
  const topSegment = tops.length ? ` Top: ${tops.join(" · ")}.` : "";

  return `${label} result for ${preview.subject}. ${typeSegment}${topSegment} Generated ${date}.`;
};

export const buildRunMetadata = async ({
  indicator,
  slug,
  path
}: {
  indicator: RunIndicator;
  slug: string;
  path: string;
}): Promise<Metadata> => {
  const preview = await getRunPreview(indicator, slug);
  const label = INDICATOR_LABEL[indicator];
  const title = preview ? `${label} Results · ${preview.subject}` : `${label} Results`;
  const description = buildRunDescription(preview);
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}${path}`;
  const imageUrl = `${siteUrl}/api/preview/run/${indicator}/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonicalUrl,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${label} results preview`
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl]
    }
  };
};
