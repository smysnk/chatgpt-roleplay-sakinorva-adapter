import { NextResponse } from "next/server";
import crypto from "crypto";
import OpenAI from "openai";
import { z } from "zod";
import { SMYSNK_QUESTIONS } from "@/lib/smysnkQuestions";
import { calculateSmysnkScores } from "@/lib/smysnkScore";
import { initializeDatabase } from "@/lib/db";
import { initializeSmysnkRunModel, SmysnkRun } from "@/lib/models/SmysnkRun";
import { initializeInteractionModel } from "@/lib/models/Interaction";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  character: z.string().min(2).max(80),
  context: z.string().max(500).optional().default("")
});

const responseSchema = z.object({
      responses: z
        .array(
          z.object({
            id: z.string(),
            answer: z.number().int().min(1).max(5),
            rationale: z.string().min(1)
          })
        )
        .length(SMYSNK_QUESTIONS.length)
});

const buildQuestionBlock = () =>
  SMYSNK_QUESTIONS.map((question) => `${question.id}: ${question.question}`).join("\n");

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

    const systemMessage =
      "You are roleplaying as the specified character. Answer as they would on a 1-5 agreement scale. Include a brief rationale for each answer. Output must match the JSON schema exactly.";
    const userMessage = `Character: ${payload.character}\nContext: ${payload.context || "(none)"}\n\nAnswer all SMYSNK questions on a 1-5 scale (1=disagree, 5=agree). Provide a one-sentence rationale for each answer. Return JSON only.\n\nQuestions:\n${buildQuestionBlock()}\n\nJSON schema:\n{\n \"responses\": [\n  { \"id\": \"question id\", \"answer\": number (1..5), \"rationale\": string }\n  // exactly ${SMYSNK_QUESTIONS.length} objects\n ]\n}\n`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      response_format: { type: "json_object" },
      temperature: 1
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "OpenAI response was empty." }, { status: 502 });
    }

    const parsed = responseSchema.safeParse(JSON.parse(content));
    if (!parsed.success) {
      return NextResponse.json({ error: "OpenAI response failed validation." }, { status: 502 });
    }

    const validIds = new Set(SMYSNK_QUESTIONS.map((question) => question.id));
    const seen = new Set<string>();
    for (const response of parsed.data.responses) {
      if (!validIds.has(response.id)) {
        return NextResponse.json({ error: "OpenAI returned an unknown question id." }, { status: 502 });
      }
      if (seen.has(response.id)) {
        return NextResponse.json({ error: "OpenAI returned duplicate question ids." }, { status: 502 });
      }
      seen.add(response.id);
    }

    const responses = parsed.data.responses.map((response) => ({
      questionId: response.id,
      answer: response.answer,
      rationale: response.rationale
    }));

    const scores = calculateSmysnkScores(responses);
    const slug = crypto.randomUUID();

    initializeSmysnkRunModel();
    initializeInteractionModel();
    await initializeDatabase();
    const run = await SmysnkRun.create({
      slug,
      runMode: "ai",
      subject: payload.character,
      context: payload.context || null,
      responses,
      scores
    });

    return NextResponse.json({
      slug: run.slug,
      runMode: run.runMode,
      subject: run.subject,
      context: run.context,
      responses: run.responses,
      scores: run.scores,
      createdAt: run.createdAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
