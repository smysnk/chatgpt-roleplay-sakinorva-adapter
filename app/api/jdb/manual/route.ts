import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { JDB_QUESTIONS } from "@/lib/jdbQuestions";
import { calculateJdbScores } from "@/lib/jdbScore";
import { initializeDatabase } from "@/lib/db";
import { initializeJdbRunModel, JdbRun } from "@/lib/models/JdbRun";
import { initializeInteractionModel } from "@/lib/models/Interaction";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  subject: z.string().max(80).optional().default("Self"),
  context: z.string().max(500).optional().default(""),
  responses: z
    .array(
      z.object({
        questionId: z.string(),
        answer: z.number().int().min(1).max(5),
        rationale: z.string().min(1).optional()
      })
    )
    .length(JDB_QUESTIONS.length)
});

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const label = payload.subject.trim() || "Self";
    if (label.length < 2 || label.length > 80) {
      return NextResponse.json(
        { error: "Participant label must be between 2 and 80 characters." },
        { status: 400 }
      );
    }
    const validIds = new Set(JDB_QUESTIONS.map((question) => question.id));
    const seen = new Set<string>();
    for (const response of payload.responses) {
      if (!validIds.has(response.questionId)) {
        return NextResponse.json({ error: "Response contained an unknown question id." }, { status: 400 });
      }
      if (seen.has(response.questionId)) {
        return NextResponse.json({ error: "Response contained duplicate question ids." }, { status: 400 });
      }
      seen.add(response.questionId);
    }

    const responses = payload.responses.map((response) => ({
      ...response,
      rationale: response.rationale?.trim() || `User selected ${response.answer}.`
    }));
    const scores = calculateJdbScores(responses);
    const slug = crypto.randomUUID();

    initializeJdbRunModel();
    initializeInteractionModel();
    await initializeDatabase();
    const run = await JdbRun.create({
      slug,
      runMode: "user",
      subject: label,
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
