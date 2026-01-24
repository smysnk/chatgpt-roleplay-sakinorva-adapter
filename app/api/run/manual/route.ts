import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { z } from "zod";
import { QUESTIONS } from "@/lib/questions";
import { initializeDatabase } from "@/lib/db";
import { initializeRunModel, Run } from "@/lib/models/Run";
import { extractResultMetadata } from "@/lib/runMetadata";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  character: z.string().max(80).optional().default("Self"),
  context: z.string().max(500).optional().default(""),
  answers: z.array(z.number().int().min(1).max(5)).length(QUESTIONS.length)
});

const userAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);

const toAbsoluteScores = (scores: Record<string, number> | null) =>
  scores
    ? Object.fromEntries(Object.entries(scores).map(([key, value]) => [key, Math.abs(value)]))
    : null;

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const label = payload.character.trim() || "Self";
    if (label.length < 2 || label.length > 80) {
      return NextResponse.json(
        { error: "Run label must be between 2 and 80 characters." },
        { status: 400 }
      );
    }

    const params = new URLSearchParams();
    payload.answers.forEach((answer, index) => {
      params.set(`q${index + 1}`, answer.toString());
    });
    params.set("age", "");
    params.set("idmbti", "");
    params.set("enneagram", "");
    params.set("comments", "");
    params.set("token", "");
    params.set("sousin", "＜submit results＞");

    const response = await fetch("https://sakinorva.net/functions", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        origin: "https://sakinorva.net",
        referer: "https://sakinorva.net/functions",
        "user-agent": userAgent
      },
      body: params.toString()
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Sakinorva request failed." }, { status: 502 });
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const results = $("#my_results.kekka");
    if (!results.length) {
      return NextResponse.json({ error: "Could not find results block in response." }, { status: 502 });
    }

    const resultsHtmlFragment = $.html(results);
    const metadata = extractResultMetadata(resultsHtmlFragment);
    const slugBase = slugify(label);
    const slug = `${slugBase || "run"}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const absoluteScores = toAbsoluteScores(
      Object.keys(metadata.functionScores).length ? metadata.functionScores : null
    );

    initializeRunModel();
    await initializeDatabase();
    const explanations = payload.answers.map((answer) => `User selected ${answer}.`);
    const interaction = await Run.create({
      slug,
      indicator: "sakinorva",
      runMode: "user",
      subject: label,
      context: payload.context || null,
      answers: payload.answers,
      explanations,
      responses: null,
      functionScores: absoluteScores
    });

    return NextResponse.json({
      runId: interaction.id,
      slug: interaction.slug,
      character: interaction.subject,
      context: interaction.context,
      functionScores: interaction.functionScores,
      createdAt: interaction.createdAt,
      answers: interaction.answers,
      explanations: interaction.explanations
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
