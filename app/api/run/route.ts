import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import * as cheerio from "cheerio";
import { QUESTIONS } from "@/lib/questions";
import { SAKINORVA_RESULTS_CSS } from "@/lib/sakinorvaStyles";
import { initializeDatabase } from "@/lib/db";
import { initializeInteractionModel, Interaction } from "@/lib/models/Interaction";

export const dynamic = "force-dynamic";

const ANSWER_SCHEMA = z.object({
  responses: z
    .array(
      z.object({
        answer: z.number().int().min(1).max(5),
        explanation: z.string().min(1)
      })
    )
    .length(96)
});
const requestSchema = z.object({
  character: z.string().min(2).max(80),
  context: z.string().max(500).optional().default("")
});

const userAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);

const extractSummary = (htmlFragment: string) => {
  const $ = cheerio.load(htmlFragment);
  const summary = $.text().replace(/\s+/g, " ").trim();
  if (!summary) {
    return "Summary unavailable.";
  }
  return summary.length > 220 ? `${summary.slice(0, 217)}...` : summary;
};

const parseScore = (value: string) => {
  const match = value.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
};

const toAbsoluteScores = (scores: Record<string, number> | null) =>
  scores
    ? Object.fromEntries(Object.entries(scores).map(([key, value]) => [key, Math.abs(value)]))
    : null;

const extractResultMetadata = (htmlFragment: string) => {
  const $ = cheerio.load(htmlFragment);
  const metadata: {
    grantType: string | null;
    secondType: string | null;
    thirdType: string | null;
    axisType: string | null;
    myersType: string | null;
    functionScores: Record<string, number>;
  } = {
    grantType: null,
    secondType: null,
    thirdType: null,
    axisType: null,
    myersType: null,
    functionScores: {}
  };

  $(".row").each((_, row) => {
    const spans = $(row).find("span");
    if (spans.length < 2) {
      return;
    }
    const label = $(spans[0]).text().trim();
    const valueText = $(spans[spans.length - 1]).text().trim();
    const labelLower = label.toLowerCase();

    if (!metadata.grantType && labelLower.includes("grant")) {
      metadata.grantType = valueText || null;
    } else if (!metadata.secondType && /(2nd|second)/i.test(labelLower)) {
      metadata.secondType = valueText || null;
    } else if (!metadata.thirdType && /(3rd|third)/i.test(labelLower)) {
      metadata.thirdType = valueText || null;
    } else if (!metadata.axisType && labelLower.includes("axis")) {
      metadata.axisType = valueText || null;
    } else if (!metadata.myersType && labelLower.includes("myers")) {
      metadata.myersType = valueText || null;
    }

    const functionMatch = label.match(/^(Te|Ti|Fe|Fi|Ne|Ni|Se|Si)$/i);
    if (functionMatch) {
      const score = parseScore(valueText);
      if (score !== null) {
        const normalizedKey = `${functionMatch[0][0].toUpperCase()}${functionMatch[0][1].toLowerCase()}`;
        metadata.functionScores[normalizedKey] = score;
      }
    }
  });

  return metadata;
};

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY environment variable." },
        { status: 500 }
      );
    }

    const questionBlock = QUESTIONS.map((question, index) => `#${index + 1} ${question}`).join("\n");

    const systemMessage =
      "You are roleplaying as the specified character. Answer truthfully as that character would behave. Output must match the JSON schema exactly.";
  
    const userMessage = `Character: ${payload.character}\nContext: ${payload.context || "(none)"}\n\nAnswer all 96 questions on a 1-5 scale (1=no, 5=yes). Provide a one-sentence explanation for each answer.\nReturn JSON only, no markdown, no commentary.\n\nQuestions:\n${questionBlock}\n\nJSON schema:\n{\n \"responses\": [\n{ \"answer\": number (1..5), \"explanation\": string (one sentence) \n} \n// exactly 96 objects \n]\n}\n`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      response_format: { type: "json_object" },
      temperature: 1
    });

    console.log("OpenAI response:", JSON.stringify(completion, null, 2));

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "OpenAI response was empty." }, { status: 502 });
    }

    const parsed = ANSWER_SCHEMA.safeParse(JSON.parse(content));
    if (!parsed.success) {
      return NextResponse.json({ error: "OpenAI response failed validation." }, { status: 502 });
    }

    const { responses } = parsed.data;
    const params = new URLSearchParams();
    let { answers, explanations } = responses.reduce((acc, response, index) => {
      acc.answers.push(response.answer);
      acc.explanations.push(response.explanation);
      params.set(`q${index + 1}`, response.answer.toString());
      return acc;
    }, { answers: [] as number[], explanations: [] as string[] });
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
    const resultsSummary = extractSummary(resultsHtmlFragment);
    const metadata = extractResultMetadata(resultsHtmlFragment);
    const slugBase = slugify(payload.character);
    const slug = `${slugBase || "run"}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    initializeInteractionModel();
    await initializeDatabase();
    const interaction = await Interaction.create({
      slug,
      character: payload.character,
      context: payload.context || null,
      answers,
      explanations,
      resultsHtmlFragment,
      resultsSummary,
      grantType: metadata.grantType,
      secondType: metadata.secondType,
      thirdType: metadata.thirdType,
      axisType: metadata.axisType,
      myersType: metadata.myersType,
      functionScores: Object.keys(metadata.functionScores).length ? metadata.functionScores : null
    });

    return NextResponse.json({
      runId: interaction.id,
      slug: interaction.slug,
      character: interaction.character,
      context: interaction.context,
      grantType: interaction.grantType,
      secondType: interaction.secondType,
      thirdType: interaction.thirdType,
      axisType: interaction.axisType,
      myersType: interaction.myersType,
      functionScores: toAbsoluteScores(interaction.functionScores),
      createdAt: interaction.createdAt,
      answers,
      explanations,
      formBody: params.toString(),
      resultsHtmlFragment,
      resultsCss: SAKINORVA_RESULTS_CSS
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  initializeInteractionModel();
  await initializeDatabase();
  const interactions = await Interaction.findAll({
    order: [["createdAt", "DESC"]],
    attributes: [
      "id",
      "slug",
      "character",
      "context",
      "grantType",
      "secondType",
      "thirdType",
      "axisType",
      "myersType",
      "functionScores",
      "createdAt"
    ]
  });

  return NextResponse.json({
    items: interactions.map((interaction) => ({
      id: interaction.id.toString(),
      slug: interaction.slug,
      character: interaction.character,
      context: interaction.context,
      grantType: interaction.grantType,
      secondType: interaction.secondType,
      thirdType: interaction.thirdType,
      axisType: interaction.axisType,
      myersType: interaction.myersType,
      functionScores: toAbsoluteScores(interaction.functionScores),
      createdAt: interaction.createdAt
    }))
  });
}
