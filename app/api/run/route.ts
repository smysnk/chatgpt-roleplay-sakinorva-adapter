import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import * as cheerio from "cheerio";
import { QUESTIONS } from "@/lib/questions";
import { initializeDatabase } from "@/lib/db";
import { initializeRunModel, Run } from "@/lib/models/Run";
import { extractResultMetadata } from "@/lib/runMetadata";

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
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY environment variable." },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const questionBlock = QUESTIONS.map((question, index) => `#${index + 1} ${question}`).join("\n");

    const systemMessage =
      "You are roleplaying as the specified character. Answer truthfully as that character would behave and think. Answer questions as you see yourself, not how others see you. Output must match the JSON schema exactly.";
  
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
    const metadata = extractResultMetadata(resultsHtmlFragment);
    const slugBase = slugify(payload.character);
    const slug = `${slugBase || "run"}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const absoluteScores = toAbsoluteScores(
      Object.keys(metadata.functionScores).length ? metadata.functionScores : null
    );

    initializeRunModel();
    await initializeDatabase();
    const interaction = await Run.create({
      slug,
      indicator: "sakinorva",
      runMode: "ai",
      subject: payload.character,
      context: payload.context || null,
      answers,
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
      answers,
      explanations,
      formBody: params.toString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  initializeRunModel();
  await initializeDatabase();
  const interactions = await Run.findAll({
    where: { runMode: "ai", indicator: "sakinorva" },
    order: [["createdAt", "DESC"]],
    attributes: [
      "id",
      "slug",
      "subject",
      "context",
      "functionScores",
      "createdAt"
    ]
  });

  return NextResponse.json({
    items: interactions.map((interaction) => ({
      id: interaction.id.toString(),
      slug: interaction.slug,
      character: interaction.subject,
      context: interaction.context,
      functionScores: interaction.functionScores,
      createdAt: interaction.createdAt
    }))
  });
}
