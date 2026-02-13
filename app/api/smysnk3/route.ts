import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { getSmysnk3Scenarios, parseSmysnk3Mode, selectSmysnk3QuestionIds } from "@/lib/smysnk3Questions";
import { initializeDatabase } from "@/lib/db";
import { initializeRunModel, Run } from "@/lib/models/Run";
import { startRunQueue } from "@/lib/runQueue";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  character: z.string().min(2).max(80),
  context: z.string().max(500).optional().default(""),
  mode: z.union([z.string(), z.number()]).optional()
});

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const questionMode = parseSmysnk3Mode(payload.mode);
    const slug = crypto.randomUUID();
    const questionIds = selectSmysnk3QuestionIds({ mode: questionMode, seed: slug });
    const questionCount = getSmysnk3Scenarios(questionMode, questionIds).length;

    initializeRunModel();
    await initializeDatabase();
    const run = await Run.create({
      slug,
      indicator: "smysnk3",
      runMode: "ai",
      state: "QUEUED",
      errors: 0,
      subject: payload.character,
      context: payload.context || null,
      questionMode: questionMode.toString(),
      questionCount,
      questionIds,
      responses: null,
      functionScores: null,
      analysis: null,
      answers: null,
      explanations: null
    });
    startRunQueue();

    return NextResponse.json({
      slug: run.slug,
      runMode: run.runMode,
      subject: run.subject,
      context: run.context,
      questionMode: run.questionMode,
      questionCount: run.questionCount,
      questionIds: run.questionIds,
      state: run.state,
      errors: run.errors,
      createdAt: run.createdAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  initializeRunModel();
  await initializeDatabase();

  const runs = await Run.findAll({
    where: { indicator: "smysnk3" },
    order: [["createdAt", "DESC"]],
    attributes: [
      "id",
      "slug",
      "subject",
      "context",
      "functionScores",
      "questionMode",
      "questionCount",
      "questionIds",
      "state",
      "errors",
      "createdAt"
    ]
  });

  return NextResponse.json({
    items: runs.map((run) => ({
      id: run.id.toString(),
      slug: run.slug,
      subject: run.subject,
      context: run.context,
      functionScores: run.functionScores,
      questionMode: run.questionMode,
      questionCount: run.questionCount,
      questionIds: run.questionIds,
      state: run.state,
      errors: run.errors,
      createdAt: run.createdAt
    }))
  });
}
