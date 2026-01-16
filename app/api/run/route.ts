import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import * as cheerio from "cheerio";
import { QUESTIONS } from "@/lib/questions";
import { SAKINORVA_RESULTS_CSS } from "@/lib/sakinorvaStyles";
import { initializeDatabase } from "@/lib/db";
import { initializeInteractionModel, Interaction } from "@/lib/models/Interaction";

const ANSWER_SCHEMA = z.object({
  answers: z.array(z.number().int().min(1).max(5)).length(96),
  explanations: z.array(z.string()).length(96)
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

const extractSummary = (htmlFragment: string) => {
  const $ = cheerio.load(htmlFragment);
  const summary = $.text().replace(/\s+/g, " ").trim();
  if (!summary) {
    return "Summary unavailable.";
  }
  return summary.length > 220 ? `${summary.slice(0, 217)}...` : summary;
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

    const userMessage = `Character: ${payload.character}\nContext: ${payload.context || "(none)"}\n\nAnswer all 96 questions on a 1-5 scale (1=no, 5=yes). Provide a one-sentence explanation for each answer.\nReturn JSON only, no markdown, no commentary.\n\nQuestions:\n${questionBlock}\n\nJSON schema:\n{\n  \"answers\": [96 integers 1..5],\n  \"explanations\": [96 strings, one sentence each]\n}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      response_format: { type: "json_object" },
      temperature: 0.6
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

    const { answers, explanations } = parsed.data;
    const params = new URLSearchParams();
    answers.forEach((answer, index) => {
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
    const resultsSummary = extractSummary(resultsHtmlFragment);

    initializeInteractionModel();
    await initializeDatabase();
    const interaction = await Interaction.create({
      character: payload.character,
      context: payload.context || null,
      answers,
      explanations,
      resultsHtmlFragment,
      resultsSummary
    });

    return NextResponse.json({
      historyId: interaction.id,
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
